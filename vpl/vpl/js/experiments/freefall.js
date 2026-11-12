// Rơi tự do và xác định gia tốc trọng trường: nam châm điện + bi + cổng quang điện (hoặc đồng hồ bấm tay) + thước.
import { h } from '../ui/dom.js';
import { INSTRUMENTS } from '../core/instruments.js';
import { BALLS, dragK, fallStateDrag, fallTimeDrag, fallTimeIdeal } from '../core/physics.js';
import * as S from '../core/stats.js';

export const SC = 200, Y0 = 62; // px/m và toạ độ y của tâm bi lúc bắt đầu
export const PLANETS_FF = [
  { v: 'earth', label: 'Trái Đất (g = 9,81 m/s²)', g: 9.81, rho: 1.2 },
  { v: 'moon', label: 'Mặt Trăng (g = 1,62 m/s², không có khí quyển)', g: 1.62, rho: 0 },
  { v: 'mars', label: 'Sao Hỏa (g = 3,71 m/s², khí quyển loãng)', g: 3.71, rho: 0.02 },
  { v: 'x', label: 'Hành tinh X (g chưa biết – hãy đo!)', g: null, rho: 1.2 },
];
export const planet = (ws) => {
  const p = PLANETS_FF.find((q) => q.v === ws.setting('planet')) || PLANETS_FF[0];
  if (p.v === 'x') return { ...p, g: ws.hidden('planetX', (r) => Math.round((4 + 12 * r.uniform()) * 100) / 100) };
  return p;
};

/** Thời gian rơi thực của bi (có lực cản không khí nếu mô hình thực). */
export function fallTime({ h, g, rho, ball, ideal }) {
  if (ideal || rho === 0) return fallTimeIdeal(h, g);
  const b = BALLS[ball];
  return fallTimeDrag(h, g, dragK({ rho, radius: b.radius, mass: b.mass }));
}

const meta = {
  id: 'freefall', lab: 'mech', topic: 'Động học', title: 'Rơi tự do – Xác định gia tốc trọng trường', level: 1, minutes: 25,
  tags: ['rơi tự do', 'gia tốc trọng trường', 'g', 'cổng quang', 'sai số'],
  objective: ['Khảo sát quan hệ giữa độ cao rơi h và thời gian rơi t.', 'Xác định gia tốc trọng trường g từ đồ thị h – t² và từ nhiều lần đo.', 'Đánh giá sai số ngẫu nhiên, sai số hệ thống và ảnh hưởng của lực cản không khí.'],
  question: 'Quãng đường rơi phụ thuộc vào thời gian như thế nào, và từ đó xác định được gia tốc trọng trường bằng bao nhiêu?',
  theory: `<p>Vật rơi tự do không vận tốc đầu (bỏ qua lực cản): <i>h</i> = ½<i>g t</i>² ⇒ <i>g</i> = 2<i>h</i>/<i>t</i>².</p>
    <p>Đồ thị <i>h</i> theo <i>t</i>² là đường thẳng đi qua gốc với hệ số góc <i>g</i>/2.</p>
    <p>Lực cản không khí (tỉ lệ <i>v</i>²): <i>v</i>' = <i>g</i> − <i>k v</i>² với <i>k</i> = ρ<i>C</i><sub>d</sub><i>A</i>/(2<i>m</i>). Vật nhẹ, to (bóng bàn) bị cản đáng kể và rơi lâu hơn.</p>
    <p>Phép đo thời gian bằng đồng hồ bấm tay chịu sai số do thời gian phản xạ (~0,05 s); cổng quang điện chính xác hơn nhiều nhưng nam châm điện có thể nhả vật chậm vài mili-giây (sai số hệ thống).</p>`,
  apparatus: [
    { text: 'Nam châm điện thả vật', ids: ['electromagnet'] }, { text: 'Vật rơi (bi)', ids: ['ball'] }, { text: 'Thước mét', ids: ['ruler'] },
    { text: 'Cổng quang điện + đồng hồ đếm (hoặc đồng hồ bấm giây)', ids: ['photogateTimer', 'stopwatch'] }, { text: 'Cân điện tử', ids: ['balance'], optional: true },
  ],
  procedure: [
    { t: 'Lắp nam châm điện, bi, thước mét và dụng cụ đo thời gian lên bàn.', done: (ws) => ws.has('electromagnet') && ws.has('ball') && ws.has('ruler') && (ws.has('photogateTimer') || ws.has('stopwatch')) },
    { t: 'Chọn độ cao thả h, đọc h trên thước mét.' },
    { t: 'Nhấn «Thả bi», đọc thời gian rơi, rồi «Ghi số liệu».', done: (ws) => ws.state.rows.length >= 1 },
    { t: 'Lặp lại 2–3 lần ở mỗi độ cao để đánh giá sai số ngẫu nhiên.' },
    { t: 'Thực hiện ít nhất 6 lần đo ở các độ cao khác nhau.', done: (ws) => ws.state.rows.length >= 6 },
    { t: 'Vẽ đồ thị h – t², tính g từ hệ số góc và từ giá trị trung bình; ước lượng độ không đảm bảo đo.' },
    { t: 'Thay loại bi hoặc hành tinh để xem ảnh hưởng của khối lượng và lực cản không khí.' },
  ],
  predict: {
    q: 'Bỏ qua lực cản không khí, độ cao rơi h phụ thuộc vào thời gian rơi t như thế nào?',
    options: ['h tỉ lệ với t', 'h tỉ lệ với t²', 'h tỉ lệ với √t', 'h không phụ thuộc t'], correct: 1,
    explain: 'Với rơi tự do từ trạng thái nghỉ, h = ½·g·t², tức h tỉ lệ với t².',
  },
  questions: [
    { q: 'Đồ thị h theo t² có dạng nào và hệ số góc bằng bao nhiêu?', type: 'choice', options: ['Đường thẳng qua gốc, hệ số góc g/2', 'Đường thẳng qua gốc, hệ số góc g', 'Parabol', 'Đường nằm ngang'], answer: 0, explain: 'h = (g/2)·t²: h tuyến tính theo t² với hệ số góc g/2, nên g = 2 × hệ số góc.' },
    { q: 'Một vật rơi tự do từ độ cao 1,25 m trên Trái Đất (g = 9,8 m/s²) mất bao lâu?', type: 'num', unit: 's', answer: 0.505, tol: 0.02, explain: 't = √(2h/g) = √(2·1,25/9,8) ≈ 0,505 s.' },
    { q: 'Khi thả đồng thời bi thép và bóng bàn trong không khí, vật nào rơi nhanh hơn và vì sao?', type: 'choice', options: ['Bi thép, vì lực cản không khí ảnh hưởng đến bóng bàn nhiều hơn', 'Bóng bàn, vì nhẹ hơn', 'Như nhau, vì g không phụ thuộc khối lượng trong mọi trường hợp', 'Bi thép, vì g lớn hơn với vật nặng'], answer: 0, explain: 'g như nhau cho mọi vật khi không có lực cản; bóng bàn có k = ρCdA/2m lớn nên bị cản nhiều và rơi chậm hơn.' },
    { q: 'Dùng đồng hồ bấm giây (tay) so với cổng quang điện, sai số ngẫu nhiên của phép đo t sẽ:', type: 'choice', options: ['Lớn hơn nhiều do thời gian phản xạ của người bấm', 'Nhỏ hơn', 'Như nhau', 'Bằng 0'], answer: 0, explain: 'Thời gian phản xạ ~0,05 s là rất lớn so với t ≈ 0,5 s; cổng quang chính xác cỡ 0,1 ms.' },
  ],
  hints: [
    'Mỗi lần đo cho một cặp (h, t). Hãy đổi h giữa các lần để có nhiều điểm trên đồ thị.',
    'Đồ thị h – t² là đường thẳng: g = 2 × hệ số góc. Nhớ chọn đồ thị mẫu «h – t²».',
    'Nếu điểm đầu của đồ thị lệch khỏi gốc, hãy nghĩ tới sai số hệ thống của phép đo thời gian (nam châm nhả chậm) hoặc đo h.',
    'Muốn xem ảnh hưởng của lực cản không khí, thả bóng bàn ở chế độ «Thực tế» rồi so với bi thép, hoặc chuyển sang Mặt Trăng.',
  ],
  conclusion: `<p>Độ cao rơi tỉ lệ với bình phương thời gian: <i>h</i> = ½<i>g t</i>². Từ hệ số góc của đồ thị <i>h</i>–<i>t</i>² ta xác định được <i>g</i> = 2 × hệ số góc; giá trị này không phụ thuộc khối lượng vật khi bỏ qua lực cản.</p>
    <p>Kết quả thực nghiệm có thể lệch nhẹ so với giá trị chuẩn do lực cản không khí (làm thời gian rơi dài hơn, <i>g</i> đo được nhỏ hơn), độ trễ nhả của nam châm điện (sai số hệ thống) và nhiễu ngẫu nhiên của phép đo. Lặp lại nhiều lần giúp giảm sai số ngẫu nhiên, nhưng không loại bỏ sai số hệ thống.</p>`,
  minRows: 6,
};

const cols = [
  { key: 'h', label: 'Độ cao rơi (đọc từ thước)', symbol: 'h', unit: 'm', sig: 4 },
  { key: 't', label: 'Thời gian rơi', symbol: 't', unit: 's', sig: 4 },
  { key: 't2', label: 'Bình phương thời gian', symbol: 't²', unit: 's²', sig: 4, calc: (v) => v.t * v.t, formula: 't · t' },
  { key: 'g', label: 'Gia tốc tính từ mỗi lần đo', symbol: 'g_i', unit: 'm/s²', sig: 4, calc: (v) => (2 * v.h) / (v.t * v.t), formula: '2h / t²' },
];

function missing(ws) {
  const m = [];
  if (!ws.slot('magnet')) m.push('nam châm điện'); if (!ws.slot('ball')) m.push('vật rơi (bi)'); if (!ws.slot('ruler')) m.push('thước mét');
  if (!ws.slot('timer')) m.push('dụng cụ đo thời gian'); return m;
}
export const hSet = (ws) => ws.slot('magnet')?.params.h ?? 1;

function drop(ws) {
  const rt = ws.rt;
  if (rt.phase === 'falling') return;
  if (!ws.requirePrediction()) return;
  const miss = missing(ws);
  if (miss.length) { ws.toast(`Chưa thể thả: còn thiếu ${miss.join(', ')}.`, 'warn', 5000); return; }
  const pl = planet(ws), ball = ws.slot('ball').params.material, hh = hSet(ws);
  const tf = fallTime({ h: hh, g: pl.g, rho: pl.rho, ball, ideal: ws.ideal });
  const b = BALLS[ball], k = dragK({ rho: pl.rho, radius: b.radius, mass: b.mass });
  Object.assign(rt, { phase: 'falling', t: 0, tf, g: pl.g, k: ws.ideal ? 0 : k, reading: null, recorded: false });
  ws.log(`Thả ${b.label.toLowerCase()} từ h = ${hh.toFixed(2)} m.`);
  ws.updateReadouts();
}

function finishDrop(ws) {
  const rt = ws.rt, timer = ws.slot('timer');
  const isGate = timer.id === 'photogateTimer';
  let t = rt.tf;
  if (!ws.ideal) {
    if (isGate) {
      if (ws.mode === 'noisy') t += ws.hidden('release', (r) => 0.002 + 0.002 * r.uniform()) + ws.noise.gauss(0, 0.0003); // nam châm nhả chậm + jitter
    } else t += ws.noise.gauss(0, 0.05); // thời gian phản xạ của người bấm
  }
  const spec = INSTRUMENTS[timer.id];
  const r = ws.read(spec, Math.max(0, t), {}, timer.id);
  const rr = ws.read(INSTRUMENTS.ruler, hSet(ws) + (ws.mode === 'noisy' ? ws.hidden('hoff', (q) => q.range(-0.0015, 0.0015)) : 0), {}, 'ruler');
  rt.phase = 'landed'; rt.reading = { t: r.value, text: r.text, h: rr.value };
  ws.log(`Đồng hồ hiển thị t = ${r.text} s.`);
  ws.bench.render(); ws.updateReadouts();
}

export default {
  meta, kind: 'slots', columns: cols,
  library: ['ruler', 'electromagnet', 'ball', 'photogateTimer', 'stopwatch', 'balance', 'cart', 'syringe'],
  reject: { cart: 'xe lăn không dùng trong thí nghiệm rơi tự do.', syringe: 'xi lanh khí không liên quan đến thí nghiệm này.' },
  slots: {
    magnet: { label: 'Nam châm điện', accepts: ['electromagnet'], rect: [240, 8, 120, 34] },
    ball: { label: 'Vật rơi', accepts: ['ball'], rect: [262, 44, 76, 34] },
    ruler: { label: 'Thước mét', accepts: ['ruler'], rect: [380, 150, 70, 100] },
    timer: { label: 'Cổng quang + đồng hồ (hoặc bấm giây)', accepts: ['photogateTimer', 'stopwatch'], rect: (ws) => [225, Y0 + SC * hSet(ws) - 24, 150, 48] },
    balance: { label: 'Cân điện tử', accepts: ['balance'], rect: [700, 320, 170, 70] },
  },
  settings: [
    { key: 'planet', label: 'Môi trường', type: 'select', options: PLANETS_FF, default: 'earth' },
    { key: 'speed', label: 'Tốc độ hoạt ảnh', type: 'select', options: [{ v: 1, label: '1×' }, { v: 0.5, label: '0,5×' }, { v: 0.25, label: '0,25× (chậm)' }], default: 0.5 },
  ],
  graphs: [
    { label: 'h – t²  (hệ số góc = g/2)', x: 't2', y: 'h' },
    { label: 'h – t', x: 't', y: 'h' },
    { label: 'g_i – h', x: 'h', y: 'g' },
  ],
  liveParams: ['h'],
  init(ws) { ws.rt = { phase: 'idle', t: 0 }; },
  onParam(ws, it, key) { if (ws.rt.phase === 'falling') return 'Không thể đổi thông số khi bi đang rơi.'; if (key === 'h' || key === 'material') { ws.rt.phase = 'idle'; ws.rt.reading = null; } return undefined; },
  onPlace(ws) { if (ws.rt.phase !== 'falling') ws.rt.phase = 'idle'; },
  onRemove(ws) { ws.rt.phase = 'idle'; ws.rt.reading = null; },
  onSetting(ws) { if (ws.rt.phase !== 'falling') { ws.rt.phase = 'idle'; ws.rt.reading = null; } },
  onMode(ws) { if (ws.rt.phase !== 'falling') { ws.rt.phase = 'idle'; ws.rt.reading = null; } },

  status(ws) {
    const m = missing(ws);
    if (ws.rt.phase === 'falling') return { text: 'Bi đang rơi…', kind: 'ok' };
    if (m.length) return { text: `Cần đặt thêm: ${m.join(', ')}.`, kind: 'warn' };
    return { text: 'Đã lắp xong. Chọn độ cao h rồi nhấn «Thả bi».', kind: 'ok' };
  },
  readouts(ws) {
    const o = [], rt = ws.rt;
    if (ws.slot('ruler') && ws.slot('magnet')) { const r = ws.read(INSTRUMENTS.ruler, hSet(ws), {}, 'ruler'); o.push({ label: 'Thước mét: độ cao h', text: `${r.text} m` }); }
    if (ws.slot('timer')) o.push({ label: ws.slot('timer').id === 'stopwatch' ? 'Đồng hồ bấm giây' : 'Đồng hồ đếm (cổng quang)', text: rt.reading ? `${rt.reading.text} s` : '0.0000 s' });
    if (ws.slot('balance') && ws.slot('ball')) { const b = BALLS[ws.slot('ball').params.material]; const r = ws.read(INSTRUMENTS.balance, b.mass, {}, 'balance'); o.push({ label: 'Cân: khối lượng bi', text: `${r.text} kg` }); }
    return o;
  },
  controls(ws, el) {
    const ui = ws.rt.ui = {};
    ui.drop = h('button', { class: 'btn', onClick: () => drop(ws) }, '⬇ Thả bi');
    ui.rec = h('button', { class: 'btn accent', onClick: () => { const r = ws.rt.reading; if (!r || ws.rt.recorded) return; ws.addRow({ h: r.h, t: r.t }); ws.rt.recorded = true; ws.updateReadouts(); } }, 'Ghi số liệu');
    el.append(h('div', { class: 'btn-row' }, ui.drop, ui.rec), h('p', { class: 'mute sm' }, 'Điều chỉnh độ cao h ở thông số «Nam châm điện». Đọc h trên thước chứ không phải trên thanh trượt.'));
    this.updateControls(ws);
  },
  updateControls(ws) {
    const ui = ws.rt.ui; if (!ui?.drop?.isConnected) return;
    ui.drop.disabled = ws.rt.phase === 'falling';
    ui.rec.disabled = !(ws.rt.reading && !ws.rt.recorded);
    ui.rec.textContent = ws.rt.recorded ? 'Đã ghi lần này' : 'Ghi số liệu';
  },
  frame(ws, dt) {
    const rt = ws.rt; if (rt.phase !== 'falling') return false;
    rt.t += dt * (ws.setting('speed') || 1);
    if (rt.t >= rt.tf) { finishDrop(ws); return true; }
    return true;
  },

  background(ws) {
    return `<rect width="900" height="420" fill="#101d28"/><rect y="400" width="900" height="20" fill="#16283a"/><path d="M0 400H900" stroke="#27455a"/>
      <rect x="150" y="0" width="12" height="400" fill="#243a4c" stroke="#5b7a8c"/><rect x="120" y="394" width="72" height="8" rx="2" fill="#243a4c" stroke="#5b7a8c"/><path d="M162 14H240" stroke="#5b7a8c" stroke-width="6"/>`;
  },
  draw(ws) {
    const rt = ws.rt, mg = ws.slot('magnet'), bl = ws.slot('ball'), tm = ws.slot('timer'), ru = ws.slot('ruler'), bal = ws.slot('balance');
    const hh = hSet(ws), pl = planet(ws);
    let s = '';
    if (mg) s += `<rect x="248" y="8" width="104" height="26" rx="3" fill="#243a4c" stroke="#a9bcc8" stroke-width="1.6"/>${Array.from({ length: 6 }, (_, i) => `<path d="M${262 + i * 15} 34v8" stroke="${rt.phase === 'falling' ? '#555' : '#ffb454'}" stroke-width="3"/>`).join('')}<text x="300" y="25" font-size="10" fill="#d6e6ef" text-anchor="middle">NAM CHÂM ĐIỆN ${rt.phase === 'falling' || rt.phase === 'landed' ? '(tắt)' : '(bật)'}</text>`;
    if (ru) { // thước dọc đo h: số 0 tại tâm bi lúc đầu
      const rx = 400; s += `<rect x="${rx}" y="${Y0}" width="26" height="${SC * 1.55}" fill="#3a3020" stroke="#ffb454" stroke-width="1.2"/>`;
      for (let i = 0; i <= 155; i += 5) { const y = Y0 + (SC * i) / 100; s += `<path d="M${rx} ${y}h${i % 10 === 0 ? 12 : 6}" stroke="#ffb454" stroke-width="1"/>`; if (i % 10 === 0) s += `<text x="${rx + 15}" y="${y + 3}" font-size="8" fill="#ffb454">${(i / 100).toFixed(1)}</text>`; }
      s += `<path d="M426 ${Y0 + SC * hh}H300" stroke="#35d0ba" stroke-width="1" stroke-dasharray="4 3"/><text x="436" y="${Y0 + SC * hh + 3}" font-size="9" fill="#35d0ba">h</text>`;
    }
    if (tm) {
      const y = Y0 + SC * hh, gate = tm.id === 'photogateTimer';
      if (gate) {
        s += `<path d="M258 ${y - 22}v34M342 ${y - 22}v34" stroke="#a9bcc8" stroke-width="7" stroke-linecap="round"/><path d="M262 ${y}H338" stroke="${rt.phase === 'landed' ? '#ff6b6b' : '#ff6b6b88'}" stroke-width="1.5" stroke-dasharray="4 3"/>`;
        s += `<rect x="470" y="30" width="150" height="46" rx="6" fill="#243a4c" stroke="#a9bcc8" stroke-width="1.6"/><rect x="480" y="38" width="130" height="30" rx="3" fill="#0e1a22" stroke="#35d0ba"/><text x="605" y="60" font-size="19" fill="#35d0ba" text-anchor="end" font-family="monospace">${rt.reading ? rt.reading.text : '0.0000'}</text><text x="545" y="26" font-size="9" fill="#d6e6ef" text-anchor="middle">ĐỒNG HỒ ĐẾM (s)</text><path d="M300 ${y}Q300 ${y + 24} 470 76" stroke="#5b7a8c" fill="none" stroke-dasharray="3 3"/>`;
      } else {
        s += `<path d="M258 ${y}h84" stroke="#5b7a8c" stroke-width="3"/><circle cx="640" cy="60" r="34" fill="#243a4c" stroke="#a9bcc8" stroke-width="2"/><circle cx="640" cy="60" r="27" fill="#0e1a22"/><text x="640" y="66" font-size="15" fill="#35d0ba" text-anchor="middle" font-family="monospace">${rt.reading ? rt.reading.text : '0.00'}</text><text x="640" y="108" font-size="9" fill="#d6e6ef" text-anchor="middle">BẤM GIÂY (tay)</text>`;
      }
    }
    if (bl) {
      const b = BALLS[bl.params.material];
      const rad = { steel: 9, wood: 11, pingpong: 14 }[bl.params.material];
      let y = Y0;
      if (rt.phase === 'falling') { const st = fallStateDrag(rt.t, rt.g, rt.k); y = Y0 + SC * st.y; }
      else if (rt.phase === 'landed') y = Y0 + SC * hh;
      const fill = { steel: '#7e97a8', wood: '#c9a97a', pingpong: '#f4f1e6' }[bl.params.material];
      s += `<circle cx="300" cy="${y}" r="${rad}" fill="${fill}" stroke="#d6e6ef"/><path d="M${300 - rad * 0.5} ${y - rad * 0.4}a${rad * 0.6} ${rad * 0.6} 0 0 1 ${rad * 0.5} ${-rad * 0.3}" stroke="#fff" stroke-width="1.6" fill="none" opacity=".6"/>`;
      if (rt.phase === 'falling') for (let i = 1; i < 6; i++) { const st = fallStateDrag(Math.max(0, rt.t - i * 0.012), rt.g, rt.k); s += `<circle cx="300" cy="${Y0 + SC * st.y}" r="${rad}" fill="${fill}" opacity="${0.22 - i * 0.035}"/>`; }
      s += `<text x="300" y="${Math.min(392, y + rad + 14)}" font-size="9" fill="#8aa3b3" text-anchor="middle">${b.label}</text>`;
    }
    if (bal) s += `<rect x="708" y="350" width="152" height="36" rx="6" fill="#243a4c" stroke="#a9bcc8" stroke-width="1.6"/><rect x="722" y="357" width="86" height="22" rx="3" fill="#0e1a22" stroke="#35d0ba"/><text x="803" y="373" font-size="13" text-anchor="end" fill="#35d0ba" font-family="monospace">${bl ? ws.read(INSTRUMENTS.balance, BALLS[bl.params.material].mass, {}, 'balance').text : '0.0000'}</text><text x="830" y="373" font-size="9" fill="#d6e6ef">kg</text>`;
    s += `<text x="880" y="404" font-size="10" fill="#547083" text-anchor="end">${pl.v === 'x' ? 'Hành tinh X' : pl.label.split(' (')[0]}</text>`;
    return s;
  },

  analyze(ws, { reveal }) {
    const items = [], notes = [], P = ws.pairs('t2', 'h');
    if (P.length < 3) return { items, notes };
    const f = S.linreg(P.map((p) => p.x), P.map((p) => p.y)); if (!f) return { items, notes };
    const pl = planet(ws), gHidden = pl.v === 'x';
    const g = 2 * f.slope, ug = 2 * f.seSlope;
    const refTxt = gHidden && !ws.unlocked() ? 'ẩn cho đến khi mở kết luận' : `${S.fmtSig(pl.g, 4)} m/s²`;
    items.push({ label: 'g từ hệ số góc h–t² (g = 2·a)', value: `${S.fmtWithUnc(g, ug)} m/s²`, theory: true, ref: refTxt, err: gHidden && !ws.unlocked() ? null : `${S.fmtSig(S.pctError(g, pl.g), 2)} %`, calc: `g = 2 × hệ số góc = 2 × ${S.fmtSig(f.slope, 4)} = ${S.fmtSig(g, 4)} m/s²  (u = ${S.fmtSig(ug, 2)}).` });
    const gi = ws.colValues('g').filter((v) => v != null);
    if (gi.length >= 2) {
      const u = S.uncertainty(gi, 0);
      items.push({ label: 'g trung bình các lần đo', value: `${S.fmtWithUnc(u.mean, u.U)} m/s²  (s = ${S.fmtSig(u.sd, 2)}, n = ${u.n})`, theory: true, ref: refTxt, err: gHidden && !ws.unlocked() ? null : `${S.fmtSig(S.pctError(u.mean, pl.g), 2)} %`, calc: `g_tb = ${S.fmtSig(u.mean, 4)} m/s²; u_A = s/√n = ${S.fmtSig(u.uA, 2)}; U(k=2) = ${S.fmtSig(u.U, 2)}.` });
    }
    items.push({ label: 'Tung độ gốc h₀ của đồ thị h–t² (lý tưởng: 0)', value: `${S.fmtWithUnc(f.intercept, f.seIntercept)} m`, theory: false, ref: '0 m', err: null });
    items.push({ label: 'Hệ số tương quan r', value: S.fmtSig(f.r, 6), theory: false });
    if (reveal && !ws.ideal) notes.push('Lực cản không khí làm t dài hơn dự đoán lý tưởng nên g đo được thường nhỏ hơn g thật (rõ nhất với bóng bàn). Độ trễ nhả của nam châm điện là sai số hệ thống: lặp lại nhiều lần không loại bỏ được.');
    return { items, notes };
  },
};
