// Bộ sinh số giả ngẫu nhiên có seed (tái lập được) – dùng cho nhiễu đo và sai số hệ thống của thiết bị.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class Rng {
  constructor(seed = 1) {
    this.seed = seed >>> 0;
    this._u = mulberry32(this.seed);
    this._spare = null;
  }
  uniform() { return this._u(); }
  range(a, b) { return a + (b - a) * this._u(); }
  /** Phân bố chuẩn N(mu, sigma²) – Box–Muller. */
  gauss(mu = 0, sigma = 1) {
    if (this._spare !== null) {
      const s = this._spare; this._spare = null;
      return mu + sigma * s;
    }
    let u = 0;
    while (u === 0) u = this._u();
    const v = this._u();
    const m = Math.sqrt(-2 * Math.log(u));
    this._spare = m * Math.sin(2 * Math.PI * v);
    return mu + sigma * m * Math.cos(2 * Math.PI * v);
  }
  /** Rng con, xác định theo (seed, khóa) – dùng để mỗi thiết bị có sai số hệ thống riêng, cố định theo phiên. */
  child(key) { return new Rng(hashSeed(this.seed + ':' + key)); }
}
