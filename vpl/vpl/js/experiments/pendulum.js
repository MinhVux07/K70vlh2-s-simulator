// Con lắc đơn: đo chu kỳ T theo chiều dài L để xác định g; khảo sát ảnh hưởng của biên độ (RK4, phương trình phi tuyến đầy đủ).
import { h } from '../ui/dom.js';
import { INSTRUMENTS } from '../core/instruments.js';
import { PLANETS } from '../core/physics.js';
import * as S from '../core/stats.js';

const SC = 300, PX = 470, PY = 36;
const deriv = (g, L, gamma) => (th, om) => [om, -(g / L) * Math.sin(th) - gamma * om];
/** Một bước RK4 cho θ'' = −(g/L) sinθ − γθ'. */
export function stepPendulum(st, g, L, gamma, dt) {
  const f = deriv(g, L, gamma);
  const k1 = f(st.th, st.om), k2 = f(st.th + 0.5 * dt * k1[0], st.om + 0.5 * dt * k1[1]);
  const k3 = f(st.th + 0.5 * dt * k2[0], st.om + 0.5 * dt * k2[1]), k4 = f(st.th + dt * k3[0], st.om + dt * k3[1]);
  return { th: st.th + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), om: st.om + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) };
}
/** Thời gian thực hiện N dao động toàn phần (từ biên độ cực đại, đếm các lần quay lại biên dương). */
export function timeNPeriods({ L, g, theta0Deg, gamma = 0, N }) {
  const T0 = 2 * Math.PI * Math.sqrt(L / g), dt = T0 / 4000;
  let st = { th: (theta0Deg * Math.PI) / 180, om: 0 }, t = 0, count = 0;
  for (let i = 0; i < 4000 * (N + 2) * 1.5; i++) {
    const nx = stepPendulum(st, g, L, gamma, dt);
    if (st.om > 0 && nx.om <= 0 && t > 0) { count++; if (count === N) return t + dt * (st.om / (st.om - nx.om)); }
    st = nx; t += dt;
  }
  return NaN;
}

const gOf = (ws) => ws.setting('g');
const need = (ws) => [['pend', 'con lắc đơn'], ['timer', 'dụng cụ đo thời gian'], ['ruler', 'thước mét']].filter(([k]) => !ws.slot(k)).map(([, n]) => n);
const gammaOf = (ws) => (ws.ideal ? 0 : 0.012); // hệ số cản không khí/ma sát ở điểm treo (1/s)

const meta = {
  id: 'pendulum', lab: 'mech', topic: 'Chuyển động quay và cân bằng', title: 'Con lắc đơn – Chu kỳ và gia tốc trọng trường', level: 2, minutes: 30,
  tags: ['con lắc đơn', 'chu kỳ', 'dao động', 'gia tốc trọng trường', 'biên độ'],
  covers: ['Con lắc đơn'],
  objective: ['Khảo sát sự phụ thuộc của chu kỳ con lắc đơn vào chiều dài và biên độ.', 'Xác định g từ hệ số góc của đồ thị T²–L.', 'Hiểu vì sao phải đo nhiều dao động và dùng biên độ nhỏ.'],
  question: 'Chu kỳ dao động của con lắc đơn phụ thuộc vào những đại lượng nào?',
  theory: `<p>Với biên độ nhỏ, con lắc đơn dao động điều hòa: <i>T</i> = 2π√(<i>L</i>/<i>g</i>), tức <i>T</i>² = (4π²/<i>g</i>)·<i>L</i>. Đồ thị <i>T</i>² theo <i>L</i> là đường thẳng qua gốc, hệ số góc 4π²/<i>g</i>.</p>
    <p>Chu kỳ không phụ thuộc khối lượng bi. Với biên độ lớn, <i>T</i> lớn hơn: <i>T</i> ≈ <i>T</i><sub>0</sub>(1 + θ₀²/16 + …).</p>
    <p>Thời gian cho <i>N</i> dao động được đo một lần, chu kỳ là <i>T</i> = <i>t</i>/<i>N</i>; sai số bấm tay (~0,05 s) bị chia cho <i>N</i> nên đo nhiều dao động chính xác hơn.</p>`,
  apparatus: [{ text: 'Con lắc đơn', ids: ['pendulum'] }, { text: 'Đồng hồ bấm giây hoặc cổng quang + đồng hồ đếm', ids: ['stopwatch', 'photogateTimer'] }, { text: 'Thước mét', ids: ['ruler'] }],
  procedure: [
    { t: 'Đặt con lắc, dụng cụ đo thời gian và thước mét lên bàn.', done: (ws) => need(ws).length === 0 },
    { t: 'Chọn chiều dài L, đọc L trên thước; giữ biên độ nhỏ (≤ 10°).' },
    { t: 'Chọn số dao động N, nhấn «Thả và đo», rồi «Ghi số liệu».', done: (ws) => ws.state.rows.length >= 1 },
    { t: 'Thực hiện ít nhất 6 lần đo với các chiều dài khác nhau.', done: (ws) => ws.state.rows.length >= 6 },
    { t: 'Vẽ đồ thị T² – L, tính g = 4π²/hệ số góc; thử đổi biên độ để xem ảnh hưởng.' },
  ],
  predict: { q: 'Nếu tăng chiều dài con lắc đơn lên gấp 4 lần thì chu kỳ dao động nhỏ sẽ:', options: ['Tăng gấp đôi', 'Tăng gấp 4 lần', 'Không đổi', 'Giảm một nửa'], correct: 0, explain: 'T = 2π√(L/g) ∝ √L; L tăng 4 lần thì T tăng √4 = 2 lần.' },
  questions: [
    { q: 'Đồ thị nào là đường thẳng đi qua gốc tọa độ?', type: 'choice', options: ['T² theo L', 'T theo L', 'T theo 1/L', 'L theo T'], answer: 0, explain: 'T² = (4π²/g)·L nên T² tỉ lệ thuận với L.' },
    { q: 'Con lắc đơn dài 1,00 m ở nơi g = 9,81 m/s². Chu kỳ dao động nhỏ là bao nhiêu giây?', type: 'num', unit: 's', answer: 2.006, tol: 0.03, explain: 'T = 2π√(1/9,81) ≈ 2,006 s.' },
    { q: 'Vì sao nên đo thời gian của 10–20 dao động thay vì một dao động?', type: 'choice', options: ['Sai số bấm tay được chia cho N nên sai số tương đối của T nhỏ hơn', 'Con lắc dao động nhanh hơn', 'Chu kỳ phụ thuộc N', 'Để tăng biên độ'], answer: 0, explain: 'Sai số tuyệt đối của t gần như không đổi (~0,05 s) nên đo N dao động giảm sai số của T = t/N.' },
    { q: 'Khi biên độ tăng từ 5° lên 60°, chu kỳ của con lắc:', type: 'choice', options: ['Tăng lên (khoảng 7 %)', 'Giảm', 'Không đổi', 'Tăng gấp đôi'], answer: 0, explain: 'Dao động không còn điều hòa: T = T₀(1 + θ₀²/16 + …) ≈ 1,07·T₀ ở 60°.' },
  ],
  hints: ['L đo từ điểm treo tới tâm bi, không phải chiều dài sợi dây.', 'Hãy đo thời gian của 10 hoặc 20 dao động rồi chia cho N.', 'Giữ biên độ ≤ 10° khi vẽ T²–L; muốn xem ảnh hưởng của biên độ thì giữ L không đổi và đổi θ₀.'],
  conclusion: '<p>Chu kỳ con lắc đơn dao động nhỏ <i>T</i> = 2π√(<i>L</i>/<i>g</i>): <i>T</i>² tỉ lệ thuận với <i>L</i>, không phụ thuộc khối lượng bi. Hệ số góc của đồ thị <i>T</i>²–<i>L</i> bằng 4π²/<i>g</i>, nên <i>g</i> = 4π²/hệ số góc. Biên độ lớn làm chu kỳ dài hơn; đo nhiều dao động giúp giảm sai số ngẫu nhiên do thời gian phản xạ.</p>',
  minRows: 6,
};

const columns = [
  { key: 'L', label: 'Chiều dài (đọc thước)', symbol: 'L', unit: 'm', sig: 4 },
  { key: 'th0', label: 'Biên độ góc', symbol: 'θ₀', unit: '°', sig: 3 },
  { key: 'N', label: 'Số dao động đã đo', symbol: 'N', unit: '', sig: 3 },
  { key: 't', label: 'Thời gian N dao động', symbol: 't', unit: 's', sig: 5 },
  { key: 'T', label: 'Chu kỳ', symbol: 'T', unit: 's', sig: 5, calc: (v) => v.t / v.N, formula: 't / N' },
  { key: 'T2', label: 'Bình phương chu kỳ', symbol: 'T²', unit: 's²', sig: 5, calc: (v) => (v.t / v.N) ** 2, formula: 'T²' },
  { key: 'g', label: 'Gia tốc từ mỗi lần đo', symbol: 'g_i', unit: 'm/s²', sig: 4, calc: (v) => (4 * Math.PI ** 2 * v.L) / (v.t / v.N) ** 2, formula: '4π²·L / T²' },
];

export default {
  meta, kind: 'slots', columns,
  library: ['pendulum', 'stopwatch', 'photogateTimer', 'ruler', 'balance', 'ball'],
  reject: { ball: 'bi tự do không đủ: hãy dùng con lắc đơn (bi + dây) có sẵn điểm treo.', balance: 'chu kỳ con lắc đơn không phụ thuộc khối lượng bi.' },
  slots: {
    pend: { label: 'Con lắc đơn', accepts: ['pendulum'], rect: [400, 40, 140, 80] },
    timer: { label: 'Đồng hồ bấm giây / cổng quang', accepts: ['stopwatch', 'photogateTimer'], rect: [640, 40, 200, 90] },
    ruler: { label: 'Thước mét', accepts: ['ruler'], rect: [300, 50, 70, 300] },
  },
  settings: [
    { key: 'g', label: 'Gia tốc trọng trường', type: 'select', options: PLANETS, default: 9.81 },
    { key: 'N', label: 'Số dao động cần đo N', type: 'select', options: [1, 5, 10, 20, 30].map((v) => ({ v, label: `${v} dao động` })), default: 10 },
    { key: 'speed', label: 'Tốc độ mô phỏng', type: 'select', options: [{ v: 1, label: '1×' }, { v: 5, label: '5×' }, { v: 20, label: '20×' }], default: 5 },
  ],
  graphs: [{ label: 'T² – L  (hệ số góc = 4π²/g)', x: 'L', y: 'T2', origin: true }, { label: 'T – L', x: 'L', y: 'T', origin: true }, { label: 'T – θ₀', x: 'th0', y: 'T', origin: false }],
  liveParams: ['L'],
  init(ws) { ws.rt = { phase: 'idle', st: null }; const p = ws.slot('pend'); if (p) ws.rt.st = { th: (p.params.theta0 * Math.PI) / 180, om: 0 }; },
  onPlace(ws, id) { if (id === 'pendulum') { ws.rt.phase = 'idle'; ws.rt.st = { th: (ws.slot('pend').params.theta0 * Math.PI) / 180, om: 0 }; } },
  onRemove(ws) { ws.rt.phase = 'idle'; },
  onParam(ws, it, key) {
    if (ws.rt.phase === 'running') return 'Không thể đổi thông số khi con lắc đang dao động.';
    if (it.id === 'pendulum') { ws.rt.phase = 'idle'; ws.rt.reading = null; ws.rt.st = { th: (it.params.theta0 * Math.PI) / 180, om: 0 }; }
    return undefined;
  },
  onSetting(ws) { if (ws.rt.phase !== 'running') { ws.rt.phase = 'idle'; ws.rt.reading = null; } },
  status(ws) { const n = need(ws); if (ws.rt.phase === 'running') return { text: `Đang đếm dao động ${ws.rt.count}/${ws.setting('N')}…`, kind: 'ok' }; return n.length ? { text: `Cần đặt thêm: ${n.join(', ')}.`, kind: 'warn' } : { text: 'Đã lắp xong. Chọn L, N rồi nhấn «Thả và đo».', kind: 'ok' }; },
  readouts(ws) {
    const o = [], p = ws.slot('pend');
    if (p && ws.slot('ruler')) { const r = ws.read(INSTRUMENTS.ruler, p.params.L + (ws.mode === 'noisy' ? ws.hidden('Loff', (q) => q.range(-0.002, 0.002)) : 0), {}, 'ruler'); o.push({ label: 'Thước mét: chiều dài L', text: `${r.text} m` }); }
    if (ws.slot('timer')) o.push({ label: ws.slot('timer').id === 'stopwatch' ? 'Đồng hồ bấm giây' : 'Đồng hồ đếm (cổng quang)', text: ws.rt.reading ? `${ws.rt.reading.text} s` : '0.0000 s' });
    if (ws.rt.phase === 'running') o.push({ label: 'Số dao động đã đếm', text: `${ws.rt.count} / ${ws.setting('N')}` });
    return o;
  },
  controls(ws, el) {
    const ui = ws.rt.ui = {};
    ui.go = h('button', { class: 'btn', onClick: () => this.start(ws) }, '▶ Thả và đo');
    ui.rec = h('button', { class: 'btn accent', onClick: () => this.record(ws) }, 'Ghi số liệu');
    el.append(h('div', { class: 'btn-row' }, ui.go, ui.rec), h('p', { class: 'mute sm' }, 'Con lắc được thả từ biên độ cực đại, không vận tốc đầu.'));
    this.updateControls(ws);
  },
  updateControls(ws) { const ui = ws.rt.ui; if (!ui?.go?.isConnected) return; ui.go.disabled = ws.rt.phase === 'running'; ui.rec.disabled = !(ws.rt.reading && !ws.rt.recorded); },
  start(ws) {
    const n = need(ws); if (n.length) { ws.toast(`Chưa thể đo: thiếu ${n.join(', ')}.`, 'warn'); return; }
    if (!ws.requirePrediction()) return;
    const p = ws.slot('pend');
    Object.assign(ws.rt, { phase: 'running', st: { th: (p.params.theta0 * Math.PI) / 180, om: 0 }, t: 0, count: 0, reading: null, recorded: false, N: ws.setting('N') });
    ws.log(`Thả con lắc: L = ${p.params.L.toFixed(2)} m, θ₀ = ${p.params.theta0}°, đo ${ws.rt.N} dao động.`); ws.updateReadouts();
  },
  frame(ws, dt) {
    const rt = ws.rt; if (rt.phase !== 'running') return false;
    const p = ws.slot('pend'), g = gOf(ws), L = p.params.L, gm = gammaOf(ws);
    let remain = dt * (ws.setting('speed') || 1); const h2 = 0.002;
    while (remain > 0 && rt.phase === 'running') {
      const d = Math.min(h2, remain), nx = stepPendulum(rt.st, g, L, gm, d);
      if (rt.st.om > 0 && nx.om <= 0 && rt.t > 0) { rt.count++; if (rt.count >= rt.N) { const tt = rt.t + d * (rt.st.om / (rt.st.om - nx.om)); rt.st = nx; this.finish(ws, tt); break; } }
      rt.st = nx; rt.t += d; remain -= d;
    }
    return true;
  },
  finish(ws, tTrue) {
    const rt = ws.rt, tm = ws.slot('timer'); let t = tTrue;
    if (!ws.ideal) { if (tm.id === 'stopwatch') t += ws.noise.gauss(0, 0.05); else if (ws.mode === 'noisy') t += ws.hidden('rel', (r) => 0.001 + 0.002 * r.uniform()) + ws.noise.gauss(0, 0.0003); }
    const r = ws.read(INSTRUMENTS[tm.id], Math.max(0, t), {}, tm.id);
    rt.phase = 'idle'; rt.reading = { value: r.value, text: r.text, N: rt.N };
    ws.log(`Đồng hồ hiển thị ${r.text} s cho ${rt.N} dao động.`); ws.updateReadouts(); ws.bench.render();
  },
  record(ws) {
    const rt = ws.rt; if (!rt.reading || rt.recorded) return;
    const p = ws.slot('pend');
    const Lr = ws.read(INSTRUMENTS.ruler, p.params.L + (ws.mode === 'noisy' ? ws.hidden('Loff', (q) => q.range(-0.002, 0.002)) : 0), {}, 'ruler');
    ws.addRow({ L: Lr.value, th0: p.params.theta0, N: rt.reading.N, t: rt.reading.value }); rt.recorded = true; ws.updateReadouts();
  },
  background() { return `<rect width="900" height="420" fill="#101d28"/><rect y="400" width="900" height="20" fill="#16283a"/><rect x="${PX - 80}" y="${PY - 14}" width="160" height="10" rx="2" fill="#243a4c" stroke="#a9bcc8"/><rect x="${PX + 78}" y="0" width="12" height="400" fill="#243a4c" stroke="#5b7a8c"/>`; },
  draw(ws) {
    const p = ws.slot('pend'), ru = ws.slot('ruler'), tm = ws.slot('timer'); let s = '';
    if (ru) { s += `<rect x="330" y="${PY}" width="26" height="${SC * 1.25}" fill="#3a3020" stroke="#ffb454" stroke-width="1.2"/>`; for (let i = 0; i <= 120; i += 2) { const y = PY + (SC * i) / 100; s += `<path d="M330 ${y}h${i % 10 === 0 ? 12 : 6}" stroke="#ffb454" stroke-width="1"/>`; if (i % 10 === 0) s += `<text x="345" y="${y + 3}" font-size="8" fill="#ffb454">${(i / 100).toFixed(1)}</text>`; } }
    if (p) {
      const L = p.params.L, th = ws.rt.st ? ws.rt.st.th : (p.params.theta0 * Math.PI) / 180;
      const bx = PX + SC * L * Math.sin(th), by = PY + SC * L * Math.cos(th);
      s += `<path d="M${PX} ${PY}V${PY + SC * L}" stroke="#547083" stroke-dasharray="4 4"/>`;
      const t0 = (p.params.theta0 * Math.PI) / 180; s += `<path d="M${PX + 40 * Math.sin(0)} ${PY + 40}A40 40 0 0 1 ${PX + 40 * Math.sin(t0)} ${PY + 40 * Math.cos(t0)}" fill="none" stroke="#35d0ba" opacity=".6"/><text x="${PX + 14}" y="${PY + 62}" font-size="10" fill="#35d0ba">θ₀=${p.params.theta0}°</text>`;
      s += `<path d="M${PX} ${PY}L${bx} ${by}" stroke="#d6e6ef" stroke-width="1.4"/><circle cx="${PX}" cy="${PY}" r="3" fill="#d6e6ef"/><circle cx="${bx}" cy="${by}" r="12" fill="#7e97a8" stroke="#d6e6ef"/><path d="M${bx - 5} ${by - 4}a7 7 0 0 1 5-4" stroke="#fff" fill="none" opacity=".6"/>`;
      if (tm?.id === 'photogateTimer') s += `<path d="M${PX - 24} ${PY + SC * L + 18}v30M${PX + 24} ${PY + SC * L + 18}v30" stroke="#a9bcc8" stroke-width="6" stroke-linecap="round"/>`;
    }
    if (tm) { const gate = tm.id === 'photogateTimer'; s += `<rect x="660" y="46" width="170" height="60" rx="8" fill="#243a4c" stroke="#a9bcc8" stroke-width="1.8"/><rect x="672" y="56" width="146" height="30" rx="3" fill="#0e1a22" stroke="#35d0ba"/><text x="812" y="79" font-size="20" fill="#35d0ba" text-anchor="end" font-family="monospace">${ws.rt.reading ? ws.rt.reading.text : '0.0000'}</text><text x="745" y="98" font-size="9" fill="#d6e6ef" text-anchor="middle">${gate ? 'ĐỒNG HỒ ĐẾM · CỔNG QUANG' : 'ĐỒNG HỒ BẤM GIÂY (tay)'} (s)</text>`; }
    return s;
  },
  analyze(ws, { reveal }) {
    const items = [], notes = [], P = ws.pairs('L', 'T2'); if (P.length < 3) return { items, notes };
    const f = S.linreg(P.map((p) => p.x), P.map((p) => p.y)); if (!f) return { items, notes };
    const g = (4 * Math.PI ** 2) / f.slope, ug = g * (f.seSlope / f.slope), gt = gOf(ws);
    items.push({ label: 'g từ hệ số góc T²–L (g = 4π²/a)', value: `${S.fmtWithUnc(g, ug)} m/s²`, theory: true, ref: `${S.fmtSig(gt, 4)} m/s²`, err: `${S.fmtSig(S.pctError(g, gt), 2)} %`, calc: `g = 4π²/a = 39,478/${S.fmtSig(f.slope, 4)} = ${S.fmtSig(g, 4)} m/s².` });
    const gi = ws.colValues('g').filter((v) => v != null);
    if (gi.length >= 2) { const u = S.uncertainty(gi, 0); items.push({ label: 'g trung bình các lần đo', value: `${S.fmtWithUnc(u.mean, u.U)} m/s²`, theory: true, ref: `${S.fmtSig(gt, 4)} m/s²`, err: `${S.fmtSig(S.pctError(u.mean, gt), 2)} %` }); }
    items.push({ label: 'Tung độ gốc của T²–L (lý tưởng: 0)', value: `${S.fmtWithUnc(f.intercept, f.seIntercept)} s²`, theory: false });
    items.push({ label: 'Hệ số tương quan r', value: S.fmtSig(f.r, 6), theory: false });
    const big = ws.includedRows().some((r) => r.vals.th0 > 15); if (big) notes.push('Có lần đo với biên độ > 15°: T lớn hơn giá trị dao động nhỏ nên g tính ra bị thấp đi.');
    if (reveal && !ws.ideal) notes.push('Mô hình thực: lực cản làm biên độ giảm dần nhưng chu kỳ gần như không đổi; bấm tay có sai số ~0,05 s nên đo N dao động.');
    return { items, notes };
  },
};
