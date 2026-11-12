// Cảnh 3D cho 4 thí nghiệm Cơ học.
import { G, hex } from '../gl3d.js';
import { C, rulerGeom, stand, lcd, tag, fmt } from './props3d.js';
import { INSTRUMENTS } from '../../core/instruments.js';
import { BALLS, fallStateDrag } from '../../core/physics.js';
import { D0, D_END, CART_L } from '../../experiments/newton2.js';
import { curL, hangMass } from '../../experiments/hooke.js';
import { planet, hSet } from '../../experiments/freefall.js';

const steel = { color: C.steel, metal: 0.92, shine: 100 };

function timerBox(S, ws, slotKey, pos, getText) {
  const t = ws.slot(slotKey), nodes = [];
  const grp = S.group({ pos, visible: false, pick: { slot: slotKey } });
  grp.add(G.box(0.2, 0.07, 0.12), { color: C.panel, metal: 0.5 });
  grp.add(G.box(0.15, 0.003, 0.05), { pos: [0, 0.036, 0.015], color: '#0b1418', shadow: false });
  const round = grp.add(G.cyl(0.05, 0.05, 0.025, 40), { pos: [0, 0.047, 0], color: C.steel, metal: 0.9 });
  return { grp, update() { const tm = ws.slot(slotKey); grp.visible = !!tm; round.visible = tm?.id === 'stopwatch'; if (tm) tag(S, `${tm.id === 'stopwatch' ? 'Đồng hồ bấm giây' : 'Đồng hồ đếm'}: ${getText()} s`, [pos[0], pos[1] + 0.13, pos[2]], { color: '#35d0ba' }); } };
}

// ───────────── Con lắc đơn ─────────────
export function pendulum3d(ws, S) {
  const H = 1.42; S.floorY = 0;
  stand(S, { x: 0.3, h: H, arm: 0.3 });
  S.add(G.sphere(0.008, 16), { pos: [0, H, 0], ...steel });
  const ru = S.add(rulerGeom(1.25), { pos: [-0.12, H, 0.0], rot: [0, 0, -Math.PI / 2], visible: false, pick: { slot: 'ruler' } });
  const grp = S.group({ pos: [0, H, 0], visible: false, pick: { slot: 'pend' } });
  const str = grp.add(G.cyl(0.0012, 0.0012, 1, 8), { color: '#e8e2cf', shine: 5 });
  const bob = grp.add(G.sphere(0.022, 36), { ...steel, color: '#b9c4cc' });
  let arc = null, arcKey = '';
  const gate = S.group({ visible: false, pick: { slot: 'timer' } });
  for (const sz of [-0.05, 0.05]) gate.add(G.box(0.012, 0.09, 0.012), { pos: [0, 0, sz], ...steel, color: C.dark, metal: 0.5 });
  gate.add(G.box(0.014, 0.012, 0.12), { pos: [0, -0.045, 0], color: C.dark });
  const beam = gate.add(G.cyl(0.0015, 0.0015, 0.1, 8), { rot: [Math.PI / 2, 0, 0], color: C.red, emissive: 1, shadow: false });
  const tb = timerBox(S, ws, 'timer', [-0.55, 0.035, 0.25], () => (ws.rt.reading ? ws.rt.reading.text : '0.0000'));
  return {
    update() {
      const p = ws.slot('pend'), L = p ? p.params.L : 0.6, th = p ? (ws.rt.st ? ws.rt.st.th : (p.params.theta0 * Math.PI) / 180) : 0;
      grp.visible = !!p; ru.visible = !!ws.slot('ruler');
      if (p) {
        grp.rot = [0, 0, th]; str.pos = [0, -L / 2, 0]; str.scl = [1, L, 1]; bob.pos = [0, -L, 0];
        const key = `${p.params.theta0}`; if (key !== arcKey) { arcKey = key; arc?.remove(); const t0 = (p.params.theta0 * Math.PI) / 180, R = 0.22; const path = []; for (let i = 0; i <= 24; i++) { const a = (t0 * i) / 24; path.push([R * Math.sin(a), H - R * Math.cos(a), 0]); } arc = S.add(G.tube(path, 0.0022, 6), { color: C.teal, emissive: 0.8, shadow: false }); }
        tag(S, `θ₀ = ${p.params.theta0}°`, [0.12, H - 0.25, 0], { color: '#35d0ba' }); tag(S, `L = ${p.params.L.toFixed(2)} m`, [-0.12, H - L / 2, 0.02]);
        const tm = ws.slot('timer'); gate.visible = tm?.id === 'photogateTimer'; gate.pos = [0, H - L - 0.02, 0]; beam.emissive = Math.abs(th) < 0.04 ? 1.6 : 0.25;
        if (ws.rt.phase === 'running') tag(S, `đếm ${ws.rt.count}/${ws.setting('N')}`, [0, H + 0.1, 0], { color: '#ffb454' });
      } else if (arc) { arc.remove(); arc = null; arcKey = ''; gate.visible = false; }
      tb.update();
      if (!ws.state.placed.length) tag(S, 'Lắp con lắc, đồng hồ và thước ở chế độ 2D', [0, 0.5, 0], { color: '#8aa3b3', keep: true });
    },
  };
}
export const pendulumCam = { target: [0, 0.74, 0], dist: 2.45, yaw: 0.6, pitch: 0.14 };

// ───────────── Hooke ─────────────
export function hooke3d(ws, S) {
  const H = 0.68; S.floorY = 0;
  stand(S, { x: 0.28, h: H, arm: 0.28 });
  const ru = S.add(rulerGeom(0.5), { pos: [0.1, H, 0.0], rot: [0, 0, -Math.PI / 2], visible: false, pick: { slot: 'ruler' } });
  const grp = S.group({ pos: [0, H, 0], visible: false, pick: { slot: 'spring' } });
  const springN = grp.add(G.helix(0.025, 0.0026, 0, -0.15, 14), { ...steel, metal: 0.95 });
  const hang = grp.add(null, { pick: { slot: 'hanger' } });
  hang.add(G.torus(0.008, 0.0014, 20, 8), { pos: [0, -0.008, 0], ...steel });
  hang.add(G.cyl(0.03, 0.03, 0.004, 32), { pos: [0, -0.04, 0], ...steel, color: '#9fb0bb' });
  hang.add(G.cyl(0.0012, 0.0012, 0.03, 8), { pos: [0, -0.02, 0], ...steel });
  let discs = [], lastL = -1, lastN = -1;
  const ptr = S.add(G.box(0.1, 0.0012, 0.003), { color: C.teal, emissive: 1, shadow: false, visible: false });
  const bal = S.group({ pos: [0.42, 0.0, 0.12], visible: false, pick: { slot: 'balance' } });
  bal.add(G.box(0.2, 0.03, 0.14), { pos: [0, 0.015, 0], color: C.panel, metal: 0.5 }); bal.add(G.cyl(0.05, 0.05, 0.006, 40), { pos: [0, 0.033, -0.01], ...steel });
  return {
    update() {
      const sp = ws.slot('spring'), hg = ws.slot('hanger'), L = sp ? curL(ws) : 0.15;
      grp.visible = !!sp; ru.visible = !!ws.slot('ruler'); bal.visible = !!ws.slot('balance');
      if (sp) {
        if (Math.abs(L - lastL) > 2e-4) { lastL = L; springN.setGeom(G.helix(0.025, 0.0026, 0, -L, 14)); hang.pos = [0, -L, 0]; }
        hang.visible = !!hg; const n = hg ? hg.params.discs : 0;
        if (n !== lastN) { lastN = n; discs.forEach((d) => d.remove()); discs = []; for (let i = 0; i < n; i++) discs.push(hang.add(G.cyl(0.026, 0.026, 0.0036, 32), { pos: [0, -0.0455 - 0.0038 * i, 0], color: C.brass, metal: 0.9, shine: 80 })); }
        ptr.visible = !!ws.slot('ruler'); ptr.pos = [0.05, H - L, 0.0];
        tag(S, `L = ${fmt(L, 4)} m`, [0.16, H - L, 0.02], { color: '#35d0ba' });
        if (hg) tag(S, `${n}×10 g + giá → F = ${fmt(hangMass(hg) * ws.setting('g'), 3)} N`, [0, H - L - 0.1 - 0.004 * n, 0.03]);
        if (!ws.ideal && ws.rt.t < 3) tag(S, 'đang dao động…', [-0.18, H - L / 2, 0.02], { color: '#ffb454' });
      }
      if (bal.visible && hg) tag(S, `${fmt(hangMass(hg), 4)} kg`, [0.42, 0.09, 0.12], { color: '#35d0ba' });
      if (!ws.state.placed.length) tag(S, 'Lắp lò xo, giá treo và thước ở chế độ 2D', [0, 0.5, 0], { color: '#8aa3b3', keep: true });
    },
  };
}
export const hookeCam = { target: [0.06, 0.4, 0], dist: 1.05, yaw: 0.5, pitch: 0.12 };

// ───────────── Định luật II Newton ─────────────
export function newton3d(ws, S) {
  S.floorY = 0;
  const X_S = -0.5, RAIL_Y = 0.62, xEnd = X_S + D_END + CART_L + 0.14, len = xEnd - X_S + 0.1, cx = (X_S - 0.08 + xEnd + 0.02) / 2;
  S.add(G.box(len + 0.1, 0.022, 0.07), { pos: [cx, RAIL_Y - 0.011, 0], ...steel, color: '#aab6bf', metal: 0.85 });
  S.add(G.box(len + 0.1, 0.004, 0.012), { pos: [cx, RAIL_Y + 0.0005, 0], color: '#3a4650', shadow: false });
  for (const x of [X_S + 0.1, xEnd - 0.1]) { S.add(G.box(0.03, RAIL_Y - 0.022, 0.06), { pos: [x, (RAIL_Y - 0.022) / 2, 0], ...steel, color: '#6f7f8b', metal: 0.8 }); S.add(G.box(0.12, 0.02, 0.2), { pos: [x, 0.01, 0], color: C.dark, metal: 0.6 }); }
  // cảm biến chuyển động
  const ms = S.group({ pos: [X_S - 0.04, RAIL_Y + 0.045, 0], visible: false, pick: { slot: 'sensor' } });
  ms.add(G.box(0.05, 0.07, 0.09), { color: C.panel, metal: 0.5 }); ms.add(G.cyl(0.032, 0.032, 0.01, 36), { pos: [0.028, 0, 0], rot: [0, 0, Math.PI / 2], color: C.brass, metal: 0.9 });
  const rings = [0, 1, 2].map(() => S.add(G.torus(0.05, 0.0012, 40, 6), { rot: [0, Math.PI / 2, 0], color: C.teal, emissive: 1, alpha: 0.5, shadow: false, visible: false }));
  const ru = S.add(rulerGeom(D_END + CART_L + 0.2), { pos: [X_S, RAIL_Y - 0.032, 0.036], visible: false, pick: { slot: 'ruler' } });
  // xe
  const cart = S.group({ pos: [0, RAIL_Y + 0.03, 0], visible: false, pick: { slot: 'cart' } });
  cart.add(G.box(CART_L, 0.035, 0.065), { pos: [0, 0, 0], color: '#2aa898', metal: 0.5, shine: 80 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cart.add(G.cyl(0.013, 0.013, 0.01, 24), { pos: [sx * CART_L * 0.33, -0.02, sz * 0.036], rot: [Math.PI / 2, 0, 0], color: C.black, metal: 0.4 });
  const fs = cart.add(G.box(0.04, 0.025, 0.03), { pos: [CART_L / 2 + 0.02, 0.003, 0], color: C.panel, metal: 0.5, visible: false, pick: { slot: 'force' } });
  let blocks = [], disc = [], lastB = -1, lastD = -1;
  // ròng rọc
  const pul = S.group({ pos: [xEnd, RAIL_Y + 0.052, 0], visible: false, pick: { slot: 'pulley' } }), PR = 0.025;
  const wheel = pul.add(null, {}); wheel.add(G.cyl(PR, PR, 0.012, 40), { rot: [Math.PI / 2, 0, 0], color: '#9fb0bb', metal: 0.95 });
  wheel.add(G.box(PR * 1.6, 0.004, 0.014), { color: C.dark }); wheel.add(G.box(0.004, PR * 1.6, 0.014), { color: C.dark });
  S.add(G.box(0.02, 0.07, 0.02), { pos: [xEnd, RAIL_Y + 0.012, 0.0], color: C.dark, metal: 0.5, visible: true }).visible = false;
  const pulStand = S.add(G.cyl(0.004, 0.004, 0.06, 12), { pos: [xEnd, RAIL_Y + 0.03, 0.03], ...steel, visible: false, pick: { slot: 'pulley' } });
  const s1 = S.add(G.cyl(0.0009, 0.0009, 1, 6), { rot: [0, 0, Math.PI / 2], color: '#efe3b7', shine: 4, visible: false });
  const s2 = S.add(G.cyl(0.0009, 0.0009, 1, 6), { color: '#efe3b7', shine: 4, visible: false });
  const hang = S.group({ visible: false, pick: { slot: 'hanger' } }); hang.add(G.box(0.032, 0.004, 0.032), { pos: [0, -0.018, 0], ...steel }); hang.add(G.cyl(0.0008, 0.0008, 0.018, 6), { pos: [0, -0.007, 0], ...steel });
  let hd = [], lastH = -1;
  return {
    update() {
      const rt = ws.rt, d = rt.d ?? D0, cartIt = ws.slot('cart'), hg = ws.slot('hanger'), pu = ws.slot('pulley'), mi = ws.slot('sensor'), f = ws.slot('force');
      ms.visible = !!mi; ru.visible = !!ws.slot('ruler'); cart.visible = !!cartIt; pul.visible = !!pu; pulStand.visible = !!pu;
      const xc = X_S + d + CART_L / 2; cart.pos = [xc, RAIL_Y + 0.03, 0]; fs.visible = !!f;
      if (cartIt) {
        const b = cartIt.params.blocks, dc = cartIt.params.discs;
        if (b !== lastB) { lastB = b; blocks.forEach((x) => x.remove()); blocks = []; for (let i = 0; i < b; i++) blocks.push(cart.add(G.box(CART_L * 0.8, 0.022, 0.055), { pos: [0, 0.0285 + 0.0225 * i, 0], color: '#5a6b78', metal: 0.85, shine: 60 })); }
        if (dc !== lastD || b !== lastB) { lastD = dc; disc.forEach((x) => x.remove()); disc = []; }
        if (!disc.length && dc) for (let i = 0; i < dc; i++) disc.push(cart.add(G.cyl(0.025, 0.025, 0.003, 28), { pos: [-0.02, 0.0185 + 0.0225 * lastB + 0.0032 * i, 0], color: C.brass, metal: 0.9 }));
        tag(S, `xe + tải ${(cartIt.params.discs * 10 + cartIt.params.blocks * 100)} g`, [xc, RAIL_Y + 0.12 + 0.0225 * b, 0]);
      }
      if (mi) { const live = ws.read(INSTRUMENTS.motionSensor, d, mi.params, 'motionSensor'); tag(S, `${live.text} m`, [X_S - 0.04, RAIL_Y + 0.12, 0], { color: '#35d0ba' });
        rings.forEach((r, i) => { const on = rt.phase === 'running'; r.visible = on; if (on) { const ph = ((rt.t * 3 + i / 3) % 1); r.pos = [X_S + 0.03 + ph * (xc - X_S - 0.1), RAIL_Y + 0.045, 0]; r.scl = 0.5 + ph * 0.9; r.alpha = 0.55 * (1 - ph); } }); } else rings.forEach((r) => (r.visible = false));
      const n = hg ? hg.params.discs : 0;
      if (hg && pu && cartIt) {
        const frontX = xc + CART_L / 2 + (f ? 0.04 : 0), top = RAIL_Y + 0.052 + PR - 0.0, hx = xEnd + PR, yh = RAIL_Y + 0.052 + PR - 0.03 - (d - D0) - 0.04;
        const yStr = RAIL_Y + 0.03 + 0.003;
        s1.visible = true; const topY = RAIL_Y + 0.052 + PR; s1.pos = [(frontX + xEnd) / 2, topY, 0]; s1.scl = [1, Math.max(0.01, xEnd - frontX), 1];
        s2.visible = true; s2.pos = [hx, (topY + yh) / 2, 0]; s2.scl = [1, Math.max(0.01, topY - yh - 0.0), 1];
        wheel.rot = [0, 0, -(d - D0) / PR]; hang.visible = true; hang.pos = [hx, yh, 0];
        if (n !== lastH) { lastH = n; hd.forEach((x) => x.remove()); hd = []; for (let i = 0; i < n; i++) hd.push(hang.add(G.cyl(0.015, 0.015, 0.0034, 24), { pos: [0, -0.0128 + 0.0036 * (i + 1) - 0.0036, 0], color: C.brass, metal: 0.9 })); hd.forEach((x, i) => (x.pos = [0, 0.0 + 0.0036 * i, 0])); }
        tag(S, `${n}×10 g + giá`, [hx + 0.1, yh, 0], { color: '#ffb454' });
      } else { s1.visible = s2.visible = false; hang.visible = !!hg; if (hg) { hang.pos = [xEnd + PR, 0.35, 0]; } }
      if (rt.phase === 'running') tag(S, `t = ${fmt(rt.t, 2)} s`, [0, RAIL_Y + 0.3, 0], { color: '#ffb454' });
      if (!ws.state.placed.length) tag(S, 'Lắp xe, ròng rọc, giá treo và cảm biến ở chế độ 2D', [0, 0.45, 0], { color: '#8aa3b3', keep: true });
    },
  };
}
export const newtonCam = { target: [0.1, 0.52, 0], dist: 1.35, yaw: 0.5, pitch: 0.22 };

// ───────────── Rơi tự do ─────────────
export function freefall3d(ws, S) {
  S.floorY = 0; const YS = 1.75;
  stand(S, { x: 0.35, h: YS + 0.06, arm: 0.35 });
  const mag = S.group({ pos: [0, YS + 0.045, 0], visible: false, pick: { slot: 'magnet' } });
  mag.add(G.cyl(0.035, 0.035, 0.04, 36), { ...steel, color: '#7c8791' }); mag.add(G.torus(0.03, 0.004, 28, 8), { pos: [0, -0.021, 0], rot: [Math.PI / 2, 0, 0], color: '#c47a2e', metal: 0.9 });
  const ru = S.add(rulerGeom(1.6), { pos: [-0.1, YS, 0], rot: [0, 0, -Math.PI / 2], visible: false, pick: { slot: 'ruler' } });
  const ball = S.add(G.sphere(0.0125, 36), { ...steel, color: '#c0cbd3', pick: { slot: 'ball' } }); let lastMat = '';
  const trail = [0, 1, 2, 3, 4, 5].map(() => S.add(G.sphere(0.0125, 20), { color: '#9fb0bb', alpha: 0.2, shadow: false, visible: false }));
  const gate = S.group({ visible: false, pick: { slot: 'timer' } }); for (const sz of [-0.06, 0.06]) gate.add(G.box(0.014, 0.1, 0.014), { pos: [0, 0, sz], color: C.dark, metal: 0.5 });
  gate.add(G.box(0.016, 0.014, 0.134), { pos: [0, -0.05, 0], color: C.dark }); const beam = gate.add(G.cyl(0.0015, 0.0015, 0.11, 8), { rot: [Math.PI / 2, 0, 0], color: C.red, emissive: 1, shadow: false });
  const pad = S.add(G.cyl(0.05, 0.05, 0.01, 36), { color: '#5b6f7c', metal: 0.7, visible: false, pick: { slot: 'timer' } });
  const tb = timerBox(S, ws, 'timer', [-0.55, 0.035, 0.3], () => (ws.rt.reading ? ws.rt.reading.text : '0.0000'));
  return {
    update() {
      const rt = ws.rt, mg = ws.slot('magnet'), bl = ws.slot('ball'), tm = ws.slot('timer'), h = hSet(ws), pl = planet(ws);
      mag.visible = !!mg; ru.visible = !!ws.slot('ruler');
      const yBall0 = YS - 0.0;
      if (bl) {
        const mat = bl.params.material, B = BALLS[mat]; if (mat !== lastMat) { lastMat = mat; ball.setGeom(G.sphere(B.radius, 36)); ball.set({ color: { steel: '#c0cbd3', wood: '#c9a063', pingpong: '#f6f3e8' }[mat], metal: mat === 'steel' ? 0.95 : 0, shine: mat === 'steel' ? 120 : 20 }); trail.forEach((t) => t.setGeom(G.sphere(B.radius, 16))); }
        let y = 0; if (rt.phase === 'falling') y = fallStateDrag(rt.t, rt.g, rt.k).y; else if (rt.phase === 'landed') y = h;
        ball.visible = true; ball.pos = [0, yBall0 - y - B.radius * (rt.phase === 'landed' ? 0 : 0), 0];
        trail.forEach((t, i) => { const on = rt.phase === 'falling'; t.visible = on; if (on) { const s = fallStateDrag(Math.max(0, rt.t - (i + 1) * 0.02), rt.g, rt.k); t.pos = [0, yBall0 - s.y, 0]; t.alpha = 0.22 * (1 - i / 6); } });
        tag(S, B.label, [0.1, ball.pos[1], 0], { size: 11 });
      } else { ball.visible = false; trail.forEach((t) => (t.visible = false)); }
      const yb = YS - h; gate.visible = tm?.id === 'photogateTimer'; gate.pos = [0, yb, 0]; beam.emissive = rt.phase === 'landed' ? 1.8 : 0.3;
      pad.visible = tm?.id === 'stopwatch'; pad.pos = [0, yb - 0.0125, 0];
      if (ws.slot('magnet')) tag(S, `h = ${h.toFixed(2)} m`, [0.14, YS - h / 2, 0.02], { color: '#35d0ba' });
      tag(S, `${pl.v === 'x' ? 'Hành tinh X' : pl.label.split(' (')[0]}`, [0.35, 0.05, 0.2], { color: '#8aa3b3' });
      tb.update();
      if (rt.phase === 'falling') tag(S, `t = ${fmt(rt.t, 3)} s`, [0.22, YS - 0.2, 0], { color: '#ffb454' });
      if (!ws.state.placed.length) tag(S, 'Lắp nam châm điện, bi, đồng hồ và thước ở chế độ 2D', [0, 0.9, 0], { color: '#8aa3b3', keep: true });
    },
  };
}
export const freefallCam = { target: [0, 0.95, 0], dist: 2.75, yaw: 0.55, pitch: 0.12 };
