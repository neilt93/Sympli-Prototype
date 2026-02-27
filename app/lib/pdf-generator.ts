import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';

export interface PDFTableData {
  headers: string[];
  rows: string[][];
}

export interface PDFContent {
  title: string;
  patientInfo: {
    email: string;
    date: string;
    name?: string;
    anonymisedId?: string;
    appointmentDate?: string;
  };
  sections: {
    title: string;
    content: string | PDFTableData;
  }[];
  footer: string;
  originalLanguage?: string; // If provided and not English, show in header
  userEdited?: boolean; // If any section was edited by user
  confirmed?: boolean; // If user explicitly confirmed
}

export class PDFGenerator {
  private doc: jsPDF;
  private headerDrawnPages: Set<number>;
  private footerDrawnPages: Set<number>;
  private static logoPngDataUri: string | null = null;
  private static logoSvgDataUri: string | null = null;

  constructor() {
    this.doc = new jsPDF();
    this.headerDrawnPages = new Set<number>();
    this.footerDrawnPages = new Set<number>();
  }

  generatePDF(content: PDFContent): string {
    // Reset per-document state
    this.headerDrawnPages.clear();
    this.footerDrawnPages.clear();

    // Draw header and compute initial Y position
    let yPosition = this.drawHeader(content);

    // Process each section
    content.sections.forEach((section, index) => {
      // If near page bottom before starting a new section, page break
      if (yPosition > 260) {
        this.drawFooter();
        this.doc.addPage();
        yPosition = this.drawHeader(content);
      }
      // Section title with better styling
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(41, 128, 185); // Blue
      this.doc.text(section.title, 20, yPosition);
      yPosition += 12;

      // Section content
      if (typeof section.content === 'string') {
        // Text content
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(44, 62, 80); // Dark blue-gray
        
        // Split text into lines that fit the page width
        const lines = this.doc.splitTextToSize(section.content, 170);
        lines.forEach((line: string) => {
          if (yPosition > 265) {
            // Footer for current page, then new page + header
            this.drawFooter();
            this.doc.addPage();
            yPosition = this.drawHeader(content);
          }
          this.doc.text(line, 20, yPosition);
          yPosition += 6;
        });
      } else {
        // Table content with improved styling
        if (yPosition > 250) {
          // Footer for current page, then new page + header
          this.drawFooter();
          this.doc.addPage();
          yPosition = this.drawHeader(content);
        }

        // Ensure at least one placeholder row if table is empty
        const tableHeaders = section.content.headers;
        const tableRows = (section.content.rows && section.content.rows.length > 0)
          ? section.content.rows
          : [Array(tableHeaders.length).fill('—') as string[]];

        autoTable(this.doc, {
          head: [tableHeaders],
          body: tableRows,
          startY: yPosition,
          margin: { top: 20, right: 14, bottom: 20, left: 14 },
          tableWidth: 'auto',
          styles: {
            fontSize: 8,
            cellPadding: 2,
            lineColor: [189, 195, 199], // Light gray borders
            lineWidth: 0.1,
            overflow: 'linebreak',
            cellWidth: 'auto',
            minCellHeight: 6,
          },
          headStyles: {
            fillColor: [52, 152, 219], // Blue header
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: 3,
            minCellHeight: 7,
          },
          alternateRowStyles: {
            fillColor: [248, 249, 250], // Very light gray
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
        yPosition = last && typeof last.finalY === 'number' ? last.finalY + 15 : yPosition + 15;
      }

      yPosition += 8;
    });

    // Ensure footer on the last page
    this.drawFooter();

    // Return PDF as base64 string
    return this.doc.output('datauristring');
  }

  downloadPDF(content: PDFContent, filename: string = 'medical-report.pdf') {
    this.generatePDF(content);
    this.doc.save(filename);
  }

  private drawHeader(content: PDFContent): number {
    const currentPage = (this.doc as any).internal.getCurrentPageInfo().pageNumber;
    if (this.headerDrawnPages.has(currentPage)) {
      // Header already drawn for this page; return baseline content Y
      return content.patientInfo.appointmentDate ? 72 : 65;
    }

    // First page: full cover block; subsequent pages: minimal header
    if (currentPage === 1) {
      // Title + Logo
      this.doc.setFontSize(18);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(44, 62, 80);
      // Remove logo for now; show plain title
      this.doc.text(content.title || 'Medical Appointment Report by Sympli', 20, 25);

      // Patient info
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(52, 73, 94);
      const patientLine = (() => {
        if (content.patientInfo.name && content.patientInfo.name.trim()) {
          return `Patient: ${content.patientInfo.name}`;
        }
        if (content.patientInfo.anonymisedId && String(content.patientInfo.anonymisedId).trim()) {
          return `Patient ID: ${content.patientInfo.anonymisedId}`;
        }
        return `Patient: ${content.patientInfo.email}`;
      })();
      this.doc.text(patientLine, 20, 40);
      this.doc.text(`Date: ${content.patientInfo.date}`, 20, 47);
      let nextY = 54;
      if (content.originalLanguage && content.originalLanguage.toLowerCase() !== 'english') {
        this.doc.text(`Original language: ${content.originalLanguage}`, 20, nextY);
        nextY += 7;
      }
      // Confirmation/Consent (only if explicitly confirmed), place directly below patient/date (and original language if present)
      if (content.confirmed) {
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'italic');
        this.doc.setTextColor(76, 86, 106);
        this.doc.text('This report was reviewed and confirmed by the patient. Edits are indicated where applicable.', 20, nextY);
        if (content.userEdited) {
          this.doc.setFont('helvetica', 'bold');
          this.doc.setFontSize(10);
          this.doc.setTextColor(128, 0, 0);
          this.doc.text('User-edited', 20, nextY + 7);
          this.doc.setFont('helvetica', 'normal');
        }
        nextY += content.userEdited ? 14 : 7;
      }
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(52, 73, 94);
      if (content.patientInfo.appointmentDate) {
        this.doc.text(`Appointment: ${content.patientInfo.appointmentDate}`, 20, nextY);
      }

      this.headerDrawnPages.add(currentPage);
      return nextY + 7;
    } else {
      // Minimal header on subsequent pages
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(44, 62, 80);
      this.doc.text(content.title || 'Medical Appointment Report by Sympli', 20, 20);
      this.headerDrawnPages.add(currentPage);
      return 30; // baseline for content on subsequent pages
    }
  }

  private drawFooter(): void {
    const currentPage = (this.doc as any).internal.getCurrentPageInfo().pageNumber;
    if (this.footerDrawnPages.has(currentPage)) return;

    const pageHeight = this.doc.internal.pageSize.height;
    const leftMargin = 20;
    const footerTop = pageHeight - 20;

    // Separator line
    this.doc.setDrawColor(189, 195, 199);
    this.doc.setLineWidth(0.5);
    this.doc.line(leftMargin, footerTop - 6, 190, footerTop - 6);

    // Footer text per spec
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(128, 128, 128);
    this.doc.text('© 2025 Sympli MED Ltd.', leftMargin, footerTop);
    this.doc.text('Generated by Sympli – your voice, your health, your story.', leftMargin, footerTop + 6);

    this.footerDrawnPages.add(currentPage);
  }
}

export const pdfGenerator = new PDFGenerator();
