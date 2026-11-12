// Mô hình vật lý thuần túy (không phụ thuộc giao diện) – có thể kiểm thử độc lập.

export const G_STD = 9.80665;
export const R_GAS = 8.314462618;
export const P_ATM = 101325;
export const T_ZERO_C = 273.15;

export const PLANETS = [
  { v: 9.81, label: 'Trái Đất (9,81 m/s²)' },
  { v: 1.62, label: 'Mặt Trăng (1,62 m/s²)' },
  { v: 3.71, label: 'Sao Hỏa (3,71 m/s²)' },
  { v: 24.79, label: 'Sao Mộc (24,79 m/s²)' },
];

/** Tích phân Runge–Kutta bậc 4 cho hệ y' = f(t, y). */
export function rk4(f, y, t, dt) {
  const add = (a, b, s) => a.map((v, i) => v + s * b[i]);
  const k1 = f(t, y);
  const k2 = f(t + dt / 2, add(y, k1, dt / 2));
  const k3 = f(t + dt / 2, add(y, k2, dt / 2));
  const k4 = f(t + dt, add(y, k3, dt));
  return y.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

// ───────────── Động lực học: xe + ròng rọc + vật treo ─────────────
/**
 * Xe khối lượng M trên mặt ngang (hệ số ma sát trượt μ), nối qua ròng rọc (mômen quán tính I, bán kính r)
 * với vật treo khối lượng m.
 *  Mô hình lý tưởng: a = m·g/(M+m).
 *  Mô hình thực   : a = (m·g − μ·M·g)/(M + m + I/r²), chỉ chuyển động nếu m·g > μ_s·M·g (μ_s = 1,2·μ).
 *  Lực căng: phía xe  T_x = M·a + μ·M·g ; phía vật treo  T_v = m·(g − a).
 */
export function cartPulley({ M, m, g, mu = 0, pulleyI = 0, pulleyR = 1, ideal = false, staticRatio = 1.2 }) {
  if (!(M > 0) || !(m >= 0) || !(g > 0)) throw new RangeError('cartPulley: M>0, m>=0, g>0');
  const muk = ideal ? 0 : mu;
  const Ieff = ideal ? 0 : pulleyI / (pulleyR * pulleyR);
  if (!ideal && mu > 0 && m * g <= staticRatio * muk * M * g) {
    return { a: 0, Tcart: m * g, Thanger: m * g, moving: false, Ieff };
  }
  const a = (m * g - muk * M * g) / (M + m + Ieff);
  return { a, Tcart: M * a + muk * M * g, Thanger: m * (g - a), moving: a > 0, Ieff };
}

export const uniformAccel = (x0, v0, a, t) => ({ x: x0 + v0 * t + 0.5 * a * t * t, v: v0 + a * t });

// ───────────── Rơi tự do (có/không có lực cản không khí tỉ lệ v²) ─────────────
export const fallTimeIdeal = (h, g) => Math.sqrt((2 * h) / g);

/** k = ρ·C_d·A/(2m) trong phương trình v' = g − k·v². */
export function dragK({ rho = 1.2, cd = 0.47, radius, mass }) {
  return (0.5 * rho * cd * Math.PI * radius * radius) / mass;
}

const logcosh = (x) => { const a = Math.abs(x); return a + Math.log1p(Math.exp(-2 * a)) - Math.LN2; };

/** y(t) = ln cosh(√(gk)·t)/k ; v(t) = √(g/k)·tanh(√(gk)·t). */
export function fallStateDrag(t, g, k) {
  if (!(k > 0)) return { y: 0.5 * g * t * t, v: g * t };
  const w = Math.sqrt(g * k);
  return { y: logcosh(w * t) / k, v: Math.sqrt(g / k) * Math.tanh(w * t) };
}

/** Thời gian rơi quãng đường h: cosh(√(gk)·t) = exp(k·h). */
export function fallTimeDrag(h, g, k) {
  if (!(k > 0)) return fallTimeIdeal(h, g);
  const w = Math.sqrt(g * k);
  // acosh(eˣ) = ln(eˣ + √(e²ˣ − 1)) viết bằng expm1/log1p để không mất chính xác khi x = k·h rất nhỏ
  const x = k * h;
  return Math.log1p(Math.expm1(x) + Math.sqrt(Math.expm1(2 * x))) / w;
}

export const BALLS = {
  steel: { mass: 0.0655, radius: 0.0125, label: 'Bi thép' },
  wood: { mass: 0.014, radius: 0.015, label: 'Bi gỗ' },
  pingpong: { mass: 0.0027, radius: 0.02, label: 'Bóng bàn' },
};

// ───────────── Đạo hàm số từ dữ liệu lấy mẫu (cảm biến chuyển động) ─────────────
/** Đạo hàm bằng sai phân trung tâm (sai phân tiến/lùi ở hai đầu). */
export function derivative(t, y) {
  const n = t.length;
  const d = new Array(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
    if (i1 === i0) continue;
    const a = y[i0], b = y[i1];
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    d[i] = (b - a) / (t[i1] - t[i0]);
  }
  return d;
}
