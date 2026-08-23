import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Building2,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  User,
  FileText,
  Layers,
  Sparkles,
  ShieldAlert,
  Percent,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart3,
  Filter,
} from 'lucide-react';
import { 
  Product, 
  UserRole, 
  ProductPriceAdjustment, 
  CreatePriceAdjustmentInput,
  PriceAdjustmentType
} from '../../types';
import { priceHistoryService } from '../../services/priceHistoryService';
import { formatNaira, formatNumber } from '../../utils/formatters';
import { exportTableToPDF } from '../../utils/pdfExport';

interface ProductPriceHistoryTabProps {
  product: Product;
  currentRole: UserRole;
  onPriceAdjusted?: () => void;
}

const VARIANT_COLORS = [
  '#2563eb', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#e11d48', // Rose
  '#84cc16', // Lime
];

export const ProductPriceHistoryTab: React.FC<ProductPriceHistoryTabProps> = ({
  product,
  currentRole,
  onPriceAdjusted,
}) => {
  const isAdmin = currentRole === 'admin';

  // Filters State
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '6m' | '1y' | 'all'>('all');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('all');
  const [chartViewMode, setChartViewMode] = useState<'selling' | 'comparison' | 'margin'>('selling');
  
  // Data State
  const [adjustments, setAdjustments] = useState<ProductPriceAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Modal State
  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);
  const [adjustForm, setAdjustForm] = useState({
    variantId: product.variants[0]?.id || '',
    newBasePrice: product.variants[0]?.basePrice || 0,
    newSellingPrice: product.variants[0]?.sellingPrice || 0,
    reason: '',
    effectiveDate: new Date().toISOString().split('T')[0],
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch adjustments
  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await priceHistoryService.getProductPriceHistory(product, currentRole);
      if (res.data) {
        setAdjustments(res.data);
      }
    } catch (err) {
      console.error('Failed to load price history', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [product.id, currentRole]);

  // Update default form values when variants change or when modal opens
  useEffect(() => {
    if (product.variants.length > 0) {
      const activeVariant = product.variants.find((v) => v.id === adjustForm.variantId) || product.variants[0];
      setAdjustForm((prev) => ({
        ...prev,
        variantId: activeVariant.id,
        newBasePrice: activeVariant.basePrice,
        newSellingPrice: activeVariant.sellingPrice,
      }));
    }
  }, [product.variants]);

  // Handle variant selection in modal
  const handleVariantSelectInModal = (variantId: string) => {
    const v = product.variants.find((item) => item.id === variantId);
    if (v) {
      setAdjustForm({
        ...adjustForm,
        variantId: v.id,
        newBasePrice: v.basePrice,
        newSellingPrice: v.sellingPrice,
      });
    }
  };

  // Generate timeline and summary
  const { timeline, summary } = useMemo(() => {
    return priceHistoryService.generateChartData(
      product,
      adjustments,
      timeRange,
      selectedVariantId,
      currentRole
    );
  }, [product, adjustments, timeRange, selectedVariantId, currentRole]);

  // Filtered adjustments list for table
  const filteredTableAdjustments = useMemo(() => {
    if (selectedVariantId === 'all') return adjustments;
    return adjustments.filter((a) => a.variantId === selectedVariantId);
  }, [adjustments, selectedVariantId]);

  // Handle new adjustment submission
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.variantId || adjustForm.newSellingPrice <= 0) return;

    setIsSubmitting(true);
    try {
      const input: CreatePriceAdjustmentInput = {
        productId: product.id,
        variantId: adjustForm.variantId,
        newBasePrice: Number(adjustForm.newBasePrice),
        newSellingPrice: Number(adjustForm.newSellingPrice),
        reason: adjustForm.reason.trim() || 'Scheduled price review & market realignment',
        effectiveDate: adjustForm.effectiveDate,
        adjustedBy: isAdmin ? 'Administrator' : 'Pharmacy Dispenser',
      };

      await priceHistoryService.addPriceAdjustment(product, input, currentRole);
      setShowAdjustModal(false);
      setNotification({
        type: 'success',
        message: 'Price adjustment successfully recorded in the audit ledger and catalog.',
      });
      setTimeout(() => setNotification(null), 4000);
      
      await loadHistory();
      if (onPriceAdjusted) onPriceAdjusted();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.message || 'Failed to record price adjustment.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (adjustments.length === 0) return;

    const headers = isAdmin
      ? ['Date', 'Manufacturer', 'Old Cost (₦)', 'New Cost (₦)', 'Old Selling (₦)', 'New Selling (₦)', 'Type', 'By', 'Reason']
      : ['Date', 'Manufacturer', 'Old Selling (₦)', 'New Selling (₦)', 'Type', 'By', 'Reason'];

    const rows = adjustments.map((a) => {
      if (isAdmin) {
        return [
          a.effectiveDate,
          a.companyName,
          a.oldBasePrice.toLocaleString(),
          a.newBasePrice.toLocaleString(),
          a.oldSellingPrice.toLocaleString(),
          a.newSellingPrice.toLocaleString(),
          a.changeType,
          a.adjustedBy,
          a.reason,
        ];
      }
      return [
        a.effectiveDate,
        a.companyName,
        a.oldSellingPrice.toLocaleString(),
        a.newSellingPrice.toLocaleString(),
        a.changeType,
        a.adjustedBy,
        a.reason,
      ];
    });

    exportTableToPDF(`${product.name.replace(/\s+/g, '_')}_Price_History`, headers, rows, {
      title: `${product.name} - Pricing Adjustment & Margin History`,
      subtitle: `Product: ${product.name} (${product.dosage} ${product.form}) | Category: ${product.category}`,
      orientation: 'landscape',
      includeSignatures: true,
      footerNote: 'Confidential - Al-Amaan Medicine Store Pricing Ledger',
    });
  };

  // Custom Chart Tooltip
  const CustomPriceTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs backdrop-blur-xs max-w-xs animate-in fade-in duration-100">
          <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-1.5 mb-2">
            <span className="font-bold text-slate-200">{dataPoint.displayDate}</span>
            <span className="text-[10px] font-mono text-slate-400">{dataPoint.date}</span>
          </div>

          <div className="space-y-1.5 font-mono">
            {chartViewMode === 'selling' && (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-300">Avg Selling:</span>
                  <span className="font-bold text-blue-400">{formatNaira(dataPoint.avgSellingPrice)}</span>
                </div>
                {product.variants.map((v) => {
                  const key = `${v.companyName}_selling`;
                  if (dataPoint[key] !== undefined && selectedVariantId === 'all') {
                    return (
                      <div key={v.id} className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
                        <span className="truncate">{v.companyName}:</span>
                        <span className="font-semibold text-slate-200">{formatNaira(dataPoint[key])}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </>
            )}

            {chartViewMode === 'comparison' && (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-emerald-400">Retail Selling:</span>
                  <span className="font-bold text-emerald-400">{formatNaira(dataPoint.avgSellingPrice)}</span>
                </div>
                {isAdmin && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Base Cost:</span>
                    <span className="font-bold text-slate-300">{formatNaira(dataPoint.avgBasePrice)}</span>
                  </div>
                )}
                {isAdmin && (
                  <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800 text-[11px]">
                    <span className="text-amber-400">Unit Margin:</span>
                    <span className="font-bold text-amber-400">
                      +{formatNaira(dataPoint.avgMargin)} ({dataPoint.marginPct}%)
                    </span>
                  </div>
                )}
              </>
            )}

            {chartViewMode === 'margin' && isAdmin && (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-amber-400">Gross Margin:</span>
                  <span className="font-bold text-amber-400">{dataPoint.marginPct}%</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400">
                  <span>Gross Spread:</span>
                  <span>+{formatNaira(dataPoint.avgMargin)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-3 rounded-lg border flex items-center justify-between text-xs font-semibold ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span>Price History & Trend Analysis</span>
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {adjustments.length} Adjustments Logged
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Historical pricing trajectory, inflation shifts, and wholesale cost margins over time
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="price-history-export-btn"
            onClick={handleExportPDF}
            disabled={adjustments.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 rounded-md text-xs font-semibold text-rose-700 shadow-2xs transition-colors disabled:opacity-40"
            title="Download pricing history ledger as PDF report"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>Export PDF</span>
          </button>

          {isAdmin ? (
            <button
              id="price-history-adjust-btn"
              onClick={() => setShowAdjustModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-md text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Record Price Adjustment</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-500 rounded-md text-xs font-medium border border-slate-200/60">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Price Changes Restricted to Admin</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Current Avg Selling Price */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Current Avg Price</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900">
              {formatNaira(summary.currentAvgSelling)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px]">
            {summary.netChangePercent >= 0 ? (
              <span className="inline-flex items-center font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
                +{summary.netChangePercent}%
              </span>
            ) : (
              <span className="inline-flex items-center font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                <ArrowDownRight className="w-3 h-3 mr-0.5" />
                {summary.netChangePercent}%
              </span>
            )}
            <span className="text-slate-400">vs baseline (₦{formatNumber(summary.initialAvgSelling)})</span>
          </div>
        </div>

        {/* Card 2: Historical Range (High / Low) */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Historical Range</span>
            <BarChart3 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Lowest</span>
              <span className="text-sm font-bold text-slate-700">{formatNaira(summary.lowestSellingPrice)}</span>
            </div>
            <span className="text-slate-300 font-sans">➔</span>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Highest</span>
              <span className="text-sm font-bold text-slate-900">{formatNaira(summary.highestSellingPrice)}</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <span className="text-slate-400">Spread:</span>
            <span className="font-semibold font-mono text-slate-700">
              +{formatNaira(summary.highestSellingPrice - summary.lowestSellingPrice)}
            </span>
          </div>
        </div>

        {/* Card 3: Commercial Gross Margin (Admin) or Stability Index (Cashier) */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{isAdmin ? 'Gross Margin' : 'Price Stability'}</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2 font-mono">
            {isAdmin ? (
              <>
                <span className="text-xl sm:text-2xl font-extrabold text-emerald-700">
                  {summary.currentMarginPercent}%
                </span>
                <span className="text-xs text-emerald-600 font-bold">
                  (+{formatNaira(summary.currentGrossMargin)})
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-slate-800">
                {summary.netChangePercent < 15 ? 'High Stability' : 'Active Index'}
              </span>
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {isAdmin ? 'Average markup on base cost' : 'Catalog pricing trend tier'}
          </div>
        </div>

        {/* Card 4: Last Adjustment Details */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Latest Adjustment</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <span className="text-sm font-bold text-slate-900 block truncate">
              {summary.lastAdjustmentDate || 'Recent'}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate" title={summary.lastAdjustmentReason || 'Initial baseline'}>
              {summary.lastAdjustmentReason || 'Initial catalog baseline'}
            </p>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {summary.totalAdjustmentsCount} historical changes recorded
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-5 sm:p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Chart View Modes */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200/80 w-fit">
            <button
              onClick={() => setChartViewMode('selling')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                chartViewMode === 'selling'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Retail Selling Price
            </button>
            {isAdmin && (
              <button
                onClick={() => setChartViewMode('comparison')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  chartViewMode === 'comparison'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cost vs Selling Price
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setChartViewMode('margin')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  chartViewMode === 'margin'
                    ? 'bg-white text-amber-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Gross Margin %
              </button>
            )}
          </div>

          {/* Filters: Manufacturer Variant & Time Range */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Manufacturer Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">Manufacturer:</span>
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Manufacturers ({product.variants.length})</option>
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.companyName} ({formatNaira(v.sellingPrice)})
                  </option>
                ))}
              </select>
            </div>

            {/* Timeframe Pill Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200/80">
              {(['30d', '90d', '6m', '1y', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                    timeRange === range
                      ? 'bg-white text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-[320px] w-full pt-2">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Loading price history graph...
            </div>
          ) : timeline.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
              <TrendingUp className="w-8 h-8 text-slate-300 mb-2" />
              <span>No historical data available for selected criteria</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartViewMode === 'comparison' && isAdmin ? (
                <ComposedChart data={timeline} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    stroke="#cbd5e1"
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    stroke="#cbd5e1"
                    tickLine={false}
                    tickFormatter={(val) => `₦${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip content={<CustomPriceTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  
                  <Line
                    type="monotone"
                    dataKey="avgSellingPrice"
                    name="Retail Selling Price (₦)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgBasePrice"
                    name="Wholesale Base Cost (₦)"
                    stroke="#64748b"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#64748b' }}
                  />
                </ComposedChart>
              ) : chartViewMode === 'margin' && isAdmin ? (
                <LineChart data={timeline} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    stroke="#cbd5e1"
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    stroke="#cbd5e1"
                    tickLine={false}
                    unit="%"
                  />
                  <Tooltip content={<CustomPriceTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <ReferenceLine y={25} stroke="#cbd5e1" strokeDasharray="3 3" label={{ value: 'Target 25%', fill: '#94a3b8', fontSize: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="marginPct"
                    name="Gross Margin Markup (%)"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2 }}
                  />
                </LineChart>
              ) : (
                <LineChart data={timeline} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    stroke="#cbd5e1"
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    stroke="#cbd5e1"
                    tickLine={false}
                    tickFormatter={(val) => `₦${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip content={<CustomPriceTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                  {/* Main Avg Line */}
                  <Line
                    type="monotone"
                    dataKey="avgSellingPrice"
                    name="Average Selling Price (₦)"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
                  />

                  {/* When viewing all variants, draw secondary variant lines */}
                  {selectedVariantId === 'all' && product.variants.map((v, i) => {
                    const key = `${v.companyName}_selling`;
                    const color = VARIANT_COLORS[(i + 1) % VARIANT_COLORS.length];
                    return (
                      <Line
                        key={v.id}
                        type="monotone"
                        dataKey={key}
                        name={`${v.companyName} (₦)`}
                        stroke={color}
                        strokeWidth={1.5}
                        strokeDasharray="2 2"
                        dot={{ r: 2.5, fill: color }}
                      />
                    );
                  })}
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Audit Trail & Adjustments History Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              <span>Historical Price Adjustment Ledger</span>
            </h3>
            <p className="text-xs text-slate-500">
              Chronological log of all retail price revisions and manufacturer wholesale updates
            </p>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800 font-mono">{filteredTableAdjustments.length}</strong> recorded event(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Effective Date</th>
                <th className="py-3 px-4 font-semibold">Manufacturer</th>
                <th className="py-3 px-4 font-semibold text-right">Selling Price (₦)</th>
                {isAdmin && <th className="py-3 px-4 font-semibold text-right">Base Cost (₦)</th>}
                <th className="py-3 px-4 font-semibold text-center">Change Type</th>
                <th className="py-3 px-4 font-semibold">Reason & Clinical Note</th>
                <th className="py-3 px-4 font-semibold">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTableAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-8 text-center text-slate-400">
                    No price adjustment records found for this selection.
                  </td>
                </tr>
              ) : (
                filteredTableAdjustments.map((item) => {
                  const priceDiff = item.newSellingPrice - item.oldSellingPrice;
                  const priceDiffPct = item.oldSellingPrice > 0 
                    ? ((priceDiff / item.oldSellingPrice) * 100).toFixed(1) 
                    : '100';

                  const isInitial = item.changeType === 'INITIAL' || item.oldSellingPrice === 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Date */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.effectiveDate}</span>
                        </div>
                      </td>

                      {/* Manufacturer Variant */}
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{item.companyName}</span>
                        </div>
                      </td>

                      {/* Selling Price Adjustment */}
                      <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {formatNaira(item.newSellingPrice)}
                        </div>
                        {!isInitial && (
                          <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                            <span>From {formatNaira(item.oldSellingPrice)}</span>
                            <span className={priceDiff >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                              ({priceDiff >= 0 ? `+${priceDiffPct}%` : `${priceDiffPct}%`})
                            </span>
                          </div>
                        )}
                        {isInitial && (
                          <span className="text-[10px] text-slate-400">Baseline Price</span>
                        )}
                      </td>

                      {/* Base Cost (Admin only) */}
                      {isAdmin && (
                        <td className="py-3 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                          <div className="font-medium text-slate-700">
                            {formatNaira(item.newBasePrice)}
                          </div>
                          {!isInitial && item.oldBasePrice > 0 && (
                            <div className="text-[10px] text-slate-400">
                              Prev: {formatNaira(item.oldBasePrice)}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Change Type Badge */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {item.changeType === 'INITIAL' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Initial Onboard
                          </span>
                        )}
                        {item.changeType === 'INCREASE' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Price Increase
                          </span>
                        )}
                        {item.changeType === 'DECREASE' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Price Markdown
                          </span>
                        )}
                        {item.changeType === 'SUPPLIER_REVISION' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            Supplier Revision
                          </span>
                        )}
                        {item.changeType === 'CORRECTION' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Data Correction
                          </span>
                        )}
                      </td>

                      {/* Reason & Clinical Note */}
                      <td className="py-3 px-4 max-w-xs text-slate-600">
                        <p className="line-clamp-2 leading-relaxed" title={item.reason}>
                          {item.reason}
                        </p>
                      </td>

                      {/* Changed By */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium text-slate-700">{item.adjustedBy}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Price Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span>Record Price Adjustment</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update retail price and wholesale baseline for {product.name}
                </p>
              </div>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-5 space-y-4 text-xs sm:text-sm overflow-y-auto">
              {/* Variant Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Manufacturer Variant *
                </label>
                <select
                  value={adjustForm.variantId}
                  onChange={(e) => handleVariantSelectInModal(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-semibold focus:ring-1 focus:ring-blue-500"
                >
                  {product.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.companyName} (Current: Selling {formatNaira(v.sellingPrice)} | Cost {formatNaira(v.basePrice)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Selling Price (₦) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={adjustForm.newSellingPrice}
                    onChange={(e) => setAdjustForm({ ...adjustForm, newSellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-mono font-bold focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Patient retail price at dispensary</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Base Cost (₦) {isAdmin ? '*' : '(Redacted)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required={isAdmin}
                    disabled={!isAdmin}
                    value={adjustForm.newBasePrice}
                    onChange={(e) => setAdjustForm({ ...adjustForm, newBasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-mono font-bold focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Wholesale purchase invoice cost</span>
                </div>
              </div>

              {/* Computed Margin Preview */}
              {isAdmin && adjustForm.newSellingPrice > 0 && adjustForm.newBasePrice > 0 && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between font-mono text-xs">
                  <div>
                    <span className="text-blue-700 font-bold block">Estimated Gross Margin:</span>
                    <span className="text-blue-900 font-extrabold text-sm">
                      +{formatNaira(adjustForm.newSellingPrice - adjustForm.newBasePrice)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-blue-700 font-bold block">Markup %:</span>
                    <span className="text-blue-900 font-extrabold text-sm">
                      {(( (adjustForm.newSellingPrice - adjustForm.newBasePrice) / adjustForm.newBasePrice ) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Effective Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Effective Date *
                </label>
                <input
                  type="date"
                  required
                  value={adjustForm.effectiveDate}
                  onChange={(e) => setAdjustForm({ ...adjustForm, effectiveDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-medium focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Reason / Clinical Justification */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Adjustment & Notes *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Manufacturer price revision on raw active ingredients, supplier invoice update, inflation index markup"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-medium focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-md text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Saving...' : 'Apply & Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
