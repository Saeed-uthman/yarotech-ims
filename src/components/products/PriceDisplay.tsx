import React from 'react';
import { UserRole } from '../../types';
import { formatNaira, calculateUnitMargin } from '../../utils/formatters';

interface PriceDisplayProps {
  amount: number;
  currentRole?: UserRole;
  type?: 'sellingPrice' | 'basePrice' | 'inventoryValue' | 'margin';
  includeDecimals?: boolean;
  className?: string;
  sublabel?: string;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  amount,
  currentRole = 'admin',
  type = 'sellingPrice',
  includeDecimals = false,
  className = '',
  sublabel,
}) => {
  const isCashier = currentRole === 'cashier';

  // Base Price, Inventory Value, and Margin calculations are STRICTLY hidden from cashiers
  if (isCashier && (type === 'basePrice' || type === 'inventoryValue' || type === 'margin')) {
    return null;
  }

  const formattedAmount = formatNaira(amount, includeDecimals);

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <span className="font-mono font-semibold tracking-tight text-slate-900">
        {formattedAmount}
      </span>
      {sublabel && (
        <span className="text-[10px] text-slate-500 font-medium">
          {sublabel}
        </span>
      )}
    </div>
  );
};
