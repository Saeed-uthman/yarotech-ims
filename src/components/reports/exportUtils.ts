import { exportTableToPDF, PDFExportOptions } from '../../utils/pdfExport';

/**
 * Helper to export tabular reports directly to PDF format
 */
export function exportToPDF(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
  options: PDFExportOptions = {}
): void {
  const formattedTitle = filename
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  exportTableToPDF(filename, headers, rows, {
    title: options.title || formattedTitle,
    subtitle: options.subtitle || 'Official Yarotech Group Analytical Report',
    pharmacyName: 'YAROTECH GROUP',
    footerNote: 'Confidential - Yarotech Group Business Analytics',
    includeSignatures: true,
    ...options,
  });
}

/**
 * Compatibility alias: exports to formatted PDF report
 */
export function exportToCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
  options?: PDFExportOptions
): void {
  exportToPDF(filename, headers, rows, options);
}
