// Bàn thí nghiệm kiểu "khe lắp": mỗi khe chỉ nhận đúng loại dụng cụ phù hợp. Dụng cụ không phù hợp bị từ chối kèm lý do.
import { h, s } from './dom.js';
import { INSTRUMENTS } from '../core/instruments.js';

export const BENCH_W = 900, BENCH_H = 420;

export class SlotBench {
  constructor(ws, host) {
    this.ws = ws; this.host = host;
    this.svg = s('svg', { viewBox: `0 0 ${BENCH_W} ${BENCH_H}`, class: 'bench-svg', role: 'img', 'aria-label': 'Bàn thí nghiệm' });
    this.gBg = s('g'); this.gSlots = s('g'); this.gScene = s('g');
    this.svg.append(this.gBg, this.gSlots, this.gScene);
    this.rm = h('div', { class: 'rm-layer' });
    host.append(this.svg, this.rm);
    this.structure();
  }

  slots() { return this.ws.exp.slots; }
  rectOf(sl) { return typeof sl.rect === 'function' ? sl.rect(this.ws) : sl.rect; }

  /** Khe nhận dụng cụ id (hoặc null). */
  slotFor(id) { return Object.entries(this.slots()).find(([, sl]) => sl.accepts.includes(id))?.[0] || null; }

  structure() {
    const ws = this.ws;
    this.gBg.innerHTML = ws.exp.background ? ws.exp.background(ws) : '';
    this.rm.replaceChildren();
    this.slotEls = {};
    for (const [key, sl] of Object.entries(this.slots())) {
      const filled = ws.slot(key);
      if (filled) {
        const b = h('button', { class: 'rm', title: `Gỡ ${INSTRUMENTS[filled.id].name} khỏi bàn`, 'aria-label': `Gỡ ${INSTRUMENTS[filled.id].name}`, onClick: () => ws.removeItem(filled.uid) }, '✕');
        this.rm.append(b); this.slotEls[key] = { rm: b };
      }
    }
    this.render();
  }

  render() {
    const ws = this.ws;
    let ph = '';
    for (const [key, sl] of Object.entries(this.slots())) {
      const filled = ws.slot(key);
      const [x, y, w, hh] = this.rectOf(sl);
      if (!filled) {
        ph += `<g class="slot${this.hotKey === key ? ' hot' : ''}" data-slot="${key}"><rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="8"/><text x="${x + w / 2}" y="${y + hh / 2}" text-anchor="middle" dominant-baseline="middle">+ ${sl.label}</text></g>`;
      } else if (this.slotEls[key]) {
        const el = this.slotEls[key].rm;
        el.style.left = `${((x + w) / BENCH_W) * 100}%`; el.style.top = `${(y / BENCH_H) * 100}%`;
      }
    }
    this.gSlots.innerHTML = ph;
    this.gScene.innerHTML = ws.exp.draw(ws);
  }

  /** Đánh dấu khe sẽ nhận khi đang kéo dụng cụ id qua bàn. */
  hover(id, on) {
    const key = on && id ? this.slotFor(id) : null;
    if (key !== this.hotKey) { this.hotKey = key; this.host.classList.toggle('drop-ok', !!key); this.host.classList.toggle('drop-bad', on && !key && !!id); this.render(); }
  }

  /** Thả dụng cụ lên bàn. Trả về true nếu được nhận. */
  drop(id) {
    const ws = this.ws, spec = INSTRUMENTS[id];
    const key = this.slotFor(id);
    if (!key) {
      const why = ws.exp.reject?.[id] || 'không dùng được trong cách bố trí thí nghiệm này';
      ws.toast(`${spec.name}: ${why}`, 'warn', 5200);
      ws.log(`Thử đặt «${spec.name}» lên bàn nhưng bị từ chối: ${why}`);
      return false;
    }
    ws.placeInSlot(key, id);
    return true;
  }
  destroy() { this.host.replaceChildren(); }
}
