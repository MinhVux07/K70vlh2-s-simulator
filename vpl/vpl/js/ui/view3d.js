// Chế độ xem 3D của bàn thí nghiệm: tạo Scene3D khi bật, huỷ khi tắt (giải phóng ngữ cảnh WebGL).
import { h } from './dom.js';
import { Scene3D } from './gl3d.js';
import { INSTRUMENTS } from '../core/instruments.js';

const KEY = 'vpl.view';
const pref = () => { try { return localStorage.getItem(KEY) || '2d'; } catch { return '2d'; } };
const savePref = (v) => { try { localStorage.setItem(KEY, v); } catch { /* bỏ qua */ } };

export class View3D {
  constructor(ws, host) {
    this.ws = ws; this.host = host; this.scene = null; this.mode = '2d';
    this.bar = h('div', { class: 'viewbar' });
    this.b2 = h('button', { class: 'btn sm ghost', type: 'button', 'aria-pressed': 'true', onClick: () => this.set('2d') }, '2D · Lắp ráp');
    this.b3 = h('button', { class: 'btn sm ghost', type: 'button', 'aria-pressed': 'false', onClick: () => this.set('3d') }, '3D · Quan sát');
    this.bL = h('button', { class: 'btn sm ghost', type: 'button', 'aria-pressed': 'false', title: 'Bật/tắt nhãn chữ trong cảnh 3D', onClick: () => this.toggleLabels() }, 'Nhãn: tắt');
    this.hint = h('span', { class: 'mute sm view-hint' }, '');
    this.bar.append(this.b2, this.b3, this.bL, this.hint);
    if (pref() === '3d') queueMicrotask(() => this.set('3d', true));
  }
  set(mode, silent) {
    if (mode === this.mode) return;
    this.mode = mode;
    if (mode === '3d') {
      let s; try { s = new Scene3D(this.host, this.ws.exp.cam3d || {}); } catch (e) { console.error(e); this.mode = '2d'; this.fail('Không khởi tạo được WebGL: ' + (e.message || e).toString().slice(0, 300)); return; }
      if (!s.ok) { this.mode = '2d'; this.ws.toast('Trình duyệt hoặc thiết bị này không hỗ trợ WebGL nên không bật được chế độ 3D.', 'warn', 6000); return; }
      this.scene = s; s.showLabels = !!this.labels;
      try {
        const inst = this.ws.exp.scene3d(this.ws, s); this.inst = inst; s.interact = inst?.interact || this.defaultInteract(s);
        s.onFrame = (dt) => { inst?.update?.(dt); this.sync(s); };
        this.tip = h('div', { class: 'pick-bar', hidden: true }); this.host.append(this.tip);
        this._key = (e) => { if ((e.key === 'Delete' || e.key === 'Backspace') && this.ws.exp.kind !== 'circuit' && this.ws.selected && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '')) { e.preventDefault(); this.ws.removeItem(this.ws.selected); } };
        document.addEventListener('keydown', this._key);
      } catch (e) { console.error(e); s.dispose(); this.scene = null; this.mode = '2d'; this.ws.toast('Không dựng được cảnh 3D: ' + e.message, 'error', 6000); return; }
      s.onError = (e) => { this.set('2d', true); this.fail('Cảnh 3D gặp lỗi khi vẽ: ' + (e.message || e).toString().slice(0, 300)); };
      s.start(); this.host.classList.add('v3d');
      this.hint.textContent = this.ws.exp.kind === 'circuit' ? 'Kéo linh kiện từ thư viện thả vào bàn · kéo linh kiện để di chuyển · nhấp cực rồi nhấp cực khác để nối dây · nhấp dây để gỡ · nhấp công tắc để đóng/mở · kéo vùng trống để xoay, cuộn để phóng/thu.' : 'Kéo dụng cụ từ thư viện thả vào bàn · nhấp vào dụng cụ để chọn/gỡ · kéo chuột trái để xoay, chuột phải để dịch, cuộn để phóng/thu, nhấp đúp để về góc nhìn gốc.';
    } else {
      this._off(); this.hint.textContent = ''; this.hint.style.color = '';
    }
    this.b2.setAttribute('aria-pressed', String(this.mode === '2d')); this.b3.setAttribute('aria-pressed', String(this.mode === '3d'));
    this.b2.classList.toggle('on', this.mode === '2d'); this.b3.classList.toggle('on', this.mode === '3d');
    if (!silent) savePref(this.mode);
    this.host.dispatchEvent(new CustomEvent('view3d', { detail: this.mode }));
  }
  toggleLabels() { this.labels = !this.labels; if (this.scene) this.scene.showLabels = this.labels; this.bL.textContent = 'Nhãn: ' + (this.labels ? 'bật' : 'tắt'); this.bL.setAttribute('aria-pressed', String(this.labels)); }
  fail(msg) { this.hint.textContent = msg; this.hint.style.color = 'var(--bad)'; this.ws.toast(msg, 'error', 12000); this.b2.setAttribute('aria-pressed', 'true'); this.b3.setAttribute('aria-pressed', 'false'); this.b2.classList.add('on'); this.b3.classList.remove('on'); }
  _off() { this.scene?.dispose(); this.scene = null; this.inst = null; this.tip?.remove(); this.tip = null; if (this._key) document.removeEventListener('keydown', this._key); this._key = null; this.host.classList.remove('v3d'); }
  dispose() { this._off(); }
  uidOf(pick) { return pick?.uid ?? (pick?.slot ? this.ws.slot(pick.slot)?.uid : null) ?? null; }
  /** Điểm chuột (toạ độ client) → toạ độ bàn lắp 2D (px) – dùng khi thả linh kiện từ thư viện vào cảnh 3D. */
  toBench(ev) { return this.inst?.toBench?.(ev) || null; }
  /** Mặc định cho cảnh khe lắp: nhấp để chọn dụng cụ, nhấp vùng trống để bỏ chọn. */
  defaultInteract(S) {
    const firstObj = (ray) => S.pick(ray).find((h) => h.kind === 'obj' && h.root && h.root.pick);
    return {
      hover: (e, ray) => { S.canvas.style.cursor = firstObj(ray) ? 'pointer' : ''; },
      click: (e, ray) => { const hit = firstObj(ray), uid = hit ? this.uidOf(hit.root.pick) : null; if (uid) this.ws.selectPart(uid); else if (this.ws.selected) { this.ws.selected = null; this.ws.renderSide(); } },
    };
  }
  /** Mỗi khung hình: tô sáng dụng cụ đang chọn và đặt thanh công cụ nổi theo vị trí của nó. */
  sync(S) {
    const sel = this.ws.selected; let anchor = null;
    const walk = (n) => { if (n.pick && typeof n.pick === 'object') { const on = !!sel && this.uidOf(n.pick) === sel; n.hl = on; if (on && n.visible && !anchor) { const w = n.world(); anchor = [w[12], w[13] + 0.07, w[14]]; } } n.children.forEach(walk); };
    S.nodes.forEach(walk);
    const it = sel ? this.ws.getByUid(sel) : null;
    if (!this.tip) return;
    const pos = anchor && it ? S.project(anchor) : null;
    if (!pos) { this.tip.hidden = true; return; }
    if (this.tip.dataset.uid !== sel) { this.tip.dataset.uid = sel; this.tip.replaceChildren(h('b', null, INSTRUMENTS[it.id].name + (this.ws.exp.kind === 'circuit' ? ` (${it.uid})` : '')), h('button', { class: 'btn sm ghost', type: 'button', onClick: () => this.ws.removeItem(it.uid) }, '✕ Gỡ')); }
    this.tip.hidden = false; const d = S.dpr || 1; this.tip.style.left = `${Math.min(Math.max(pos[0] / d, 80), this.host.clientWidth - 80)}px`; this.tip.style.top = `${Math.max(pos[1] / d, 30)}px`;
  }
}
