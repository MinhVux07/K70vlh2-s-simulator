// Định luật Ohm và đặc tuyến V–I: bàn lắp mạch tự do + bộ giải mạch MNA (điện trở, biến trở, đèn, điốt, pin có điện trở trong).
import { h } from '../ui/dom.js';
import { INSTRUMENTS } from '../core/instruments.js';
import { solveDC, TERMINALS } from '../core/circuit.js';
import * as S from '../core/stats.js';

const TYPE = { dcSource: 'source', battery: 'battery', resistor: 'resistor', rheostat: 'rheostat', bulb: 'bulb', diode: 'diode', switch: 'switch', ammeter: 'ammeter', voltmeter: 'voltmeter' };

/** Dựng mạch cho bộ giải. theory=true: giá trị danh định + dụng cụ đo lý tưởng (dùng làm "giá trị lý thuyết"). */
export function buildCircuit(ws, theory = false) {
  const ideal = ws.ideal || theory;
  const components = ws.state.placed.map((it) => {
    const p = it.params;
    const c = { id: it.uid, type: TYPE[it.id], p: {} };
    switch (it.id) {
      case 'dcSource': c.p = { E: p.E, r: ideal ? 0 : 0.5 }; break;
      case 'battery': c.p = { E: 4.5 * (1 + ws.hidden('bE:' + it.uid, (r) => r.range(-0.04, 0.04))), r: 1.8 * (1 + ws.hidden('br:' + it.uid, (r) => r.range(-0.12, 0.12))) }; break;
      case 'resistor': { const tol = ideal ? 0 : ws.hidden('tol:' + it.uid, (r) => r.range(-0.05, 0.05)); c.p = { R: p.R * (1 + tol) }; break; }
      case 'rheostat': c.p = { R: Math.max(0.01, (p.pos / 100) * 100 + (ideal ? 0 : 0.3)) }; break;
      case 'switch': c.p = { closed: !!p.closed, rClosed: ideal ? 0 : 0.05 }; break;
      case 'ammeter': c.p = { Ra: ideal ? 0 : 0.2 / Number(p.range) }; break;
      case 'voltmeter': c.p = { Rv: ideal ? Infinity : 1e7 }; break;
      default: break;
    }
    return c;
  });
  return { components, wires: ws.state.wires };
}

const wired = (ws, uid, t) => ws.state.wires.some(([a, b]) => a === `${uid}:${t}` || b === `${uid}:${t}`);

export function recompute(ws) {
  const rt = ws.rt;
  rt.reads = rt.reads || {};
  const circ = buildCircuit(ws);
  let res;
  try { res = circ.components.length ? solveDC(circ) : { ok: true, comp: {} }; } catch (e) { res = { ok: false, error: 'Lỗi giải mạch: ' + e.message }; }
  rt.sol = res; rt.circuitError = res.ok ? null : res.error;
  rt.warns = [];
  const reads = {};
  for (const it of ws.state.placed) {
    const c = res.ok ? res.comp[it.uid] : null;
    if (it.id === 'ammeter' || it.id === 'voltmeter') {
      const connected = wired(ws, it.uid, 'p') && wired(ws, it.uid, 'n');
      if (!c || !connected) { reads[it.uid] = { text: '----', value: null, over: false, off: true }; continue; }
      const truth = it.id === 'ammeter' ? c.i : c.v;
      const r = ws.read(INSTRUMENTS[it.id], truth, it.params, it.uid);
      reads[it.uid] = r;
      if (r.over) rt.warns.push(`${it.uid}: ${it.id === 'ammeter' ? 'dòng' : 'điện áp'} vượt thang đo (OL)`);
      if (it.id === 'ammeter' && r.over && Math.abs(truth) > 10) rt.warns.push(`${it.uid}: dòng rất lớn – ampe kế có thể đang bị mắc song song`);
    }
    if (c && it.id === 'resistor' && Math.abs(c.power) > INSTRUMENTS.resistor.powerRating) rt.warns.push(`${it.uid}: quá công suất 0,5 W (${(Math.abs(c.power)).toFixed(2)} W)`);
    if (c && it.id === 'bulb' && Math.abs(c.v) > 8) rt.warns.push(`${it.uid}: hiệu điện thế ${Math.abs(c.v).toFixed(1)} V vượt định mức nhiều lần`);
    if (c && it.id === 'battery' && Math.abs(c.i) > 1.2) rt.warns.push(`${it.uid}: dòng ${Math.abs(c.i).toFixed(1)} A – pin gần như bị đoản mạch`);
    if (c && it.id === 'dcSource' && Math.abs(c.i) > 3) rt.warns.push(`${it.uid}: dòng ${Math.abs(c.i).toFixed(1)} A vượt giới hạn 3 A của nguồn`);
  }
  rt.reads = reads;
  rt.active = !!(res.ok && Object.entries(res.comp).some(([uid, c]) => ws.getByUid(uid)?.id !== 'voltmeter' && Math.abs(c.i) > 1e-7));
}

const meta = {
  id: 'ohm', lab: 'elec', topic: 'Điện học', title: 'Định luật Ohm', level: 1, minutes: 25,
  tags: ['điện trở', 'định luật Ohm', 'vôn kế', 'ampe kế', 'đặc tuyến', 'dòng điện', 'hiệu điện thế'],
  objective: ['Tự lắp mạch đo hiệu điện thế và cường độ dòng điện với ampe kế mắc nối tiếp, vôn kế mắc song song.', 'Khảo sát quan hệ U–I của điện trở và xác định điện trở từ hệ số góc.', 'Hiểu ảnh hưởng của thang đo, dung sai điện trở và điện trở trong của dụng cụ.'],
  question: 'Hiệu điện thế và cường độ dòng điện qua một điện trở liên hệ với nhau như thế nào, và điện trở này bằng bao nhiêu?',
  theory: `<p>Định luật Ohm: với vật dẫn kim loại ở nhiệt độ không đổi, <i>I</i> = <i>U</i>/<i>R</i> với <i>R</i> không đổi; đồ thị <i>U</i>–<i>I</i> là đường thẳng qua gốc, hệ số góc bằng <i>R</i>.</p>
    <p>Ampe kế đo dòng điện nên được mắc <b>nối tiếp</b>; vôn kế đo hiệu điện thế nên mắc <b>song song</b> với linh kiện. Dụng cụ thật có điện trở trong: ampe kế gây sụt áp nhỏ, vôn kế 10 MΩ hút một dòng rất nhỏ.</p>
    <p>Bóng đèn sợi đốt là linh kiện phi tuyến: điện trở sợi tungsten tăng mạnh theo nhiệt độ. Điốt chỉ dẫn điện khi phân cực thuận và vượt ngưỡng ~0,6 V (<i>I</i> tăng theo hàm mũ).</p>
    <p>Nguồn thực có suất điện động <i>E</i> và điện trở trong <i>r</i>: <i>U</i> = <i>E</i> − <i>I r</i>. Đồ thị <i>U</i>–<i>I</i> là đường thẳng có hệ số góc −<i>r</i> và tung độ gốc <i>E</i>.</p>`,
  apparatus: [
    { text: 'Nguồn một chiều', ids: ['dcSource'] }, { text: 'Điện trở cần khảo sát', ids: ['resistor'] },
    { text: 'Ampe kế', ids: ['ammeter'] }, { text: 'Vôn kế', ids: ['voltmeter'] }, { text: 'Biến trở', ids: ['rheostat'], optional: true }, { text: 'Công tắc', ids: ['switch'], optional: true },
  ],
  procedure: [
    { t: 'Chọn và đặt lên bàn: nguồn điện, linh kiện cần khảo sát, ampe kế, vôn kế (nên có thêm công tắc và biến trở).', done: (ws) => ws.has('dcSource') && ws.has('resistor') && ws.has('ammeter') && ws.has('voltmeter') },
    { t: 'Nối dây thành mạch kín: ampe kế nối tiếp, vôn kế song song với linh kiện. Chú ý cực + và −.', done: (ws) => !!ws.rt.active },
    { t: 'Chọn thang đo hợp lý (OL: tăng thang; ít chữ số có nghĩa: giảm thang).' },
    { t: 'Đóng công tắc, thay đổi nguồn/biến trở để đổi dòng điện; chọn đúng vôn kế và ampe kế rồi «Ghi số liệu».', done: (ws) => ws.state.rows.length >= 1 },
    { t: 'Thực hiện ít nhất 6 lần đo với các giá trị khác nhau.', done: (ws) => ws.state.rows.length >= 6 },
    { t: 'Vẽ đồ thị U–I, tính hệ số góc và so sánh với giá trị danh định.' },
  ],
  predict: { q: 'Với một điện trở không đổi, khi tăng hiệu điện thế hai đầu lên gấp đôi thì cường độ dòng điện qua nó:', options: ['Tăng gấp đôi', 'Giảm một nửa', 'Không đổi', 'Tăng gấp bốn'], correct: 0, explain: 'Định luật Ohm: I = U/R, với R không đổi thì I tỉ lệ thuận với U.' },
  questions: [
    { q: 'Cách mắc đúng của ampe kế và vôn kế để đo dòng điện qua và hiệu điện thế giữa hai đầu một điện trở là:', type: 'choice', options: ['Ampe kế nối tiếp, vôn kế song song', 'Ampe kế song song, vôn kế nối tiếp', 'Cả hai nối tiếp', 'Cả hai song song'], answer: 0, explain: 'Ampe kế có điện trở rất nhỏ nên phải nối tiếp; vôn kế điện trở rất lớn nên mắc song song.' },
    { q: 'Điện trở 220 Ω đặt dưới hiệu điện thế 6,0 V. Dòng điện là bao nhiêu mA?', type: 'num', unit: 'mA', answer: 27.3, tol: 0.5, explain: 'I = U/R = 6/220 ≈ 0,0273 A = 27,3 mA.' },
    { q: 'Đồ thị U–I của bóng đèn sợi đốt có dạng nào và vì sao?', type: 'choice', options: ['Đường cong; điện trở tăng khi sợi đốt nóng lên', 'Đường thẳng qua gốc', 'Đường nằm ngang', 'Đường cong; điện trở giảm khi nóng lên'], answer: 0, explain: 'Điện trở kim loại tăng theo nhiệt độ nên U/I tăng theo I: bóng đèn không tuân theo định luật Ohm.' },
    { q: 'Với pin có điện trở trong r, khi dòng điện qua mạch tăng thì hiệu điện thế giữa hai cực pin:', type: 'choice', options: ['Giảm theo U = E − I·r', 'Tăng', 'Không đổi', 'Bằng 0'], answer: 0, explain: 'Một phần suất điện động bị mất trên điện trở trong: U = E − I·r.' },
  ],
  hints: [
    'Hãy vẽ sơ đồ: nguồn → công tắc → ampe kế → linh kiện → về nguồn. Vôn kế nối hai đầu linh kiện cần đo.',
    'Nếu ampe kế hiện OL, tăng thang đo; nếu số quá ít chữ số, giảm thang đo. Đừng để ampe kế song song với nguồn.',
    'Để thay đổi dòng điện, thay đổi suất điện động của nguồn hoặc mắc nối tiếp biến trở và dịch con chạy.',
    'Muốn đo r của pin: mắc pin + biến trở + ampe kế nối tiếp, vôn kế nối hai cực pin; đồ thị U–I có hệ số góc −r.',
  ],
  conclusion: `<p>Với điện trở thuần, <i>U</i> tỉ lệ thuận với <i>I</i>: đồ thị là đường thẳng qua gốc với hệ số góc bằng <i>R</i> – định luật Ohm. Bóng đèn sợi đốt và điốt cho đặc tuyến cong: điện trở của chúng phụ thuộc vào điều kiện làm việc nên không tuân theo định luật Ohm.</p>
    <p>Với nguồn thực, <i>U</i> = <i>E</i> − <i>I r</i>: tung độ gốc là suất điện động, độ lớn hệ số góc là điện trở trong. Kết quả có sai lệch nhỏ so với danh định vì dung sai điện trở (±5 %), sai số thiết bị đo và điện trở trong của dụng cụ.</p>`,
  minRows: 6,
};

const columns = [
  { key: 'U', label: 'Hiệu điện thế (vôn kế)', symbol: 'U', unit: 'V', sig: 4 },
  { key: 'I', label: 'Cường độ dòng điện (ampe kế)', symbol: 'I', unit: 'A', sig: 4 },
  { key: 'R', label: 'Điện trở tính từ U/I', symbol: 'R = U/I', unit: 'Ω', sig: 4, calc: (v) => (Math.abs(v.I) > 1e-9 ? v.U / v.I : NaN), formula: 'U / I' },
  { key: 'P', label: 'Công suất', symbol: 'P = U·I', unit: 'W', sig: 3, calc: (v) => v.U * v.I, formula: 'U · I' },
];

const meters = (ws, id) => ws.state.placed.filter((p) => p.id === id);

export const circuitBase = {
  meta, kind: 'circuit', columns,
  library: ['dcSource', 'resistor', 'rheostat', 'switch', 'ammeter', 'voltmeter'],
  graphs: [
    { label: 'U – I  (hệ số góc = R)', x: 'I', y: 'U', origin: true },
    { label: 'I – U', x: 'U', y: 'I', origin: true },
    { label: 'R – I', x: 'I', y: 'R', origin: true },
    { label: 'P – I', x: 'I', y: 'P', origin: true },
  ],
  init(ws) { ws.rt = { reads: {}, warns: [], acc: 0 }; recompute(ws); },
  onChange(ws) { recompute(ws); },
  onMode(ws) { recompute(ws); },
  onRemove(ws, it) { if (ws.state.x.selV === it.uid) delete ws.state.x.selV; if (ws.state.x.selA === it.uid) delete ws.state.x.selA; },

  live(ws, it) {
    const rt = ws.rt, c = rt.sol?.ok ? rt.sol.comp[it.uid] : null;
    if (it.id === 'ammeter' || it.id === 'voltmeter') {
      const r = rt.reads[it.uid];
      return { text: r ? r.text : '----', warn: !!r?.over, range: it.params.range, label: it.uid === ws.state.x.selA || it.uid === ws.state.x.selV ? '● dùng để ghi' : '' };
    }
    if (!c) return {};
    if (it.id === 'resistor') return { warn: Math.abs(c.power) > INSTRUMENTS.resistor.powerRating };
    if (it.id === 'bulb') return { glow: Math.min(1, Math.max(0, (Math.abs(c.power) / 3) ** 0.6)), warn: Math.abs(c.v) > 8 };
    if (it.id === 'diode') return { glow: c.i > 1e-4 ? Math.min(1, c.i / 0.02) : 0 };
    if (it.id === 'dcSource') return { warn: Math.abs(c.i) > 3 };
    return {};
  },
  status(ws) {
    const rt = ws.rt;
    if (rt.circuitError) return { text: rt.circuitError, kind: 'bad' };
    if (rt.warns.length) return { text: '⚠ ' + rt.warns[0], kind: 'warn' };
    if (!ws.state.placed.length) return { text: 'Kéo dụng cụ vào bàn, sau đó nối dây giữa các cực.', kind: 'warn' };
    if (!ws.has('dcSource') && !ws.has('battery')) return { text: 'Mạch chưa có nguồn điện.', kind: 'warn' };
    if (!rt.active) return { text: 'Chưa có dòng điện: kiểm tra dây nối, công tắc và cách mắc mạch.', kind: 'warn' };
    return { text: 'Mạch đang hoạt động.', kind: 'ok' };
  },
  readouts(ws) {
    const out = [];
    for (const it of ws.state.placed) if (it.id === 'ammeter' || it.id === 'voltmeter') {
      const r = ws.rt.reads[it.uid];
      out.push({ label: `${it.id === 'ammeter' ? 'Ampe kế' : 'Vôn kế'} ${it.uid} (thang ${it.params.range} ${it.id === 'ammeter' ? 'A' : 'V'})`, text: r ? (r.off ? '(chưa nối)' : `${r.text} ${it.id === 'ammeter' ? 'A' : 'V'}`) : '—', warn: !!r?.over });
    }
    for (const w of ws.rt.warns || []) out.push({ label: 'Cảnh báo', text: w, warn: true });
    return out;
  },
  controls(ws, el) {
    const ui = ws.rt.ui = {};
    const vs = meters(ws, 'voltmeter'), as = meters(ws, 'ammeter');
    const x = ws.state.x;
    if (!vs.some((v) => v.uid === x.selV)) x.selV = vs[0]?.uid; if (!as.some((a) => a.uid === x.selA)) x.selA = as[0]?.uid;
    const sel = (list, key, label) => {
      const s = h('select', { 'aria-label': label, disabled: !list.length }, list.length ? list.map((m) => h('option', { value: m.uid, selected: m.uid === x[key] }, m.uid)) : h('option', null, '(chưa có)'));
      s.addEventListener('change', () => { x[key] = s.value; ws.save(); ws.bench.render(); });
      return h('label', { class: 'pc' }, h('span', { class: 'pc-l' }, label), h('span', { class: 'pc-r' }, s));
    };
    el.append(sel(vs, 'selV', 'Vôn kế dùng để ghi U'), sel(as, 'selA', 'Ampe kế dùng để ghi I'));
    ui.rec = h('button', { class: 'btn accent', onClick: () => this.record(ws) }, 'Ghi số liệu');
    el.append(h('div', { class: 'btn-row' }, ui.rec), h('p', { class: 'mute sm' }, 'Nhấp vào công tắc để đóng/mở. Nhấp một cực rồi cực khác để nối dây; nhấp vào dây để gỡ. Phím Delete gỡ linh kiện đang chọn.'));
  },
  record(ws) {
    const x = ws.state.x, rt = ws.rt;
    if (!x.selV || !x.selA || !ws.getByUid(x.selV) || !ws.getByUid(x.selA)) { ws.toast('Cần có cả vôn kế và ampe kế trên bàn.', 'warn'); return; }
    if (!ws.requirePrediction()) return;
    if (rt.circuitError) { ws.toast('Mạch đang lỗi: ' + rt.circuitError, 'warn', 5000); return; }
    const u = rt.reads[x.selV], i = rt.reads[x.selA];
    if (!u || u.off || !i || i.off) { ws.toast('Vôn kế/ampe kế được chọn chưa nối vào mạch.', 'warn', 4500); return; }
    if (u.over || i.over) { ws.toast('Một dụng cụ đang báo OL (vượt thang). Hãy chọn thang đo lớn hơn.', 'warn', 4500); return; }
    // giá trị lý thuyết (không dùng cho học sinh khi đang đo): mạch danh định + dụng cụ đo lý tưởng
    let th = null;
    try { const r = solveDC(buildCircuit(ws, true)); if (r.ok) th = { U: r.comp[x.selV].v, I: r.comp[x.selA].i }; } catch { /* bỏ qua */ }
    const extra = this.extraVals ? this.extraVals(ws) : {}; if (extra === null) return;
    const row = ws.addRow({ U: u.value, I: i.value, ...extra });
    row.th = th; ws.save();
  },
  frame(ws, dt) {
    if (ws.mode !== 'noisy' || !ws.state.placed.some((p) => p.id === 'ammeter' || p.id === 'voltmeter')) return false;
    ws.rt.acc += dt;
    if (ws.rt.acc < 0.7) return false;
    ws.rt.acc = 0; recompute(ws); return true;
  },
  analyze(ws, { reveal }) {
    const items = [], notes = [];
    const rows = ws.includedRows().filter((r) => ws.cell(r, columns[0]) != null && ws.cell(r, columns[1]) != null);
    if (rows.length < 3) return { items, notes };
    const I = rows.map((r) => r.vals.I), U = rows.map((r) => r.vals.U);
    const f = S.linreg(I, U); if (!f) return { items, notes };
    const thRows = rows.filter((r) => r.th), ft = thRows.length >= 3 ? S.linreg(thRows.map((r) => r.th.I), thRows.map((r) => r.th.U)) : null;
    const linear = f.r2 >= 0.995;
    if (linear) {
      const neg = f.slope < 0;
      items.push({ label: neg ? 'Điện trở trong r = −(hệ số góc U–I)' : 'Điện trở R = hệ số góc U–I', value: `${S.fmtWithUnc(neg ? -f.slope : f.slope, f.seSlope)} Ω`, theory: true, ref: ft ? `${S.fmtSig(neg ? -ft.slope : ft.slope, 4)} Ω` : '—', err: ft ? `${S.fmtSig(S.pctError(f.slope, ft.slope), 2)} %` : null, calc: `${neg ? 'r' : 'R'} = ${neg ? '−' : ''}a = ${S.fmtSig(neg ? -f.slope : f.slope, 4)} Ω (hồi quy ${f.n} điểm).` });
      items.push({ label: neg ? 'Suất điện động E = tung độ gốc' : 'Tung độ gốc U₀ (lý tưởng: 0)', value: `${S.fmtWithUnc(f.intercept, f.seIntercept)} V`, theory: true, ref: ft ? `${S.fmtSig(ft.intercept, 4)} V` : '—', err: ft ? `${S.fmtSig(Math.abs(f.intercept - ft.intercept), 2)} V` : null });
    } else {
      const R = rows.map((r) => (Math.abs(r.vals.I) > 1e-9 ? r.vals.U / r.vals.I : NaN)).filter(Number.isFinite);
      items.push({ label: 'Quan hệ U–I không tuyến tính (R² = ' + S.fmtSig(f.r2, 4) + ')', value: `R = U/I biến thiên từ ${S.fmtSig(Math.min(...R), 3)} đến ${S.fmtSig(Math.max(...R), 3)} Ω`, theory: false });
      notes.push('Linh kiện không tuân theo định luật Ohm vì R = U/I thay đổi theo điều kiện làm việc.');
    }
    items.push({ label: 'Hệ số tương quan r', value: S.fmtSig(f.r, 6), theory: false });
    if (reveal && linear && f.slope > 0) notes.push('Điện trở thật có dung sai ±5 % nên giá trị đo có thể khác danh định trong phạm vi đó; hãy so sánh sai lệch với dung sai.');
    return { items, notes };
  },
};

export default circuitBase;
export { TERMINALS };
