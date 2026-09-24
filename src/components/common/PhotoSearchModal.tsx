import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { CompanyVariant, Product } from '../../types';
import { findProductsByPhoto, PhotoSearchResult } from '../../services/productPhoto';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface Props {
  isOpen: boolean;
  mode: 'sale' | 'purchase';
  quantities?: Record<string, number>;
  onClose: () => void;
  onAdd: (product: Product, variant: CompanyVariant, quantity: number) => void;
}

export function PhotoSearchModal({ isOpen, ...props }: Props) {
  return isOpen ? <PhotoSearchSession {...props} /> : null;
}

function PhotoSearchSession({ mode, quantities, onClose, onAdd }: Omit<Props, 'isOpen'>) {
  const [phase, setPhase] = useState<'capture' | 'loading' | 'results'>('capture');
  const [result, setResult] = useState<PhotoSearchResult | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [camera, setCamera] = useState<'off' | 'starting' | 'on'>('off');
  const [videoReady, setVideoReady] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const cameraAttempt = useRef(0);
  const request = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const busy = useRef(false);

  const stopCamera = () => {
    cameraAttempt.current += 1;
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    setCamera('off');
    setVideoReady(false);
  };
  useEffect(() => {
    alive.current = true;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => {
      alive.current = false;
      cameraAttempt.current += 1;
      request.current?.abort();
      stream.current?.getTracks().forEach(track => track.stop());
      previous?.focus();
    };
  }, []);
  useEffect(() => { if (phase !== 'capture') dialog.current?.focus(); }, [phase]);

  const startCamera = async () => {
    stopCamera();
    const attempt = cameraAttempt.current;
    setError('');
    setCamera('starting');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera requires HTTPS and a supported browser. You can also choose a photo.');
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
      if (!alive.current || attempt !== cameraAttempt.current) {
        media.getTracks().forEach(track => track.stop());
        return;
      }
      stream.current = media;
      video.current!.srcObject = media;
      await video.current!.play();
      if (alive.current && attempt === cameraAttempt.current) setCamera('on');
    } catch (e) {
      if (!alive.current || attempt !== cameraAttempt.current) return;
      stopCamera();
      setError(e instanceof Error && e.name === 'NotAllowedError'
        ? 'Camera access denied. Allow permission or choose a photo.' : 'Camera unavailable. Use HTTPS, retry, or choose a photo.');
    }
  };

  const search = async (file: Blob) => {
    if (busy.current || !alive.current) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
      setError('Choose a JPEG, PNG or WebP photo no larger than 4 MB.');
      return;
    }
    busy.current = true;
    stopCamera();
    setError('');
    setPhase('loading');
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const found = await findProductsByPhoto(file, controller.signal);
      if (!alive.current) return;
      setResult(found);
      setPhase('results');
    } catch (e) {
      if (!alive.current) return;
      setError(controller.signal.aborted ? 'Photo search timed out. Please try again.' : e instanceof Error ? e.message : 'Photo search failed. Please try again.');
      setPhase('capture');
    } finally {
      window.clearTimeout(timeout);
      busy.current = false;
    }
  };
  const capture = () => {
    const source = video.current;
    if (!source?.videoWidth || busy.current) return;
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1280 / Math.max(source.videoWidth, source.videoHeight));
    canvas.width = Math.round(source.videoWidth * scale);
    canvas.height = Math.round(source.videoHeight * scale);
    canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => { if (blob && alive.current) void search(blob); }, 'image/jpeg', 0.85);
  };

  if (selected) return <BarcodeScannerModal isOpen mode={mode} quantities={quantities}
    initialProduct={selected} onAdd={onAdd} onClose={onClose} />;

  return <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
    onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const controls = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') || [])];
        const first = controls[0]; const last = controls.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="photo-search-title" tabIndex={-1}
      className="bg-white rounded-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto shadow-2xl">
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
        <h3 id="photo-search-title" className="font-bold flex items-center gap-2"><Camera className="w-5 h-5" /> Find product by photo</h3>
        <button type="button" aria-label="Close photo search" onClick={onClose} className="p-2"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-5 space-y-4">
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        {phase === 'capture' && <>
          <p className="text-sm text-slate-600">Photograph one product clearly, filling the frame. Confirm a suggested match before adding it.</p>
          <video ref={video} muted playsInline onLoadedData={() => setVideoReady(true)} aria-label="Product camera preview"
            className={camera === 'off' ? 'hidden' : 'bg-black rounded-xl w-full aspect-video object-contain'} />
          <div className="flex gap-3 flex-wrap">
            <button type="button" disabled={camera === 'starting' || (camera === 'on' && !videoReady)} onClick={camera === 'on' ? capture : startCamera}
              className="bg-blue-600 text-white rounded-lg px-4 py-2 disabled:opacity-50">
              {camera === 'on' ? 'Capture and find' : camera === 'starting' ? 'Starting camera...' : 'Start camera'}
            </button>
          </div>
          <label htmlFor="photo-search-file" className="block text-sm font-medium">Or choose a product photo</label>
          <input id="photo-search-file" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm"
            onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void search(file); }} />
          <p className="text-xs text-slate-500">Photos are matched on your own server and are not saved as sale attachments.</p>
        </>}
        {phase === 'loading' && <p role="status" className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Comparing with catalogue photos...</p>}
        {phase === 'results' && <>
          <p className="text-sm text-slate-600">{result?.matches.length ? 'Possible matches. Select the correct product; similar-looking items can be confused.' : result?.indexedProducts ? 'No close match. Try a clearer photo or use product search.' : 'No searchable catalogue photos yet. Upload real product photos and ask an administrator to refresh the photo index.'}</p>
          <div className="space-y-2">
            {result?.matches.map(({ product }) => <button key={product.id} type="button" onClick={() => setSelected(product)}
              className="w-full flex items-center gap-3 border border-slate-200 rounded-xl p-3 text-left hover:bg-blue-50 focus:ring-2 focus:ring-blue-500">
              <img src={product.image} alt="" className="w-16 h-16 object-contain rounded-md bg-slate-50" />
              <span><span className="block font-semibold text-slate-900">{product.name}</span><span className="text-xs text-slate-500">{product.variants.filter(v => v.status === 'Available').length} variants · Select to confirm</span></span>
            </button>)}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => { setResult(null); setPhase('capture'); }} className="border rounded-lg px-3 py-2">Try another photo</button>
            <button type="button" onClick={onClose} className="text-blue-700 px-3 py-2">None of these — use product search</button>
          </div>
        </>}
      </div>
    </div>
  </div>;
}
