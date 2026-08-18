import { CustomerDebtPayment } from '../../types';

export const MOCK_CUSTOMER_DEBT_PAYMENTS: CustomerDebtPayment[] = [
  // Aminu Musa: ₦4,000 payment on ₦10,000 debt, leaves ₦6,000 remaining
  {
    id: 'pay-001',
    receiptNumber: 'RCT-2026-0045',
    customerId: 'cust-001',
    customerName: 'Aminu Musa',
    customerPhone: '08012345678',
    amount: 4000,
    paymentDate: '17 Aug 2026, 01:30 PM',
    rawDate: '2026-08-17T13:30:00Z',
    paymentMethod: 'TRANSFER',
    balanceBefore: 10000,
    balanceAfter: 6000,
    referenceNotes: 'Partial transfer payment towards Sale #000101. GTBank Ref: TRF9832810',
    recordedBy: 'Pharm. Abdullahi (Admin)',
    createdAt: '2026-08-17T13:30:00Z',
  },
  // Emeka Nnamdi: historical ₦5,000 debt fully cleared before deactivation
  {
    id: 'pay-002',
    receiptNumber: 'RCT-2026-0030',
    customerId: 'cust-009',
    customerName: 'Emeka Nnamdi',
    customerPhone: '08021122334',
    amount: 5000,
    paymentDate: '30 Jul 2026, 09:45 AM',
    rawDate: '2026-07-30T09:45:00Z',
    paymentMethod: 'CASH',
    balanceBefore: 5000,
    balanceAfter: 0,
    referenceNotes: 'Full final settlement of account prior to relocation.',
    recordedBy: 'Cashier Zainab',
    createdAt: '2026-07-30T09:45:00Z',
  },
];
