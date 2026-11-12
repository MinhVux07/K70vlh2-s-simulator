// Ba thí nghiệm mạch điện một chiều dùng chung bàn lắp mạch và bộ giải MNA của ohm.js:
// mắc nối tiếp/song song, suất điện động và điện trở trong của pin, đặc tuyến bóng đèn và điốt.
import { circuitBase as base } from './ohm.js';
import * as S from '../core/stats.js';

const UI = [
  { key: 'U', label: 'Hiệu điện thế (vôn kế)', symbol: 'U', unit: 'V', sig: 4 },
  { key: 'I', label: 'Cường độ dòng điện (ampe kế)', symbol: 'I', unit: 'A', sig: 4 },
];
const resistors = (ws) => ws.state.placed.filter((p) => p.id === 'resistor');
const common = { lab: 'elec', topic: 'Điện học', level: 2, minutes: 30, minRows: 6 };

// ───── 1. Nối tiếp và song song ─────
export const seriesParallel = {
  ...base,
  meta: {
    ...common, id: 'seriesparallel', title: 'Mắc điện trở nối tiếp và song song', level: 1, minutes: 25, minRows: 4,
    tags: ['nối tiếp', 'song song', 'điện trở tương đương', 'định luật Ohm'],
    objective: ['Tự lắp hai điện trở nối tiếp rồi song song và đo điện trở tương đương.', 'So sánh R_tđ đo được với công thức R₁ + R₂ và R₁R₂/(R₁ + R₂).', 'Nhận biết ảnh hưởng của dung sai điện trở và điện trở trong dụng cụ đo.'],
    question: 'Điện trở tương đương của hai điện trở mắc nối tiếp và mắc song song được tính như thế nào?',
    theory: `<p><b>Nối tiếp</b>: dòng điện qua hai điện trở như nhau, hiệu điện thế cộng lại: <i>R</i><sub>tđ</sub> = <i>R</i><sub>1</sub> + <i>R</i><sub>2</sub> (lớn hơn mỗi điện trở).</p>
      <p><b>Song song</b>: hiệu điện thế như nhau, dòng điện cộng lại: 1/<i>R</i><sub>tđ</sub> = 1/<i>R</i><sub>1</sub> + 1/<i>R</i><sub>2</sub>, tức <i>R</i><sub>tđ</sub> = <i>R</i><sub>1</sub><i>R</i><sub>2</sub>/(<i>R</i><sub>1</sub> + <i>R</i><sub>2</sub>) (nhỏ hơn mỗi điện trở).</p>
      <p>Đo <i>R</i><sub>tđ</sub> bằng <i>U</i>/<i>I</i> với ampe kế nối tiếp và vôn kế song song với cả cụm. Điện trở thật có dung sai ±5 %.</p>`,
    apparatus: [{ text: 'Nguồn một chiều', ids: ['dcSource'] }, { text: 'Hai điện trở', ids: ['resistor'] }, { text: 'Ampe kế', ids: ['ammeter'] }, { text: 'Vôn kế', ids: ['voltmeter'] }, { text: 'Công tắc', ids: ['switch'], optional: true }],
    procedure: [
      { t: 'Đặt nguồn, đúng hai điện trở, ampe kế, vôn kế (và công tắc) lên bàn.', done: (ws) => ws.has('dcSource') && resistors(ws).length >= 2 && ws.has('ammeter') && ws.has('voltmeter') },
      { t: 'Mắc hai điện trở NỐI TIẾP, ampe kế nối tiếp với cụm, vôn kế song song với cả cụm; ghi U, I.', done: (ws) => ws.state.rows.length >= 1 },
      { t: 'Đổi sang mắc SONG SONG (gỡ dây, nối lại) và ghi U, I.' },
      { t: 'Làm tối thiểu 4 lần với các cặp giá trị R₁, R₂ và kiểu mắc khác nhau.', done: (ws) => ws.state.rows.length >= 4 },
      { t: 'So sánh R_tđ = U/I với R₁ + R₂ và R₁R₂/(R₁ + R₂) trong bảng số liệu.' },
    ],
    predict: { q: 'Mắc song song hai điện trở 100 Ω, điện trở tương đương sẽ:', options: ['Nhỏ hơn 100 Ω (50 Ω)', '200 Ω', '100 Ω', 'Lớn hơn 100 Ω nhưng nhỏ hơn 200 Ω'], correct: 0, explain: 'R = 100·100/(100+100) = 50 Ω: mắc song song làm điện trở tương đương nhỏ hơn mọi điện trở thành phần.' },
    questions: [
      { q: 'Khi mắc nối tiếp, đại lượng nào KHÔNG đổi giữa các điện trở?', type: 'choice', options: ['Cường độ dòng điện', 'Hiệu điện thế', 'Công suất', 'Điện trở'], answer: 0, explain: 'Chỉ có một đường dẫn nên dòng qua mọi điện trở như nhau.' },
      { q: 'Hai điện trở 220 Ω và 470 Ω mắc song song. Điện trở tương đương là bao nhiêu Ω?', type: 'num', unit: 'Ω', answer: 149.9, tol: 1.5, explain: 'R = 220·470/(220+470) ≈ 149,9 Ω.' },
      { q: 'Điện trở tương đương của mạch song song luôn:', type: 'choice', options: ['Nhỏ hơn điện trở nhỏ nhất', 'Bằng tổng các điện trở', 'Lớn hơn điện trở lớn nhất', 'Bằng trung bình'], answer: 0, explain: 'Thêm nhánh song song tạo thêm đường cho dòng nên điện trở giảm.' },
      { q: 'Số chỉ ampe kế tăng khi chuyển từ nối tiếp sang song song (cùng U). Vì sao?', type: 'choice', options: ['R_tđ giảm nên I = U/R_tđ tăng', 'U tăng', 'R_tđ tăng', 'Ampe kế sai'], answer: 0, explain: 'U không đổi, R_tđ nhỏ hơn nên I lớn hơn.' },
    ],
    hints: ['Mạch nối tiếp: nguồn → ampe kế → R₁ → R₂ → nguồn; vôn kế nối hai đầu cả cụm R₁–R₂.', 'Mạch song song: hai điện trở cùng nối vào hai điểm chung; ampe kế đặt ở nhánh chính để đo tổng dòng.', 'Dùng điện trở có giá trị khác nhau để dễ phân biệt R₁ + R₂ với R₁R₂/(R₁ + R₂).'],
    conclusion: '<p>Mắc nối tiếp: <i>R</i><sub>tđ</sub> = <i>R</i><sub>1</sub> + <i>R</i><sub>2</sub>; mắc song song: 1/<i>R</i><sub>tđ</sub> = 1/<i>R</i><sub>1</sub> + 1/<i>R</i><sub>2</sub>. Số liệu đo trùng với hai công thức trong phạm vi dung sai ±5 % của điện trở và sai số dụng cụ đo.</p>',
  },
  columns: [
    ...UI,
    { key: 'Req', label: 'Điện trở tương đương đo được', symbol: 'R_tđ = U/I', unit: 'Ω', sig: 4, calc: (v) => (Math.abs(v.I) > 1e-9 ? v.U / v.I : NaN), formula: 'U / I' },
    { key: 'R1', label: 'Điện trở thứ nhất (danh định)', symbol: 'R₁', unit: 'Ω', sig: 4 },
    { key: 'R2', label: 'Điện trở thứ hai (danh định)', symbol: 'R₂', unit: 'Ω', sig: 4 },
    { key: 'Rs', label: 'Nếu nối tiếp', symbol: 'R₁+R₂', unit: 'Ω', sig: 4, calc: (v) => v.R1 + v.R2, formula: 'R₁ + R₂' },
    { key: 'Rp', label: 'Nếu song song', symbol: 'R₁R₂/(R₁+R₂)', unit: 'Ω', sig: 4, calc: (v) => (v.R1 * v.R2) / (v.R1 + v.R2), formula: 'R₁·R₂ / (R₁ + R₂)' },
  ],
  library: ['dcSource', 'resistor', 'switch', 'ammeter', 'voltmeter', 'battery', 'bulb'],
  reject: undefined,
  graphs: [{ label: 'R_tđ – R₁+R₂', x: 'Rs', y: 'Req', origin: true }, { label: 'R_tđ – R₁R₂/(R₁+R₂)', x: 'Rp', y: 'Req', origin: true }, { label: 'U – I', x: 'I', y: 'U', origin: true }],
  extraVals(ws) {
    const r = resistors(ws);
    if (r.length !== 2) { ws.toast('Thí nghiệm này cần đúng hai điện trở trên bàn.', 'warn', 4000); return null; }
    return { R1: r[0].params.R, R2: r[1].params.R };
  },
  analyze(ws, { reveal }) {
    const items = [], notes = [], rows = ws.includedRows().filter((r) => Number.isFinite(ws.cell(r, this.columns[2])) && r.vals.R1 != null);
    if (rows.length < 2) return { items, notes };
    let ns = 0, np = 0, no = 0; const dev = [];
    for (const r of rows) {
      const q = ws.cell(r, this.columns[2]), ds = Math.abs(q - (r.vals.R1 + r.vals.R2)) / (r.vals.R1 + r.vals.R2), dp = Math.abs(q - (r.vals.R1 * r.vals.R2) / (r.vals.R1 + r.vals.R2)) / ((r.vals.R1 * r.vals.R2) / (r.vals.R1 + r.vals.R2));
      if (Math.min(ds, dp) > 0.12) no++; else if (ds < dp) { ns++; dev.push(ds * 100); } else { np++; dev.push(dp * 100); }
    }
    items.push({ label: 'Số lần đo khớp công thức NỐI TIẾP (sai lệch < 12 %)', value: String(ns), theory: false });
    items.push({ label: 'Số lần đo khớp công thức SONG SONG (sai lệch < 12 %)', value: String(np), theory: false });
    if (no) notes.push(`${no} lần đo không khớp công thức nào: kiểm tra lại cách mắc, thang đo hoặc cặp R₁, R₂ đã ghi.`);
    if (dev.length) items.push({ label: 'Sai lệch trung bình so với công thức phù hợp', value: `${S.fmtSig(S.mean(dev), 2)} %`, theory: true, ref: '≤ 5 % (dung sai điện trở)', err: null });
    if (reveal && !ws.ideal) notes.push('Dung sai ±5 % của hai điện trở cộng với điện trở trong ampe kế (vài Ω ở thang nhỏ) làm R_tđ lệch vài %.');
    return { items, notes };
  },
};
seriesParallel.library = ['dcSource', 'resistor', 'switch', 'ammeter', 'voltmeter', 'rheostat'];

// ───── 2. Suất điện động và điện trở trong ─────
export const emf = {
  ...base,
  meta: {
    ...common, id: 'emf', title: 'Suất điện động và điện trở trong của pin', level: 2,
    tags: ['suất điện động', 'điện trở trong', 'pin', 'biến trở', 'đặc tuyến'],
    objective: ['Lắp mạch đo hiệu điện thế hai cực pin và dòng điện khi thay đổi tải.', 'Xác định suất điện động E và điện trở trong r từ đồ thị U–I.', 'Hiểu vì sao hiệu điện thế hai cực pin giảm khi dòng điện tăng.'],
    question: 'Suất điện động và điện trở trong của pin này bằng bao nhiêu?',
    theory: `<p>Pin thực có suất điện động <i>E</i> và điện trở trong <i>r</i>. Khi cấp dòng <i>I</i> cho mạch ngoài, hiệu điện thế hai cực: <i>U</i> = <i>E</i> − <i>I r</i>.</p>
      <p>Đồ thị <i>U</i> theo <i>I</i> là đường thẳng: tung độ gốc là <i>E</i> (khi <i>I</i> → 0), độ lớn hệ số góc là <i>r</i>. Dòng ngắn mạch <i>I</i><sub>sc</sub> = <i>E</i>/<i>r</i>.</p>
      <p>Để thay đổi dòng điện, mắc nối tiếp biến trở với pin. Vôn kế nối thẳng hai cực pin; ampe kế nối tiếp với mạch ngoài. Không để dòng quá lớn làm pin nóng và nhanh hết.</p>`,
    apparatus: [{ text: 'Pin', ids: ['battery'] }, { text: 'Biến trở', ids: ['rheostat'] }, { text: 'Ampe kế', ids: ['ammeter'] }, { text: 'Vôn kế', ids: ['voltmeter'] }, { text: 'Công tắc', ids: ['switch'], optional: true }, { text: 'Điện trở bảo vệ', ids: ['resistor'], optional: true }],
    procedure: [
      { t: 'Đặt pin, biến trở, ampe kế, vôn kế (và công tắc) lên bàn.', done: (ws) => ws.has('battery') && ws.has('rheostat') && ws.has('ammeter') && ws.has('voltmeter') },
      { t: 'Nối pin – công tắc – ampe kế – biến trở thành mạch kín; vôn kế song song hai cực pin.', done: (ws) => !!ws.rt.active },
      { t: 'Thay đổi con chạy biến trở để đổi dòng điện, ghi U và I mỗi lần.', done: (ws) => ws.state.rows.length >= 1 },
      { t: 'Thực hiện ít nhất 6 lần đo với dòng điện trải rộng (ví dụ 0,05–0,8 A).', done: (ws) => ws.state.rows.length >= 6 },
      { t: 'Vẽ đồ thị U–I; đọc E (tung độ gốc) và r (độ lớn hệ số góc).' },
    ],
    predict: { q: 'Khi dòng điện qua pin tăng lên, hiệu điện thế giữa hai cực của pin:', options: ['Giảm', 'Tăng', 'Không đổi', 'Bằng suất điện động'], correct: 0, explain: 'U = E − I·r: dòng I tăng làm độ sụt thế trên điện trở trong tăng, U giảm.' },
    questions: [
      { q: 'Trên đồ thị U–I của pin, tung độ gốc cho biết:', type: 'choice', options: ['Suất điện động E', 'Điện trở trong r', 'Dòng ngắn mạch', 'Công suất cực đại'], answer: 0, explain: 'Khi I = 0, U = E.' },
      { q: 'Pin có E = 4,5 V, r = 1,8 Ω. Dòng ngắn mạch là bao nhiêu A?', type: 'num', unit: 'A', answer: 2.5, tol: 0.05, explain: 'I = E/r = 4,5/1,8 = 2,5 A.' },
      { q: 'Vì sao khi chưa đóng mạch vôn kế đo cực pin chỉ gần đúng E?', type: 'choice', options: ['Dòng qua vôn kế rất nhỏ nên sụt thế trên r không đáng kể', 'Pin không có r', 'Vôn kế hút hết điện', 'U luôn bằng 0'], answer: 0, explain: 'Vôn kế điện trở lớn (10 MΩ) nên dòng cực nhỏ: U ≈ E.' },
      { q: 'Hệ số góc của đồ thị U–I có dấu:', type: 'choice', options: ['Âm, độ lớn bằng r', 'Dương, bằng r', 'Âm, bằng E', 'Bằng 0'], answer: 0, explain: 'U = E − I·r nên dốc xuống với độ lớn r.' },
    ],
    hints: ['Vôn kế phải nối trực tiếp hai cực pin (không qua ampe kế) để đo U đúng; ampe kế nối tiếp với biến trở.', 'Biến trở 0–100 Ω: ở vị trí rất nhỏ dòng có thể vượt 1 A. Có thể thêm điện trở nối tiếp để hạn chế dòng.', 'Trải đều các giá trị dòng điện để hồi quy chính xác hơn; U–I phải thẳng.'],
    conclusion: '<p>Hiệu điện thế hai cực pin giảm tuyến tính theo dòng điện: <i>U</i> = <i>E</i> − <i>I r</i>. Tung độ gốc là suất điện động, độ lớn hệ số góc là điện trở trong. Sai lệch nhỏ so với giá trị thật đến từ sai số dụng cụ đo và điện trở nối.</p>',
  },
  columns: [...UI, { key: 'R', label: 'Điện trở mạch ngoài U/I', symbol: 'R = U/I', unit: 'Ω', sig: 4, calc: (v) => (Math.abs(v.I) > 1e-9 ? v.U / v.I : NaN), formula: 'U / I' }, { key: 'P', label: 'Công suất mạch ngoài', symbol: 'P = U·I', unit: 'W', sig: 3, calc: (v) => v.U * v.I, formula: 'U · I' }],
  library: ['battery', 'rheostat', 'resistor', 'switch', 'ammeter', 'voltmeter'],
  graphs: [{ label: 'U – I  (tung độ gốc = E; hệ số góc = −r)', x: 'I', y: 'U', origin: true }, { label: 'P – I', x: 'I', y: 'P', origin: true }, { label: 'P – R', x: 'R', y: 'P', origin: true }],
  analyze(ws, opts) {
    const out = base.analyze.call(this, ws, opts);
    const e = out.items.find((i) => i.label.startsWith('Suất điện động')), r = out.items.find((i) => i.label.startsWith('Điện trở trong'));
    if (e && r) { const E = parseFloat(e.value), R = parseFloat(r.value); if (R > 0) out.items.push({ label: 'Dòng ngắn mạch ước lượng E/r', value: `${S.fmtSig(E / R, 3)} A`, theory: false }); }
    return out;
  },
};

// ───── 3. Đặc tuyến bóng đèn và điốt ─────
export const iv = {
  ...base,
  meta: {
    ...common, id: 'ivcurve', title: 'Đặc tuyến V–A của bóng đèn và điốt', level: 3, minutes: 35,
    tags: ['đặc tuyến', 'bóng đèn', 'điốt', 'phi tuyến', 'điện trở', 'ngưỡng dẫn'],
    objective: ['Khảo sát đặc tuyến U–I của bóng đèn sợi đốt và điốt.', 'Chỉ ra linh kiện nào KHÔNG tuân theo định luật Ohm và giải thích.', 'Xác định điện áp ngưỡng của điốt và sự tăng điện trở của dây tóc theo dòng điện.'],
    question: 'Đặc tuyến U–I của bóng đèn và điốt khác điện trở thuần ở điểm nào và vì sao?',
    theory: `<p><b>Bóng đèn sợi đốt</b>: điện trở dây tóc tungsten tăng theo nhiệt độ. Khi dòng tăng, dây tóc nóng lên, <i>R</i> = <i>U</i>/<i>I</i> tăng nên đồ thị <i>I</i>–<i>U</i> cong về phía trục <i>U</i>.</p>
      <p><b>Điốt</b>: chỉ dẫn điện khi phân cực thuận và vượt ngưỡng ≈ 0,6 V; trên ngưỡng <i>I</i> tăng theo hàm mũ rất nhanh nên phải mắc nối tiếp <b>điện trở hạn dòng</b>. Phân cực ngược gần như không có dòng.</p>
      <p>Linh kiện tuân theo định luật Ohm khi <i>R</i> = <i>U</i>/<i>I</i> không đổi (đồ thị là đường thẳng qua gốc).</p>`,
    apparatus: [{ text: 'Nguồn một chiều', ids: ['dcSource'] }, { text: 'Bóng đèn hoặc điốt', ids: ['bulb', 'diode'] }, { text: 'Điện trở hạn dòng (cho điốt)', ids: ['resistor'], optional: true }, { text: 'Ampe kế', ids: ['ammeter'] }, { text: 'Vôn kế', ids: ['voltmeter'] }],
    procedure: [
      { t: 'Đặt nguồn, bóng đèn (hoặc điốt), ampe kế, vôn kế lên bàn. Với điốt, thêm điện trở hạn dòng nối tiếp.', done: (ws) => ws.has('dcSource') && (ws.has('bulb') || ws.has('diode')) && ws.has('ammeter') && ws.has('voltmeter') },
      { t: 'Nối mạch: ampe kế nối tiếp, vôn kế song song CHỈ với bóng đèn/điốt.', done: (ws) => !!ws.rt.active },
      { t: 'Tăng dần suất điện động của nguồn và ghi U, I; làm dày điểm ở vùng dòng bắt đầu tăng nhanh.', done: (ws) => ws.state.rows.length >= 1 },
      { t: 'Ghi ít nhất 8 điểm. Thay linh kiện còn lại và lặp lại (xóa/ghi chú số liệu cũ).', done: (ws) => ws.state.rows.length >= 6 },
      { t: 'Vẽ đồ thị I–U và R–I, nhận xét vì sao không tuyến tính.' },
    ],
    predict: { q: 'Điện trở U/I của dây tóc bóng đèn khi đèn sáng mạnh so với khi vừa bật:', options: ['Lớn hơn nhiều', 'Nhỏ hơn', 'Như nhau', 'Bằng 0'], correct: 0, explain: 'Dây tóc nóng lên tới hàng nghìn °C, điện trở kim loại tăng theo nhiệt độ nên R lớn hơn nhiều lần so với lúc nguội.' },
    questions: [
      { q: 'Đặc tuyến I–U của bóng đèn sợi đốt cong vì:', type: 'choice', options: ['Điện trở dây tóc tăng khi nóng lên', 'Điện trở giảm khi nóng lên', 'Bóng đèn có điện dung', 'Dụng cụ đo sai'], answer: 0, explain: 'Điện trở kim loại tăng theo nhiệt độ nên U/I tăng khi dòng tăng.' },
      { q: 'Điốt silic bắt đầu dẫn điện đáng kể khi điện áp thuận vượt khoảng bao nhiêu vôn?', type: 'num', unit: 'V', answer: 0.6, tol: 0.15, explain: 'Ngưỡng ~0,6–0,7 V với điốt silic.' },
      { q: 'Vì sao phải mắc điện trở nối tiếp với điốt?', type: 'choice', options: ['Dòng điện tăng rất nhanh trên ngưỡng, dễ làm hỏng điốt', 'Để điốt nóng lên', 'Để điốt dẫn ngược', 'Không cần'], answer: 0, explain: 'I tăng theo hàm mũ của U nên cần điện trở giới hạn dòng.' },
      { q: 'Linh kiện tuân theo định luật Ohm có đặc tuyến I–U:', type: 'choice', options: ['Đường thẳng qua gốc', 'Đường cong lõm', 'Đường cong lồi', 'Bậc thang'], answer: 0, explain: 'R = U/I không đổi nên I tỉ lệ thuận với U.' },
    ],
    hints: ['Vôn kế chỉ nối hai đầu bóng đèn/điốt, không nối cả điện trở hạn dòng.', 'Với điốt, tăng E từng 0,1 V quanh 0,5–0,9 V; dùng thang đo ampe kế nhỏ (mA) cho vùng dòng nhỏ.', 'Hãy xem đồ thị R–I: nếu R không đổi thì linh kiện tuân theo Ohm.'],
    conclusion: '<p>Bóng đèn sợi đốt và điốt không tuân theo định luật Ohm: điện trở <i>U</i>/<i>I</i> thay đổi theo điều kiện làm việc. Dây tóc nóng lên làm <i>R</i> tăng; điốt có ngưỡng ≈ 0,6 V rồi dòng tăng rất nhanh theo hàm mũ.</p>',
  },
  columns: [...UI, { key: 'R', label: 'Điện trở tĩnh U/I', symbol: 'R = U/I', unit: 'Ω', sig: 4, calc: (v) => (Math.abs(v.I) > 1e-9 ? v.U / v.I : NaN), formula: 'U / I' }, { key: 'P', label: 'Công suất', symbol: 'P = U·I', unit: 'W', sig: 3, calc: (v) => v.U * v.I, formula: 'U · I' }],
  library: ['dcSource', 'bulb', 'diode', 'resistor', 'rheostat', 'switch', 'ammeter', 'voltmeter'],
  graphs: [{ label: 'I – U', x: 'U', y: 'I', origin: true }, { label: 'R – I', x: 'I', y: 'R', origin: true }, { label: 'U – I', x: 'I', y: 'U', origin: true }, { label: 'P – I', x: 'I', y: 'P', origin: true }],
  analyze(ws, opts) {
    const out = base.analyze.call(this, ws, opts), rows = ws.includedRows().filter((r) => r.vals.U != null && r.vals.I != null);
    if (rows.length >= 3) {
      const sorted = [...rows].sort((a, b) => a.vals.I - b.vals.I), lo = sorted.find((r) => r.vals.I > 1e-4), hi = sorted[sorted.length - 1];
      if (ws.has('bulb') && !ws.has('diode') && lo && hi && lo !== hi) out.items.push({ label: 'R = U/I ở dòng nhỏ nhất → lớn nhất', value: `${S.fmtSig(lo.vals.U / lo.vals.I, 3)} Ω → ${S.fmtSig(hi.vals.U / hi.vals.I, 3)} Ω`, theory: false });
      if (ws.has('diode')) { const on = sorted.find((r) => r.vals.I >= 1e-3); if (on) out.items.push({ label: 'Điện áp ngưỡng ước lượng (dòng đạt 1 mA)', value: `${S.fmtSig(on.vals.U, 3)} V`, theory: true, ref: '≈ 0,6 V', err: null }); }
    }
    return out;
  },
};
