// Mô hình chất khí: khí lý tưởng PV = nRT, cân bằng nhiệt có trễ, nén đoạn nhiệt tức thời, thể tích chết.
import { R_GAS, P_ATM, T_ZERO_C } from './physics.js';

export const GAMMA_AIR = 1.4;
export const mL = 1e-6; // m³

export const gasPressure = (n, T, V) => (n * R_GAS * T) / V;
export const moleAmount = (P, V, T) => (P * V) / (R_GAS * T);
/** T' = T·(V/V')^(γ−1) – nén/giãn nhanh không kịp trao đổi nhiệt. */
export const adiabaticT = (T, Vold, Vnew, gamma = GAMMA_AIR) => T * Math.pow(Vold / Vnew, gamma - 1);
/** Hàm mũ trễ nhiệt bậc 1: nghiệm chính xác của dT/dt = (T∞ − T)/τ. */
export const relax = (T, Tinf, dt, tau) => (tau > 0 ? Tinf + (T - Tinf) * Math.exp(-dt / tau) : Tinf);

/**
 * Cấu hình bình khí.
 *  mode: 'isothermal' (thay V, giữ nhiệt độ bể) | 'isochoric' (V cố định, đổi T) | 'isobaric' (áp suất ngoài cố định, pit-tông tự do)
 */
export function makeGasConfig({ mode, ideal = false, V0 = 60 * mL, T0 = 22 + T_ZERO_C, P0 = P_ATM, Pext = P_ATM } = {}) {
  const Vdead = ideal ? 0 : 2 * mL;
  const n = moleAmount(P0, V0 + Vdead, T0);
  return {
    mode, ideal, n, Vdead, Pext,
    tauGas: ideal ? 0 : 6, tauBath: ideal ? 0 : 25, tauSensor: ideal ? 0 : 3,
    gamma: GAMMA_AIR,
  };
}

export function initGasState(cfg, { V = 60 * mL, Tset = 22 + T_ZERO_C } = {}) {
  let Vread = V;
  if (cfg.mode === 'isobaric') Vread = (cfg.n * R_GAS * Tset) / cfg.Pext - cfg.Vdead;
  return { Vread, Tg: Tset, Tb: Tset, Ts: Tset, Tset };
}

/** Thay đổi thể tích đọc trên xi lanh (người dùng kéo pit-tông). Áp dụng nén đoạn nhiệt nếu mô hình thực. */
export function setVolume(cfg, s, Vnew) {
  if (cfg.mode === 'isobaric') return s; // pit-tông tự do, không điều khiển bằng tay
  const Vo = s.Vread + cfg.Vdead, Vn = Vnew + cfg.Vdead;
  const Tg = cfg.ideal ? s.Tb : adiabaticT(s.Tg, Vo, Vn, cfg.gamma);
  return { ...s, Vread: Vnew, Tg };
}

/** Tiến mô phỏng thêm dt giây (giây mô phỏng). */
export function stepGas(cfg, s, dt) {
  const Tb = relax(s.Tb, s.Tset, dt, cfg.tauBath);
  const Tg = relax(s.Tg, Tb, dt, cfg.tauGas);
  const Ts = relax(s.Ts, Tg, dt, cfg.tauSensor);
  let Vread = s.Vread;
  if (cfg.mode === 'isobaric') Vread = (cfg.n * R_GAS * Tg) / cfg.Pext - cfg.Vdead;
  return { ...s, Tb, Tg, Ts, Vread };
}

export const gasStatePressure = (cfg, s) => gasPressure(cfg.n, s.Tg, s.Vread + cfg.Vdead);

/** Đã cân bằng nhiệt chưa (dùng để tạm dừng vòng lặp mô phỏng). */
export const isSettled = (s, tol = 1e-3) => Math.abs(s.Tb - s.Tset) < tol && Math.abs(s.Tg - s.Tb) < tol && Math.abs(s.Ts - s.Tg) < tol;
