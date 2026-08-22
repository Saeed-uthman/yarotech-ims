import React, { useState } from 'react';
import { CompanyVariant } from '../../types';
import { formatNumber } from '../../utils/formatters';

interface StockLevelHeatmapProps {
  variants?: CompanyVariant[];
  totalStock?: number;
  compact?: boolean;
  className?: string;
  showLabels?: boolean;
}

export type HeatmapDensityTier = 'out_of_stock' | 'critical' | 'moderate' | 'optimal' | 'surplus';

interface DensityInfo {
  tier: HeatmapDensityTier;
  label: string;
  percentage: number;
  barColor: string;
  glowColor: string;
  badgeBg: string;
  badgeText: string;
  description: string;
}

/**
 * Computes density metrics and heatmap colors based on inventory buffer ratio
 */
export function calculateStockDensity(
  stock: number,
  reorderTarget: number,
  variantsCount: number = 1
): DensityInfo {
  // If target is 0, establish an implicit minimum baseline of 20 units per variant
  const effectiveTarget = reorderTarget > 0 ? reorderTarget : Math.max(15, variantsCount * 15);

  if (stock <= 0) {
    return {
      tier: 'out_of_stock',
      label: 'Depleted',
      percentage: 0,
      barColor: 'bg-rose-500',
      glowColor: 'shadow-rose-500/20',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      badgeText: 'text-rose-600',
      description: 'Zero stock recorded. Immediate reorder required.',
    };
  }

  const ratio = (stock / effectiveTarget) * 100;

  if (stock <= effectiveTarget * 0.5) {
    return {
      tier: 'critical',
      label: 'Critical Shortfall',
      percentage: Math.min(Math.round(ratio), 45),
      barColor: 'bg-rose-500',
      glowColor: 'shadow-rose-500/20',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      badgeText: 'text-rose-600',
      description: `Critical: Only ${Math.round(ratio)}% of minimum threshold.`,
    };
  }

  if (stock <= effectiveTarget) {
    return {
      tier: 'critical',
      label: 'Low Buffer',
      percentage: Math.min(Math.round(ratio), 60),
      barColor: 'bg-amber-500',
      glowColor: 'shadow-amber-500/20',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      badgeText: 'text-amber-600',
      description: `Low: ${Math.round(ratio)}% of reorder target.`,
    };
  }

  if (ratio < 130) {
    return {
      tier: 'moderate',
      label: 'Moderate',
      percentage: Math.min(Math.round((ratio / 200) * 100), 75),
      barColor: 'bg-lime-500',
      glowColor: 'shadow-lime-500/20',
      badgeBg: 'bg-lime-50 text-lime-800 border-lime-200',
      badgeText: 'text-lime-600',
      description: `Balanced inventory (${Math.round(ratio)}% buffer).`,
    };
  }

  if (ratio <= 280) {
    return {
      tier: 'optimal',
      label: 'Optimal Density',
      percentage: Math.min(Math.round((ratio / 280) * 100), 95),
      barColor: 'bg-emerald-500',
      glowColor: 'shadow-emerald-500/20',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      badgeText: 'text-emerald-600',
      description: `Healthy stock volume (${Math.round(ratio)}% buffer).`,
    };
  }

  return {
    tier: 'surplus',
    label: 'High Surplus',
    percentage: 100,
    barColor: 'bg-cyan-500',
    glowColor: 'shadow-cyan-500/20',
    badgeBg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    badgeText: 'text-cyan-600',
    description: `High inventory surplus (${Math.round(ratio)}% of reorder baseline).`,
  };
}

export const StockLevelHeatmap: React.FC<StockLevelHeatmapProps> = ({
  variants = [],
  totalStock: totalStockProp,
  compact = false,
  className = '',
  showLabels = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Compute total stock and total reorder level
  const totalStock =
    totalStockProp !== undefined
      ? totalStockProp
      : variants.reduce((sum, v) => sum + (Number(v.currentStock) || 0), 0);

  const totalReorderLevel = variants.reduce(
    (sum, v) => sum + (Number(v.reorderLevel) || 0),
    0
  );

  const density = calculateStockDensity(totalStock, totalReorderLevel, variants.length);

  // Determine segment heat for each individual variant if variants exist
  const variantSegments = variants.map((v) => {
    const vStock = Number(v.currentStock) || 0;
    const vReorder = Number(v.reorderLevel) || 0;
    const vDensity = calculateStockDensity(vStock, vReorder, 1);
    return {
      variant: v,
      stock: vStock,
      reorder: vReorder,
      density: vDensity,
    };
  });

  return (
    <div
      className={`relative inline-flex flex-col items-end group/heatmap ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      role="region"
      aria-label={`Stock density: ${density.label}, ${totalStock} units`}
    >
      {/* Visual Density Heatmap Bar */}
      <div className="flex items-center gap-1.5 cursor-help">
        {/* Micro Multi-Segment Heat Strip for multiple variants */}
        {variants.length > 1 ? (
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded border border-slate-200/80">
            {variantSegments.map((seg, idx) => (
              <span
                key={seg.variant.id || idx}
                title={`${seg.variant.companyName}: ${formatNumber(seg.stock)} units (${seg.density.label})`}
                className={`w-1.5 sm:w-2 h-2 sm:h-2.5 rounded-xs transition-transform hover:scale-125 ${
                  seg.stock === 0
                    ? 'bg-rose-500 animate-pulse'
                    : seg.stock <= seg.reorder
                    ? 'bg-amber-500'
                    : seg.density.tier === 'surplus'
                    ? 'bg-cyan-500'
                    : 'bg-emerald-500'
                }`}
              />
            ))}
          </div>
        ) : (
          /* Segmented 5-block micro-gauge for single variant or overall density */
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded border border-slate-200/80">
            {[1, 2, 3, 4, 5].map((blockIndex) => {
              const threshold = blockIndex * 20;
              const isFilled = density.percentage >= threshold - 10;
              return (
                <span
                  key={blockIndex}
                  className={`w-1.5 sm:w-2 h-2 sm:h-2.5 rounded-xs transition-colors ${
                    isFilled
                      ? density.barColor
                      : 'bg-slate-200'
                  } ${density.tier === 'out_of_stock' && blockIndex === 1 ? 'bg-rose-400 opacity-60 animate-pulse' : ''}`}
                />
              );
            })}
          </div>
        )}

        {/* Optional text density badge or tier dot */}
        {showLabels && (
          <span className={`text-[10px] font-semibold font-mono ${density.badgeText}`}>
            {density.label}
          </span>
        )}
      </div>

      {/* Floating Interactive Tooltip Popover */}
      {isHovered && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-64 p-3 bg-slate-900 text-slate-100 text-xs rounded-xl shadow-xl border border-slate-700 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
              Inventory Density
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                density.tier === 'out_of_stock'
                  ? 'bg-rose-900/60 text-rose-300 border border-rose-700'
                  : density.tier === 'critical'
                  ? 'bg-amber-900/60 text-amber-300 border border-amber-700'
                  : density.tier === 'surplus'
                  ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700'
                  : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
              }`}
            >
              {density.label}
            </span>
          </div>

          <div className="space-y-1.5 mb-2.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[11px]">Total Stock:</span>
              <span className="font-mono font-bold text-white text-[12px]">
                {formatNumber(totalStock)} units
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[11px]">Reorder Minimum:</span>
              <span className="font-mono text-slate-300 text-[11px]">
                {formatNumber(totalReorderLevel)} units
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[11px]">Buffer Capacity:</span>
              <span className="font-mono font-bold text-emerald-400 text-[11px]">
                {totalReorderLevel > 0
                  ? `${Math.round((totalStock / totalReorderLevel) * 100)}%`
                  : 'Target Met'}
              </span>
            </div>
          </div>

          {/* Variant Breakdown Heatmap */}
          {variants.length > 0 && (
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Brand Variants ({variants.length})
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                {variants.map((v) => {
                  const vStock = Number(v.currentStock) || 0;
                  const vReorder = Number(v.reorderLevel) || 0;
                  const isLow = vStock <= vReorder;
                  const isOut = vStock === 0;

                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between text-[11px] py-0.5"
                    >
                      <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isOut
                              ? 'bg-rose-500'
                              : isLow
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <span className="truncate text-slate-300">{v.companyName}</span>
                      </div>
                      <span className="font-mono font-medium text-slate-200">
                        {formatNumber(vStock)} units
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80 italic">
            {density.description}
          </p>
        </div>
      )}
    </div>
  );
};
