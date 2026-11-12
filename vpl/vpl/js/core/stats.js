// Xử lý số liệu: thống kê mô tả, hồi quy tuyến tính, sai số, định dạng chữ số có nghĩa.

export const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

export function mean(a) {
  if (!a.length) return NaN;
  let s = 0; for (const v of a) s += v;
  return s / a.length;
}

/** Phương sai mẫu (chia n−1). */
export function variance(a) {
  const n = a.length;
  if (n < 2) return NaN;
  const m = mean(a);
  let s = 0; for (const v of a) s += (v - m) * (v - m);
  return s / (n - 1);
}
export const sd = (a) => Math.sqrt(variance(a));
/** Sai số chuẩn của giá trị trung bình. */
export const sem = (a) => sd(a) / Math.sqrt(a.length);

const T95 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228,
  2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086,
  2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042];
/** Hệ số Student t hai phía, mức tin cậy 95%, bậc tự do df. */
export function tCrit95(df) {
  if (!(df >= 1)) return NaN;
  df = Math.round(df);
  if (df <= 30) return T95[df - 1];
  if (df <= 40) return 2.021;
  if (df <= 60) return 2.000;
  if (df <= 120) return 1.980;
  return 1.960;
}

/**
 * Hồi quy tuyến tính bình phương tối thiểu y = a·x + b.
 * Trả về null nếu không đủ điểm hoặc x không đổi.
 */
export function linreg(x, y) {
  const n = x.length;
  if (n < 2 || y.length !== n) return null;
  const mx = mean(x), my = mean(y);
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  let ssr = 0;
  for (let i = 0; i < n; i++) {
    const e = y[i] - (slope * x[i] + intercept);
    ssr += e * e;
  }
  const dof = n - 2;
  const sdResid = dof > 0 ? Math.sqrt(ssr / dof) : NaN;
  const seSlope = dof > 0 ? sdResid / Math.sqrt(sxx) : NaN;
  const seIntercept = dof > 0 ? sdResid * Math.sqrt(1 / n + (mx * mx) / sxx) : NaN;
  const r = syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN;
  const r2 = syy > 0 ? Math.max(0, 1 - ssr / syy) : NaN;
  // Giao điểm với trục x (y = 0) và sai số lan truyền (có hiệp phương sai a–b)
  const xIntercept = slope !== 0 ? -intercept / slope : NaN;
  let seXIntercept = NaN;
  if (dof > 0 && slope !== 0) {
    const varA = seSlope * seSlope, varB = seIntercept * seIntercept;
    const cov = -mx * (sdResid * sdResid) / sxx;
    const v = varB / (slope * slope) + (intercept * intercept * varA) / Math.pow(slope, 4)
      - (2 * intercept * cov) / Math.pow(slope, 3);
    seXIntercept = Math.sqrt(Math.max(0, v));
  }
  return { n, slope, intercept, r, r2, seSlope, seIntercept, sdResid, xIntercept, seXIntercept, dof };
}

export const absError = (measured, ref) => Math.abs(measured - ref);
export const relError = (measured, ref) => (ref === 0 ? NaN : Math.abs(measured - ref) / Math.abs(ref));
export const pctError = (measured, ref) => relError(measured, ref) * 100;

/**
 * Độ không đảm bảo đo của một đại lượng đo lặp:
 *  u_A = s/√n (loại A, ngẫu nhiên); u_B = Δ_tb/√3 (loại B, thiết bị – phân bố đều);
 *  u_c = √(u_A² + u_B²); U = k·u_c với k = 2 (≈95%).
 */
export function uncertainty(values, instrumentBound = 0, k = 2) {
  const n = values.length;
  const m = mean(values);
  const s = n > 1 ? sd(values) : NaN;
  const uA = n > 1 ? s / Math.sqrt(n) : 0;
  const uB = instrumentBound / Math.sqrt(3);
  const uc = Math.sqrt(uA * uA + uB * uB);
  return { n, mean: m, sd: s, uA, uB, uc, U: k * uc, k, tA: n > 1 ? tCrit95(n - 1) * uA : NaN };
}

/** Làm tròn x về cùng số chữ số thập phân có nghĩa. */
export function fmtSig(x, sig = 3) {
  if (!isNum(x)) return '—';
  if (x === 0) return '0';
  const rounded = Number(x.toPrecision(sig));
  const e = Math.floor(Math.log10(Math.abs(rounded)));
  if (e < -4 || e >= 7) return rounded.toExponential(sig - 1).replace('e+', 'e');
  const dec = Math.max(0, Math.min(100, sig - 1 - e));
  return rounded.toFixed(dec);
}

export function fmtFixed(x, dec = 3) {
  return isNum(x) ? x.toFixed(Math.max(0, Math.min(100, dec))) : '—';
}

/** Viết kết quả dạng (x ± u): u làm tròn 1 chữ số có nghĩa (2 nếu chữ số đầu là 1), x làm tròn tương ứng. */
export function fmtWithUnc(x, u) {
  if (!isNum(x)) return '—';
  if (!(u > 0) || !isFinite(u)) return fmtSig(x, 4);
  const e = Math.floor(Math.log10(u));
  const lead = Math.floor(u / Math.pow(10, e) + 1e-9);
  const digits = lead === 1 ? 2 : 1;
  const places = digits - 1 - e;
  const f = Math.pow(10, places);
  const ur = Math.round(u * f) / f;
  const xr = Math.round(x * f) / f;
  const d = Math.max(0, places);
  return `${xr.toFixed(d)} ± ${ur.toFixed(d)}`;
}

function inv3(m) {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-300) return null;
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}

/**
 * Khớp parabol y = c0 + c1·(t−tm) + c2·(t−tm)² (bình phương tối thiểu, tâm hóa để ổn định số).
 * Với x(t) của chuyển động biến đổi đều: gia tốc a = 2·c2, sai số chuẩn của a = 2·se(c2).
 */
export function polyfit2(t, y) {
  const n = t.length;
  if (n < 3 || y.length !== n) return null;
  const tm = mean(t);
  let s1 = 0, s2 = 0, s3 = 0, s4 = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const u = t[i] - tm, u2 = u * u;
    s1 += u; s2 += u2; s3 += u2 * u; s4 += u2 * u2; b0 += y[i]; b1 += u * y[i]; b2 += u2 * y[i];
  }
  const inv = inv3([[n, s1, s2], [s1, s2, s3], [s2, s3, s4]]);
  if (!inv) return null;
  const c = [0, 1, 2].map((r) => inv[r][0] * b0 + inv[r][1] * b1 + inv[r][2] * b2);
  let ssr = 0;
  for (let i = 0; i < n; i++) { const u = t[i] - tm; const e = y[i] - (c[0] + c[1] * u + c[2] * u * u); ssr += e * e; }
  const dof = n - 3;
  const sdResid = dof > 0 ? Math.sqrt(ssr / dof) : NaN;
  const seC2 = dof > 0 ? sdResid * Math.sqrt(inv[2][2]) : NaN;
  return { n, tm, c0: c[0], c1: c[1], c2: c[2], a: 2 * c[2], seA: 2 * seC2, sdResid, dof };
}
