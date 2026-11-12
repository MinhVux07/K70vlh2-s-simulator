// Định luật II Newton: xe lăn + ròng rọc + giá treo, đo gia tốc bằng cảm biến chuyển động siêu âm.
import { h } from '../ui/dom.js';
import { INSTRUMENTS } from '../core/instruments.js';
import { cartPulley, derivative, PLANETS } from '../core/physics.js';
import * as S from '../core/stats.js';

export const K = 380, X0 = 170, D0 = 0.25, D_END = 0.80, CART_L = 0.18, PULLEY_X = 570, RAIL_Y = 110;
export const PULLEY = { m: 0.030, r: 0.025 }; // đĩa nhôm: I = ½·m·r²

/** Mô hình thuần túy của một lần chạy (dùng cho kiểm thử độc lập). */
export function newtonRun({ M, m, g, mu, ideal }) {
  const I = 0.5 * PULLEY.m * PULLEY.r ** 2;
  const r = cartPulley({ M, m, g, mu, pulleyI: I, pulleyR: PULLEY.r, ideal });
  const L = D_END - D0;
  return { ...r, tEnd: r.a > 0 ? Math.sqrt((2 * L) / r.a) : Infinity, Ieff: ideal ? 0 : I / PULLEY.r ** 2 };
}

const cartM0 = (ws) => ws.hidden('cartMass', (r) => Math.round((0.42 + 0.12 * r.uniform()) * 1e4) / 1e4);
const muK = (ws) => ws.hidden('mu', (r) => 0.015 + 0.02 * r.uniform());
export const hangerMass = (it) => 0.010 + 0.010 * (it?.params.discs ?? 0);
export const cartMass = (ws, it) => cartM0(ws) + 0.1 * (it?.params.blocks ?? 0) + 0.01 * (it?.params.discs ?? 0);

function missing(ws) {
  const out = [];
  if (!ws.slot('cart')) out.push('xe lăn'); if (!ws.slot('hanger')) out.push('giá treo + quả cân');
  if (!ws.slot('pulley')) out.push('ròng rọc'); if (!ws.slot('sensor')) out.push('cảm biến chuyển động');
  return out;
}
const dynParams = (ws) => {
  const c = ws.slot('cart'), hg = ws.slot('hanger');
  return { M: cartMass(ws, c), m: hangerMass(hg), g: ws.setting('g'), mu: muK(ws), ideal: ws.ideal };
};
const trueTotal = (ws, r) => {
  const M = cartM0(ws) + 0.1 * (r.vals.blk ?? 0) + 0.01 * (r.vals.dc ?? 0), m = 0.01 + 0.01 * (r.vals.dh ?? 0);
  return M + m + (ws.ideal ? 0 : PULLEY.m * PULLEY.r ** 2 / 2 / PULLEY.r ** 2);
};

function startRun(ws) {
  const rt = ws.rt;
  if (rt.phase === 'running') return;
  if (!ws.requirePrediction()) return;
  const miss = missing(ws);
  if (miss.length) { ws.toast(`Chưa thể chạy: còn thiếu ${miss.join(', ')}.`, 'warn', 5000); return; }
  const p = dynParams(ws), dyn = newtonRun(p);
  rt.result = null;
  if (!dyn.moving) {
    rt.phase = 'idle'; rt.d = D0; rt.t = 0;
    ws.toast('Xe không chuyển động: lực kéo (trọng lượng giá treo) nhỏ hơn lực ma sát nghỉ. Hãy thêm quả cân lên giá treo.', 'warn', 6000);
    ws.log('Chạy: xe đứng yên (lực kéo < ma sát nghỉ).'); ws.updateReadouts(); return;
  }
  Object.assign(rt, { phase: 'running', t: 0, d: D0, dyn, p, samples: { t: [], x: [] }, next: 0 });
  ws.log(`Bắt đầu chạy: vật treo ${p.m.toFixed(3)} kg (${ws.slot('hanger').params.discs} quả cân + giá), g = ${p.g} m/s².`);
  ws.updateReadouts();
}

function sampleAt(ws, t) {
  const rt = ws.rt, sp = INSTRUMENTS.motionSensor;
  const dTrue = D0 + 0.5 * rt.dyn.a * t * t;
  const rd = ws.read(sp, dTrue, ws.slot('sensor').params, 'motionSensor');
  rt.samples.t.push(Math.round(t * 1e6) / 1e6); rt.samples.x.push(rd.over ? NaN : rd.value);
}

function finish(ws) {
  const rt = ws.rt, { t, x } = rt.samples;
  const v = derivative(t, x), a = derivative(t, v);
  const ok = x.filter((q) => Number.isFinite(q)).length;
  const tt = [], xx = []; t.forEach((q, i) => { if (Number.isFinite(x[i])) { tt.push(q); xx.push(x[i]); } });
  const fit = S.polyfit2(tt, xx);
  rt.phase = 'done'; rt.d = D_END;
  const c = ws.slot('cart'), hg = ws.slot('hanger');
  let T = null;
  if (ws.slot('force')) { const r = ws.read(INSTRUMENTS.forceSensor, rt.dyn.Tcart, {}, 'forceSensor'); T = r.over ? null : r.value; }
  rt.result = fit ? { a: fit.a, seA: fit.seA, n: ok, T, dc: c.params.discs, dh: hg.params.discs, blk: c.params.blocks, tEnd: rt.dyn.tEnd, recorded: false } : null;
  const n = ws.state.runs.length + 1;
  ws.addRun({ label: `Lần ${n}`, series: { t, x, v, a }, meta: { dc: c.params.discs, dh: hg.params.discs, blk: c.params.blocks } });
  ws.log(rt.result ? `Kết thúc lần chạy: a = ${S.fmtSig(fit.a, 3)} m/s² (từ khớp parabol x(t), ${ok} điểm).` : 'Kết thúc lần chạy: không đủ điểm để khớp.');
  ws.bench.render(); ws.updateReadouts();
  if (ws.state.graph.mode === 'curve') ws.refreshBottom();
}

function record(ws) {
  const r = ws.rt.result; if (!r || r.recorded) return;
  const w = ws.state.x.weighed || {};
  const c = ws.slot('cart'), hg = ws.slot('hanger');
  const okC = w.cart != null && w.cartStamp === `${c.params.blocks}-${c.params.discs}`, okH = w.hanger != null && w.hangerStamp === `${hg.params.discs}`;
  ws.addRow({ dc: r.dc, dh: r.dh, blk: r.blk, a: r.a, ua: r.seA, Mtot: okC && okH ? w.cart + w.hanger : null, T: r.T });
  r.recorded = true; ws.updateReadouts();
}

function weigh(ws, what) {
  const bal = ws.slot('balance');
  if (!bal) { ws.toast('Hãy đặt cân điện tử lên bàn trước.', 'warn'); return; }
  const c = ws.slot('cart'), hg = ws.slot('hanger');
  const obj = what === 'cart' ? c : hg;
  if (!obj) { ws.toast(`Chưa có ${what === 'cart' ? 'xe lăn' : 'giá treo'} trên bàn.`, 'warn'); return; }
  const truth = what === 'cart' ? cartMass(ws, c) : hangerMass(hg);
  const r = ws.read(INSTRUMENTS.balance, truth, {}, 'balance');
  if (r.over) { ws.toast('Vượt quá giới hạn của cân.', 'warn'); return; }
  const x = ws.state.x; x.weighed ||= {};
  if (what === 'cart') { x.weighed.cart = r.value; x.weighed.cartStamp = `${c.params.blocks}-${c.params.discs}`; }
  else { x.weighed.hanger = r.value; x.weighed.hangerStamp = `${hg.params.discs}`; }
  x.weighed.last = r.value;
  ws.log(`Cân ${what === 'cart' ? 'xe (kèm khối tải/quả cân đang có)' : 'giá treo + quả cân'}: ${r.text} kg.`);
  ws.changed();
}

const meta = {
  id: 'newton2', lab: 'mech', topic: 'Động lực học', title: 'Định luật II Newton', level: 2, minutes: 35,
  tags: ['lực', 'gia tốc', 'khối lượng', 'ma sát', 'ròng rọc'],
  objective: ['Khảo sát mối quan hệ giữa lực tác dụng, khối lượng và gia tốc của một vật.', 'Xác định khối lượng của hệ từ hệ số góc của đồ thị F–a.', 'Nhận biết ảnh hưởng của ma sát và khối lượng ròng rọc đến kết quả đo.'],
  question: 'Gia tốc của xe phụ thuộc thế nào vào lực kéo và vào khối lượng của hệ chuyển động?',
  theory: `<p>Định luật II Newton: <i>a</i> = Σ<i>F</i>/<i>m</i>. Với xe (khối lượng <i>M</i>) nối qua ròng rọc nhẹ với vật treo (khối lượng <i>m</i>), bỏ qua ma sát:</p>
    <p class="eq"><i>m g</i> = (<i>M</i> + <i>m</i>)·<i>a</i> ⇒ <i>a</i> = <i>m g</i> / (<i>M</i> + <i>m</i>)</p>
    <p>Lực kéo gây gia tốc cho cả hệ là trọng lượng <i>F</i> = <i>m g</i> của vật treo, còn khối lượng cần gia tốc là <i>M</i> + <i>m</i>. Khi chuyển quả cân từ xe sang giá treo, tổng khối lượng không đổi còn <i>F</i> thay đổi.</p>
    <p>Trong thực tế có thêm ma sát (<i>μMg</i>) và quán tính quay của ròng rọc (<i>I/r²</i>): <i>F</i> = (<i>M</i> + <i>m</i> + <i>I/r²</i>)·<i>a</i> + <i>μMg</i>.</p>
    <p>Cảm biến ghi vị trí <i>x</i>(<i>t</i>). Với chuyển động biến đổi đều <i>x</i> = <i>x</i><sub>0</sub> + <i>v</i><sub>0</sub><i>t</i> + ½<i>a t</i>², gia tốc là hệ số bậc hai của đa thức khớp được.</p>`,
  apparatus: [
    { text: 'Xe lăn thí nghiệm', ids: ['cart'] }, { text: 'Giá treo và quả cân 10 g', ids: ['hanger'] }, { text: 'Ròng rọc', ids: ['pulley'] },
    { text: 'Cảm biến chuyển động siêu âm', ids: ['motionSensor'] }, { text: 'Cân điện tử', ids: ['balance'], optional: true },
    { text: 'Cảm biến lực', ids: ['forceSensor'], optional: true }, { text: 'Thước mét', ids: ['ruler'], optional: true },
  ],
  procedure: [
    { t: 'Chọn dụng cụ phù hợp: đặt xe lăn, giá treo, ròng rọc và cảm biến chuyển động lên bàn.', done: (ws) => ['cart', 'hanger', 'pulley', 'motionSensor'].every((i) => ws.has(i)) },
    { t: 'Đặt cân điện tử lên bàn và cân xe, cân giá treo để biết khối lượng thực.', done: (ws) => ws.state.x.weighed?.cart != null && ws.state.x.weighed?.hanger != null },
    { t: 'Giữ nguyên tổng số quả cân 10 g (trên xe + trên giá), chuyển dần quả cân từ xe sang giá treo để thay đổi lực kéo.' },
    { t: 'Nhấn «Chạy», quan sát chuyển động và nhấn «Ghi số liệu» sau mỗi lần chạy.', done: (ws) => ws.state.rows.length >= 1 },
    { t: 'Thực hiện ít nhất 5 lần đo với các lực kéo khác nhau.', done: (ws) => ws.state.rows.length >= 5 },
    { t: 'Vẽ đồ thị F–a, đọc hệ số góc và so sánh với khối lượng đo bằng cân.' },
    { t: 'Giữ lực kéo không đổi, thay đổi khối lượng xe bằng khối tải 100 g và khảo sát a theo 1/M.' },
  ],
  predict: {
    q: 'Giữ nguyên tổng khối lượng của hệ. Nếu tăng lực kéo lên gấp đôi thì gia tốc của xe sẽ như thế nào?',
    options: ['Tăng gấp đôi', 'Tăng gấp bốn', 'Không đổi', 'Giảm một nửa'], correct: 0,
    explain: 'Theo định luật II Newton a = F/m: khối lượng không đổi thì gia tốc tỉ lệ thuận với lực.',
  },
  questions: [
    { q: 'Giữ tổng khối lượng không đổi, đồ thị gia tốc theo lực kéo có dạng nào?', type: 'choice', options: ['Đường thẳng đi lên (tỉ lệ thuận)', 'Đường hyperbol', 'Đường nằm ngang', 'Parabol'], answer: 0, explain: 'a = F/(M+m): a tỉ lệ thuận với F, đồ thị là đường thẳng.' },
    { q: 'Hệ số góc của đồ thị F–a (F theo trục tung) có ý nghĩa vật lý gì?', type: 'choice', options: ['Khối lượng của toàn hệ chuyển động', 'Gia tốc trọng trường', 'Hệ số ma sát', 'Vận tốc cực đại'], answer: 0, hint: 'F = m·a, nên F/a là gì?', explain: 'F = (M+m)·a nên hệ số góc dF/da chính là khối lượng cần gia tốc (cộng khối lượng quy đổi I/r² của ròng rọc).' },
    { q: 'Lực kéo 0,2 N tác dụng lên hệ có khối lượng tổng 0,5 kg (bỏ qua ma sát). Gia tốc là bao nhiêu?', type: 'num', unit: 'm/s²', answer: 0.4, tol: 0.02, explain: 'a = F/m = 0,2/0,5 = 0,4 m/s².' },
    { q: 'Vì sao đường thẳng F–a thực nghiệm cắt trục F tại một giá trị dương thay vì đi qua gốc tọa độ?', type: 'choice', options: ['Lực ma sát cản chuyển động', 'Cảm biến bị lệch zero', 'Gia tốc trọng trường thay đổi', 'Khối lượng xe giảm khi chạy'], answer: 0, explain: 'Một phần lực kéo phải thắng ma sát μMg trước khi gây gia tốc: F = (M+m+I/r²)a + μMg, nên tung độ gốc ≈ μMg > 0.' },
  ],
  hints: [
    'Lực kéo xe là trọng lượng của giá treo và các quả cân trên giá: F = m_treo · g.',
    'Để đồ thị F–a có hệ số góc không đổi, tổng khối lượng chuyển động (xe + giá + quả cân) phải không đổi: hãy chuyển quả cân từ xe sang giá treo, đừng thêm quả cân mới.',
    'Cân xe và giá treo ngay sau khi chọn cấu hình, rồi mới nhấn «Ghi số liệu» để bảng có cột khối lượng tổng.',
    'Nếu xe không chuyển động, lực kéo nhỏ hơn ma sát nghỉ. Thêm quả cân lên giá treo.',
  ],
  conclusion: `<p>Với tổng khối lượng không đổi, gia tốc tỉ lệ thuận với lực kéo: <i>a</i> ∝ <i>F</i>. Hệ số góc của đồ thị <i>F</i>–<i>a</i> bằng khối lượng quán tính của hệ (xe + giá treo + quả cân, cộng thêm khối lượng quy đổi của ròng rọc ~ <i>I/r²</i>). Khi giữ lực không đổi, <i>a</i> tỉ lệ nghịch với khối lượng.</p>
    <p>Tung độ gốc dương của đường <i>F</i>–<i>a</i> cho biết lực ma sát <i>μMg</i>; hệ số góc lớn hơn khối lượng đo bằng cân một chút do quán tính quay của ròng rọc. Hai hiệu ứng này biến mất khi chuyển sang mô hình lý tưởng.</p>`,
  minRows: 5,
};

const cols = [
  { key: 'dc', label: 'Số quả cân 10 g trên xe', symbol: 'n_xe', unit: 'quả', sig: 3 },
  { key: 'dh', label: 'Số quả cân 10 g trên giá treo', symbol: 'n_giá', unit: 'quả', sig: 3 },
  { key: 'blk', label: 'Số khối tải 100 g', symbol: 'n_khối', unit: 'khối', sig: 3 },
  { key: 'mh', label: 'Khối lượng vật treo', symbol: 'm', unit: 'kg', sig: 4, calc: (v) => 0.010 + 0.010 * v.dh, formula: '0,010 + 0,010 · n_giá' },
  { key: 'F', label: 'Lực kéo (trọng lượng vật treo)', symbol: 'F', unit: 'N', sig: 4, calc: (v, ws) => (0.010 + 0.010 * v.dh) * ws.setting('g'), formula: 'm · g' },
  { key: 'a', label: 'Gia tốc đo được', symbol: 'a', unit: 'm/s²', sig: 4 },
  { key: 'ua', label: 'Sai số chuẩn của a (khớp)', symbol: 'u(a)', unit: 'm/s²', sig: 2 },
  { key: 'Mtot', label: 'Khối lượng xe + giá treo (cân)', symbol: 'M+m', unit: 'kg', sig: 4 },
  { key: 'invM', label: 'Nghịch đảo khối lượng', symbol: '1/(M+m)', unit: 'kg⁻¹', sig: 4, calc: (v) => (v.Mtot > 0 ? 1 / v.Mtot : NaN), formula: '1 / (M+m)' },
  { key: 'T', label: 'Lực căng dây (cảm biến lực)', symbol: 'T', unit: 'N', sig: 3 },
];

function fitInfo(ws) {
  const P = ws.pairs('a', 'F');
  return P.length >= 3 ? S.linreg(P.map((p) => p.x), P.map((p) => p.y)) : null;
}

export default {
  meta, kind: 'slots', columns: cols,
  library: ['ruler', 'balance', 'cart', 'hanger', 'pulley', 'motionSensor', 'forceSensor', 'stopwatch', 'photogateTimer', 'ball'],
  reject: {
    stopwatch: 'bấm tay có sai số phản xạ ~0,05 s, quá lớn so với thời gian chạy ~1–2 s; dùng cảm biến chuyển động để có x(t).',
    photogateTimer: 'cổng quang chỉ cho một mốc thời gian; thí nghiệm này cần ghi liên tục vị trí theo thời gian.',
    ball: 'vật rơi không dùng trong thí nghiệm xe lăn – xem thí nghiệm «Rơi tự do».',
  },
  slots: {
    sensor: { label: 'CB chuyển động', accepts: ['motionSensor'], rect: [80, 56, 100, 60] },
    cart: { label: 'Xe lăn', accepts: ['cart'], rect: [240, 50, 130, 60] },
    force: { label: 'CB lực (nối tiếp dây)', accepts: ['forceSensor'], rect: [380, 14, 170, 36] },
    pulley: { label: 'Ròng rọc', accepts: ['pulley'], rect: [535, 50, 70, 90] },
    hanger: { label: 'Giá treo + quả cân', accepts: ['hanger'], rect: [612, 128, 150, 100] },
    ruler: { label: 'Thước mét', accepts: ['ruler'], rect: [150, 140, 430, 26] },
    balance: { label: 'Cân điện tử', accepts: ['balance'], rect: [690, 300, 190, 90] },
  },
  settings: [
    { key: 'g', label: 'Gia tốc trọng trường', type: 'select', options: PLANETS, default: 9.81 },
    { key: 'speed', label: 'Tốc độ hoạt ảnh', type: 'select', options: [{ v: 1, label: '1× (thời gian thực)' }, { v: 0.5, label: '0,5×' }, { v: 0.25, label: '0,25× (chậm)' }], default: 1 },
  ],
  graphs: [
    { label: 'F – a  (hệ số góc = khối lượng)', x: 'a', y: 'F' },
    { label: 'a – 1/(M+m)  (lực không đổi)', x: 'invM', y: 'a' },
    { label: 'a – F', x: 'F', y: 'a' },
  ],
  curves: [{ key: 'x', label: 'x – t (vị trí)', yLabel: 'x (m)' }, { key: 'v', label: 'v – t (vận tốc)', yLabel: 'v (m/s)' }, { key: 'a', label: 'a – t (gia tốc)', yLabel: 'a (m/s²)' }],

  init(ws) { ws.rt = { phase: 'idle', t: 0, d: D0, result: null }; },
  onPlace(ws) { if (ws.rt.phase !== 'running') { ws.rt.phase = 'idle'; ws.rt.d = D0; } },
  onRemove(ws) { if (ws.rt.phase === 'running') { ws.rt.phase = 'idle'; ws.rt.d = D0; ws.toast('Đã dừng lần chạy do gỡ dụng cụ.', 'warn'); } },
  onParam(ws, it, key) {
    if (ws.rt.phase === 'running') return 'Không thể thay đổi thông số khi xe đang chạy.';
    if (key === 'discs' || key === 'blocks') {
      const c = ws.slot('cart'), hg = ws.slot('hanger');
      if ((c?.params.discs || 0) + (hg?.params.discs || 0) > 20) return 'Chỉ có 20 quả cân 10 g: tổng số quả cân trên xe và trên giá treo không được vượt quá 20.';
      if (ws.rt.phase === 'done') { ws.rt.phase = 'idle'; ws.rt.d = D0; }
    }
    return undefined;
  },
  onMode(ws) { if (ws.rt.phase !== 'running') { ws.rt.phase = 'idle'; ws.rt.d = D0; } },

  status(ws) {
    const miss = missing(ws);
    if (ws.rt.phase === 'running') return { text: 'Đang chạy…', kind: 'ok' };
    if (miss.length) return { text: `Cần đặt thêm: ${miss.join(', ')}.`, kind: 'warn' };
    return { text: 'Đã lắp xong. Nhấn «Chạy» để thả xe.', kind: 'ok' };
  },

  readouts(ws) {
    const out = [], rt = ws.rt, d = rt.d ?? D0;
    if (ws.slot('sensor')) { const r = ws.read(INSTRUMENTS.motionSensor, d, ws.slot('sensor').params, 'motionSensor'); out.push({ label: 'CB chuyển động: khoảng cách xe', text: `${r.text} m`, warn: r.over }); }
    if (ws.slot('ruler')) { const r = ws.read(INSTRUMENTS.ruler, d, {}, 'ruler'); out.push({ label: 'Thước: khoảng cách xe – cảm biến', text: `${r.text} m` }); }
    if (ws.slot('force')) { const T = rt.phase === 'running' ? rt.dyn.Tcart : 0; const r = ws.read(INSTRUMENTS.forceSensor, T, {}, 'forceSensor'); out.push({ label: 'CB lực: lực căng dây', text: `${r.text} N` }); }
    if (ws.slot('balance')) { const w = ws.state.x.weighed || {}; out.push({ label: 'Cân: xe (lần cân gần nhất)', text: w.cart != null ? `${w.cart.toFixed(4)} kg` : '—' }); out.push({ label: 'Cân: giá treo + quả cân', text: w.hanger != null ? `${w.hanger.toFixed(4)} kg` : '—' }); }
    if (rt.result) out.push({ label: 'Gia tốc lần chạy vừa rồi', text: `${S.fmtWithUnc(rt.result.a, rt.result.seA)} m/s²` });
    return out;
  },

  controls(ws, el) {
    const ui = ws.rt.ui = {};
    ui.run = h('button', { class: 'btn', onClick: () => startRun(ws) }, '▶ Chạy');
    ui.reset = h('button', { class: 'btn ghost', onClick: () => { if (ws.rt.phase === 'running') return; ws.rt.phase = 'idle'; ws.rt.d = D0; ws.bench.render(); ws.updateReadouts(); } }, '⟲ Đưa xe về đầu');
    ui.rec = h('button', { class: 'btn accent', onClick: () => record(ws) }, 'Ghi số liệu');
    el.append(h('div', { class: 'btn-row' }, ui.run, ui.reset), h('div', { class: 'btn-row' }, ui.rec));
    if (ws.slot('balance')) {
      el.append(h('div', { class: 'btn-row' }, h('button', { class: 'btn ghost', onClick: () => weigh(ws, 'cart') }, 'Cân xe'), h('button', { class: 'btn ghost', onClick: () => weigh(ws, 'hanger') }, 'Cân giá treo')));
    }
    el.append(h('p', { class: 'mute sm' }, 'Tổng số quả cân 10 g trên xe và trên giá treo tối đa là 20. Khối lượng xe không được ghi sẵn – hãy dùng cân.'));
    this.updateControls(ws);
  },
  updateControls(ws) {
    const ui = ws.rt.ui; if (!ui || !ui.run?.isConnected) return;
    ui.run.disabled = ws.rt.phase === 'running';
    ui.reset.disabled = ws.rt.phase === 'running';
    ui.rec.disabled = !(ws.rt.result && !ws.rt.result.recorded);
    ui.rec.textContent = ws.rt.result?.recorded ? 'Đã ghi lần này' : 'Ghi số liệu';
  },

  frame(ws, dt) {
    const rt = ws.rt;
    if (rt.phase !== 'running') return false;
    const sp = ws.setting('speed') || 1;
    rt.t += dt * sp;
    const rate = ws.slot('sensor')?.params.rate || 50;
    const tEnd = rt.dyn.tEnd;
    while (rt.next <= Math.min(rt.t, tEnd) + 1e-9) { sampleAt(ws, rt.next); rt.next += 1 / rate; }
    rt.d = D0 + 0.5 * rt.dyn.a * Math.min(rt.t, tEnd) ** 2;
    if (rt.t >= tEnd) { finish(ws); return true; }
    return true;
  },

  background() {
    let s = `<rect width="900" height="420" fill="#101d28"/><rect y="400" width="900" height="20" fill="#16283a"/><path d="M0 400H900" stroke="#27455a"/>`;
    s += `<g stroke="#5b7a8c" fill="#243a4c"><rect x="196" y="120" width="14" height="280" rx="2"/><rect x="520" y="120" width="14" height="280" rx="2"/><rect x="180" y="396" width="46" height="6" rx="2"/><rect x="504" y="396" width="46" height="6" rx="2"/></g>`;
    s += `<rect x="140" y="${RAIL_Y}" width="470" height="10" rx="2" fill="#9fb4c2" stroke="#d6e6ef" stroke-width=".8"/>`;
    s += `<text x="150" y="102" font-size="10" fill="#547083">ĐƯỜNG RAY</text>`;
    return s;
  },

  draw(ws) {
    const rt = ws.rt, d = rt.d ?? D0;
    const cart = ws.slot('cart'), hg = ws.slot('hanger'), pu = ws.slot('pulley'), ms = ws.slot('sensor'), fs = ws.slot('force'), bal = ws.slot('balance'), ru = ws.slot('ruler');
    const xc = X0 + K * d;
    let s = '';
    if (ru) {
      s += `<rect x="${X0}" y="122" width="${K}" height="22" fill="#3a3020" stroke="#ffb454" stroke-width="1.2"/>`;
      for (let i = 0; i <= 20; i++) { const x = X0 + (K * i) / 20; s += `<path d="M${x} 122v${i % 2 ? 6 : 11}" stroke="#ffb454" stroke-width="1"/>`; if (i % 2 === 0) s += `<text x="${x}" y="141" font-size="8" fill="#ffb454" text-anchor="middle">${(i / 20).toFixed(1)}</text>`; }
    }
    if (ms) {
      const live = ws.read(INSTRUMENTS.motionSensor, d, ms.params, 'motionSensor');
      s += `<rect x="92" y="64" width="62" height="44" rx="5" fill="#243a4c" stroke="#a9bcc8" stroke-width="1.6"/><circle cx="146" cy="86" r="14" fill="#0e1a22" stroke="#35d0ba" stroke-width="1.6"/><circle cx="146" cy="86" r="6" fill="#35d0ba" opacity=".35"/>`;
      s += `<text x="123" y="56" font-size="10" fill="#35d0ba" text-anchor="middle" font-family="monospace">${live.text} m</text>`;
      if (rt.phase === 'running') { const ph = (rt.t * 6) % 1; for (let i = 0; i < 3; i++) { const r = 18 + ((i + ph) % 3) * 22; s += `<path d="M${146 + r * 0.5} ${86 - r * 0.6}A${r} ${r} 0 0 1 ${146 + r * 0.5} ${86 + r * 0.6}" stroke="#35d0ba" fill="none" opacity="${0.7 - i * 0.2}"/>`; } }
    }
    if (cart) {
      const blk = cart.params.blocks, dc = cart.params.discs, bx = xc, w = CART_L * K;
      s += `<circle cx="${bx + 14}" cy="104" r="6.5" fill="#0e1a22" stroke="#d6e6ef" stroke-width="1.5"/><circle cx="${bx + w - 14}" cy="104" r="6.5" fill="#0e1a22" stroke="#d6e6ef" stroke-width="1.5"/>`;
      s += `<rect x="${bx}" y="70" width="${w}" height="30" rx="4" fill="#17463f" stroke="#35d0ba" stroke-width="1.8"/>`;
      for (let i = 0; i < blk; i++) s += `<rect x="${bx + 6}" y="${70 - 13 * (i + 1)}" width="${w - 12}" height="12" rx="2" fill="#4a5f6f" stroke="#a9bcc8"/><text x="${bx + w / 2}" y="${70 - 13 * i - 3}" font-size="8" fill="#d6e6ef" text-anchor="middle">100 g</text>`;
      const base = 70 - 13 * blk;
      for (let i = 0; i < dc; i++) s += `<rect x="${bx + 14}" y="${base - 3 * (i + 1)}" width="${w - 28}" height="2.4" fill="#ffb454"/>`;
      if (dc) s += `<text x="${bx + w / 2}" y="${base - 3 * dc - 3}" font-size="8" fill="#ffb454" text-anchor="middle">${dc}×10 g</text>`;
      s += `<text x="${bx + w / 2}" y="89" font-size="10" fill="#d6e6ef" text-anchor="middle">XE</text>`;
      // dây
      let sx = bx + w;
      if (fs) {
        const fl = ws.read(INSTRUMENTS.forceSensor, rt.phase === 'running' ? rt.dyn.Tcart : 0, {}, 'forceSensor');
        s += `<rect x="${sx}" y="76" width="34" height="16" rx="3" fill="#243a4c" stroke="#a9bcc8"/><text x="${sx + 17}" y="87" font-size="7.5" fill="#35d0ba" text-anchor="middle" font-family="monospace">${fl.text}N</text>`;
        sx += 34;
      }
      if (pu) s += `<path d="M${sx} 84H${PULLEY_X}" stroke="#e8d9b0" stroke-width="1.4"/>`;
      else s += `<path d="M${sx} 84h26" stroke="#e8d9b0" stroke-width="1.4" stroke-dasharray="3 3"/>`;
    }
    if (pu) {
      const ang = ((d - D0) * K / 20) * (180 / Math.PI);
      s += `<g transform="translate(${PULLEY_X} 104)"><path d="M0 20V50M-20 0H-34" stroke="#5b7a8c" stroke-width="3"/><g transform="rotate(${ang.toFixed(1)})"><circle r="20" fill="#243a4c" stroke="#a9bcc8" stroke-width="2"/><path d="M-20 0H20M0 -20V20M-14 -14L14 14M14 -14L-14 14" stroke="#547083"/></g><circle r="4" fill="#d6e6ef"/></g>`;
      if (hg) {
        const yh = 130 + (d - D0) * K;
        s += `<path d="M${PULLEY_X + 20} 104V${yh}" stroke="#e8d9b0" stroke-width="1.4"/>`;
      }
    }
    if (hg) {
      const yh = 130 + (d - D0) * K, n = hg.params.discs, hx = PULLEY_X + 20;
      s += `<path d="M${hx - 12} ${yh}h24l-4 8h-16z" fill="#243a4c" stroke="#a9bcc8"/>`;
      for (let i = 0; i < n; i++) s += `<rect x="${hx - 14}" y="${yh + 9 + 3.6 * i}" width="28" height="3" fill="#ffb454"/>`;
      s += `<text x="${hx + 22}" y="${yh + 18}" font-size="10" fill="#ffb454">${n}×10 g + giá</text>`;
    }
    if (bal) {
      const w = ws.state.x.weighed || {};
      const txt = w.last ?? null;
      s += `<rect x="700" y="346" width="170" height="40" rx="6" fill="#243a4c" stroke="#a9bcc8" stroke-width="1.6"/><rect x="750" y="322" width="70" height="8" rx="3" fill="#a9bcc8"/><rect x="778" y="330" width="14" height="16" fill="#547083"/><rect x="714" y="354" width="86" height="24" rx="3" fill="#0e1a22" stroke="#35d0ba"/><text x="793" y="371" font-size="14" text-anchor="end" fill="#35d0ba" font-family="monospace">${txt != null ? txt.toFixed(4) : '0.0000'}</text><text x="830" y="372" font-size="9" fill="#d6e6ef">kg</text>`;
    }
    if (!cart && !hg && !pu && !ms) s += `<text x="450" y="260" text-anchor="middle" fill="#547083" font-size="14">Chọn dụng cụ phù hợp từ thư viện bên trái và thả vào các khe trên bàn</text>`;
    return s;
  },

  analyze(ws, { reveal }) {
    const items = [], notes = [], f = fitInfo(ws), inc = ws.includedRows();
    if (!f) return { items, notes };
    const g = ws.setting('g');
    const Mt = inc.map((r) => trueTotal(ws, r)), Mbal = ws.colValues('Mtot').filter((v) => v != null);
    const mTh = S.mean(Mt);
    const mBal = Mbal.length ? S.mean(Mbal) : null;
    items.push({ label: 'Hệ số góc F–a (khối lượng hệ M+m)', value: `${S.fmtWithUnc(f.slope, f.seSlope)} kg`, theory: true, ref: `${S.fmtSig(mTh, 4)} kg (M+m${ws.ideal ? '' : ' + I/r²'})`, err: `${S.fmtSig(S.pctError(f.slope, mTh), 2)} %`, calc: `Hệ số góc a = ${S.fmtWithUnc(f.slope, f.seSlope)} kg (hồi quy tuyến tính ${f.n} điểm, r = ${S.fmtSig(f.r, 4)}).` });
    if (mBal != null) items.push({ label: 'Khối lượng xe + giá treo đo bằng cân', value: `${S.fmtSig(mBal, 4)} kg`, theory: false, ref: `hệ số góc − cân = ${S.fmtSig(f.slope - mBal, 2)} kg`, err: `${S.fmtSig(S.pctError(f.slope, mBal), 2)} %` });
    const muMg = muK(ws) * cartM0(ws) * g;
    items.push({ label: 'Tung độ gốc F₀ (lực ma sát ≈ μMg)', value: `${S.fmtWithUnc(f.intercept, f.seIntercept)} N`, theory: true, ref: ws.ideal ? '0 N (không ma sát)' : `${S.fmtSig(muMg, 3)} N`, err: ws.ideal ? `${S.fmtSig(Math.abs(f.intercept), 2)} N` : `${S.fmtSig(Math.abs(f.intercept - muMg), 2)} N` });
    items.push({ label: 'Hệ số tương quan r', value: S.fmtSig(f.r, 5), theory: false, ref: '→ 1 nếu F ∝ a', err: null });
    const Fv = ws.colValues('F').filter((v) => v != null), Mv = Mbal;
    if (Mv.length >= 3 && S.sd(Fv) / S.mean(Fv) < 0.05 && S.sd(Mv) / S.mean(Mv) > 0.1) {
      const P = ws.pairs('invM', 'a'); const f2 = P.length >= 3 ? S.linreg(P.map((p) => p.x), P.map((p) => p.y)) : null;
      if (f2) items.push({ label: 'Hệ số góc a – 1/(M+m) (lực kéo F)', value: `${S.fmtWithUnc(f2.slope, f2.seSlope)} N`, theory: true, ref: `${S.fmtSig(S.mean(Fv), 4)} N (m·g)`, err: `${S.fmtSig(S.pctError(f2.slope, S.mean(Fv)), 2)} %` });
    }
    if (reveal && !ws.ideal) notes.push('Mô hình thực: hệ số góc lớn hơn khối lượng đo bằng cân một lượng ≈ I/r² (quán tính quay của ròng rọc); tung độ gốc dương phản ánh ma sát.');
    return { items, notes };
  },
};
