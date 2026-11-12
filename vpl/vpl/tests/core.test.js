import test from 'node:test';
import assert from 'node:assert/strict';
import { Rng } from '../js/core/rng.js';
import * as S from '../js/core/stats.js';
import * as P from '../js/core/physics.js';
import * as Gas from '../js/core/gas.js';
import { INSTRUMENTS, readInstrument, decimalsOf, specSheet } from '../js/core/instruments.js';
import { solveDC, bulbModel, diodeModel } from '../js/core/circuit.js';
import { Store, MemoryStorage } from '../js/core/store.js';

const close = (a, b, tol = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${msg} ${a} ≉ ${b}`);

// ───────── RNG ─────────
test('Rng: cùng seed → cùng dãy; gauss có trung bình/độ lệch đúng', () => {
  const a = new Rng(42), b = new Rng(42);
  for (let i = 0; i < 10; i++) assert.equal(a.uniform(), b.uniform());
  const r = new Rng(7); const xs = [];
  for (let i = 0; i < 20000; i++) xs.push(r.gauss(5, 2));
  close(S.mean(xs), 5, 0.02); close(S.sd(xs), 2, 0.03);
  assert.notEqual(new Rng(1).child('a').uniform(), new Rng(1).child('b').uniform());
});

// ───────── Thống kê ─────────
test('mean / sd mẫu', () => {
  const d = [2, 4, 4, 4, 5, 5, 7, 9];
  close(S.mean(d), 5);
  close(S.variance(d), 32 / 7);
  close(S.sd(d), Math.sqrt(32 / 7));
  assert.ok(Number.isNaN(S.sd([1])));
});

test('linreg: đường thẳng chính xác', () => {
  const x = [0, 1, 2, 3, 4], y = x.map((v) => 3 * v - 2);
  const f = S.linreg(x, y);
  close(f.slope, 3); close(f.intercept, -2); close(f.r, 1); close(f.r2, 1);
  close(f.xIntercept, 2 / 3);
  close(f.seSlope, 0, 1e-9);
});

test('linreg: số liệu có nhiễu – đối chiếu giá trị tính tay', () => {
  // x=1..5, y=[2.1,3.9,6.2,7.8,10.1] → slope=1.99, intercept=0.05
  const f = S.linreg([1, 2, 3, 4, 5], [2.1, 3.9, 6.2, 7.8, 10.1]);
  close(f.slope, 1.99, 1e-12); close(f.intercept, 0.05, 1e-9);
  // SSR = 0.1 → s = sqrt(0.1/3), se(slope)= s/sqrt(10)
  const ssr = [2.1, 3.9, 6.2, 7.8, 10.1].reduce((a, y, i) => a + (y - (1.99 * (i + 1) + 0.05)) ** 2, 0);
  close(f.sdResid, Math.sqrt(ssr / 3), 1e-12);
  close(f.seSlope, Math.sqrt(ssr / 3) / Math.sqrt(10), 1e-12);
  assert.ok(f.r > 0.99 && f.r < 1);
});

test('linreg: trường hợp suy biến', () => {
  assert.equal(S.linreg([1], [1]), null);
  assert.equal(S.linreg([2, 2, 2], [1, 2, 3]), null);
  const h = S.linreg([1, 2, 3], [5, 5, 5]);
  close(h.slope, 0); assert.ok(Number.isNaN(h.r));
});

test('linreg: sai số giao điểm trục x phù hợp mô phỏng Monte-Carlo', () => {
  const rng = new Rng(99); const x = [0, 10, 20, 30, 40, 50, 60, 70];
  const est = []; let se0 = 0;
  for (let k = 0; k < 4000; k++) {
    const y = x.map((v) => 0.2 * (v + 273.15) + rng.gauss(0, 0.3));
    const f = S.linreg(x, y); est.push(f.xIntercept); se0 += f.seXIntercept;
  }
  close(S.mean(est), -273.15, 0.01);
  close(se0 / 4000, S.sd(est), 0.08); // sai số lan truyền ≈ độ lệch chuẩn thực của ước lượng
});

test('t-Student 95%', () => {
  close(S.tCrit95(1), 12.706); close(S.tCrit95(4), 2.776); close(S.tCrit95(30), 2.042); close(S.tCrit95(1000), 1.96);
});

test('độ không đảm bảo loại A/B', () => {
  const u = S.uncertainty([10.0, 10.2, 9.8, 10.1, 9.9], 0.3);
  close(u.mean, 10); close(u.uA, S.sd([10.0, 10.2, 9.8, 10.1, 9.9]) / Math.sqrt(5));
  close(u.uB, 0.3 / Math.sqrt(3)); close(u.uc, Math.hypot(u.uA, u.uB)); close(u.U, 2 * u.uc);
});

test('định dạng chữ số có nghĩa', () => {
  assert.equal(S.fmtSig(1234.5678, 3), '1230');
  assert.equal(S.fmtSig(1234.5678, 4), '1235');
  assert.equal(S.fmtSig(0.0123456, 3), '0.0123');
  assert.equal(S.fmtSig(9.9996, 3), '10.0');
  assert.equal(S.fmtSig(NaN), '—');
  assert.equal(S.fmtWithUnc(9.8123, 0.0412), '9.81 ± 0.04');
  assert.equal(S.fmtWithUnc(9.8123, 0.0123), '9.812 ± 0.012');
  assert.equal(S.fmtWithUnc(1234, 56), '1230 ± 60');
});

test('sai số', () => {
  close(S.pctError(9.7, 9.81), 100 * 0.11 / 9.81);
  assert.ok(Number.isNaN(S.relError(1, 0)));
});

// ───────── Vật lý cơ học ─────────
test('Newton II: a = m g/(M+m) trong mô hình lý tưởng và khớp với ΣF = ma', () => {
  const r = P.cartPulley({ M: 0.5, m: 0.05, g: 9.81, ideal: true });
  close(r.a, 0.05 * 9.81 / 0.55);
  close(r.Tcart, 0.5 * r.a); close(r.Thanger, 0.05 * (9.81 - r.a)); close(r.Tcart, r.Thanger);
});

test('Newton II: ma sát và ròng rọc làm giảm a đúng công thức; lực căng hai phía chênh nhau I·a/r²', () => {
  const p = { M: 0.5, m: 0.05, g: 9.81, mu: 0.05, pulleyI: 3.75e-6, pulleyR: 0.025 };
  const r = P.cartPulley(p);
  const Ieff = 3.75e-6 / 0.025 ** 2;
  close(r.a, (0.05 * 9.81 - 0.05 * 0.5 * 9.81) / (0.5 + 0.05 + Ieff));
  close(r.Thanger - r.Tcart, Ieff * r.a, 1e-9);
  assert.ok(r.a < P.cartPulley({ ...p, ideal: true }).a);
});

test('Newton II: ma sát nghỉ giữ xe đứng yên khi lực kéo nhỏ', () => {
  const r = P.cartPulley({ M: 1, m: 0.01, g: 9.81, mu: 0.2, pulleyI: 0, pulleyR: 0.02 });
  assert.equal(r.a, 0); assert.equal(r.moving, false);
});

test('Newton II: tham số không hợp lệ bị từ chối', () => {
  assert.throws(() => P.cartPulley({ M: 0, m: 0.1, g: 9.81 }), RangeError);
  assert.throws(() => P.cartPulley({ M: 1, m: -1, g: 9.81 }), RangeError);
});

test('RK4 giải đúng dao động điều hòa (chu kỳ đầy đủ)', () => {
  const w = 2; let y = [1, 0]; const N = 4000, dt = (2 * Math.PI / w) / N;
  for (let i = 0; i < N; i++) y = P.rk4((_, s) => [s[1], -w * w * s[0]], y, i * dt, dt);
  close(y[0], 1, 1e-9); close(y[1], 0, 1e-8);
});

test('Rơi tự do: nghiệm giải tích có lực cản khớp tích phân RK4 và tiến về lý tưởng khi k→0', () => {
  const g = 9.81, k = 0.8;
  let y = [0, 0]; const N = 15000, dt = 1.5 / N;
  for (let i = 0; i < N; i++) y = P.rk4((_, s) => [s[1], g - k * s[1] * s[1]], y, i * dt, dt);
  const a = P.fallStateDrag(1.5, g, k);
  close(a.y, y[0], 1e-7); close(a.v, y[1], 1e-7);
  close(P.fallTimeDrag(1, g, 1e-12), P.fallTimeIdeal(1, g), 1e-6);
  // vận tốc giới hạn √(g/k)
  close(P.fallStateDrag(100, g, k).v, Math.sqrt(g / k), 1e-9);
  // thời gian rơi khớp quãng đường
  const th = P.fallTimeDrag(2, g, k); close(P.fallStateDrag(th, g, k).y, 2, 1e-9);
});

test('Rơi tự do: bóng bàn chịu cản đáng kể, bi thép gần như không', () => {
  const g = 9.81, h = 1.5;
  const kS = P.dragK({ radius: P.BALLS.steel.radius, mass: P.BALLS.steel.mass });
  const kP = P.dragK({ radius: P.BALLS.pingpong.radius, mass: P.BALLS.pingpong.mass });
  const dS = (P.fallTimeDrag(h, g, kS) / P.fallTimeIdeal(h, g) - 1);
  const dP = (P.fallTimeDrag(h, g, kP) / P.fallTimeIdeal(h, g) - 1);
  assert.ok(dS > 0 && dS < 0.003); assert.ok(dP > 5 * dS);
});

test('Đạo hàm số: x = ½at² → v = at (nội suy chính xác ở điểm trong)', () => {
  const t = Array.from({ length: 50 }, (_, i) => i * 0.02), a = 1.7;
  const x = t.map((v) => 0.5 * a * v * v);
  const v = P.derivative(t, x);
  for (let i = 1; i < 49; i++) close(v[i], a * t[i], 1e-9);
});

// ───────── Khí ─────────
test('Boyle: P·V không đổi khi T không đổi (mô hình lý tưởng)', () => {
  const cfg = Gas.makeGasConfig({ mode: 'isothermal', ideal: true });
  let s = Gas.initGasState(cfg, { V: 60 * Gas.mL });
  const pv0 = Gas.gasStatePressure(cfg, s) * s.Vread;
  for (const v of [30, 40, 80, 100]) {
    s = Gas.setVolume(cfg, s, v * Gas.mL); s = Gas.stepGas(cfg, s, 1);
    close(Gas.gasStatePressure(cfg, s) * s.Vread, pv0, 1e-9);
  }
  close(Gas.gasStatePressure(cfg, Gas.initGasState(cfg, { V: 60 * Gas.mL })), P.P_ATM, 1e-9);
});

test('Khí thực: nén nhanh làm nóng đoạn nhiệt rồi trở về nhiệt độ bể theo hàm mũ', () => {
  const cfg = Gas.makeGasConfig({ mode: 'isothermal' });
  let s = Gas.initGasState(cfg, { V: 80 * Gas.mL });
  s = Gas.setVolume(cfg, s, 40 * Gas.mL);
  const Tad = s.Tg;
  close(Tad, 295.15 * Math.pow((80 + 2) / (40 + 2), 0.4), 1e-12);
  assert.ok(Tad > 295.15 + 20);
  const s2 = Gas.stepGas(cfg, s, cfg.tauGas); // sau 1 τ: còn 1/e chênh lệch
  close(s2.Tg - 295.15, (Tad - 295.15) / Math.E, 1e-9);
  let s3 = s; for (let i = 0; i < 200; i++) s3 = Gas.stepGas(cfg, s3, 1);
  close(s3.Tg, 295.15, 1e-9); assert.ok(Gas.isSettled(s3, 1e-3));
});

test('Thể tích chết tạo sai số hệ thống: P(V+Vd)=const, P·V không đổi sai', () => {
  const cfg = Gas.makeGasConfig({ mode: 'isothermal', ideal: false });
  const read = (V) => { const s = Gas.initGasState(cfg, { V: V * Gas.mL }); return Gas.gasStatePressure(cfg, s) * V * Gas.mL; };
  assert.ok(Math.abs(read(20) - read(100)) / read(100) > 0.03);
});

test('Gay-Lussac: P tỉ lệ T tuyệt đối, ngoại suy P=0 tại −273,15 °C (mô hình lý tưởng)', () => {
  const cfg = Gas.makeGasConfig({ mode: 'isochoric', ideal: true });
  const xs = [], ys = [];
  for (const Tc of [10, 30, 50, 70, 90]) {
    let s = Gas.initGasState(cfg, { V: 60 * Gas.mL }); s = { ...s, Tset: Tc + 273.15 }; s = Gas.stepGas(cfg, s, 1);
    xs.push(Tc); ys.push(Gas.gasStatePressure(cfg, s));
  }
  close(S.linreg(xs, ys).xIntercept, -273.15, 1e-9);
});

test('Charles: V tỉ lệ T ở áp suất ngoài cố định; thể tích chết dịch giao điểm trục', () => {
  for (const ideal of [true, false]) {
    const cfg = Gas.makeGasConfig({ mode: 'isobaric', ideal });
    const xs = [], ys = [];
    for (const Tc of [10, 30, 50, 70, 90]) {
      let s = Gas.initGasState(cfg, {}); s = { ...s, Tset: Tc + 273.15 };
      for (let i = 0; i < 80; i++) s = Gas.stepGas(cfg, s, 5);
      xs.push(Tc); ys.push(s.Vread / Gas.mL);
    }
    const f = S.linreg(xs, ys);
    if (ideal) close(f.xIntercept, -273.15, 1e-6);
    else assert.ok(f.xIntercept > -273.15 + 3, `x0=${f.xIntercept}`);
  }
});

// ───────── Dụng cụ ─────────
test('readInstrument: lượng tử hóa, thang đo, chế độ lý tưởng', () => {
  const ruler = INSTRUMENTS.ruler;
  assert.equal(readInstrument(ruler, 0.123456, { mode: 'real' }).value, 0.1235);
  assert.equal(readInstrument(ruler, 0.123456, { mode: 'ideal' }).value, 0.123456);
  const o = readInstrument(ruler, 2.5, { mode: 'real' }); assert.equal(o.over, true); assert.equal(o.text, 'OL');
  const m = readInstrument(INSTRUMENTS.ammeter, 0.0123, { mode: 'real', params: { range: 0.02 } });
  assert.equal(m.text, '0.01230'); assert.equal(decimalsOf(0.0005), 4);
  assert.equal(readInstrument(INSTRUMENTS.ammeter, 0.5, { mode: 'real', params: { range: 0.2 } }).text, 'OL');
});

test('readInstrument: nhiễu có độ lệch chuẩn ≈ 0,4·Δ và offset hệ thống', () => {
  const rng = new Rng(5); const vm = INSTRUMENTS.voltmeter; const p = { range: 20 };
  const vals = []; for (let i = 0; i < 6000; i++) vals.push(readInstrument(vm, 5, { mode: 'noisy', params: p, rng }).value);
  const acc = 0.005 * 5 + 2 * 0.02;
  close(S.sd(vals), 0.4 * acc, 0.08);
  const off = readInstrument(vm, 5, { mode: 'noisy', params: p, offset: 1 });
  assert.ok(Math.abs(off.value - (5 + 0.7 * acc)) < 0.011);
  // chế độ 'real' xác định, không ngẫu nhiên
  const a = readInstrument(vm, 5.0123, { mode: 'real', params: p, rng }).value, b = readInstrument(vm, 5.0123, { mode: 'real', params: p, rng }).value;
  assert.equal(a, b);
});

test('mọi dụng cụ có thẻ thông số đầy đủ', () => {
  for (const s of Object.values(INSTRUMENTS)) {
    assert.ok(s.name && s.symbol && s.function && s.usage && s.lab && s.category, s.id);
    assert.ok(specSheet(s).length >= 3, s.id);
    if (s.measures) assert.ok(s.unit && (s.resolution || s.resFromParams) && (s.accuracy != null || s.accFromParams), s.id);
  }
});

// ───────── Bộ giải mạch ─────────
const wire = (...pairs) => pairs;
test('MNA: cầu phân áp 12 V, 1 kΩ – 2 kΩ', () => {
  const c = {
    components: [
      { id: 'E', type: 'source', p: { E: 12, r: 0 } },
      { id: 'R1', type: 'resistor', p: { R: 1000 } },
      { id: 'R2', type: 'resistor', p: { R: 2000 } },
    ],
    wires: wire(['E:p', 'R1:a'], ['R1:b', 'R2:a'], ['R2:b', 'E:n']),
  };
  const r = solveDC(c);
  assert.ok(r.ok);
  close(r.comp.R1.v, 4, 1e-7); close(r.comp.R2.v, 8, 1e-7); close(r.comp.R1.i, 4e-3, 1e-7);
  close(r.comp.E.i, 4e-3, 1e-7); close(r.comp.E.v, 12, 1e-7);
  // bảo toàn công suất
  close(r.comp.E.v * r.comp.E.i, r.comp.R1.power + r.comp.R2.power, 1e-7);
});

test('MNA: điện trở mắc song song – dòng tổng = tổng các nhánh (định luật Kirchhoff 1)', () => {
  const c = {
    components: [
      { id: 'E', type: 'source', p: { E: 6, r: 0 } },
      { id: 'A', type: 'ammeter', p: { Ra: 0 } },
      { id: 'R1', type: 'resistor', p: { R: 30 } },
      { id: 'R2', type: 'resistor', p: { R: 60 } },
    ],
    wires: wire(['E:p', 'A:p'], ['A:n', 'R1:a'], ['A:n', 'R2:a'], ['R1:b', 'E:n'], ['R2:b', 'E:n']),
  };
  const r = solveDC(c);
  close(r.comp.A.i, 6 / 20, 1e-7); // Rtđ = 20 Ω
  close(r.comp.R1.i + r.comp.R2.i, r.comp.A.i, 1e-7);
});

test('MNA: nguồn có điện trở trong – U = E − I·r', () => {
  const c = {
    components: [
      { id: 'E', type: 'battery', p: { E: 4.5, r: 1.8 } },
      { id: 'R', type: 'resistor', p: { R: 10 } },
    ],
    wires: wire(['E:p', 'R:a'], ['R:b', 'E:n']),
  };
  const r = solveDC(c);
  const I = 4.5 / 11.8;
  close(r.comp.E.i, I, 1e-7); close(r.comp.E.v, 4.5 - I * 1.8, 1e-7); close(r.comp.R.v, I * 10, 1e-7);
});

test('MNA: vôn kế/ampe kế thực gây sai số đúng công thức; lý tưởng thì không', () => {
  const build = (ideal) => ({
    components: [
      { id: 'E', type: 'source', p: { E: 10, r: 0 } },
      { id: 'R', type: 'resistor', p: { R: 1000 } },
      { id: 'A', type: 'ammeter', p: { Ra: ideal ? 0 : 1 } },
      { id: 'V', type: 'voltmeter', p: { Rv: ideal ? Infinity : 10000 } },
    ],
    // vôn kế đo cả (R + ampe kế)
    wires: wire(['E:p', 'A:p'], ['A:n', 'R:a'], ['R:b', 'E:n'], ['V:p', 'A:p'], ['V:n', 'R:b']),
  });
  const i = solveDC(build(true)); close(i.comp.V.v / i.comp.A.i, 1000, 1e-7);
  const r = solveDC(build(false));
  // vôn kế song song (R + Ra): dòng qua ampe kế = I_R + I_V
  close(r.comp.A.i, 10 / 1001 , 1e-7);
  close(r.comp.V.v, 10, 1e-7); // nguồn lý tưởng nối thẳng vào vôn kế
});

test('MNA: nguồn bị nối tắt bằng dây → báo lỗi rõ ràng, không treo', () => {
  const c = { components: [{ id: 'E', type: 'source', p: { E: 6, r: 0 } }], wires: [['E:p', 'E:n']] };
  const r = solveDC(c); assert.equal(r.ok, false); assert.match(r.error, /đoản mạch/);
});

test('MNA: công tắc mở/đóng; mạch hở → dòng bằng 0', () => {
  const mk = (closed) => ({
    components: [
      { id: 'E', type: 'source', p: { E: 5, r: 0 } }, { id: 'K', type: 'switch', p: { closed, rClosed: 0 } }, { id: 'R', type: 'resistor', p: { R: 50 } },
    ],
    wires: wire(['E:p', 'K:a'], ['K:b', 'R:a'], ['R:b', 'E:n']),
  });
  close(solveDC(mk(true)).comp.R.i, 0.1, 1e-7);
  assert.ok(Math.abs(solveDC(mk(false)).comp.R.i) < 1e-9);
});

test('Bóng đèn: đúng định mức 6 V → 3 W, 0,5 A, 12 Ω, T=2800 K; điện trở nguội ~0,8 Ω; phi tuyến', () => {
  const b = bulbModel();
  close(b.current(6), 0.5, 1e-6); close(b.temperature(6), 2800, 1e-6); close(b.R0, 0.8, 0.05);
  const r = (V) => V / b.current(V);
  assert.ok(r(1) < r(3) && r(3) < r(6) && r(6) < r(9));
  close(b.current(-4), -b.current(4), 1e-12); // đối xứng
  close(6 * b.current(6), 3, 1e-6);
});

test('Điốt: dòng 10 mA ở ~0,7 V; trong mạch nối tiếp Newton hội tụ và thỏa KVL', () => {
  const d = diodeModel();
  const v = d.nVt * Math.log(0.01 / d.Is); assert.ok(v > 0.65 && v < 0.78, `${v}`);
  const c = {
    components: [{ id: 'E', type: 'source', p: { E: 5, r: 0 } }, { id: 'R', type: 'resistor', p: { R: 430 } }, { id: 'D', type: 'diode', p: {} }],
    wires: wire(['E:p', 'R:a'], ['R:b', 'D:a'], ['D:k', 'E:n']),
  };
  const r = solveDC(c); assert.ok(r.ok);
  close(r.comp.R.v + r.comp.D.v, 5, 1e-6);
  close(r.comp.R.i, r.comp.D.i, 1e-6);
  assert.ok(r.comp.D.v > 0.6 && r.comp.D.v < 0.8);
  // phân cực ngược: dòng cực nhỏ
  const rev = solveDC({ ...c, components: [{ id: 'E', type: 'source', p: { E: -5, r: 0 } }, c.components[1], c.components[2]] });
  assert.ok(Math.abs(rev.comp.D.i) < 1e-8);
});

test('Điốt: hội tụ với nguồn 12 V và điện trở nhỏ (trường hợp khó)', () => {
  const c = {
    components: [{ id: 'E', type: 'source', p: { E: 12, r: 0 } }, { id: 'R', type: 'resistor', p: { R: 10 } }, { id: 'D', type: 'diode', p: {} }],
    wires: wire(['E:p', 'R:a'], ['R:b', 'D:a'], ['D:k', 'E:n']),
  };
  const r = solveDC(c); assert.ok(r.ok, r.error); close(r.comp.R.v + r.comp.D.v, 12, 1e-6);
});

test('Bóng đèn trong mạch: nguồn 6 V cho I=0,5 A, nguồn 12 V cho I < 2·0,5 A (phi tuyến, điện trở tăng)', () => {
  const mk = (E) => ({
    components: [{ id: 'E', type: 'source', p: { E, r: 0 } }, { id: 'L', type: 'bulb', p: {} }],
    wires: wire(['E:p', 'L:a'], ['L:b', 'E:n']),
  });
  close(solveDC(mk(6)).comp.L.i, 0.5, 1e-6);
  const i12 = solveDC(mk(12)).comp.L.i; assert.ok(i12 > 0.5 && i12 < 1.0, `${i12}`);
});

test('MNA: hai mạch tách rời không gây suy biến (gmin)', () => {
  const c = {
    components: [{ id: 'E', type: 'source', p: { E: 3, r: 0 } }, { id: 'R1', type: 'resistor', p: { R: 10 } }, { id: 'R2', type: 'resistor', p: { R: 20 } }],
    wires: wire(['E:p', 'R1:a'], ['R1:b', 'E:n']),
  };
  const r = solveDC(c); assert.ok(r.ok); close(r.comp.R1.i, 0.3, 1e-7); assert.ok(Math.abs(r.comp.R2.i) < 1e-9);
});

// ───────── Lưu trữ ─────────
test('Store: lưu/khôi phục phiên, trạng thái, dữ liệu hỏng, schema cũ', () => {
  const st = new Store(new MemoryStorage());
  assert.equal(st.loadSession('x'), null);
  assert.ok(st.saveSession('x', { rows: [{ a: 1 }], params: { g: 9.81 } }));
  const d = st.loadSession('x'); assert.equal(d.rows[0].a, 1); assert.equal(d.params.g, 9.81);
  st.setStatus('x', 'doing'); assert.equal(st.getStatus('x'), 'doing'); assert.equal(st.getStatus('y'), 'new');
  st.st.setItem('vpl:v1:session:bad', '{not json'); assert.equal(st.loadSession('bad'), null);
  st.st.setItem('vpl:v1:session:old', JSON.stringify({ v: 0, id: 'old' })); assert.equal(st.loadSession('old'), null);
  st.clearSession('x'); assert.equal(st.loadSession('x'), null); assert.equal(st.getStatus('x'), 'new');
});

test('Store: lỗi hết dung lượng được báo, không ném ngoại lệ', () => {
  const bad = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); }, removeItem() {} };
  const st = new Store(bad);
  assert.equal(st.saveSession('x', {}), false); assert.ok(st.lastError);
});

test('polyfit2: khôi phục a của chuyển động biến đổi đều, kể cả khi có nhiễu', () => {
  const t = Array.from({ length: 60 }, (_, i) => i * 0.02);
  const x0 = 0.25, v0 = 0.1, a = 0.83;
  const clean = S.polyfit2(t, t.map((u) => x0 + v0 * u + 0.5 * a * u * u));
  close(clean.a, a, 1e-9);
  const rng = new Rng(3); const est = [];
  for (let k = 0; k < 400; k++) est.push(S.polyfit2(t, t.map((u) => x0 + v0 * u + 0.5 * a * u * u + rng.gauss(0, 0.001))).a);
  close(S.mean(est), a, 0.01);
  const one = S.polyfit2(t, t.map((u) => x0 + 0.5 * a * u * u + rng.gauss(0, 0.001)));
  close(one.seA, S.sd(est), 0.25); // sai số chuẩn công bố ≈ độ lệch chuẩn thực nghiệm của ước lượng
  assert.equal(S.polyfit2([1, 2], [1, 2]), null);
});
