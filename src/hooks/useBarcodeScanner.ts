import { useRef, useState, useCallback, useEffect, RefObject } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

export function useBarcodeScanner(onDetected: (barcode: string) => void) {
  const videoRef: RefObject<HTMLVideoElement | null> = useRef(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const generation = useRef(0);
  const detectedRef = useRef(onDetected);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { detectedRef.current = onDetected; }, [onDetected]);

  const stopScanning = useCallback(() => {
    generation.current += 1;
    controlsRef.current?.stop();
    controlsRef.current = null;
    setIsScanning(false);
  }, []);

  const startScanning = useCallback(async () => {
    stopScanning();
    const video = videoRef.current;
    if (!video) return;
    const attempt = generation.current;
    setError(null);
    try {
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: 'environment' } }, video,
        (result) => {
          if (attempt !== generation.current || !result) return;
          const barcode = result.getText().trim();
          if (!barcode) return;
          // One read per session: choose a quantity before scanning again.
          stopScanning();
          detectedRef.current(barcode);
        },
      );
      // Permission can resolve after closing or after the first decode.
      if (attempt !== generation.current) {
        controls.stop();
        return;
      }
      controlsRef.current = controls;
      setIsScanning(true);
    } catch (err: unknown) {
      if (attempt !== generation.current) return;
      setIsScanning(false);
      const name = err instanceof Error ? err.name : '';
      setError(name === 'NotAllowedError'
        ? 'Camera access denied. Allow camera permission, then retry.'
        : name === 'NotFoundError'
          ? 'No camera found. Connect a camera or use product search.'
          : 'Could not start the camera. Use HTTPS or localhost, check camera access, then retry.');
    }
  }, [stopScanning]);

  useEffect(() => () => {
    generation.current += 1;
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  return { videoRef, isScanning, error, startScanning, stopScanning };
}
