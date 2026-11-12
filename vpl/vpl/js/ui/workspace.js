// EXPERIMENT WORKSPACE: thư viện dụng cụ (trái) · bàn thí nghiệm (giữa) · thông số/điều khiển (phải) · số liệu, đồ thị, phân tích, nhật ký (dưới).
import { h, clear, toast, paramControl, esc } from './dom.js';
import { INSTRUMENTS, specSheet, labName, readInstrument } from '../core/instruments.js';
import { iconSVG } from './art.js';
import { SlotBench } from './bench-slots.js';
import { CircuitBench } from './bench-circuit.js';
import { View3D } from './view3d.js';
import { Rng } from '../core/rng.js';
import * as S from '../core/stats.js';
import { buildBottom, buildLesson, refreshBottom, graphToPNG } from './panels.js';
import { csvOf, downloadText, reportHTML, openPrint } from './report.js';

export const MODES = [
  { v: 'ideal', label: 'Lý tưởng', tip: 'Bỏ qua ma sát, lực cản, độ trễ, điện trở trong; dụng cụ đo hoàn hảo.' },
  { v: 'real', label: 'Thực tế', tip: 'Có các hiệu ứng vật lý thực (ma sát, lực cản, thể tích chết, điện trở trong…) và độ phân giải hữu hạn của dụng cụ.' },
  { v: 'noisy', label: 'Thực tế + nhiễu đo', tip: 'Thêm sai số hệ thống riêng của từng dụng cụ và nhiễu ngẫu nhiên theo sai số thiết bị công bố.' },
];
const MAX_RUNS = 12;

export class Workspace {
  constructor(exp, store, root, nav) {
    this.exp = exp; this.meta = exp.meta; this.store = store; this.root = root; this.nav = nav;
    this.alive = true; this.rt = {}; this.selected = null; this.sideTab = 'control'; this.bottomTab = 'data';
    this._saveT = null; this._tickT = 0;
    this.state = this._restore();
    this.rng = new Rng((this.state.seed ^ 0x9e3779b9) >>> 0);
    this.noise = new Rng((this.state.seed ^ 0x51ed270b) >>> 0);
    exp.init?.(this);
    this.mount();
    this._raf = requestAnimationFrame((t) => this._loop(t));
    this._onUnload = () => this.saveNow();
    window.addEventListener('beforeunload', this._onUnload);
    document.addEventListener('visibilitychange', this._onUnload);
    this.log(this.state.log.length ? 'Khôi phục phiên thí nghiệm đã lưu.' : 'Bắt đầu phiên thí nghiệm mới.');
  }

  // ───────────── Trạng thái, lưu/khôi phục ─────────────
  _fresh() {
    const settings = {};
    for (const d of this.exp.settings || []) settings[d.key] = d.default;
    return {
      seed: (Math.random() * 2 ** 31) >>> 0, mode: 'real', placed: [], wires: [], uidn: 1, settings, x: this.exp.initX ? this.exp.initX() : {},
      rows: [], rowN: 1, runs: [], pred: null, answers: {}, steps: {}, log: [], hints: 0, notes: { observation: '', conclusion: '' },
      student: { name: '', cls: '' }, graph: { mode: 'data', preset: 0, x: null, y: null, logx: false, logy: false, origin: true, fit: true, curve: null },
      started: Date.now(),
    };
  }
  _restore() {
    const saved = this.store.loadSession(this.meta.id);
    const f = this._fresh();
    if (!saved || !saved.state) return f;
    const st = saved.state;
    const out = { ...f, ...st, settings: { ...f.settings, ...(st.settings || {}) }, graph: { ...f.graph, ...(st.graph || {}) }, notes: { ...f.notes, ...(st.notes || {}) }, student: { ...f.student, ...(st.student || {}) } };
    if (!Array.isArray(out.placed) || !Array.isArray(out.rows) || !Array.isArray(out.wires)) return f;
    out.placed = out.placed.filter((p) => INSTRUMENTS[p.id]);
    return out;
  }
  save() {
    clearTimeout(this._saveT);
    this._saveT = setTimeout(() => this.saveNow(), 350);
  }
  saveNow() {
    if (!this.alive && !this._dying) return;
    clearTimeout(this._saveT);
    this.state.runs = this.state.runs.slice(-MAX_RUNS);
    const ok = this.store.saveSession(this.meta.id, { state: this.state });
    if (!ok && !this._warnedSave) { this._warnedSave = true; this.toast('Không lưu được phiên (bộ nhớ trình duyệt đầy hoặc bị chặn). Hãy xuất CSV để giữ số liệu.', 'warn', 6000); }
    if (ok) this.store.setStatus(this.meta.id, this.unlocked() ? 'done' : this.state.rows.length ? 'doing' : 'new');
  }
  resetSession() {
    this.state = this._fresh(); this.rt = {}; this.selected = null;
    this.rng = new Rng((this.state.seed ^ 0x9e3779b9) >>> 0); this.noise = new Rng((this.state.seed ^ 0x51ed270b) >>> 0);
    this.exp.init?.(this);
    this.store.clearSession(this.meta.id);
    this.mount(); this.log('Đã đặt lại phiên thí nghiệm.');
    this.save();
  }

  // ───────────── Tiện ích cho thí nghiệm ─────────────
  toast(msg, kind = 'info', ms) { toast(msg, kind, ms); }
  log(msg) {
    this.state.log.push({ t: Date.now(), msg });
    if (this.state.log.length > 300) this.state.log.splice(0, this.state.log.length - 300);
    if (this.bottomTab === 'log') this.refreshBottom();
    this.save();
  }
  get mode() { return this.state.mode; }
  get ideal() { return this.state.mode === 'ideal'; }
  setting(k) { return this.state.settings[k]; }
  hidden(key, fn) { return fn(this.rng.child(key)); }
  offset(key) { return this.state.mode === 'noisy' ? this.rng.child('off:' + key).range(-1, 1) : 0; }
  read(spec, truth, params = {}, key = spec.id) {
    return readInstrument(spec, truth, { params, mode: this.state.mode, rng: this.noise, offset: this.offset(key) });
  }
  has(id) { return this.state.placed.some((p) => p.id === id); }
  item(id) { return this.state.placed.find((p) => p.id === id) || null; }
  items(id) { return this.state.placed.filter((p) => p.id === id); }
  slot(key) { return this.state.placed.find((p) => p.slot === key) || null; }
  getByUid(uid) { return this.state.placed.find((p) => p.uid === uid) || null; }
  newItem(id, extra = {}) {
    const spec = INSTRUMENTS[id];
    const params = {};
    for (const p of spec.params || []) params[p.key] = p.default;
    return { uid: this._uid(id), id, params, ...extra };
  }
  _uid(id) {
    const pre = { dcSource: 'E', battery: 'B', resistor: 'R', rheostat: 'Rb', bulb: 'Đ', diode: 'D', switch: 'K', ammeter: 'A', voltmeter: 'V' }[id] || id;
    const used = new Set(this.state.placed.map((p) => p.uid));
    let n = 1; while (used.has(pre + n)) n++;
    return pre + n;
  }

  // ───────────── Đặt/gỡ dụng cụ ─────────────
  placeInSlot(key, id) {
    const old = this.slot(key);
    if (old) this.state.placed = this.state.placed.filter((p) => p !== old);
    this.state.placed.push(this.newItem(id, { slot: key }));
    this.log(`Đặt «${INSTRUMENTS[id].name}» lên bàn.`);
    this.exp.onPlace?.(this, id);
    this.changed({ structural: true });
  }
  addCircuitPart(id, x, y) {
    const it = this.newItem(id, { x, y });
    this.state.placed.push(it);
    this.selected = it.uid;
    this.log(`Đặt «${INSTRUMENTS[id].name}» (${it.uid}) lên bàn.`);
    this.changed({ structural: true });
    return it;
  }
  removeItem(uid) {
    const it = this.getByUid(uid); if (!it) return;
    this.state.placed = this.state.placed.filter((p) => p !== it);
    this.state.wires = this.state.wires.filter(([a, b]) => !a.startsWith(uid + ':') && !b.startsWith(uid + ':'));
    if (this.selected === uid) this.selected = null;
    this.log(`Gỡ «${INSTRUMENTS[it.id].name}» (${uid}) khỏi bàn.`);
    this.exp.onRemove?.(this, it);
    this.changed({ structural: true });
  }
  addWire(a, b) {
    if (a.split(':')[0] === b.split(':')[0] && this.exp.kind === 'circuit') { /* cho phép nối hai cực cùng linh kiện: sẽ báo đoản mạch khi giải */ }
    const dup = this.state.wires.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    if (dup) { this.toast('Hai cực này đã được nối với nhau.', 'warn'); return; }
    this.state.wires.push([a, b]);
    this.log(`Nối dây ${a} – ${b}.`);
    this.changed({ structural: true });
  }
  removeWire(i) {
    const w = this.state.wires[i]; if (!w) return;
    this.state.wires.splice(i, 1);
    this.log(`Gỡ dây ${w[0]} – ${w[1]}.`);
    this.changed({ structural: true });
  }
  selectPart(uid, click) {
    const it = this.getByUid(uid);
    if (it && click && it.id === 'switch') this.setParam(uid, 'closed', !it.params.closed, true);
    this.selected = uid;
    this.renderSide(); this.bench.render();
  }
  setParam(uid, key, val, silent) {
    const it = this.getByUid(uid); if (!it) return;
    const spec = INSTRUMENTS[it.id], def = (spec.params || []).find((p) => p.key === key);
    if (!def) return;
    if (def.type === 'range' || def.type === 'number') {
      if (!Number.isFinite(val) || (def.min != null && val < def.min) || (def.max != null && val > def.max)) { this.toast(`Giá trị «${def.label}» không hợp lệ.`, 'warn'); this.renderSide(); return; }
    }
    const old = it.params[key];
    it.params[key] = val;
    const msg = this.exp.onParam?.(this, it, key, val, old);
    if (typeof msg === 'string') { it.params[key] = old; this.toast(msg, 'warn', 5000); this.renderSide(); this.bench.render(); return; }
    if (!silent) this.log(`${spec.symbol} ${it.uid}: «${def.label}» = ${typeof val === 'boolean' ? (val ? 'Đóng' : 'Mở') : val}${def.unit ? ' ' + def.unit : ''}`);
    this.changed({ structural: false });
  }
  setSetting(key, val) {
    this.state.settings[key] = val;
    const msg = this.exp.onSetting?.(this, key, val);
    if (typeof msg === 'string') this.toast(msg, 'warn', 5000);
    const def = (this.exp.settings || []).find((d) => d.key === key);
    this.log(`Điều kiện «${def?.label || key}» = ${def?.options ? def.options.find((o) => String(o.v) === String(val))?.label : val}`);
    this.changed({ structural: !!def?.structural });
  }
  setMode(m) {
    this.state.mode = m;
    this.log(`Chuyển mô hình: ${MODES.find((x) => x.v === m).label}.`);
    this.exp.onMode?.(this, m);
    this.changed({ structural: false });
  }

  /** Gọi sau mỗi thay đổi. structural=true: dựng lại bàn và bảng điều khiển. */
  changed({ structural = false } = {}) {
    this.exp.onChange?.(this, { structural });
    if (structural) { this.bench.structure?.(); this.renderLibraryState(); this.renderSide(); }
    this.bench.render();
    this.updateReadouts();
    this.refreshBottom();
    this.refreshLesson();
    this.save();
  }

  // ───────────── Dữ liệu ─────────────
  columns() { return typeof this.exp.columns === 'function' ? this.exp.columns(this) : this.exp.columns; }
  cell(row, col) {
    if (col.calc) { try { const v = col.calc(row.vals, this); return Number.isFinite(v) ? v : null; } catch { return null; } }
    const v = row.vals[col.key];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  }
  includedRows() { return this.state.rows.filter((r) => r.inc); }
  colValues(key, rows = this.includedRows()) {
    const col = this.columns().find((c) => c.key === key); if (!col) return [];
    return rows.map((r) => this.cell(r, col));
  }
  pairs(kx, ky, rows = this.includedRows()) {
    const X = this.colValues(kx, rows), Y = this.colValues(ky, rows);
    const out = []; for (let i = 0; i < X.length; i++) if (X[i] != null && Y[i] != null) out.push({ x: X[i], y: Y[i] });
    return out;
  }
  addRow(vals, auto = true) {
    const r = { id: this.state.rowN++, vals: { ...vals }, inc: true, auto };
    this.state.rows.push(r);
    this.log(`Ghi lần đo #${this.state.rows.length}${auto ? ' (tự động)' : ''}.`);
    this.changed({ structural: false });
    this.bottomTab = 'data'; this.refreshBottom(true);
    return r;
  }
  addRun(run) {
    this.state.runs.push({ id: this.state.rowN++, ...run });
    this.state.runs = this.state.runs.slice(-MAX_RUNS);
    this.save();
  }

  // ───────────── Sư phạm ─────────────
  requirePrediction() {
    if (this.state.pred) return true;
    this.toast('Hãy ghi dự đoán của bạn trước khi tiến hành thí nghiệm (tab «Bài học»).', 'warn', 5200);
    this.sideTab = 'lesson'; this.renderSideTabs(); this.renderSide();
    return false;
  }
  requirements() {
    const m = this.meta, q = m.questions || [];
    const answered = q.filter((_, i) => this.state.answers[i]?.done).length;
    return [
      { label: 'Đã ghi dự đoán', ok: !!this.state.pred },
      { label: `Có ít nhất ${m.minRows} lần đo được đưa vào phân tích (hiện có ${this.includedRows().length})`, ok: this.includedRows().length >= m.minRows },
      { label: `Đã trả lời các câu hỏi thảo luận (${answered}/${q.length})`, ok: answered === q.length },
      { label: 'Đã tự viết kết luận của mình (tab «Phân tích»)', ok: (this.state.notes.conclusion || '').trim().length >= 20 },
    ];
  }
  unlocked() { return this.requirements().every((r) => r.ok); }
  canSeeTheory() { return this.includedRows().length >= Math.min(3, this.meta.minRows); }

  // ───────────── Giao diện ─────────────
  mount() {
    this.bench?.destroy?.(); this.view3d?.dispose(); this.view3d = null;
    clear(this.root);
    const exp = this.exp, m = this.meta;
    this.benchHost = h('div', { class: 'bench-host' });
    this.libEl = h('aside', { class: 'lib', 'aria-label': 'Thư viện dụng cụ' });
    this.sideEl = h('aside', { class: 'side', 'aria-label': 'Thông số và điều khiển' });
    this.bottomEl = h('section', { class: 'bottom', 'aria-label': 'Số liệu và phân tích' });
    this.ws = h('div', { class: 'ws' });

    const modeSel = h('select', { id: 'modeSel', title: 'Mô hình vật lý', 'aria-label': 'Mô hình vật lý' }, MODES.map((x) => h('option', { value: x.v, selected: x.v === this.state.mode }, x.label)));
    modeSel.addEventListener('change', () => this.setMode(modeSel.value));
    const tog = (cls, label, title) => h('button', { class: 'btn ghost sm tog on', title, 'aria-pressed': 'true', onClick: (e) => { const on = this.ws.classList.toggle('no-' + cls); e.currentTarget.classList.toggle('on', !on); e.currentTarget.setAttribute('aria-pressed', String(!on)); setTimeout(() => window.dispatchEvent(new Event('resize')), 60); } }, label);
    const top = h('div', { class: 'ws-top' },
      h('a', { class: 'btn ghost sm', href: '#/experiments' }, '← Danh mục'),
      h('div', { class: 'ws-title' }, h('span', { class: `chip lab-${m.lab}` }, labName(m.lab)), h('h1', null, m.title)),
      h('div', { class: 'ws-actions' },
        h('label', { class: 'modesel' }, h('span', null, 'Mô hình'), modeSel),
        tog('lib', 'Dụng cụ', 'Thu gọn/mở thư viện dụng cụ'), tog('side', 'Thông số', 'Thu gọn/mở bảng thông số'), tog('bottom', 'Số liệu', 'Thu gọn/mở bảng số liệu'),
        h('button', { class: 'btn sm', onClick: () => this.openReport() }, 'Báo cáo'),
        h('button', { class: 'btn ghost sm', onClick: () => this.confirmReset() }, 'Đặt lại')));
    this.view3d = exp.scene3d ? new View3D(this, this.benchHost) : null;
    const centre = h('div', { class: 'centre' }, this.view3d ? this.view3d.bar : null, this.benchHost, h('div', { class: 'bench-note', id: 'benchNote' }));
    this.ws.append(top, h('div', { class: 'ws-main' }, this.libEl, centre, this.sideEl), this.bottomEl);
    this.root.append(this.ws);

    this.bench = exp.kind === 'circuit' ? new CircuitBench(this, this.benchHost) : new SlotBench(this, this.benchHost);
    this.buildLibrary();
    this.renderSideTabs();
    this.renderSide();
    buildBottom(this);
    this.updateReadouts();
  }

  confirmReset() {
    if (confirm('Đặt lại toàn bộ phiên? Dụng cụ trên bàn, số liệu, câu trả lời và nhật ký sẽ bị xóa.')) this.resetSession();
  }

  // ----- Thư viện dụng cụ -----
  buildLibrary() {
    clear(this.libEl);
    this.libEl.append(h('div', { class: 'pane-title' }, h('b', null, 'Thư viện dụng cụ'), h('small', null, 'Chọn đúng dụng cụ cho thí nghiệm. Kéo thả hoặc nhấn +.')));
    const groups = {};
    for (const id of this.exp.library) { const sp = INSTRUMENTS[id]; (groups[sp.category] ||= []).push(sp); }
    this.cardEls = {};
    for (const [cat, list] of Object.entries(groups)) {
      this.libEl.append(h('div', { class: 'lib-cat' }, cat));
      for (const sp of list) {
        const card = h('div', { class: 'card-inst', role: 'listitem', tabindex: 0, 'data-id': sp.id, 'aria-label': sp.name },
          h('div', { class: 'ci-art', html: iconSVG(sp.id) }, ''),
          h('div', { class: 'ci-body' }, h('b', null, sp.name), h('small', null, sp.measures ? `Đo ${sp.unit}` : 'Vật/dụng cụ')),
          h('button', { class: 'ci-add', title: `Đưa «${sp.name}» lên bàn`, 'aria-label': `Đưa ${sp.name} lên bàn`, onClick: (e) => { e.stopPropagation(); this.dropInstrument(sp.id); } }, '+'),
          h('button', { class: 'ci-info', title: 'Xem thông số', 'aria-label': `Xem thông số ${sp.name}`, onClick: (e) => { e.stopPropagation(); this.showSpec(sp.id); } }, 'i'));
        card.addEventListener('pointerdown', (e) => this._startDrag(e, sp.id, card));
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.showSpec(sp.id); });
        this.cardEls[sp.id] = card; this.libEl.append(card);
      }
    }
    this.renderLibraryState();
  }
  renderLibraryState() {
    for (const [id, el] of Object.entries(this.cardEls || {})) el.classList.toggle('placed', this.has(id));
  }
  _startDrag(e, id, card) {
    if (e.button !== 0 || e.target.closest('button')) return;
    const sx = e.clientX, sy = e.clientY; let ghost = null;
    const over = (ev) => { const r = this.benchHost.getBoundingClientRect(); return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom; };
    const move = (ev) => {
      if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) {
        ghost = h('div', { class: 'drag-ghost', html: iconSVG(id) }); document.body.append(ghost); card.classList.add('dragging');
      }
      if (ghost) { ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; this.bench.hover?.(id, over(ev)); }
    };
    const end = (ev) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end);
      card.classList.remove('dragging');
      if (ghost) {
        ghost.remove(); this.bench.hover?.(id, false);
        if (ev.type === 'pointerup' && over(ev)) this.dropInstrument(id, ev);
      } else if (ev.type === 'pointerup') this.showSpec(id);
    };
    if (e.pointerType === 'touch' && !e.target.closest('.ci-art')) return; // chỉ kéo bằng hình dụng cụ khi cảm ứng, để còn cuộn danh sách
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  }
  dropInstrument(id, ev) {
    if (this.exp.kind === 'circuit') {
      let x = 120 + (this.state.placed.length % 5) * 150, y = 90 + Math.floor(this.state.placed.length / 5) * 110;
      if (ev) { const p = (this.view3d?.mode === '3d' && this.view3d.toBench(ev)) || this.bench.toSvg(ev); x = p.x; y = p.y; }
      this.bench.addPart(id, x, y);
    } else this.bench.drop(id);
  }

  showSpec(id) {
    const sp = INSTRUMENTS[id];
    const placed = this.has(id);
    const rows = specSheet(sp, this.item(id)?.params || {});
    rows.push(['Trạng thái', placed ? 'Đang ở trên bàn thí nghiệm' : 'Trong thư viện (chưa dùng)']);
    const body = h('div', { class: 'spec' },
      h('div', { class: 'spec-art', html: iconSVG(sp.id) }),
      h('div', { class: 'spec-name' }, h('b', null, sp.name), h('span', { class: 'chip' }, `Ký hiệu: ${sp.symbol}`)),
      h('table', { class: 'spec-t' }, rows.map(([k, v]) => h('tr', null, h('th', null, k), h('td', null, String(v))))),
      h('div', { class: 'spec-btns' }, h('button', { class: 'btn', onClick: () => { this.closeModal(); this.dropInstrument(id); } }, 'Đưa lên bàn')));
    this.openModal(sp.name, body);
  }

  openModal(title, body) {
    this.closeModal();
    const back = h('div', { class: 'modal-back', onClick: (e) => { if (e.target === back) this.closeModal(); } },
      h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('div', { class: 'modal-h' }, h('b', null, title), h('button', { class: 'btn ghost sm', 'aria-label': 'Đóng', onClick: () => this.closeModal() }, '✕')), body));
    document.body.append(back); this._modal = back;
    this._modalKey = (e) => { if (e.key === 'Escape') this.closeModal(); };
    document.addEventListener('keydown', this._modalKey);
  }
  closeModal() {
    if (this._modal) { this._modal.remove(); this._modal = null; document.removeEventListener('keydown', this._modalKey); }
  }

  // ----- Bảng bên phải -----
  renderSideTabs() {
    const mk = (id, label) => h('button', { class: `tab${this.sideTab === id ? ' on' : ''}`, role: 'tab', 'aria-selected': String(this.sideTab === id), onClick: () => { this.sideTab = id; this.renderSideTabs(); this.renderSide(); } }, label);
    this.sideTabsEl = this.sideTabsEl || h('div', { class: 'tabs', role: 'tablist' });
    clear(this.sideTabsEl); this.sideTabsEl.append(mk('control', 'Điều khiển'), mk('lesson', 'Bài học'));
  }
  renderSide() {
    if (!this.sideTabsEl) return;
    clear(this.sideEl);
    this.sideEl.append(this.sideTabsEl);
    const body = h('div', { class: 'side-body' });
    this.sideEl.append(body);
    if (this.sideTab === 'lesson') { this.lessonEl = body; buildLesson(this, body); return; }
    this.lessonEl = null;
    const exp = this.exp;
    // đồng hồ đo
    this.readoutsEl = h('div', { class: 'readouts' });
    body.append(h('div', { class: 'blk' }, h('div', { class: 'blk-t' }, 'Thiết bị đo'), this.readoutsEl));
    // dụng cụ trên bàn
    const list = exp.kind === 'circuit' ? this.state.placed.filter((p) => p.uid === this.selected) : this.state.placed;
    const blk = h('div', { class: 'blk' }, h('div', { class: 'blk-t' }, exp.kind === 'circuit' ? 'Linh kiện đang chọn' : 'Dụng cụ trên bàn'));
    if (!list.length) blk.append(h('p', { class: 'mute' }, exp.kind === 'circuit' ? 'Nhấp vào một linh kiện trên bàn để chỉnh thông số.' : 'Chưa có dụng cụ nào. Kéo dụng cụ từ thư viện vào các khe trên bàn.'));
    for (const it of list) {
      const sp = INSTRUMENTS[it.id];
      const box = h('div', { class: 'item-box' }, h('div', { class: 'item-h' }, h('b', null, `${sp.symbol} ${exp.kind === 'circuit' ? it.uid : ''}`.trim()), h('button', { class: 'btn ghost sm', onClick: () => this.removeItem(it.uid) }, 'Gỡ')));
      const ps = (sp.params || []).filter((p) => !p.hidden);
      if (!ps.length) box.append(h('p', { class: 'mute sm' }, 'Không có thông số điều chỉnh.'));
      for (const def of ps) box.append(paramControl({ ...def, live: def.live ?? (def.type === 'range' && exp.liveParams?.includes(def.key)) }, it.params[def.key], (v) => this.setParam(it.uid, def.key, v)));
      blk.append(box);
    }
    body.append(blk);
    // điều kiện chung
    if ((exp.settings || []).length) {
      const sb = h('div', { class: 'blk' }, h('div', { class: 'blk-t' }, 'Điều kiện thí nghiệm'));
      for (const d of exp.settings) {
        if (d.visible && !d.visible(this)) continue;
        sb.append(paramControl(d, this.state.settings[d.key], (v) => this.setSetting(d.key, v)));
      }
      body.append(sb);
    }
    // điều khiển riêng của thí nghiệm
    this.ctrlEl = h('div', { class: 'blk' }, h('div', { class: 'blk-t' }, 'Tiến hành'));
    body.append(this.ctrlEl);
    exp.controls?.(this, this.ctrlEl);
    this.updateReadouts();
  }
  refreshControls() { this.renderSide(); }

  updateReadouts() {
    const note = document.getElementById('benchNote');
    if (note) {
      const st = this.exp.status?.(this);
      note.textContent = st?.text || ''; note.className = 'bench-note' + (st?.kind ? ' ' + st.kind : '');
    }
    if (!this.readoutsEl) return;
    const list = this.exp.readouts?.(this) || [];
    clear(this.readoutsEl);
    if (!list.length) this.readoutsEl.append(h('p', { class: 'mute sm' }, 'Chưa có thiết bị đo nào trên bàn.'));
    for (const r of list) this.readoutsEl.append(h('div', { class: `ro${r.warn ? ' warn' : ''}` }, h('span', null, r.label), h('b', null, r.text)));
    this.exp.updateControls?.(this);
  }
  refreshBottom(force) { if (this.bottom !== false) refreshBottom(this, force); }
  refreshLesson() { if (this.lessonEl) { clear(this.lessonEl); buildLesson(this, this.lessonEl); } }

  // ----- Vòng lặp hoạt ảnh -----
  _loop(t) {
    if (!this.alive) return;
    const dt = Math.min(0.1, this._last ? (t - this._last) / 1000 : 0);
    this._last = t;
    try {
      if (this.exp.frame?.(this, dt)) { this.bench.render(); this.updateReadouts(); }
    } catch (err) {
      console.error(err);
      if (!this._frameErr) { this._frameErr = true; this.toast('Lỗi trong mô phỏng: ' + (err.message || err), 'error', 7000); }
    }
    this._raf = requestAnimationFrame((x) => this._loop(x));
  }

  // ───────────── Báo cáo ─────────────
  reportModel({ withImages = true } = {}) {
    const m = this.meta, cols = this.columns(), rows = this.state.rows;
    const fmt = (c, v) => (v == null ? '—' : S.fmtSig(v, c.sig ?? 4));
    const analysis = this.exp.analyze ? this.exp.analyze(this, { reveal: this.canSeeTheory() }) : { items: [], notes: [] };
    const placed = this.state.placed.map((p) => INSTRUMENTS[p.id].name + (this.exp.kind === 'circuit' ? ` (${p.uid})` : ''));
    const inst = [...new Set(this.state.placed.map((p) => p.id))].map((id) => INSTRUMENTS[id]).filter((s) => s.measures).map((sp) => {
      const p = this.item(sp.id)?.params || {};
      const res = sp.resFromParams ? sp.resFromParams(p) : sp.resolution;
      return { name: sp.name, range: sp.range || sp.rangeFromParams ? `${(sp.rangeFromParams ? -sp.rangeFromParams(p) : sp.range[0])} … ${(sp.rangeFromParams ? sp.rangeFromParams(p) : sp.range[1])} ${sp.unit}` : '—', lsd: `${sp.lsd ?? res} ${sp.unit}`, acc: sp.accuracyText || `±${sp.accuracy} ${sp.unit}` };
    });
    const included = this.includedRows();
    const calcs = [];
    for (const c of cols.filter((c) => c.calc && c.formula)) {
      const r = included[0];
      if (r) calcs.push(`${c.symbol} = ${c.formula}  → lần 1: ${fmt(c, this.cell(r, c))} ${c.unit || ''}`);
      else calcs.push(`${c.symbol} = ${c.formula}`);
    }
    for (const a of analysis.items) if (a.calc) calcs.push(a.calc);
    const errorNotes = [
      `Mô hình sử dụng: ${MODES.find((x) => x.v === this.state.mode).label} – ${MODES.find((x) => x.v === this.state.mode).tip}`,
      ...inst.map((i) => `Sai số thiết bị của ${i.name}: ${i.acc}, độ chia nhỏ nhất ${i.lsd}.`),
      ...analysis.notes,
    ];
    const graph = withImages ? graphToPNG(this) : null;
    let svg = null;
    if (withImages) { const el = this.benchHost.querySelector('svg'); if (el) { svg = new XMLSerializer().serializeToString(el).replace('<svg ', '<svg class="bench" '); } }
    return {
      title: m.title, labName: labName(m.lab), date: new Date().toLocaleString('vi-VN'), modeLabel: MODES.find((x) => x.v === this.state.mode).label, seed: this.state.seed.toString(16),
      student: this.state.student, objective: m.objective, theory: m.theory, instruments: inst, placed, benchSVG: svg,
      procedure: m.procedure.map((p) => p.t), columns: cols,
      rows: rows.map((r) => ({ included: r.inc, cells: cols.map((c) => fmt(c, this.cell(r, c))) })),
      rawRows: rows.map((r) => cols.map((c) => { const v = this.cell(r, c); return v == null ? '' : v; })),
      graphPNG: graph?.png || null, graphCaption: graph?.caption || '',
      calcs, analysis: analysis.items.map((a) => ({ label: a.label, value: a.value, ref: a.ref, err: a.err })), errorNotes,
      observation: this.state.notes.observation, conclusion: this.state.notes.conclusion,
      officialConclusion: this.unlocked() ? m.conclusion : null,
    };
  }
  openReport() {
    const nameIn = h('input', { type: 'text', placeholder: 'Họ và tên', value: this.state.student.name, maxlength: 80 });
    const clsIn = h('input', { type: 'text', placeholder: 'Lớp', value: this.state.student.cls, maxlength: 20 });
    const sync = () => { this.state.student.name = nameIn.value.trim(); this.state.student.cls = clsIn.value.trim(); this.save(); };
    nameIn.addEventListener('change', sync); clsIn.addEventListener('change', sync);
    const n = this.state.rows.length;
    const body = h('div', { class: 'report-dlg' },
      h('p', null, n ? `Báo cáo gồm ${n} lần đo, đồ thị và phân tích hiện có.` : 'Chưa có số liệu – báo cáo sẽ có các mục trống.'),
      h('label', { class: 'pc' }, h('span', { class: 'pc-l' }, 'Học sinh'), nameIn), h('label', { class: 'pc' }, h('span', { class: 'pc-l' }, 'Lớp'), clsIn),
      h('div', { class: 'spec-btns' },
        h('button', { class: 'btn', onClick: () => { sync(); openPrint(reportHTML(this.reportModel()), `bao-cao-${this.meta.id}.html`); } }, 'In / Lưu PDF'),
        h('button', { class: 'btn ghost', onClick: () => { sync(); downloadText(`bao-cao-${this.meta.id}.html`, reportHTML(this.reportModel()), 'text/html;charset=utf-8'); } }, 'Tải báo cáo (HTML)'),
        h('button', { class: 'btn ghost', onClick: () => this.exportCSV() }, 'Tải số liệu (CSV)')),
      h('p', { class: 'mute sm' }, 'Chọn «Lưu dưới dạng PDF» trong hộp thoại in của trình duyệt để xuất PDF.'));
    this.openModal('Xuất báo cáo', body);
  }
  exportCSV() {
    if (!this.state.rows.length) { this.toast('Chưa có số liệu để xuất.', 'warn'); return; }
    downloadText(`so-lieu-${this.meta.id}.csv`, csvOf(this.reportModel({ withImages: false })), 'text/csv;charset=utf-8');
  }

  destroy() {
    this._dying = true; this.saveNow(); this._dying = false;
    this.alive = false; cancelAnimationFrame(this._raf);
    window.removeEventListener('beforeunload', this._onUnload); document.removeEventListener('visibilitychange', this._onUnload);
    this.closeModal(); this.bench?.destroy?.(); this.view3d?.dispose(); this.exp.destroy?.(this);
  }
}

export { esc };
