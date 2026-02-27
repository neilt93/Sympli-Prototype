import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFTableData {
  headers: string[];
  rows: string[][];
}

export interface PDFContent {
  title: string;
  logoBase64?: string;
  patientInfo: {
    email: string;
    date: string;
    name?: string;
    anonymisedId?: string;
    appointmentDate?: string;
  };
  sections: {
    title: string;
    description?: string;
    content: string | PDFTableData;
  }[];
  footer: string;
  originalLanguage?: string;
  userEdited?: boolean;
  confirmed?: boolean;
}

// Brand colour constants
const BRAND_GREEN: [number, number, number] = [52, 168, 83];    // #34A853
const BRAND_GREEN_DARK: [number, number, number] = [20, 83, 45]; // #14532D
const TEXT_DARK: [number, number, number] = [31, 41, 55];     // gray-800
const TEXT_SECONDARY: [number, number, number] = [75, 85, 99]; // gray-600
const TEXT_MUTED: [number, number, number] = [107, 114, 128];  // gray-500
const BORDER_LIGHT: [number, number, number] = [209, 213, 219]; // gray-300
const TABLE_HEADER_BG: [number, number, number] = [52, 168, 83];  // green
const TABLE_ALT_ROW: [number, number, number] = [245, 250, 246]; // light green tint

const LEFT_MARGIN = 20;
const RIGHT_MARGIN = 20;
const CONTENT_WIDTH = 170; // 210 - 20 - 20

export class PDFGenerator {
  private doc: jsPDF;
  private headerDrawnPages: Set<number>;
  private footerDrawnPages: Set<number>;

  constructor() {
    this.doc = new jsPDF();
    this.headerDrawnPages = new Set<number>();
    this.footerDrawnPages = new Set<number>();
  }

  generatePDF(content: PDFContent): string {
    this.headerDrawnPages.clear();
    this.footerDrawnPages.clear();

    let yPosition = this.drawHeader(content);

    content.sections.forEach((section) => {
      if (yPosition > 255) {
        this.drawFooter();
        this.doc.addPage();
        yPosition = this.drawHeader(content);
      }

      // Section title
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(...BRAND_GREEN_DARK);
      this.doc.text(section.title, LEFT_MARGIN, yPosition);
      yPosition += 7;

      // Section description (italic gray) if present
      if (section.description) {
        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'italic');
        this.doc.setTextColor(...TEXT_MUTED);
        const descLines = this.doc.splitTextToSize(section.description, CONTENT_WIDTH);
        descLines.forEach((line: string) => {
          this.doc.text(line, LEFT_MARGIN, yPosition);
          yPosition += 4.5;
        });
        yPosition += 3;
      } else {
        yPosition += 3;
      }

      if (typeof section.content === 'string') {
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(...TEXT_SECONDARY);

        const lines = this.doc.splitTextToSize(section.content, CONTENT_WIDTH);
        lines.forEach((line: string) => {
          if (yPosition > 265) {
            this.drawFooter();
            this.doc.addPage();
            yPosition = this.drawHeader(content);
          }
          this.doc.text(line, LEFT_MARGIN, yPosition);
          yPosition += 5.5;
        });
      } else {
        if (yPosition > 245) {
          this.drawFooter();
          this.doc.addPage();
          yPosition = this.drawHeader(content);
        }

        const tableHeaders = section.content.headers;
        const tableRows = (section.content.rows && section.content.rows.length > 0)
          ? section.content.rows
          : [Array(tableHeaders.length).fill('—') as string[]];

        autoTable(this.doc, {
          head: [tableHeaders],
          body: tableRows,
          startY: yPosition,
          margin: { top: LEFT_MARGIN, right: RIGHT_MARGIN, bottom: 25, left: LEFT_MARGIN },
          tableWidth: 'auto',
          styles: {
            fontSize: 8.5,
            cellPadding: 3,
            lineColor: BORDER_LIGHT,
            lineWidth: 0.15,
            overflow: 'linebreak',
            cellWidth: 'auto',
            minCellHeight: 7,
            textColor: TEXT_SECONDARY,
          },
          headStyles: {
            fillColor: TABLE_HEADER_BG,
            textColor: 255,
            fontStyle: 'normal',
            fontSize: 8,
            cellPadding: 3,
            minCellHeight: 7,
          },
          alternateRowStyles: {
            fillColor: TABLE_ALT_ROW,
          },
          didDrawPage: (data) => {
            const currentPage = data.pageNumber;
            if (!this.headerDrawnPages.has(currentPage)) {
              this.drawHeader(content);
            }
            if (!this.footerDrawnPages.has(currentPage)) {
              this.drawFooter();
            }
          }
        });

        const last = (this.doc as any).lastAutoTable;
        yPosition = last && typeof last.finalY === 'number' ? last.finalY + 12 : yPosition + 12;
      }

      yPosition += 8;
    });

    this.drawFooter();
    return this.doc.output('datauristring');
  }

  downloadPDF(content: PDFContent, filename: string = 'sympli-report.pdf') {
    this.generatePDF(content);
    this.doc.save(filename);
  }

  private drawHeader(content: PDFContent): number {
    const currentPage = (this.doc as any).internal.getCurrentPageInfo().pageNumber;
    if (this.headerDrawnPages.has(currentPage)) {
      return content.patientInfo.appointmentDate ? 78 : 72;
    }

    const pageWidth = this.doc.internal.pageSize.width;

    if (currentPage === 1) {
      // --- Sympli logo block ---
      if (content.logoBase64) {
        try {
          this.doc.addImage(content.logoBase64, 'JPEG', LEFT_MARGIN, 12, 10, 10);
        } catch {
          // Fallback: draw a green square if image fails
          this.doc.setFillColor(...BRAND_GREEN);
          this.doc.roundedRect(LEFT_MARGIN, 14, 8, 8, 1.5, 1.5, 'F');
        }
      } else {
        // Fallback: draw a green square
        this.doc.setFillColor(...BRAND_GREEN);
        this.doc.roundedRect(LEFT_MARGIN, 14, 8, 8, 1.5, 1.5, 'F');
      }

      // "Sympli" text next to logo
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...BRAND_GREEN_DARK);
      this.doc.text('Sympli', LEFT_MARGIN + 12, 21);

      // Title
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(...TEXT_DARK);
      this.doc.text(content.title || 'Medical Appointment Report', LEFT_MARGIN, 36);

      // Patient info
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(...TEXT_SECONDARY);
      const patientLine = (() => {
        if (content.patientInfo.name && content.patientInfo.name.trim()) {
          return `Patient: ${content.patientInfo.name}`;
        }
        if (content.patientInfo.anonymisedId && String(content.patientInfo.anonymisedId).trim()) {
          return `Patient ID: ${content.patientInfo.anonymisedId}`;
        }
        return `Patient: ${content.patientInfo.email}`;
      })();
      this.doc.text(patientLine, LEFT_MARGIN, 46);
      this.doc.text(`Date: ${content.patientInfo.date}`, LEFT_MARGIN, 52);
      let nextY = 58;

      if (content.originalLanguage && content.originalLanguage.toLowerCase() !== 'english') {
        this.doc.text(`Original language: ${content.originalLanguage}`, LEFT_MARGIN, nextY);
        nextY += 6;
      }

      if (content.confirmed) {
        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'italic');
        this.doc.setTextColor(...TEXT_MUTED);
        this.doc.text('This report was reviewed and confirmed by the patient.', LEFT_MARGIN, nextY);
        if (content.userEdited) {
          this.doc.setFont('helvetica', 'bold');
          this.doc.setFontSize(9);
          this.doc.setTextColor(153, 27, 27); // red-800
          this.doc.text('Contains patient edits', LEFT_MARGIN + 120, nextY);
          this.doc.setFont('helvetica', 'normal');
        }
        nextY += 6;
      }

      if (content.patientInfo.appointmentDate) {
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(...TEXT_SECONDARY);
        this.doc.text(`Appointment: ${content.patientInfo.appointmentDate}`, LEFT_MARGIN, nextY);
        nextY += 6;
      }

      this.headerDrawnPages.add(currentPage);
      return nextY + 10;
    } else {
      // Continuation header
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(...TEXT_MUTED);
      this.doc.text('Sympli', LEFT_MARGIN, 14);
      this.doc.text(content.title || 'Medical Appointment Report', LEFT_MARGIN + 20, 14);

      // Page number on right
      const totalPages = (this.doc as any).internal.getNumberOfPages();
      this.doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth - RIGHT_MARGIN - 25, 14);

      this.doc.setDrawColor(...BORDER_LIGHT);
      this.doc.setLineWidth(0.2);
      this.doc.line(LEFT_MARGIN, 17, pageWidth - RIGHT_MARGIN, 17);

      this.headerDrawnPages.add(currentPage);
      return 24;
    }
  }

  private drawFooter(): void {
    const currentPage = (this.doc as any).internal.getCurrentPageInfo().pageNumber;
    if (this.footerDrawnPages.has(currentPage)) return;

    const pageHeight = this.doc.internal.pageSize.height;
    const pageWidth = this.doc.internal.pageSize.width;
    const footerTop = pageHeight - 18;

    // Separator line
    this.doc.setDrawColor(...BORDER_LIGHT);
    this.doc.setLineWidth(0.2);
    this.doc.line(LEFT_MARGIN, footerTop - 4, pageWidth - RIGHT_MARGIN, footerTop - 4);

    // Footer text
    this.doc.setFontSize(7.5);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...TEXT_MUTED);
    this.doc.text('Sympli MED Ltd. | Confidential Medical Report', LEFT_MARGIN, footerTop);
    this.doc.text('Auto-generated. Please confirm findings with patient.', LEFT_MARGIN, footerTop + 4);

    // Page number
    const totalPages = (this.doc as any).internal.getNumberOfPages();
    this.doc.text(`${currentPage} / ${totalPages}`, pageWidth - RIGHT_MARGIN - 10, footerTop);

    this.footerDrawnPages.add(currentPage);
  }
}

export const pdfGenerator = new PDFGenerator();
