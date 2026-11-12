// Bộ máy 3D WebGL nhỏ, không phụ thuộc thư viện: ánh sáng Blinn–Phong + phản chiếu môi trường giả lập, bóng đổ phẳng (stencil),
// vật liệu kim loại/kính/phát sáng, camera quỹ đạo (chuột/cảm ứng). Đơn vị: mét.

// ───────── Toán ma trận (cột chính, như WebGL) ─────────
const M = {
  ident: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
  mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; },
  trs(p, r, s) {
    if (typeof s === 'number') s = [s, s, s];
    const [sx, sy, sz] = s, cx = Math.cos(r[0]), sxn = Math.sin(r[0]), cy = Math.cos(r[1]), syn = Math.sin(r[1]), cz = Math.cos(r[2]), szn = Math.sin(r[2]);
    // R = Rz · Ry · Rx
    const m00 = cz * cy, m01 = cz * syn * sxn - szn * cx, m02 = cz * syn * cx + szn * sxn;
    const m10 = szn * cy, m11 = szn * syn * sxn + cz * cx, m12 = szn * syn * cx - cz * sxn;
    const m20 = -syn, m21 = cy * sxn, m22 = cy * cx;
    return new Float32Array([m00 * sx, m10 * sx, m20 * sx, 0, m01 * sy, m11 * sy, m21 * sy, 0, m02 * sz, m12 * sz, m22 * sz, 0, p[0], p[1], p[2], 1]);
  },
  persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2); return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]); },
  look(e, c, up) {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2]; const zl = Math.hypot(zx, zy, zz) || 1; zx /= zl; zy /= zl; zz /= zl;
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx; const xl = Math.hypot(xx, xy, xz) || 1; xx /= xl; xy /= xl; xz /= xl;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]);
  },
  inv(m) {
    const o = new Float32Array(16), a = m;
    const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6];
    const b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!det) return null; det = 1 / det;
    o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * det; o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * det; o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * det; o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * det;
    o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * det; o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * det; o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * det; o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * det;
    o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * det; o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * det; o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * det; o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * det;
    o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * det; o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * det; o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * det; o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * det;
    return o;
  },
  /** Ma trận pháp tuyến = nghịch đảo chuyển vị của 3×3 trên-trái. */
  normal(m) {
    const a = m[0], b = m[4], c = m[8], d = m[1], e = m[5], f = m[9], g = m[2], h = m[6], i = m[10];
    const A = e * i - f * h, B = f * g - d * i, C = d * h - e * g, det = a * A + b * B + c * C || 1, k = 1 / det;
    return new Float32Array([A * k, B * k, C * k, (c * h - b * i) * k, (a * i - c * g) * k, (b * g - a * h) * k, (b * f - c * e) * k, (c * d - a * f) * k, (a * e - b * d) * k]);
  },
};
export const mat4 = M;
const lin = (c) => [Math.pow(c[0], 2.2), Math.pow(c[1], 2.2), Math.pow(c[2], 2.2)];
export const hex = (s) => { const n = parseInt(s.replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

// ───────── Hình học ─────────
/** Geom = { pos, nor, col, idx } (mảng thường; GPU được tạo khi gắn vào node). */
const mk = () => ({ pos: [], nor: [], col: [], idx: [] });
export const G = {
  box(w, h, d, color) {
    const g = mk(), x = w / 2, y = h / 2, z = d / 2;
    const faces = [[[1, 0, 0], [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]]], [[-1, 0, 0], [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]]], [[0, 1, 0], [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]]],
      [[0, -1, 0], [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]]], [[0, 0, 1], [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]]], [[0, 0, -1], [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]]]];
    for (const [n, vs] of faces) { const b = g.pos.length / 3; for (const v of vs) { g.pos.push(...v); g.nor.push(...n); g.col.push(...(color || [1, 1, 1])); } g.idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
    return g;
  },
  /** Mặt tròn xoay quanh trục y: profile = [[r, y], …] (từ dưới lên). */
  lathe(profile, seg = 40, color) {
    const g = mk(), n = profile.length;
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      for (let i = 0; i < n; i++) {
        const p0 = profile[Math.max(0, i - 1)], p1 = profile[Math.min(n - 1, i + 1)];
        let tr = p1[0] - p0[0], ty = p1[1] - p0[1]; const l = Math.hypot(tr, ty) || 1; tr /= l; ty /= l; // tiếp tuyến; pháp tuyến = (ty, −tr) hướng ra ngoài
        g.pos.push(profile[i][0] * ca, profile[i][1], profile[i][0] * sa); g.nor.push(ty * ca, -tr, ty * sa); g.col.push(...(color || [1, 1, 1]));
      }
    }
    for (let j = 0; j < seg; j++) for (let i = 0; i < n - 1; i++) { const a = j * n + i, b = (j + 1) * n + i; g.idx.push(a, a + 1, b, b, a + 1, b + 1); }
    return g;
  },
  cyl(rt, rb, h, seg = 36, color, caps = true) {
    const pr = caps ? [[0, -h / 2], [rb, -h / 2], [rb, -h / 2], [rb, h / 2], [rt, h / 2], [rt, h / 2], [0, h / 2]] : [[rb, -h / 2], [rt, h / 2]];
    if (!caps) return G.lathe(pr, seg, color);
    // dùng 3 đoạn riêng để mép sắc nét
    const g = G.lathe([[rb, -h / 2], [rt, h / 2]], seg, color), cap = (y, r, ny) => { const b = g.pos.length / 3; g.pos.push(0, y, 0); g.nor.push(0, ny, 0); g.col.push(...(color || [1, 1, 1])); for (let j = 0; j <= seg; j++) { const a = (j / seg) * Math.PI * 2; g.pos.push(r * Math.cos(a), y, r * Math.sin(a)); g.nor.push(0, ny, 0); g.col.push(...(color || [1, 1, 1])); } for (let j = 0; j < seg; j++) ny > 0 ? g.idx.push(b, b + 2 + j, b + 1 + j) : g.idx.push(b, b + 1 + j, b + 2 + j); };
    if (rt > 0) cap(h / 2, rt, 1); if (rb > 0) cap(-h / 2, rb, -1);
    return g;
  },
  sphere(r, seg = 36, color) { const prof = []; const n = Math.max(10, seg >> 1); for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI; prof.push([Math.max(1e-5, r * Math.cos(a)), r * Math.sin(a)]); } return G.lathe(prof, seg, color); },
  torus(R, r, seg = 40, sides = 14, color) {
    const g = mk();
    for (let i = 0; i <= seg; i++) { const u = (i / seg) * Math.PI * 2, cu = Math.cos(u), su = Math.sin(u); for (let j = 0; j <= sides; j++) { const v = (j / sides) * Math.PI * 2, cv = Math.cos(v), sv = Math.sin(v); g.pos.push((R + r * cv) * cu, r * sv, (R + r * cv) * su); g.nor.push(cv * cu, sv, cv * su); g.col.push(...(color || [1, 1, 1])); } }
    for (let i = 0; i < seg; i++) for (let j = 0; j < sides; j++) { const a = i * (sides + 1) + j, b = (i + 1) * (sides + 1) + j; g.idx.push(a, b, a + 1, a + 1, b, b + 1); }
    return g;
  },
  /** Ống bán kính r dọc đường cong (khung song song) – dùng cho lò xo, dây điện. */
  tube(path, r, sides = 8, color) {
    const g = mk(), n = path.length; let prev = null;
    for (let i = 0; i < n; i++) {
      const p = path[i], a = path[Math.max(0, i - 1)], b = path[Math.min(n - 1, i + 1)];
      let t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const tl = Math.hypot(...t) || 1; t = t.map((x) => x / tl);
      let nrm; if (!prev) { const up = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]; nrm = [t[1] * up[2] - t[2] * up[1], t[2] * up[0] - t[0] * up[2], t[0] * up[1] - t[1] * up[0]]; } else { const d = prev[0] * t[0] + prev[1] * t[1] + prev[2] * t[2]; nrm = [prev[0] - d * t[0], prev[1] - d * t[1], prev[2] - d * t[2]]; }
      const nl = Math.hypot(...nrm) || 1; nrm = nrm.map((x) => x / nl); prev = nrm;
      const bi = [t[1] * nrm[2] - t[2] * nrm[1], t[2] * nrm[0] - t[0] * nrm[2], t[0] * nrm[1] - t[1] * nrm[0]];
      for (let j = 0; j <= sides; j++) { const th = (j / sides) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th); const nx = nrm[0] * c + bi[0] * s, ny = nrm[1] * c + bi[1] * s, nz = nrm[2] * c + bi[2] * s; g.pos.push(p[0] + r * nx, p[1] + r * ny, p[2] + r * nz); g.nor.push(nx, ny, nz); g.col.push(...(color || [1, 1, 1])); }
    }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < sides; j++) { const a = i * (sides + 1) + j, b = (i + 1) * (sides + 1) + j; g.idx.push(a, b, a + 1, a + 1, b, b + 1); }
    return g;
  },
  /** Lò xo xoắn ốc dọc trục y từ y0 xuống y1 (y1 < y0), bán kính R, bán kính dây r. */
  helix(R, r, y0, y1, turns = 12, color) {
    const path = [], n = Math.max(24, turns * 18), lead = 0.02 * Math.sign(y0 - y1 || 1);
    for (let i = 0; i <= n; i++) { const t = i / n, a = t * turns * Math.PI * 2; path.push([R * Math.cos(a), y0 + (y1 - y0) * t, R * Math.sin(a)]); }
    const pre = [[0, y0 + lead, 0], [R, y0, 0]], post = [[R * Math.cos(turns * Math.PI * 2), y1, R * Math.sin(turns * Math.PI * 2)], [0, y1 - lead, 0]];
    return G.tube([...pre, ...path, ...post], r, 8, color);
  },
  plane(w, d, color) { const g = G.box(w, 0.0001, d, color); return g; },
  /** Gộp nhiều hình (mỗi hình có ma trận và màu đỉnh riêng) thành một lưới. parts = [[geom, {pos,rot,scl,color}]] */
  merge(parts) {
    const o = mk();
    for (const [g, t = {}] of parts) {
      const m = M.trs(t.pos || [0, 0, 0], t.rot || [0, 0, 0], typeof t.scl === 'number' ? [t.scl, t.scl, t.scl] : t.scl || [1, 1, 1]), nm = M.normal(m), base = o.pos.length / 3;
      for (let i = 0; i < g.pos.length; i += 3) {
        const x = g.pos[i], y = g.pos[i + 1], z = g.pos[i + 2], nx = g.nor[i], ny = g.nor[i + 1], nz = g.nor[i + 2];
        o.pos.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]);
        let X = nm[0] * nx + nm[3] * ny + nm[6] * nz, Y = nm[1] * nx + nm[4] * ny + nm[7] * nz, Z = nm[2] * nx + nm[5] * ny + nm[8] * nz; const l = Math.hypot(X, Y, Z) || 1; o.nor.push(X / l, Y / l, Z / l);
        if (t.color) o.col.push(...t.color); else o.col.push(g.col[i], g.col[i + 1], g.col[i + 2]);
      }
      for (const k of g.idx) o.idx.push(base + k);
    }
    return o;
  },
};

// ───────── Shader ─────────
const VS = `attribute vec3 aPos;attribute vec3 aNor;attribute vec3 aCol;uniform mat4 uM;uniform mat4 uVP;uniform mat3 uNM;uniform float uShadow;uniform mat4 uSh;
varying vec3 vW;varying vec3 vN;varying vec3 vC;
void main(){vec4 w=uM*vec4(aPos,1.0);if(uShadow>0.5){w=uSh*w;}vW=w.xyz;vN=normalize(uNM*aNor);vC=aCol;gl_Position=uVP*w;}`;
const FS = `#extension GL_OES_standard_derivatives : enable
precision highp float;varying vec3 vW;varying vec3 vN;varying vec3 vC;
uniform vec3 uCam;uniform vec3 uColor;uniform float uMetal;uniform float uShine;uniform float uEmis;uniform float uAlpha;uniform float uHi;uniform float uShadow;uniform float uFloor;uniform vec3 uBg;uniform float uFloorY;uniform vec3 uFloorCol;
vec3 env(vec3 R){float t=clamp(R.y*0.5+0.5,0.0,1.0);vec3 sky=mix(vec3(0.55,0.62,0.72),vec3(0.16,0.24,0.38),smoothstep(0.5,1.0,t));vec3 gr=vec3(0.05,0.07,0.09);vec3 e=mix(gr,sky,smoothstep(0.35,0.55,t));
 e+=vec3(1.4,1.35,1.25)*pow(max(dot(R,normalize(vec3(0.45,0.8,0.4))),0.0),30.0);e+=vec3(0.5,0.7,0.9)*pow(max(dot(R,normalize(vec3(-0.7,0.35,-0.3))),0.0),12.0);return e;}
void main(){
 float dist=length(vW-uCam);
 if(uShadow>0.5){gl_FragColor=vec4(0.0,0.0,0.0,0.34*uAlpha);return;}
 if(uFloor>0.5){
  vec2 p=vW.xz;float r=length(p);float fade=1.0-smoothstep(1.0,3.2,r);
  float g1=0.0,g2=0.0;
  #ifdef GL_OES_standard_derivatives
   vec2 f=fwidth(p*10.0);vec2 a=abs(fract(p*10.0-0.5)-0.5)/max(f,vec2(1e-4));g1=1.0-min(min(a.x,a.y),1.0);
   vec2 f2=fwidth(p*2.0);vec2 a2=abs(fract(p*2.0-0.5)-0.5)/max(f2,vec2(1e-4));g2=1.0-min(min(a2.x,a2.y),1.0);
  #else
   g1=step(0.97,max(abs(fract(p.x*10.0)),abs(fract(p.y*10.0))));
  #endif
  float rim=smoothstep(0.0,0.02,r);float l=dot(normalize(vec3(0.45,0.8,0.4)),vec3(0,1,0));
  vec3 col=uFloorCol*(0.55+0.45*l)+vec3(0.20,0.34,0.42)*(g1*0.22+g2*0.45);col+=vec3(0.05,0.08,0.10)*(1.0-smoothstep(0.0,1.6,r));
  gl_FragColor=vec4(col,fade*0.97);return;}
 vec3 N=normalize(vN);vec3 V=normalize(uCam-vW);if(dot(N,V)<0.0&&uAlpha<0.999)N=-N;
 vec3 base=pow(uColor*vC,vec3(2.2));
 vec3 L1=normalize(vec3(0.45,0.8,0.4)),L2=normalize(vec3(-0.6,0.35,-0.5)),L3=normalize(vec3(-0.2,0.2,0.9));
 float d1=max(dot(N,L1),0.0),d2=max(dot(N,L2),0.0),d3=max(dot(N,L3),0.0);
 vec3 hemi=mix(vec3(0.07,0.09,0.12),vec3(0.30,0.36,0.46),N.y*0.5+0.5);
 vec3 diff=base*(hemi+vec3(1.05,1.0,0.92)*d1+vec3(0.18,0.26,0.4)*d2+vec3(0.12,0.12,0.14)*d3);
 vec3 H=normalize(L1+V);float sp=pow(max(dot(N,H),0.0),uShine)*(0.25+0.9*uMetal);
 vec3 R=reflect(-V,N);float fr=pow(1.0-max(dot(N,V),0.0),3.0);
 vec3 e=env(R);vec3 spec=mix(vec3(1.0),base,uMetal)*sp;
 vec3 col=mix(diff,base*e*1.1,uMetal*0.85)+spec+e*(0.04+0.22*fr)*(0.4+uMetal)+base*uEmis*1.6;
 col+=vec3(0.12,0.85,0.75)*uHi*(0.22+1.1*fr);
 col=mix(col,uBg,clamp((dist-3.0)/9.0,0.0,0.6));
 float a=uAlpha;if(uAlpha<0.999)a=clamp(uAlpha+fr*0.5,0.0,0.95);
 gl_FragColor=vec4(pow(max(col,0.0),vec3(1.0/2.2)),a);}`;
const BGVS = 'attribute vec2 p;varying vec2 v;void main(){v=p*0.5+0.5;gl_Position=vec4(p,0.9999,1.0);}';
const BGFS = 'precision mediump float;varying vec2 v;uniform vec3 uTop;uniform vec3 uBot;void main(){gl_FragColor=vec4(mix(uBot,uTop,smoothstep(0.0,1.0,v.y)),1.0);}';

export class Node {
  constructor(scene, geom, o = {}) {
    this.scene = scene; this.children = []; this.parent = null; this.geom = null; this.buf = null;
    this.pos = [0, 0, 0]; this.rot = [0, 0, 0]; this.scl = [1, 1, 1];
    this.color = [0.8, 0.8, 0.8]; this.metal = 0; this.shine = 40; this.emissive = 0; this.alpha = 1; this.shadow = true; this.visible = true;
    if (geom) this.setGeom(geom);
    this.set(o);
  }
  set(o) { for (const k in o) { if (k === 'scl' && typeof o[k] === 'number') this.scl = [o[k], o[k], o[k]]; else if (k === 'color' && typeof o[k] === 'string') this.color = hex(o[k]); else this[k] = o[k]; } return this; }
  add(geom, o) { const n = new Node(this.scene, geom, o); n.parent = this; this.children.push(n); return n; }
  setGeom(g) {
    const gl = this.scene.gl; this.free(); this.geom = g;
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (let i = 0; i < g.pos.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], g.pos[i + k]); mx[k] = Math.max(mx[k], g.pos[i + k]); } this.bb = [mn, mx];
    const mkb = (t, d, T) => { const b = gl.createBuffer(); gl.bindBuffer(t, b); gl.bufferData(t, d, gl.STATIC_DRAW); return b; };
    this.buf = { pos: mkb(gl.ARRAY_BUFFER, new Float32Array(g.pos)), nor: mkb(gl.ARRAY_BUFFER, new Float32Array(g.nor)), col: mkb(gl.ARRAY_BUFFER, new Float32Array(g.col.length ? g.col : new Array(g.pos.length).fill(1))), idx: mkb(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(g.idx)), n: g.idx.length };
  }
  free() { if (!this.buf) return; const gl = this.scene.gl; for (const k of ['pos', 'nor', 'col', 'idx']) gl.deleteBuffer(this.buf[k]); this.buf = null; }
  world() { const m = M.trs(this.pos, this.rot, this.scl); return this.parent ? M.mul(this.parent.world(), m) : m; }
  remove() { this.free(); this.children.forEach((c) => c.remove()); this.children = []; const l = this.parent ? this.parent.children : this.scene.nodes; const i = l.indexOf(this); if (i >= 0) l.splice(i, 1); }
}

export class Scene3D {
  constructor(host, opts = {}) {
    this.host = host; this.nodes = []; this.labels = []; this.showLabels = false; this.onFrame = null; this.running = false; this.floorY = 0;
    this.bgTop = opts.top || [0.09, 0.15, 0.22]; this.bgBot = opts.bot || [0.04, 0.07, 0.1]; this.floorCol = opts.floorColor || [0.10, 0.17, 0.23];
    this.canvas = document.createElement('canvas'); this.canvas.className = 'gl3d-canvas'; this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block;border-radius:12px';
    this.over = document.createElement('canvas'); this.over.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;border-radius:12px';
    host.append(this.canvas, this.over);
    const gl = this.canvas.getContext('webgl', { antialias: true, stencil: true, alpha: false, preserveDrawingBuffer: true }) || this.canvas.getContext('experimental-webgl', { antialias: true, stencil: true, preserveDrawingBuffer: true });
    if (!gl) { this.ok = false; return; }
    this.ok = true; this.gl = gl; gl.getExtension('OES_standard_derivatives');
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    const prog = (v, f) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, v)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, f)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
    this.prog = prog(VS, FS); this.bgProg = prog(BGVS, BGFS);
    this.u = {}; for (const k of ['uM', 'uVP', 'uNM', 'uShadow', 'uSh', 'uCam', 'uColor', 'uMetal', 'uShine', 'uEmis', 'uAlpha', 'uHi', 'uFloor', 'uBg', 'uFloorY', 'uFloorCol']) this.u[k] = gl.getUniformLocation(this.prog, k);
    this.a = { pos: gl.getAttribLocation(this.prog, 'aPos'), nor: gl.getAttribLocation(this.prog, 'aNor'), col: gl.getAttribLocation(this.prog, 'aCol') };
    this.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.floorGeom = new Node(this, G.box(8, 0.0002, 8), { shadow: false }); this.floorGeom.parent = null; this.nodes.pop();
    // camera quỹ đạo
    this.cam = { target: opts.target || [0, 0.3, 0], dist: opts.dist || 1.6, yaw: opts.yaw ?? 0.6, pitch: opts.pitch ?? 0.38, fov: 0.75 };
    this.cam0 = JSON.parse(JSON.stringify(this.cam)); this.camV = { yaw: 0, pitch: 0 };
    this._bind();
    this._ro = new ResizeObserver(() => this.resize()); this._ro.observe(host); this.resize();
  }
  add(geom, o) { const n = new Node(this, geom, o); this.nodes.push(n); return n; }
  group(o) { return this.add(null, o); }
  label(text, p, o = {}) { this.labels.push({ text, p, ...o }); }
  resize() {
    if (!this.ok) return; const r = this.host.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; this.over.width = w; this.over.height = h; }
    this.dpr = dpr;
  }
  _bind() {
    const c = this.canvas, ptr = new Map(); let last = null, pinch = 0;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    let grab = false, start = null, moved = false;
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); last = { x: e.clientX, y: e.clientY, btn: e.button, shift: e.shiftKey }; this.camV.yaw = this.camV.pitch = 0;
      start = { x: e.clientX, y: e.clientY }; moved = false; grab = false;
      if (e.button === 0 && !e.shiftKey && ptr.size === 1 && this.interact?.down) grab = !!this.interact.down(e, this.ray(e.clientX, e.clientY));
    });
    c.addEventListener('pointermove', (e) => {
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 4) moved = true;
      if (grab) { this.interact.move?.(e, this.ray(e.clientX, e.clientY), moved); return; }
      if (!ptr.has(e.pointerId)) { this.interact?.hover?.(e, this.ray(e.clientX, e.clientY)); return; }
      this.interact?.hover?.(e, this.ray(e.clientX, e.clientY));
      const p = ptr.get(e.pointerId); const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) this.cam.dist = Math.min(6, Math.max(0.25, this.cam.dist * (pinch / d))); pinch = d; return; }
      if (last && (last.btn === 2 || last.shift)) this.pan(dx, dy); else { this.cam.yaw -= dx * 0.008; this.cam.pitch = Math.min(1.5, Math.max(-0.1, this.cam.pitch + dy * 0.006)); this.camV.yaw = -dx * 0.008; }
    });
    const up = (e) => {
      ptr.delete(e.pointerId); pinch = 0;
      if (grab) { grab = false; this.interact.up?.(e, this.ray(e.clientX, e.clientY), moved); } else if (start && !moved && e.type === 'pointerup' && e.button === 0) this.interact?.click?.(e, this.ray(e.clientX, e.clientY));
      start = null;
    };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.cam.dist = Math.min(6, Math.max(0.25, this.cam.dist * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
    c.addEventListener('dblclick', () => { Object.assign(this.cam, JSON.parse(JSON.stringify(this.cam0))); });
  }
  pan(dx, dy) { const k = this.cam.dist * 0.0012, cy = Math.cos(this.cam.yaw), sy = Math.sin(this.cam.yaw); const t = this.cam.target; t[0] -= (dx * cy) * k; t[2] += (dx * sy) * k; t[1] += dy * k; }
  eye() { const c = this.cam; return [c.target[0] + c.dist * Math.cos(c.pitch) * Math.sin(c.yaw), c.target[1] + c.dist * Math.sin(c.pitch), c.target[2] + c.dist * Math.cos(c.pitch) * Math.cos(c.yaw)]; }
  start() { if (this.running || !this.ok) return; this.running = true; this._t = 0; const loop = (t) => { if (!this.running) return; const dt = this._t ? Math.min(0.1, (t - this._t) / 1000) : 0; this._t = t; try { this.frame(dt); } catch (e) { console.error(e); this.running = false; this.error = e; this.onError?.(e); return; } this._raf = requestAnimationFrame(loop); }; this._raf = requestAnimationFrame(loop); }
  stop() { this.running = false; cancelAnimationFrame(this._raf); }
  dispose() { this.stop(); this._ro?.disconnect(); this.nodes.slice().forEach((n) => n.remove()); this.canvas.remove(); this.over.remove(); try { this.gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* bỏ qua */ } }
  frame(dt) {
    this.resize(); this.labels = []; this.onFrame?.(dt);
    if (Math.abs(this.camV.yaw) > 1e-4) { this.cam.yaw += this.camV.yaw; this.camV.yaw *= 0.92; }
    this.render();
  }
  render() {
    const gl = this.gl, cw = this.canvas.width, ch = this.canvas.height, u = this.u;
    gl.viewport(0, 0, cw, ch); gl.clearColor(this.bgBot[0], this.bgBot[1], this.bgBot[2], 1); gl.clearStencil(0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    // nền
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.useProgram(this.bgProg);
    gl.uniform3fv(gl.getUniformLocation(this.bgProg, 'uTop'), this.bgTop); gl.uniform3fv(gl.getUniformLocation(this.bgProg, 'uBot'), this.bgBot);
    const bp = gl.getAttribLocation(this.bgProg, 'p'); gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); gl.enableVertexAttribArray(bp); gl.vertexAttribPointer(bp, 2, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.disableVertexAttribArray(bp);
    // cảnh
    gl.useProgram(this.prog); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    const eye = this.eye(), view = M.look(eye, this.cam.target, [0, 1, 0]), proj = M.persp(this.cam.fov, cw / ch, 0.02, 30), vp = M.mul(proj, view);
    this.vp = vp; gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniform3fv(u.uCam, eye); gl.uniform3fv(u.uBg, lin(this.bgBot).map((x) => Math.pow(x, 1 / 2.2)));
    const ID = M.ident(); gl.uniformMatrix4fv(u.uSh, false, ID);
    // sàn
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(true);
    gl.uniform1f(u.uFloor, 1); gl.uniform1f(u.uShadow, 0); gl.uniform1f(u.uAlpha, 1); gl.uniform3fv(u.uFloorCol, lin(this.floorCol));
    const fm = M.trs([0, this.floorY, 0], [0, 0, 0], [1, 1, 1]); this._draw(this.floorGeom, fm); gl.uniform1f(u.uFloor, 0); gl.uniform1f(u.uHi, 0);
    // danh sách
    const all = []; const walk = (n, vis, hl) => { const v = vis && n.visible, h2 = hl || !!n.hl; n._hl = h2; if (v && n.buf) all.push(n); n.children.forEach((c) => walk(c, v, h2)); }; this.nodes.forEach((n) => walk(n, true, false));
    const opaque = all.filter((n) => n.alpha >= 0.999), clear = all.filter((n) => n.alpha < 0.999);
    // bóng đổ phẳng (mỗi điểm ảnh chỉ tối một lần nhờ stencil)
    const d = [-0.45, -0.8, -0.4], fy = this.floorY + 0.0006;
    const sh = new Float32Array([1, 0, 0, 0, -d[0] / d[1], 0, -d[2] / d[1], 0, 0, 0, 1, 0, (d[0] / d[1]) * fy, fy, (d[2] / d[1]) * fy, 1]);
    gl.enable(gl.STENCIL_TEST); gl.stencilFunc(gl.NOTEQUAL, 1, 0xff); gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE); gl.depthMask(false);
    gl.uniform1f(u.uShadow, 1); gl.uniform1f(u.uAlpha, 1); gl.uniformMatrix4fv(u.uSh, false, sh);
    for (const n of opaque) if (n.shadow) this._draw(n, n.world(), true);
    for (const n of clear) if (n.shadow) { gl.uniform1f(u.uAlpha, 0.35); this._draw(n, n.world(), true); }
    gl.disable(gl.STENCIL_TEST); gl.depthMask(true); gl.uniform1f(u.uShadow, 0); gl.uniformMatrix4fv(u.uSh, false, ID);
    // vật thể
    gl.disable(gl.BLEND); for (const n of opaque) this._drawNode(n);
    gl.enable(gl.BLEND); gl.depthMask(false);
    const dd = (n) => { const w = n.world(); return (w[12] - eye[0]) ** 2 + (w[13] - eye[1]) ** 2 + (w[14] - eye[2]) ** 2; };
    for (const n of clear.map((n) => [dd(n), n]).sort((a, b) => b[0] - a[0]).map((x) => x[1])) this._drawNode(n);
    gl.depthMask(true); gl.disable(gl.BLEND);
    this._labels(vp);
  }
  _drawNode(n) { const gl = this.gl, u = this.u; gl.uniform3fv(u.uColor, n.color); gl.uniform1f(u.uMetal, n.metal); gl.uniform1f(u.uShine, n.shine); gl.uniform1f(u.uEmis, n.emissive); gl.uniform1f(u.uAlpha, n.alpha); gl.uniform1f(u.uHi, n._hl ? 1 : 0); this._draw(n, n.world()); }
  _draw(n, m) {
    const gl = this.gl, u = this.u, a = this.a; gl.uniformMatrix4fv(u.uM, false, m); gl.uniformMatrix3fv(u.uNM, false, M.normal(m));
    gl.bindBuffer(gl.ARRAY_BUFFER, n.buf.pos); gl.enableVertexAttribArray(a.pos); gl.vertexAttribPointer(a.pos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, n.buf.nor); gl.enableVertexAttribArray(a.nor); gl.vertexAttribPointer(a.nor, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, n.buf.col); gl.enableVertexAttribArray(a.col); gl.vertexAttribPointer(a.col, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, n.buf.idx); gl.drawElements(gl.TRIANGLES, n.buf.n, gl.UNSIGNED_SHORT, 0);
  }
  /** Tia từ điểm chuột (toạ độ client) xuyên cảnh: { o, d } (d chưa chuẩn hoá theo độ dài, dùng tham số t). */
  ray(cx, cy) {
    const r = this.canvas.getBoundingClientRect(), nx = ((cx - r.left) / r.width) * 2 - 1, ny = 1 - ((cy - r.top) / r.height) * 2, iv = M.inv(this.vp || M.ident()); if (!iv) return null;
    const un = (z) => { const x = iv[0] * nx + iv[4] * ny + iv[8] * z + iv[12], y = iv[1] * nx + iv[5] * ny + iv[9] * z + iv[13], zz = iv[2] * nx + iv[6] * ny + iv[10] * z + iv[14], w = iv[3] * nx + iv[7] * ny + iv[11] * z + iv[15]; return [x / w, y / w, zz / w]; };
    const a = un(-1), b = un(1); return { o: a, d: [b[0] - a[0], b[1] - a[1], b[2] - a[2]] };
  }
  /** Giao tia với mặt phẳng y = h; trả về điểm [x, y, z] hoặc null. */
  rayPlane(ray, h = 0) { if (!ray || Math.abs(ray.d[1]) < 1e-9) return null; const t = (h - ray.o[1]) / ray.d[1]; return t < 0 ? null : [ray.o[0] + ray.d[0] * t, h, ray.o[2] + ray.d[2] * t]; }
  /** Mọi đối tượng bị tia chạm, gần nhất trước: { node, root, t, kind }. Node có pick:false bị bỏ qua; nút có `pick` (hoặc tổ tiên có) là đối tượng chọn được. */
  pick(ray) {
    if (!ray) return []; const out = [];
    const visit = (n, vis, rootNode) => {
      const v = vis && n.visible; if (!v) return; const own = n.pick !== undefined && n.pick !== false ? n : rootNode;
      if (n.buf && n.pick !== false && (own || n.pickTerm || n.poly)) {
        if (n.poly) { const t = this._polyHit(ray, n.poly, n.pickR || 0.006); if (t != null) out.push({ node: n, root: n, t, kind: 'wire' }); }
        else { const t = this._boxHit(ray, n); if (t != null) out.push({ node: n, root: n.pickTerm ? n : own, t, kind: n.pickTerm ? 'term' : 'obj' }); }
      }
      n.children.forEach((c) => visit(c, v, own));
    };
    this.nodes.forEach((n) => visit(n, true, null)); return out.sort((a, b) => a.t - b.t);
  }
  _boxHit(ray, n) {
    if (!n.bb) return null; const iv = M.inv(n.world()); if (!iv) return null;
    const o = [iv[0] * ray.o[0] + iv[4] * ray.o[1] + iv[8] * ray.o[2] + iv[12], iv[1] * ray.o[0] + iv[5] * ray.o[1] + iv[9] * ray.o[2] + iv[13], iv[2] * ray.o[0] + iv[6] * ray.o[1] + iv[10] * ray.o[2] + iv[14]];
    const d = [iv[0] * ray.d[0] + iv[4] * ray.d[1] + iv[8] * ray.d[2], iv[1] * ray.d[0] + iv[5] * ray.d[1] + iv[9] * ray.d[2], iv[2] * ray.d[0] + iv[6] * ray.d[1] + iv[10] * ray.d[2]];
    const pad = n.pad || 0; let t0 = 0, t1 = 1e9;
    for (let k = 0; k < 3; k++) { const lo = n.bb[0][k] - pad, hi = n.bb[1][k] + pad; if (Math.abs(d[k]) < 1e-12) { if (o[k] < lo || o[k] > hi) return null; } else { let a = (lo - o[k]) / d[k], b = (hi - o[k]) / d[k]; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return null; } }
    return t0;
  }
  /** Khoảng cách tia–đường gấp khúc; trả về t của điểm gần nhất nếu < r. */
  _polyHit(ray, pts, r) {
    const o = ray.o, d = ray.d; let best = null, bd = r; const A = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1], u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], w = [o[0] - p[0], o[1] - p[1], o[2] - p[2]];
      const B = d[0] * u[0] + d[1] * u[1] + d[2] * u[2], Cc = u[0] ** 2 + u[1] ** 2 + u[2] ** 2, D = d[0] * w[0] + d[1] * w[1] + d[2] * w[2], E = u[0] * w[0] + u[1] * w[1] + u[2] * w[2], den = A * Cc - B * B;
      let sp = den > 1e-14 ? (A * E - B * D) / den : 0; sp = Math.max(0, Math.min(1, sp)); const t = (B * sp - D) / A; if (t < 0) continue;
      const dx = o[0] + d[0] * t - (p[0] + u[0] * sp), dy = o[1] + d[1] * t - (p[1] + u[1] * sp), dz = o[2] + d[2] * t - (p[2] + u[2] * sp), dist = Math.hypot(dx, dy, dz);
      if (dist < bd) { bd = dist; best = t; }
    }
    return best;
  }
  project(p) { const v = this.vp; if (!v) return null; const x = v[0] * p[0] + v[4] * p[1] + v[8] * p[2] + v[12], y = v[1] * p[0] + v[5] * p[1] + v[9] * p[2] + v[13], w = v[3] * p[0] + v[7] * p[1] + v[11] * p[2] + v[15]; if (w <= 0) return null; return [(x / w * 0.5 + 0.5) * this.over.width, (1 - (y / w * 0.5 + 0.5)) * this.over.height]; }
  _labels(vp) {
    const c = this.over.getContext('2d'), dpr = this.dpr; c.clearRect(0, 0, this.over.width, this.over.height); c.textBaseline = 'middle';
    for (const l of this.labels) {
      if (!this.showLabels && !l.keep) continue;
      const s = this.project(l.p); if (!s) continue; const fs = (l.size || 12) * dpr; c.font = `${l.bold ? '700 ' : ''}${fs}px ui-monospace,Menlo,Consolas,monospace`; const w = c.measureText(l.text).width;
      const x = s[0] + (l.dx || 0) * dpr, y = s[1] + (l.dy || 0) * dpr; c.textAlign = l.align || 'left';
      if (l.bg) { c.fillStyle = l.bg; const px = 6 * dpr, bx = l.align === 'center' ? x - w / 2 - px : l.align === 'right' ? x - w - px : x - px; c.beginPath(); c.roundRect ? c.roundRect(bx, y - fs * 0.85, w + px * 2, fs * 1.7, 5 * dpr) : c.rect(bx, y - fs * 0.85, w + px * 2, fs * 1.7); c.fill(); }
      c.fillStyle = l.color || '#d6e6ef'; c.fillText(l.text, x, y);
    }
  }
}
