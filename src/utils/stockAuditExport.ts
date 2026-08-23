import { Product, CompanyVariant, UserRole, ProductFilterParams } from '../types';
import { formatNaira, formatNumber } from './formatters';

export interface StockAuditExportOptions {
  scope: 'filtered' | 'current_page';
  granularity: 'variant_detail' | 'product_summary';
  includeFinancials: boolean; // Only if admin
  includeBlankRows: boolean; // Add 5 blank rows for found unlisted items
  auditorName?: string;
  auditLocation?: string;
  auditNotes?: string;
  activeFilterSummary?: string;
}

export interface FlattenedAuditItem {
  sn: number;
  productId: string;
  variantId?: string;
  productName: string;
  genericName: string;
  companyName: string;
  category: string;
  dosage: string;
  form: string;
  barcode: string;
  systemStock: number;
  reorderLevel: number;
  stockStatus: string;
  basePrice?: number;
  sellingPrice: number;
  totalCostValue?: number;
  totalSalesValue?: number;
}

/**
 * Transforms products into flattened line items for audit
 */
export function flattenProductsForAudit(
  products: Product[],
  currentRole: UserRole,
  granularity: 'variant_detail' | 'product_summary'
): FlattenedAuditItem[] {
  const isAdmin = currentRole === 'admin';
  const result: FlattenedAuditItem[] = [];
  let sn = 1;

  if (granularity === 'variant_detail') {
    products.forEach((prod) => {
      const activeVariants = prod.variants && prod.variants.length > 0 ? prod.variants : [];
      if (activeVariants.length === 0) {
        // Fallback for product with no variants
        result.push({
          sn: sn++,
          productId: prod.id,
          productName: prod.name,
          genericName: prod.genericName,
          companyName: 'N/A',
          category: prod.category,
          dosage: prod.dosage || '',
          form: prod.form || '',
          barcode: prod.barcode || '',
          systemStock: 0,
          reorderLevel: 0,
          stockStatus: 'Out of Stock',
          basePrice: isAdmin ? 0 : undefined,
          sellingPrice: 0,
          totalCostValue: isAdmin ? 0 : undefined,
          totalSalesValue: 0,
        });
      } else {
        activeVariants.forEach((v) => {
          const systemStock = Number(v.currentStock) || 0;
          const reorderLevel = Number(v.reorderLevel) || 0;
          let status = 'In Stock';
          if (systemStock === 0) status = 'Out of Stock';
          else if (systemStock <= reorderLevel) status = 'Low Stock';

          const basePrice = isAdmin ? (Number(v.basePrice) || 0) : undefined;
          const sellingPrice = Number(v.sellingPrice) || 0;

          result.push({
            sn: sn++,
            productId: prod.id,
            variantId: v.id,
            productName: prod.name,
            genericName: prod.genericName,
            companyName: v.companyName,
            category: prod.category,
            dosage: prod.dosage || '',
            form: prod.form || '',
            barcode: (v as any).barcode || prod.barcode || '',
            systemStock,
            reorderLevel,
            stockStatus: status,
            basePrice,
            sellingPrice,
            totalCostValue: isAdmin && basePrice !== undefined ? systemStock * basePrice : undefined,
            totalSalesValue: systemStock * sellingPrice,
          });
        });
      }
    });
  } else {
    // Product Summary Granularity
    products.forEach((prod) => {
      const variants = prod.variants || [];
      const totalStock = variants.reduce((sum, v) => sum + (Number(v.currentStock) || 0), 0);
      const companies = Array.from(new Set(variants.map((v) => v.companyName))).join(', ') || 'N/A';
      
      let status = 'In Stock';
      if (totalStock === 0) status = 'Out of Stock';
      else if (variants.some((v) => (Number(v.currentStock) || 0) <= (Number(v.reorderLevel) || 0))) {
        status = 'Low Stock';
      }

      const avgSellingPrice = variants.length > 0
        ? variants.reduce((s, v) => s + (Number(v.sellingPrice) || 0), 0) / variants.length
        : 0;

      const avgBasePrice = isAdmin && variants.length > 0
        ? variants.reduce((s, v) => s + (Number(v.basePrice) || 0), 0) / variants.length
        : undefined;

      const totalCostValue = isAdmin && avgBasePrice !== undefined ? totalStock * avgBasePrice : undefined;
      const totalSalesValue = totalStock * avgSellingPrice;

      result.push({
        sn: sn++,
        productId: prod.id,
        productName: prod.name,
        genericName: prod.genericName,
        companyName: companies,
        category: prod.category,
        dosage: prod.dosage || '',
        form: prod.form || '',
        barcode: prod.barcode || '',
        systemStock: totalStock,
        reorderLevel: variants.reduce((s, v) => s + (Number(v.reorderLevel) || 0), 0),
        stockStatus: status,
        basePrice: avgBasePrice,
        sellingPrice: Math.round(avgSellingPrice),
        totalCostValue,
        totalSalesValue: Math.round(totalSalesValue),
      });
    });
  }

  return result;
}

/**
 * Generates and triggers download of CSV format stock audit file
 */
export function exportStockAuditCSV(
  products: Product[],
  options: StockAuditExportOptions,
  currentRole: UserRole,
  filenamePrefix: string = 'alamaan_stock_audit'
) {
  const isAdmin = currentRole === 'admin' && options.includeFinancials;
  const items = flattenProductsForAudit(products, currentRole, options.granularity);

  const headers = [
    'S/N',
    'Product Name',
    'Generic Name',
    'Brand / Manufacturer',
    'Category',
    'Dosage',
    'Form',
    'Barcode / SKU',
    'System Recorded Stock (Units)',
    'Physical Count (Audit Tally)',
    'Variance (+ / -)',
    'Stock Status',
    isAdmin ? 'Unit Cost Price (NGN)' : '',
    'Selling Price (NGN)',
    isAdmin ? 'System Cost Valuation (NGN)' : '',
    'Auditor Remarks / Notes',
  ].filter(Boolean);

  const csvRows: string[][] = [];

  // Data rows
  items.forEach((item) => {
    const row = [
      String(item.sn),
      `"${item.productName.replace(/"/g, '""')}"`,
      `"${item.genericName.replace(/"/g, '""')}"`,
      `"${item.companyName.replace(/"/g, '""')}"`,
      `"${item.category.replace(/"/g, '""')}"`,
      `"${(item.dosage || '').replace(/"/g, '""')}"`,
      `"${(item.form || '').replace(/"/g, '""')}"`,
      `"${(item.barcode || '').replace(/"/g, '""')}"`,
      String(item.systemStock),
      '', // Physical Count (Blank for counting)
      '', // Variance (Blank)
      `"${item.stockStatus}"`,
      isAdmin && item.basePrice !== undefined ? String(item.basePrice) : '',
      String(item.sellingPrice),
      isAdmin && item.totalCostValue !== undefined ? String(item.totalCostValue) : '',
      '', // Auditor Remarks
    ].filter((v, idx) => {
      // keep index alignment with headers
      if (!isAdmin && (idx === 12 || idx === 14)) return false;
      return true;
    });

    csvRows.push(row);
  });

  // Append blank rows for physical write-ins if requested
  if (options.includeBlankRows) {
    for (let i = 1; i <= 5; i++) {
      const blankRow = [
        String(items.length + i),
        '"[UNLISTED SHELF ITEM]"',
        '""',
        '""',
        '""',
        '""',
        '""',
        '""',
        '0',
        '',
        '',
        '"Uncatalogued"',
        isAdmin ? '' : '',
        '',
        isAdmin ? '' : '',
        '""',
      ].filter((_, idx) => {
        if (!isAdmin && (idx === 12 || idx === 14)) return false;
        return true;
      });
      csvRows.push(blankRow);
    }
  }

  // Prepend Metadata & Audit Header rows
  const metaRows: string[] = [
    `"AL-AMAAN MEDICINE STORE - PHYSICAL INVENTORY AUDIT & STOCK COUNT SHEET"`,
    `"Generated At:","${new Date().toLocaleString('en-GB')}"`,
    `"Auditor Name:","${(options.auditorName || 'Unassigned').replace(/"/g, '""')}"`,
    `"Audit Location / Store:","${(options.auditLocation || 'Main Pharmacy Dispensary').replace(/"/g, '""')}"`,
    `"Active Filters:","${(options.activeFilterSummary || 'All Products').replace(/"/g, '""')}"`,
    `"Total Line Items:","${items.length}"`,
    `"Total Recorded Stock Units:","${items.reduce((s, i) => s + i.systemStock, 0)}"`,
    '', // Empty line before table header
    headers.join(','),
  ];

  const fullCsvContent = metaRows.join('\r\n') + '\r\n' + csvRows.map((r) => r.join(',')).join('\r\n');
  const blob = new Blob([fullCsvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `${filenamePrefix}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Builds HTML for printable PDF stock audit sheets
 */
export function generateStockAuditPrintHTML(
  products: Product[],
  options: StockAuditExportOptions,
  currentRole: UserRole
): string {
  const isAdmin = currentRole === 'admin' && options.includeFinancials;
  const items = flattenProductsForAudit(products, currentRole, options.granularity);
  const totalSystemUnits = items.reduce((s, i) => s + i.systemStock, 0);
  const totalCostValuation = isAdmin
    ? items.reduce((s, i) => s + (i.totalCostValue || 0), 0)
    : 0;
  const totalSalesValuation = items.reduce((s, i) => s + (i.totalSalesValue || 0), 0);

  const formattedDate = new Date().toLocaleString('en-GB', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Al-Amaan Medicine Store - Physical Stock Audit Sheet</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm 10mm 12mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10px;
      line-height: 1.3;
      color: #0f172a;
      background-color: #ffffff;
      margin: 0;
      padding: 12px;
    }
    .header-box {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .pharmacy-title {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0284c7;
      text-transform: uppercase;
    }
    .report-title {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 2px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 10px;
      font-size: 9.5px;
    }
    .meta-item strong {
      color: #475569;
      display: block;
      font-size: 8.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-item span {
      font-weight: 600;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 9px;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
    }
    th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 5px 6px;
      border: 1px solid #0f172a;
      font-size: 8.5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    td {
      padding: 4.5px 6px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
    }
    tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .status-badge {
      display: inline-block;
      padding: 1px 4px;
      border-radius: 3px;
      font-weight: 700;
      font-size: 8px;
      text-transform: uppercase;
    }
    .status-in_stock {
      background: #dcfce7;
      color: #166534;
    }
    .status-low_stock {
      background: #fef3c7;
      color: #92400e;
    }
    .status-out_of_stock {
      background: #fee2e2;
      color: #991b1b;
    }
    .blank-box {
      border: 1.5px dashed #64748b;
      height: 20px;
      background: #ffffff;
      border-radius: 2px;
    }
    .signature-section {
      margin-top: 14px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      border-top: 1px dashed #94a3b8;
      padding-top: 10px;
      page-break-inside: avoid;
    }
    .sig-box {
      font-size: 9px;
    }
    .sig-line {
      border-bottom: 1px solid #334155;
      margin-top: 22px;
      margin-bottom: 4px;
    }
    .action-bar {
      margin-bottom: 12px;
      display: flex;
      gap: 8px;
    }
    .print-btn {
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
    }
    .print-btn:hover {
      background: #0369a1;
    }
    @media print {
      .no-print {
        display: none !important;
      }
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="no-print action-bar">
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    <button class="print-btn" style="background:#475569;" onclick="window.close()">✕ Close Preview</button>
  </div>

  <div class="header-box">
    <div>
      <div class="pharmacy-title">Al-Amaan Medicine Store</div>
      <div class="report-title">Physical Inventory Audit & Stock Verification Worksheet</div>
    </div>
    <div style="text-align: right; font-size: 9px; color: #475569;">
      <div><strong>Form Ref:</strong> AUD-STK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}</div>
      <div><strong>Printed:</strong> ${formattedDate}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item">
      <strong>Auditor / Lead:</strong>
      <span>${options.auditorName || 'Pharmacist on Duty'}</span>
    </div>
    <div class="meta-item">
      <strong>Store / Location:</strong>
      <span>${options.auditLocation || 'Main Pharmacy Dispensary'}</span>
    </div>
    <div class="meta-item">
      <strong>Filter Scope:</strong>
      <span>${options.activeFilterSummary || 'All Products'}</span>
    </div>
    <div class="meta-item">
      <strong>Summary Counts:</strong>
      <span>${items.length} Lines • ${formatNumber(totalSystemUnits)} Recorded Units</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 25px; text-align: center;">S/N</th>
        <th style="width: 70px;">Barcode / SKU</th>
        <th>Product Description (Trade & Generic)</th>
        <th style="width: 90px;">Manufacturer / Brand</th>
        <th style="width: 75px;">Category / Dosage</th>
        <th style="width: 55px; text-align: right;">System Qty</th>
        <th style="width: 75px; text-align: center; background-color: #1e3a8a;">Physical Count</th>
        <th style="width: 60px; text-align: center; background-color: #1e3a8a;">Variance (+/-)</th>
        <th style="width: 65px; text-align: right;">Unit Price</th>
        ${isAdmin ? '<th style="width: 70px; text-align: right;">Cost Value</th>' : ''}
        <th style="width: 100px;">Auditor Notes / Expiry Batch</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map(
          (item) => `
        <tr>
          <td style="text-align: center; font-weight: 700; color: #64748b;">${item.sn}</td>
          <td style="font-family: monospace; font-size: 8.5px;">${item.barcode || '—'}</td>
          <td>
            <strong style="color: #0f172a;">${item.productName}</strong>
            <div style="color: #64748b; font-size: 8px;">${item.genericName}</div>
          </td>
          <td>${item.companyName}</td>
          <td>
            <div>${item.category}</div>
            <div style="color: #64748b; font-size: 8px;">${item.dosage} ${item.form}</div>
          </td>
          <td style="text-align: right; font-weight: 700; font-family: monospace; font-size: 9.5px;">
            ${formatNumber(item.systemStock)}
          </td>
          <td style="padding: 2px;">
            <div class="blank-box"></div>
          </td>
          <td style="padding: 2px;">
            <div class="blank-box"></div>
          </td>
          <td style="text-align: right; font-family: monospace;">
            ${formatNaira(item.sellingPrice)}
          </td>
          ${
            isAdmin
              ? `<td style="text-align: right; font-family: monospace;">${formatNaira(
                  item.totalCostValue || 0
                )}</td>`
              : ''
          }
          <td style="color: #94a3b8; font-size: 8px;">
            <span class="status-badge status-${item.stockStatus.toLowerCase().replace(/\s+/g, '_')}">
              ${item.stockStatus}
            </span>
          </td>
        </tr>
      `
        )
        .join('')}

      ${
        options.includeBlankRows
          ? `
        <!-- Uncatalogued / Extra shelf finds write-in lines -->
        ${[1, 2, 3, 4, 5]
          .map(
            (n) => `
          <tr style="background-color: #fffbeb;">
            <td style="text-align: center; font-weight: 700; color: #b45309;">${items.length + n}</td>
            <td style="color: #b45309; font-style: italic;">[Write Barcode]</td>
            <td style="color: #b45309; font-style: italic;">[Unlisted Drug Discovered on Shelf]</td>
            <td></td>
            <td></td>
            <td style="text-align: right; font-family: monospace;">0</td>
            <td style="padding: 2px;"><div class="blank-box" style="border-color:#d97706;"></div></td>
            <td style="padding: 2px;"><div class="blank-box" style="border-color:#d97706;"></div></td>
            <td></td>
            ${isAdmin ? '<td></td>' : ''}
            <td style="font-size: 8px; color: #d97706;">Found Item</td>
          </tr>
        `
          )
          .join('')}
      `
          : ''
      }
    </tbody>
  </table>

  <div class="signature-section">
    <div class="sig-box">
      <strong>Counted & Audited By:</strong>
      <div class="sig-line"></div>
      <div>Staff Signature & Date</div>
    </div>
    <div class="sig-box">
      <strong>Verified By (Supervising Pharmacist):</strong>
      <div class="sig-line"></div>
      <div>Pharmacist Signature & Date</div>
    </div>
    <div class="sig-box">
      <strong>Manager / Audit Sign-off:</strong>
      <div class="sig-line"></div>
      <div>Management Approval & Date</div>
    </div>
  </div>

  <script>
    window.addEventListener('DOMContentLoaded', () => {
      // Auto open print dialog when loaded in new window
      setTimeout(() => {
        // window.print();
      }, 400);
    });
  </script>
</body>
</html>
  `.trim();
}

/**
 * Triggers Print / Save as PDF by opening a formatted printable popup window
 */
export function exportStockAuditPDF(
  products: Product[],
  options: StockAuditExportOptions,
  currentRole: UserRole
) {
  const html = generateStockAuditPrintHTML(products, options, currentRole);
  const printWindow = window.open('', '_blank', 'width=1100,height=750,resizable=yes,scrollbars=yes');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  } else {
    // If popup blocker intervened, create a downloadable HTML blob fallback
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `alamaan_stock_audit_sheet_${new Date().toISOString().split('T')[0]}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
