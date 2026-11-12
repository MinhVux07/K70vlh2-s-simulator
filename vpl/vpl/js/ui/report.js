// Hệ thống báo cáo: CSV, báo cáo HTML khoa học (in ra PDF bằng hộp thoại in của trình duyệt).
import { esc } from './dom.js';

export function csvOf(model) {
  const q = (v) => { const t = String(v ?? ''); return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const lines = [];
  lines.push([`# ${model.title}`].map(q).join(','));
  lines.push([`# Mô hình: ${model.modeLabel}`, `Ngày: ${model.date}`].map(q).join(','));
  lines.push(model.columns.map((c) => q(`${c.symbol} (${c.unit || '-'})`)).join(','));
  for (const r of model.rawRows) lines.push(r.map((v) => q(v)).join(','));
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export function downloadText(name, text, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

const sec = (n, title, body) => `<section><h2>${n}. ${esc(title)}</h2>${body}</section>`;
const ul = (a) => (a.length ? `<ul>${a.map((x) => `<li>${x}</li>`).join('')}</ul>` : '<p class="mute">(không có)</p>');

export function reportHTML(m) {
  const css = `
  @page{size:A4;margin:16mm}
  *{box-sizing:border-box}
  body{font:11pt/1.5 "Segoe UI",Roboto,Arial,sans-serif;color:#111;max-width:190mm;margin:0 auto;padding:12px}
  header{border-bottom:3px solid #0b6b5d;padding-bottom:8px;margin-bottom:14px}
  header .lab{color:#0b6b5d;font-weight:700;letter-spacing:.08em;font-size:9pt;text-transform:uppercase}
  h1{font-size:19pt;margin:2px 0 6px}
  .meta{display:flex;gap:18px;flex-wrap:wrap;font-size:10pt;color:#333}
  h2{font-size:12.5pt;margin:16px 0 6px;color:#0b6b5d;border-bottom:1px solid #cfd8dc;padding-bottom:2px;break-after:avoid}
  table{border-collapse:collapse;width:100%;margin:6px 0;font-size:10pt;break-inside:avoid}
  th,td{border:1px solid #9aa7ae;padding:3px 6px;text-align:right}
  th{background:#e9f1ef;text-align:center}
  td.l,th.l{text-align:left}
  tr.ex td{color:#999;text-decoration:line-through}
  img,svg.bench{max-width:100%;border:1px solid #cfd8dc;border-radius:4px;break-inside:avoid}
  .mute{color:#667}
  .box{border:1px solid #cfd8dc;background:#f7fafa;padding:6px 10px;border-radius:4px;white-space:pre-wrap}
  .formula{font-family:Cambria,"Times New Roman",serif;font-style:italic}
  footer{margin-top:18px;border-top:1px solid #cfd8dc;padding-top:6px;font-size:9pt;color:#667}
  .sig{display:flex;justify-content:space-between;margin-top:22px}
  @media print{.noprint{display:none}}
  .noprint{position:fixed;right:12px;top:12px}
  .noprint button{font:inherit;padding:6px 12px;border-radius:6px;border:1px solid #0b6b5d;background:#0b6b5d;color:#fff;cursor:pointer}`;
  const head = m.columns.map((c) => `<th>${esc(c.symbol)}<br><small>${esc(c.unit || '')}</small></th>`).join('');
  const body = m.rows.map((r, i) => `<tr class="${r.included ? '' : 'ex'}"><td>${i + 1}</td>${r.cells.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
  const table = m.rows.length
    ? `<table><thead><tr><th>Lần</th>${head}</tr></thead><tbody>${body}</tbody></table>${m.rows.some((r) => !r.included) ? '<p class="mute">Các dòng gạch ngang bị loại khỏi phân tích (số liệu bất thường do học sinh lựa chọn).</p>' : ''}`
    : '<p class="mute">Chưa có số liệu.</p>';
  const analysis = m.analysis.length
    ? `<table><thead><tr><th class="l">Đại lượng</th><th>Giá trị thực nghiệm</th><th>Giá trị lý thuyết / tham chiếu</th><th>Sai lệch</th></tr></thead><tbody>${m.analysis.map((a) => `<tr><td class="l">${esc(a.label)}</td><td>${esc(a.value)}</td><td>${esc(a.ref ?? '—')}</td><td>${esc(a.err ?? '—')}</td></tr>`).join('')}</tbody></table>`
    : '<p class="mute">Chưa đủ số liệu để phân tích.</p>';
  const inst = m.instruments.length
    ? `<table><thead><tr><th class="l">Dụng cụ</th><th>Giới hạn đo</th><th>Độ chia nhỏ nhất</th><th>Sai số thiết bị</th></tr></thead><tbody>${m.instruments.map((i) => `<tr><td class="l">${esc(i.name)}</td><td>${esc(i.range)}</td><td>${esc(i.lsd)}</td><td>${esc(i.acc)}</td></tr>`).join('')}</tbody></table>`
    : '<p class="mute">(chưa đặt dụng cụ nào lên bàn)</p>';
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Báo cáo – ${esc(m.title)}</title><style>${css}</style></head><body>
  <div class="noprint"><button onclick="window.print()">In / Lưu PDF</button></div>
  <header><div class="lab">Phòng thí nghiệm vật lý ảo · ${esc(m.labName)}</div><h1>BÁO CÁO THÍ NGHIỆM: ${esc(m.title)}</h1>
  <div class="meta"><span>Học sinh: <b>${esc(m.student.name || '………………')}</b></span><span>Lớp: <b>${esc(m.student.cls || '………')}</b></span><span>Ngày: ${esc(m.date)}</span><span>Mô hình: ${esc(m.modeLabel)}</span></div></header>
  ${sec(1, 'Mục tiêu', ul(m.objective.map(esc)))}
  ${sec(2, 'Cơ sở lý thuyết', `<div>${m.theory}</div>`)}
  ${sec(3, 'Dụng cụ', inst)}
  ${sec(4, 'Sơ đồ bố trí', m.benchSVG ? `<div>${m.benchSVG}</div><p class="mute">Dụng cụ trên bàn: ${m.placed.map(esc).join('; ') || '—'}</p>` : '<p class="mute">(không có)</p>')}
  ${sec(5, 'Các bước tiến hành', `<ol>${m.procedure.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>`)}
  ${sec(6, 'Bảng số liệu', table)}
  ${sec(7, 'Đồ thị', m.graphPNG ? `<img alt="Đồ thị" src="${m.graphPNG}"><p class="mute">${esc(m.graphCaption || '')}</p>` : '<p class="mute">(chưa vẽ đồ thị)</p>')}
  ${sec(8, 'Phép tính', ul(m.calcs.map(esc)))}
  ${sec(9, 'Phân tích sai số và so sánh với lý thuyết', analysis + ul(m.errorNotes.map(esc)))}
  ${sec(10, 'Nhận xét', `<div class="box">${esc(m.observation || '(học sinh chưa viết nhận xét)')}</div>`)}
  ${sec(11, 'Kết luận', `<div class="box">${esc(m.conclusion || '(học sinh chưa viết kết luận)')}</div>${m.officialConclusion ? `<h3>Kết luận đối chiếu của hệ thống</h3><div>${m.officialConclusion}</div>` : ''}`)}
  <div class="sig"><span>Học sinh ký tên</span><span>Giáo viên nhận xét</span></div>
  <footer>Số liệu được sinh bởi mô phỏng vật lý (mô hình: ${esc(m.modeLabel)}; mã phiên ${esc(m.seed)}). Không phải số liệu đo trên thiết bị thật.</footer></body></html>`;
}

export function openPrint(html, filename = 'bao-cao.html') {
  const w = window.open('', '_blank');
  if (!w) { downloadText(filename, html, 'text/html;charset=utf-8'); return false; }
  w.document.open(); w.document.write(html); w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch { /* người dùng tự in */ } }, 400);
  return true;
}
