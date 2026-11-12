// Tiện ích dựng DOM/SVG nhỏ gọn (không phụ thuộc thư viện).
const SVGNS = 'http://www.w3.org/2000/svg';

function apply(el, attrs) {
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if ((k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') && el instanceof HTMLElement) el[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
}
function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}
export function h(tag, attrs, ...kids) { const el = document.createElement(tag); apply(el, attrs); append(el, kids); return el; }
export function s(tag, attrs, ...kids) { const el = document.createElementNS(SVGNS, tag); apply(el, attrs); append(el, kids); return el; }
export function svgFrom(markup) {
  const t = document.createElementNS(SVGNS, 'g');
  t.innerHTML = markup;
  return t;
}
export const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

let tid = 0;
export function toast(msg, kind = 'info', ms = 3600) {
  let host = document.getElementById('toasts');
  if (!host) { host = h('div', { id: 'toasts', 'aria-live': 'polite' }); document.body.append(host); }
  const t = h('div', { class: `toast ${kind}`, role: 'status' }, msg);
  host.append(t);
  const id = ++tid;
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms + id * 0);
}

/** Tạo bộ điều khiển cho một tham số (range/select/number/toggle). */
export function paramControl(def, value, onChange) {
  const id = 'p_' + Math.random().toString(36).slice(2, 8);
  let input;
  if (def.type === 'range') {
    const out = h('output', { for: id }, fmtVal(value, def));
    input = h('input', { id, type: 'range', min: def.min, max: def.max, step: def.step, value });
    input.addEventListener('input', () => { out.textContent = fmtVal(+input.value, def); });
    input.addEventListener('change', () => onChange(+input.value));
    input.addEventListener('input', () => { if (def.live) onChange(+input.value); });
    return h('label', { class: 'pc', for: id }, h('span', { class: 'pc-l' }, def.label), h('span', { class: 'pc-r' }, input, out));
  }
  if (def.type === 'select') {
    input = h('select', { id });
    for (const o of def.options) {
      const opt = h('option', { value: String(o.v) }, o.label);
      if (String(o.v) === String(value)) opt.selected = true;
      input.append(opt);
    }
    input.addEventListener('change', () => {
      const o = def.options.find((x) => String(x.v) === input.value);
      onChange(o ? o.v : input.value);
    });
    return h('label', { class: 'pc', for: id }, h('span', { class: 'pc-l' }, def.label), h('span', { class: 'pc-r' }, input));
  }
  input = h('input', { id, type: 'number', step: def.step ?? 'any', min: def.min, max: def.max, value });
  input.addEventListener('change', () => {
    const v = parseFloat(input.value);
    if (!Number.isFinite(v) || (def.min != null && v < def.min) || (def.max != null && v > def.max)) {
      toast(`Giá trị "${def.label}" không hợp lệ${def.min != null ? ` (${def.min} … ${def.max})` : ''}.`, 'warn');
      input.value = value; return;
    }
    onChange(v);
  });
  return h('label', { class: 'pc', for: id }, h('span', { class: 'pc-l' }, def.label), h('span', { class: 'pc-r' }, input, def.unit ? h('span', { class: 'pc-u' }, def.unit) : null));
}
const fmtVal = (v, d) => `${Number.isInteger(d.step) || d.step >= 1 ? v : (+v).toFixed(String(d.step).split('.')[1]?.length ?? 1)}${d.unit ? ' ' + d.unit : ''}`;
