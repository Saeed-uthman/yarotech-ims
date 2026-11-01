import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  RotateCw,
  Plus,
  Eye,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
} from 'lucide-react';
import { QuoteEntity, QuoteStatus, UserRole, SystemSettings } from '../../types';
import { quoteService } from '../../services/quoteService';
import { QuoteDetailsModal } from './QuoteDetailsModal';
import { formatNaira as formatCurrency } from '../../utils/formatters';

const formatNaira = (amount: number) => formatCurrency(amount, true);

interface QuotesTabProps {
  role: UserRole;
  settings: SystemSettings;
  onCreateQuote: () => void;
  onConvertedToSale: (sale: any) => void;
}

export const QuotesTab: React.FC<QuotesTabProps> = ({
  role,
  settings,
  onCreateQuote,
  onConvertedToSale,
}) => {
  const [quotes, setQuotes] = useState<QuoteEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuote, setSelectedQuote] = useState<QuoteEntity | null>(null);
  const [page, setPage] = useState(1);

  const fetchQuotes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await quoteService.getQuotes({
        status: statusFilter,
        search: search.trim() || undefined,
        page,
      });
      if (response.success && response.data) {
        setQuotes(response.data);
      } else {
        setError(response.message || 'Failed to fetch quotations.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading quotations.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [statusFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchQuotes();
  };

  const getStatusBadge = (status: QuoteStatus, validUntil?: string) => {
    const isExpired = validUntil && new Date(validUntil) < new Date() && status !== 'CONVERTED';
    if (isExpired) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Expired
        </span>
      );
    }

    switch (status) {
      case 'CONVERTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Converted
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Accepted
          </span>
        );
      case 'SENT':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            Sent
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by quote number or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </form>

          {/* Status Filter & Actions */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="CONVERTED">Converted</option>
              <option value="EXPIRED">Expired</option>
            </select>

            <button
              onClick={fetchQuotes}
              disabled={isLoading}
              title="Refresh"
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onCreateQuote}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Quote</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
          {error}
        </div>
      )}

      {/* Table / Listing */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <RotateCw className="w-6 h-6 animate-spin mr-2" />
            <span className="text-sm font-medium">Loading quotations...</span>
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">No quotations found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Create a new proforma quotation directly or save from the POS sales screen.
            </p>
            <button
              onClick={onCreateQuote}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
            >
              <Plus className="w-4 h-4" /> Create Quotation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Quote #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">Valid Until</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotes.map((q) => {
                  const isExpired = q.validUntil && new Date(q.validUntil) < new Date() && q.status !== 'CONVERTED';
                  const canConvert = q.status !== 'CONVERTED' && !isExpired;

                  return (
                    <tr key={q.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {q.quoteNumber}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {q.customerName || 'Walk-in'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {q.createdAt
                          ? new Date(q.createdAt).toLocaleDateString('en-NG', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${isExpired ? 'text-rose-600' : 'text-slate-700'}`}>
                          {q.validUntil
                            ? new Date(q.validUntil).toLocaleDateString('en-NG', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        {q.itemsCount ?? (q.items ? q.items.length : 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatNaira(q.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(q.status, q.validUntil)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedQuote(q)}
                            title="View Quote Details"
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canConvert && (
                            <button
                              onClick={() => setSelectedQuote(q)}
                              title="Convert to Sale"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] transition-colors"
                            >
                              <span>Convert</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quote Details & Conversion Modal */}
      <QuoteDetailsModal
        quote={selectedQuote}
        isOpen={!!selectedQuote}
        onClose={() => setSelectedQuote(null)}
        onConverted={(sale) => {
          setSelectedQuote(null);
          fetchQuotes();
          onConvertedToSale(sale);
        }}
      />
    </div>
  );
};

