// Cảnh 3D cho Nhiệt học: xi lanh khí trong bể nước (Boyle/Gay-Lussac/Charles) và nhiệt lượng kế.
import { G, hex } from '../gl3d.js';
import { C, lcd, tag, fmt, tempColor } from './props3d.js';
import { INSTRUMENTS } from '../../core/instruments.js';
import { T_ZERO_C } from '../../core/physics.js';
import * as GAS from '../../core/gas.js';

const steel = { color: C.steel, metal: 0.92, shine: 100 };
const AREA = 9.62e-4; // m² (r = 17,5 mm)

function bubbles(S, n, box) {
  const b = Array.from({ length: n }, (_, i) => ({ n: S.add(G.sphere(0.003, 12), { color: '#bfe9ff', alpha: 0.35, shadow: false, visible: false }), p: Math.random(), x: (Math.random() - 0.5) * box.w, z: (Math.random() - 0.5) * box.d }));
  return (on, dt) => b.forEach((q) => { q.n.visible = on; if (!on) return; q.p = (q.p + dt * (0.25 + 0.15 * (q.x > 0 ? 1 : 0.5))) % 1; q.n.pos = [box.x + q.x, box.y0 + q.p * (box.y1 - box.y0), box.z + q.z]; q.n.scl = 0.6 + q.p; });
}
const heaterGeom = () => { const path = []; for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 6; path.push([0.05 * Math.cos(a) * (0.6 + 0.4 * i / 60), 0, 0.045 * Math.sin(a) * (0.6 + 0.4 * i / 60)]); } return G.tube(path, 0.0025, 6); };

// ───────────── Chất khí ─────────────
export function gas3d(ws, S) {
  S.floorY = 0;
  const bath = S.group({ pos: [0, 0, 0], visible: false, pick: { slot: 'bath' } });
  const bw = 0.34, bh = 0.12, bd = 0.13;
  bath.add(G.box(bw + 0.02, 0.012, bd + 0.02), { pos: [0, 0.006, 0], color: C.dark, metal: 0.6 });
  const water = bath.add(G.box(bw, bh - 0.012, bd), { pos: [0, 0.012 + (bh - 0.012) / 2, 0], color: '#3b8fb6', alpha: 0.32, shadow: false, pick: false });
  const glass = bath.add(G.box(bw + 0.004, bh, bd + 0.004), { pos: [0, 0.012 + bh / 2, 0], color: '#b5e3f5', alpha: 0.1, shadow: false, pick: false });
  const coil = bath.add(heaterGeom(), { pos: [0, 0.03, 0], color: '#ff8a3d', metal: 0.5, emissive: 0 });
  const bub = bubbles(S, 14, { x: 0, y0: 0.04, y1: 0.12, z: 0, w: bw * 0.8, d: bd * 0.7 });
  const syr = S.group({ pos: [0, 0.075, 0], visible: false, pick: { slot: 'syringe' } });
  const barrel = syr.add(G.cyl(0.0185, 0.0185, 0.15, 40, null, false), { pos: [0.03, 0, 0], rot: [0, 0, Math.PI / 2], color: '#d8eef7', alpha: 0.18, shadow: false, metal: 0.1, pick: false });
  syr.add(G.cyl(0.0185, 0.0185, 0.003, 40), { pos: [0.105, 0, 0], rot: [0, 0, Math.PI / 2], ...steel });
  const gasN = syr.add(G.cyl(0.017, 0.017, 1, 36), { rot: [0, 0, Math.PI / 2], color: '#9fdcff', alpha: 0.28, shadow: false, pick: false });
  const plunger = syr.add(null, {}); plunger.add(G.cyl(0.0172, 0.0172, 0.01, 36), { rot: [0, 0, Math.PI / 2], color: '#2b3943', metal: 0.2 });
  plunger.add(G.cyl(0.004, 0.004, 0.2, 14), { pos: [-0.105, 0, 0], rot: [0, 0, Math.PI / 2], ...steel }); plunger.add(G.cyl(0.02, 0.02, 0.006, 24), { pos: [-0.21, 0, 0], rot: [0, 0, Math.PI / 2], color: '#2b3943', metal: 0.3 });
  const tickG = G.merge(Array.from({ length: 11 }, (_, i) => [G.box(0.0007, i % 5 === 0 ? 0.01 : 0.006, 0.0007, hex('#10161b')), { pos: [0.1 - (i * 10) * 1e-6 / AREA, 0.0185 * 0.7, 0.0176] }]));
  syr.add(tickG, { shadow: false });
  const parts = Array.from({ length: 42 }, () => ({ n: syr.add(G.sphere(0.0013, 10), { shadow: false, emissive: 0.6 }), z: (Math.random() - 0.5) * 2 }));
  const tube = S.add(G.tube([[0.11, 0.075, 0], [0.16, 0.075, 0], [0.22, 0.09, 0], [0.30, 0.09, 0]], 0.0028, 8), { color: '#8a97a1', metal: 0.4, visible: false });
  const ps = S.group({ pos: [0.36, 0, 0.0], visible: false, pick: { slot: 'pressure' } }); ps.add(G.box(0.1, 0.09, 0.07), { pos: [0, 0.045, 0], color: C.panel, metal: 0.5 });
  const dial = ps.add(G.cyl(0.032, 0.032, 0.006, 40), { pos: [0, 0.06, 0.037], rot: [Math.PI / 2, 0, 0], color: '#0e1a22', metal: 0.2 });
  const needle = ps.add(G.box(0.028, 0.002, 0.002), { pos: [0, 0.06, 0.042], color: '#ff6b6b', emissive: 1, shadow: false });
  const tp = S.group({ pos: [-0.02, 0.19, 0.0], visible: false, pick: { slot: 'temp' } }); tp.add(G.cyl(0.0035, 0.0035, 0.22, 12), { pos: [0, -0.04, 0], ...steel }); tp.add(G.sphere(0.006, 16), { pos: [0, -0.152, 0], color: C.amber, emissive: 0.5 });
  const td = S.group({ pos: [-0.3, 0.0, 0.14], visible: false, pick: { slot: 'temp' } }); td.add(G.box(0.12, 0.05, 0.08), { pos: [0, 0.025, 0], color: C.panel, metal: 0.5 });
  const cable = S.add(G.tube([[-0.02, 0.19, 0], [-0.04, 0.26, 0], [-0.2, 0.2, 0.1], [-0.3, 0.05, 0.14]], 0.0016, 6), { color: '#222', visible: false });
  return {
    update(dt) {
      const g = ws.state.x.gas, cfg = ws.rt.cfg, sy = ws.slot('syringe'), bt = ws.slot('bath'), pr = ws.slot('pressure'), tm = ws.slot('temp');
      bath.visible = !!bt; syr.visible = !!sy; ps.visible = !!pr; tube.visible = !!(pr && sy); tp.visible = !!tm; td.visible = !!tm; cable.visible = !!tm;
      if (!g || !cfg) return;
      const Tbc = g.Tb - T_ZERO_C, Tgc = g.Tg - T_ZERO_C;
      if (bt) {
        water.set({ color: tempColor(Tbc, 5, 95) }); const heating = g.Tset - g.Tb > 0.4; coil.emissive = heating ? 1.2 : 0.05; coil.set({ color: heating ? '#ff7a2a' : '#6b7580' });
        bub(Tbc > 55 || heating, dt); tag(S, `Bể ổn nhiệt: đặt ${bt.params.setpoint} °C`, [0, 0.19, 0.12], { color: '#ffb454' });
      } else bub(false, dt);
      if (sy) {
        const Lg = (g.Vread * 1) / AREA; gasN.scl = [1, Lg, 1]; gasN.pos = [0.105 - 0.0015 - Lg / 2, 0, 0]; gasN.set({ color: tempColor(Tgc, 5, 95) });
        plunger.pos = [0.105 - Lg - 0.0015 - 0.005, 0, 0];
        const x0 = 0.105 - Lg, w = Lg - 0.004;
        for (const p of ws.rt.particles || []) { /* gán theo chỉ số */ }
        (ws.rt.particles || []).forEach((p, i) => { const q = parts[i]; if (!q) return; q.n.pos = [x0 + p.x * Math.max(0.004, w), (p.y - 0.5) * 0.028, q.z * 0.012 * (0.4 + p.x * 0.6)]; q.n.set({ color: tempColor(Tgc, 5, 95) }); });
        tag(S, `V = ${fmt(g.Vread / GAS.mL, 1)} mL`, [0.03, 0.075 + 0.07, 0.0], { color: '#9fdcff' });
      }
      if (pr && sy) { const r = ws.read(INSTRUMENTS.pressureSensor, GAS.gasStatePressure(cfg, g) / 1000, {}, 'pressureSensor'); const a = Math.PI * (1.2 - 1.4 * Math.min(1, r.value / 400)); needle.pos = [0.014 * Math.cos(a) , 0.06 + 0.014 * Math.sin(a), 0.042]; needle.rot = [0, 0, a]; tag(S, `p = ${r.text} kPa`, [0.36, 0.115, 0.04], { color: '#35d0ba' }); }
      if (tm) { const r = ws.read(INSTRUMENTS.tempSensor, g.Ts - T_ZERO_C, {}, 'tempSensor'); tag(S, `${r.text} °C`, [-0.3, 0.075, 0.14], { color: '#35d0ba', size: 14, bold: true }); }
      if (!ws.state.placed.length) tag(S, 'Lắp xi lanh, cảm biến và bể ổn nhiệt ở chế độ 2D', [0, 0.1, 0], { color: '#8aa3b3', keep: true });
    },
  };
}
export const gasCam = { target: [0.04, 0.09, 0.02], dist: 0.82, yaw: 0.5, pitch: 0.32 };

// ───────────── Nhiệt lượng kế ─────────────
export function calorimetry3d(ws, S) {
  S.floorY = 0;
  const bath = S.group({ pos: [-0.22, 0, 0], visible: false, pick: { slot: 'bath' } }), BW = 0.18, BH = 0.12;
  bath.add(G.box(BW + 0.02, 0.012, BW + 0.02), { pos: [0, 0.006, 0], color: C.dark, metal: 0.6 });
  const bWater = bath.add(G.box(BW, 0.09, BW), { pos: [0, 0.057, 0], color: '#3b8fb6', alpha: 0.35, shadow: false, pick: false });
  bath.add(G.box(BW + 0.004, BH, BW + 0.004), { pos: [0, 0.012 + BH / 2, 0], color: '#b5e3f5', alpha: 0.1, shadow: false, pick: false });
  const coil = bath.add(heaterGeom(), { pos: [0, 0.028, 0], color: '#ff8a3d', metal: 0.5 });
  const bub = bubbles(S, 14, { x: -0.22, y0: 0.04, y1: 0.1, z: 0, w: 0.12, d: 0.12 });
  const cal = S.group({ pos: [0.2, 0, 0], visible: false, pick: { slot: 'cal' } });
  cal.add(G.lathe([[0.001, 0], [0.05, 0], [0.052, 0.002], [0.052, 0.1], [0.046, 0.1], [0.046, 0.004]], 48), { color: '#e9eef2', metal: 0.25, shine: 60 });
  const cw = cal.add(G.cyl(0.0455, 0.0455, 1, 40), { color: '#3b8fb6', alpha: 0.55, shadow: false, pick: false });
  const stir = cal.add(G.cyl(0.0022, 0.0022, 0.14, 8), { pos: [0.015, 0.06, 0], ...steel });
  const crane = S.group({ visible: true });
  crane.add(G.box(0.62, 0.012, 0.012), { pos: [0, 0.27, 0], ...steel, color: '#9fb0bb' });
  for (const sx of [-0.31, 0.31]) crane.add(G.cyl(0.006, 0.006, 0.27, 12), { pos: [sx, 0.135, 0], ...steel });
  const slider = S.add(G.box(0.03, 0.02, 0.02), { color: C.dark, metal: 0.5, visible: false, pick: { slot: 'sample' } });
  const thread = S.add(G.cyl(0.0008, 0.0008, 1, 6), { color: '#efe3b7', visible: false });
  const sample = S.add(G.box(0.03, 0.03, 0.03), { ...steel, color: '#aab4bc', metal: 0.9, visible: false, pick: { slot: 'sample' } });
  const probe = S.group({ visible: false, pick: { slot: 'temp' } }); probe.add(G.cyl(0.003, 0.003, 0.2, 10), { pos: [0, 0.1, 0], ...steel }); probe.add(G.sphere(0.005, 14), { color: C.amber, emissive: 0.5 });
  const td = S.group({ pos: [0.0, 0, -0.17], visible: false, pick: { slot: 'temp' } }); td.add(G.box(0.12, 0.05, 0.07), { pos: [0, 0.025, 0], color: C.panel, metal: 0.5 });
  const bal = S.group({ pos: [0.4, 0, 0.08], visible: false, pick: { slot: 'balance' } }); bal.add(G.box(0.15, 0.03, 0.12), { pos: [0, 0.015, 0], color: C.panel, metal: 0.5 }); bal.add(G.cyl(0.04, 0.04, 0.005, 32), { pos: [0, 0.033, 0], ...steel });
  const cur = { p: [0, 0.07, 0], start: [0, 0.07, 0], s: 1, loc: 'bench' };
  return {
    update(dt) {
      const s = ws.state.x.cal, b = ws.slot('bath'), c = ws.slot('cal'), sm = ws.slot('sample'), tp = ws.slot('temp'), bl = ws.slot('balance'); if (!s) return;
      bath.visible = !!b; cal.visible = !!c; td.visible = !!tp; bal.visible = !!bl;
      if (b) { bWater.set({ color: tempColor(s.Tb, 5, 95) }); const heating = b.params.setpoint - s.Tb > 0.4; coil.emissive = heating ? 1.2 : 0.05; coil.set({ color: heating ? '#ff7a2a' : '#6b7580' }); bub(s.Tb > 55 || heating, dt); tag(S, `Bể: đặt ${b.params.setpoint} °C`, [-0.22, 0.2, 0.1], { color: '#ffb454' }); } else bub(false, dt);
      if (c) { const hh = 0.02 + (c.params.mw / 300) * 0.06; cw.scl = [1, hh, 1]; cw.pos = [0, 0.004 + hh / 2, 0]; cw.set({ color: tempColor(s.Tw, 5, 95) }); tag(S, `${c.params.mw} g nước`, [0.2, 0.125, 0.0], { color: '#9fdcff' }); }
      slider.visible = thread.visible = sample.visible = !!sm;
      if (sm) {
        const sz = 0.018 + 0.012 * Math.cbrt(sm.params.ms / 150), tgt = s.loc === 'bath' && b ? [-0.22, 0.045 + sz / 2 + 0.01, 0] : s.loc === 'cal' && c ? [0.2, 0.012 + sz / 2 + 0.01, 0] : [0, 0.07, 0.14];
        if (cur.loc !== s.loc) { cur.loc = s.loc; cur.start = [...cur.p]; cur.s = 0; }
        cur.s = Math.min(1, cur.s + dt / 1.1); const e = cur.s * cur.s * (3 - 2 * cur.s); cur.p = cur.start.map((v, i) => v + (tgt[i] - v) * e); const lift = Math.sin(Math.PI * cur.s) * 0.11;
        const px = cur.p[0], py = cur.p[1] + lift; sample.setGeom(G.box(sz, sz, sz)); sample.pos = [px, py, 0];
        const hot = Math.min(1, Math.max(0, (s.Ts - 30) / 65)); sample.set({ color: hot > 0.05 ? [0.67 + 0.33 * hot, 0.7 - 0.45 * hot, 0.74 - 0.55 * hot] : '#aab4bc', emissive: hot * 0.55, metal: 0.9 - 0.5 * hot });
        slider.pos = [px, 0.262, 0]; thread.pos = [px, (0.262 + py + sz / 2) / 2, 0]; thread.scl = [1, Math.max(0.001, 0.262 - py - sz / 2), 1];
        tag(S, `mẫu ${sm.params.ms} g`, [px, py + sz / 2 + 0.03, 0], { color: '#d6e6ef', size: 11 });
      }
      probe.visible = !!tp; if (tp) {
        const inBath = s.probe === 'bath' && b; probe.pos = inBath ? [-0.27, 0.036, 0.05] : c ? [0.23, 0.02, 0.0] : [0.4, 0.2, -0.1]; if (!inBath && !c) probe.visible = false;
        const r = ws.read(INSTRUMENTS.tempSensor, s.Tp, {}, 'tempSensor'); tag(S, `${r.text} °C  (đầu dò: ${inBath ? 'bể' : 'nước'})`, [0, 0.07, -0.17], { color: '#35d0ba', size: 14, bold: true });
      }
      if (bl && c && sm) tag(S, `Cân: ${fmt(c.params.mw / 1000, 4)} kg | ${fmt(sm.params.ms / 1000, 4)} kg`, [0.4, 0.08, 0.08], { color: '#35d0ba' });
      if (!ws.state.placed.length) tag(S, 'Lắp nhiệt lượng kế, mẫu, bể, cảm biến và cân ở chế độ 2D', [0, 0.15, 0], { color: '#8aa3b3', keep: true });
    },
  };
}
export const calCam = { target: [0, 0.1, 0.03], dist: 0.95, yaw: 0.35, pitch: 0.36 };
