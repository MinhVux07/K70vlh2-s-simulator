import test from 'node:test';
import assert from 'node:assert/strict';
import { IMPLEMENTED, PLANNED, catalog, getExperiment } from '../js/registry.js';
import { INSTRUMENTS } from '../js/core/instruments.js';
import { newtonRun, PULLEY, D0, D_END } from '../js/experiments/newton2.js';
import { fallTime } from '../js/experiments/freefall.js';
import { buildCircuit } from '../js/experiments/ohm.js';
import { solveDC } from '../js/core/circuit.js';
import { csvOf, reportHTML } from '../js/ui/report.js';
import { Rng } from '../js/core/rng.js';
import { fmtSig } from '../js/core/stats.js';

const close = (a, b, tol, m = '') => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${m} ${a} ≉ ${b}`);

test('Danh mục: mã duy nhất, dữ liệu sư phạm đầy đủ và nhất quán', () => {
  const ids = IMPLEMENTED.map((e) => e.meta.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const e of IMPLEMENTED) {
    const m = e.meta, cols = typeof e.columns === 'function' ? null : e.columns;
    assert.ok(m.title && m.question && m.theory && m.conclusion && m.objective.length >= 2, m.id);
    assert.ok(m.procedure.length >= 4 && m.hints.length >= 3 && m.questions.length >= 3, m.id);
    assert.ok(m.predict.correct >= 0 && m.predict.correct < m.predict.options.length, m.id + ' predict');
    for (const q of m.questions) {
      assert.ok(q.explain, m.id);
      if (q.type === 'num') assert.ok(Number.isFinite(q.answer) && q.tol > 0);
      else assert.ok(q.answer >= 0 && q.answer < q.options.length, m.id);
    }
    for (const id of e.library) assert.ok(INSTRUMENTS[id], `${m.id}: dụng cụ ${id} không tồn tại`);
    for (const a of m.apparatus) for (const id of a.ids) assert.ok(e.library.includes(id), `${m.id}: ${id} không có trong thư viện`);
    if (e.slots) for (const [k, sl] of Object.entries(e.slots)) for (const id of sl.accepts) assert.ok(e.library.includes(id), `${m.id}.${k}: ${id}`);
    if (e.kind === 'slots') for (const id of e.library) assert.ok(Object.values(e.slots).some((s) => s.accepts.includes(id)) || e.reject?.[id], `${m.id}: ${id} không có khe và không có lý do từ chối`);
    const keys = new Set(cols.map((c) => c.key));
    for (const g of e.graphs) { assert.ok(keys.has(g.x) && keys.has(g.y), `${m.id}: đồ thị ${g.label}`); }
    for (const c of cols) assert.ok(c.symbol && c.label, `${m.id}.${c.key}`);
    assert.ok(typeof e.analyze === 'function' && typeof e.draw === 'function' || e.kind === 'circuit');
  }
  for (const lab of ['mech', 'therm', 'elec']) assert.equal(IMPLEMENTED.filter((e) => e.meta.lab === lab).length, 4, lab);
  assert.equal(PLANNED.length, 0); assert.equal(catalog().length, IMPLEMENTED.length);
  assert.equal(getExperiment('khong-co'), null);
});

test('Newton II: newtonRun khớp công thức đóng và thời gian chạy khớp quãng đường', () => {
  const I = 0.5 * PULLEY.m * PULLEY.r ** 2;
  const r = newtonRun({ M: 0.55, m: 0.05, g: 9.81, mu: 0.02, ideal: false });
  close(r.a, (0.05 * 9.81 - 0.02 * 0.55 * 9.81) / (0.55 + 0.05 + I / PULLEY.r ** 2), 1e-12);
  close(0.5 * r.a * r.tEnd ** 2, D_END - D0, 1e-12);
  const id = newtonRun({ M: 0.55, m: 0.05, g: 9.81, mu: 0.02, ideal: true });
  close(id.a, 0.05 * 9.81 / 0.6, 1e-12); assert.ok(id.a > r.a);
  assert.equal(newtonRun({ M: 2, m: 0.01, g: 9.81, mu: 0.3, ideal: false }).moving, false);
});

test('Rơi tự do: ideal/vacuum đúng √(2h/g), không khí làm chậm hơn', () => {
  close(fallTime({ h: 1.2, g: 9.81, rho: 1.2, ball: 'steel', ideal: true }), Math.sqrt(2.4 / 9.81), 1e-12);
  close(fallTime({ h: 1.2, g: 1.62, rho: 0, ball: 'pingpong', ideal: false }), Math.sqrt(2.4 / 1.62), 1e-12);
  assert.ok(fallTime({ h: 1.2, g: 9.81, rho: 1.2, ball: 'pingpong', ideal: false }) > Math.sqrt(2.4 / 9.81));
});

// giả lập tối thiểu một Workspace để dựng mạch
const fakeWs = (placed, wires, mode = 'ideal') => ({ ideal: mode === 'ideal', mode, state: { placed, wires }, hidden: (k, fn) => fn(new Rng(1).child(k)) });
test('Mạch thực: điện trở thực nằm trong dung sai ±5 %, nguồn có điện trở trong, ampe kế có sụt áp', () => {
  const placed = [
    { uid: 'E1', id: 'dcSource', params: { E: 10 } }, { uid: 'R1', id: 'resistor', params: { R: 1000 } },
    { uid: 'A1', id: 'ammeter', params: { range: 0.02 } }, { uid: 'V1', id: 'voltmeter', params: { range: 20 } },
  ];
  const wires = [['E1:p', 'A1:p'], ['A1:n', 'R1:a'], ['R1:b', 'E1:n'], ['V1:p', 'R1:a'], ['V1:n', 'R1:b']];
  const real = buildCircuit(fakeWs(placed, wires, 'real'));
  const R = real.components.find((c) => c.id === 'R1').p.R; assert.ok(R >= 950 && R <= 1050 && R !== 1000);
  const ideal = solveDC(buildCircuit(fakeWs(placed, wires, 'ideal')));
  close(ideal.comp.A1.i, 0.01, 1e-6); close(ideal.comp.V1.v, 10, 1e-6);
  const rs = solveDC(real); assert.ok(rs.ok);
  const Ra = 0.2 / 0.02; // 10 Ω ở thang 20 mA
  close(rs.comp.A1.i, 10 / (R + Ra + 0.5), 1e-4); // điện trở trong nguồn 0,5 Ω
});

test('Hiệu năng bộ giải mạch: 300 lần giải mạch có bóng đèn + điốt < 2 s', () => {
  const placed = [{ uid: 'E1', id: 'dcSource', params: { E: 9 } }, { uid: 'R1', id: 'resistor', params: { R: 47 } }, { uid: 'L1', id: 'bulb', params: {} }, { uid: 'D1', id: 'diode', params: {} }];
  const wires = [['E1:p', 'R1:a'], ['R1:b', 'L1:a'], ['L1:b', 'D1:a'], ['D1:k', 'E1:n']];
  const t = performance.now(); let prev = null;
  for (let i = 0; i < 300; i++) { placed[0].params.E = 1 + (i % 12); const r = solveDC(buildCircuit(fakeWs(placed, wires, 'ideal'))); assert.ok(r.ok, r.error); prev = r; }
  assert.ok(performance.now() - t < 2000, `${performance.now() - t} ms`);
  assert.ok(prev.comp.D1.v > 0.5);
});

test('Tình huống bất thường: mạch rỗng, linh kiện cô lập, đoản mạch nhiều vòng', () => {
  assert.ok(solveDC({ components: [], wires: [] }).ok);
  const lone = solveDC({ components: [{ id: 'R1', type: 'resistor', p: { R: 100 } }], wires: [] }); assert.ok(lone.ok);
  const sc = solveDC({ components: [{ id: 'E1', type: 'source', p: { E: 5, r: 0 } }, { id: 'E2', type: 'source', p: { E: 3, r: 0 } }], wires: [['E1:p', 'E2:p'], ['E1:n', 'E2:n']] });
  assert.equal(sc.ok, false);
});

const model = (over = {}) => ({
  title: 'Thử <b>', labName: 'Cơ học', date: '1/1', modeLabel: 'Lý tưởng', seed: 'ff', student: { name: 'An "A"', cls: '10A' }, objective: ['m'], theory: '<p>x</p>', instruments: [], placed: [], benchSVG: null,
  procedure: ['b1'], columns: [{ symbol: 'x', unit: 'm' }, { symbol: 'y', unit: 's' }], rows: [{ included: true, cells: ['1', '2'] }, { included: false, cells: ['3', '4'] }],
  rawRows: [[1, 2], [3, 'a,b']], graphPNG: null, graphCaption: '', calcs: [], analysis: [{ label: 'a', value: '1', ref: null, err: null }], errorNotes: [], observation: '<img src=x onerror=1>', conclusion: 'ok', officialConclusion: null, ...over,
});
test('Báo cáo: escape HTML, đánh dấu dòng bị loại, CSV an toàn dấu phẩy/nháy', () => {
  const html = reportHTML(model()); assert.ok(!html.includes('<img src=x'), 'XSS'); assert.ok(html.includes('&lt;img')); assert.ok(html.includes('class="ex"'));
  assert.ok(html.includes('BÁO CÁO THÍ NGHIỆM: Thử &lt;b&gt;'));
  const csv = csvOf(model()); assert.ok(csv.startsWith('﻿')); assert.ok(csv.includes('"a,b"')); assert.ok(csv.includes('x (m)'));
});
test('Định dạng số: không NaN/Infinity rò ra giao diện', () => { for (const v of [NaN, Infinity, -Infinity, undefined, null]) assert.equal(fmtSig(v), '—'); });

import { extension, lengthAt } from '../js/experiments/hooke.js';
import { timeNPeriods } from '../js/experiments/pendulum.js';
import { stepState, equilibrium, ROOM, CW } from '../js/experiments/calorimetry.js';

test('Hooke: tuyến tính trong giới hạn đàn hồi, mềm đi khi vượt', () => {
  assert.ok(Math.abs(extension(0.5, 20, true) - 0.025) < 1e-12);
  assert.ok(Math.abs(extension(0.5, 20, false) - 0.025) < 1e-12);
  assert.ok(extension(3, 20, false) > 3 / 20);
  assert.ok(Math.abs(lengthAt(0.15, 0.05, 99, false) - 0.2) < 1e-9);
});
test('Con lắc: T khớp 2π√(L/g) ở biên độ nhỏ, và dài hơn ở biên độ lớn', () => {
  const T0 = 2 * Math.PI * Math.sqrt(1 / 9.81), t = timeNPeriods({ L: 1, g: 9.81, theta0Deg: 2, N: 10 }) / 10;
  assert.ok(Math.abs(t - T0) / T0 < 1e-3, `${t} vs ${T0}`);
  const t60 = timeNPeriods({ L: 1, g: 9.81, theta0Deg: 60, N: 5 }) / 5;
  assert.ok(t60 / T0 > 1.06 && t60 / T0 < 1.09, String(t60 / T0));
});
test('Nhiệt lượng kế: bảo toàn năng lượng và hội tụ về nhiệt độ cân bằng', () => {
  const p = { mw: 150, ms: 150, c: 900, Ccal: 0, Tset: 90, tauBath: 0, tauHeat: 5, tauS: 4, tauLoss: 0, tauProbe: 0 };
  let st = { loc: 'cal', Ts: 90, Tw: ROOM, Tb: 90, Tp: ROOM, probe: 'water' };
  st = stepState(p, st, 120);
  const Tf = equilibrium({ mw: 0.15, T0: ROOM, ms: 0.15, c: 900, T1: 90 });
  assert.ok(Math.abs(st.Tw - Tf) < 1e-3 && Math.abs(st.Ts - Tf) < 1e-3, `${st.Tw} ${Tf}`);
  const E = 0.15 * CW * (st.Tw - ROOM) - 0.15 * 900 * (90 - st.Ts); assert.ok(Math.abs(E) < 0.5, String(E));
});
