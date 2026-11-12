// Bộ giải mạch điện một chiều bằng phương pháp phân tích nút cải tiến (MNA) + Newton–Raphson cho linh kiện phi tuyến.
// Các nút là các lớp tương đương của cực linh kiện được nối bằng dây dẫn (union–find).

export const TERMINALS = {
  source: ['p', 'n'], battery: ['p', 'n'], resistor: ['a', 'b'], rheostat: ['a', 'b'], bulb: ['a', 'b'],
  diode: ['a', 'k'], switch: ['a', 'b'], ammeter: ['p', 'n'], voltmeter: ['p', 'n'],
};

TERMINALS.dcSource = TERMINALS.source;
const T0 = 293.15;
const VT = 0.025852; // kT/q ở 300 K

// ───── Bóng đèn sợi tungsten: R = R0·(T/T0)^1,2 ; công suất tỏa ra P = V²/R = κ(T⁴ − T0⁴) ─────
export function bulbModel({ ratedV = 6, ratedP = 3, Tr = 2800 } = {}) {
  const Rr = (ratedV * ratedV) / ratedP;
  const R0 = Rr * Math.pow(T0 / Tr, 1.2);
  const kappa = ratedP / (Math.pow(Tr, 4) - Math.pow(T0, 4));
  const R = (T) => R0 * Math.pow(T / T0, 1.2);
  function temperature(V) {
    V = Math.abs(V);
    if (V === 0) return T0;
    let lo = T0, hi = 8000;
    const f = (T) => (V * V) / R(T) - kappa * (Math.pow(T, 4) - Math.pow(T0, 4));
    for (let i = 0; i < 80; i++) {
      const mid = 0.5 * (lo + hi);
      if (f(mid) > 0) lo = mid; else hi = mid;
    }
    return 0.5 * (lo + hi);
  }
  function current(V) {
    const T = temperature(V);
    return V / R(T);
  }
  return { R0, Rr, kappa, R, temperature, current: (V) => (V >= 0 ? current(V) : -current(-V)) };
}

export function diodeModel({ Is = 2.5e-9, n = 1.8 } = {}) {
  const nVt = n * VT;
  const vcrit = nVt * Math.log(nVt / (Math.SQRT2 * Is));
  const ev = (v) => {
    const e = Math.exp(Math.min(v / nVt, 80));
    return { i: Is * (e - 1) + 1e-12 * v, g: (Is / nVt) * e + 1e-12 };
  };
  // Giới hạn bước Newton (giống pnjlim của SPICE) để hội tụ ổn định
  const limit = (vnew, vold) => {
    if (vnew > vcrit && Math.abs(vnew - vold) > 2 * nVt) {
      if (vold > 0) {
        const arg = 1 + (vnew - vold) / nVt;
        return arg > 0 ? vold + nVt * Math.log(arg) : vcrit;
      }
      return nVt * Math.log(vnew / nVt);
    }
    return vnew;
  };
  return { Is, n, nVt, ev, limit };
}

class UF {
  constructor() { this.p = new Map(); }
  find(x) {
    if (!this.p.has(x)) this.p.set(x, x);
    let r = x;
    while (this.p.get(r) !== r) r = this.p.get(r);
    while (this.p.get(x) !== r) { const nx = this.p.get(x); this.p.set(x, r); x = nx; }
    return r;
  }
  union(a, b) { const ra = this.find(a), rb = this.find(b); if (ra !== rb) this.p.set(ra, rb); }
}

function gaussSolve(A, b) {
  const n = b.length;
  for (let c = 0; c < n; c++) {
    let piv = c, mx = Math.abs(A[c][c]);
    for (let r = c + 1; r < n; r++) { const v = Math.abs(A[r][c]); if (v > mx) { mx = v; piv = r; } }
    if (mx < 1e-18) return null;
    if (piv !== c) { [A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]]; }
    const d = A[c][c];
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / d;
      if (f === 0) continue;
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const x = new Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k];
    x[r] = s / A[r][r];
  }
  return x;
}

/**
 * circuit = { components: [{id, type, p}], wires: [[termA, termB], ...] } với termId = `${id}:${cực}`.
 * Tham số p theo loại:
 *   source/battery: E, r (r=0 → nguồn lý tưởng)   resistor: R   rheostat: R   switch: closed, rClosed (0 → lý tưởng)
 *   ammeter: Ra (0 → lý tưởng)   voltmeter: Rv (Infinity → lý tưởng)   bulb: {ratedV, ratedP}   diode: {}
 * Trả về { ok, error?, V: {termId: điện thế}, comp: {id: {v, i, ...}}, iterations }
 *   v = V(cực đầu) − V(cực sau);  i = dòng đi vào cực đầu và ra cực sau;
 *   với nguồn: v = hiệu điện thế hai cực, i = dòng nguồn cấp ra mạch ngoài.
 */
export function solveDC(circuit, opts = {}) {
  if (!circuit.components.length) return { ok: true, V: {}, comp: {}, iterations: 0, x: [] };
  const uf = new UF();
  const comps = circuit.components;
  for (const c of comps) for (const t of TERMINALS[c.type]) uf.find(`${c.id}:${t}`);
  for (const [a, b] of circuit.wires) { uf.find(a); uf.find(b); uf.union(a, b); }

  const nodeIdx = new Map();
  let nNodes = 0;
  const node = (t) => { const r = uf.find(t); if (!nodeIdx.has(r)) nodeIdx.set(r, nNodes++); return nodeIdx.get(r); };
  const firstSrc = comps.find((c) => c.type === 'source' || c.type === 'battery');
  if (firstSrc) node(`${firstSrc.id}:n`); // nút đất = cực âm của nguồn đầu tiên
  for (const c of comps) for (const t of TERMINALS[c.type]) node(`${c.id}:${t}`);
  const GND = 0;
  const extra = () => nNodes++;

  const elems = []; // {kind:'R'|'V'|'NL', a, b, g|v|ev, comp, role}
  const info = {};
  for (const c of comps) {
    const T = TERMINALS[c.type].map((t) => node(`${c.id}:${t}`));
    const p = c.p || {};
    info[c.id] = { c, T };
    switch (c.type) {
      case 'source': case 'battery': {
        if (p.r > 0) {
          const mid = extra();
          elems.push({ kind: 'V', a: mid, b: T[1], v: p.E, comp: c.id, role: 'emf' });
          elems.push({ kind: 'R', a: T[0], b: mid, g: 1 / p.r, comp: c.id, role: 'rint' });
          info[c.id].mid = mid;
        } else elems.push({ kind: 'V', a: T[0], b: T[1], v: p.E, comp: c.id, role: 'emf' });
        break;
      }
      case 'resistor': elems.push({ kind: 'R', a: T[0], b: T[1], g: 1 / Math.max(p.R, 1e-6), comp: c.id }); break;
      case 'rheostat': elems.push({ kind: 'R', a: T[0], b: T[1], g: 1 / Math.max(p.R, 1e-3), comp: c.id }); break;
      case 'switch':
        if (p.closed) {
          if (p.rClosed > 0) elems.push({ kind: 'R', a: T[0], b: T[1], g: 1 / p.rClosed, comp: c.id });
          else elems.push({ kind: 'V', a: T[0], b: T[1], v: 0, comp: c.id });
        }
        break;
      case 'ammeter':
        if (p.Ra > 0) elems.push({ kind: 'R', a: T[0], b: T[1], g: 1 / p.Ra, comp: c.id });
        else elems.push({ kind: 'V', a: T[0], b: T[1], v: 0, comp: c.id });
        break;
      case 'voltmeter': elems.push({ kind: 'R', a: T[0], b: T[1], g: 1 / (Number.isFinite(p.Rv) ? p.Rv : 1e12), comp: c.id }); break;
      case 'bulb': {
        const m = bulbModel(p);
        info[c.id].model = m;
        elems.push({ kind: 'NL', a: T[0], b: T[1], comp: c.id, ev: (v) => {
          const h = 1e-4;
          const i = m.current(v);
          const g = Math.max((m.current(v + h) - m.current(v - h)) / (2 * h), 1e-6);
          return { i, g };
        }, limit: (vn, vo) => vo + Math.max(-2, Math.min(2, vn - vo)) });
        break;
      }
      case 'diode': {
        const m = diodeModel(p);
        elems.push({ kind: 'NL', a: T[0], b: T[1], comp: c.id, ev: m.ev, limit: m.limit });
        break;
      }
      default: return { ok: false, error: `Loại linh kiện không hỗ trợ: ${c.type}` };
    }
  }

  const vBranch = elems.filter((e) => e.kind === 'V');
  vBranch.forEach((e, k) => { e.k = k; });
  const N = nNodes - 1; // không tính nút đất
  const size = N + vBranch.length;
  const idx = (n) => (n === GND ? -1 : n - 1);
  const GMIN = 1e-12;

  const solveOnce = (xPrev, scale) => {
    const A = Array.from({ length: size }, () => new Array(size).fill(0));
    const z = new Array(size).fill(0);
    for (let i = 0; i < N; i++) A[i][i] += GMIN;
    for (const e of elems) {
      const ia = idx(e.a), ib = idx(e.b);
      if (e.kind === 'R' || e.kind === 'NL') {
        let g, ieq = 0;
        if (e.kind === 'R') g = e.g;
        else {
          const va = ia >= 0 ? xPrev[ia] : 0, vb = ib >= 0 ? xPrev[ib] : 0;
          const ev = e.ev(va - vb);
          g = ev.g; ieq = ev.i - ev.g * (va - vb);
        }
        if (ia >= 0) { A[ia][ia] += g; z[ia] -= ieq; }
        if (ib >= 0) { A[ib][ib] += g; z[ib] += ieq; }
        if (ia >= 0 && ib >= 0) { A[ia][ib] -= g; A[ib][ia] -= g; }
      } else {
        const r = N + e.k;
        if (ia >= 0) { A[ia][r] += 1; A[r][ia] += 1; }
        if (ib >= 0) { A[ib][r] -= 1; A[r][ib] -= 1; }
        z[r] = e.v * scale;
      }
    }
    return gaussSolve(A, z);
  };

  const newton = (x0, scale) => {
    let x = x0.slice();
    const hasNL = elems.some((e) => e.kind === 'NL');
    for (let it = 1; it <= (hasNL ? 300 : 1); it++) {
      const xn = solveOnce(x, scale);
      if (!xn) return { fail: 'singular' };
      if (!hasNL) return { x: xn, it };
      // giới hạn điện áp trên linh kiện phi tuyến
      for (const e of elems) {
        if (e.kind !== 'NL' || !e.limit) continue;
        const ia = idx(e.a), ib = idx(e.b);
        const vo = (ia >= 0 ? x[ia] : 0) - (ib >= 0 ? x[ib] : 0);
        const vn = (ia >= 0 ? xn[ia] : 0) - (ib >= 0 ? xn[ib] : 0);
        const vl = e.limit(vn, vo);
        if (vl !== vn) {
          const d = vl - vn;
          if (ia >= 0 && ib < 0) xn[ia] += d;
          else if (ib >= 0 && ia < 0) xn[ib] -= d;
          else if (ia >= 0 && ib >= 0) xn[ia] += d;
        }
      }
      let maxd = 0;
      for (let i = 0; i < N; i++) maxd = Math.max(maxd, Math.abs(xn[i] - x[i]) / (1e-6 * Math.abs(xn[i]) + 1e-9));
      x = xn;
      if (maxd < 1) {
        const xf = solveOnce(x, scale);
        return { x: xf || x, it };
      }
    }
    return { fail: 'noconv' };
  };

  let x0 = opts.prev && opts.prev.length === size ? opts.prev : new Array(size).fill(0);
  let res = newton(x0, 1);
  if (res.fail === 'noconv') {
    // thử tăng dần nguồn (source stepping)
    x0 = new Array(size).fill(0);
    for (let s = 1; s <= 25 && !res.x; s++) {
      res = newton(x0, s / 25);
      if (res.x) x0 = res.x; else if (res.fail === 'singular') break;
    }
    if (res.x) res = newton(res.x, 1);
  }
  if (!res.x) {
    return { ok: false, error: res.fail === 'singular' ? 'Mạch bị đoản mạch hoặc nối sai (ma trận suy biến).' : 'Mạch không hội tụ.' };
  }

  const x = res.x;
  const volt = (n) => (n === GND ? 0 : x[n - 1]);
  const V = {};
  for (const [t] of uf.p) V[t] = volt(nodeIdx.get(uf.find(t)));
  const comp = {};
  for (const c of comps) {
    const { T } = info[c.id];
    const p = c.p || {};
    const v = volt(T[0]) - volt(T[1]);
    let i = 0;
    const own = elems.filter((e) => e.comp === c.id);
    if (c.type === 'source' || c.type === 'battery') {
      if (p.r > 0) i = (volt(info[c.id].mid) - volt(T[0])) / p.r;
      else i = -x[N + own[0].k];
      comp[c.id] = { v, i, emf: p.E, power: v * i };
      continue;
    }
    if (own.length === 0) i = 0;
    else if (own[0].kind === 'R') i = v * own[0].g;
    else if (own[0].kind === 'V') i = x[N + own[0].k];
    else i = own[0].ev(v).i;
    const out = { v, i, power: v * i };
    if (c.type === 'bulb') out.temperature = info[c.id].model.temperature(v);
    comp[c.id] = out;
  }
  return { ok: true, V, comp, iterations: res.it, x };
}
