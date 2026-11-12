// Cảnh 3D chung cho các thí nghiệm mạch điện: dựng lại linh kiện và dây nối từ trạng thái bàn lắp 2D.
import { G, hex } from '../gl3d.js';
import { C, tag, fmt } from './props3d.js';
import { TERM_POS, PART_W, PART_H } from '../art.js';
import { INSTRUMENTS } from '../../core/instruments.js';

const SC = 0.001, W = 900, H = 420; // m/px
const steel = { color: C.steel, metal: 0.92, shine: 100 };
const wx = (x) => (x - W / 2) * SC, wz = (y) => (y - H / 2) * SC;
const snap = (v) => Math.round(v / 10) * 10, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const BAND = ['#111', '#7b4a1c', '#e03a3a', '#ff9d2e', '#f2d64a', '#3bb04f', '#3b6fe0', '#8a4fd1', '#8a8f94', '#f4f4f4'];
function bandsOf(R) { const e = Math.floor(Math.log10(R)), d = Math.round(R / 10 ** (e - 1)); return [Math.floor(d / 10) % 10, d % 10, Math.max(0, Math.min(9, e - 1))]; }
const WIRE = ['#e8453c', '#2b2f33', '#f2c230', '#2fbf9f', '#5b8def', '#e07bd0'];

function post(g, x, z, red) { g.push([G.cyl(0.0042, 0.0042, 0.014, 16), { pos: [x, 0.007, z], color: red === 1 ? hex('#e8453c') : red === 2 ? hex('#2b2f33') : hex('#d9a441') }], [G.cyl(0.0052, 0.0052, 0.003, 16), { pos: [x, 0.0155, z], color: hex('#c9d3da') }]); }

/** Dựng một linh kiện; trả về { node, upd(live) } để cập nhật động. */
function build(S, it) {
  const cx = wx(it.x), cz = wz(it.y + 32), root = S.group({ pos: [cx, 0, cz], pick: { uid: it.uid } }), a = TERM_POS[it.id], t0 = a[Object.keys(a)[0]], t1 = a[Object.keys(a)[1]];
  const lx = (t) => (t[0] - 0) * SC, lz = (t) => (t[1] - 32) * SC, mid = 55 * SC;
  const x0 = lx(t0), x1 = lx(t1), p = it.params, dyn = {};
  const posts = []; const body = (g, o) => root.add(g, o);
  let red0 = 0, red1 = 0;
  switch (it.id) {
    case 'resistor': {
      const b = bandsOf(p.R); body(G.cyl(0.0085, 0.0085, 0.046, 28), { pos: [mid, 0.012, 0], rot: [0, 0, Math.PI / 2], color: '#d8c398', shine: 20 });
      [-0.017, -0.0095, -0.002, 0.0145].forEach((dx, i) => body(G.cyl(0.0089, 0.0089, 0.0036, 28), { pos: [mid + dx, 0.012, 0], rot: [0, 0, Math.PI / 2], color: i < 3 ? BAND[b[i]] : '#c8a24a', metal: i === 3 ? 0.8 : 0, shadow: false }));
      body(G.cyl(0.0009, 0.0009, 0.04, 8), { pos: [(x0 + mid - 0.023) / 2, 0.012, 0], rot: [0, 0, Math.PI / 2], ...steel, scl: [1, (mid - 0.023 - x0) / 0.04, 1] });
      body(G.cyl(0.0009, 0.0009, 0.04, 8), { pos: [(x1 + mid + 0.023) / 2, 0.012, 0], rot: [0, 0, Math.PI / 2], ...steel, scl: [1, (x1 - mid - 0.023) / 0.04, 1] });
      dyn.label = `${p.R >= 1000 ? p.R / 1000 + ' kΩ' : p.R + ' Ω'}`; break;
    }
    case 'rheostat': {
      body(G.box(0.085, 0.022, 0.04), { pos: [mid, 0.011, 0], color: '#7a4b2f', shine: 15 });
      const rings = []; for (let i = 0; i < 24; i++) rings.push([G.box(0.0016, 0.004, 0.036, hex('#c98a4b')), { pos: [mid - 0.038 + i * 0.0033, 0.024, 0] }]); body(G.merge(rings), { metal: 0.9 });
      dyn.slider = body(G.box(0.008, 0.016, 0.014), { color: C.dark, metal: 0.5 }); dyn.sx = (mid - 0.038) * 1; dyn.sw = 0.076;
      body(G.box(0.002, 0.03, 0.002), { pos: [mid, 0.04, 0], visible: false }); dyn.label = 'Biến trở 100 Ω'; break;
    }
    case 'dcSource': {
      body(G.box(0.092, 0.042, 0.056), { pos: [mid, 0.021, 0], color: '#2a4054', metal: 0.5, shine: 60 }); body(G.box(0.05, 0.002, 0.018), { pos: [mid - 0.012, 0.043, 0.008], color: '#0b1418', shadow: false });
      body(G.cyl(0.008, 0.008, 0.006, 24), { pos: [mid + 0.028, 0.045, -0.012], color: '#9fb0bb', metal: 0.9 });
      red0 = 2; red1 = 1; dyn.label = 'E'; break;
    }
    case 'battery': {
      body(G.box(0.07, 0.022, 0.034), { pos: [mid, 0.011, 0], color: '#3a3f44', metal: 0.4 }); body(G.box(0.056, 0.0016, 0.03), { pos: [mid, 0.0229, 0], color: '#d9a441', shadow: false });
      red0 = 2; red1 = 1; dyn.label = 'Pin 4,5 V'; break;
    }
    case 'bulb': {
      body(G.cyl(0.011, 0.011, 0.014, 24), { pos: [mid, 0.007, 0], ...steel, color: '#b8a26a', metal: 0.8 });
      dyn.glass = body(G.lathe([[0.001, 0.014], [0.012, 0.016], [0.02, 0.028], [0.022, 0.042], [0.016, 0.058], [0.006, 0.066], [0.001, 0.067]], 40), { pos: [mid, 0, 0], color: '#e8f3ff', alpha: 0.22, shadow: false });
      dyn.fil = body(G.helix(0.004, 0.0009, 0.046, 0.034, 5), { pos: [mid, 0, 0], color: '#ffb347', emissive: 0.1, shadow: false });
      dyn.halo = body(G.sphere(0.036, 24), { pos: [mid, 0.04, 0], color: '#ffd37a', alpha: 0, emissive: 1, shadow: false });
      body(G.cyl(0.0009, 0.0009, 0.04, 8), { pos: [(x0 + mid - 0.011) / 2, 0.01, 0], rot: [0, 0, Math.PI / 2], ...steel, scl: [1, (mid - 0.011 - x0) / 0.04, 1] });
      body(G.cyl(0.0009, 0.0009, 0.04, 8), { pos: [(x1 + mid + 0.011) / 2, 0.01, 0], rot: [0, 0, Math.PI / 2], ...steel, scl: [1, (x1 - mid - 0.011) / 0.04, 1] }); dyn.label = 'Bóng đèn'; break;
    }
    case 'diode': {
      body(G.cyl(0.0042, 0.0042, 0.022, 20), { pos: [mid, 0.012, 0], rot: [0, 0, Math.PI / 2], color: '#15191d', shine: 80 });
      body(G.cyl(0.0044, 0.0044, 0.003, 20), { pos: [mid + 0.0075, 0.012, 0], rot: [0, 0, Math.PI / 2], ...steel, shadow: false });
      dyn.led = body(G.sphere(0.0058, 14), { pos: [mid - 0.004, 0.012, 0], color: '#7dffb0', alpha: 0.0, emissive: 1, shadow: false });
      body(G.cyl(0.0009, 0.0009, 0.04, 8), { pos: [(x0 + mid - 0.011) / 2, 0.012, 0], rot: [0, 0, Math.PI / 2], ...steel, scl: [1, (mid - 0.011 - x0) / 0.04, 1] });
      body(G.cyl(0.0009, 0.0009, 0.04, 8), { pos: [(x1 + mid + 0.011) / 2, 0.012, 0], rot: [0, 0, Math.PI / 2], ...steel, scl: [1, (x1 - mid - 0.011) / 0.04, 1] }); dyn.label = 'Điốt'; break;
    }
    case 'switch': {
      body(G.box(0.06, 0.01, 0.034), { pos: [mid, 0.005, 0], color: '#1d2832', metal: 0.4 }); body(G.cyl(0.003, 0.003, 0.012, 12), { pos: [mid - 0.022, 0.016, 0], ...steel }); body(G.cyl(0.003, 0.003, 0.012, 12), { pos: [mid + 0.022, 0.016, 0], ...steel });
      dyn.lever = root.add(null, { pos: [mid - 0.022, 0.022, 0] }); dyn.lever.add(G.box(0.048, 0.003, 0.012), { pos: [0.024, 0, 0], color: '#d9a441', metal: 0.8 }); dyn.lever.add(G.sphere(0.0065, 16), { pos: [0.044, 0.004, 0], color: '#ff6b6b' }); break;
    }
    case 'ammeter': case 'voltmeter': {
      body(G.box(0.092, 0.036, 0.056), { pos: [mid, 0.018, 0], color: it.id === 'ammeter' ? '#304a3f' : '#2f3f5a', metal: 0.5, shine: 60 }); body(G.box(0.05, 0.002, 0.02), { pos: [mid, 0.0372, -0.006], color: '#0b1418', shadow: false });
      red0 = it.id === 'ammeter' ? 1 : 1; red1 = 2; dyn.label = it.id === 'ammeter' ? 'A' : 'V'; break;
    }
    default: break;
  }
  const keys = Object.keys(a), terms = [];
  [[keys[0], x0, red0], [keys[1], x1, red1]].forEach(([k, x, red]) => { const pg = []; post(pg, 0, 0, red); terms.push(root.add(G.merge(pg), { ...steel, metal: 0.6, pos: [x, 0, 0], pickTerm: `${it.uid}:${k}`, pad: 0.009 })); });
  return { root, dyn, mid, x0, x1, terms };
}

export function circuit3d(ws, S) {
  S.floorY = 0; let key = '', parts = new Map(), wires = [];
  const board = S.add(G.box(1.02, 0.012, 0.5), { pos: [0, -0.004, 0], color: '#2d6a52', metal: 0.2, shine: 30 });
  const grid = []; for (let i = -16; i <= 16; i++) for (let j = -7; j <= 7; j++) grid.push([G.cyl(0.0016, 0.0016, 0.0012, 8), { pos: [i * 0.03, 0.0004, j * 0.03] }]);
  S.add(G.merge(grid), { color: '#0c1d16', shadow: false });
  const sig = () => ws.state.placed.map((p) => `${p.uid}:${p.id}:${Math.round(p.x)}:${Math.round(p.y)}:${p.params.R ?? ''}:${p.params.closed ? 1 : 0}:${p.params.pos ?? ''}`).join('|') + '#' + ws.state.wires.map((w) => w.join('>')).join(',');
  const rebuild = () => {
    parts.forEach((q) => q.root.remove()); parts.clear(); wires.forEach((w) => w.remove()); wires = [];
    for (const it of ws.state.placed) if (TERM_POS[it.id]) parts.set(it.uid, { it, ...build(S, it) });
    ws.state.wires.forEach(([a, b], i) => {
      const pt = (id) => { const [uid, t] = id.split(':'), q = parts.get(uid); if (!q) return null; const T = TERM_POS[q.it.id][t]; return [wx(q.it.x + T[0]), 0.0155, wz(q.it.y + T[1])]; };
      const A = pt(a), B = pt(b); if (!A || !B) return; const d = Math.hypot(B[0] - A[0], B[2] - A[2]), up = 0.014 + d * 0.16 + (i % 3) * 0.006, path = [];
      for (let k = 0; k <= 24; k++) { const t = k / 24, h = Math.sin(Math.PI * t); const sag = 0.0; path.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t + up * h, A[2] + (B[2] - A[2]) * t + (((i % 2) ? 1 : -1) * 0.012 * h)]); }
      wires.push(S.add(G.tube(path, 0.0024, 8), { color: WIRE[i % WIRE.length], shine: 70, poly: path, pickR: 0.007, wireIdx: i }));
    });
  };
  const bench = () => ws.bench, ptWorld = (id) => { const [uid, t] = id.split(':'), q = parts.get(uid); if (!q) return null; const T = TERM_POS[q.it.id][t]; return [wx(q.it.x + T[0]), 0.0155, wz(q.it.y + T[1])]; };
  const toPx = (P) => ({ x: P[0] / SC + W / 2, y: P[2] / SC + H / 2 });
  let hoverTerm = null, dn = null, prev = null, prevKey = '';
  const info = (ray) => {
    const list = S.pick(ray), term = list.find((h) => h.kind === 'term'); if (term) return { type: 'term', id: term.node.pickTerm };
    const part = list.find((h) => h.kind === 'obj' && h.root?.pick?.uid), wire = list.find((h) => h.kind === 'wire');
    if (part && (!wire || part.t <= wire.t)) return { type: 'part', uid: part.root.pick.uid };
    if (wire) return { type: 'wire', i: wire.node.wireIdx }; return null;
  };
  const interact = {
    down(e, ray) {
      const i = info(ray); if (!i) return false; dn = { i };
      if (i.type === 'part') { const it = ws.getByUid(i.uid), P = S.rayPlane(ray, 0.01); if (!it || !P) { dn = null; return false; } const q = toPx(P); dn.offX = it.x + PART_W / 2 - q.x; dn.offY = it.y + PART_H / 2 - q.y; }
      return true;
    },
    move(e, ray, moved) {
      if (!dn || dn.i.type !== 'part' || !moved) return; const it = ws.getByUid(dn.i.uid), P = S.rayPlane(ray, 0.01); if (!it || !P) return; const q = toPx(P);
      const nx = clamp(snap(q.x + dn.offX - PART_W / 2), 0, W - PART_W), ny = clamp(snap(q.y + dn.offY - PART_H / 2), 20, H - PART_H);
      if (nx !== it.x || ny !== it.y) { it.x = nx; it.y = ny; dn.dragged = true; ws.changed({ structural: false }); }
    },
    up(e, ray, moved) {
      const d = dn; dn = null; if (!d) return; const i = d.i, b = bench();
      if (i.type === 'part') { if (!d.dragged) ws.selectPart(i.uid, true); else { ws.selected = i.uid; ws.renderSide(); ws.changed({ structural: false }); } }
      else if (i.type === 'term') { if (!b.pending) b.pending = i.id; else if (b.pending === i.id) b.pending = null; else { ws.addWire(b.pending, i.id); b.pending = null; } b.render(); }
      else if (i.type === 'wire') ws.removeWire(i.i);
    },
    hover(e, ray) {
      const i = info(ray); hoverTerm = i?.type === 'term' ? i.id : null; S.canvas.style.cursor = i ? (i.type === 'part' ? 'grab' : 'pointer') : '';
      const b = bench(); if (b.pending) { const A = ptWorld(b.pending), P = S.rayPlane(ray, 0.02); if (A && P) { const k = `${b.pending}|${P[0].toFixed(3)}|${P[2].toFixed(3)}`; if (k !== prevKey) { prevKey = k; prev?.remove(); const path = []; for (let n = 0; n <= 16; n++) { const t = n / 16, h = Math.sin(Math.PI * t); path.push([A[0] + (P[0] - A[0]) * t, A[1] + (P[1] - A[1]) * t + 0.02 * h, A[2] + (P[2] - A[2]) * t]); } prev = S.add(G.tube(path, 0.002, 6), { color: '#35d0ba', emissive: 1.4, shadow: false, pick: false }); } } }
    },
    click() { const b = bench(); if (b.pending) { b.pending = null; b.render(); } },
  };
  return {
    interact,
    toBench(ev) { const P = S.rayPlane(S.ray(ev.clientX, ev.clientY), 0.01); return P ? toPx(P) : null; },
    update() {
      const b0 = bench(); if (!b0.pending && prev) { prev.remove(); prev = null; prevKey = ''; }
      for (const q of parts.values()) q.terms.forEach((tn) => { const on = tn.pickTerm === b0.pending ? 1.8 : tn.pickTerm === hoverTerm ? 1.0 : 0; tn.emissive = on; tn.set({ color: on ? '#35d0ba' : C.steel }); });
      const k = sig(); if (k !== key) { key = k; rebuild(); }
      for (const q of parts.values()) {
        const it = q.it, live = ws.exp.live ? ws.exp.live(ws, it) : {}, d = q.dyn, top = [wx(it.x) + q.mid, 0.07, wz(it.y + 32)];
        if (it.id === 'bulb') { const g = live.glow || 0; d.fil.set({ emissive: 0.1 + 2.2 * g, color: g > 0.05 ? '#ffe6a8' : '#ffb347' }); d.halo.set({ alpha: 0.28 * g, emissive: 1 }); d.glass.set({ alpha: 0.2 + 0.1 * g }); }
        if (it.id === 'diode') d.led.set({ alpha: 0.5 * (live.glow || 0) });
        if (it.id === 'switch') d.lever.rot = [0, 0, it.params.closed ? 0 : 0.6];
        if (it.id === 'rheostat') { d.slider.pos = [q.mid - 0.038 + (it.params.pos / 100) * 0.076, 0.032, 0]; tag(S, `con chạy ${Math.round(it.params.pos)} % → ${fmt(it.params.pos, 0)} Ω`, [top[0], 0.075, top[2]], { size: 11 }); }
        if (it.id === 'dcSource') tag(S, `${it.uid}: ${it.params.E.toFixed(1)} V`, [top[0] - 0.012, 0.062, top[2]], { color: '#35d0ba', size: 13, bold: true });
        else if (it.id === 'ammeter' || it.id === 'voltmeter') tag(S, `${live.text ?? '----'} ${it.id === 'ammeter' ? 'A' : 'V'}  (${it.uid})`, [top[0], 0.062, top[2]], { color: live.warn ? '#ff6b6b' : '#35d0ba', size: 13, bold: true });
        else tag(S, `${it.uid}: ${q.dyn.label || it.id}`, [top[0], it.id === 'bulb' ? 0.09 : 0.05, top[2]], { size: 11, color: live.warn ? '#ff6b6b' : '#d6e6ef' });
      }
      if (!ws.state.placed.length) tag(S, 'Lắp linh kiện và nối dây ở chế độ 2D – tại đây bạn quan sát mạch thật', [0, 0.06, 0], { color: '#8aa3b3', keep: true });
      else if (ws.rt.circuitError) tag(S, '⚠ ' + ws.rt.circuitError, [0, 0.15, 0.2], { color: '#ff6b6b', keep: true, size: 13 });
    },
  };
}
export const circuitCam = { target: [0, 0, 0.02], dist: 0.82, yaw: 0.0, pitch: 1.0 };
