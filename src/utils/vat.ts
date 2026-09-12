/** Mirrors backend half-up money rounding, using integer kobo for allocation. */
export function calculateVat(lines: Array<{ subtotal: number; vatEnabled: boolean }>, discount: number, rate: number): number {
  const cents = (value: number) => BigInt(Math.round(value * 100));
  const roundedDivide = (value: bigint, divisor: bigint) => (value * 2n + divisor) / (2n * divisor);
  const amounts = lines.map(line => cents(line.subtotal));
  const subtotal = amounts.reduce((sum, amount) => sum + amount, 0n);
  if (!subtotal || !rate) return 0;
  let cumulative = 0n;
  let allocated = 0n;
  let vat = 0n;
  lines.forEach((line, index) => {
    cumulative += amounts[index];
    const share = roundedDivide(cents(discount) * cumulative, subtotal);
    const net = amounts[index] - (share - allocated);
    allocated = share;
    if (line.vatEnabled) vat += roundedDivide(net * cents(rate), 10000n);
  });
  return Number(vat) / 100;
}
