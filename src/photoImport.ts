import { createApp, h, nextTick, onMounted, reactive, ref } from 'vue';

// This module has no network side effects. All scripts, WASM and OCR data are
// requested only after the dialog has painted. Photos never leave the browser.
const CV_URL = 'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.10.0-release.1/dist/opencv.js';
const OCR_BASE = 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist';
type Point = { x: number; y: number };
type Translate = (key: string, values?: Record<string, number>) => string;
interface Disposable { delete(): void }
interface Mat extends Disposable {
  rows: number; cols: number; data: Uint8Array; data32S: Int32Array;
  roi(rect: unknown): Mat;
}
// OpenCV's generated JS API is external; keep its dynamic boundary here.
interface CV {
  Mat: { new(): Mat };
  MatVector: new() => Disposable & { size(): number; get(i: number): Mat };
  Size: new(w: number, h: number) => unknown;
  Rect: new(x: number, y: number, w: number, h: number) => unknown;
  [key: string]: any;
}
interface OCRWorker {
  setParameters(params: Record<string, string>): Promise<unknown>;
  recognize(image: HTMLCanvasElement, options?: Record<string, string>): Promise<{ data: { text: string; confidence: number } }>;
  terminate(): Promise<unknown>;
}
interface OCR {
  createWorker(lang: string, mode: number, options: Record<string, unknown>, config: Record<string, string>): Promise<OCRWorker>;
}
const globals = window as unknown as { cv?: CV; Tesseract?: OCR };
let cvPromise: Promise<{ cv: CV }> | undefined;
let ocrPromise: Promise<OCR> | undefined;
let activeImport: Promise<number[] | null> | undefined;

function script(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const element = document.createElement('script');
    const timeout = window.setTimeout(() => finish(new Error('loadError')), 90_000);
    function finish(error?: Error) {
      clearTimeout(timeout);
      element.onload = element.onerror = null;
      if (error) { element.remove(); reject(error); } else resolve();
    }
    element.async = true;
    element.src = url;
    element.onload = () => finish();
    element.onerror = () => finish(new Error('loadError'));
    document.head.append(element);
  });
}

function bounded<T>(promise: Promise<T>, signal: AbortSignal, ms = 90_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => finish(new Error('cancelled'));
    const timeout = window.setTimeout(() => finish(new Error('loadError')), ms);
    function finish(error?: unknown, value?: T) {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      if (error) reject(error); else resolve(value as T);
    }
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    promise.then(value => finish(undefined, value), error => finish(error));
  });
}

function loadCV(): Promise<{ cv: CV }> {
  return cvPromise ??= (async () => {
    if (!globals.cv) await script(CV_URL);
    const cv = globals.cv;
    if (!cv) throw new Error('loadError');
    // This pinned Emscripten build is a self-resolving thenable, NOT a Promise.
    // Never await/resolve the Module itself: that causes an infinite microtask loop.
    if (!cv.Mat) await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('loadError')), 90_000);
      cv.onRuntimeInitialized = () => { clearTimeout(timeout); resolve(); };
    });
    return { cv };
  })().catch(error => { cvPromise = undefined; throw error; });
}

function loadOCR(): Promise<OCR> {
  return ocrPromise ??= (async () => {
    if (!globals.Tesseract) await script(`${OCR_BASE}/tesseract.min.js`);
    if (!globals.Tesseract) throw new Error('loadError');
    return globals.Tesseract;
  })().catch(error => { ocrPromise = undefined; throw error; });
}

function canvas(width: number, height: number): HTMLCanvasElement {
  const element = document.createElement('canvas');
  element.width = width; element.height = height;
  return element;
}

function context(element: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = element.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('imageError');
  return ctx;
}

function validCorners(points: Point[]): boolean {
  if (points.length !== 4) return false;
  return points.every((p, i) => {
    const q = points[(i + 1) % 4]!; const r = points[(i + 2) % 4]!;
    return Math.hypot(q.x - p.x, q.y - p.y) > 20
      && (q.x - p.x) * (r.y - q.y) - (q.y - p.y) * (r.x - q.x) > 0;
  });
}

function orderedCorners(data: Int32Array): Point[] {
  const points = Array.from({ length: 4 }, (_, i) => ({ x: data[i * 2]!, y: data[i * 2 + 1]! }));
  const center = points.reduce((c, p) => ({ x: c.x + p.x / 4, y: c.y + p.y / 4 }), { x: 0, y: 0 });
  points.sort((a, b) => Math.atan2(a.y - center.y, a.x - center.x) - Math.atan2(b.y - center.y, b.x - center.x));
  const start = points.reduce((best, p, i) => p.x + p.y < points[best]!.x + points[best]!.y ? i : best, 0);
  return [...points.slice(start), ...points.slice(0, start)];
}

function warp(cv: CV, source: Mat, points: Point[], size: number): Mat {
  const from = cv.matFromArray(4, 1, cv.CV_32FC2, points.flatMap(p => [p.x, p.y])) as Mat;
  const to = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, size - 1, 0, size - 1, size - 1, 0, size - 1]) as Mat;
  let transform: Mat | undefined;
  const result = new cv.Mat();
  try {
    transform = cv.getPerspectiveTransform(from, to);
    cv.warpPerspective(source, result, transform, new cv.Size(size, size));
    return result;
  } catch (error) { result.delete(); throw error; }
  finally { from.delete(); to.delete(); transform?.delete(); }
}

function threshold(cv: CV, image: HTMLCanvasElement): Mat {
  const source = cv.imread(image) as Mat;
  const gray = new cv.Mat(); const binary = new cv.Mat();
  try {
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    // Normalize dark-mode screenshots before applying a local threshold.
    if (cv.mean(gray)[0] < 110) cv.bitwise_not(gray, gray);
    cv.adaptiveThreshold(gray, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 31, 7);
    return binary;
  } catch (error) { binary.delete(); throw error; }
  finally { source.delete(); gray.delete(); }
}

function findBoard(cv: CV, image: HTMLCanvasElement): Point[] | undefined {
  const binary = threshold(cv, image);
  const contours = new cv.MatVector(); const hierarchy = new cv.Mat();
  try {
    cv.findContours(binary, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
    const candidates: { points: Point[]; area: number }[] = [];
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i); const approx = new cv.Mat();
      try {
        const area = Math.abs(cv.contourArea(contour));
        if (area < image.width * image.height * 0.015) continue;
        cv.approxPolyDP(contour, approx, cv.arcLength(contour, true) * 0.02, true);
        if (approx.rows !== 4) continue;
        const points = orderedCorners(approx.data32S);
        if (validCorners(points)) candidates.push({ points, area });
      } finally { contour.delete(); approx.delete(); }
    }
    // Check interior grid lines: the largest rectangle might be the book page.
    let best: Point[] | undefined; let bestScore = 0.38;
    for (const candidate of candidates.sort((a, b) => b.area - a.area).slice(0, 16)) {
      const square = warp(cv, binary, candidate.points, 360);
      try {
        let score = 0;
        for (let line = 1; line < 9; line++) {
          for (const vertical of [true, false]) {
            let peak = 0;
            for (let offset = -5; offset <= 5; offset++) {
              const position = line * 40 + offset;
              let ink = 0;
              for (let p = 5; p < 355; p++) {
                ink += square.data[vertical ? p * 360 + position : position * 360 + p]! > 127 ? 1 : 0;
              }
              peak = Math.max(peak, ink / 350);
            }
            score += peak / 16;
          }
        }
        if (score > bestScore) { bestScore = score; best = candidate.points; }
      } finally { square.delete(); }
    }
    return best;
  } finally { binary.delete(); contours.delete(); hierarchy.delete(); }
}

function digitImage(cv: CV, board: Mat, index: number): HTMLCanvasElement | null {
  const cell = board.roi(new cv.Rect(index % 9 * 100 + 10, Math.floor(index / 9) * 100 + 10, 80, 80));
  const contours = new cv.MatVector(); const hierarchy = new cv.Mat();
  try {
    cv.findContours(cell, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    let best: { x: number; y: number; width: number; height: number } | undefined;
    let bestArea = 0;
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      try {
        const rect = cv.boundingRect(contour);
        const area = cv.contourArea(contour);
        // Reject grid remnants, specks and small candidate notes.
        if (rect.height < 22 || rect.width < 3 || rect.width > 64 || rect.height > 74
          || rect.x <= 0 || rect.y <= 0 || rect.x + rect.width >= 80 || rect.y + rect.height >= 80
          || Math.abs(rect.x + rect.width / 2 - 40) > 24 || area < 12) continue;
        if (area > bestArea) { bestArea = area; best = rect; }
      } finally { contour.delete(); }
    }
    if (!best) return null;
    const output = canvas(300, 100); const ctx = context(output);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 300, 100);
    const pixels = ctx.createImageData(best.width, best.height);
    for (let y = 0; y < best.height; y++) for (let x = 0; x < best.width; x++) {
      // Read the board instead of assuming a ROI has a contiguous memory layout.
      const source = (Math.floor(index / 9) * 100 + 10 + best.y + y) * board.cols
        + index % 9 * 100 + 10 + best.x + x;
      const value = 255 - board.data[source]!;
      const target = (y * best.width + x) * 4;
      pixels.data.set([value, value, value, 255], target);
    }
    const glyph = canvas(best.width, best.height);
    context(glyph).putImageData(pixels, 0, 0);
    const scale = 64 / best.height;
    // LSTM is trained on text lines. Repeating the same glyph supplies a short
    // line and lets us vote out inconsistent readings at either edge.
    for (let copy = 0; copy < 3; copy++) {
      ctx.drawImage(glyph, copy * 100 + (100 - best.width * scale) / 2, 18, best.width * scale, 64);
    }
    return output;
  } finally { cell.delete(); contours.delete(); hierarchy.delete(); }
}

async function recognize(cv: CV, worker: OCRWorker, image: HTMLCanvasElement, points: Point[], signal: AbortSignal, progress: (count: number) => void): Promise<number[]> {
  if (!validCorners(points)) throw new Error('cornersError');
  const source = cv.imread(image) as Mat;
  let square: Mat | undefined; let binary: Mat | undefined;
  try {
    square = warp(cv, source, points, 900);
    const corrected = canvas(900, 900);
    cv.imshow(corrected, square);
    binary = threshold(cv, corrected);
    const result: number[] = [];
    for (let i = 0; i < 81; i++) {
      if (signal.aborted) throw new Error('cancelled');
      const digit = digitImage(cv, binary, i);
      let value = 0;
      if (digit) {
        for (const mode of ['7', '13']) {
          const { data } = await bounded(worker.recognize(digit, { tessedit_pageseg_mode: mode }), signal, 20_000);
          const digits = data.text.match(/[1-9]/g) ?? [];
          const votes = digits.reduce<Record<string, number>>((counts, digit) => {
            counts[digit] = (counts[digit] ?? 0) + 1; return counts;
          }, {});
          const best = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
          if (best && best[1] >= 2 && best[1] > digits.length / 2) { value = Number(best[0]); break; }
        }
      }
      result.push(value);
      progress(i + 1);
      // Allow painting and cancellation even for consecutive blank cells.
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    if (!result.some(Boolean)) throw new Error('noDigits');
    return result;
  } finally { source.delete(); square?.delete(); binary?.delete(); }
}

const styles = `
.photo-import{margin:auto;width:min(620px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;padding:24px;border:1px solid #cbd5e1;border-radius:16px;background:#fff;color:#0f172a;box-shadow:0 24px 64px #0f172a33;font-size:16px}
.photo-import::backdrop{background:#0f172a99}.photo-import h2{font-size:24px;font-weight:600;margin-bottom:8px}
.photo-import p{margin:8px 0;color:#475569}.photo-import .photo-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
.photo-import button{padding:8px 14px;cursor:pointer}.photo-import button:disabled{opacity:.45;cursor:default}
.photo-import .photo-preview{position:relative;margin-top:16px;background:#e2e8f0;line-height:0}
.photo-import .photo-preview canvas{width:100%;height:auto;max-height:45dvh;object-fit:contain;display:block}
.photo-import .photo-preview svg{position:absolute;inset:0;width:100%;height:100%;touch-action:none}
.photo-import .photo-error{color:#dc2626}.photo-import progress{width:100%;height:8px;accent-color:#3b82f6}
.photo-import .photo-footer{justify-content:flex-end}.dark .photo-import{background:#1f2937;color:#f1f5f9;border-color:#475569}
.dark .photo-import p{color:#cbd5e1}.dark .photo-import .photo-error{color:#fca5a5}
`;

/** Resolves to 81 row-major digits (0 = empty), or null on cancellation. */
export function openPhotoImport(t: Translate, hasBoard = false): Promise<number[] | null> {
  if (activeImport) return activeImport;
  const task = new Promise<number[] | null>(resolve => {
    const host = document.createElement('div');
    document.body.append(host);
    let finished = false;
    const lifetime = new AbortController();
    let worker: OCRWorker | undefined;
    const finish = (result: number[] | null) => {
      if (finished) return;
      finished = true;
      lifetime.abort();
      void worker?.terminate();
      app.unmount(); host.remove(); resolve(result);
    };
    const app = createApp({
      setup() {
        const dialog = ref<HTMLDialogElement>();
        const fileInput = ref<HTMLInputElement>(); const cameraInput = ref<HTMLInputElement>();
        const preview = ref<HTMLCanvasElement>();
        const state = reactive({ loading: true, ready: false, busy: false, decoding: false, hasImage: false, error: '', imageError: '', count: 0, corners: [] as Point[], manual: false, loadFailed: false });
        let cv: CV | undefined; let image: HTMLCanvasElement | undefined;
        let imageGeneration = 0; let dragIndex: number | null = null;
        const tr = (key: string, values?: Record<string, number>) => t(`photoImport.${key}`, values);
        const locate = () => {
          if (!cv || !image || state.manual) return;
          try {
            const found = findBoard(cv, image);
            if (found) state.corners = found;
          } catch { /* The four visible handles remain available for manual cropping. */ }
        };
        const showImage = async () => {
          if (!image) return;
          state.hasImage = true;
          state.corners = [{ x: 0, y: 0 }, { x: image.width - 1, y: 0 }, { x: image.width - 1, y: image.height - 1 }, { x: 0, y: image.height - 1 }];
          state.manual = false;
          await nextTick();
          if (finished) return;
          if (preview.value) context(preview.value).drawImage(image, 0, 0);
          locate();
        };
        const selectImage = async (event: Event) => {
          const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = '';
          if (!file || state.busy) return;
          const generation = ++imageGeneration;
          state.imageError = ''; state.decoding = true;
          const url = URL.createObjectURL(file);
          try {
            const photo = new Image(); photo.src = url;
            await photo.decode();
            if (finished || generation !== imageGeneration) return;
            const scale = Math.min(1, 1600 / Math.max(photo.naturalWidth, photo.naturalHeight));
            const next = canvas(Math.max(1, Math.round(photo.naturalWidth * scale)), Math.max(1, Math.round(photo.naturalHeight * scale)));
            const ctx = context(next); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, next.width, next.height); ctx.drawImage(photo, 0, 0, next.width, next.height);
            image?.remove(); image = next;
            await showImage();
          } catch { if (!finished && generation === imageGeneration) state.imageError = 'imageError'; }
          finally { URL.revokeObjectURL(url); if (generation === imageGeneration) state.decoding = false; }
        };
        const load = async () => {
          state.loading = true; state.loadFailed = false; state.error = ''; state.ready = false;
          let pendingWorker: OCRWorker | undefined;
          let abandoned = false;
          try {
            const cvTask = bounded(loadCV(), lifetime.signal).then(value => { cv = value.cv; if (!finished) locate(); });
            const ocrTask = bounded((async () => {
              const ocr = await loadOCR();
              if (finished || abandoned) throw new Error('cancelled');
              const created = await ocr.createWorker('eng', 1, {
                workerPath: `${OCR_BASE}/worker.min.js`,
                corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',
                langPath: 'https://tessdata.projectnaptha.com/4.0.0',
                errorHandler: () => {},
              }, { load_system_dawg: '0', load_freq_dawg: '0', load_number_dawg: '0' });
              pendingWorker = created;
              if (finished || abandoned) { await created.terminate(); throw new Error('cancelled'); }
              await created.setParameters({ tessedit_char_whitelist: '123456789', tessedit_pageseg_mode: '7', user_defined_dpi: '300' });
              return created;
            })(), lifetime.signal);
            const results = await Promise.all([cvTask, ocrTask]);
            if (finished) return;
            worker = results[1]; state.ready = true;
          } catch {
            abandoned = true; void pendingWorker?.terminate();
            if (!finished) { state.error = 'loadError'; state.loadFailed = true; }
          } finally { state.loading = false; }
        };
        onMounted(() => {
          dialog.value?.showModal();
          // Two frames guarantee the modal can paint before external requests.
          requestAnimationFrame(() => requestAnimationFrame(() => { if (!finished) void load(); }));
        });
        const run = async () => {
          if (!state.ready || !cv || !worker || !image || state.busy || state.decoding) return;
          state.busy = true; state.error = ''; state.count = 0;
          try {
            const result = await recognize(cv, worker, image, state.corners.map(p => ({ ...p })), lifetime.signal, count => { state.count = count; });
            if (!finished) finish(result);
          } catch (error) {
            if (finished) return;
            const code = error instanceof Error ? error.message : '';
            state.error = ['cornersError', 'noDigits'].includes(code) ? code : 'recognitionError';
            // A failed worker job may leave the worker unusable; allow reloading.
            if (state.error === 'recognitionError') { void worker.terminate(); worker = undefined; state.ready = false; state.loadFailed = true; }
          } finally { state.busy = false; }
        };
        const rotate = () => {
          if (!image || state.busy) return;
          const next = canvas(image.height, image.width); const ctx = context(next);
          ctx.translate(next.width, 0); ctx.rotate(Math.PI / 2); ctx.drawImage(image, 0, 0);
          image.remove(); image = next; void showImage();
        };
        const move = (event: PointerEvent) => {
          if (dragIndex === null || state.busy || !image) return;
          const svg = event.currentTarget as SVGSVGElement;
          const matrix = svg.getScreenCTM(); if (!matrix) return;
          const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
          state.corners[dragIndex] = { x: Math.max(0, Math.min(image.width - 1, point.x)), y: Math.max(0, Math.min(image.height - 1, point.y)) };
          state.manual = true;
        };
        return () => h('dialog', { ref: dialog, class: 'photo-import', 'aria-labelledby': 'photo-import-title', onCancel: (event: Event) => { event.preventDefault(); finish(null); }, onClose: () => finish(null) }, [
          h('style', styles), h('h2', { id: 'photo-import-title' }, tr('title')),
          h('p', tr('description')),
          h('div', { class: 'photo-actions' }, [
            h('button', { class: 'btn', disabled: state.busy, onClick: () => cameraInput.value?.click() }, tr('camera')),
            h('button', { class: 'btn-primary-outline', disabled: state.busy, onClick: () => fileInput.value?.click() }, tr('choose')),
            state.hasImage && h('button', { class: 'btn-primary-outline', disabled: state.busy || state.decoding, onClick: rotate }, tr('rotate')),
          ]),
          h('input', { ref: fileInput, type: 'file', accept: 'image/*', hidden: true, onChange: selectImage }),
          h('input', { ref: cameraInput, type: 'file', accept: 'image/*', capture: 'environment', hidden: true, onChange: selectImage }),
          h('p', { role: 'status', 'aria-live': 'polite' }, state.busy ? tr('recognizing', { count: state.count }) : state.loading ? tr('loading') : state.ready ? tr('ready') : ''),
          (state.loading || state.busy) && h('progress', { max: 81, ...(state.busy ? { value: state.count } : {}), 'aria-label': tr(state.busy ? 'import' : 'loading') }),
          state.decoding && h('p', { role: 'status' }, tr('decoding')),
          state.imageError && h('p', { role: 'alert', class: 'photo-error' }, tr(state.imageError)),
          state.hasImage && image && h('div', { class: 'photo-preview' }, [
            h('canvas', { ref: preview, width: image.width, height: image.height }),
            h('svg', { viewBox: `0 0 ${image.width} ${image.height}`, 'aria-label': tr('crop'), onPointermove: move, onPointerup: () => { dragIndex = null; }, onPointercancel: () => { dragIndex = null; } }, [
              h('polygon', { points: state.corners.map(p => `${p.x},${p.y}`).join(' '), fill: '#3b82f622', stroke: '#2563eb', 'stroke-width': 3, 'vector-effect': 'non-scaling-stroke' }),
              ...state.corners.map((p, index) => h('circle', { cx: p.x, cy: p.y, r: Math.max(image!.width, image!.height) / 32, fill: '#2563eb99', stroke: '#fff', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', tabindex: state.busy ? -1 : 0, role: 'slider', 'aria-label': tr(`corner${index}`), 'aria-valuetext': `${Math.round(p.x)}, ${Math.round(p.y)}`, onPointerdown: (event: PointerEvent) => { if (state.busy) return; event.preventDefault(); dragIndex = index; (event.currentTarget as Element).setPointerCapture(event.pointerId); }, onKeydown: (event: KeyboardEvent) => {
                if (state.busy || !event.key.startsWith('Arrow')) return;
                event.preventDefault(); const step = event.shiftKey ? 10 : 2;
                p.x = Math.max(0, Math.min(image!.width - 1, p.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0)));
                p.y = Math.max(0, Math.min(image!.height - 1, p.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0))); state.manual = true;
              } })),
            ]),
          ]),
          state.hasImage && h('p', tr('crop')),
          state.error && h('p', { role: 'alert', class: 'photo-error' }, tr(state.error)),
          state.loadFailed && h('button', { class: 'btn-primary-outline', onClick: load }, tr('retry')),
          hasBoard && h('p', tr('replace')),
          h('div', { class: 'photo-actions photo-footer' }, [
            h('button', { class: 'btn-primary-outline', onClick: () => finish(null) }, tr('cancel')),
            h('button', { class: 'btn', disabled: !state.ready || !image || state.busy || state.decoding, onClick: run }, tr('import')),
          ]),
        ]);
      },
    });
    app.mount(host);
  });
  activeImport = task;
  void task.finally(() => { if (activeImport === task) activeImport = undefined; });
  return task;
}
