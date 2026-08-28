import { useEffect } from 'react';

export interface KeyboardShortcutsConfig {
  onOpenAddProduct?: () => void;
  onFocusSearch?: () => void;
  onOpenBarcodeScanner?: () => void;
  onOpenShortcutsModal?: () => void;
  onCloseCurrentModal?: () => void;
  onOpenExportAudit?: () => void;
  onNavigate?: (nav: string) => void;
  isEnabled?: boolean;
}

export function useKeyboardShortcuts({
  onOpenAddProduct,
  onFocusSearch,
  onOpenBarcodeScanner,
  onOpenShortcutsModal,
  onCloseCurrentModal,
  onOpenExportAudit,
  onNavigate,
  isEnabled = true,
}: KeyboardShortcutsConfig) {
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const isAlt = e.altKey;
      const isShift = e.shiftKey;
      const key = e.key.toLowerCase();
      const code = e.code;

      const target = e.target as HTMLElement | null;
      const isTypingInInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // 1. Shortcut: 'Ctrl+P' or 'Cmd+P' -> Open Product Wizard
      if (isCtrlOrMeta && key === 'p' && !isAlt && !isShift) {
        e.preventDefault();
        e.stopPropagation();
        if (onOpenAddProduct) {
          onOpenAddProduct();
        }
        return;
      }

      // 2. Shortcut: 'Ctrl+F' or 'Cmd+F' -> Focus Search Bar
      if (isCtrlOrMeta && key === 'f' && !isAlt && !isShift) {
        e.preventDefault();
        e.stopPropagation();
        if (onFocusSearch) {
          onFocusSearch();
        }
        return;
      }

      // 2b. Secondary search focus shortcuts: 'Ctrl+K' / 'Cmd+K' OR single '/' when not in input
      if ((isCtrlOrMeta && key === 'k' && !isAlt && !isShift) || (!isCtrlOrMeta && !isAlt && key === '/' && !isTypingInInput)) {
        e.preventDefault();
        e.stopPropagation();
        if (onFocusSearch) {
          onFocusSearch();
        }
        return;
      }

      // 3. Shortcut: 'Ctrl+B' or 'Cmd+B' or 'F2' -> Open Barcode Scanner
      if ((isCtrlOrMeta && key === 'b' && !isAlt && !isShift) || key === 'f2') {
        e.preventDefault();
        e.stopPropagation();
        if (onOpenBarcodeScanner) {
          onOpenBarcodeScanner();
        }
        return;
      }

      // 3b. Shortcut: 'Ctrl+E' or 'Cmd+E' or 'Alt+E' -> Open Stock Audit Export
      if ((isCtrlOrMeta && key === 'e' && !isAlt && !isShift) || (isAlt && key === 'e')) {
        e.preventDefault();
        e.stopPropagation();
        if (onOpenExportAudit) {
          onOpenExportAudit();
        }
        return;
      }

      // 4. Shortcut: '?' (Shift + /) or 'Ctrl+/' -> Open Keyboard Shortcuts Cheatsheet
      if (((key === '?' || (isShift && key === '/')) && !isTypingInInput) || (isCtrlOrMeta && key === '/')) {
        e.preventDefault();
        e.stopPropagation();
        if (onOpenShortcutsModal) {
          onOpenShortcutsModal();
        }
        return;
      }

      // 5. Shortcut: Escape -> Close active modal / cancel / blur
      if (key === 'escape') {
        if (onCloseCurrentModal) {
          onCloseCurrentModal();
        }
        return;
      }

      // 6. Navigation with Alt + [1-9] when not conflicting
      if (isAlt && !isCtrlOrMeta && !isShift && onNavigate) {
        const navMap: Record<string, string> = {
          '1': 'dashboard',
          '2': 'products',
          '3': 'inventory',
          '4': 'stock-purchase',
          '5': 'customers',
          '6': 'sales',
          '7': 'reports',
          '8': 'accountability',
          '9': 'settings',
        };
        if (navMap[e.key]) {
          e.preventDefault();
          e.stopPropagation();
          onNavigate(navMap[e.key]);
          return;
        }
      }

    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [
    isEnabled,
    onOpenAddProduct,
    onFocusSearch,
    onOpenBarcodeScanner,
    onOpenShortcutsModal,
    onCloseCurrentModal,
    onNavigate,
  ]);
}
