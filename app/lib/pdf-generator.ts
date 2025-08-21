import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFTableData {
  headers: string[];
  rows: string[][];
}

export interface PDFContent {
  title: string;
  patientInfo: {
    email: string;
    date: string;
  };
  sections: {
    title: string;
    content: string | PDFTableData;
  }[];
  footer: string;
}

export class PDFGenerator {
  private doc: jsPDF;

  constructor() {
    this.doc = new jsPDF();
  }

  generatePDF(content: PDFContent): string {
    // Set up document with better styling
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(44, 62, 80); // Dark blue-gray
    this.doc.text(content.title, 20, 25);

    // Patient info with better formatting
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(52, 73, 94); // Medium gray
    this.doc.text(`Patient: ${content.patientInfo.email}`, 20, 40);
    this.doc.text(`Date: ${content.patientInfo.date}`, 20, 47);

    let yPosition = 65;

    // Process each section
    content.sections.forEach((section, index) => {
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
          if (yPosition > 270) {
            this.doc.addPage();
            yPosition = 20;
          }
          this.doc.text(line, 20, yPosition);
          yPosition += 6;
        });
      } else {
        // Table content with improved styling
        if (yPosition > 250) {
          this.doc.addPage();
          yPosition = 20;
        }

        autoTable(this.doc, {
          head: [section.content.headers],
          body: section.content.rows,
          startY: yPosition,
          margin: { top: 20, right: 20, bottom: 20, left: 20 },
          styles: {
            fontSize: 9,
            cellPadding: 4,
            lineColor: [189, 195, 199], // Light gray borders
            lineWidth: 0.1,
          },
          headStyles: {
            fillColor: [52, 152, 219], // Blue header
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 10,
            cellPadding: 5,
          },
          alternateRowStyles: {
            fillColor: [248, 249, 250], // Very light gray
          },
          columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 'auto' },
            5: { cellWidth: 'auto' },
          },
          didDrawPage: (data) => {
            // Add page numbers
            const pageCount = this.doc.internal.pages.length - 1;
            this.doc.setFontSize(8);
            this.doc.setTextColor(128, 128, 128);
            this.doc.text(
              `Page ${data.pageNumber} of ${pageCount}`,
              this.doc.internal.pageSize.width - 20,
              this.doc.internal.pageSize.height - 10
            );
          }
        });

        yPosition = (this.doc as any).lastAutoTable.finalY + 15;
      }

      yPosition += 8;
    });

    // Footer with better styling
    if (yPosition > 270) {
      this.doc.addPage();
      yPosition = 20;
    }

    // Add a separator line
    this.doc.setDrawColor(189, 195, 199);
    this.doc.setLineWidth(0.5);
    this.doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'italic');
    this.doc.setTextColor(128, 128, 128);
    this.doc.text(content.footer, 20, yPosition);

    // Return PDF as base64 string
    return this.doc.output('datauristring');
  }

  downloadPDF(content: PDFContent, filename: string = 'medical-report.pdf') {
    this.generatePDF(content);
    this.doc.save(filename);
  }
}

export const pdfGenerator = new PDFGenerator();
