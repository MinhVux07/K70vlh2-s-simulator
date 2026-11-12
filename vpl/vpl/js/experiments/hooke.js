// Lực đàn hồi và định luật Hooke: lò xo treo thẳng đứng, thêm quả cân, đọc chiều dài bằng thước mét.
import { h } from '../ui/dom.js';
import { INSTRUMENTS } from '../core/instruments.js';
import { PLANETS } from '../core/physics.js';
import * as S from '../core/stats.js';

const SC = 900, TOP = 40; // px/m, toạ độ y của điểm treo
export const springK = (ws) => ws.hidden('k', (r) => Math.round((15 + 15 * r.uniform()) * 100) / 100); // N/m
export const springL0 = (ws) => ws.hidden('L0', (r) => Math.round((0.12 + 0.06 * r.uniform()) * 1e4) / 1e4); // m
export const hangMass = (it) => 0.010 + 0.010 * (it?.params.discs ?? 0);

/** Độ dãn cân bằng. Mô hình thực: vượt giới hạn đàn hồi (dãn > 8 cm) lò xo mềm đi, k giảm còn ~45 %. */
export function extension(F, k, ideal) {
  if (ideal) return F / k;
  const Fl = k * 0.08;
  return F <= Fl ? F / k : Fl / k + (F - Fl) / (0.45 * k);
}
/** Chiều dài tức thời: dao động tắt dần quanh vị trí cân bằng sau khi đổi tải. */
export const lengthAt = (L0, x, t, ideal) => L0 + (ideal ? x : x * (1 - Math.exp(-t / 0.5) * Math.cos((2 * Math.PI * t) / 0.7)));

const need = (ws) => [['spring', 'lò xo'], ['hanger', 'giá treo + quả cân'], ['ruler', 'thước mét']].filter(([k]) => !ws.slot(k)).map(([, n]) => n);
const eq = (ws) => { const hg = ws.slot('hanger'); return hg ? extension(hangMass(hg) * ws.setting('g'), springK(ws), ws.ideal) : 0; };
export const curL = (ws) => lengthAt(springL0(ws), eq(ws), ws.rt.t, ws.ideal);

const meta = {
  id: 'hooke', lab: 'mech', topic: 'Động lực học', title: 'Lực đàn hồi và định luật Hooke', level: 1, minutes: 20,
  tags: ['lò xo', 'độ cứng', 'hooke', 'lực đàn hồi', 'giới hạn đàn hồi'],
  covers: ['Lực đàn hồi và định luật Hooke'],
  objective: ['Khảo sát quan hệ giữa lực kéo và độ dãn của lò xo.', 'Xác định độ cứng k và chiều dài tự nhiên L₀ từ đồ thị F–L.', 'Nhận biết giới hạn đàn hồi qua sự lệch khỏi đường thẳng.'],
  question: 'Lực đàn hồi của lò xo phụ thuộc thế nào vào độ biến dạng, và độ cứng của lò xo này bằng bao nhiêu?',
  theory: `<p>Trong giới hạn đàn hồi, lực đàn hồi tỉ lệ với độ biến dạng: <i>F</i> = <i>k</i>·|Δ<i>l</i>| (định luật Hooke), <i>k</i> là độ cứng (N/m).</p>
    <p>Khi vật treo cân bằng: <i>k</i>(<i>L</i> − <i>L</i><sub>0</sub>) = <i>m g</i>, nên <i>F</i> = <i>k</i>·<i>L</i> − <i>k</i>·<i>L</i><sub>0</sub>. Đồ thị <i>F</i> theo <i>L</i> là đường thẳng có hệ số góc <i>k</i> và <b>giao điểm với trục <i>L</i> chính là <i>L</i><sub>0</sub></b> – bạn không cần đo trực tiếp lò xo khi không treo vật.</p>
    <p>Vượt giới hạn đàn hồi, lò xo biến dạng vĩnh viễn và đồ thị cong đi.</p>`,
  apparatus: [{ text: 'Lò xo', ids: ['spring'] }, { text: 'Giá treo và quả cân 10 g', ids: ['hanger'] }, { text: 'Thước mét', ids: ['ruler'] }, { text: 'Cân điện tử', ids: ['balance'], optional: true }],
  procedure: [
    { t: 'Lắp lò xo, giá treo (kèm quả cân) và thước mét lên bàn.', done: (ws) => need(ws).length === 0 },
    { t: 'Thêm từng quả cân, chờ lò xo ngừng dao động rồi đọc chiều dài trên thước.' },
    { t: 'Nhấn «Ghi số liệu» cho mỗi lần thêm quả cân.', done: (ws) => ws.state.rows.length >= 1 },
    { t: 'Thực hiện ít nhất 6 lần đo với số quả cân tăng dần (có thể vượt cả giới hạn đàn hồi).', done: (ws) => ws.state.rows.length >= 6 },
    { t: 'Vẽ đồ thị F–L, đọc hệ số góc k và giao điểm với trục L.' },
  ],
  predict: { q: 'Treo vật nặng gấp đôi vào cùng một lò xo (trong giới hạn đàn hồi), độ dãn của lò xo sẽ:', options: ['Tăng gấp đôi', 'Tăng gấp bốn', 'Không đổi', 'Tăng thêm một lượng cố định'], correct: 0, explain: 'F = k·Δl nên Δl tỉ lệ thuận với F, tức tỉ lệ thuận với khối lượng vật treo.' },
  questions: [
    { q: 'Hệ số góc của đồ thị F theo chiều dài L của lò xo là:', type: 'choice', options: ['Độ cứng k của lò xo', 'Chiều dài tự nhiên L₀', 'Gia tốc trọng trường g', 'Khối lượng của lò xo'], answer: 0, explain: 'F = k(L − L₀): hệ số góc là k.' },
    { q: 'Lò xo k = 20 N/m treo vật 0,15 kg (g = 9,8 m/s²). Độ dãn là bao nhiêu cm?', type: 'num', unit: 'cm', answer: 7.35, tol: 0.3, explain: 'Δl = mg/k = 0,15·9,8/20 = 0,0735 m = 7,35 cm.' },
    { q: 'Đồ thị F–L ở các tải lớn cong đi (độ dốc giảm). Điều đó cho thấy:', type: 'choice', options: ['Đã vượt giới hạn đàn hồi, lò xo biến dạng vĩnh viễn', 'Thước đo bị hỏng', 'g thay đổi theo tải', 'Khối lượng quả cân tăng'], answer: 0, explain: 'Ngoài giới hạn đàn hồi, định luật Hooke không còn đúng; lò xo mềm đi và không trở lại chiều dài ban đầu.' },
    { q: 'Vì sao phải chờ lò xo ngừng dao động trước khi đọc chiều dài?', type: 'choice', options: ['Khi dao động, chiều dài tức thời khác chiều dài cân bằng', 'Lò xo chưa nóng', 'Thước cần thời gian ổn định', 'Không cần chờ'], answer: 0, explain: 'Định luật Hooke áp dụng cho trạng thái cân bằng (hợp lực bằng 0).' },
  ],
  hints: ['Lực kéo lò xo là trọng lượng của giá treo và các quả cân: F = m·g, với m = 0,010 + 0,010·n.', 'Dùng đồ thị mẫu «F – L»; giao điểm với trục L (trục hoành) là chiều dài tự nhiên.', 'Nếu các điểm cuối lệch khỏi đường thẳng, hãy bỏ chúng (bỏ chọn «Dùng») để tính k trong giới hạn đàn hồi.'],
  conclusion: '<p>Trong giới hạn đàn hồi, lực đàn hồi tỉ lệ thuận với độ biến dạng: <i>F</i> = <i>k</i>Δ<i>l</i>. Hệ số góc đồ thị <i>F</i>–<i>L</i> là độ cứng <i>k</i>, giao điểm với trục <i>L</i> là chiều dài tự nhiên <i>L</i><sub>0</sub>. Vượt giới hạn đàn hồi, đồ thị cong đi vì lò xo biến dạng vĩnh viễn nên không dùng được định luật Hooke.</p>',
  minRows: 6,
};

const columns = [
  { key: 'dh', label: 'Số quả cân 10 g trên giá', symbol: 'n', unit: 'quả', sig: 3 },
  { key: 'm', label: 'Khối lượng vật treo (giá + quả cân)', symbol: 'm', unit: 'kg', sig: 4, calc: (v) => 0.010 + 0.010 * v.dh, formula: '0,010 + 0,010·n' },
  { key: 'F', label: 'Lực kéo = trọng lượng', symbol: 'F', unit: 'N', sig: 4, calc: (v, ws) => (0.010 + 0.010 * v.dh) * ws.setting('g'), formula: 'm·g' },
  { key: 'L', label: 'Chiều dài lò xo (đọc thước)', symbol: 'L', unit: 'm', sig: 4 },
];

export default {
  meta, kind: 'slots', columns,
  library: ['spring', 'hanger', 'ruler', 'balance', 'stopwatch', 'ball'],
  reject: { stopwatch: 'thí nghiệm này đo ở trạng thái cân bằng, không cần đo thời gian.', ball: 'bi không dùng để treo vào lò xo ở thí nghiệm này; hãy dùng giá treo + quả cân.' },
  slots: {
    spring: { label: 'Lò xo', accepts: ['spring'], rect: [255, 34, 90, 150] },
    hanger: { label: 'Giá treo + quả cân', accepts: ['hanger'], rect: [250, 200, 100, 120] },
    ruler: { label: 'Thước mét', accepts: ['ruler'], rect: [380, 40, 70, 330] },
    balance: { label: 'Cân điện tử', accepts: ['balance'], rect: [700, 320, 170, 70] },
  },
  settings: [{ key: 'g', label: 'Gia tốc trọng trường', type: 'select', options: PLANETS, default: 9.81 }],
  graphs: [{ label: 'F – L  (hệ số góc = k; giao trục L = L₀)', x: 'L', y: 'F', origin: true }, { label: 'L – F', x: 'F', y: 'L', origin: true }],
  init(ws) { ws.rt = { t: 99 }; },
  onPlace(ws, id) { if (id === 'hanger') ws.rt.t = 0; },
  onParam(ws, it, key) { if (key === 'discs') ws.rt.t = 0; return undefined; },
  onSetting(ws) { ws.rt.t = 0; },
  onMode(ws) { ws.rt.t = 0; },
  status(ws) {
    const n = need(ws); if (n.length) return { text: `Cần đặt thêm: ${n.join(', ')}.`, kind: 'warn' };
    return ws.rt.t < 3 && !ws.ideal ? { text: 'Lò xo đang dao động – chờ ngừng hẳn rồi đọc.', kind: 'warn' } : { text: 'Lò xo đã cân bằng – có thể đọc chiều dài.', kind: 'ok' };
  },
  readouts(ws) {
    const o = [];
    if (ws.slot('spring') && ws.slot('ruler')) { const r = ws.read(INSTRUMENTS.ruler, curL(ws), {}, 'ruler'); o.push({ label: 'Thước mét: chiều dài lò xo', text: `${r.text} m` }); }
    if (ws.slot('balance') && ws.slot('hanger')) { const r = ws.read(INSTRUMENTS.balance, hangMass(ws.slot('hanger')), {}, 'balance'); o.push({ label: 'Cân: giá treo + quả cân', text: `${r.text} kg` }); }
    return o;
  },
  controls(ws, el) {
    el.append(h('div', { class: 'btn-row' }, h('button', { class: 'btn accent', onClick: () => this.record(ws) }, 'Ghi số liệu')), h('p', { class: 'mute sm' }, 'Thêm/bớt quả cân ở thông số «Giá treo», chờ lò xo ngừng dao động rồi ghi.'));
  },
  record(ws) {
    const n = need(ws); if (n.length) { ws.toast(`Chưa thể ghi: thiếu ${n.join(', ')}.`, 'warn'); return; }
    if (!ws.requirePrediction()) return;
    if (!ws.ideal && Math.abs(curL(ws) - (springL0(ws) + eq(ws))) > 0.0006) ws.toast('Lò xo chưa ngừng dao động: số liệu sẽ sai lệch. Hãy chờ thêm.', 'warn', 4500);
    const r = ws.read(INSTRUMENTS.ruler, curL(ws), {}, 'ruler');
    ws.addRow({ dh: ws.slot('hanger').params.discs, L: r.value });
  },
  frame(ws, dt) { if (ws.rt.t > 6) return false; ws.rt.t += dt; return true; },
  background() { return `<rect width="900" height="420" fill="#101d28"/><rect y="400" width="900" height="20" fill="#16283a"/><rect x="230" y="26" width="140" height="12" rx="2" fill="#243a4c" stroke="#a9bcc8"/><rect x="292" y="0" width="16" height="30" fill="#243a4c" stroke="#5b7a8c"/>`; },
  draw(ws) {
    const sp = ws.slot('spring'), hg = ws.slot('hanger'), ru = ws.slot('ruler'), bal = ws.slot('balance');
    let s = '';
    const L = curL(ws), yEnd = TOP + SC * L;
    if (ru) { s += `<rect x="388" y="${TOP}" width="28" height="${SC * 0.4}" fill="#3a3020" stroke="#ffb454" stroke-width="1.2"/>`; for (let i = 0; i <= 40; i++) { const y = TOP + (SC * i) / 100; s += `<path d="M388 ${y}h${i % 5 === 0 ? 12 : 6}" stroke="#ffb454" stroke-width="1"/>`; if (i % 5 === 0) s += `<text x="404" y="${y + 3}" font-size="8" fill="#ffb454">${(i / 100).toFixed(2)}</text>`; } if (sp) s += `<path d="M300 ${yEnd}H388" stroke="#35d0ba" stroke-dasharray="4 3"/>`; }
    if (sp) { let d = `M300 ${TOP}v8`; const n = 14, y0 = TOP + 8, y1 = yEnd - 8; for (let i = 0; i < n; i++) { const y = y0 + ((y1 - y0) * (i + 0.5)) / n; d += `L${i % 2 ? 282 : 318} ${y}`; } d += `L300 ${y1}v8`; s += `<path d="${d}" fill="none" stroke="#a9bcc8" stroke-width="2.4" stroke-linejoin="round"/>`; }
    if (hg) { const n = hg.params.discs; s += `<path d="M288 ${yEnd}h24l-4 8h-16z" fill="#243a4c" stroke="#a9bcc8"/>`; for (let i = 0; i < n; i++) s += `<rect x="284" y="${yEnd + 9 + 3.6 * i}" width="32" height="3" fill="#ffb454"/>`; s += `<text x="324" y="${yEnd + 18}" font-size="10" fill="#ffb454">${n}×10 g + giá</text>`; }
    if (bal) s += `<rect x="708" y="350" width="152" height="36" rx="6" fill="#243a4c" stroke="#a9bcc8" stroke-width="1.6"/><rect x="722" y="357" width="86" height="22" rx="3" fill="#0e1a22" stroke="#35d0ba"/><text x="803" y="373" font-size="13" text-anchor="end" fill="#35d0ba" font-family="monospace">${hg ? ws.read(INSTRUMENTS.balance, hangMass(hg), {}, 'balance').text : '0.0000'}</text><text x="830" y="373" font-size="9" fill="#d6e6ef">kg</text>`;
    return s;
  },
  analyze(ws, { reveal }) {
    const items = [], notes = [], P = ws.pairs('L', 'F'); if (P.length < 3) return { items, notes };
    const f = S.linreg(P.map((p) => p.x), P.map((p) => p.y)); if (!f) return { items, notes };
    const k = springK(ws), L0 = springL0(ws);
    items.push({ label: 'Độ cứng k = hệ số góc F–L', value: `${S.fmtWithUnc(f.slope, f.seSlope)} N/m`, theory: true, ref: `${S.fmtSig(k, 4)} N/m`, err: `${S.fmtSig(S.pctError(f.slope, k), 2)} %`, calc: `k = hệ số góc = ${S.fmtSig(f.slope, 4)} N/m (hồi quy ${f.n} điểm).` });
    items.push({ label: 'Chiều dài tự nhiên L₀ = giao điểm với trục L', value: `${S.fmtWithUnc(f.xIntercept, f.seXIntercept)} m`, theory: true, ref: `${S.fmtSig(L0, 4)} m`, err: `${S.fmtSig(Math.abs(f.xIntercept - L0) * 1000, 2)} mm`, calc: `L₀ = −b/a = ${S.fmtSig(f.xIntercept, 4)} m.` });
    items.push({ label: 'Hệ số tương quan r', value: S.fmtSig(f.r, 6), theory: false });
    if (f.r2 < 0.995) notes.push('Đồ thị lệch khỏi đường thẳng: có điểm vượt giới hạn đàn hồi. Hãy loại các điểm ở tải lớn rồi tính lại k.');
    if (reveal && !ws.ideal) notes.push('Mô hình thực: vượt độ dãn ~8 cm lò xo mềm đi (k giảm còn ~45 %).');
    return { items, notes };
  },
};
