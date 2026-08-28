import React, { useEffect } from 'react';
import { 
  X, 
  Keyboard, 
  Search, 
  Compass, 
  Sparkles
} from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction?: (actionId: string) => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const metaKeyLabel = isMac ? '⌘' : 'Ctrl';

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: 'Global Essentials',
      icon: Sparkles,
      shortcuts: [
        {
          keys: [metaKeyLabel, 'P'],
          label: 'Create Product',
          description: 'Open product creation wizard directly',
          actionId: 'add-product',
        },
        {
          keys: [metaKeyLabel, 'F'],
          altKeys: [metaKeyLabel, 'K'],
          label: 'Focus Search',
          description: 'Instantly jump to search medicines or records',
          actionId: 'search',
        },
        {
          keys: [metaKeyLabel, 'B'],
          altKeys: ['F2'],
          label: 'Barcode Scanner',
          description: 'Scan medicine barcodes with camera or USB gun',
          actionId: 'barcode',
        },
        {
          keys: [metaKeyLabel, 'E'],
          altKeys: ['Alt', 'E'],
          label: 'Stock Audit Export',
          description: 'Export filtered catalog to CSV / PDF count sheet',
          actionId: 'export-audit',
        },
        {
          keys: ['Esc'],
          label: 'Close / Cancel',
          description: 'Dismiss any open modal or cancel editing',
        },
        {
          keys: ['?'],
          altKeys: [metaKeyLabel, '/'],
          label: 'Shortcuts Cheatsheet',
          description: 'Display this keyboard shortcuts overview',
        },
      ],
    },
    {
      title: 'Module Navigation',
      icon: Compass,
      shortcuts: [
        { keys: ['Alt', '1'], label: 'Dashboard', description: 'Executive metrics and revenue graphs' },
        { keys: ['Alt', '2'], label: 'Products', description: 'Master pharmaceutical catalog' },
        { keys: ['Alt', '3'], label: 'Inventory', description: 'Stock levels and movement history' },
        { keys: ['Alt', '4'], label: 'Stock Purchases', description: 'Supplier orders and invoices' },
        { keys: ['Alt', '5'], label: 'Customers', description: 'Patient directory and debt ledger' },
        { keys: ['Alt', '6'], label: 'Sales & POS', description: 'Dispensing terminal and receipt issuance' },
        { keys: ['Alt', '7'], label: 'Reports', description: 'Financial analytics and movement audits' },
        { keys: ['Alt', '8'], label: 'Accountability', description: 'Financial postings and audit records' },
        { keys: ['Alt', '9'], label: 'Settings', description: 'Pharmacy profile and backup preferences' },
      ],
    },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs shrink-0">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 id="shortcuts-modal-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Speed up clinical dispensing, catalog management, and stock auditing
              </p>
            </div>
          </div>

          <button
            id="close-shortcuts-modal-btn"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Close shortcuts dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 dark:text-slate-300">
          {shortcutGroups.map((group, groupIdx) => {
            const GroupIcon = group.icon;
            return (
              <div key={groupIdx} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800">
                  <GroupIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{group.title}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {group.shortcuts.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((k, kIdx) => (
                          <React.Fragment key={kIdx}>
                            <kbd className="px-2 py-1 text-xs font-mono font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md shadow-2xs min-w-[24px] text-center">
                              {k}
                            </kbd>
                            {kIdx < item.keys.length - 1 && (
                              <span className="text-slate-400 text-xs font-mono">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300">
              ?
            </kbd>
            <span>Press anywhere to reopen shortcuts</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
