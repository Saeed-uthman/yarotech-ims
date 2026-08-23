import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';

export interface PDFExportOptions {
  title?: string;
  subtitle?: string;
  orientation?: 'portrait' | 'landscape';
  pharmacyName?: string;
  metadata?: Record<string, string | number>;
  footerNote?: string;
  includeSignatures?: boolean;
  themeColor?: [number, number, number]; // RGB
}

/**
 * Sanitizes currency symbols and special chars for standard PDF Helvetica font
 */
function sanitizeTextForPDF(text: any): string {
  if (text === null || text === undefined) return '';
  const str = String(text);
  // Replace Naira symbol ₦ with NGN for clean rendering in standard jsPDF fonts
  return str.replace(/₦/g, 'NGN ').replace(/•/g, '-');
}

/**
 * Generates and downloads a clean, beautifully formatted PDF report
 */
export function exportTableToPDF(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
  options: PDFExportOptions = {}
): void {
  const {
    title = 'Pharmacy Report',
    subtitle,
    orientation = headers.length > 6 ? 'landscape' : 'portrait',
    pharmacyName = 'AL-AMAAN MEDICINE STORE',
    metadata = {},
    footerNote,
    includeSignatures = false,
    themeColor = [15, 23, 42], // slate-900
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // 1. Header Banner & Pharmacy Title
  doc.setFillColor(themeColor[0], themeColor[1], themeColor[2]);
  doc.rect(margin, 12, pageWidth - margin * 2, 1.5, 'F');

  // Pharmacy Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
  doc.text(pharmacyName, margin, 20);

  // Document Title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(sanitizeTextForPDF(title), margin, 26);

  // Subtitle / Date Generated
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // slate-500
  const dateStr = `Generated on: ${new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const subLine = subtitle ? `${sanitizeTextForPDF(subtitle)} | ${dateStr}` : dateStr;
  doc.text(subLine, margin, 31);

  // Metadata pills / tags
  let startTableY = 36;
  const metaEntries = Object.entries(metadata);
  if (metaEntries.length > 0) {
    const metaStrings = metaEntries.map(([k, v]) => `${k}: ${sanitizeTextForPDF(v)}`);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(71, 85, 105);
    doc.text(metaStrings.join('   •   '), margin, startTableY);
    startTableY += 6;
  }

  // 2. Prepare Clean Data
  const cleanHeaders = headers.map((h) => sanitizeTextForPDF(h));
  const cleanRows = rows.map((r) => r.map((cell) => sanitizeTextForPDF(cell)));

  // 3. Render Table
  const tableConfig: UserOptions = {
    startY: startTableY,
    head: [cleanHeaders],
    body: cleanRows,
    theme: 'grid',
    margin: { left: margin, right: margin, bottom: 20 },
    headStyles: {
      fillColor: [themeColor[0], themeColor[1], themeColor[2]],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2,
      lineColor: [226, 232, 240], // slate-200
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    styles: {
      overflow: 'linebreak',
      font: 'helvetica',
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const totalPages = (doc as any).internal.getNumberOfPages();
      const currentPage = data.pageNumber;

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // slate-400

      // Left footer
      const leftFoot = footerNote ? sanitizeTextForPDF(footerNote) : 'Confidential - Al-Amaan Medicine Store Records';
      doc.text(leftFoot, margin, pageHeight - 8);

      // Right footer
      const rightFoot = `Page ${currentPage} of ${totalPages}`;
      doc.text(rightFoot, pageWidth - margin, pageHeight - 8, { align: 'right' });
    },
  };

  autoTable(doc, tableConfig);

  // 4. Signatures (if requested)
  if (includeSignatures) {
    const finalY = (doc as any).lastAutoTable.finalY + 12;
    if (finalY + 25 < pageHeight) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);

      // Left signature
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, finalY + 12, margin + 50, finalY + 12);
      doc.text('Prepared / Audited By', margin, finalY + 16);

      // Right signature
      const rightSigX = pageWidth - margin - 50;
      doc.line(rightSigX, finalY + 12, rightSigX + 50, finalY + 12);
      doc.text('Pharmacist-in-Charge / Approved', rightSigX, finalY + 16);
    }
  }

  // 5. Download the PDF
  const safeFilename = filename.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const dateSuffix = new Date().toISOString().split('T')[0];
  doc.save(`${safeFilename}-${dateSuffix}.pdf`);
}
