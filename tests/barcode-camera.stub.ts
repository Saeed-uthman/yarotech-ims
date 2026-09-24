// Only the physical decoder is replaced; scanner lifecycle and forms are real.
export class BrowserMultiFormatReader {
  async decodeFromConstraints(_constraints: unknown, _video: unknown, callback: (result: { getText: () => string }) => void) {
    const state = (window as any).fixture;
    const camera = { callback, stopped: false, release: null as (() => void) | null };
    state.cameras.push(camera);
    if (state.holdCamera) await new Promise<void>(resolve => { state.releaseCamera = resolve; camera.release = resolve; });
    if (state.cameraDenied) throw new DOMException('Denied', 'NotAllowedError');
    return { stop: () => { camera.stopped = true; } };
  }
}
