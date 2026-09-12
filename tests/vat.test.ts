import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateVat } from '../src/utils/vat.ts';

test('VAT adds only enabled product amounts after proportional discount', () => {
  assert.equal(calculateVat([{ subtotal: 1800, vatEnabled: true }, { subtotal: 1000, vatEnabled: false }], 280, 7.5), 121.5);
});

test('VAT is zero with no enabled lines, zero rate, or fully discounted sale', () => {
  assert.equal(calculateVat([{ subtotal: 100, vatEnabled: false }], 0, 7.5), 0);
  assert.equal(calculateVat([{ subtotal: 100, vatEnabled: true }], 0, 0), 0);
  assert.equal(calculateVat([{ subtotal: 100, vatEnabled: true }], 100, 7.5), 0);
});

test('line rounding matches backend half-up rounding and keeps every discount kobo', () => {
  assert.equal(calculateVat(Array.from({ length: 3 }, () => ({ subtotal: 0.05, vatEnabled: true })), 0.01, 10), 0.02);
  assert.equal(calculateVat([{ subtotal: 100, vatEnabled: true }], 0, 7.5), 7.5);
});
