import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseHardwareBarcodeScannerOptions {
  /**
   * Whether the scanner listener is currently active (e.g. modal is open)
   */
  enabled?: boolean;
  /**
   * Callback invoked when a valid barcode scan is decoded
   */
  onScan: (barcode: string) => void | Promise<void>;
  /**
   * Maximum latency in milliseconds between keystrokes to be considered hardware scanner input
   * Default: 50ms (human typing is typically 100-250ms)
   */
  maxInterKeyDelayMs?: number;
  /**
   * Minimum barcode character length to avoid single accidental Enter triggers
   * Default: 3
   */
  minBarcodeLength?: number;
}

/**
 * Custom hook to capture rapid keystroke bursts from USB / 2.4GHz / Bluetooth
 * hardware barcode scanners in HID Keyboard Emulation Mode.
 */
export function useHardwareBarcodeScanner({
  enabled = true,
  onScan,
  maxInterKeyDelayMs = 50,
  minBarcodeLength = 3,
}: UseHardwareBarcodeScannerOptions) {
  const [isScannerReady, setIsScannerReady] = useState(enabled);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    setIsScannerReady(enabled);
  }, [enabled]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const target = event.target as HTMLElement | null;
      // If the user is specifically typing in an input marked for direct serial entry,
      // let that input field handle the serial directly.
      if (target?.getAttribute('data-serial-scanner-input') === 'true') {
        return;
      }

      // Ignore modifier combinations like Ctrl+C, Alt+F, etc.
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      const now = Date.now();
      const elapsed = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Handle barcode completion via 'Enter'
      if (event.key === 'Enter') {
        const scannedText = bufferRef.current.trim();
        bufferRef.current = '';

        if (scannedText.length >= minBarcodeLength) {
          // Prevent any surrounding form submit or unwanted Enter action
          event.preventDefault();
          event.stopPropagation();

          setLastScannedCode(scannedText);
          void onScanRef.current(scannedText);
        }
        return;
      }

      // Only accumulate printable single characters
      if (event.key.length === 1) {
        // If elapsed time between keystrokes is too long, reset the buffer (human typing)
        if (elapsed > maxInterKeyDelayMs && bufferRef.current.length > 0) {
          bufferRef.current = '';
        }
        bufferRef.current += event.key;
      }
    },
    [enabled, maxInterKeyDelayMs, minBarcodeLength]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [enabled, handleKeyDown]);

  return {
    isScannerReady,
    lastScannedCode,
  };
}

