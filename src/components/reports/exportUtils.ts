/**
 * Helper to export tabular data directly to CSV format in browser
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvRows: string[] = [];

  // Header row
  csvRows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

  // Data rows
  for (const row of rows) {
    const escapedRow = row.map((cell) => {
      const strVal = cell === null || cell === undefined ? '' : String(cell);
      return `"${strVal.replace(/"/g, '""')}"`;
    });
    csvRows.push(escapedRow.join(','));
  }

  const csvString = csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
