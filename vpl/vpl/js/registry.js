// Danh mục thí nghiệm. Mỗi thí nghiệm là một module riêng; thêm thí nghiệm mới = thêm một file và một dòng ở đây.
import newton2 from './experiments/newton2.js';
import freefall from './experiments/freefall.js';
import ohm from './experiments/ohm.js';
import hooke from './experiments/hooke.js';
import pendulum from './experiments/pendulum.js';
import calorimetry from './experiments/calorimetry.js';
import { seriesParallel, emf, iv } from './experiments/circuits.js';
import { boyle, gaylussac, charles } from './experiments/gas.js';

export const LABS = [
  { id: 'mech', name: 'Cơ học', en: 'Mechanics Lab', phase: 2, color: '#35d0ba', blurb: 'Chuyển động, lực, dao động và lực đàn hồi.' },
  { id: 'therm', name: 'Nhiệt học', en: 'Thermodynamics Lab', phase: 3, color: '#ffb454', blurb: 'Nhiệt dung riêng, cân bằng nhiệt và các định luật chất khí.' },
  { id: 'elec', name: 'Điện và Từ', en: 'Electromagnetism Lab', phase: 4, color: '#7aa7ff', blurb: 'Mạch điện một chiều, pin, điện trở và linh kiện phi tuyến.' },
];

import { pendulum3d, pendulumCam, hooke3d, hookeCam, newton3d, newtonCam, freefall3d, freefallCam } from './ui/scenes/mech3d.js';

import { gas3d, gasCam, calorimetry3d, calCam } from './ui/scenes/thermal3d.js';
import { circuit3d, circuitCam } from './ui/scenes/circuit3d.js';

// Cảnh 3D gắn vào từng thí nghiệm (xem ui/scenes).
Object.assign(pendulum, { scene3d: pendulum3d, cam3d: pendulumCam });
Object.assign(hooke, { scene3d: hooke3d, cam3d: hookeCam });
Object.assign(newton2, { scene3d: newton3d, cam3d: newtonCam });
Object.assign(freefall, { scene3d: freefall3d, cam3d: freefallCam });

for (const e of [boyle, gaylussac, charles]) Object.assign(e, { scene3d: gas3d, cam3d: gasCam });
Object.assign(calorimetry, { scene3d: calorimetry3d, cam3d: calCam });
for (const e of [ohm, seriesParallel, emf, iv]) Object.assign(e, { scene3d: circuit3d, cam3d: circuitCam });

// Mỗi phân khu có 4 thí nghiệm trọng tâm.
export const IMPLEMENTED = [newton2, freefall, pendulum, hooke, boyle, gaylussac, charles, calorimetry, ohm, seriesParallel, emf, iv];
const byId = new Map(IMPLEMENTED.map((e) => [e.meta.id, e]));
export const getExperiment = (id) => byId.get(id) || null;

export const PLANNED = [];

export const levelName = (n) => ['', 'Cơ bản', 'Trung bình', 'Nâng cao'][n] || '';
export const labInfo = (id) => LABS.find((l) => l.id === id);

export function catalog() {
  return [
    ...IMPLEMENTED.map((e) => ({ planned: false, id: e.meta.id, lab: e.meta.lab, topic: e.meta.topic, title: e.meta.title, level: e.meta.level, minutes: e.meta.minutes, tags: e.meta.tags, goals: e.meta.objective, phase: labInfo(e.meta.lab).phase })),
    ...PLANNED.map((p) => ({ ...p, id: null, level: 0, tags: [], goals: [] })),
  ];
}
