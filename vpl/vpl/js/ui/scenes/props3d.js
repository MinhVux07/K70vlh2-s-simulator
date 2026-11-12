// Các chi tiết 3D dùng chung cho nhiều thí nghiệm.
import { G, hex } from '../gl3d.js';

export const C = { steel: '#c9d3da', dark: '#1d2832', brass: '#d9a441', wood: '#e6c474', teal: '#35d0ba', amber: '#ffb454', red: '#ff6b6b', blue: '#7aa7ff', panel: '#2b4256', black: '#10161b', glass: '#9fd8ee' };

/** Thước chia vạch dọc theo trục +x, dài len (m); vạch mỗi 1 cm, vạch dài mỗi 5 cm, mặt có vạch hướng +z. */
export function rulerGeom(len, { width = 0.03, body = C.wood, ink = '#3a2a10' } = {}) {
  const parts = [[G.box(len, width, 0.003, hex(body)), { pos: [len / 2, 0, 0] }]];
  const n = Math.round(len * 100);
  for (let i = 0; i <= n; i++) { const long = i % 10 === 0, mid = i % 5 === 0, h = long ? width * 0.62 : mid ? width * 0.44 : width * 0.28; parts.push([G.box(0.0007, h, 0.0006, hex(ink)), { pos: [i / 100, width / 2 - h / 2, 0.0017] }]); }
  return G.merge(parts);
}
/** Giá đỡ: đế + thanh đứng + tay ngang tới x = 0. Trả về nodes. */
export function stand(S, { x = 0.3, h = 1.2, arm = 0.3, z = 0 }) {
  const m = { color: C.steel, metal: 0.9, shine: 90 };
  S.add(G.box(0.3, 0.03, 0.22), { ...m, pos: [x, 0.015, z], color: C.dark, metal: 0.6 });
  S.add(G.cyl(0.011, 0.011, h + 0.06, 24), { ...m, pos: [x, (h + 0.06) / 2, z] });
  S.add(G.box(0.04, 0.035, 0.035), { ...m, color: C.dark, pos: [x, h, z] });
  S.add(G.cyl(0.0075, 0.0075, arm, 20), { ...m, pos: [x - arm / 2, h, z], rot: [0, 0, Math.PI / 2] });
}
/** Hộp hiển thị số (nhãn nổi). */
export function lcd(S, pos, w = 0.16, h = 0.08, d = 0.1, color = C.panel) {
  S.add(G.box(w, h, d), { pos, color, metal: 0.5, shine: 60 });
  S.add(G.box(w * 0.78, 0.004, d * 0.4), { pos: [pos[0], pos[1] + h / 2 + 0.002, pos[2] + d * 0.12], color: '#0b1418', shadow: false });
}
export const fmt = (x, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : '—');
/** Màu theo nhiệt độ °C: xanh lạnh → vàng → đỏ. */
export function tempColor(T, lo = 10, hi = 100) {
  const f = Math.min(1, Math.max(0, (T - lo) / (hi - lo))), stops = [[0.2, 0.55, 1], [0.2, 0.85, 0.8], [1, 0.8, 0.25], [1, 0.3, 0.2]], x = f * 3, i = Math.min(2, Math.floor(x)), k = x - i;
  return stops[i].map((v, j) => v + (stops[i + 1][j] - v) * k);
}
export const tag = (S, text, p, o = {}) => S.label(text, p, { size: 12, bg: 'rgba(8,16,22,.72)', color: '#d6e6ef', align: 'center', ...o });
