/**
 * Product Bulk Import CSV Template Generator
 * Provides structured CSV template with required & optional columns and sample data
 * for staff members preparing bulk pharmaceutical catalog uploads.
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
    example: 'Paracetamol 500mg Tablets',
    description: 'Full commercial brand or trade name of the product',
  },
  {
    key: 'genericName',
    header: 'Generic Name (Required)',
    required: true,
    example: 'Paracetamol',
    description: 'Active pharmaceutical ingredient (API)',
  },
  {
    key: 'category',
    header: 'Category (Required)',
    required: true,
    example: 'Analgesics',
    description: 'Category name (e.g., Analgesics, Antibiotics, Antimalarials, Vitamins & Supplements)',
  },
  {
    key: 'dosage',
    header: 'Dosage Strength (Required)',
    required: true,
    example: '500mg',
    description: 'Dosage unit / strength (e.g., 500mg, 250mg/5ml, 100ml, 10mg)',
  },
  {
    key: 'form',
    header: 'Dosage Form (Required)',
    required: true,
    example: 'Tablet',
    description: 'Pharmaceutical form: Tablet, Capsule, Syrup, Suspension, Injection, Cream, Ointment, Drops, Inhaler, Gel, Infusion, Powder',
  },
  {
    key: 'companyName',
    header: 'Manufacturer Company (Required)',
    required: true,
    example: 'EMZOR',
    description: 'Pharmaceutical manufacturer / brand supplier (e.g., EMZOR, DANA, FIDSON, MAY & BAKER)',
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
    description: 'Dispensing retail selling price per unit in Nigerian Naira (e.g., 500)',
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
    header: 'Clinical Description (Optional)',
    required: false,
    example: 'Fast-acting relief for mild to moderate pain and fever reduction.',
    description: 'Brief product description, indications, and clinical notes',
  },
  {
    key: 'subtitle',
    header: 'Subtitle / Pack Size (Optional)',
    required: false,
    example: 'Blister pack of 10x10 tablets',
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
    'Paracetamol 500mg Tablets',
    'Paracetamol',
    'Analgesics',
    '500mg',
    'Tablet',
    'EMZOR',
    '350',
    '500',
    '150',
    '30',
    '8901234567890',
    'Fast-acting relief for mild to moderate pain, headaches, and fever reduction.',
    'Blister pack of 10x10 tablets',
    'Active',
    'Available',
  ],
  [
    'Amoxicillin 500mg Capsules',
    'Amoxicillin Trihydrate',
    'Antibiotics',
    '500mg',
    'Capsule',
    'FIDSON',
    '1200',
    '1650',
    '80',
    '20',
    '8909876543210',
    'Broad-spectrum penicillin antibiotic for bacterial infections.',
    '10 blisters x 10 capsules',
    'Active',
    'Available',
  ],
  [
    'Coartem 80/480mg Tablets',
    'Artemether + Lumefantrine',
    'Antimalarials',
    '80/480mg',
    'Tablet',
    'SWIPHA',
    '2200',
    '3000',
    '65',
    '15',
    '8904561237890',
    'Artemisinin-based combination therapy (ACT) for acute uncomplicated malaria.',
    'Pack of 6 tablets',
    'Active',
    'Available',
  ],
  [
    'Cough & Cold Expectorant Syrup',
    'Diphenhydramine + Ammonium Chloride',
    'Respiratory',
    '100ml',
    'Syrup',
    'MAY & BAKER',
    '850',
    '1250',
    '45',
    '10',
    '8907894561230',
    'Symptomatic relief of cough, chest congestion, and upper respiratory allergies.',
    '100ml amber bottle with measuring cup',
    'Active',
    'Available',
  ],
  [
    'Vitamin C 1000mg Effervescent',
    'Ascorbic Acid + Zinc',
    'Vitamins & Supplements',
    '1000mg',
    'Tablet',
    'DANA',
    '1800',
    '2500',
    '90',
    '25',
    '8903216549870',
    'Immune booster and antioxidant effervescent health supplement.',
    'Tube of 20 effervescent tablets',
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
export function downloadProductCsvTemplate(filenamePrefix: string = 'alamaan_product_import_template'): void {
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
