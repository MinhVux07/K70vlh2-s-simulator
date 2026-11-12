// Hình vẽ dụng cụ (SVG). Biểu tượng thư viện (100×60) và các linh kiện mạch điện có cực kết nối.
import { INSTRUMENTS } from '../core/instruments.js';

export const COL = { ink: '#d6e6ef', mute: '#7e97a8', acc: '#35d0ba', warm: '#ffb454', bad: '#ff6b6b', metal: '#a9bcc8', dark: '#162430', panel: '#22384a' };
const st = (stroke = COL.ink, fill = 'none', w = 1.6) => `stroke="${stroke}" fill="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

const ICONS = {
  ruler: `<rect x="6" y="22" width="88" height="16" rx="2" ${st(COL.warm, '#3a3020')}/>${Array.from({ length: 23 }, (_, i) => `<path d="M${10 + i * 3.6} 22v${i % 5 === 0 ? 8 : 4}" ${st(COL.warm, 'none', 1)}/>`).join('')}`,
  photogateTimer: `<path d="M22 12v32a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V12M62 12v32a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V12" ${st(COL.metal, COL.panel)}/><path d="M38 28h24" ${st(COL.bad, 'none', 1.4)} stroke-dasharray="3 2"/><rect x="42" y="4" width="30" height="10" rx="2" ${st(COL.acc, COL.dark)}/><text x="57" y="12" font-size="7" fill="${COL.acc}" text-anchor="middle" font-family="monospace">0.4512</text>`,
  stopwatch: `<circle cx="50" cy="34" r="19" ${st(COL.metal, COL.panel)}/><circle cx="50" cy="34" r="14" ${st(COL.mute, COL.dark, 1)}/><path d="M50 34V24M46 11h8M50 11v4M70 18l4-4" ${st(COL.ink)}/>`,
  balance: `<rect x="14" y="40" width="72" height="12" rx="3" ${st(COL.metal, COL.panel)}/><rect x="22" y="32" width="56" height="5" rx="2" ${st(COL.ink, COL.mute)}/><rect x="60" y="43" width="20" height="6" rx="1" ${st(COL.acc, COL.dark, 1)}/><text x="70" y="48.5" font-size="5" fill="${COL.acc}" text-anchor="middle" font-family="monospace">0.0000</text>`,
  cart: `<rect x="14" y="20" width="72" height="20" rx="3" ${st(COL.acc, '#17463f')}/><circle cx="28" cy="46" r="6" ${st(COL.ink, COL.dark)}/><circle cx="72" cy="46" r="6" ${st(COL.ink, COL.dark)}/><rect x="36" y="10" width="28" height="10" rx="1.5" ${st(COL.metal, COL.panel)}/>`,
  hanger: `<path d="M50 4v12" ${st(COL.metal)}/><path d="M42 16h16l-3 6H45z" ${st(COL.metal, COL.panel)}/>${[0, 1, 2].map((i) => `<rect x="36" y="${26 + i * 9}" width="28" height="7" rx="2" ${st(COL.warm, '#3d3321', 1.2)}/>`).join('')}`,
  pulley: `<circle cx="50" cy="26" r="17" ${st(COL.metal, COL.panel)}/><circle cx="50" cy="26" r="4" ${st(COL.ink, COL.dark)}/><path d="M50 9v34M33 26h34M38 14l24 24M62 14L38 38" ${st(COL.mute, 'none', 1)}/><path d="M50 43v14" ${st(COL.metal)}/>`,
  motionSensor: `<rect x="14" y="16" width="36" height="28" rx="4" ${st(COL.metal, COL.panel)}/><circle cx="32" cy="30" r="8" ${st(COL.acc, COL.dark)}/>${[0, 1, 2].map((i) => `<path d="M${58 + i * 9} ${22 - i * 2}q5 8 0 16" ${st(COL.acc, 'none', 1.3)}/>`).join('')}`,
  forceSensor: `<rect x="26" y="18" width="48" height="22" rx="3" ${st(COL.metal, COL.panel)}/><path d="M50 40v8a4 4 0 1 1-4 4M26 28H12M74 28h14" ${st(COL.ink)}/><rect x="38" y="23" width="24" height="9" rx="1.5" ${st(COL.acc, COL.dark, 1)}/>`,
  electromagnet: `<rect x="30" y="6" width="40" height="10" rx="2" ${st(COL.metal, COL.panel)}/>${Array.from({ length: 5 }, (_, i) => `<path d="M${34 + i * 8} 16v8" ${st(COL.warm, 'none', 2.4)}/>`).join('')}<circle cx="50" cy="40" r="9" ${st(COL.ink, COL.mute)}/>`,
  ball: `<circle cx="50" cy="30" r="17" ${st(COL.metal, '#41576a')}/><path d="M40 22a14 14 0 0 1 10-6" ${st('#fff', 'none', 2)} opacity=".6"/>`,
  spring: `<path d="M50 3v9M50 12l-14 5 28 6-28 6 28 6-28 6 14 5v6" ${st(COL.metal, 'none', 2.2)}/>`,
  pendulum: `<path d="M30 6h40" ${st(COL.metal, 'none', 3)}/><path d="M50 6L66 40" ${st(COL.ink, 'none', 1.2)}/><circle cx="68" cy="44" r="9" ${st(COL.metal, '#41576a')}/><path d="M50 6V50" ${st(COL.mute, 'none', 1)} stroke-dasharray="3 3"/>`,
  calorimeter: `<path d="M22 22v40a4 4 0 0 0 4 4h48a4 4 0 0 0 4-4V22" ${st(COL.metal, 'none', 2)}/><path d="M24 36h52v26a2 2 0 0 1-2 2H26a2 2 0 0 1-2-2z" fill="#1d5e7a" stroke="none" opacity=".8"/><path d="M50 10v36" ${st(COL.metal, 'none', 2.4)}/><circle cx="50" cy="10" r="3" ${st(COL.metal, COL.panel)}/>`,
  metalSample: `<path d="M50 6v14" ${st(COL.metal, 'none', 1.6)}/><rect x="32" y="20" width="36" height="34" rx="4" ${st('#b5bcc2', '#8a949b')}/><path d="M36 26h14" ${st('#e8eef2', 'none', 2)}/>`,
  syringe: `<rect x="18" y="20" width="52" height="20" rx="2" ${st(COL.ink, '#1d3a4a')}/>${Array.from({ length: 9 }, (_, i) => `<path d="M${24 + i * 5} 20v${i % 2 ? 3 : 5}" ${st(COL.ink, 'none', 1)}/>`).join('')}<rect x="52" y="22" width="4" height="16" ${st(COL.acc, COL.acc, 1)}/><path d="M56 30h30M86 22v16M70 40v10" ${st(COL.metal)}/>`,
  tempSensor: `<path d="M16 30h44" ${st(COL.metal, 'none', 3)}/><rect x="60" y="16" width="26" height="28" rx="3" ${st(COL.metal, COL.panel)}/><text x="73" y="34" font-size="9" fill="${COL.acc}" text-anchor="middle" font-family="monospace">22.0</text><circle cx="14" cy="30" r="3.5" ${st(COL.warm, COL.warm)}/>`,
  pressureSensor: `<rect x="20" y="14" width="44" height="32" rx="4" ${st(COL.metal, COL.panel)}/><circle cx="42" cy="30" r="11" ${st(COL.ink, COL.dark, 1.2)}/><path d="M42 30l6-6" ${st(COL.bad, 'none', 1.8)}/><path d="M64 30h24" ${st(COL.metal, 'none', 3)}/>`,
  waterBath: `<path d="M16 16v32a4 4 0 0 0 4 4h60a4 4 0 0 0 4-4V16" ${st(COL.metal, 'none', 2)}/><path d="M18 28h64v20a2 2 0 0 1-2 2H20a2 2 0 0 1-2-2z" fill="#1d5e7a" stroke="none" opacity=".8"/><path d="M30 42q4-5 8 0t8 0 8 0" ${st(COL.warm, 'none', 1.8)}/>`,
  dcSource: `<rect x="12" y="12" width="76" height="38" rx="4" ${st(COL.metal, COL.panel)}/><rect x="20" y="18" width="30" height="12" rx="2" ${st(COL.acc, COL.dark, 1)}/><text x="35" y="28" font-size="8" fill="${COL.acc}" text-anchor="middle" font-family="monospace">06.0</text><circle cx="66" cy="26" r="7" ${st(COL.ink, COL.dark)}/><path d="M66 26l3-4" ${st(COL.warm)}/><circle cx="26" cy="42" r="3.2" ${st(COL.bad, COL.bad)}/><circle cx="44" cy="42" r="3.2" ${st(COL.ink, COL.dark)}/>`,
  battery: `<rect x="20" y="16" width="52" height="28" rx="3" ${st(COL.metal, '#2c4254')}/><rect x="72" y="24" width="7" height="12" ${st(COL.metal, COL.metal)}/><path d="M32 22v16M44 22v16M56 22v16" ${st(COL.warm, 'none', 2)}/><text x="22" y="14" font-size="7" fill="${COL.ink}" font-family="monospace">+  4.5V</text>`,
  resistor: `<path d="M6 30h18M76 30h18" ${st(COL.metal, 'none', 2)}/><rect x="24" y="21" width="52" height="18" rx="9" ${st('#c9a97a', '#a07f56')}/><path d="M38 21v18M46 21v18M54 21v18M66 21v18" ${st('#2b2b2b', 'none', 3)}/>`,
  rheostat: `<rect x="12" y="26" width="76" height="22" rx="3" ${st(COL.metal, COL.panel)}/>${Array.from({ length: 12 }, (_, i) => `<path d="M${17 + i * 6} 30v14" ${st(COL.warm, 'none', 1.6)}/>`).join('')}<path d="M12 14h76M54 14v10" ${st(COL.ink, 'none', 1.6)}/><rect x="49" y="22" width="10" height="6" rx="1" ${st(COL.acc, COL.dark, 1)}/>`,
  bulb: `<path d="M50 6a18 18 0 0 0-8 34v6h16v-6a18 18 0 0 0-8-34z" ${st(COL.ink, '#2a4152')}/><path d="M44 40l2-12 4 4 4-4 2 12" ${st(COL.warm, 'none', 1.6)}/><rect x="44" y="46" width="12" height="9" rx="2" ${st(COL.metal, COL.panel)}/>`,
  diode: `<path d="M6 30h30M64 30h30M36 16v28l28-14zM64 16v28" ${st(COL.ink, 'none', 2)}/>`,
  switch: `<path d="M10 40h22M68 40h22" ${st(COL.metal, 'none', 2.4)}/><circle cx="32" cy="40" r="3" ${st(COL.ink, COL.dark)}/><circle cx="68" cy="40" r="3" ${st(COL.ink, COL.dark)}/><path d="M32 40l26-18" ${st(COL.warm, 'none', 3)}/>`,
  ammeter: `<circle cx="50" cy="30" r="22" ${st(COL.metal, COL.panel)}/><rect x="34" y="22" width="32" height="14" rx="2" ${st(COL.acc, COL.dark, 1)}/><text x="50" y="33" font-size="9" fill="${COL.acc}" text-anchor="middle" font-family="monospace">0.50</text><text x="50" y="50" font-size="9" fill="${COL.ink}" text-anchor="middle" font-weight="700">A</text>`,
  voltmeter: `<circle cx="50" cy="30" r="22" ${st(COL.metal, COL.panel)}/><rect x="34" y="22" width="32" height="14" rx="2" ${st(COL.acc, COL.dark, 1)}/><text x="50" y="33" font-size="9" fill="${COL.acc}" text-anchor="middle" font-family="monospace">6.00</text><text x="50" y="50" font-size="9" fill="${COL.ink}" text-anchor="middle" font-weight="700">V</text>`,
};

export function iconSVG(id) {
  return `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg" class="icon" aria-hidden="true">${ICONS[id] || ''}</svg>`;
}

// ─────────── Linh kiện mạch điện trên bàn thí nghiệm: kích thước 110×64, các cực ở mép trái/phải ───────────
export const PART_W = 110, PART_H = 64;
export const TERM_POS = {
  dcSource: { n: [0, 32], p: [110, 32] }, battery: { n: [0, 32], p: [110, 32] },
  resistor: { a: [0, 32], b: [110, 32] }, rheostat: { a: [0, 32], b: [110, 32] }, bulb: { a: [0, 32], b: [110, 32] },
  diode: { a: [0, 32], k: [110, 32] }, switch: { a: [0, 32], b: [110, 32] },
  ammeter: { p: [0, 32], n: [110, 32] }, voltmeter: { p: [0, 32], n: [110, 32] },
};
const lead = `<path d="M0 32h14M96 32h14" ${st(COL.metal, 'none', 2.4)}/>`;

/** live: {text, warn, glow(0..1), closed} */
export function partInner(type, p = {}, live = {}) {
  const warn = live.warn ? COL.bad : null;
  switch (type) {
    case 'dcSource':
      return `<rect x="10" y="6" width="90" height="52" rx="5" ${st(warn || COL.metal, COL.panel)}/>
        <rect x="18" y="12" width="44" height="18" rx="2" ${st(COL.acc, COL.dark, 1)}/>
        <text x="40" y="26" font-size="13" fill="${COL.acc}" text-anchor="middle" font-family="monospace">${(p.E ?? 0).toFixed(1)} V</text>
        <text x="55" y="48" font-size="8" fill="${COL.ink}" text-anchor="middle">NGUỒN DC 0–12 V</text>
        <circle cx="82" cy="20" r="8" ${st(COL.ink, COL.dark)}/><path d="M82 20l${(4 * Math.sin(((p.E ?? 0) / 12) * 4.5 - 2.2)).toFixed(1)} ${(-4 * Math.cos(((p.E ?? 0) / 12) * 4.5 - 2.2)).toFixed(1)}" ${st(COL.warm, 'none', 2)}/>
        <path d="M0 32h10M100 32h10" ${st(COL.metal, 'none', 2.4)}/><text x="104" y="26" font-size="12" fill="${COL.bad}" font-weight="700">+</text><text x="4" y="26" font-size="14" fill="${COL.ink}" font-weight="700">−</text>`;
    case 'battery':
      return `<rect x="16" y="10" width="78" height="44" rx="5" ${st(COL.metal, '#2c4254')}/><path d="M34 20v24M48 20v24M62 20v24M76 20v24" ${st(COL.warm, 'none', 2.4)}/>
        <text x="55" y="9" font-size="8" fill="${COL.ink}" text-anchor="middle">BỘ PIN 4,5 V</text><path d="M0 32h16M94 32h16" ${st(COL.metal, 'none', 2.4)}/>
        <text x="100" y="26" font-size="12" fill="${COL.bad}" font-weight="700">+</text><text x="4" y="26" font-size="14" fill="${COL.ink}" font-weight="700">−</text>`;
    case 'resistor': {
      const R = p.R ?? 100;
      const lab = R >= 1000 ? `${R / 1000} kΩ` : `${R} Ω`;
      return `${lead}<rect x="22" y="20" width="66" height="24" rx="12" ${st(warn || '#c9a97a', '#a07f56')}/>
        <path d="M38 20v24M48 20v24M58 20v24M76 20v24" ${st('#2b2b2b', 'none', 3.4)}/><text x="55" y="58" font-size="10" fill="${COL.ink}" text-anchor="middle">${lab}${live.warn ? ' ⚠' : ''}</text>`;
    }
    case 'rheostat': {
      const x = 16 + (p.pos ?? 50) / 100 * 78;
      return `${lead}<rect x="12" y="30" width="86" height="24" rx="3" ${st(COL.metal, COL.panel)}/>${Array.from({ length: 13 }, (_, i) => `<path d="M${18 + i * 6.3} 34v16" ${st(COL.warm, 'none', 1.6)}/>`).join('')}
        <path d="M12 14h86" ${st(COL.ink, 'none', 1.4)}/><path d="M${x} 14v18" ${st(COL.ink, 'none', 1.6)}/><rect x="${x - 6}" y="26" width="12" height="7" rx="1.5" ${st(COL.acc, COL.dark, 1)}/>
        <text x="55" y="9" font-size="9" fill="${COL.ink}" text-anchor="middle">BIẾN TRỞ 100 Ω</text>`;
    }
    case 'bulb': {
      const g = live.glow ?? 0;
      const fill = `rgba(255,${Math.round(190 + g * 50)},${Math.round(80 + g * 90)},${0.12 + 0.88 * g})`;
      return `${lead}<circle cx="55" cy="28" r="${22 + g * 3}" fill="rgba(255,200,80,${g * 0.25})" stroke="none"/><path d="M55 6a21 21 0 0 0-10 40v6h20v-6a21 21 0 0 0-10-40z" ${st(warn || COL.ink, fill)}/>
        <path d="M47 44l3-14 5 5 5-5 3 14" ${st(g > 0.05 ? '#fff3c4' : COL.warm, 'none', 1.8)}/><text x="55" y="62" font-size="9" fill="${COL.ink}" text-anchor="middle">6 V – 3 W</text>`;
    }
    case 'diode':
      return `${lead}<path d="M44 14v36l26-18zM70 14v36" ${st(live.glow > 0.05 ? COL.acc : COL.ink, live.glow > 0.05 ? 'rgba(53,208,186,.25)' : 'none', 2.4)}/>
        <text x="55" y="62" font-size="9" fill="${COL.ink}" text-anchor="middle">1N4148  (A→K)</text>`;
    case 'switch': {
      const c = !!p.closed;
      return `<path d="M0 32h24M86 32h24" ${st(COL.metal, 'none', 2.4)}/><circle cx="24" cy="32" r="3.5" ${st(COL.ink, COL.dark)}/><circle cx="86" cy="32" r="3.5" ${st(COL.ink, COL.dark)}/>
        <path d="M24 32L${c ? 86 : 74} ${c ? 32 : 12}" ${st(c ? COL.acc : COL.warm, 'none', 4)}/><text x="55" y="58" font-size="10" fill="${c ? COL.acc : COL.ink}" text-anchor="middle">${c ? 'ĐÓNG' : 'MỞ'} (nhấp để đổi)</text>`;
    }
    case 'ammeter': case 'voltmeter': {
      const isA = type === 'ammeter';
      return `<rect x="12" y="6" width="86" height="52" rx="6" ${st(live.warn ? COL.bad : COL.metal, COL.panel)}/>
        <rect x="20" y="12" width="70" height="22" rx="2" ${st(COL.acc, '#0e1a22', 1)}/>
        <text x="86" y="29" font-size="16" fill="${live.text === 'OL' ? COL.bad : COL.acc}" text-anchor="end" font-family="monospace">${live.text ?? '----'}</text>
        <text x="24" y="44" font-size="10" fill="${COL.ink}" font-weight="700">${isA ? 'A' : 'V'}  <tspan font-weight="400" fill="${COL.mute}">${live.range != null ? 'thang ' + live.range : ''}</tspan></text>
        <path d="M0 32h12M98 32h12" ${st(COL.metal, 'none', 2.4)}/><text x="3" y="26" font-size="12" fill="${COL.bad}" font-weight="700">+</text><text x="100" y="26" font-size="14" fill="${COL.ink}" font-weight="700">−</text>
        <text x="55" y="55" font-size="8" fill="${COL.mute}" text-anchor="middle">${live.label ?? ''}</text>`;
    }
    default: return '';
  }
}

export const specOf = (id) => INSTRUMENTS[id];
