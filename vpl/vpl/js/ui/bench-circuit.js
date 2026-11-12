// Bàn lắp mạch điện tự do: kéo linh kiện, nối dây giữa các cực (nhấp cực này rồi cực kia), nhấp dây để gỡ.
import { s, clamp } from './dom.js';
import { INSTRUMENTS } from '../core/instruments.js';
import { TERMINALS } from '../core/circuit.js';
import { partInner, PART_W, PART_H, TERM_POS } from './art.js';

export const CW = 900, CH = 420;
const snap = (v) => Math.round(v / 10) * 10;

export class CircuitBench {
  constructor(ws, host) {
    this.ws = ws; this.host = host;
    this.svg = s('svg', { viewBox: `0 0 ${CW} ${CH}`, class: 'bench-svg circuit', role: 'img', 'aria-label': 'Bàn lắp mạch điện', tabindex: 0 });
    host.append(this.svg);
    this.pending = null; this.pointer = null; this.drag = null;
    this._bind();
    this.render();
  }

  pos(it, t) { const [dx, dy] = TERM_POS[it.id][t]; return [it.x + dx, it.y + dy]; }
  toSvg(e) { const pt = this.svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const m = this.svg.getScreenCTM(); return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 }; }

  wirePath(a, b) {
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = 30 + 0.25 * dist;
    const da = a[2] ?? 0, db = b[2] ?? 0;
    return `M${a[0]} ${a[1]}C${a[0] + da * k} ${a[1]},${b[0] + db * k} ${b[1]},${b[0]} ${b[1]}`;
  }
  termPoint(termId) {
    const [uid, t] = termId.split(':');
    const it = this.ws.getByUid(uid); if (!it) return null;
    const [x, y] = this.pos(it, t);
    return [x, y, TERM_POS[it.id][t][0] === 0 ? -1 : 1];
  }

  render() {
    const ws = this.ws, st = ws.state;
    const used = new Set(); for (const [a, b] of st.wires) { used.add(a); used.add(b); }
    let out = `<defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#1d3243" stroke-width=".6"/></pattern></defs><rect width="${CW}" height="${CH}" fill="#0f1c27"/><rect width="${CW}" height="${CH}" fill="url(#grid)"/>`;
    if (!st.placed.length) out += `<text x="${CW / 2}" y="${CH / 2 - 8}" text-anchor="middle" class="bench-hint">Kéo linh kiện từ thư viện bên trái vào bàn thí nghiệm</text><text x="${CW / 2}" y="${CH / 2 + 14}" text-anchor="middle" class="bench-hint small">Nhấp một cực rồi nhấp cực khác để nối dây · nhấp vào dây để gỡ</text>`;
    // dây
    st.wires.forEach(([a, b], i) => {
      const pa = this.termPoint(a), pb = this.termPoint(b); if (!pa || !pb) return;
      const d = this.wirePath(pa, pb);
      out += `<path d="${d}" class="wire-shadow"/><path d="${d}" class="wire"/><path d="${d}" class="wire-hit" data-wire="${i}"><title>Nhấp để gỡ dây</title></path>`;
    });
    // linh kiện
    for (const it of st.placed) {
      const live = ws.exp.live ? ws.exp.live(ws, it) : {};
      const sel = ws.selected === it.uid;
      out += `<g transform="translate(${it.x} ${it.y})" class="part${sel ? ' sel' : ''}${live.warn ? ' warn' : ''}" data-uid="${it.uid}">
        <rect class="part-hit" x="-4" y="-4" width="${PART_W + 8}" height="${PART_H + 8}" rx="8" data-uid="${it.uid}"/>
        <g class="part-art" pointer-events="none">${partInner(it.id, it.params, live)}</g>
        <text x="${PART_W / 2}" y="-8" text-anchor="middle" class="part-name" pointer-events="none">${it.uid}</text>`;
      for (const t of TERMINALS[it.id]) {
        const [tx, ty] = TERM_POS[it.id][t];
        const tid = `${it.uid}:${t}`;
        out += `<circle class="term${used.has(tid) ? ' used' : ''}${this.pending === tid ? ' pend' : ''}" cx="${tx}" cy="${ty}" r="6.5" data-term="${tid}"><title>${t === 'p' || t === 'a' && it.id === 'diode' ? 'Cực dương' : t === 'n' || t === 'k' ? 'Cực âm' : 'Đầu nối'} ${tid}</title></circle>`;
      }
      out += '</g>';
    }
    if (this.pending && this.pointer) {
      const pa = this.termPoint(this.pending);
      if (pa) out += `<path id="pendingWire" d="${this.wirePath(pa, [this.pointer.x, this.pointer.y, -pa[2]])}" class="wire pending-wire" pointer-events="none"/>`;
    }
    if (ws.rt.circuitError) out += `<g pointer-events="none"><rect x="150" y="${CH - 46}" width="600" height="34" rx="8" fill="rgba(255,107,107,.16)" stroke="#ff6b6b"/><text x="${CW / 2}" y="${CH - 24}" text-anchor="middle" fill="#ffb3b3" font-size="14">⚠ ${ws.rt.circuitError}</text></g>`;
    this.svg.innerHTML = out;
  }

  addPart(id, x, y) {
    const ws = this.ws;
    const spec = INSTRUMENTS[id];
    const px = clamp(snap(x - PART_W / 2), 10, CW - PART_W - 10), py = clamp(snap(y - PART_H / 2), 30, CH - PART_H - 10);
    ws.addCircuitPart(id, px, py);
    return spec;
  }

  _bind() {
    const svg = this.svg;
    svg.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('[data-term]') || e.target.closest('[data-wire]')) return;
      const g = e.target.closest('[data-uid]'); if (!g) { if (this.pending) { this.pending = null; this.render(); } return; }
      const it = this.ws.getByUid(g.dataset.uid); if (!it) return;
      const p = this.toSvg(e);
      this.drag = { uid: it.uid, ox: p.x - it.x, oy: p.y - it.y, sx: e.clientX, sy: e.clientY, moved: false };
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', (e) => {
      this.pointer = this.toSvg(e);
      if (this.drag) {
        const d = this.drag;
        if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) d.moved = true;
        if (d.moved) {
          const it = this.ws.getByUid(d.uid);
          it.x = clamp(snap(this.pointer.x - d.ox), 0, CW - PART_W); it.y = clamp(snap(this.pointer.y - d.oy), 20, CH - PART_H);
          this.render();
        }
      } else if (this.pending) {
        // chỉ cập nhật đường dây xem trước, không dựng lại cả bàn (nếu không, cực nối bị thay giữa lúc nhấp chuột)
        const pa = this.termPoint(this.pending), pw = this.svg.querySelector('#pendingWire');
        if (pa && pw) pw.setAttribute('d', this.wirePath(pa, [this.pointer.x, this.pointer.y, -pa[2]]));
      }
    });
    const up = (e) => {
      const d = this.drag; this.drag = null;
      try { svg.releasePointerCapture(e.pointerId); } catch { /* đã nhả */ }
      if (!d) return;
      if (d.moved) this.ws.changed({ structural: false });
      else this.ws.selectPart(d.uid, true);
    };
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    svg.addEventListener('click', (e) => {
      const t = e.target.closest('[data-term]');
      if (t) {
        const id = t.dataset.term;
        if (!this.pending) { this.pending = id; this.pointer = this.toSvg(e); this.render(); return; }
        if (this.pending === id) { this.pending = null; this.render(); return; }
        this.ws.addWire(this.pending, id); this.pending = null; this.render(); return;
      }
      const w = e.target.closest('[data-wire]');
      if (w) { this.ws.removeWire(+w.dataset.wire); }
    });
    this._key = (e) => {
      if (e.key === 'Escape' && this.pending) { this.pending = null; this.render(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.ws.selected && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '')) { e.preventDefault(); this.ws.removeItem(this.ws.selected); }
    };
    document.addEventListener('keydown', this._key);
  }
  destroy() { document.removeEventListener('keydown', this._key); this.host.replaceChildren(); }
}
