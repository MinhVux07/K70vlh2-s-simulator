// Thư viện dụng cụ: thông số kỹ thuật + mô hình đọc số (độ phân giải, giới hạn đo, sai số thiết bị, nhiễu).
// Mỗi dụng cụ ở đây đều thực sự được dùng trong ít nhất một thí nghiệm.

export const decimalsOf = (res) => Math.max(0, Math.ceil(-Math.log10(res) - 1e-9));

export const INSTRUMENTS = {};
function def(s) { INSTRUMENTS[s.id] = Object.freeze(s); }

const LAB = { mech: 'Cơ học', therm: 'Nhiệt học', elec: 'Điện – từ' };
export const labName = (k) => LAB[k] || k;

// ───────────────────────── CƠ HỌC ─────────────────────────
def({
  id: 'ruler', name: 'Thước mét (2 m)', symbol: 'Thước', lab: 'mech', category: 'Dụng cụ đo', measures: true,
  function: 'Đo chiều dài, khoảng cách theo phương thẳng đứng hoặc nằm ngang.',
  unit: 'm', range: [0, 2], lsd: 0.001, resolution: 0.0005, accuracy: 0.0005,
  params: [],
  usage: 'Đặt mắt vuông góc với vạch chia để tránh sai số thị sai. Ước lượng đến nửa độ chia nhỏ nhất (0,5 mm).',
});
def({
  id: 'photogateTimer', name: 'Cổng quang điện + đồng hồ đếm', symbol: 'Cổng quang', lab: 'mech', category: 'Dụng cụ đo', measures: true,
  function: 'Đo khoảng thời gian từ lúc vật bắt đầu rơi (nam châm điện nhả) đến lúc vật cắt tia sáng của cổng quang.',
  unit: 's', range: [0, 99.9999], lsd: 0.0001, resolution: 0.0001, accuracy: 0.0002,
  params: [],
  usage: 'Đặt cổng quang sao cho vật đi qua chính giữa tia sáng. Đồng hồ tự bắt đầu đếm khi nam châm điện nhả vật.',
});
def({
  id: 'stopwatch', name: 'Đồng hồ bấm giây', symbol: 'Bấm giờ', lab: 'mech', category: 'Dụng cụ đo', measures: true,
  function: 'Đo thời gian thủ công. Kết quả chịu sai số do thời gian phản xạ của người bấm (~0,05 s).',
  unit: 's', range: [0, 3599.99], lsd: 0.01, resolution: 0.01, accuracy: 0.01, humanSigma: 0.05,
  params: [],
  usage: 'Bấm khi vật bắt đầu chuyển động và bấm dừng khi vật đến đích. Lặp lại nhiều lần để giảm sai số ngẫu nhiên.',
});
def({
  id: 'balance', name: 'Cân điện tử (2 kg)', symbol: 'Cân', lab: 'mech', category: 'Dụng cụ đo', measures: true,
  function: 'Đo khối lượng của vật đặt lên đĩa cân.',
  unit: 'kg', range: [0, 2], lsd: 0.0001, resolution: 0.0001, accuracy: 0.0002,
  params: [],
  usage: 'Nhấn TARE khi đĩa cân trống, đặt vật vào giữa đĩa, đợi số ổn định rồi đọc.',
});
def({
  id: 'cart', name: 'Xe lăn thí nghiệm', symbol: 'Xe', lab: 'mech', category: 'Vật thí nghiệm', measures: false,
  function: 'Xe có bánh ổ bi chuyển động trên đường ray. Có thể thêm các khối tải 100 g và quả cân 10 g.',
  unit: 'kg', range: null, lsd: null, resolution: null, accuracy: null,
  params: [
    { key: 'blocks', label: 'Khối tải 100 g', unit: 'khối', type: 'range', min: 0, max: 4, step: 1, default: 0 },
    { key: 'discs', label: 'Quả cân 10 g trên xe', unit: 'quả', type: 'range', min: 0, max: 20, step: 1, default: 0 },
  ],
  usage: 'Khối lượng thật của xe không được ghi sẵn – hãy dùng cân điện tử để xác định.',
});
def({
  id: 'hanger', name: 'Giá treo + quả cân 10 g', symbol: 'Quả cân', lab: 'mech', category: 'Vật thí nghiệm', measures: false,
  function: 'Giá treo (10 g) cùng các quả cân 10 g tạo lực kéo trọng trường lên dây.',
  unit: 'kg', range: null, lsd: null, resolution: null, accuracy: null,
  params: [{ key: 'discs', label: 'Quả cân 10 g trên giá treo', unit: 'quả', type: 'range', min: 0, max: 20, step: 1, default: 3 }],
  usage: 'Tổng số quả cân (trên xe + trên giá) không được vượt quá 20.',
});
def({
  id: 'pulley', name: 'Ròng rọc (đĩa nhôm)', symbol: 'Ròng rọc', lab: 'mech', category: 'Dụng cụ cơ', measures: false,
  function: 'Đổi hướng lực căng dây. Ròng rọc thật có khối lượng nên có mômen quán tính và làm tăng khối lượng hiệu dụng của hệ.',
  unit: '', range: null, lsd: null, resolution: null, accuracy: null,
  params: [],
  usage: 'Gắn ở đầu đường ray, dây phải song song với mặt ray.',
});
def({
  id: 'motionSensor', name: 'Cảm biến chuyển động siêu âm', symbol: 'CB chuyển động', lab: 'mech', category: 'Cảm biến', measures: true,
  function: 'Đo khoảng cách từ cảm biến đến xe theo thời gian x(t) với tần số lấy mẫu chọn được.',
  unit: 'm', range: [0.15, 4], lsd: 0.001, resolution: 0.001, accuracy: 0.002,
  params: [{ key: 'rate', label: 'Tần số lấy mẫu', unit: 'Hz', type: 'select', default: 50,
    options: [{ v: 20, label: '20 Hz' }, { v: 50, label: '50 Hz' }, { v: 100, label: '100 Hz' }, { v: 200, label: '200 Hz' }] }],
  usage: 'Đặt phía sau xe, hướng dọc theo ray. Khoảng cách tối thiểu 0,15 m – gần hơn cảm biến không đo được.',
});
def({
  id: 'forceSensor', name: 'Cảm biến lực (±10 N)', symbol: 'CB lực', lab: 'mech', category: 'Cảm biến', measures: true,
  function: 'Đo lực căng dây. Giá trị ghi là trung bình trong thời gian xe chuyển động.',
  unit: 'N', range: [-10, 10], lsd: 0.01, resolution: 0.01, accuracy: 0.05,
  params: [],
  usage: 'Mắc nối tiếp trên dây giữa xe và ròng rọc. Cần chuẩn lại điểm 0 khi dây chùng.',
});
def({
  id: 'electromagnet', name: 'Nam châm điện thả vật', symbol: 'Nam châm', lab: 'mech', category: 'Dụng cụ cơ', measures: false,
  function: 'Giữ bi ở độ cao xác định và thả khi ngắt điện, đồng thời kích hoạt đồng hồ đếm.',
  unit: '', range: null, lsd: null, resolution: null, accuracy: null,
  params: [{ key: 'h', label: 'Độ cao thả h (tâm bi → tia sáng cổng quang)', unit: 'm', type: 'range', min: 0.2, max: 1.5, step: 0.01, default: 1.0 }],
  usage: 'Từ dư làm bi nhả chậm vài ms sau khi ngắt điện – là nguồn sai số hệ thống của phép đo thời gian. Đọc độ cao h trên thước mét.',
});
def({
  id: 'ball', name: 'Vật rơi (bi)', symbol: 'Bi', lab: 'mech', category: 'Vật thí nghiệm', measures: false,
  function: 'Vật rơi tự do. Khối lượng và kích thước quyết định ảnh hưởng của lực cản không khí.',
  unit: '', range: null, lsd: null, resolution: null, accuracy: null,
  params: [{ key: 'material', label: 'Loại bi', unit: '', type: 'select', default: 'steel',
    options: [{ v: 'steel', label: 'Bi thép (65,5 g, ⌀25 mm)' }, { v: 'wood', label: 'Bi gỗ (14 g, ⌀30 mm)' }, { v: 'pingpong', label: 'Bóng bàn (2,7 g, ⌀40 mm)' }] }],
  usage: 'Bóng bàn nhẹ và to nên lực cản không khí đáng kể – so sánh với bi thép.',
});

def({
  id: 'spring', name: 'Lò xo thép', symbol: 'Lò xo', lab: 'mech', category: 'Vật thí nghiệm', measures: false,
  function: 'Lò xo xoắn có độ cứng k chưa biết. Biến dạng tỉ lệ với lực trong giới hạn đàn hồi; vượt giới hạn, lò xo bị biến dạng vĩnh viễn.',
  unit: '', range: null, lsd: null, resolution: null, accuracy: null, params: [],
  usage: 'Treo lò xo thẳng đứng trên giá, chờ dao động tắt hẳn rồi mới đọc chiều dài.',
});
def({
  id: 'pendulum', name: 'Con lắc đơn (bi + dây)', symbol: 'Con lắc', lab: 'mech', category: 'Vật thí nghiệm', measures: false,
  function: 'Bi thép treo vào dây mảnh không dãn. Chiều dài L tính từ điểm treo tới tâm bi.',
  unit: '', range: null, lsd: null, resolution: null, accuracy: null,
  params: [
    { key: 'L', label: 'Chiều dài dây L (điểm treo → tâm bi)', unit: 'm', type: 'range', min: 0.2, max: 1.2, step: 0.01, default: 0.6 },
    { key: 'theta0', label: 'Biên độ góc ban đầu', unit: '°', type: 'range', min: 2, max: 60, step: 1, default: 5 },
  ],
  usage: 'Biên độ nhỏ (< 10°) thì chu kỳ gần như không phụ thuộc biên độ. Đo thời gian của nhiều dao động để giảm sai số.',
});

// ───────────────────────── NHIỆT HỌC ─────────────────────────
def({
  id: 'syringe', name: 'Xi lanh khí có pit-tông', symbol: 'Xi lanh', lab: 'therm', category: 'Dụng cụ nhiệt', measures: true,
  function: 'Chứa một lượng khí xác định. Đọc thể tích khí trên thang chia của xi lanh (chưa tính thể tích ống nối).',
  unit: 'mL', range: [20, 100], lsd: 1, resolution: 0.5, accuracy: 0.5,
  params: [],
  usage: 'Kéo/đẩy pit-tông chậm để khí kịp cân bằng nhiệt với môi trường. Đọc ở mép trên của pit-tông.',
});
def({
  id: 'tempSensor', name: 'Cảm biến nhiệt độ (đầu dò)', symbol: 'CB nhiệt độ', lab: 'therm', category: 'Cảm biến', measures: true,
  function: 'Đo nhiệt độ khí trong xi lanh. Đầu dò có quán tính nhiệt nên chỉ số trễ so với nhiệt độ thật.',
  unit: '°C', range: [-40, 125], lsd: 0.1, resolution: 0.1, accuracy: 0.3, tau: 3,
  params: [],
  usage: 'Chờ số chỉ ổn định (thay đổi < 0,1 °C trong vài giây) trước khi ghi số liệu.',
});
def({
  id: 'pressureSensor', name: 'Cảm biến áp suất (0–700 kPa)', symbol: 'CB áp suất', lab: 'therm', category: 'Cảm biến', measures: true,
  function: 'Đo áp suất tuyệt đối của khí qua ống nối với xi lanh.',
  unit: 'kPa', range: [0, 700], lsd: 0.1, resolution: 0.1, accuracy: 0.5,
  params: [],
  usage: 'Nối kín ống dẫn. Ống nối có thể tích nhỏ (thể tích chết) cộng thêm vào thể tích khí.',
});
def({
  id: 'waterBath', name: 'Bể ổn nhiệt (bộ gia nhiệt)', symbol: 'Bể ổn nhiệt', lab: 'therm', category: 'Dụng cụ nhiệt', measures: false,
  function: 'Duy trì nhiệt độ nước đặt trước, xi lanh ngâm trong nước. Nhiệt độ nước và khí cần thời gian để cân bằng.',
  unit: '°C', range: [5, 95], lsd: null, resolution: null, accuracy: null,
  params: [{ key: 'setpoint', label: 'Nhiệt độ đặt', unit: '°C', type: 'range', min: 5, max: 95, step: 1, default: 22 }],
  usage: 'Sau khi đổi nhiệt độ đặt, chờ nước và khí cân bằng (quan sát cảm biến nhiệt độ) rồi mới đọc số liệu.',
});

def({
  id: 'calorimeter', name: 'Nhiệt lượng kế (có nước và que khuấy)', symbol: 'Nhiệt lượng kế', lab: 'therm', category: 'Dụng cụ nhiệt', measures: false,
  function: 'Cốc cách nhiệt chứa nước, có que khuấy. Bản thân cốc và que khuấy cũng hấp thụ nhiệt (đương lượng nước) và nhiệt thoát ra ngoài rất chậm.',
  unit: 'g', range: null, lsd: null, resolution: null, accuracy: null,
  params: [{ key: 'mw', label: 'Khối lượng nước', unit: 'g', type: 'range', min: 100, max: 300, step: 10, default: 150 }],
  usage: 'Chuẩn bị nước ở nhiệt độ phòng; khuấy nhẹ sau khi thả mẫu để nhiệt phân bố đều rồi đọc nhiệt độ cao nhất/ổn định.',
});
def({
  id: 'metalSample', name: 'Mẫu kim loại chưa biết', symbol: 'Mẫu kim loại', lab: 'therm', category: 'Vật thí nghiệm', measures: false,
  function: 'Khối kim loại treo bằng sợi chỉ. Chất liệu được giấu: hãy xác định từ nhiệt dung riêng đo được.',
  unit: 'g', range: null, lsd: null, resolution: null, accuracy: null,
  params: [{ key: 'ms', label: 'Khối lượng mẫu', unit: 'g', type: 'range', min: 50, max: 300, step: 10, default: 150 }],
  usage: 'Để mẫu trong bể nóng đủ lâu (vài phút mô phỏng) để nhiệt độ mẫu bằng nhiệt độ bể trước khi chuyển sang nhiệt lượng kế.',
});

// ───────────────────────── ĐIỆN ─────────────────────────
export const E12 = [10, 22, 47, 100, 220, 470, 1000, 2200, 4700, 10000, 100000];
const rLabel = (r) => (r >= 1000 ? `${r / 1000} kΩ` : `${r} Ω`);

def({
  id: 'dcSource', name: 'Nguồn một chiều 0–12 V', symbol: 'Nguồn DC', lab: 'elec', category: 'Nguồn điện', measures: false,
  function: 'Cung cấp hiệu điện thế một chiều điều chỉnh được. Nguồn thật có điện trở trong nhỏ và giới hạn dòng 3 A.',
  unit: 'V', range: [0, 12], lsd: 0.1, resolution: 0.1, accuracy: 0.05,
  params: [
    { key: 'E', label: 'Suất điện động đặt', unit: 'V', type: 'range', min: 0, max: 12, step: 0.1, default: 6 },
    { key: 'r', label: 'Điện trở trong', unit: 'Ω', type: 'number', default: 0.5, hidden: true },
  ],
  usage: 'Đóng công tắc sau khi mắc xong mạch. Không nối trực tiếp hai cực nguồn bằng dây dẫn.',
});
def({
  id: 'battery', name: 'Bộ pin 4,5 V (đã dùng)', symbol: 'Pin', lab: 'elec', category: 'Nguồn điện', measures: false,
  function: 'Pin có suất điện động ξ và điện trở trong r chưa biết – cần xác định bằng thực nghiệm.',
  unit: 'V', range: null, lsd: null, resolution: null, accuracy: null,
  params: [
    { key: 'E', label: 'Suất điện động', unit: 'V', type: 'number', default: 4.5, hidden: true },
    { key: 'r', label: 'Điện trở trong', unit: 'Ω', type: 'number', default: 1.8, hidden: true },
  ],
  usage: 'Mắc với biến trở và các đồng hồ đo; thay đổi dòng điện để khảo sát hiệu điện thế hai cực.',
});
def({
  id: 'resistor', name: 'Điện trở (0,5 W, ±5%)', symbol: 'R', lab: 'elec', category: 'Linh kiện', measures: false,
  function: 'Linh kiện tuyến tính. Giá trị thực có thể lệch khỏi giá trị danh định trong dung sai ±5%.',
  unit: 'Ω', range: null, lsd: null, resolution: null, accuracy: null, tolerance: 0.05, powerRating: 0.5,
  params: [{ key: 'R', label: 'Giá trị danh định', unit: 'Ω', type: 'select', default: 100,
    options: E12.map((v) => ({ v, label: rLabel(v) })) }],
  usage: 'Công suất tỏa nhiệt vượt 0,5 W sẽ làm điện trở quá nóng.',
});
def({
  id: 'rheostat', name: 'Biến trở con chạy 100 Ω', symbol: 'Biến trở', lab: 'elec', category: 'Linh kiện', measures: false,
  function: 'Điện trở thay đổi liên tục từ ~0 đến 100 Ω bằng cách dịch con chạy. Dùng để thay đổi dòng điện/điện áp.',
  unit: 'Ω', range: [0, 100], lsd: null, resolution: null, accuracy: null,
  params: [{ key: 'pos', label: 'Vị trí con chạy', unit: '%', type: 'range', min: 0, max: 100, step: 1, default: 50 }],
  usage: 'Mắc nối tiếp để điều chỉnh dòng. Đặt về giá trị lớn nhất trước khi đóng mạch lần đầu.',
});
def({
  id: 'bulb', name: 'Bóng đèn sợi đốt 6 V – 3 W', symbol: 'Đèn', lab: 'elec', category: 'Linh kiện', measures: false,
  function: 'Linh kiện phi tuyến: điện trở sợi tungsten tăng mạnh theo nhiệt độ (~0,8 Ω khi nguội, 12 Ω ở chế độ định mức).',
  unit: 'Ω', range: null, lsd: null, resolution: null, accuracy: null, ratedV: 6, ratedP: 3,
  params: [],
  usage: 'Không đặt hiệu điện thế vượt quá nhiều lần 6 V để tránh cháy sợi đốt.',
});
def({
  id: 'diode', name: 'Điốt bán dẫn silic 1N4148', symbol: 'Điốt', lab: 'elec', category: 'Linh kiện', measures: false,
  function: 'Linh kiện phi tuyến, chỉ dẫn điện mạnh khi phân cực thuận (anốt dương hơn catốt) vượt ngưỡng ~0,6 V.',
  unit: '', range: null, lsd: null, resolution: null, accuracy: null,
  params: [],
  usage: 'Luôn mắc nối tiếp với điện trở hạn dòng, nếu không dòng thuận sẽ rất lớn.',
});
def({
  id: 'switch', name: 'Công tắc', symbol: 'K', lab: 'elec', category: 'Linh kiện', measures: false,
  function: 'Đóng/ngắt mạch điện. Nhấp vào công tắc trên bàn thí nghiệm để đổi trạng thái.',
  unit: '', range: null, lsd: null, resolution: null, accuracy: null,
  params: [{ key: 'closed', label: 'Trạng thái', unit: '', type: 'select', default: false,
    options: [{ v: false, label: 'Mở' }, { v: true, label: 'Đóng' }] }],
  usage: 'Ngắt công tắc khi thay đổi cách mắc mạch.',
});

const rangedMeter = (id, name, symbol, unit, ranges, extra) => def({
  id, name, symbol, lab: 'elec', category: 'Dụng cụ đo', measures: true, unit,
  range: [-ranges[ranges.length - 1], ranges[ranges.length - 1]],
  lsd: ranges[0] / 1000, resolution: ranges[0] / 1000,
  rangeFromParams: (p) => Number(p.range),
  resFromParams: (p) => Number(p.range) / 1000,
  accFromParams: (v, p) => 0.005 * Math.abs(v) + 2 * (Number(p.range) / 1000),
  params: [{ key: 'range', label: 'Thang đo', unit, type: 'select', default: ranges[ranges.length - 1],
    options: ranges.map((v) => ({ v, label: `${v} ${unit}` })) }],
  ...extra,
});
rangedMeter('ammeter', 'Ampe kế số (3½ chữ số)', 'A', 'A', [0.002, 0.02, 0.2, 2], {
  function: 'Đo cường độ dòng điện. Phải mắc nối tiếp với đoạn mạch. Điện trở trong phụ thuộc thang đo (sụt áp 0,2 V ở cuối thang).',
  usage: 'Chọn thang đo lớn nhất rồi giảm dần để có nhiều chữ số hơn. Nếu hiện OL tức là dòng vượt thang đo.',
  accuracyText: '±(0,5% số đọc + 2 digit)',
});
rangedMeter('voltmeter', 'Vôn kế số (3½ chữ số, 10 MΩ)', 'V', 'V', [0.2, 2, 20], {
  function: 'Đo hiệu điện thế giữa hai điểm. Phải mắc song song với đoạn mạch. Điện trở trong 10 MΩ.',
  usage: 'Chọn thang đo phù hợp; OL nghĩa là hiệu điện thế vượt thang đo.',
  accuracyText: '±(0,5% số đọc + 2 digit)',
});

// ───────────────────────── MÔ HÌNH ĐỌC SỐ ─────────────────────────
export const rangeOf = (spec, p = {}) => (spec.rangeFromParams ? [-spec.rangeFromParams(p), spec.rangeFromParams(p)] : spec.range);
export const resOf = (spec, p = {}) => (spec.resFromParams ? spec.resFromParams(p) : spec.resolution);
export const accOf = (spec, v, p = {}) => (spec.accFromParams ? spec.accFromParams(v, p) : spec.accuracy);

/**
 * Mô phỏng một lần đọc số của dụng cụ.
 *  mode 'ideal'  : dụng cụ hoàn hảo – trả về đúng giá trị mô hình.
 *  mode 'real'   : làm tròn theo độ phân giải + giới hạn thang đo (hiệu ứng hiển thị, có tính tất định).
 *  mode 'noisy'  : thêm sai số hệ thống riêng của từng thiết bị (offset ∈ [−1,1] × 0,7·Δ) và nhiễu ngẫu nhiên σ = 0,4·Δ,
 *                  với Δ là sai số thiết bị công bố.
 * Trả về {value, text, over, res, acc}.
 */
export function readInstrument(spec, truth, { params = {}, mode = 'real', rng = null, offset = 0 } = {}) {
  const range = rangeOf(spec, params);
  const res = resOf(spec, params);
  const acc = accOf(spec, truth, params);
  let v = truth;
  let over = false;
  if (mode === 'noisy' && acc) {
    v += offset * 0.7 * acc;
    if (rng) v += rng.gauss(0, 0.4 * acc);
  }
  if (range) {
    if (v > range[1] + 1e-12) { v = range[1]; over = true; }
    else if (v < range[0] - 1e-12) { v = range[0]; over = true; }
  }
  if (mode !== 'ideal' && res) v = Number((Math.round(v / res) * res).toFixed(decimalsOf(res) + 2));
  const dec = res ? decimalsOf(res) : 3;
  return { value: v, text: over ? 'OL' : v.toFixed(dec), over, res, acc };
}

/** Bảng thông số để hiển thị thẻ dụng cụ. */
export function specSheet(spec, params = {}) {
  const range = rangeOf(spec, params);
  const res = resOf(spec, params);
  const rows = [];
  rows.push(['Chức năng', spec.function]);
  if (spec.unit) rows.push(['Đơn vị đo', spec.unit]);
  if (range) rows.push(['Giới hạn đo', `${range[0]} … ${range[1]} ${spec.unit}`]);
  if (spec.lsd) rows.push(['Độ chia nhỏ nhất', `${spec.lsd * (spec.rangeFromParams ? 1 : 1)} ${spec.unit}`]);
  if (res) rows.push(['Độ phân giải', `${res} ${spec.unit}`]);
  if (spec.accuracy != null || spec.accFromParams) {
    rows.push(['Sai số thiết bị', spec.accuracyText || `±${accOf(spec, 0, params)} ${spec.unit}`]);
  }
  const adj = (spec.params || []).filter((p) => !p.hidden).map((p) => p.label);
  rows.push(['Thông số điều chỉnh', adj.length ? adj.join('; ') : 'Không có']);
  rows.push(['Hướng dẫn sử dụng', spec.usage]);
  return rows;
}
