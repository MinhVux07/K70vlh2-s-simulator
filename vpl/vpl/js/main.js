// Điểm vào: bộ định tuyến (hash), trang chủ, danh mục thí nghiệm, không gian làm việc.
import { h, clear, toast } from './ui/dom.js';
import { Store } from './core/store.js';
import { Workspace } from './ui/workspace.js';
import { LABS, IMPLEMENTED, catalog, getExperiment, levelName, labInfo } from './registry.js';

const store = new Store();
const root = document.getElementById('view');
let current = null;

const STATUS = { new: 'Chưa làm', doing: 'Đang làm', done: 'Đã hoàn thành' };

function topbar(route) {
  const link = (href, label, on) => h('a', { href, class: on ? 'on' : '' }, label);
  return h('header', { class: 'topbar' },
    h('a', { class: 'brand', href: '#/' }, h('span', { class: 'logo', 'aria-hidden': 'true' }, '⚛'), h('span', null, h('b', null, 'VIRTUAL PHYSICS LAB'), h('small', null, 'Phòng thí nghiệm vật lý ảo'))),
    h('nav', null, link('#/', 'Trang chủ', route === 'home'), link('#/experiments', 'Thí nghiệm', route === 'catalog')));
}

function expCard(c) {
  const lab = labInfo(c.lab);
  if (c.planned) return h('div', { class: 'xcard planned', style: { '--c': lab.color } }, h('span', { class: 'chip' }, lab.name), h('h3', null, c.title), h('p', { class: 'mute sm' }, c.topic), h('span', { class: 'tag' }, `Dự kiến giai đoạn ${c.phase}`));
  const st = store.getStatus(c.id);
  return h('a', { class: 'xcard', href: `#/lab/${c.id}`, style: { '--c': lab.color } },
    h('div', { class: 'xc-top' }, h('span', { class: 'chip' }, lab.name), h('span', { class: `lvl l${c.level}` }, levelName(c.level))),
    h('h3', null, c.title), h('p', { class: 'mute sm' }, c.topic + ' · ~' + c.minutes + ' phút'),
    h('ul', { class: 'goals' }, c.goals.slice(0, 2).map((g) => h('li', null, g))),
    h('div', { class: 'xc-bot' }, h('span', { class: `st ${st}` }, STATUS[st] || 'Chưa làm'), h('span', { class: 'go' }, 'Vào phòng thí nghiệm →')));
}

function renderHome() {
  const all = catalog(), done = IMPLEMENTED.filter((e) => store.getStatus(e.meta.id) !== 'new').length;
  return h('main', { class: 'page home' },
    h('section', { class: 'hero' },
      h('div', null, h('p', { class: 'eyebrow' }, 'Virtual Physics Laboratory'), h('h1', null, 'Bước vào phòng thí nghiệm vật lý ảo'),
        h('p', { class: 'lead' }, 'Tự chọn dụng cụ, tự lắp bàn thí nghiệm, tự đo, tự phân tích số liệu và rút ra định luật. Mọi số liệu đều sinh từ mô hình vật lý – không có kết quả dựng sẵn.'),
        h('div', { class: 'btn-row' }, h('a', { class: 'btn', href: '#/experiments' }, 'Chọn thí nghiệm'), h('a', { class: 'btn ghost', href: `#/lab/${IMPLEMENTED[0].meta.id}` }, 'Bắt đầu nhanh: Định luật II Newton'))),
      h('div', { class: 'hero-art', 'aria-hidden': 'true', html: `<svg viewBox="0 0 320 220"><defs><linearGradient id="g1" x1="0" x2="1"><stop offset="0" stop-color="#35d0ba"/><stop offset="1" stop-color="#7aa7ff"/></linearGradient></defs><path d="M20 190H300" stroke="#27455a" stroke-width="2"/><path d="M40 30V190M40 190C110 190 120 60 200 60S270 150 300 150" fill="none" stroke="url(#g1)" stroke-width="3"/><circle cx="200" cy="60" r="6" fill="#ffb454"/><circle cx="120" cy="150" r="4" fill="#35d0ba"/><circle cx="260" cy="120" r="4" fill="#7aa7ff"/><text x="48" y="24" fill="#8aa3b3" font-size="11" font-family="monospace">y = a·x + b   r = 0.9998</text></svg>` })),
    h('section', null, h('h2', null, 'Ba phân khu'), h('div', { class: 'labs' }, LABS.map((l) => {
      const n = IMPLEMENTED.filter((e) => e.meta.lab === l.id).length, p = all.filter((e) => e.lab === l.id && e.planned).length;
      return h('a', { class: 'labcard', href: `#/experiments?lab=${l.id}`, style: { '--c': l.color } }, h('span', { class: 'chip' }, l.en), h('h3', null, l.name), h('p', null, l.blurb), h('div', { class: 'mute sm' }, `${n} thí nghiệm hoạt động · ${p} đang lên kế hoạch`));
    }))),
    h('section', null, h('div', { class: 'sec-h' }, h('h2', null, 'Thí nghiệm hoạt động'), h('span', { class: 'mute sm' }, `Tiến độ: ${done}/${IMPLEMENTED.length} đã bắt đầu`)),
      h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': IMPLEMENTED.length, 'aria-valuenow': done }, h('i', { style: { width: `${(done / IMPLEMENTED.length) * 100}%` } })),
      h('div', { class: 'xgrid' }, all.filter((c) => !c.planned).map(expCard))),
    h('footer', { class: 'foot mute sm' }, 'Dữ liệu được lưu trong trình duyệt của bạn. Số liệu do mô phỏng vật lý tạo ra, không phải số liệu đo trên thiết bị thật.'));
}

function renderCatalog(params) {
  const all = catalog();
  const q = { text: '', lab: params.get('lab') || '', topic: '', level: '', status: 'all' };
  const list = h('div', { class: 'xgrid' }), count = h('span', { class: 'mute sm' });
  const topicSel = h('select', { 'aria-label': 'Chủ đề' });
  const fill = () => {
    clear(topicSel); topicSel.append(h('option', { value: '' }, 'Mọi chủ đề'));
    for (const t of [...new Set(all.filter((c) => !q.lab || c.lab === q.lab).map((c) => c.topic))]) topicSel.append(h('option', { value: t }, t));
  };
  const apply = () => {
    const t = q.text.trim().toLowerCase();
    const out = all.filter((c) => (!q.lab || c.lab === q.lab) && (!q.topic || c.topic === q.topic) && (!q.level || String(c.level) === q.level)
      && (q.status === 'all' || (q.status === 'ready' ? !c.planned : c.planned))
      && (!t || (c.title + ' ' + c.topic + ' ' + c.tags.join(' ') + ' ' + c.goals.join(' ')).toLowerCase().includes(t)));
    out.sort((a, b) => Number(a.planned) - Number(b.planned));
    clear(list); count.textContent = `${out.length} kết quả`;
    if (!out.length) list.append(h('p', { class: 'mute' }, 'Không có thí nghiệm phù hợp bộ lọc.'));
    for (const c of out) list.append(expCard(c));
  };
  const mkSel = (label, opts, key, onCh) => { const s = h('select', { 'aria-label': label }, opts.map(([v, t]) => h('option', { value: v, selected: v === q[key] }, t))); s.addEventListener('change', () => { q[key] = s.value; onCh?.(); apply(); }); return s; };
  const search = h('input', { type: 'search', placeholder: 'Tìm thí nghiệm, ví dụ: gia tốc, Ohm, khí…', 'aria-label': 'Tìm kiếm' });
  search.addEventListener('input', () => { q.text = search.value; apply(); });
  fill(); topicSel.addEventListener('change', () => { q.topic = topicSel.value; apply(); });
  const labSel = mkSel('Phân khu', [['', 'Mọi phân khu'], ...LABS.map((l) => [l.id, l.name])], 'lab', () => { q.topic = ''; fill(); });
  fill(); apply();
  return h('main', { class: 'page' }, h('h1', null, 'Danh mục thí nghiệm'),
    h('div', { class: 'filters' }, search, labSel, topicSel, mkSel('Mức độ', [['', 'Mọi mức độ'], ['1', 'Cơ bản'], ['2', 'Trung bình'], ['3', 'Nâng cao']], 'level'),
      mkSel('Trạng thái', [['all', 'Tất cả'], ['ready', 'Đã có thể làm'], ['plan', 'Đang lên kế hoạch']], 'status'), count), list);
}

function route() {
  if (current) { current.destroy(); current = null; }
  const hash = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = hash.split('?');
  const params = new URLSearchParams(qs || '');
  clear(root);
  document.body.classList.remove('in-lab');
  let page = 'home';
  const m = path.match(/^\/lab\/([\w-]+)$/);
  if (m) {
    const exp = getExperiment(m[1]);
    if (!exp) { root.append(topbar('x'), h('main', { class: 'page' }, h('h1', null, 'Không tìm thấy thí nghiệm'), h('p', null, `Mã «${m[1]}» không tồn tại.`), h('a', { class: 'btn', href: '#/experiments' }, 'Về danh mục'))); return; }
    document.body.classList.add('in-lab');
    const host = h('div', { class: 'lab-host' });
    root.append(host);
    try { current = new Workspace(exp, store, host); document.title = `${exp.meta.title} – Virtual Physics Lab`; }
    catch (e) { console.error(e); clear(root); root.append(topbar('x'), h('main', { class: 'page' }, h('h1', null, 'Không mở được thí nghiệm'), h('p', null, 'Dữ liệu phiên lưu trước đó có thể bị hỏng.'), h('button', { class: 'btn', onClick: () => { store.clearSession(exp.meta.id); route(); } }, 'Xóa phiên đã lưu và mở lại'))); }
    return;
  }
  if (path === '/experiments') { page = 'catalog'; root.append(topbar(page), renderCatalog(params)); document.title = 'Danh mục thí nghiệm – Virtual Physics Lab'; }
  else { root.append(topbar(page), renderHome()); document.title = 'Virtual Physics Lab – Phòng thí nghiệm vật lý ảo'; }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
window.addEventListener('error', (e) => { toast('Đã xảy ra lỗi: ' + (e.message || 'không rõ'), 'error', 6000); });
window.addEventListener('unhandledrejection', (e) => { toast('Đã xảy ra lỗi: ' + (e.reason?.message || e.reason), 'error', 6000); });
route();
window.__vpl = { store, get ws() { return current; } };
