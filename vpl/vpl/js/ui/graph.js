// Đồ thị khoa học trên canvas: tỉ lệ tuyến tính/log, phóng to–thu nhỏ, kéo, tọa độ con trỏ, hồi quy tuyến tính.
import { linreg, fmtSig, isNum } from '../core/stats.js';

const THEMES = {
  dark: { bg: '#0e1a24', plot: '#101f2b', grid: '#1f3445', axis: '#6f8a9c', text: '#cfe3ee', mute: '#8aa3b3', fit: '#ffd166', box: 'rgba(8,16,22,.86)' },
  light: { bg: '#ffffff', plot: '#ffffff', grid: '#e3e8ec', axis: '#555', text: '#111', mute: '#555', fit: '#c0392b', box: 'rgba(255,255,255,.92)' },
};
export const SERIES_COLORS = ['#35d0ba', '#ffb454', '#7aa7ff', '#ff6b8b', '#b58cff', '#9be15d', '#f6e05e', '#ff8f5a'];

function niceStep(range, target) {
  const raw = range / Math.max(1, target);
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
}
function ticks(a, b, target = 7) {
  if (!(b > a)) return [a];
  const st = niceStep(b - a, target);
  const out = [];
  for (let v = Math.ceil(a / st - 1e-9) * st; v <= b + st * 1e-9; v += st) out.push(Math.abs(v) < st * 1e-9 ? 0 : v);
  return out;
}

export class Graph {
  constructor(canvas, { theme = 'dark', onFit } = {}) {
    this.c = canvas;
    this.theme = THEMES[theme];
    this.onFit = onFit;
    this.series = []; this.xLabel = 'x'; this.yLabel = 'y';
    this.opt = { logx: false, logy: false, includeOrigin: true, fit: true };
    this.view = null; this.user = false; this.hover = null;
    this.fitInfo = null; this.pad = { l: 64, r: 16, t: 16, b: 46 };
    this._bind();
  }

  setData({ series = [], xLabel = 'x', yLabel = 'y' }) { this.series = series; this.xLabel = xLabel; this.yLabel = yLabel; this.user = false; }
  setOptions(o) { Object.assign(this.opt, o); this.user = false; }
  resetView() { this.user = false; this.render(); }

  _tx(v) { return this.opt.logx ? Math.log10(v) : v; }
  _ty(v) { return this.opt.logy ? Math.log10(v) : v; }
  _pts() {
    const out = [];
    for (const s of this.series) {
      const p = s.pts.filter((q) => isNum(q.x) && isNum(q.y) && (!this.opt.logx || q.x > 0) && (!this.opt.logy || q.y > 0));
      out.push({ ...s, pts: p });
    }
    return out;
  }

  _autoView(ss) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const s of ss) for (const p of s.pts) {
      const x = this._tx(p.x), y = this._ty(p.y);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    if (!isFinite(x0)) return { x0: 0, x1: 1, y0: 0, y1: 1 };
    if (this.opt.includeOrigin) {
      if (!this.opt.logx) { x0 = Math.min(x0, 0); x1 = Math.max(x1, 0); }
      if (!this.opt.logy) { y0 = Math.min(y0, 0); y1 = Math.max(y1, 0); }
    }
    const padf = (a, b) => { const d = b - a || Math.abs(a) * 0.1 || 1; return [a - d * 0.06, b + d * 0.06]; };
    [x0, x1] = padf(x0, x1); [y0, y1] = padf(y0, y1);
    return { x0, x1, y0, y1 };
  }

  render() {
    const c = this.c, T = this.theme;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = c.clientWidth || c.width / dpr, H = c.clientHeight || c.height / dpr;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = T.bg; g.fillRect(0, 0, W, H);
    const ss = this._pts();
    if (!this.user || !this.view) this.view = this._autoView(ss);
    const v = this.view, P = this.pad;
    const pw = W - P.l - P.r, ph = H - P.t - P.b;
    if (pw < 40 || ph < 40) return;
    this.geo = { W, H, pw, ph };
    const X = (x) => P.l + ((this._tx(x) - v.x0) / (v.x1 - v.x0)) * pw;
    const Y = (y) => P.t + ph - ((this._ty(y) - v.y0) / (v.y1 - v.y0)) * ph;
    this.X = X; this.Y = Y;

    g.fillStyle = T.plot; g.fillRect(P.l, P.t, pw, ph);
    g.font = '11px system-ui, sans-serif'; g.textBaseline = 'middle';
    const axisTicks = (a, b, log) => {
      if (!log) return ticks(a, b).map((t) => ({ t, v: t, major: true }));
      const out = [];
      for (let d = Math.floor(a); d <= Math.ceil(b); d++) for (const m of [1, 2, 5]) { const t = d + Math.log10(m); if (t >= a && t <= b) out.push({ t, v: m * Math.pow(10, d), major: m === 1 }); }
      return out;
    };
    // lưới + nhãn
    g.lineWidth = 1;
    for (const k of axisTicks(v.x0, v.x1, this.opt.logx)) {
      const px = P.l + ((k.t - v.x0) / (v.x1 - v.x0)) * pw;
      g.strokeStyle = T.grid; g.beginPath(); g.moveTo(px, P.t); g.lineTo(px, P.t + ph); g.stroke();
      if (k.major || !this.opt.logx) { g.fillStyle = T.mute; g.textAlign = 'center'; g.fillText(fmtSig(k.v, 3), px, P.t + ph + 12); }
    }
    for (const k of axisTicks(v.y0, v.y1, this.opt.logy)) {
      const py = P.t + ph - ((k.t - v.y0) / (v.y1 - v.y0)) * ph;
      g.strokeStyle = T.grid; g.beginPath(); g.moveTo(P.l, py); g.lineTo(P.l + pw, py); g.stroke();
      if (k.major || !this.opt.logy) { g.fillStyle = T.mute; g.textAlign = 'right'; g.fillText(fmtSig(k.v, 3), P.l - 6, py); }
    }
    // trục
    g.strokeStyle = T.axis; g.lineWidth = 1.4;
    g.strokeRect(P.l, P.t, pw, ph);
    if (!this.opt.logx && v.x0 < 0 && v.x1 > 0) { const px = X(0); g.beginPath(); g.moveTo(px, P.t); g.lineTo(px, P.t + ph); g.stroke(); }
    if (!this.opt.logy && v.y0 < 0 && v.y1 > 0) { const py = Y(0); g.beginPath(); g.moveTo(P.l, py); g.lineTo(P.l + pw, py); g.stroke(); }
    g.fillStyle = T.text; g.font = '12px system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText(this.xLabel + (this.opt.logx ? '  (thang log)' : ''), P.l + pw / 2, H - 10);
    g.save(); g.translate(14, P.t + ph / 2); g.rotate(-Math.PI / 2); g.fillText(this.yLabel + (this.opt.logy ? '  (thang log)' : ''), 0, 0); g.restore();

    // dữ liệu (cắt trong khung)
    g.save(); g.beginPath(); g.rect(P.l, P.t, pw, ph); g.clip();
    this.fitInfo = null;
    let fitSeries = null;
    ss.forEach((s, si) => {
      const col = s.color || SERIES_COLORS[si % SERIES_COLORS.length];
      if (s.lines && s.pts.length > 1) {
        g.strokeStyle = col; g.lineWidth = 1.6; g.beginPath();
        s.pts.forEach((p, i) => (i ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y)))); g.stroke();
      }
      if (!s.lines || s.pts.length < 60) {
        g.fillStyle = col;
        for (const p of s.pts) { g.beginPath(); g.arc(X(p.x), Y(p.y), s.lines ? 2 : 4, 0, Math.PI * 2); g.fill(); }
      }
      if (s.fit && this.opt.fit && !fitSeries) fitSeries = { s, col };
    });
    if (fitSeries && !this.opt.logx && !this.opt.logy) {
      const xs = fitSeries.s.pts.map((p) => p.x), ys = fitSeries.s.pts.map((p) => p.y);
      const f = linreg(xs, ys);
      if (f) {
        this.fitInfo = f;
        const xa = v.x0 - (v.x1 - v.x0), xb = v.x1 + (v.x1 - v.x0);
        g.strokeStyle = T.fit; g.lineWidth = 1.6; g.setLineDash([6, 4]); g.beginPath();
        g.moveTo(X(xa), Y(f.slope * xa + f.intercept)); g.lineTo(X(xb), Y(f.slope * xb + f.intercept)); g.stroke(); g.setLineDash([]);
      }
    }
    g.restore();

    if (this.fitInfo) {
      const f = this.fitInfo;
      const txt = [`y = ${fmtSig(f.slope, 4)}·x ${f.intercept < 0 ? '−' : '+'} ${fmtSig(Math.abs(f.intercept), 3)}`, `r = ${fmtSig(f.r, 4)}   R² = ${fmtSig(f.r2, 4)}`];
      g.font = '12px ui-monospace, monospace';
      const w = Math.max(...txt.map((t) => g.measureText(t).width)) + 16;
      g.fillStyle = T.box; g.fillRect(P.l + 8, P.t + 8, w, 40);
      g.strokeStyle = T.fit; g.lineWidth = 1; g.strokeRect(P.l + 8, P.t + 8, w, 40);
      g.fillStyle = T.fit; g.textAlign = 'left';
      txt.forEach((t, i) => g.fillText(t, P.l + 16, P.t + 21 + i * 16));
    }
    if (this.onFit) this.onFit(this.fitInfo);

    // con trỏ + tooltip
    if (this.hover) {
      const { mx, my } = this.hover;
      if (mx >= P.l && mx <= P.l + pw && my >= P.t && my <= P.t + ph) {
        const dx = this._invX(mx), dy = this._invY(my);
        let best = null, bd = 14;
        for (const s of ss) for (const p of s.pts) { const d = Math.hypot(X(p.x) - mx, Y(p.y) - my); if (d < bd) { bd = d; best = { p, s }; } }
        g.strokeStyle = 'rgba(180,200,215,.35)'; g.lineWidth = 1; g.setLineDash([3, 3]);
        g.beginPath(); g.moveTo(mx, P.t); g.lineTo(mx, P.t + ph); g.moveTo(P.l, my); g.lineTo(P.l + pw, my); g.stroke(); g.setLineDash([]);
        const label = best ? `${best.s.name ? best.s.name + ': ' : ''}(${fmtSig(best.p.x, 4)} ; ${fmtSig(best.p.y, 4)})` : `(${fmtSig(dx, 4)} ; ${fmtSig(dy, 4)})`;
        g.font = '12px ui-monospace, monospace';
        const w = g.measureText(label).width + 12;
        const bx = Math.min(P.l + pw - w - 2, mx + 12), by = Math.max(P.t + 2, my - 28);
        g.fillStyle = T.box; g.fillRect(bx, by, w, 20); g.strokeStyle = best ? T.fit : T.axis; g.strokeRect(bx, by, w, 20);
        g.fillStyle = T.text; g.textAlign = 'left'; g.fillText(label, bx + 6, by + 10);
        if (best) { g.strokeStyle = T.fit; g.lineWidth = 2; g.beginPath(); g.arc(X(best.p.x), Y(best.p.y), 7, 0, Math.PI * 2); g.stroke(); }
      }
    }
    // chú giải
    if (ss.length > 1 || (ss[0] && ss[0].name)) {
      g.font = '11px system-ui, sans-serif'; g.textAlign = 'left';
      let lx = P.l + pw - 4, ly = P.t + 12;
      [...ss].reverse().forEach((s) => {
        const i = ss.indexOf(s), col = s.color || SERIES_COLORS[i % SERIES_COLORS.length];
        const w = g.measureText(s.name || '').width;
        g.fillStyle = col; g.fillRect(lx - w - 18, ly - 4, 8, 8);
        g.fillStyle = T.text; g.fillText(s.name || '', lx - w - 6, ly); ly += 14;
      });
    }
  }

  _invX(px) { const v = this.view, P = this.pad; const t = v.x0 + ((px - P.l) / this.geo.pw) * (v.x1 - v.x0); return this.opt.logx ? Math.pow(10, t) : t; }
  _invY(py) { const v = this.view, P = this.pad; const t = v.y0 + ((P.t + this.geo.ph - py) / this.geo.ph) * (v.y1 - v.y0); return this.opt.logy ? Math.pow(10, t) : t; }

  _bind() {
    const c = this.c;
    c.style.touchAction = 'none';
    const pos = (e) => { const r = c.getBoundingClientRect(); return { mx: e.clientX - r.left, my: e.clientY - r.top }; };
    let drag = null;
    c.addEventListener('pointerdown', (e) => {
      if (!this.geo) return;
      const p = pos(e); drag = { ...p, view: { ...this.view } }; c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      const p = pos(e);
      if (drag && this.view) {
        const v = drag.view, { pw, ph } = this.geo;
        const dx = ((p.mx - drag.mx) / pw) * (v.x1 - v.x0), dy = ((p.my - drag.my) / ph) * (v.y1 - v.y0);
        this.view = { x0: v.x0 - dx, x1: v.x1 - dx, y0: v.y0 + dy, y1: v.y1 + dy }; this.user = true;
      }
      this.hover = p; this.render();
    });
    const end = (e) => { drag = null; try { c.releasePointerCapture(e.pointerId); } catch { /* đã nhả */ } };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', () => { this.hover = null; this.render(); });
    c.addEventListener('dblclick', () => this.resetView());
    c.addEventListener('wheel', (e) => {
      if (!this.geo || !this.view) return;
      e.preventDefault();
      const { mx, my } = pos(e), v = this.view, { pw, ph } = this.geo, P = this.pad;
      const f = e.deltaY < 0 ? 1 / 1.18 : 1.18;
      const cx = v.x0 + ((mx - P.l) / pw) * (v.x1 - v.x0), cy = v.y0 + ((P.t + ph - my) / ph) * (v.y1 - v.y0);
      this.view = { x0: cx - (cx - v.x0) * f, x1: cx + (v.x1 - cx) * f, y0: cy - (cy - v.y0) * f, y1: cy + (v.y1 - cy) * f };
      this.user = true; this.render();
    }, { passive: false });
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.render()).observe(c);
  }

  zoom(f) {
    if (!this.view) return;
    const v = this.view, cx = (v.x0 + v.x1) / 2, cy = (v.y0 + v.y1) / 2;
    this.view = { x0: cx - (cx - v.x0) * f, x1: cx + (v.x1 - cx) * f, y0: cy - (cy - v.y0) * f, y1: cy + (v.y1 - cy) * f };
    this.user = true; this.render();
  }
}
