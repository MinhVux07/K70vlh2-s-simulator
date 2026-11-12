// Các panel phía dưới (Số liệu · Đồ thị · Phân tích · Nhật ký) và panel Bài học bên phải.
import { h, clear, toast } from './dom.js';
import { Graph } from './graph.js';
import * as S from '../core/stats.js';
import { INSTRUMENTS } from '../core/instruments.js';

const TABS = [['data', 'Bảng số liệu'], ['graph', 'Đồ thị'], ['analysis', 'Phân tích'], ['log', 'Nhật ký']];
const fmtCell = (c, v) => (v == null ? '—' : S.fmtSig(v, c.sig ?? 4));
const colLabel = (c) => `${c.symbol}${c.unit ? ' (' + c.unit + ')' : ''}`;

export function buildBottom(ws) {
  clear(ws.bottomEl);
  ws.bottomTabsEl = h('div', { class: 'tabs', role: 'tablist' });
  ws.bottomBody = h('div', { class: 'bottom-body' });
  ws.bottomEl.append(ws.bottomTabsEl, ws.bottomBody);
  renderBottomTabs(ws);
  refreshBottom(ws, true);
}

function renderBottomTabs(ws) {
  clear(ws.bottomTabsEl);
  for (const [id, label] of TABS) {
    ws.bottomTabsEl.append(h('button', { class: `tab${ws.bottomTab === id ? ' on' : ''}`, role: 'tab', 'aria-selected': String(ws.bottomTab === id), 'data-tab': id,
      onClick: () => { ws.bottomTab = id; renderBottomTabs(ws); refreshBottom(ws, true); } }, label));
  }
}

export function refreshBottom(ws, force = false) {
  if (!ws.bottomBody) return;
  const t = ws.bottomTab;
  if (force || ws._builtTab !== t) {
    ws._builtTab = t; ws.graphObj = null; clear(ws.bottomBody);
    if (t === 'data') buildData(ws, ws.bottomBody);
    else if (t === 'graph') buildGraph(ws, ws.bottomBody);
    else if (t === 'analysis') buildAnalysis(ws, ws.bottomBody);
    else buildLog(ws, ws.bottomBody);
    return;
  }
  if (t === 'data') updateData(ws);
  else if (t === 'graph') updateGraph(ws);
  else if (t === 'analysis') updateAnalysis(ws);
  else buildLog(ws, ws.bottomBody);
}

// ───────────────────────── Bảng số liệu ─────────────────────────
function buildData(ws, body) {
  const cols = ws.columns();
  ws._dataSig = null;
  const info = h('span', { class: 'mute sm', id: 'dataInfo' });
  const bar = h('div', { class: 'data-bar' },
    h('button', { class: 'btn sm', onClick: () => { ws.addRow(Object.fromEntries(cols.filter((c) => !c.calc).map((c) => [c.key, null])), false); } }, '+ Thêm lần đo thủ công'),
    h('button', { class: 'btn ghost sm', onClick: () => { if (ws.state.rows.length && confirm('Xóa toàn bộ số liệu?')) { ws.state.rows = []; ws.log('Đã xóa toàn bộ số liệu.'); ws.changed(); refreshBottom(ws, true); } } }, 'Xóa tất cả'),
    h('button', { class: 'btn ghost sm', onClick: () => ws.exportCSV() }, 'Xuất CSV'), info);
  ws._tableHost = h('div', { class: 'table-scroll' });
  body.append(bar, ws._tableHost);
  updateData(ws);
}

function updateData(ws) {
  const cols = ws.columns(), rows = ws.state.rows;
  const sig = rows.map((r) => r.id).join(',') + '|' + cols.map((c) => c.key).join(',');
  const info = document.getElementById('dataInfo');
  if (info) info.textContent = `${rows.length} lần đo · ${ws.includedRows().length} được dùng để phân tích`;
  if (sig !== ws._dataSig) {
    ws._dataSig = sig; ws._cellEls = new Map();
    const head = h('tr', null, h('th', { class: 'n' }, 'Lần'), h('th', { title: 'Đưa vào phân tích' }, 'Dùng'), cols.map((c) => h('th', { title: c.label + (c.formula ? ' = ' + c.formula : '') }, h('div', null, c.symbol), h('small', null, c.unit || ' '))), h('th', null, ''));
    const trs = rows.map((r, i) => {
      const tr = h('tr', { class: r.inc ? '' : 'exc', 'data-row': r.id });
      tr.append(h('td', { class: 'n' }, String(i + 1)));
      const cb = h('input', { type: 'checkbox', checked: r.inc, 'aria-label': `Dùng lần đo ${i + 1}` });
      cb.addEventListener('change', () => { r.inc = cb.checked; ws.changed(); tr.classList.toggle('exc', !r.inc); });
      tr.append(h('td', null, cb));
      for (const c of cols) {
        const td = h('td', { class: c.calc ? 'calc' : '' });
        if (c.calc) td.textContent = fmtCell(c, ws.cell(r, c));
        else {
          const v = ws.cell(r, c);
          const inp = h('input', { type: 'text', inputmode: 'decimal', value: v == null ? '' : S.fmtSig(v, c.sig ?? 4), 'aria-label': `${c.label}, lần ${i + 1}`, class: r.edited?.[c.key] ? 'edited' : '' });
          inp.addEventListener('change', () => {
            const txt = inp.value.trim().replace(',', '.');
            if (txt === '') r.vals[c.key] = null;
            else {
              const n = Number(txt);
              if (!Number.isFinite(n)) { toast(`«${inp.value}» không phải là số hợp lệ.`, 'warn'); inp.value = ws.cell(r, c) == null ? '' : S.fmtSig(ws.cell(r, c), c.sig ?? 4); return; }
              r.vals[c.key] = n;
            }
            (r.edited ||= {})[c.key] = true; inp.classList.add('edited');
            ws.log(`Sửa số liệu lần ${i + 1}: ${c.symbol} = ${txt || '(trống)'}.`);
            ws.changed();
          });
          td.append(inp);
        }
        ws._cellEls.set(r.id + ':' + c.key, td);
        tr.append(td);
      }
      tr.append(h('td', null, h('button', { class: 'btn ghost sm', title: 'Xóa lần đo', 'aria-label': `Xóa lần đo ${i + 1}`, onClick: () => { ws.state.rows = ws.state.rows.filter((x) => x !== r); ws.log(`Xóa lần đo ${i + 1}.`); ws.changed(); } }, '✕')));
      return tr;
    });
    const tbl = h('table', { class: 'data' }, h('thead', null, head), h('tbody', null, trs.length ? trs : h('tr', null, h('td', { colspan: cols.length + 3, class: 'empty' }, 'Chưa có số liệu. Hãy tiến hành thí nghiệm rồi nhấn «Ghi số liệu», hoặc thêm lần đo thủ công.'))));
    clear(ws._tableHost); ws._tableHost.append(tbl);
    return;
  }
  for (const r of rows) for (const c of cols) {
    const td = ws._cellEls.get(r.id + ':' + c.key); if (!td) continue;
    if (c.calc) td.textContent = fmtCell(c, ws.cell(r, c));
    else { const inp = td.firstChild; if (inp && document.activeElement !== inp) { const v = ws.cell(r, c); inp.value = v == null ? '' : S.fmtSig(v, c.sig ?? 4); } }
  }
}

// ───────────────────────── Đồ thị ─────────────────────────
function graphSetup(ws) {
  const g = ws.state.graph, exp = ws.exp, cols = ws.columns();
  if (g.mode === 'curve' && exp.curves) {
    const cv = exp.curves.find((c) => c.key === g.curve) || exp.curves[0];
    const runs = ws.state.runs.filter((r) => r.series?.[cv.key]);
    const series = runs.map((r, i) => ({ name: r.label, pts: r.series.t.map((t, k) => ({ x: t, y: r.series[cv.key][k] })).filter((p) => Number.isFinite(p.y)), lines: true, fit: false, color: i === runs.length - 1 ? '#35d0ba' : undefined }));
    return { series, xLabel: 't (s)', yLabel: cv.yLabel, caption: `Đường cong ${cv.label} của các lần chạy.`, opt: { logx: false, logy: false, includeOrigin: true, fit: false } };
  }
  const cx = cols.find((c) => c.key === g.x) || cols[0], cy = cols.find((c) => c.key === g.y) || cols[1] || cols[0];
  const pts = ws.pairs(cx.key, cy.key);
  return { series: [{ name: '', pts, fit: true, lines: false }], xLabel: colLabel(cx), yLabel: colLabel(cy), caption: `Đồ thị ${cy.symbol}–${cx.symbol} (${pts.length} điểm).`, opt: { logx: g.logx, logy: g.logy, includeOrigin: g.origin, fit: g.fit } };
}

export function graphToPNG(ws) {
  try {
    const gs = graphSetup(ws);
    if (!gs.series.some((s) => s.pts.length)) return null;
    const c = document.createElement('canvas'); c.width = 1100; c.height = 620;
    Object.defineProperty(c, 'clientWidth', { value: 550 }); Object.defineProperty(c, 'clientHeight', { value: 310 });
    const g = new Graph(c, { theme: 'light' });
    g.setData(gs); g.setOptions(gs.opt); g.render();
    return { png: c.toDataURL('image/png'), caption: gs.caption + (g.fitInfo ? ` Đường hồi quy: y = ${S.fmtSig(g.fitInfo.slope, 4)}·x + ${S.fmtSig(g.fitInfo.intercept, 3)}, r = ${S.fmtSig(g.fitInfo.r, 4)}.` : '') };
  } catch (e) { console.error(e); return null; }
}

function buildGraph(ws, body) {
  const g = ws.state.graph, exp = ws.exp, cols = ws.columns();
  const numCols = cols;
  if (!g.x || !numCols.some((c) => c.key === g.x)) { const p = exp.graphs?.[0]; g.x = p?.x || numCols[0].key; g.y = p?.y || (numCols[1] || numCols[0]).key; }
  const sel = (opts, val, on, label) => { const s = h('select', { 'aria-label': label }, opts.map(([v, t]) => h('option', { value: v, selected: String(v) === String(val) }, t))); s.addEventListener('change', () => on(s.value)); return s; };
  const chk = (label, val, on) => { const c = h('input', { type: 'checkbox', checked: val }); c.addEventListener('change', () => on(c.checked)); return h('label', { class: 'ck' }, c, label); };
  const bar = h('div', { class: 'graph-bar' });
  const redo = () => { ws.save(); buildGraph(ws, clear(body)); };
  if (exp.curves) bar.append(sel([['data', 'Dữ liệu đã ghi'], ['curve', 'Đường cong lần chạy']], g.mode, (v) => { g.mode = v; redo(); }, 'Nguồn đồ thị'));
  if (g.mode === 'curve' && exp.curves) {
    bar.append(sel(exp.curves.map((c) => [c.key, c.label]), g.curve || exp.curves[0].key, (v) => { g.curve = v; redo(); }, 'Đại lượng'));
  } else {
    const presets = exp.graphs || [];
    const cur = presets.findIndex((p) => p.x === g.x && p.y === g.y && !!p.logx === !!g.logx && !!p.logy === !!g.logy);
    bar.append(sel([...presets.map((p, i) => [i, p.label]), [-1, 'Tùy chọn…']], cur, (v) => { const p = presets[+v]; if (p) { g.x = p.x; g.y = p.y; g.logx = !!p.logx; g.logy = !!p.logy; g.origin = p.origin !== false; } redo(); }, 'Đồ thị mẫu'));
    bar.append(h('label', { class: 'ax' }, 'Trục X', sel(numCols.map((c) => [c.key, colLabel(c)]), g.x, (v) => { g.x = v; redo(); }, 'Trục X')));
    bar.append(h('label', { class: 'ax' }, 'Trục Y', sel(numCols.map((c) => [c.key, colLabel(c)]), g.y, (v) => { g.y = v; redo(); }, 'Trục Y')));
    bar.append(chk('log X', g.logx, (v) => { g.logx = v; redo(); }), chk('log Y', g.logy, (v) => { g.logy = v; redo(); }), chk('Gốc tọa độ', g.origin, (v) => { g.origin = v; redo(); }), chk('Đường hồi quy', g.fit, (v) => { g.fit = v; redo(); }));
  }
  bar.append(h('span', { class: 'zoom' }, h('button', { class: 'btn ghost sm', title: 'Phóng to', 'aria-label': 'Phóng to', onClick: () => ws.graphObj?.zoom(1 / 1.4) }, '＋'), h('button', { class: 'btn ghost sm', title: 'Thu nhỏ', 'aria-label': 'Thu nhỏ', onClick: () => ws.graphObj?.zoom(1.4) }, '－'), h('button', { class: 'btn ghost sm', onClick: () => ws.graphObj?.resetView() }, 'Đặt lại khung')));
  const canvas = h('canvas', { class: 'graph', role: 'img', 'aria-label': 'Đồ thị số liệu' });
  const info = h('div', { class: 'fit-info', id: 'fitInfo' });
  body.append(bar, h('div', { class: 'graph-wrap' }, canvas, info));
  ws.graphObj = new Graph(canvas, { onFit: (f) => showFit(ws, info, f) });
  updateGraph(ws);
}

function showFit(ws, el, f) {
  clear(el);
  if (!f) { el.append(h('p', { class: 'mute sm' }, 'Cuộn chuột để phóng to/thu nhỏ, kéo để di chuyển, nhấp đúp để đặt lại. Cần ≥ 2 điểm để vẽ hồi quy.')); return; }
  const rows = [
    ['Hệ số góc a', `${S.fmtWithUnc(f.slope, f.seSlope)}`], ['Tung độ gốc b', `${S.fmtWithUnc(f.intercept, f.seIntercept)}`],
    ['Hệ số tương quan r', S.fmtSig(f.r, 5)], ['R²', S.fmtSig(f.r2, 5)], ['Số điểm n', String(f.n)],
  ];
  if (Number.isFinite(f.xIntercept)) rows.push(['Giao với trục x', Number.isFinite(f.seXIntercept) ? S.fmtWithUnc(f.xIntercept, f.seXIntercept) : S.fmtSig(f.xIntercept, 4)]);
  el.append(h('div', { class: 'blk-t' }, 'Hồi quy tuyến tính y = a·x + b'), h('table', { class: 'kv' }, rows.map(([k, v]) => h('tr', null, h('th', null, k), h('td', null, v)))));
}
function updateGraph(ws) {
  if (!ws.graphObj) return;
  const gs = graphSetup(ws);
  ws.graphObj.setData(gs); ws.graphObj.setOptions(gs.opt); ws.graphObj.render();
}

// ───────────────────────── Phân tích ─────────────────────────
function buildAnalysis(ws, body) {
  const cols = ws.columns().filter((c) => !c.calc || true);
  ws._anCol = ws._anCol && cols.some((c) => c.key === ws._anCol) ? ws._anCol : cols[0].key;
  ws._anRef = ws._anRef ?? '';
  const res = h('div', { class: 'an-res' }), stat = h('div', { class: 'an-stat' });
  ws._anRes = res; ws._anStat = stat;
  const colSel = h('select', { 'aria-label': 'Đại lượng cần thống kê' }, cols.map((c) => h('option', { value: c.key, selected: c.key === ws._anCol }, colLabel(c))));
  const refIn = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'tùy chọn', value: ws._anRef, 'aria-label': 'Giá trị tham chiếu' });
  colSel.addEventListener('change', () => { ws._anCol = colSel.value; updateAnalysis(ws); });
  refIn.addEventListener('input', () => { ws._anRef = refIn.value; updateAnalysis(ws); });
  const obs = h('textarea', { rows: 4, placeholder: 'Nhận xét của em về hiện tượng quan sát được và số liệu…', maxlength: 3000, 'aria-label': 'Nhận xét' }, ws.state.notes.observation);
  const con = h('textarea', { rows: 4, placeholder: 'Kết luận của em (tối thiểu 20 ký tự): quy luật vật lý rút ra từ số liệu, độ tin cậy, nguyên nhân sai số…', maxlength: 3000, 'aria-label': 'Kết luận' }, ws.state.notes.conclusion);
  obs.addEventListener('input', () => { ws.state.notes.observation = obs.value; ws.save(); });
  con.addEventListener('input', () => { ws.state.notes.conclusion = con.value; ws.save(); ws.refreshLesson(); });
  body.append(h('div', { class: 'an-grid' },
    h('div', { class: 'blk' }, h('div', { class: 'blk-t' }, 'So sánh thực nghiệm với lý thuyết'), res),
    h('div', { class: 'blk' }, h('div', { class: 'blk-t' }, 'Thống kê một đại lượng đo lặp lại'),
      h('div', { class: 'row2' }, h('label', null, 'Đại lượng', colSel), h('label', null, 'Giá trị tham chiếu', refIn)), stat),
    h('div', { class: 'blk' }, h('div', { class: 'blk-t' }, 'Nhận xét và kết luận của học sinh'), obs, con)));
  updateAnalysis(ws);
}

function updateAnalysis(ws) {
  if (!ws._anRes || !ws._anRes.isConnected) return;
  const reveal = ws.canSeeTheory();
  const out = ws.exp.analyze ? ws.exp.analyze(ws, { reveal }) : { items: [], notes: [] };
  clear(ws._anRes);
  if (!out.items.length) ws._anRes.append(h('p', { class: 'mute' }, 'Chưa đủ số liệu để phân tích. Hãy ghi thêm các lần đo.'));
  else {
    ws._anRes.append(h('table', { class: 'an-t' }, h('thead', null, h('tr', null, ['Đại lượng', 'Thực nghiệm', 'Lý thuyết', 'Sai lệch'].map((t) => h('th', null, t)))),
      h('tbody', null, out.items.map((a) => h('tr', null, h('td', { class: 'l' }, a.label), h('td', null, a.value), h('td', null, reveal || !a.theory ? (a.ref ?? '—') : '🔒 sau khi có ≥ 3 lần đo'), h('td', null, reveal || !a.theory ? (a.err ?? '—') : '—'))))));
    for (const n of out.notes || []) ws._anRes.append(h('p', { class: 'an-note' }, n));
  }
  // thống kê đo lặp
  const col = ws.columns().find((c) => c.key === ws._anCol);
  const vals = col ? ws.colValues(col.key).filter((v) => v != null) : [];
  clear(ws._anStat);
  if (vals.length < 2) { ws._anStat.append(h('p', { class: 'mute' }, 'Cần ít nhất 2 lần đo để tính độ lệch chuẩn.')); return; }
  let bound = 0;
  const sp = [...new Set(ws.state.placed.map((p) => p.id))].map((id) => INSTRUMENTS[id]).find((s) => s.measures && s.unit === col.unit);
  if (sp) bound = sp.accFromParams ? sp.accFromParams(S.mean(vals), ws.item(sp.id)?.params || {}) : sp.accuracy;
  const u = S.uncertainty(vals, bound || 0);
  const rows = [['Số lần đo n', String(u.n)], ['Giá trị trung bình', `${S.fmtSig(u.mean, 5)} ${col.unit || ''}`], ['Độ lệch chuẩn s', S.fmtSig(u.sd, 3)], ['u_A = s/√n (ngẫu nhiên)', S.fmtSig(u.uA, 3)],
    ['u_B = Δ/√3 (thiết bị' + (sp ? ': ' + sp.symbol : '') + ')', bound ? S.fmtSig(u.uB, 3) : '— (không có dụng cụ đo tương ứng)'], ['U = 2·√(u_A²+u_B²)', S.fmtSig(u.U, 3)], ['Kết quả (k = 2)', `${S.fmtWithUnc(u.mean, u.U)} ${col.unit || ''}`]];
  const ref = Number(String(ws._anRef).replace(',', '.'));
  if (String(ws._anRef).trim() !== '' && Number.isFinite(ref)) rows.push(['Sai số tuyệt đối', S.fmtSig(S.absError(u.mean, ref), 3)], ['Sai số tương đối', Number.isFinite(S.relError(u.mean, ref)) ? S.fmtSig(S.pctError(u.mean, ref), 3) + ' %' : '—']);
  ws._anStat.append(h('table', { class: 'kv' }, rows.map(([k, v]) => h('tr', null, h('th', null, k), h('td', null, v)))));
}

// ───────────────────────── Nhật ký ─────────────────────────
function buildLog(ws, body) {
  clear(body);
  const list = h('ol', { class: 'logs' }, ws.state.log.slice(-200).map((e) => h('li', null, h('time', null, new Date(e.t).toLocaleTimeString('vi-VN')), ' ', e.msg)));
  body.append(h('div', { class: 'data-bar' }, h('button', { class: 'btn ghost sm', onClick: () => { ws.state.log = []; ws.save(); buildLog(ws, body); } }, 'Xóa nhật ký'), h('span', { class: 'mute sm' }, `${ws.state.log.length} sự kiện`)), list);
  list.scrollTop = list.scrollHeight;
}

// ───────────────────────── Bài học ─────────────────────────
export function buildLesson(ws, el) {
  const m = ws.meta, st = ws.state;
  ws._open ||= { goal: true, pred: true, proc: true };
  const sec = (key, title, ...kids) => {
    const d = h('details', { class: 'les', open: ws._open[key] ?? false }, h('summary', null, title), h('div', { class: 'les-b' }, kids));
    d.addEventListener('toggle', () => { ws._open[key] = d.open; });
    return d;
  };
  const rows = ws.includedRows().length;
  el.append(h('div', { class: 'les-head' }, h('p', { class: 'rq' }, m.question)));
  el.append(sec('goal', '1. Mục tiêu', h('ul', null, m.objective.map((o) => h('li', null, o)))));
  el.append(sec('theory', '2. Kiến thức nền', h('div', { class: 'theory', html: m.theory })));

  // dự đoán
  const pr = m.predict;
  const pbody = [h('p', null, pr.q)];
  const radios = pr.options.map((o, i) => {
    const r = h('input', { type: 'radio', name: 'pred', value: i, checked: st.pred?.i === i, disabled: !!st.pred && rows > 0 });
    return h('label', { class: 'opt' }, r, o);
  });
  pbody.push(...radios);
  if (!st.pred || rows === 0) {
    pbody.push(h('div', { class: 'spec-btns' },
      h('button', { class: 'btn sm', onClick: () => { const v = el.querySelector('input[name=pred]:checked'); if (!v) { toast('Hãy chọn một phương án.', 'warn'); return; } st.pred = { i: +v.value }; ws.log(`Dự đoán: «${pr.options[+v.value]}».`); ws.changed(); } }, st.pred ? 'Đổi dự đoán' : 'Ghi dự đoán'),
      !st.pred && h('button', { class: 'btn ghost sm', onClick: () => { st.pred = { i: -1 }; ws.log('Bỏ qua bước dự đoán.'); ws.changed(); } }, 'Chưa chắc, bỏ qua')));
  }
  if (st.pred && rows >= m.minRows) {
    const ok = st.pred.i === pr.correct;
    pbody.push(h('div', { class: `fb ${st.pred.i < 0 ? '' : ok ? 'ok' : 'bad'}` }, st.pred.i < 0 ? 'Bạn đã bỏ qua dự đoán. ' : ok ? 'Dự đoán của bạn phù hợp với số liệu. ' : 'Dự đoán của bạn khác với kết quả thực nghiệm. ', pr.explain));
  } else if (st.pred) pbody.push(h('p', { class: 'mute sm' }, `Hệ thống sẽ đối chiếu dự đoán với kết quả sau khi bạn có ${m.minRows} lần đo.`));
  el.append(sec('pred', '3. Dự đoán của em', pbody));

  // dụng cụ
  el.append(sec('app', '4. Dụng cụ cần dùng', h('ul', { class: 'check' }, m.apparatus.map((a) => h('li', { class: a.ids.some((id) => ws.has(id)) ? 'done' : '' }, a.text + (a.optional ? ' (tùy chọn)' : ''))))));

  // quy trình
  const steps = m.procedure.map((p, i) => {
    const auto = typeof p.done === 'function';
    let done = auto ? !!safe(() => p.done(ws)) : !!st.steps[i];
    const cb = h('input', { type: 'checkbox', checked: done, disabled: auto, 'aria-label': `Bước ${i + 1}` });
    if (!auto) cb.addEventListener('change', () => { st.steps[i] = cb.checked; ws.save(); });
    return h('li', { class: done ? 'done' : '' }, h('label', null, cb, ' ', p.t));
  });
  el.append(sec('proc', '5. Quy trình tiến hành', h('ol', { class: 'steps' }, steps)));

  // câu hỏi
  const qs = (m.questions || []).map((q, i) => questionView(ws, q, i, el));
  el.append(sec('q', `6. Câu hỏi thảo luận (${Object.values(st.answers).filter((a) => a.done).length}/${(m.questions || []).length})`, qs));

  // gợi ý
  const hints = m.hints || [];
  const hb = [h('div', { class: 'spec-btns' }, h('button', { class: 'btn ghost sm', disabled: st.hints >= hints.length, onClick: () => { st.hints++; ws.log(`Xem gợi ý ${st.hints}.`); ws.save(); ws.refreshLesson(); } }, st.hints >= hints.length ? 'Đã hết gợi ý' : `Xin gợi ý (${st.hints}/${hints.length})`))];
  hints.slice(0, st.hints).forEach((t, i) => hb.push(h('div', { class: 'hint' }, h('b', null, `Gợi ý ${i + 1}: `), t)));
  el.append(sec('hint', '7. Gợi ý khi gặp khó khăn', hb));

  // kết luận
  const req = ws.requirements();
  const kb = ws.unlocked()
    ? [h('div', { class: 'theory', html: m.conclusion })]
    : [h('p', { class: 'mute' }, 'Phần kết luận được mở sau khi bạn hoàn thành thí nghiệm:'), h('ul', { class: 'check' }, req.map((r) => h('li', { class: r.ok ? 'done' : '' }, r.label)))];
  el.append(sec('concl', ws.unlocked() ? '8. Kết luận và giải thích' : '8. Kết luận 🔒', kb));
}
const safe = (f) => { try { return f(); } catch { return false; } };

function questionView(ws, q, i, root) {
  const st = ws.state.answers[i];
  const box = h('div', { class: 'qbox' }, h('p', null, h('b', null, `Câu ${i + 1}. `), q.q));
  const done = st?.done;
  if (q.type === 'num') {
    const inp = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'đáp số', value: st?.v ?? '', disabled: !!done, 'aria-label': `Đáp án câu ${i + 1}` });
    box.append(h('div', { class: 'row2' }, inp, h('span', { class: 'mute' }, q.unit || '')));
    if (!done) box.append(h('button', { class: 'btn sm', onClick: () => { const v = Number(inp.value.replace(',', '.')); if (inp.value.trim() === '' || !Number.isFinite(v)) { toast('Hãy nhập một số.', 'warn'); return; } submit(ws, q, i, inp.value, Math.abs(v - q.answer) <= q.tol); } }, 'Kiểm tra'));
  } else {
    const opts = q.options.map((o, k) => h('label', { class: 'opt' }, h('input', { type: 'radio', name: 'q' + i, value: k, checked: st?.v === k, disabled: !!done }), o));
    box.append(...opts);
    if (!done) box.append(h('button', { class: 'btn sm', onClick: () => { const c = box.querySelector(`input[name=q${i}]:checked`); if (!c) { toast('Hãy chọn một phương án.', 'warn'); return; } submit(ws, q, i, +c.value, +c.value === q.answer); } }, 'Kiểm tra'));
  }
  if (st && !done) box.append(h('div', { class: 'fb bad' }, 'Chưa chính xác. ', q.hint || 'Hãy xem lại số liệu và đồ thị rồi thử lại.'));
  if (done) box.append(h('div', { class: `fb ${st.ok ? 'ok' : 'bad'}` }, st.ok ? 'Chính xác. ' : 'Chưa đúng sau 2 lần thử. ', q.explain));
  return box;
}
function submit(ws, q, i, v, ok) {
  const prev = ws.state.answers[i] || { tries: 0 };
  const tries = prev.tries + 1;
  ws.state.answers[i] = { v, ok, tries, done: ok || tries >= 2 };
  ws.log(`Trả lời câu ${i + 1}: ${ok ? 'đúng' : 'sai'} (lần ${tries}).`);
  ws.changed(); ws.refreshLesson();
}
