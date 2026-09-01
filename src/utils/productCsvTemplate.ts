/**
 * Product Bulk Import CSV Template Generator
 * Provides structured CSV template with required & optional columns and sample data
 * for staff members preparing bulk networking, solar and IT equipment uploads.
 */

export interface CsvTemplateColumn {
  key: string;
  header: string;
  required: boolean;
  example: string;
  description: string;
}

export const PRODUCT_CSV_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
  {
    key: 'name',
    header: 'Product Name (Required)',
    required: true,
    example: 'TP-Link 24-Port Gigabit Switch',
    description: 'Full commercial brand or trade name of the product',
  },
  {
    key: 'genericName',
    header: 'Model / Specification (Required)',
    required: true,
    example: 'TL-SG1024D, 24-Port Gigabit',
    description: 'Model number or primary technical specification',
  },
  {
    key: 'category',
    header: 'Category (Required)',
    required: true,
    example: 'Network Switches',
    description: 'Category name (e.g., Switches, Routers, Access Points, Solar, Batteries, Inverters, IT Equipment)',
  },
  {
    key: 'dosage',
    header: 'Capacity / Rating (Required)',
    required: true,
    example: '24 Ports',
    description: 'Key capacity or rating (e.g., 24 Ports, 5 kVA, 200 Ah, 550 W)',
  },
  {
    key: 'form',
    header: 'Equipment Type (Required)',
    required: true,
    example: 'Switch',
    description: 'Equipment type: Switch, Router, Access Point, Battery, Inverter, Charge Controller, Solar Panel, Cable, Accessory, Computer Equipment, Other IT Equipment',
  },
  {
    key: 'companyName',
    header: 'Brand / Supplier (Required)',
    required: true,
    example: 'TP-Link',
    description: 'Product brand, manufacturer, or supplier (e.g., TP-Link, MikroTik, Ubiquiti, Felicity Solar)',
  },
  {
    key: 'basePrice',
    header: 'Base Cost Price NGN (Required)',
    required: true,
    example: '350',
    description: 'Wholesale acquisition cost per unit in Nigerian Naira (e.g., 350)',
  },
  {
    key: 'sellingPrice',
    header: 'Retail Selling Price NGN (Required)',
    required: true,
    example: '500',
    description: 'Retail selling price per unit in Nigerian Naira (e.g., 85000)',
  },
  {
    key: 'currentStock',
    header: 'Opening Stock Units (Required)',
    required: true,
    example: '100',
    description: 'Initial quantity in inventory on hand (e.g., 100)',
  },
  {
    key: 'reorderLevel',
    header: 'Reorder Threshold Level (Required)',
    required: true,
    example: '30',
    description: 'Minimum stock count that triggers low stock warnings (e.g., 30)',
  },
  {
    key: 'barcode',
    header: 'Barcode / EAN (Optional)',
    required: false,
    example: '8901234567890',
    description: 'Standard 12/13-digit EAN/UPC barcode. Leave blank to auto-generate',
  },
  {
    key: 'description',
    header: 'Product Description (Optional)',
    required: false,
    example: 'Unmanaged 24-port gigabit rack-mount network switch.',
    description: 'Brief product description, specifications, compatibility, and warranty notes',
  },
  {
    key: 'subtitle',
    header: 'Subtitle / Pack Size (Optional)',
    required: false,
    example: 'Rack-mount kit and power cable included',
    description: 'Package size or additional labeling subtitle',
  },
  {
    key: 'status',
    header: 'Product Status (Optional: Active/Inactive)',
    required: false,
    example: 'Active',
    description: 'Active or Inactive (defaults to Active if left blank)',
  },
  {
    key: 'variantStatus',
    header: 'Variant Status (Optional: Available/Inactive)',
    required: false,
    example: 'Available',
    description: 'Available or Inactive (defaults to Available if left blank)',
  },
];

const SAMPLE_CSV_ROWS: string[][] = [
  [
    'TP-Link 24-Port Gigabit Switch',
    'TL-SG1024D',
    'Network Switches',
    '24 Ports',
    'Switch',
    'TP-Link',
    '65000',
    '85000',
    '15',
    '5',
    '8901234567890',
    'Unmanaged gigabit rack-mount switch for office and enterprise networks.',
    'Rack-mount kit and power cable included',
    'Active',
    'Available',
  ],
  [
    'MikroTik hEX Router',
    'RB750Gr3',
    'Routers',
    '5 Gigabit Ports',
    'Router',
    'MikroTik',
    '55000',
    '72000',
    '20',
    '5',
    '8909876543210',
    'Compact wired router for small offices and managed network deployments.',
    'Power adapter included',
    'Active',
    'Available',
  ],
  [
    'Ubiquiti UniFi 6 Lite',
    'U6-Lite',
    'Access Points',
    'Dual-Band Wi-Fi 6',
    'Access Point',
    'Ubiquiti',
    '115000',
    '145000',
    '12',
    '4',
    '8904561237890',
    'Ceiling-mounted Wi-Fi 6 access point for business wireless networks.',
    'Mounting kit included',
    'Active',
    'Available',
  ],
  [
    'Felicity Solar Lithium Battery',
    'LPBA48100',
    'Solar Batteries',
    '48 V 100 Ah',
    'Battery',
    'Felicity Solar',
    '850000',
    '980000',
    '8',
    '2',
    '8907894561230',
    'Rechargeable lithium battery for residential and commercial solar systems.',
    'Wall-mount battery with communication cable',
    'Active',
    'Available',
  ],
  [
    'Hybrid Solar Inverter',
    '5KVA 48V MPPT',
    'Solar Inverters',
    '5 kVA',
    'Inverter',
    'Felicity Solar',
    '620000',
    '750000',
    '10',
    '3',
    '8903216549870',
    'Hybrid inverter with integrated MPPT charge controller for solar installations.',
    'Installation accessories sold separately',
    'Active',
    'Available',
  ],
];

/**
 * Escapes values for standard CSV compliance
 */
function escapeCsvValue(val: string): string {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Triggers instant browser download of the CSV template
 */
export function downloadProductCsvTemplate(filenamePrefix: string = 'yarotech_product_import_template'): void {
  const headers = PRODUCT_CSV_TEMPLATE_COLUMNS.map((col) => escapeCsvValue(col.header));
  const rows = SAMPLE_CSV_ROWS.map((row) => row.map((val) => escapeCsvValue(val)).join(','));

  // Prepend UTF-8 Byte Order Mark (\uFEFF) for seamless Microsoft Excel compatibility
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
