// Đo nhiệt dung riêng của kim loại bằng phương pháp nhiệt lượng kế (cân bằng nhiệt có thất thoát và quán tính của đầu dò).
import { h } from '../ui/dom.js';
import { INSTRUMENTS } from '../core/instruments.js';
import * as S from '../core/stats.js';

export const ROOM = 22, CW = 4186; // °C, J/(kg·K)
export const MATERIALS = [{ name: 'nhôm', c: 900 }, { name: 'sắt', c: 450 }, { name: 'đồng', c: 385 }, { name: 'chì', c: 130 }];

/** Nhiệt độ cân bằng lý tưởng khi thả mẫu (m_s, c, T1) vào nước (m_w, T0) + nhiệt lượng kế (C_cal), không thất thoát. */
export const equilibrium = ({ mw, T0, ms, c, T1, Ccal = 0 }) => { const Cw = mw * CW + Ccal, Cs = ms * c; return (Cw * T0 + Cs * T1) / (Cw + Cs); };

/** Tiến trạng thái thêm dt giây (bước con 0,1 s). Hai vật trao đổi nhiệt với hằng số thời gian tauS; nước mất nhiệt ra phòng chậm (tauLoss). */
export function stepState(p, st, dt) {
  const n = Math.max(1, Math.ceil(dt / 0.1)), d = dt / n; let { Ts, Tw, Tb, Tp } = st;
  const Cw = (p.mw / 1000) * CW + p.Ccal, Cs = (p.ms / 1000) * p.c;
  for (let i = 0; i < n; i++) {
    Tb = p.tauBath > 0 ? p.Tset + (Tb - p.Tset) * Math.exp(-d / p.tauBath) : p.Tset;
    if (st.loc === 'cal') {
      const q = (Ts - Tw) / p.tauS; // K/s
      const dTs = -q, dTw = (Cs / Cw) * q - (p.tauLoss > 0 ? (Tw - ROOM) / p.tauLoss : 0);
      Ts += dTs * d; Tw += dTw * d;
    } else {
      const Tt = st.loc === 'bath' ? Tb : ROOM; Ts = p.tauHeat > 0 ? Tt + (Ts - Tt) * Math.exp(-d / p.tauHeat) : Tt;
      if (p.tauLoss > 0) Tw = ROOM + (Tw - ROOM) * Math.exp(-d / p.tauLoss);
    }
    const target = st.probe === 'bath' ? Tb : Tw;
    Tp = p.tauProbe > 0 ? target + (Tp - target) * Math.exp(-d / p.tauProbe) : target;
  }
  return { ...st, Ts, Tw, Tb, Tp };
}

const matOf = (ws) => ws.hidden('mat', (r) => Math.min(3, Math.floor(r.uniform() * 4)));
const cOf = (ws) => MATERIALS[matOf(ws)].c * (ws.ideal ? 1 : 1 + ws.hidden('cj', (r) => r.range(-0.02, 0.02)));
const CcalOf = (ws) => (ws.ideal ? 0 : ws.hidden('Ccal', (r) => r.range(20, 40)));
const bath = (ws) => ws.slot('bath');
function params(ws) {
  const cal = ws.slot('cal'), sm = ws.slot('sample'), id = ws.ideal;
  return { mw: cal ? cal.params.mw : 150, ms: sm ? sm.params.ms : 150, c: cOf(ws), Ccal: CcalOf(ws), Tset: bath(ws) ? bath(ws).params.setpoint : ROOM,
    tauBath: id ? 0 : 25, tauHeat: id ? 5 : 45, tauS: id ? 4 : 20, tauLoss: id ? 0 : 1500, tauProbe: id ? 0 : 3 };
}
const init0 = () => ({ loc: 'bench', Ts: ROOM, Tw: ROOM, Tb: ROOM, Tp: ROOM, probe: 'water', cap: {} });
const sx = (ws) => ws.state.x.cal;
const need = (ws) => [['cal', 'nhiệt lượng kế'], ['sample', 'mẫu kim loại'], ['bath', 'bể ổn nhiệt'], ['temp', 'cảm biến nhiệt độ'], ['balance', 'cân điện tử']].filter(([k]) => !ws.slot(k)).map(([, n]) => n);
const probeRead = (ws) => ws.read(INSTRUMENTS.tempSensor, sx(ws).Tp, {}, 'tempSensor');

const meta = {
  id: 'calorimetry', lab: 'therm', topic: 'Nhiệt học cơ bản', title: 'Nhiệt dung riêng và phương trình cân bằng nhiệt', level: 2, minutes: 35,
  tags: ['nhiệt dung riêng', 'cân bằng nhiệt', 'nhiệt lượng kế', 'nhiệt lượng', 'kim loại'],
  objective: ['Đo nhiệt dung riêng của một kim loại bằng nhiệt lượng kế.', 'Vận dụng phương trình cân bằng nhiệt Q_tỏa = Q_thu.', 'Nhận biết sai số do thất thoát nhiệt, nhiệt dung của nhiệt lượng kế và quán tính của đầu dò; xác định chất liệu mẫu.'],
  question: 'Nhiệt dung riêng của mẫu kim loại này là bao nhiêu, và nó làm từ kim loại gì?',
  theory: `<p>Khi hai vật trao đổi nhiệt trong hệ cô lập, đến lúc cân bằng: <i>Q</i><sub>tỏa</sub> = <i>Q</i><sub>thu</sub>. Với mẫu kim loại (<i>m</i><sub>s</sub>, nhiệt độ đầu <i>T</i><sub>1</sub>, nhiệt dung riêng <i>c</i>) thả vào nước (<i>m</i><sub>w</sub>, <i>c</i><sub>w</sub> = 4186 J/kg·K, nhiệt độ đầu <i>T</i><sub>0</sub>), nhiệt độ cuối <i>T</i><sub>f</sub>:</p>
    <p><i>m</i><sub>s</sub>·<i>c</i>·(<i>T</i><sub>1</sub> − <i>T</i><sub>f</sub>) = <i>m</i><sub>w</sub>·<i>c</i><sub>w</sub>·(<i>T</i><sub>f</sub> − <i>T</i><sub>0</sub>) ⇒ <i>c</i> = <i>m</i><sub>w</sub><i>c</i><sub>w</sub>(<i>T</i><sub>f</sub> − <i>T</i><sub>0</sub>) / [<i>m</i><sub>s</sub>(<i>T</i><sub>1</sub> − <i>T</i><sub>f</sub>)].</p>
    <p>Vẽ <i>Q</i><sub>thu</sub> theo <i>m</i><sub>s</sub>(<i>T</i><sub>1</sub> − <i>T</i><sub>f</sub>): hệ số góc là <i>c</i>.</p>
    <p>Sai số thực tế: nhiệt lượng kế và que khuấy cũng thu nhiệt (làm <i>c</i> đo được thấp hơn), nhiệt thoát ra ngoài, mẫu nguội đi khi chuyển từ bể sang cốc, đầu dò có quán tính nhiệt. Bảng tham khảo (J/kg·K): nhôm ≈ 900, sắt ≈ 450, đồng ≈ 385, chì ≈ 130.</p>`,
  apparatus: [{ text: 'Nhiệt lượng kế chứa nước', ids: ['calorimeter'] }, { text: 'Mẫu kim loại', ids: ['metalSample'] }, { text: 'Bể ổn nhiệt (làm nóng mẫu)', ids: ['waterBath'] }, { text: 'Cảm biến nhiệt độ', ids: ['tempSensor'] }, { text: 'Cân điện tử', ids: ['balance'] }],
  procedure: [
    { t: 'Lắp nhiệt lượng kế, mẫu kim loại, bể ổn nhiệt, cảm biến nhiệt độ và cân lên bàn.', done: (ws) => need(ws).length === 0 },
    { t: 'Đặt nhiệt độ bể (khoảng 80–95 °C) rồi «Nhúng mẫu vào bể» và chờ mẫu nóng đều.', done: (ws) => sx(ws).loc !== 'bench' },
    { t: 'Đặt đầu dò vào nước, chờ ổn định rồi «Chốt T₀». Chuyển đầu dò sang bể, chờ ổn định rồi «Chốt T₁».' },
    { t: '«Chuyển mẫu sang nhiệt lượng kế», đầu dò đặt vào nước, chờ nhiệt độ đạt cực đại và ổn định rồi «Chốt T_f và ghi hàng».', done: (ws) => ws.state.rows.length >= 1 },
    { t: 'Làm ít nhất 5 lần với khối lượng nước/mẫu và nhiệt độ bể khác nhau.', done: (ws) => ws.state.rows.length >= 5 },
    { t: 'Vẽ đồ thị Q_thu – m_s·ΔT_mẫu, đọc hệ số góc c và nhận diện kim loại.' },
  ],
  predict: { q: 'Hai khối kim loại cùng khối lượng, cùng nóng 90 °C được thả vào hai cốc nước giống hệt (cùng 22 °C). Kim loại có nhiệt dung riêng lớn hơn sẽ làm nước nóng lên:', options: ['Nhiều hơn', 'Ít hơn', 'Như nhau', 'Không thể biết'], correct: 0, explain: 'Cùng khối lượng và cùng độ giảm nhiệt thì kim loại có c lớn hơn tỏa ra nhiều nhiệt lượng hơn, nên nước thu nhiều nhiệt hơn và nóng lên nhiều hơn.' },
  questions: [
    { q: 'Sau khi thả mẫu nóng vào nước, đến khi cân bằng nhiệt thì:', type: 'choice', options: ['Mẫu và nước có cùng nhiệt độ; nhiệt tỏa ra bằng nhiệt thu vào', 'Mẫu nguội về 0 °C', 'Nước luôn nóng hơn mẫu', 'Nhiệt lượng tăng lên'], answer: 0, explain: 'Hệ cô lập: Q_tỏa = Q_thu và T_mẫu = T_nước.' },
    { q: 'Thả 200 g chì (c = 130 J/kg·K) ở 100 °C vào 100 g nước 20 °C (bỏ qua nhiệt lượng kế). Nhiệt độ cân bằng khoảng bao nhiêu °C?', type: 'num', unit: '°C', answer: 31.7, tol: 0.5, explain: '0,2·130·(100 − T) = 0,1·4186·(T − 20) ⇒ T ≈ 31,7 °C.' },
    { q: 'Nếu bỏ qua nhiệt dung của nhiệt lượng kế, giá trị c tính được sẽ:', type: 'choice', options: ['Thấp hơn giá trị thật', 'Cao hơn giá trị thật', 'Bằng giá trị thật', 'Không xác định'], answer: 0, explain: 'Một phần nhiệt do mẫu tỏa ra làm nóng cốc, ta tưởng chỉ nước thu nhiệt nên đánh giá Q_thu thiếu → c thấp.' },
    { q: 'Vì sao nên chờ nhiệt độ nước ổn định rồi mới đọc T_f?', type: 'choice', options: ['Mẫu và nước chưa cân bằng, đầu dò còn chậm hơn nhiệt độ thật', 'Nhiệt kế chưa bật', 'T_f không phụ thuộc thời gian', 'Để nước sôi'], answer: 0, explain: 'Mẫu cần ~vài chục giây để truyền nhiệt và đầu dò có quán tính; đọc sớm sẽ thấp hơn T_f thật. Đọc quá muộn lại bị thất thoát nhiệt ra ngoài.' },
  ],
  hints: ['Mẫu và bể cần vài phút (mô phỏng) để cân bằng; hãy tăng tốc độ mô phỏng nhưng vẫn quan sát số chỉ đầu dò ngừng thay đổi.', 'T₀ đo ở nước TRƯỚC khi thả mẫu; T₁ đo ở bể khi mẫu đã nóng đều (đầu dò chuyển sang chế độ «bể»).', 'Dùng đồ thị Q_thu – m_s·ΔT_mẫu và bảng c ở phần lý thuyết để nhận diện kim loại; c đo được thường thấp hơn thật vài %.'],
  conclusion: '<p>Phương trình cân bằng nhiệt <i>Q</i><sub>tỏa</sub> = <i>Q</i><sub>thu</sub> cho phép xác định nhiệt dung riêng của mẫu: <i>c</i> = <i>m</i><sub>w</sub><i>c</i><sub>w</sub>(<i>T</i><sub>f</sub> − <i>T</i><sub>0</sub>)/[<i>m</i><sub>s</sub>(<i>T</i><sub>1</sub> − <i>T</i><sub>f</sub>)]. So sánh giá trị đo với bảng nhiệt dung riêng cho biết chất liệu. Kết quả thường thấp hơn giá trị thật vì nhiệt lượng kế thu nhiệt và có thất thoát ra môi trường.</p>',
  minRows: 5,
};

const columns = [
  { key: 'mw', label: 'Khối lượng nước (cân)', symbol: 'm_w', unit: 'g', sig: 4 },
  { key: 'ms', label: 'Khối lượng mẫu (cân)', symbol: 'm_s', unit: 'g', sig: 4 },
  { key: 'T0', label: 'Nhiệt độ đầu của nước', symbol: 'T₀', unit: '°C', sig: 4 },
  { key: 'T1', label: 'Nhiệt độ đầu của mẫu (bằng bể)', symbol: 'T₁', unit: '°C', sig: 4 },
  { key: 'Tf', label: 'Nhiệt độ cân bằng', symbol: 'T_f', unit: '°C', sig: 4 },
  { key: 'Qw', label: 'Nhiệt lượng nước thu', symbol: 'Q_thu', unit: 'J', sig: 4, calc: (v) => (v.mw / 1000) * CW * (v.Tf - v.T0), formula: 'm_w·c_w·(T_f − T₀)' },
  { key: 'X', label: 'm_s·(T₁ − T_f)', symbol: 'm_s·ΔT', unit: 'kg·K', sig: 4, calc: (v) => (v.ms / 1000) * (v.T1 - v.Tf), formula: 'm_s·(T₁ − T_f)' },
  { key: 'c', label: 'Nhiệt dung riêng của mẫu', symbol: 'c', unit: 'J/(kg·K)', sig: 4, calc: (v) => ((v.mw / 1000) * CW * (v.Tf - v.T0)) / ((v.ms / 1000) * (v.T1 - v.Tf)), formula: 'Q_thu / [m_s·(T₁ − T_f)]' },
];

export default {
  meta, kind: 'slots', columns,
  library: ['calorimeter', 'metalSample', 'waterBath', 'tempSensor', 'balance', 'syringe', 'pressureSensor'],
  reject: { syringe: 'xi lanh khí không dùng trong thí nghiệm nhiệt lượng này.', pressureSensor: 'không cần đo áp suất khi đo nhiệt dung riêng của chất rắn.' },
  slots: {
    bath: { label: 'Bể ổn nhiệt', accepts: ['waterBath'], rect: [50, 190, 260, 190] },
    cal: { label: 'Nhiệt lượng kế', accepts: ['calorimeter'], rect: [500, 190, 190, 190] },
    sample: { label: 'Mẫu kim loại', accepts: ['metalSample'], rect: [340, 30, 120, 110] },
    temp: { label: 'Cảm biến nhiệt độ', accepts: ['tempSensor'], rect: [700, 20, 170, 90] },
    balance: { label: 'Cân điện tử', accepts: ['balance'], rect: [710, 300, 170, 80] },
  },
  settings: [
    { key: 'speed', label: 'Tốc độ mô phỏng thời gian', type: 'select', options: [{ v: 1, label: '1×' }, { v: 5, label: '5×' }, { v: 20, label: '20×' }, { v: 60, label: '60×' }], default: 20 },
  ],
  graphs: [{ label: 'Q_thu – m_s·ΔT  (hệ số góc = c)', x: 'X', y: 'Qw', origin: true }, { label: 'c qua các lần đo', x: 'ms', y: 'c', origin: false }],
  liveParams: ['setpoint'],

  init(ws) { if (!ws.state.x.cal) ws.state.x.cal = init0(); ws.rt = {}; },
  onChange(ws) { const s = sx(ws); if (s.loc === 'bath' && !ws.slot('bath')) s.loc = 'bench'; if (s.loc !== 'bench' && !ws.slot('sample')) s.loc = 'bench'; if (s.loc === 'cal' && !ws.slot('cal')) s.loc = 'bench'; },
  onMode(ws) { const s = sx(ws); if (ws.ideal) Object.assign(s, { Tb: params(ws).Tset, Tp: s.probe === 'bath' ? params(ws).Tset : s.Tw }); },
  onParam(ws, it, key) { if (it.id === 'calorimeter' && sx(ws).loc === 'cal') return 'Không đổi lượng nước khi mẫu đã ở trong nhiệt lượng kế.'; if (it.id === 'metalSample' && sx(ws).loc !== 'bench') return 'Hãy lấy mẫu ra trước khi đổi khối lượng.'; return undefined; },
  status(ws) {
    const n = need(ws); if (n.length) return { text: `Cần đặt thêm: ${n.join(', ')}.`, kind: 'warn' };
    const s = sx(ws), p = params(ws);
    if (s.loc === 'cal') return Math.abs(s.Ts - s.Tw) > 0.1 ? { text: 'Mẫu và nước chưa cân bằng nhiệt – chờ.', kind: 'warn' } : { text: 'Đã cân bằng nhiệt – chốt T_f.', kind: 'ok' };
    if (s.loc === 'bath') return Math.abs(s.Ts - s.Tb) > 0.3 || Math.abs(s.Tb - p.Tset) > 0.3 ? { text: 'Mẫu/bể đang nóng lên – chờ ổn định.', kind: 'warn' } : { text: 'Mẫu đã nóng đều bằng nhiệt độ bể.', kind: 'ok' };
    return { text: 'Mẫu đang ở trên bàn (nhiệt độ phòng).', kind: 'ok' };
  },
  readouts(ws) {
    const o = [], s = sx(ws);
    if (ws.slot('temp')) { const r = probeRead(ws); o.push({ label: `Đầu dò (đang đo: ${s.probe === 'water' ? 'nước' : 'bể'})`, text: `${r.text} °C` }); }
    if (ws.slot('balance')) {
      if (ws.slot('cal')) o.push({ label: 'Cân: nước trong cốc', text: `${ws.read(INSTRUMENTS.balance, ws.slot('cal').params.mw / 1000, {}, 'balance').text} kg` });
      if (ws.slot('sample')) o.push({ label: 'Cân: mẫu kim loại', text: `${ws.read(INSTRUMENTS.balance, ws.slot('sample').params.ms / 1000, {}, 'balance').text} kg` });
    }
    if (bath(ws)) o.push({ label: 'Bể ổn nhiệt (đặt)', text: `${bath(ws).params.setpoint} °C` });
    o.push({ label: 'Mẫu đang ở', text: { bench: 'trên bàn', bath: 'trong bể nóng', cal: 'trong nhiệt lượng kế' }[s.loc] });
    if (s.cap.T0 != null || s.cap.T1 != null) o.push({ label: 'Đã chốt', text: `T₀ = ${s.cap.T0 ?? '—'} °C · T₁ = ${s.cap.T1 ?? '—'} °C` });
    return o;
  },
  controls(ws, el) {
    const ui = ws.rt.ui = {}, s = sx(ws);
    const sel = h('select', { 'aria-label': 'Đầu dò đo ở' }, [['water', 'Nước trong nhiệt lượng kế'], ['bath', 'Bể ổn nhiệt']].map(([v, t]) => h('option', { value: v, selected: v === s.probe }, t)));
    sel.addEventListener('change', () => { sx(ws).probe = sel.value; ws.log(`Chuyển đầu dò sang ${sel.value === 'water' ? 'nước trong nhiệt lượng kế' : 'bể ổn nhiệt'}.`); ws.changed(); });
    const b = (txt, fn, cls = 'btn') => h('button', { class: cls, onClick: fn }, txt);
    el.append(h('label', { class: 'pc' }, h('span', { class: 'pc-l' }, 'Đầu dò đặt ở'), h('span', { class: 'pc-r' }, sel)),
      h('div', { class: 'btn-row' }, b('Nhúng mẫu vào bể', () => this.move(ws, 'bath')), b('Chuyển mẫu sang nhiệt lượng kế', () => this.move(ws, 'cal')), b('Lấy mẫu ra bàn', () => this.move(ws, 'bench'))),
      h('div', { class: 'btn-row' }, b('Chốt T₀ (nước)', () => this.cap(ws, 'T0')), b('Chốt T₁ (mẫu = bể)', () => this.cap(ws, 'T1'))),
      h('div', { class: 'btn-row' }, b('Chốt T_f và ghi hàng', () => this.record(ws), 'btn accent'), b('Làm mới nước', () => this.reset(ws), 'btn ghost')),
      h('p', { class: 'mute sm' }, 'Khuấy nhẹ đã được mô phỏng. Chờ số chỉ ổn định trước khi chốt.'));
  },
  move(ws, to) {
    const s = sx(ws); if (!ws.slot('sample')) { ws.toast('Hãy đặt mẫu kim loại lên bàn.', 'warn'); return; }
    if (to === 'bath' && !bath(ws)) { ws.toast('Hãy đặt bể ổn nhiệt lên bàn.', 'warn'); return; }
    if (to === 'cal') {
      if (!ws.slot('cal')) { ws.toast('Hãy đặt nhiệt lượng kế lên bàn.', 'warn'); return; }
      if (s.cap.T0 == null) ws.toast('Bạn chưa chốt T₀ của nước – hãy làm trước khi thả mẫu.', 'warn', 4500);
      if (!ws.ideal && s.loc !== 'cal') s.Ts = ROOM + (s.Ts - ROOM) * 0.985; // mẫu nguội đi khi chuyển
    }
    s.loc = to; ws.log(`Mẫu chuyển tới: ${{ bench: 'bàn', bath: 'bể nóng', cal: 'nhiệt lượng kế' }[to]} (T_mẫu ≈ ${s.Ts.toFixed(1)} °C, giá trị thật).`.replace(/ \(T_mẫu.*\)/, '')); ws.changed();
  },
  cap(ws, key) {
    const s = sx(ws); if (!ws.slot('temp')) { ws.toast('Cần cảm biến nhiệt độ.', 'warn'); return; }
    if (key === 'T0') { if (s.loc === 'cal') { ws.toast('T₀ phải đo trước khi thả mẫu vào nước.', 'warn'); return; } if (s.probe !== 'water') { ws.toast('Đặt đầu dò ở «Nước trong nhiệt lượng kế» để chốt T₀.', 'warn'); return; } if (!ws.slot('cal')) { ws.toast('Cần nhiệt lượng kế.', 'warn'); return; } }
    if (key === 'T1') { if (s.probe !== 'bath' || !bath(ws)) { ws.toast('Đặt đầu dò ở «Bể ổn nhiệt» để chốt T₁.', 'warn'); return; } if (s.loc !== 'bath') { ws.toast('Mẫu phải đang ở trong bể để T₁ có nghĩa.', 'warn'); return; } if (Math.abs(s.Ts - s.Tb) > 0.3) ws.toast('Mẫu chưa nóng đều bằng nhiệt độ bể: T₁ sẽ sai.', 'warn', 4500); }
    if (!ws.requirePrediction()) return;
    const r = probeRead(ws); if (r.over) { ws.toast('Đầu dò ngoài thang đo.', 'warn'); return; }
    s.cap[key] = r.value; ws.log(`Chốt ${key} = ${r.text} °C.`); ws.changed();
  },
  record(ws) {
    const s = sx(ws), n = need(ws); if (n.length) { ws.toast(`Chưa thể ghi: thiếu ${n.join(', ')}.`, 'warn'); return; }
    if (s.loc !== 'cal') { ws.toast('Mẫu phải đang ở trong nhiệt lượng kế.', 'warn'); return; }
    if (s.cap.T0 == null || s.cap.T1 == null) { ws.toast('Cần chốt T₀ và T₁ trước.', 'warn'); return; }
    if (s.probe !== 'water') { ws.toast('Đặt đầu dò ở nước để đọc T_f.', 'warn'); return; }
    if (!ws.requirePrediction()) return;
    if (Math.abs(s.Ts - s.Tw) > 0.1 || Math.abs(s.Tp - s.Tw) > 0.15) ws.toast('Chưa cân bằng: T_f đọc được còn thấp hơn giá trị thật.', 'warn', 4500);
    const tf = probeRead(ws), mw = ws.read(INSTRUMENTS.balance, ws.slot('cal').params.mw / 1000, {}, 'balance'), ms = ws.read(INSTRUMENTS.balance, ws.slot('sample').params.ms / 1000, {}, 'balance');
    ws.addRow({ mw: mw.value * 1000, ms: ms.value * 1000, T0: s.cap.T0, T1: s.cap.T1, Tf: tf.value }); s.cap = {};
  },
  reset(ws) { const keep = sx(ws).probe; ws.state.x.cal = { ...init0(), probe: keep, Tb: params(ws).Tset }; ws.log('Thay nước mới ở nhiệt độ phòng, mẫu để lại trên bàn.'); ws.changed(); },
  frame(ws, dt) {
    const s = sx(ws), p = params(ws), sp = ws.setting('speed') || 1;
    const nx = stepState(p, s, dt * sp), mv = Math.abs(nx.Ts - s.Ts) + Math.abs(nx.Tw - s.Tw) + Math.abs(nx.Tb - s.Tb) + Math.abs(nx.Tp - s.Tp);
    ws.state.x.cal = nx; if (mv > 1e-7) { ws.save(); ws.updateReadouts(); }
    return true;
  },
  background() { return `<rect width="900" height="420" fill="#101d28"/><rect y="390" width="900" height="30" fill="#16283a"/><path d="M0 390H900" stroke="#27455a"/>`; },
  draw(ws) {
    const s = sx(ws), bt = bath(ws), cal = ws.slot('cal'), sm = ws.slot('sample'), tp = ws.slot('temp'), bl = ws.slot('balance');
    const col = (T) => `hsl(${210 - 200 * Math.min(1, Math.max(0, (T - 10) / 90))} 80% 55%)`; let o = '';
    if (bt) o += `<rect x="70" y="200" width="220" height="160" rx="8" fill="${col(s.Tb)}" opacity=".28" stroke="${col(s.Tb)}" stroke-width="2"/><rect x="60" y="360" width="240" height="14" rx="3" fill="#243a4c" stroke="#a9bcc8"/><text x="180" y="190" font-size="11" text-anchor="middle" fill="#d6e6ef">Bể ${bt.params.setpoint} °C (thật ${s.Tb.toFixed(1)})</text>`;
    if (cal) { const lv = 120 + 0.12 * (300 - cal.params.mw) * 0.2; o += `<rect x="520" y="${200}" width="150" height="160" rx="6" fill="#162d3d" stroke="#d6e6ef" stroke-width="2"/><rect x="522" y="${210 + (300 - cal.params.mw) / 4}" width="146" height="${148 - (300 - cal.params.mw) / 4}" fill="${col(s.Tw)}" opacity=".4"/><text x="595" y="190" font-size="11" text-anchor="middle" fill="#d6e6ef">Nhiệt lượng kế: ${cal.params.mw} g nước</text>`; }
    if (sm) {
      const pos = s.loc === 'bath' && bt ? [180, 270] : s.loc === 'cal' && cal ? [595, 300] : [400, 100];
      const size = 14 + sm.params.ms / 20;
      o += `<path d="M${pos[0]} ${pos[1] - size - 40}V${pos[1] - size}" stroke="#a9bcc8"/><rect x="${pos[0] - size}" y="${pos[1] - size}" width="${size * 2}" height="${size * 2}" rx="4" fill="${col(s.Ts)}" stroke="#d6e6ef" stroke-width="1.6"/><text x="${pos[0]}" y="${pos[1] + 4}" font-size="10" text-anchor="middle" fill="#0e1a22" font-weight="700">${sm.params.ms} g</text>`;
    }
    if (tp) {
      const r = probeRead(ws), px = s.probe === 'bath' && bt ? 120 : 640, py = s.probe === 'bath' && bt ? 300 : 290;
      o += `<path d="M${px} 215V${py}" stroke="#ffb454" stroke-width="3"/><circle cx="${px}" cy="${py}" r="4" fill="#ffb454"/><path d="M${px} 215L760 112" stroke="#ffb454" stroke-width="1.2" opacity=".5"/>`;
      o += `<rect x="715" y="40" width="150" height="56" rx="8" fill="#243a4c" stroke="#a9bcc8" stroke-width="1.8"/><rect x="726" y="50" width="100" height="26" rx="3" fill="#0e1a22" stroke="#35d0ba"/><text x="820" y="70" font-size="17" fill="#35d0ba" text-anchor="end" font-family="monospace">${r.text}</text><text x="838" y="70" font-size="10" fill="#d6e6ef">°C</text><text x="790" y="90" font-size="9" fill="#d6e6ef" text-anchor="middle">đầu dò: ${s.probe === 'bath' ? 'bể' : 'nước'}</text>`;
    }
    if (bl) o += `<rect x="718" y="340" width="150" height="36" rx="6" fill="#243a4c" stroke="#a9bcc8" stroke-width="1.6"/><text x="793" y="363" font-size="12" fill="#35d0ba" text-anchor="middle" font-family="monospace">${sm ? ws.read(INSTRUMENTS.balance, sm.params.ms / 1000, {}, 'balance').text + ' kg' : '0.0000 kg'}</text>`;
    return o;
  },
  analyze(ws, { reveal }) {
    const items = [], notes = [], rows = ws.includedRows().filter((r) => r.vals.c != null && Number.isFinite(ws.cell(r, columns[7])));
    const cs = rows.map((r) => ws.cell(r, columns[7])).filter(Number.isFinite); if (cs.length < 2) return { items, notes };
    const ctrue = cOf(ws), u = S.uncertainty(cs, 0);
    items.push({ label: 'c trung bình các lần đo', value: `${S.fmtWithUnc(u.mean, u.U)} J/(kg·K)`, theory: true, ref: `${S.fmtSig(ctrue, 4)} J/(kg·K)`, err: `${S.fmtSig(S.pctError(u.mean, ctrue), 2)} %`, calc: `trung bình ${cs.length} lần đo, độ không đảm bảo 95 %.` });
    const P = ws.pairs('X', 'Qw');
    if (P.length >= 3) { const f = S.linreg(P.map((p) => p.x), P.map((p) => p.y)); if (f) { items.push({ label: 'c từ hệ số góc Q_thu – m_s·ΔT', value: `${S.fmtWithUnc(f.slope, f.seSlope)} J/(kg·K)`, theory: true, ref: `${S.fmtSig(ctrue, 4)} J/(kg·K)`, err: `${S.fmtSig(S.pctError(f.slope, ctrue), 2)} %` }); items.push({ label: 'Hệ số tương quan r', value: S.fmtSig(f.r, 6), theory: false }); } }
    const near = MATERIALS.reduce((a, b) => (Math.abs(b.c - u.mean) < Math.abs(a.c - u.mean) ? b : a));
    items.push({ label: 'Kim loại gần nhất trong bảng', value: near.name, theory: false });
    if (reveal && !ws.ideal) notes.push(`Mô hình thực: nhiệt lượng kế có nhiệt dung ≈ ${S.fmtSig(CcalOf(ws), 2)} J/K làm c đo thấp hơn thật; mẫu nguội ~1,5 % khi chuyển; nước mất nhiệt ra phòng với hằng số thời gian ~25 phút.`);
    if (reveal) notes.push(`Mẫu thật là ${MATERIALS[matOf(ws)].name}.`);
    return { items, notes };
  },
};
