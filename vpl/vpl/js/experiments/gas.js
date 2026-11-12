// Ba thí nghiệm chất khí dùng chung một bàn thí nghiệm và mô hình khí: đẳng nhiệt (Boyle–Mariotte), đẳng tích, đẳng áp (Charles).
import { h } from '../ui/dom.js';
import { INSTRUMENTS } from '../core/instruments.js';
import { R_GAS, P_ATM, T_ZERO_C } from '../core/physics.js';
import * as G from '../core/gas.js';
import * as S from '../core/stats.js';

const T0K = 22 + T_ZERO_C;
const gasCfg = (ws, mode) => G.makeGasConfig({ mode, ideal: ws.ideal });
const bathItem = (ws) => ws.slot('bath');
const setpointK = (ws) => (bathItem(ws) ? bathItem(ws).params.setpoint + T_ZERO_C : T0K);

function ensureGas(ws, mode) {
  const x = ws.state.x;
  if (!x.gas) x.gas = G.initGasState(gasCfg(ws, mode), { V: 60 * G.mL, Tset: setpointK(ws) });
  ws.rt.cfg = gasCfg(ws, mode);
  return x.gas;
}

function readings(ws, mode) {
  const cfg = ws.rt.cfg || gasCfg(ws, mode), s = ws.state.x.gas;
  const out = {};
  if (ws.slot('syringe')) out.V = ws.read(INSTRUMENTS.syringe, s.Vread / G.mL, {}, 'syringe');
  if (ws.slot('pressure')) out.P = ws.read(INSTRUMENTS.pressureSensor, G.gasStatePressure(cfg, s) / 1000, {}, 'pressureSensor');
  if (ws.slot('temp')) out.T = ws.read(INSTRUMENTS.tempSensor, s.Ts - T_ZERO_C, {}, 'tempSensor');
  return out;
}

const THEORY = {
  isothermal: `<p>Khối khí xác định ở nhiệt độ không đổi (quá trình đẳng nhiệt) tuân theo định luật Boyle–Mariotte: <i>p V</i> = hằng số, tức <i>p</i> tỉ lệ nghịch với <i>V</i>; đồ thị <i>p</i> theo 1/<i>V</i> là đường thẳng qua gốc.</p>
    <p>Từ phương trình trạng thái <i>pV</i> = <i>nRT</i>, hệ số góc của đồ thị <i>p</i>–1/<i>V</i> bằng <i>nRT</i>, từ đó tính được số mol khí.</p>
    <p>Nếu nén quá nhanh, khí nóng lên (quá trình gần đoạn nhiệt: <i>T V</i><sup>γ−1</sup> = hằng số) nên phải chờ khí cân bằng nhiệt với môi trường rồi mới đọc. Ống nối cảm biến có thể tích chết <i>V</i><sub>d</sub>, vì vậy thể tích khí thật là <i>V</i> + <i>V</i><sub>d</sub>.</p>`,
  isochoric: `<p>Với khối khí có thể tích không đổi (quá trình đẳng tích), định luật Charles–Gay-Lussac cho <i>p</i>/<i>T</i> = hằng số với <i>T</i> là nhiệt độ tuyệt đối (K), tức <i>p</i> = <i>nR T</i>/<i>V</i>.</p>
    <p>Đồ thị <i>p</i> theo nhiệt độ Celsius <i>t</i> là đường thẳng; ngoại suy đến <i>p</i> = 0 cho nhiệt độ không tuyệt đối ≈ −273,15 °C.</p>
    <p>Cảm biến nhiệt độ có quán tính nhiệt (hằng số thời gian vài giây) nên phải chờ số chỉ ổn định mới đọc.</p>`,
  isobaric: `<p>Với khối khí ở áp suất không đổi (pit-tông tự do, áp suất ngoài cố định) ta có <i>V</i>/<i>T</i> = hằng số (định luật Charles): <i>V</i> = <i>nR T</i>/<i>p</i>.</p>
    <p>Đồ thị <i>V</i> theo <i>t</i> (°C) là đường thẳng; ngoại suy đến <i>V</i> = 0 cho nhiệt độ không tuyệt đối. Thể tích đọc trên xi lanh không gồm thể tích chết của ống nối nên giao điểm bị lệch nhẹ.</p>`,
};

function makeGas(mode) {
  const iso = mode === 'isothermal', isoc = mode === 'isochoric', isob = mode === 'isobaric';
  const id = iso ? 'boyle' : isoc ? 'gaylussac' : 'charles';
  const meta = {
    id, lab: 'therm', topic: 'Chất khí và nhiệt động lực học', level: iso ? 1 : 2, minutes: 25,
    title: iso ? 'Định luật Boyle – Mariotte (quá trình đẳng nhiệt)' : isoc ? 'Quá trình đẳng tích – Định luật Gay-Lussac' : 'Quá trình đẳng áp – Định luật Charles',
    tags: iso ? ['đẳng nhiệt', 'áp suất', 'thể tích', 'khí lý tưởng', 'Boyle'] : isoc ? ['đẳng tích', 'áp suất', 'nhiệt độ', 'không độ tuyệt đối'] : ['đẳng áp', 'thể tích', 'nhiệt độ', 'Charles'],
    objective: iso
      ? ['Khảo sát mối quan hệ giữa áp suất và thể tích của một khối khí ở nhiệt độ không đổi.', 'Xác định số mol khí từ hệ số góc của đồ thị p–1/V.', 'Phát hiện và giải thích sai số do thể tích chết và do nén nhanh.']
      : isoc ? ['Khảo sát quan hệ giữa áp suất và nhiệt độ của khối khí có thể tích không đổi.', 'Ngoại suy để ước lượng nhiệt độ không tuyệt đối.', 'Nhận biết vai trò của thời gian cân bằng nhiệt.']
        : ['Khảo sát quan hệ giữa thể tích và nhiệt độ của khối khí ở áp suất không đổi.', 'Ngoại suy để ước lượng nhiệt độ không tuyệt đối từ đồ thị V–t.', 'Giải thích độ lệch do thể tích chết của ống nối.'],
    question: iso ? 'Áp suất của một lượng khí xác định thay đổi thế nào khi thể tích thay đổi ở nhiệt độ không đổi?' : isoc ? 'Áp suất của khí thay đổi thế nào theo nhiệt độ khi thể tích không đổi?' : 'Thể tích của khí thay đổi thế nào theo nhiệt độ khi áp suất không đổi?',
    theory: THEORY[mode],
    apparatus: [
      { text: 'Xi lanh khí có pit-tông', ids: ['syringe'] }, { text: 'Cảm biến áp suất', ids: ['pressureSensor'] },
      { text: 'Cảm biến nhiệt độ', ids: ['tempSensor'], optional: iso }, { text: 'Bể ổn nhiệt', ids: ['waterBath'], optional: iso },
    ],
    procedure: iso
      ? [{ t: 'Lắp xi lanh, cảm biến áp suất và cảm biến nhiệt độ lên bàn.', done: (ws) => ws.has('syringe') && ws.has('pressureSensor') },
        { t: 'Kéo/đẩy pit-tông tới thể tích mong muốn rồi chờ nhiệt độ ổn định (cảm biến chỉ giá trị không đổi).' },
        { t: 'Ghi thể tích và áp suất. Lặp lại với các thể tích 20–100 mL.', done: (ws) => ws.state.rows.length >= 1 },
        { t: 'Thực hiện ít nhất 6 lần đo.', done: (ws) => ws.state.rows.length >= 6 },
        { t: 'Vẽ đồ thị p–V và p–1/V; nhận xét dạng đồ thị.' }, { t: 'Thử «nén nhanh» để thấy khí nóng lên và áp suất tạm thời tăng.' }]
      : [{ t: 'Lắp xi lanh, cảm biến áp suất, cảm biến nhiệt độ và bể ổn nhiệt lên bàn.', done: (ws) => ws.has('syringe') && ws.has('pressureSensor') && ws.has('tempSensor') && ws.has('waterBath') },
        { t: 'Đặt nhiệt độ bể, chờ cân bằng nhiệt (bể → khí → cảm biến).' },
        { t: `Ghi nhiệt độ và ${isoc ? 'áp suất' : 'thể tích'} khi số chỉ đã ổn định.`, done: (ws) => ws.state.rows.length >= 1 },
        { t: 'Thực hiện ít nhất 6 lần đo trong khoảng 10–90 °C.', done: (ws) => ws.state.rows.length >= 6 },
        { t: 'Vẽ đồ thị, hồi quy tuyến tính và ngoại suy giao điểm với trục nhiệt độ.' }],
    predict: iso ? { q: 'Nén khí (giữ nhiệt độ không đổi) để thể tích giảm còn một nửa thì áp suất sẽ:', options: ['Tăng gấp đôi', 'Giảm một nửa', 'Không đổi', 'Tăng gấp bốn'], correct: 0, explain: 'Boyle–Mariotte: p·V = hằng số, V giảm một nửa thì p tăng gấp đôi.' }
      : isoc ? { q: 'Khối khí giữ thể tích không đổi. Khi nhiệt độ Celsius tăng gấp đôi (ví dụ 20 °C → 40 °C) thì áp suất:', options: ['Tăng gấp đôi', 'Tăng chưa tới 10 %', 'Không đổi', 'Giảm'], correct: 1, explain: 'p tỉ lệ với nhiệt độ tuyệt đối T (K), không phải °C: 293 K → 313 K chỉ tăng ≈ 6,8 %.' }
        : { q: 'Khối khí ở áp suất không đổi. Thể tích tỉ lệ thuận với đại lượng nào?', options: ['Nhiệt độ tuyệt đối (K)', 'Nhiệt độ Celsius (°C)', 'Bình phương nhiệt độ', 'Nghịch đảo nhiệt độ'], correct: 0, explain: 'Charles: V/T = hằng số với T tính bằng kelvin.' },
    questions: iso ? [
      { q: 'Đồ thị p theo 1/V có dạng nào?', type: 'choice', options: ['Đường thẳng đi qua gốc', 'Hyperbol', 'Parabol', 'Đường nằm ngang'], answer: 0, explain: 'p = nRT/V nên p tỉ lệ thuận với 1/V.' },
      { q: 'Khí ở 100 kPa, 60 mL. Nén đẳng nhiệt còn 40 mL thì áp suất là bao nhiêu?', type: 'num', unit: 'kPa', answer: 150, tol: 2, explain: 'p₂ = p₁V₁/V₂ = 100·60/40 = 150 kPa.' },
      { q: 'Nếu nén rất nhanh rồi đọc ngay, áp suất đọc được so với giá trị đẳng nhiệt sẽ:', type: 'choice', options: ['Lớn hơn, vì khí nóng lên', 'Nhỏ hơn', 'Bằng nhau', 'Không xác định'], answer: 0, explain: 'Nén nhanh làm khí nóng lên (đoạn nhiệt), p = nRT/V lớn hơn cho đến khi khí trao đổi nhiệt với môi trường.' },
      { q: 'Vì sao đồ thị 1/p theo V cắt trục V tại giá trị âm nhỏ (thay vì đi qua gốc)?', type: 'choice', options: ['Thể tích chết của ống nối cộng thêm vào thể tích khí', 'Cảm biến áp suất hỏng', 'Khí không phải lý tưởng', 'Nhiệt độ giảm khi nén'], answer: 0, explain: 'Thể tích khí thật là V + Vd nên 1/p = (V + Vd)/(nRT) và giao điểm với trục V là −Vd.' },
    ] : [
      { q: isoc ? 'Đồ thị p theo nhiệt độ t (°C) cắt trục nhiệt độ tại giá trị gần nhất là:' : 'Đồ thị V theo t (°C) cắt trục nhiệt độ tại giá trị gần nhất là:', type: 'choice', options: ['−273 °C', '0 °C', '−100 °C', '+273 °C'], answer: 0, explain: 'Ngoại suy tới p (hoặc V) = 0 cho nhiệt độ không tuyệt đối, −273,15 °C.' },
      { q: isoc ? 'Khí ở 300 K, 100 kPa. Nung đẳng tích đến 450 K thì áp suất là bao nhiêu?' : 'Khí ở 300 K, 60 mL. Nung đẳng áp đến 450 K thì thể tích là bao nhiêu?', type: 'num', unit: isoc ? 'kPa' : 'mL', answer: isoc ? 150 : 90, tol: isoc ? 2 : 1, explain: isoc ? 'p₂ = p₁T₂/T₁ = 100·450/300 = 150 kPa.' : 'V₂ = V₁T₂/T₁ = 60·450/300 = 90 mL.' },
      { q: 'Vì sao phải chờ vài chục giây sau khi đổi nhiệt độ bể trước khi đọc số liệu?', type: 'choice', options: ['Nước, khí và đầu dò cần thời gian để cân bằng nhiệt', 'Bể ổn nhiệt chưa bật', 'Cảm biến áp suất cần khởi động', 'Không cần chờ'], answer: 0, explain: 'Nhiệt truyền qua nước → thành xi lanh → khí → đầu dò theo hàm mũ với hằng số thời gian cỡ vài giây tới vài chục giây.' },
    ],
    hints: iso
      ? ['Sau mỗi lần thay đổi thể tích, chờ cho nhiệt độ cảm biến trở về nhiệt độ môi trường (xem mục «Thiết bị đo»). Có thể tăng tốc độ mô phỏng.', 'Muốn kiểm tra pV = hằng số hãy thêm cột hoặc dùng đồ thị mẫu «p·V – V».', 'Nếu p–1/V không thẳng hẳn: thử đồ thị «1/p – V», giao điểm với trục V cho biết thể tích chết.']
      : ['Đặt nhiệt độ bể rồi tăng tốc độ mô phỏng để chờ nhanh hơn; đợi chỉ số cảm biến nhiệt độ ngừng thay đổi.', 'Dùng nhiệt độ Celsius cho đồ thị rồi đọc giao điểm với trục hoành; hãy so sánh với −273,15 °C.', 'Số điểm càng trải rộng (10 → 90 °C) thì ngoại suy càng chính xác.'],
    conclusion: iso
      ? '<p>Ở nhiệt độ không đổi, áp suất của một lượng khí tỉ lệ nghịch với thể tích: <i>pV</i> = hằng số (Boyle–Mariotte). Đồ thị <i>p</i>–1/<i>V</i> là đường thẳng với hệ số góc <i>nRT</i>. Thể tích chết của ống nối là sai số hệ thống; nén nhanh làm khí nóng lên nên phải chờ cân bằng nhiệt.</p>'
      : isoc ? '<p>Ở thể tích không đổi, <i>p</i> tỉ lệ với nhiệt độ tuyệt đối: <i>p</i>/<i>T</i> = hằng số. Đồ thị <i>p</i> theo °C là đường thẳng cắt trục nhiệt độ ở ≈ −273 °C (không độ tuyệt đối).</p>'
        : '<p>Ở áp suất không đổi, <i>V</i> tỉ lệ với nhiệt độ tuyệt đối: <i>V</i>/<i>T</i> = hằng số. Đồ thị <i>V</i> theo °C là đường thẳng cắt trục nhiệt độ gần −273 °C; thể tích chết của ống nối làm giao điểm lệch nhẹ.</p>',
    minRows: 6,
  };

  const columns = iso ? [
    { key: 'V', label: 'Thể tích đọc trên xi lanh', symbol: 'V', unit: 'mL', sig: 4 },
    { key: 'P', label: 'Áp suất (cảm biến)', symbol: 'p', unit: 'kPa', sig: 4 },
    { key: 'T', label: 'Nhiệt độ (cảm biến)', symbol: 't', unit: '°C', sig: 4 },
    { key: 'invV', label: 'Nghịch đảo thể tích', symbol: '1/V', unit: 'mL⁻¹', sig: 4, calc: (v) => 1 / v.V, formula: '1 / V' },
    { key: 'invP', label: 'Nghịch đảo áp suất', symbol: '1/p', unit: 'kPa⁻¹', sig: 4, calc: (v) => 1 / v.P, formula: '1 / p' },
    { key: 'PV', label: 'Tích p·V', symbol: 'pV', unit: 'kPa·mL', sig: 4, calc: (v) => v.P * v.V, formula: 'p · V' },
  ] : isoc ? [
    { key: 'T', label: 'Nhiệt độ (cảm biến)', symbol: 't', unit: '°C', sig: 4 },
    { key: 'P', label: 'Áp suất (cảm biến)', symbol: 'p', unit: 'kPa', sig: 4 },
    { key: 'TK', label: 'Nhiệt độ tuyệt đối', symbol: 'T', unit: 'K', sig: 5, calc: (v) => v.T + T_ZERO_C, formula: 't + 273,15' },
    { key: 'PT', label: 'Tỉ số p/T', symbol: 'p/T', unit: 'kPa/K', sig: 4, calc: (v) => v.P / (v.T + T_ZERO_C), formula: 'p / T' },
  ] : [
    { key: 'T', label: 'Nhiệt độ (cảm biến)', symbol: 't', unit: '°C', sig: 4 },
    { key: 'V', label: 'Thể tích đọc trên xi lanh', symbol: 'V', unit: 'mL', sig: 4 },
    { key: 'TK', label: 'Nhiệt độ tuyệt đối', symbol: 'T', unit: 'K', sig: 5, calc: (v) => v.T + T_ZERO_C, formula: 't + 273,15' },
    { key: 'VT', label: 'Tỉ số V/T', symbol: 'V/T', unit: 'mL/K', sig: 4, calc: (v) => v.V / (v.T + T_ZERO_C), formula: 'V / T' },
  ];

  return {
    meta, kind: 'slots', columns, mode,
    library: ['syringe', 'pressureSensor', 'tempSensor', 'waterBath', 'ruler', 'balance', 'stopwatch'],
    reject: { ruler: 'thể tích đọc trực tiếp trên thang của xi lanh, không cần thước.', balance: 'khối lượng khí quá nhỏ để cân, và không cần trong thí nghiệm này.', stopwatch: 'thời gian cân bằng được thể hiện bằng cảm biến nhiệt độ; không cần đồng hồ bấm giây.' },
    slots: {
      syringe: { label: 'Xi lanh khí', accepts: ['syringe'], rect: [220, 160, 420, 66] },
      bath: { label: 'Bể ổn nhiệt', accepts: ['waterBath'], rect: [200, 250, 460, 60] },
      pressure: { label: 'CB áp suất', accepts: ['pressureSensor'], rect: [690, 150, 150, 80] },
      temp: { label: 'CB nhiệt độ', accepts: ['tempSensor'], rect: [360, 40, 150, 60] },
    },
    settings: [
      { key: 'speed', label: 'Tốc độ mô phỏng thời gian', type: 'select', options: [{ v: 1, label: '1× (thời gian thực)' }, { v: 5, label: '5×' }, { v: 20, label: '20×' }, { v: 60, label: '60×' }], default: 5 },
      ...(iso ? [{ key: 'fast', label: 'Kiểu thao tác pit-tông', type: 'select', options: [{ v: false, label: 'Chậm (khí kịp giữ nhiệt độ)' }, { v: true, label: 'Nhanh (nén đoạn nhiệt)' }], default: false }] : []),
    ],
    graphs: iso
      ? [{ label: 'p – V', x: 'V', y: 'P', origin: true }, { label: 'p – 1/V  (hệ số góc = nRT)', x: 'invV', y: 'P' }, { label: '1/p – V  (giao trục V = −V chết)', x: 'V', y: 'invP', origin: false }, { label: 'p·V – V', x: 'V', y: 'PV', origin: true }]
      : isoc ? [{ label: 'p – t (°C)', x: 'T', y: 'P', origin: true }, { label: 'p – T (K)', x: 'TK', y: 'P' }]
        : [{ label: 'V – t (°C)', x: 'T', y: 'V', origin: true }, { label: 'V – T (K)', x: 'TK', y: 'V' }],
    liveParams: ['setpoint'],

    init(ws) {
      ws.rt = { cfg: gasCfg(ws, mode), particles: null, vol: ws.state.x.gas ? ws.state.x.gas.Vread / G.mL : 60 };
      ensureGas(ws, mode);
    },
    onPlace(ws, pid) { if (pid === 'waterBath') { ws.state.x.gas.Tset = setpointK(ws); } if (pid === 'syringe') ws.rt.vol = ws.state.x.gas.Vread / G.mL; },
    onRemove(ws, it) { if (it.id === 'waterBath') ws.state.x.gas.Tset = T0K; },
    onParam(ws, it, key, val) { if (key === 'setpoint') { ws.state.x.gas.Tset = val + T_ZERO_C; } return undefined; },
    onMode(ws) { const g = ws.state.x.gas; ws.rt.cfg = gasCfg(ws, mode); if (ws.ideal) { g.Tg = g.Tb = g.Ts = g.Tset; } },
    onChange(ws) { ws.rt.cfg = gasCfg(ws, mode); },

    status(ws) {
      const need = [];
      if (!ws.slot('syringe')) need.push('xi lanh'); if (!ws.slot('pressure')) need.push('cảm biến áp suất');
      if (!iso && !ws.slot('bath')) need.push('bể ổn nhiệt'); if (!iso && !ws.slot('temp')) need.push('cảm biến nhiệt độ');
      if (need.length) return { text: `Cần đặt thêm: ${need.join(', ')}.`, kind: 'warn' };
      const s = ws.state.x.gas;
      return G.isSettled(s, 0.05) ? { text: 'Đã cân bằng nhiệt – có thể đọc số liệu.', kind: 'ok' } : { text: 'Chưa cân bằng nhiệt – chờ số chỉ ổn định rồi mới đọc.', kind: 'warn' };
    },
    readouts(ws) {
      const r = readings(ws, mode), o = [];
      if (r.V) o.push({ label: 'Xi lanh: thể tích', text: `${r.V.text} mL` });
      if (r.P) o.push({ label: 'CB áp suất', text: `${r.P.text} kPa`, warn: r.P.over });
      if (r.T) o.push({ label: 'CB nhiệt độ', text: `${r.T.text} °C` });
      if (bathItem(ws)) o.push({ label: 'Bể ổn nhiệt (đặt)', text: `${bathItem(ws).params.setpoint} °C` });
      return o;
    },
    controls(ws, el) {
      const ui = ws.rt.ui = {};
      if (iso) {
        const sl = ws.slot('syringe');
        const range = h('input', { type: 'range', min: 20, max: 100, step: 1, value: Math.round(ws.rt.vol), 'aria-label': 'Thể tích pit-tông', disabled: !sl });
        const out = h('output', null, `${Math.round(ws.rt.vol)} mL`);
        range.addEventListener('input', () => { out.textContent = `${range.value} mL`; });
        range.addEventListener('change', () => this.setVolume(ws, +range.value));
        ui.range = range;
        el.append(h('label', { class: 'pc' }, h('span', { class: 'pc-l' }, 'Vị trí pit-tông (thể tích khí)'), h('span', { class: 'pc-r' }, range, out)));
      } else if (isoc) el.append(h('p', { class: 'mute sm' }, 'Pit-tông được khóa ở 60 mL: thể tích khí không đổi.'));
      else el.append(h('p', { class: 'mute sm' }, 'Pit-tông chuyển động tự do dưới áp suất không đổi 101,3 kPa.'));
      ui.rec = h('button', { class: 'btn accent', onClick: () => this.record(ws) }, 'Ghi số liệu');
      ui.state = h('p', { class: 'mute sm' });
      el.append(h('div', { class: 'btn-row' }, ui.rec), ui.state);
      this.updateControls(ws);
    },
    updateControls(ws) {
      const ui = ws.rt.ui; if (!ui?.state?.isConnected) return;
      const s = ws.state.x.gas, ok = G.isSettled(s, 0.05);
      ui.state.textContent = ok ? '● Đã cân bằng nhiệt' : `○ Đang cân bằng: chênh lệch nhiệt độ cảm biến ${Math.abs(s.Ts - s.Tset).toFixed(2)} K`;
      ui.state.className = 'sm ' + (ok ? 'okc' : 'warnc');
    },
    setVolume(ws, v) {
      if (!ws.slot('syringe')) { ws.toast('Hãy đặt xi lanh lên bàn trước.', 'warn'); return; }
      const cfg = gasCfg(ws, mode);
      const fast = ws.setting('fast') === true || ws.setting('fast') === 'true';
      let s = ws.state.x.gas;
      const Vold = s.Vread;
      s = G.setVolume(cfg, s, v * G.mL);
      // thao tác chậm (tựa tĩnh): khí luôn kịp cân bằng nhiệt với bể → đẳng nhiệt; thao tác nhanh: giữ hiệu ứng nén đoạn nhiệt
      if (!fast) s = { ...s, Tg: s.Tb };
      ws.state.x.gas = s; ws.rt.vol = v;
      ws.log(`Pit-tông: ${(Vold / G.mL).toFixed(0)} → ${v} mL (${fast ? 'nhanh' : 'chậm'}).`);
      ws.changed();
    },
    record(ws) {
      const miss = [];
      if (!ws.slot('syringe')) miss.push('xi lanh'); if (!ws.slot('pressure')) miss.push('cảm biến áp suất');
      if (!iso && !ws.slot('temp')) miss.push('cảm biến nhiệt độ');
      if (miss.length) { ws.toast(`Chưa thể ghi: thiếu ${miss.join(', ')}.`, 'warn'); return; }
      if (!ws.requirePrediction()) return;
      const r = readings(ws, mode);
      if (r.P?.over) { ws.toast('Áp suất vượt thang đo của cảm biến.', 'warn'); return; }
      const vals = iso ? { V: r.V.value, P: r.P.value, T: r.T ? r.T.value : null } : isoc ? { T: r.T.value, P: r.P.value } : { T: r.T.value, V: r.V.value };
      if (!G.isSettled(ws.state.x.gas, 0.05)) ws.toast('Lưu ý: khí chưa cân bằng nhiệt, số liệu có thể sai lệch.', 'warn', 4500);
      ws.addRow(vals);
    },
    frame(ws, dt) {
      const s = ws.state.x.gas, cfg = ws.rt.cfg;
      if (!G.isSettled(s, 1e-4)) { ws.state.x.gas = G.stepGas(cfg, s, dt * (ws.setting('speed') || 1)); ws.save(); }
      // hạt khí (hoạt ảnh)
      const g = ws.state.x.gas;
      const P = (ws.rt.particles ||= Array.from({ length: 42 }, () => ({ x: Math.random(), y: Math.random(), vx: Math.random() - 0.5, vy: Math.random() - 0.5 })));
      const sp = 0.45 * Math.sqrt(g.Tg / T0K);
      for (const p of P) { p.x += p.vx * sp * dt * 2; p.y += p.vy * sp * dt * 2; if (p.x < 0 || p.x > 1) { p.vx *= -1; p.x = Math.min(1, Math.max(0, p.x)); } if (p.y < 0 || p.y > 1) { p.vy *= -1; p.y = Math.min(1, Math.max(0, p.y)); } }
      return true;
    },

    background() { return `<rect width="900" height="420" fill="#101d28"/><rect y="390" width="900" height="30" fill="#16283a"/><path d="M0 390H900" stroke="#27455a"/>`; },
    draw(ws) {
      const g = ws.state.x.gas, cfg = ws.rt.cfg, sy = ws.slot('syringe'), pr = ws.slot('pressure'), tp = ws.slot('temp'), bt = ws.slot('bath');
      const r = readings(ws, mode);
      const col = (T) => { const f = Math.min(1, Math.max(0, (T - 270) / 110)); return `hsl(${210 - 200 * f} 80% 58%)`; };
      let s = '';
      if (bt) {
        const wcol = col(g.Tb);
        s += `<rect x="196" y="140" width="468" height="132" rx="8" fill="${wcol}" opacity=".22" stroke="${wcol}" stroke-width="1.5"/><rect x="190" y="276" width="480" height="14" rx="3" fill="#243a4c" stroke="#a9bcc8"/><text x="200" y="285" font-size="9" fill="#ffb454">BỂ ỔN NHIỆT ${bt.params.setpoint} °C · nước ${(g.Tb - T_ZERO_C).toFixed(1)} °C</text>`;
        for (let i = 0; i < 5; i++) s += `<path d="M${230 + i * 90} 262q10-8 20 0t20 0" stroke="${wcol}" fill="none" opacity=".5"/>`;
      }
      if (sy) {
        const L = 4, Vml = g.Vread / G.mL, xr = 620, xp = xr - L * Vml, y0 = 168, hh = 44;
        s += `<rect x="${xr - 400}" y="${y0}" width="400" height="${hh}" rx="3" fill="#162d3d" stroke="#d6e6ef" stroke-width="1.8"/>`;
        s += `<rect x="${xp}" y="${y0 + 1}" width="${xr - xp}" height="${hh - 2}" fill="${col(g.Tg)}" opacity=".16"/>`;
        for (let v = 0; v <= 100; v += 10) { const x = xr - L * v; s += `<path d="M${x} ${y0 + hh}v${v % 50 === 0 ? -9 : -5}" stroke="#d6e6ef" stroke-width="1"/><text x="${x}" y="${y0 + hh + 11}" font-size="8" fill="#8aa3b3" text-anchor="middle">${v}</text>`; }
        s += `<text x="${xr - 200}" y="${y0 - 6}" font-size="9" fill="#8aa3b3" text-anchor="middle">mL</text>`;
        s += `<rect x="${xp - 6}" y="${y0 + 2}" width="8" height="${hh - 4}" fill="#a9bcc8" stroke="#d6e6ef"/><path d="M${xp - 6} ${y0 + hh / 2}H${xp - 70}" stroke="#a9bcc8" stroke-width="6"/><rect x="${xp - 76}" y="${y0 + hh / 2 - 14}" width="8" height="28" rx="2" fill="#a9bcc8"/>`;
        s += `<path d="M${xr} ${y0 + hh / 2}h22" stroke="#d6e6ef" stroke-width="6"/>`;
        for (const p of ws.rt.particles || []) s += `<circle cx="${(xp + 2 + p.x * Math.max(2, xr - xp - 4)).toFixed(1)}" cy="${(y0 + 4 + p.y * (hh - 8)).toFixed(1)}" r="2.2" fill="${col(g.Tg)}"/>`;
        s += `<text x="${(xp + xr) / 2}" y="${y0 + hh / 2 + 4}" font-size="10" fill="#d6e6ef" text-anchor="middle" opacity=".8">KHÍ</text>`;
        if (pr) s += `<path d="M${xr + 22} ${y0 + hh / 2}H690" stroke="#d6e6ef" stroke-width="3"/>`;
        if (tp) s += `<path d="M${xr - 80} 100V${y0 + 22}" stroke="#ffb454" stroke-width="3"/><circle cx="${xr - 80}" cy="${y0 + 22}" r="3.5" fill="#ffb454"/>`;
      }
      if (pr) s += `<rect x="690" y="150" width="150" height="76" rx="8" fill="#243a4c" stroke="#a9bcc8" stroke-width="1.8"/><circle cx="730" cy="188" r="22" fill="#0e1a22" stroke="#d6e6ef"/><path d="M730 188l${(14 * Math.cos(Math.PI * (1.2 - 1.2 * (r.P ? r.P.value / 700 : 0)) )).toFixed(1)} ${(-14 * Math.sin(Math.PI * (1.2 - 1.2 * (r.P ? r.P.value / 700 : 0)))).toFixed(1)}" stroke="#ff6b6b" stroke-width="2"/><rect x="760" y="166" width="72" height="30" rx="3" fill="#0e1a22" stroke="#35d0ba"/><text x="828" y="187" font-size="15" fill="#35d0ba" text-anchor="end" font-family="monospace">${r.P ? r.P.text : '----'}</text><text x="828" y="216" font-size="9" fill="#d6e6ef" text-anchor="end">kPa · CB ÁP SUẤT</text>`;
      if (tp) s += `<rect x="372" y="44" width="130" height="56" rx="8" fill="#243a4c" stroke="#a9bcc8" stroke-width="1.8"/><rect x="384" y="54" width="106" height="26" rx="3" fill="#0e1a22" stroke="#35d0ba"/><text x="484" y="73" font-size="15" fill="#35d0ba" text-anchor="end" font-family="monospace">${r.T ? r.T.text : '----'}</text><text x="437" y="94" font-size="9" fill="#d6e6ef" text-anchor="middle">°C · CB NHIỆT ĐỘ</text>`;
      if (!sy && !pr && !tp && !bt) s += `<text x="450" y="230" text-anchor="middle" fill="#547083" font-size="14">Thả xi lanh và các cảm biến vào các khe trên bàn</text>`;
      return s;
    },

    analyze(ws, { reveal }) {
      const items = [], notes = [], cfg = gasCfg(ws, mode);
      const Tmean = S.mean(ws.colValues('T').filter((v) => v != null));
      if (iso) {
        const P1 = ws.pairs('invV', 'P'), P2 = ws.pairs('V', 'invP');
        if (P1.length < 3) return { items, notes };
        const f = S.linreg(P1.map((p) => p.x), P1.map((p) => p.y));
        if (!f) return { items, notes };
        const Tk = Number.isFinite(Tmean) ? Tmean + T_ZERO_C : T0K;
        const nExp = (f.slope * 1e-3) / (R_GAS * Tk);
        items.push({ label: 'Hệ số góc p–1/V (nRT)', value: `${S.fmtWithUnc(f.slope, f.seSlope)} kPa·mL`, theory: true, ref: `${S.fmtSig(cfg.n * R_GAS * Tk * 1e3, 4)} kPa·mL`, err: `${S.fmtSig(S.pctError(f.slope, cfg.n * R_GAS * Tk * 1e3), 2)} %`, calc: `nRT = hệ số góc = ${S.fmtSig(f.slope, 4)} kPa·mL = ${S.fmtSig(f.slope * 1e-3, 4)} J` });
        items.push({ label: 'Số mol khí n = a/(R·T)', value: `${S.fmtSig(nExp * 1e3, 4)} mmol`, theory: true, ref: `${S.fmtSig(cfg.n * 1e3, 4)} mmol`, err: `${S.fmtSig(S.pctError(nExp, cfg.n), 2)} %`, calc: `n = a/(R·T) = ${S.fmtSig(f.slope * 1e-3, 4)} / (8,314 × ${S.fmtSig(Tk, 4)}) = ${S.fmtSig(nExp * 1e3, 4)} mmol` });
        items.push({ label: 'Hệ số tương quan r (p–1/V)', value: S.fmtSig(f.r, 6), theory: false });
        if (P2.length >= 3) {
          const f2 = S.linreg(P2.map((p) => p.x), P2.map((p) => p.y));
          if (f2 && f2.slope > 0) { const Vd = f2.intercept / f2.slope; items.push({ label: 'Thể tích chết ước lượng V_d (từ 1/p – V)', value: `${S.fmtSig(Vd, 3)} mL`, theory: true, ref: ws.ideal ? '0 mL' : `${S.fmtSig(cfg.Vdead / G.mL, 2)} mL`, err: null, calc: `V_d = tung độ gốc / hệ số góc của đồ thị 1/p – V = ${S.fmtSig(Vd, 3)} mL` }); }
        }
        const PV = ws.colValues('PV').filter((v) => v != null);
        if (PV.length >= 3) items.push({ label: 'p·V thay đổi trên cả khoảng đo', value: `${S.fmtSig((100 * (Math.max(...PV) - Math.min(...PV))) / S.mean(PV), 3)} %`, theory: false, ref: '0 % nếu pV không đổi', err: null });
        if (reveal && !ws.ideal) notes.push('Mô hình thực: thể tích chết V_d khiến p·V đọc được không hoàn toàn không đổi; nén nhanh làm khí nóng lên tạm thời.');
      } else if (isoc) {
        const P = ws.pairs('T', 'P'); if (P.length < 3) return { items, notes };
        const f = S.linreg(P.map((p) => p.x), P.map((p) => p.y)); if (!f) return { items, notes };
        items.push({ label: 'Nhiệt độ không tuyệt đối (giao trục t)', value: `${S.fmtWithUnc(f.xIntercept, f.seXIntercept)} °C`, theory: true, ref: '−273,15 °C', err: `${S.fmtSig(Math.abs(f.xIntercept + T_ZERO_C), 2)} °C`, calc: `t₀ = −b/a = ${S.fmtSig(f.xIntercept, 4)} °C` });
        items.push({ label: 'Hệ số góc p–t', value: `${S.fmtWithUnc(f.slope, f.seSlope)} kPa/°C`, theory: true, ref: `${S.fmtSig(cfg.n * R_GAS / (60e-6 + cfg.Vdead) / 1000, 4)} kPa/K`, err: null });
        items.push({ label: 'Hệ số tương quan r', value: S.fmtSig(f.r, 6), theory: false });
      } else {
        const P = ws.pairs('T', 'V'); if (P.length < 3) return { items, notes };
        const f = S.linreg(P.map((p) => p.x), P.map((p) => p.y)); if (!f) return { items, notes };
        const k = (cfg.n * R_GAS / cfg.Pext) / G.mL; // mL/K
        const refT = -T_ZERO_C + (cfg.Vdead / G.mL) / k;
        items.push({ label: 'Nhiệt độ không tuyệt đối (giao trục t)', value: `${S.fmtWithUnc(f.xIntercept, f.seXIntercept)} °C`, theory: true, ref: ws.ideal ? '−273,15 °C' : `${S.fmtSig(refT, 4)} °C (đã xét V_chết = ${S.fmtSig(cfg.Vdead / G.mL, 2)} mL); lý tưởng: −273,15 °C`, err: `${S.fmtSig(Math.abs(f.xIntercept + T_ZERO_C), 2)} °C so với −273,15`, calc: `t₀ = −b/a = ${S.fmtSig(f.xIntercept, 4)} °C` });
        items.push({ label: 'Hệ số góc V–t', value: `${S.fmtWithUnc(f.slope, f.seSlope)} mL/°C`, theory: true, ref: `${S.fmtSig(k, 4)} mL/K`, err: `${S.fmtSig(S.pctError(f.slope, k), 2)} %` });
        items.push({ label: 'Hệ số tương quan r', value: S.fmtSig(f.r, 6), theory: false });
        if (reveal && !ws.ideal) notes.push('V đọc trên xi lanh không gồm thể tích chết của ống nối: V_đọc = k·T − V_d, nên giao điểm với trục t lệch về phía nhiệt độ cao hơn −273,15 °C.');
      }
      return { items, notes };
    },
  };
}

export const boyle = makeGas('isothermal');
export const gaylussac = makeGas('isochoric');
export const charles = makeGas('isobaric');
export { P_ATM };
