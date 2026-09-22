import { useRef, useState, useCallback, useEffect, RefObject } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';

interface UseBarcodeScanner {
  videoRef: RefObject<HTMLVideoElement | null>;
  isScanning: boolean;
  error: string | null;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
}

export function useBarcodeScanner(onDetected: (barcode: string) => void): UseBarcodeScanner {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastScannedRef = useRef<string>('');
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopScanning = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    if (cooldownRef.current) clearTimeout(cooldownRef.current);
    lastScannedRef.current = '';
    setIsScanning(false);
  }, []);

  const startScanning = useCallback(async () => {
    if (!videoRef.current) return;
    setError(null);

    try {
      readerRef.current = new BrowserMultiFormatReader();
      setIsScanning(true);

      const controls = await readerRef.current.decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current,
        (result, err) => {
          if (result) {
            const text = result.getText();
            // Debounce: ignore same barcode within 1.5 s
            if (text === lastScannedRef.current) return;
            lastScannedRef.current = text;
            onDetected(text);
            cooldownRef.current = setTimeout(() => {
              lastScannedRef.current = '';
            }, 1500);
          } else if (err && !(err instanceof NotFoundException)) {
            // NotFoundException fires every frame when nothing is in view — ignore it
          }
        }
      );

      controlsRef.current = controls;
    } catch (err: any) {
      setIsScanning(false);
      if (err?.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permission in your browser and try again.');
      } else if (err?.name === 'NotFoundError') {
        setError('No camera found. Please connect a webcam and try again.');
      } else {
        setError('Could not start camera: ' + (err?.message || 'Unknown error'));
      }
    }
  }, [onDetected]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  return { videoRef, isScanning, error, startScanning, stopScanning };
}
