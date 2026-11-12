// Hệ thống lưu trữ phiên thí nghiệm (localStorage, có thể thay bằng bộ nhớ trong khi kiểm thử).

export const SCHEMA = 1;
const PFX = 'vpl:v1:';

export class MemoryStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}

export function defaultStorage() {
  try {
    const s = globalThis.localStorage;
    const k = '__vpl_probe__';
    s.setItem(k, '1'); s.removeItem(k);
    return s;
  } catch { return new MemoryStorage(); }
}

export class Store {
  constructor(storage = defaultStorage()) { this.st = storage; this.lastError = null; }

  loadSession(id) {
    const raw = this.st.getItem(PFX + 'session:' + id);
    if (!raw) return null;
    try {
      const d = JSON.parse(raw);
      if (!d || d.v !== SCHEMA || d.id !== id) throw new Error('schema');
      return d;
    } catch {
      this.st.removeItem(PFX + 'session:' + id); // dữ liệu hỏng → bỏ
      return null;
    }
  }

  saveSession(id, data) {
    try {
      this.st.setItem(PFX + 'session:' + id, JSON.stringify({ ...data, v: SCHEMA, id, updated: Date.now() }));
      this.lastError = null;
      return true;
    } catch (e) {
      this.lastError = e;
      return false;
    }
  }

  clearSession(id) { this.st.removeItem(PFX + 'session:' + id); this.setStatus(id, null); }

  progress() {
    try { return JSON.parse(this.st.getItem(PFX + 'progress') || '{}') || {}; } catch { return {}; }
  }
  setStatus(id, status) {
    const p = this.progress();
    if (status) p[id] = { status, t: Date.now() }; else delete p[id];
    try { this.st.setItem(PFX + 'progress', JSON.stringify(p)); } catch { /* bỏ qua */ }
  }
  getStatus(id) { return (this.progress()[id] || {}).status || 'new'; }
}
