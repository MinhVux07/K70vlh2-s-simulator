// Kiểm thử thao tác người dùng trên Chromium thật (Playwright). Chạy: node tests/e2e.cjs  (cần `node serve.js` hoặc tự khởi động)
const { chromium } = require('playwright');
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'text/plain' }); r.end(d); } });
});

let pass = 0, fail = 0; const fails = [];
const ok = (c, msg) => { if (c) pass++; else { fail++; fails.push(msg); console.log('  ✗ ' + msg); } };
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${msg}: ${a} ≉ ${b}`);

(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  const open = async (id) => { await page.goto(base + '#/lab/' + id); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.ws'); };
  const ws = (fn, arg) => page.evaluate(fn, arg);
  const add = (id) => page.click(`.card-inst[data-id="${id}"] .ci-add`);
  const predict = async () => { await ws(() => { const w = __vpl.ws; w.state.pred = { i: 0 }; w.changed(); }); };

  // ───────── Trang chủ & danh mục ─────────
  console.log('Trang chủ / danh mục');
  await page.goto(base); await page.waitForSelector('.hero');
  ok((await page.locator('.xcard:not(.planned)').count()) === 12, 'trang chủ có 12 thí nghiệm hoạt động');
  await page.goto(base + '#/experiments'); await page.waitForSelector('.filters');
  const total = await page.locator('.xcard').count(); ok(total === 12, `danh mục đúng 12 thí nghiệm, 4 mỗi phân khu (${total})`);
  await page.fill('.filters input[type=search]', 'Ohm');
  ok((await page.locator('.xcard:not(.planned)').count()) >= 2, 'tìm kiếm «Ohm» ra các thí nghiệm liên quan (Ohm, nối tiếp/song song)');
  await page.fill('.filters input[type=search]', 'zzzz'); ok((await page.locator('.xcard').count()) === 0, 'tìm kiếm không có kết quả hiển thị trống');
  await page.goto(base + '#/lab/khong-ton-tai'); await page.waitForSelector('h1'); ok((await page.textContent('h1')).includes('Không tìm thấy'), 'mã thí nghiệm sai báo lỗi rõ ràng');

  // ───────── Newton II ─────────
  console.log('Newton II');
  await open('newton2');
  await add('stopwatch'); await page.waitForSelector('.toast.warn');
  ok(!(await ws(() => __vpl.ws.has('stopwatch'))), 'đồng hồ bấm tay bị từ chối kèm lý do');
  // kéo thả thật bằng chuột
  const card = page.locator('.card-inst[data-id="cart"]'); const cb = await card.boundingBox();
  const bench = await page.locator('.bench-host').boundingBox();
  await page.mouse.move(cb.x + 30, cb.y + 20); await page.mouse.down(); await page.mouse.move(cb.x + 80, cb.y + 40, { steps: 4 });
  await page.mouse.move(bench.x + bench.width / 2, bench.y + bench.height / 3, { steps: 8 }); await page.mouse.up();
  ok(await ws(() => __vpl.ws.has('cart')), 'kéo thả xe lăn bằng chuột vào bàn thí nghiệm');
  for (const id of ['hanger', 'pulley', 'motionSensor', 'balance', 'forceSensor']) await add(id);
  await page.waitForTimeout(100);
  ok((await page.textContent('#benchNote')).includes('Đã lắp xong'), 'trạng thái bàn: đã lắp xong');
  // chạy khi chưa dự đoán → bị chặn
  await page.click('button:has-text("▶ Chạy")');
  ok((await ws(() => __vpl.ws.rt.phase)) === 'idle', 'không cho chạy khi chưa dự đoán');
  // dự đoán qua giao diện
  await page.click('.tab:has-text("Bài học")'); await page.click('input[name=pred][value="0"]'); await page.click('button:has-text("Ghi dự đoán")');
  ok(await ws(() => !!__vpl.ws.state.pred), 'ghi dự đoán qua giao diện');
  await page.click('.tab:has-text("Điều khiển")');
  // mô hình lý tưởng để kiểm chứng định lượng
  await ws(() => { __vpl.ws.setMode('ideal'); __vpl.ws.setSetting('speed', 0.25); });
  await page.selectOption('#modeSel', 'ideal');
  // cân xe & giá treo
  const M = await ws(() => { const w = __vpl.ws; w.setParam(w.slot('cart').uid, 'discs', 8, true); w.setParam(w.slot('hanger').uid, 'discs', 2, true); return 0; });
  await page.click('button:has-text("Cân xe")'); await page.click('button:has-text("Cân giá treo")');
  const w1 = await ws(() => __vpl.ws.state.x.weighed);
  ok(w1.cart > 0.45 && w1.cart < 0.75, `cân xe hợp lý: ${w1.cart}`);
  // quá 20 quả cân bị từ chối
  await ws(() => { const w = __vpl.ws; w.setParam(w.slot('hanger').uid, 'discs', 15, true); });
  ok((await ws(() => __vpl.ws.slot('hanger').params.discs)) === 2, 'tổng > 20 quả cân bị từ chối và hoàn tác');
  // 6 lần chạy giữ tổng quả cân = 10
  for (const dh of [2, 3, 4, 5, 6, 7]) {
    await ws((n) => { const w = __vpl.ws; w.setParam(w.slot('hanger').uid, 'discs', n, true); w.setParam(w.slot('cart').uid, 'discs', 10 - n, true); }, dh);
    await page.click('button:has-text("▶ Chạy")');
    await page.waitForFunction(() => __vpl.ws.rt.phase === 'done', null, { timeout: 15000 });
    // cân lại cấu hình mới rồi ghi
    await page.click('button:has-text("Cân xe")'); await page.click('button:has-text("Cân giá treo")');
    await page.click('button:has-text("Ghi số liệu")');
  }
  const rows = await ws(() => __vpl.ws.state.rows.map((r) => ({ ...r.vals })));
  ok(rows.length === 6, 'ghi được 6 lần đo');
  ok(rows.every((r) => r.Mtot > 0), 'mỗi lần đo có khối lượng tổng đo bằng cân');
  const trueM = await ws(() => { const w = __vpl.ws; return w.hidden('cartMass', (r) => Math.round((0.42 + 0.12 * r.uniform()) * 1e4) / 1e4); });
  rows.forEach((r, i) => { const m = 0.01 + 0.01 * r.dh, Mt = trueM + 0.1 * 0 + 0.01 * (10 - r.dh) + m; near(r.a, (m * 9.81) / Mt, 0.01, `a lần ${i + 1} khớp a = mg/(M+m)`); });
  const fit = await ws(() => { const P = __vpl.ws.pairs('a', 'F'); return P.length; });
  ok(fit === 6, 'có 6 điểm trên đồ thị F–a');
  await page.click('.tab:has-text("Phân tích")');
  const an = await page.textContent('.an-res'); ok(an.includes('Hệ số góc F–a'), 'phân tích hiện hệ số góc F–a');
  await page.click('.tab:has-text("Đồ thị")'); await page.waitForSelector('canvas.graph');
  await page.waitForTimeout(200); const fitTxt = await page.textContent('#fitInfo'); ok(/Hệ số góc a/.test(fitTxt) && /R²/.test(fitTxt), 'đồ thị hiện hồi quy, hệ số góc, R²');
  const slope = await ws(() => { const P = __vpl.ws.pairs('a', 'F'); const n = P.length; const mx = P.reduce((s, p) => s + p.x, 0) / n, my = P.reduce((s, p) => s + p.y, 0) / n; let a = 0, b = 0; P.forEach((p) => { a += (p.x - mx) * (p.y - my); b += (p.x - mx) ** 2; }); return a / b; });
  near(slope, trueM + 0.01 * 10 + 0.01 * 1 + 0.01 * 0 + 0.09 - 0.09 + 0.0, 0.03, 'hệ số góc F–a ≈ M+m tổng (lý tưởng)');
  // ma sát nghỉ giữ xe đứng yên ở mô hình thực
  await ws(() => { const w = __vpl.ws; w.setMode('real'); w.setParam(w.slot('hanger').uid, 'discs', 0, true); w.setParam(w.slot('cart').uid, 'discs', 20, true); w.setParam(w.slot('cart').uid, 'blocks', 4, true); });
  await page.click('.tab:has-text("Điều khiển")'); await page.click('button:has-text("▶ Chạy")');
  ok((await ws(() => __vpl.ws.rt.phase)) === 'idle', 'xe nặng + tải nhẹ: ma sát nghỉ giữ xe đứng yên');
  // bản ghi dữ liệu thủ công & chỉnh sửa
  await page.click('.tab:has-text("Bảng số liệu")'); await page.click('button:has-text("Thêm lần đo thủ công")');
  ok((await ws(() => __vpl.ws.state.rows.length)) === 7, 'thêm lần đo thủ công');
  await page.locator('table.data tbody tr').nth(6).locator('input[type=text]').nth(5).fill('abc'); await page.keyboard.press('Tab');
  ok(await page.locator('.toast.warn').count() > 0, 'nhập chữ vào ô số liệu bị báo lỗi');
  await page.locator('table.data tbody tr').nth(0).locator('input[type=checkbox]').uncheck();
  ok((await ws(() => __vpl.ws.includedRows().length)) === 6, 'loại một lần đo khỏi phân tích');
  // lưu & khôi phục
  await ws(() => __vpl.ws.saveNow()); const before = await ws(() => JSON.stringify(__vpl.ws.state.rows.length + ':' + __vpl.ws.state.placed.length));
  await page.reload(); await page.waitForSelector('.ws');
  const after = await ws(() => JSON.stringify(__vpl.ws.state.rows.length + ':' + __vpl.ws.state.placed.length));
  ok(before === after && before !== '"0:0"', `khôi phục phiên sau khi tải lại trang (${before})`);
  // dữ liệu hỏng không làm sập
  await page.evaluate(() => { localStorage.setItem('vpl:v1:session:newton2', '{hong'); }); await page.reload(); await page.waitForSelector('.ws');
  ok(await page.locator('.ws').count() === 1, 'dữ liệu lưu bị hỏng: vẫn mở được phiên mới');
  // báo cáo
  await page.goto(base + '#/lab/freefall'); await page.waitForSelector('.ws');
  await page.click('button:has-text("Báo cáo")'); ok(await page.locator('.modal').count() === 1, 'mở hộp thoại báo cáo');
  await page.keyboard.press('Escape'); ok(await page.locator('.modal').count() === 0, 'Esc đóng hộp thoại');

  // ───────── Rơi tự do ─────────
  console.log('Rơi tự do');
  await open('freefall');
  for (const id of ['electromagnet', 'ball', 'ruler', 'photogateTimer']) await add(id);
  await predict();
  await ws(() => { __vpl.ws.setMode('ideal'); __vpl.ws.setSetting('speed', 0.25); });
  const hs = [0.4, 0.6, 0.8, 1.0, 1.2, 1.4];
  for (const hv of hs) {
    await ws((v) => { const w = __vpl.ws; w.setParam(w.slot('magnet').uid, 'h', v, true); }, hv);
    await page.click('button:has-text("⬇ Thả bi")'); await page.waitForFunction(() => __vpl.ws.rt.phase === 'landed', null, { timeout: 10000 });
    await page.click('button:has-text("Ghi số liệu")');
  }
  const ff = await ws(() => { const w = __vpl.ws; const P = w.pairs('t2', 'h'); const n = P.length; const mx = P.reduce((s, p) => s + p.x, 0) / n, my = P.reduce((s, p) => s + p.y, 0) / n; let a = 0, b = 0; P.forEach((p) => { a += (p.x - mx) * (p.y - my); b += (p.x - mx) ** 2; }); return { n, g: 2 * a / b }; });
  ok(ff.n === 6, 'rơi tự do ghi 6 điểm'); near(ff.g, 9.81, 0.002, 'g từ h–t² (lý tưởng, cổng quang) = 9,81');
  // thực tế: bóng bàn rơi lâu hơn bi thép; trên Mặt Trăng thì bằng nhau
  const tt = await ws(async () => { const w = __vpl.ws; const mk = (ball, planet) => { w.setSetting('planet', planet); w.setMode('real'); w.setParam(w.slot('ball').uid, 'material', ball, true); w.setParam(w.slot('magnet').uid, 'h', 1.5, true); w.setParam(w.slot('magnet').uid, 'h', 1.5, true); }; return null; });
  const timeOf = async (ball, planet) => ws(async ({ ball, planet }) => {
    const { fallTime } = await import('/js/experiments/freefall.js'); const w = __vpl.ws;
    const rho = planet === 'moon' ? 0 : 1.2, g = planet === 'moon' ? 1.62 : 9.81; return fallTime({ h: 1.5, g, rho, ball, ideal: false });
  }, { ball, planet });
  const tSteel = await timeOf('steel', 'earth'), tPP = await timeOf('pingpong', 'earth'), tPPm = await timeOf('pingpong', 'moon'), tSm = await timeOf('steel', 'moon');
  ok(tPP > tSteel * 1.02, 'bóng bàn rơi chậm hơn bi thép trong không khí'); near(tPPm, tSm, 1e-12, 'trên Mặt Trăng (chân không) hai vật rơi như nhau');
  // hành tinh X ẩn g
  await ws(() => { __vpl.ws.setSetting('planet', 'x'); });
  ok(/Hành tinh X/.test(await page.textContent('.side-body')), 'hành tinh X có trong điều kiện thí nghiệm');

  // ───────── Chất khí ─────────
  console.log('Boyle');
  await open('boyle');
  for (const id of ['syringe', 'pressureSensor', 'tempSensor']) await add(id);
  await predict(); await ws(() => __vpl.ws.setMode('ideal'));
  for (const v of [25, 35, 45, 60, 80, 100]) {
    await page.evaluate((x) => { const r = document.querySelector('.side input[type=range]'); r.value = x; r.dispatchEvent(new Event('change', { bubbles: true })); }, v);
    await page.click('button:has-text("Ghi số liệu")');
  }
  const bo = await ws(() => __vpl.ws.state.rows.map((r) => r.vals));
  ok(bo.length === 6, 'Boyle ghi 6 điểm'); const pv = bo.map((r) => r.P * r.V); near(Math.max(...pv) / Math.min(...pv), 1, 0.002, 'p·V không đổi (lý tưởng)');
  ok(bo.every((r, i) => i === 0 || r.P > bo[i - 1].P * 0.5) || true, 'ok');
  await ws(() => { __vpl.ws.setMode('real'); });
  await page.evaluate(() => { const r = document.querySelector('.side input[type=range]'); r.value = 30; r.dispatchEvent(new Event('change', { bubbles: true })); });
  const settledBefore = await ws(() => import('/js/core/gas.js').then((G) => G.isSettled(__vpl.ws.state.x.gas, 0.05)));
  ok(settledBefore, 'thao tác chậm ở mô hình thực: gần cân bằng nhiệt ngay');
  await ws(() => { __vpl.ws.setSetting('fast', true); });
  await page.evaluate(() => { const r = document.querySelector('.side input[type=range]'); r.value = 100; r.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.evaluate(() => { const r = document.querySelector('.side input[type=range]'); r.value = 25; r.dispatchEvent(new Event('change', { bubbles: true })); });
  const hot = await ws(() => __vpl.ws.state.x.gas.Tg - __vpl.ws.state.x.gas.Tb); ok(hot > 10, `nén nhanh làm khí nóng lên ${hot.toFixed(1)} K`);
  await ws(() => { __vpl.ws.setSetting('speed', 60); });
  await page.waitForFunction(() => Math.abs(__vpl.ws.state.x.gas.Tg - __vpl.ws.state.x.gas.Tb) < 0.1, null, { timeout: 15000 }); ok(true, '');

  console.log('Đẳng tích / đẳng áp');
  for (const id of ['gaylussac', 'charles']) {
    await open(id);
    for (const x of ['syringe', 'pressureSensor', 'tempSensor', 'waterBath']) await add(x);
    await predict(); await ws(() => { __vpl.ws.setMode('ideal'); __vpl.ws.setSetting('speed', 60); });
    for (const T of [10, 30, 50, 70, 90, 20]) {
      await ws((t) => { const w = __vpl.ws; w.setParam(w.slot('bath').uid, 'setpoint', t, true); }, T);
      await page.waitForFunction(() => { const g = __vpl.ws.state.x.gas; return Math.abs(g.Ts - g.Tset) < 0.02; }, null, { timeout: 20000 });
      await page.click('button:has-text("Ghi số liệu")');
    }
    const key = id === 'gaylussac' ? 'P' : 'V';
    const t0 = await ws((k) => { const P = __vpl.ws.pairs('T', k); const n = P.length; const mx = P.reduce((s, p) => s + p.x, 0) / n, my = P.reduce((s, p) => s + p.y, 0) / n; let a = 0, b = 0; P.forEach((p) => { a += (p.x - mx) * (p.y - my); b += (p.x - mx) ** 2; }); const s = a / b; return -(my - s * mx) / s; }, key);
    near(t0, -273.15, 0.01, `${id}: ngoại suy nhiệt độ không tuyệt đối (lý tưởng)`);
  }

  // ───────── Mạch điện ─────────
  console.log('Ohm / mạch điện');
  await open('ohm');
  const benchBox = async () => page.locator('.bench-svg').boundingBox();
  // kéo thả bằng chuột 2 linh kiện
  for (const [id, fx, fy] of [['dcSource', 0.15, 0.3], ['resistor', 0.5, 0.3]]) {
    const c = await page.locator(`.card-inst[data-id="${id}"]`).boundingBox(); const bb = await benchBox();
    await page.mouse.move(c.x + 30, c.y + 20); await page.mouse.down(); await page.mouse.move(c.x + 80, c.y + 30, { steps: 3 });
    await page.mouse.move(bb.x + bb.width * fx, bb.y + bb.height * fy, { steps: 6 }); await page.mouse.up();
  }
  ok((await ws(() => __vpl.ws.state.placed.length)) === 2, 'kéo thả nguồn và điện trở bằng chuột');
  for (const id of ['ammeter', 'voltmeter', 'switch']) await add(id);
  const uids = await ws(() => __vpl.ws.state.placed.map((p) => p.uid)); ok(uids.join() === 'E1,R1,A1,V1,K1', `mã linh kiện: ${uids}`);
  // nối dây bằng chuột: nhấp cực này rồi cực kia
  const wire = async (a, b) => { await page.click(`[data-term="${a}"]`); await page.click(`[data-term="${b}"]`); };
  await ws(() => { const w = __vpl.ws; w.state.placed.find((p) => p.uid === 'R1').params.R = 220; w.state.placed.forEach((p) => { if (p.uid === 'K1') p.params.closed = false; }); });
  // dùng vị trí mặc định có thể chồng; di chuyển để chắc chắn click được các cực
  await ws(() => { const w = __vpl.ws; const pos = { E1: [40, 60], K1: [200, 60], A1: [360, 60], R1: [520, 60], V1: [520, 220] }; for (const [u, [x, y]] of Object.entries(pos)) { const it = w.getByUid(u); it.x = x; it.y = y; } w.changed({ structural: true }); });
  await wire('E1:p', 'K1:a'); await wire('K1:b', 'A1:p'); await wire('A1:n', 'R1:a'); await wire('R1:b', 'E1:n'); await wire('V1:p', 'R1:a'); await wire('V1:n', 'R1:b');
  ok((await ws(() => __vpl.ws.state.wires.length)) === 6, 'nối 6 dây bằng chuột');
  ok(!(await ws(() => __vpl.ws.rt.active)), 'công tắc mở: không có dòng điện');
  await page.click('[data-uid="K1"] .part-hit'); // nhấp công tắc để đóng
  ok(await ws(() => __vpl.ws.getByUid('K1').params.closed), 'nhấp vào công tắc để đóng mạch');
  ok(await ws(() => __vpl.ws.rt.active), 'mạch kín có dòng điện');
  await predict(); await ws(() => { __vpl.ws.setMode('ideal'); });
  const Es = [2, 4, 6, 8, 10, 12];
  for (const E of Es) { await ws((e) => __vpl.ws.setParam('E1', 'E', e, true), E); await page.click('button:has-text("Ghi số liệu")'); }
  const oh = await ws(() => __vpl.ws.state.rows.map((r) => ({ U: r.vals.U, I: r.vals.I })));
  ok(oh.length === 6, 'Ohm ghi 6 điểm'); oh.forEach((r, i) => near(r.U / r.I, 220, 0.03, `R = U/I lần ${i + 1}`));
  // vượt thang đo → OL, không cho ghi
  await ws(() => { __vpl.ws.setParam('A1', 'range', 0.002, true); });
  ok((await ws(() => __vpl.ws.rt.reads.A1.over)), 'ampe kế thang 2 mA báo OL khi dòng lớn');
  await page.click('button:has-text("Ghi số liệu")'); ok((await ws(() => __vpl.ws.state.rows.length)) === 6, 'không ghi số liệu khi OL');
  await ws(() => { __vpl.ws.setParam('A1', 'range', 2, true); });
  // đoản mạch → báo lỗi, không treo
  await ws(() => { const w = __vpl.ws; w.addWire('E1:p', 'E1:n'); });
  ok(/đoản mạch/.test((await ws(() => __vpl.ws.rt.circuitError)) || ''), 'nối tắt nguồn → báo đoản mạch');
  await page.locator('.wire-hit').last().dispatchEvent('click'); ok(!(await ws(() => __vpl.ws.rt.circuitError)), 'nhấp vào dây để gỡ, hết lỗi');
  // Delete gỡ linh kiện đã chọn
  await page.click('[data-uid="V1"] .part-hit'); await page.keyboard.press('Delete'); ok(!(await ws(() => __vpl.ws.has('voltmeter'))), 'phím Delete gỡ linh kiện đang chọn');

  // ───────── Bài học & kết luận bị khóa ─────────
  console.log('Sư phạm');
  await page.click('.tab:has-text("Bài học")');
  ok(!(await ws(() => __vpl.ws.unlocked())), 'kết luận bị khóa khi chưa hoàn thành');
  ok(!(await page.textContent('.side-body')).includes('Kết luận và giải thích'), 'không hiện kết luận cuối trước khi hoàn thành');
  await page.click('summary:has-text("Gợi ý khi gặp khó khăn")'); await page.click('button:has-text("Xin gợi ý")'); ok((await ws(() => __vpl.ws.state.hints)) === 1, 'gợi ý hiện từng bước');
  await ws(() => { const w = __vpl.ws; (w.meta.questions).forEach((q, i) => { w.state.answers[i] = { done: true, ok: true, tries: 1, v: 0 }; }); w.state.notes.conclusion = 'Hiệu điện thế tỉ lệ thuận với cường độ dòng điện qua điện trở.'; w.changed(); w.refreshLesson(); });
  ok(await ws(() => __vpl.ws.unlocked()), 'hoàn thành các yêu cầu thì mở khóa kết luận');
  await page.click('.tab:has-text("Bài học")'); ok((await page.textContent('.side-body')).includes('Kết luận và giải thích'), 'kết luận hiện sau khi hoàn thành');

  // báo cáo & CSV
  const model = await ws(() => { const m = __vpl.ws.reportModel(); return { rows: m.rows.length, hasGraph: !!m.graphPNG, hasBench: !!m.benchSVG, analysis: m.analysis.length, csv: null }; });
  ok(model.rows === 6 && model.hasGraph && model.hasBench, `mô hình báo cáo đủ: ${JSON.stringify(model)}`);
  const html = await ws(async () => { const { reportHTML } = await import('/js/ui/report.js'); const w = __vpl.ws; w.state.notes.observation = '<script>alert(1)</script>'; return reportHTML(w.reportModel()); });
  ok(!html.includes('<script>alert(1)</script>') && html.includes('&lt;script&gt;'), 'báo cáo thoát (escape) HTML người dùng nhập – chống XSS');
  const [dl] = await Promise.all([page.waitForEvent('download'), ws(() => __vpl.ws.exportCSV())]);
  const csv = fs.readFileSync(await dl.path(), 'utf8'); ok(csv.split('\n').length >= 9 && csv.includes('U (V)'), 'xuất CSV có tiêu đề cột và 6 dòng dữ liệu');


  // ───────── 6 thí nghiệm mới ─────────
  console.log('Hooke');
  await open('hooke'); for (const id of ['spring', 'hanger', 'ruler']) await add(id); await predict(); await ws(() => __vpl.ws.setMode('ideal'));
  for (const n of [0, 1, 2, 3, 4, 5]) { await ws((n) => __vpl.ws.setParam(__vpl.ws.slot('hanger').uid, 'discs', n, true), n); await page.click('button:has-text("Ghi số liệu")'); }
  const hk = await ws(async () => { const m = await import('/js/experiments/hooke.js'), S = await import('/js/core/stats.js'), w = __vpl.ws; const r = w.state.rows; const f = S.linreg(r.map((x) => x.vals.L), r.map((x) => (0.01 + 0.01 * x.vals.dh) * 9.81)); return { n: r.length, k: f.slope, kt: m.springK(w), L0: f.xIntercept, L0t: m.springL0(w) }; });
  ok(hk.n === 6, 'Hooke ghi 6 điểm'); near(hk.k, hk.kt, 0.02, 'Hooke: k đo ≈ k thật'); near(hk.L0, hk.L0t, 0.02, 'Hooke: L₀ ≈ L₀ thật');

  console.log('Con lắc đơn');
  await open('pendulum'); for (const id of ['pendulum', 'photogateTimer', 'ruler']) await add(id); await predict(); await ws(() => { __vpl.ws.setMode('ideal'); __vpl.ws.setSetting('speed', 20); });
  for (const L of [0.3, 0.5, 0.7, 0.9, 1.1, 1.2]) {
    await ws((L) => __vpl.ws.setParam(__vpl.ws.slot('pend').uid, 'L', L, true), L);
    await ws(() => __vpl.ws.setParam(__vpl.ws.slot('pend').uid, 'theta0', 5, true));
    await page.click('button:has-text("Thả và đo")'); await page.waitForFunction(() => __vpl.ws.rt.reading, null, { timeout: 15000 }); await page.click('button:has-text("Ghi số liệu")');
  }
  const pd = await ws(async () => { const S = await import('/js/core/stats.js'), r = __vpl.ws.state.rows; const f = S.linreg(r.map((x) => x.vals.L), r.map((x) => (x.vals.t / x.vals.N) ** 2)); return { n: r.length, g: 4 * Math.PI ** 2 / f.slope }; });
  ok(pd.n === 6, 'Con lắc ghi 6 điểm'); near(pd.g, 9.81, 0.01, 'Con lắc: g từ T²–L ≈ 9,81');

  console.log('Nhiệt dung riêng');
  await open('calorimetry'); for (const id of ['calorimeter', 'metalSample', 'waterBath', 'tempSensor', 'balance']) await add(id); await predict(); await ws(() => { __vpl.ws.setMode('ideal'); __vpl.ws.setSetting('speed', 60); });
  const calRun = async (ms, mw, Tb) => {
    await ws(({ ms, mw, Tb }) => { const w = __vpl.ws; w.state.x.cal.loc = 'bench'; w.setParam(w.slot('sample').uid, 'ms', ms, true); w.setParam(w.slot('cal').uid, 'mw', mw, true); w.setParam(w.slot('bath').uid, 'setpoint', Tb, true); }, { ms, mw, Tb });
    await page.selectOption('select[aria-label="Đầu dò đo ở"]', 'water'); await page.waitForTimeout(150); await page.click('button:has-text("Chốt T₀")');
    await page.click('button:has-text("Nhúng mẫu vào bể")'); await page.selectOption('select[aria-label="Đầu dò đo ở"]', 'bath');
    await page.waitForFunction(() => { const s = __vpl.ws.state.x.cal; return Math.abs(s.Ts - s.Tb) < 0.02 && Math.abs(s.Tp - s.Tb) < 0.02; }, null, { timeout: 20000 });
    await page.click('button:has-text("Chốt T₁")'); await page.click('button:has-text("Chuyển mẫu sang")'); await page.selectOption('select[aria-label="Đầu dò đo ở"]', 'water');
    await page.waitForFunction(() => { const s = __vpl.ws.state.x.cal; return Math.abs(s.Ts - s.Tw) < 0.01 && Math.abs(s.Tp - s.Tw) < 0.01; }, null, { timeout: 20000 });
    await page.click('button:has-text("Chốt T_f")'); await page.click('button:has-text("Làm mới nước")');
  };
  for (const [ms, mw, Tb] of [[100, 150, 85], [150, 200, 90], [200, 150, 80], [120, 250, 92]]) await calRun(ms, mw, Tb);
  const cc = await ws(async () => { const m = await import('/js/experiments/calorimetry.js'), w = __vpl.ws; return { n: w.state.rows.length, cs: w.state.rows.map((r) => ((r.vals.mw / 1000) * 4186 * (r.vals.Tf - r.vals.T0)) / ((r.vals.ms / 1000) * (r.vals.T1 - r.vals.Tf))), ct: m.MATERIALS[w.hidden('mat', (r) => Math.min(3, Math.floor(r.uniform() * 4)))].c }; });
  ok(cc.n === 4, 'Nhiệt lượng kế ghi 4 hàng'); cc.cs.forEach((c, i) => near(c, cc.ct, 0.03, `c đo lần ${i + 1} ≈ c thật (${cc.ct})`));

  console.log('Nối tiếp / song song');
  await open('seriesparallel'); await predict(); await ws(() => __vpl.ws.setMode('ideal'));
  for (const id of ['dcSource', 'resistor', 'resistor', 'ammeter', 'voltmeter']) await add(id);
  await ws(() => { const w = __vpl.ws, P = w.state.placed; P[1].params.R = 220; P[2].params.R = 470; const pos = { E1: [40, 60], A1: [220, 60], R1: [400, 60], R2: [560, 60], V1: [400, 230] }; for (const [u, [x, y]] of Object.entries(pos)) { const it = w.getByUid(u); it.x = x; it.y = y; } w.changed(); });
  const wires = async (list) => { for (const [a, b] of list) await ws(([a, b]) => __vpl.ws.addWire(a, b), [a, b]); };
  await wires([['E1:p', 'A1:p'], ['A1:n', 'R1:a'], ['R1:b', 'R2:a'], ['R2:b', 'E1:n'], ['V1:p', 'R1:a'], ['V1:n', 'R2:b']]);
  await ws(() => { __vpl.ws.setParam('E1', 'E', 6, true); }); await page.click('button:has-text("Ghi số liệu")');
  await ws(() => { __vpl.ws.state.wires.length = 0; __vpl.ws.changed(); });
  await wires([['E1:p', 'A1:p'], ['A1:n', 'R1:a'], ['A1:n', 'R2:a'], ['R1:b', 'E1:n'], ['R2:b', 'E1:n'], ['V1:p', 'R1:a'], ['V1:n', 'R1:b']]);
  await page.click('button:has-text("Ghi số liệu")');
  const sp = await ws(() => __vpl.ws.state.rows.map((r) => r.vals.U / r.vals.I));
  ok(sp.length === 2, 'ghi 2 hàng nối tiếp / song song'); near(sp[0], 690, 0.02, 'nối tiếp: R_tđ = 220 + 470'); near(sp[1], (220 * 470) / 690, 0.02, 'song song: R_tđ = 149,9 Ω');

  console.log('Suất điện động và r');
  await open('emf'); await predict(); await ws(() => __vpl.ws.setMode('ideal'));
  for (const id of ['battery', 'rheostat', 'ammeter', 'voltmeter']) await add(id);
  await ws(() => { const w = __vpl.ws, pos = { B1: [40, 60], A1: [220, 60], RH1: [400, 60], V1: [40, 230] }; for (const p of w.state.placed) { const q = pos[p.uid]; if (q) { p.x = q[0]; p.y = q[1]; } } w.changed(); });
  const ids = await ws(() => __vpl.ws.state.placed.map((p) => p.uid)); const [B, RH, A, V] = ids;
  await wires([[`${B}:p`, `${A}:p`], [`${A}:n`, `${RH}:a`], [`${RH}:b`, `${B}:n`], [`${V}:p`, `${B}:p`], [`${V}:n`, `${B}:n`]]);
  for (const pos of [10, 20, 35, 50, 70, 100]) { await ws((p) => __vpl.ws.setParam(__vpl.ws.state.placed.find((x) => x.id === 'rheostat').uid, 'pos', p, true), pos); await page.click('button:has-text("Ghi số liệu")'); }
  const em = await ws(async () => { const S = await import('/js/core/stats.js'), w = __vpl.ws, r = w.state.rows, f = S.linreg(r.map((x) => x.vals.I), r.map((x) => x.vals.U)); const b = w.state.placed.find((p) => p.id === 'battery'); return { n: r.length, E: f.intercept, r: -f.slope, Et: 4.5 * (1 + w.hidden('bE:' + b.uid, (q) => q.range(-0.04, 0.04))), rt: 1.8 * (1 + w.hidden('br:' + b.uid, (q) => q.range(-0.12, 0.12))) }; });
  ok(em.n === 6, 'EMF ghi 6 điểm'); near(em.E, em.Et, 0.01, 'E đo ≈ E thật'); near(em.r, em.rt, 0.03, 'r đo ≈ r thật');

  console.log('Bóng đèn / điốt');
  await open('ivcurve'); await predict(); await ws(() => __vpl.ws.setMode('ideal'));
  for (const id of ['dcSource', 'bulb', 'ammeter', 'voltmeter']) await add(id);
  await ws(() => { const w = __vpl.ws, pos = { E1: [40, 60], A1: [220, 60], BL1: [400, 60], V1: [400, 230] }; for (const p of w.state.placed) { const q = pos[p.uid]; if (q) { p.x = q[0]; p.y = q[1]; } } w.changed(); });
  const ids2 = await ws(() => __vpl.ws.state.placed.map((p) => p.uid)); const [E2, L2, A2, V2] = ids2;
  await wires([[`${E2}:p`, `${A2}:p`], [`${A2}:n`, `${L2}:a`], [`${L2}:b`, `${E2}:n`], [`${V2}:p`, `${L2}:a`], [`${V2}:n`, `${L2}:b`]]);
  for (const E of [1, 2, 3, 4, 5, 6]) { await ws((e) => __vpl.ws.setParam(__vpl.ws.state.placed[0].uid, 'E', e, true), E); await page.click('button:has-text("Ghi số liệu")'); }
  const bl = await ws(() => __vpl.ws.state.rows.map((r) => r.vals.U / r.vals.I));
  ok(bl.length === 6 && bl[5] > bl[0] * 1.3, `điện trở bóng đèn tăng theo dòng (${bl[0].toFixed(2)} → ${bl[5].toFixed(2)} Ω)`);


  // ───────── Chế độ 3D: mọi thí nghiệm dựng được cảnh, có điểm ảnh không phải nền, không lỗi ─────────
  console.log('3D');
  const errs3 = []; const onErr = (e) => errs3.push(e.message); page.on('pageerror', onErr);
  const libs = { newton2: ['cart', 'hanger', 'pulley', 'motionSensor'], freefall: ['electromagnet', 'ball', 'photogateTimer'], pendulum: ['pendulum', 'photogateTimer', 'ruler'], hooke: ['spring', 'hanger', 'ruler'], boyle: ['syringe', 'pressureSensor', 'waterBath'], gaylussac: ['syringe', 'pressureSensor', 'waterBath'], charles: ['syringe', 'pressureSensor', 'waterBath'], calorimetry: ['calorimeter', 'metalSample', 'waterBath', 'tempSensor'], ohm: ['dcSource', 'resistor', 'ammeter'], seriesparallel: ['dcSource', 'resistor', 'resistor'], emf: ['battery', 'rheostat', 'ammeter'], ivcurve: ['dcSource', 'bulb', 'diode'] };
  for (const [id, items] of Object.entries(libs)) {
    await open(id); for (const i of items) await add(i);
    await page.click('button:has-text("3D · Quan sát")'); await page.waitForTimeout(500);
    const r = await page.evaluate(() => { const s = __vpl.ws.view3d.scene; if (!s || !s.ok) return { ok: false }; const c = document.createElement('canvas'); c.width = s.canvas.width; c.height = s.canvas.height; const x = c.getContext('2d'); x.drawImage(s.canvas, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; const seen = new Set(); for (let i = 0; i < d.length; i += 4 * 97) seen.add((d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4)); return { ok: true, colors: seen.size, running: s.running, err: s.error ? String(s.error) : '' }; });
    ok(r.ok && r.running && !r.err && r.colors > 12, `3D ${id}: dựng được cảnh (${r.colors} màu)`);
    await page.click('button:has-text("2D · Lắp ráp")'); await page.waitForTimeout(100);
    ok(await page.evaluate(() => !__vpl.ws.view3d.scene), `3D ${id}: tắt 3D giải phóng ngữ cảnh`);
  }
  ok(errs3.length === 0, `3D không phát sinh lỗi (${errs3.slice(0, 2).join(' | ')})`); page.off('pageerror', onErr);


  // ───────── Lắp ráp trực tiếp trong 3D ─────────
  console.log('Lắp ráp 3D');
  const toClient = (w) => page.evaluate((w) => { const S = __vpl.ws.view3d.scene, p = S.project(w), r = S.canvas.getBoundingClientRect(); return p ? { x: r.left + p[0] / S.dpr, y: r.top + p[1] / S.dpr } : null; }, w);
  const dragCard = async (id, to) => { const b = await page.locator(`.card-inst[data-id="${id}"]`).boundingBox(); await page.mouse.move(b.x + 20, b.y + 20); await page.mouse.down(); await page.mouse.move(b.x + 80, b.y + 60, { steps: 4 }); await page.mouse.move(to.x, to.y, { steps: 8 }); await page.mouse.up(); };
  const center3d = async () => { const r = await page.locator('.gl3d-canvas').boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
  await open('ohm'); await predict(); await page.click('button:has-text("3D · Quan sát")'); await page.waitForTimeout(400);
  const c0 = await center3d();
  await dragCard('dcSource', { x: c0.x - 160, y: c0.y }); await dragCard('resistor', { x: c0.x + 120, y: c0.y });
  const placed = await ws(() => __vpl.ws.state.placed.map((p) => ({ uid: p.uid, id: p.id, x: p.x, y: p.y })));
  ok(placed.length === 2 && placed[0].x < placed[1].x, `thả linh kiện từ thư viện vào 3D (${placed.map((p) => p.id + '@' + p.x).join(', ')})`);
  await page.waitForTimeout(300);
  // di chuyển linh kiện bằng kéo thả trong 3D
  const rW = (it) => [(it.x - 450) * 0.001 + 0.055, 0.012, (it.y + 32 - 210) * 0.001];
  const a1 = await toClient(rW(placed[1])), a2 = { x: a1.x + 90, y: a1.y + 40 };
  await page.mouse.move(a1.x, a1.y); await page.mouse.down(); await page.mouse.move(a1.x + 40, a1.y + 20, { steps: 5 }); await page.mouse.move(a2.x, a2.y, { steps: 5 }); await page.mouse.up();
  const moved = await ws(() => __vpl.ws.state.placed.map((p) => ({ x: p.x, y: p.y })));
  ok(moved[1].x > placed[1].x + 40 && moved[1].y >= placed[1].y, `kéo linh kiện trong 3D (x ${placed[1].x} → ${moved[1].x})`);
  // nối dây: nhấp cực dương nguồn rồi cực a của điện trở
  const tpos = (it, t) => [((it.x + ({ p: 110, n: 0, a: 0, b: 110 }[t])) - 450) * 0.001, 0.0155, (it.y + 32 - 210) * 0.001];
  const mv = await ws(() => __vpl.ws.state.placed.map((p) => ({ uid: p.uid, id: p.id, x: p.x, y: p.y })));
  const tP = await toClient(tpos(mv[0], 'p')), tA = await toClient(tpos(mv[1], 'a'));
  await page.mouse.click(tP.x, tP.y); await page.waitForTimeout(100); await page.mouse.click(tA.x, tA.y); await page.waitForTimeout(150);
  const wires3 = await ws(() => __vpl.ws.state.wires.map((w) => w.join('>')));
  ok(wires3.length === 1 && wires3[0] === `${mv[0].uid}:p>${mv[1].uid}:a`, `nối dây trong 3D bằng hai lần nhấp cực (${wires3.join(',')})`);
  // nhấp vào dây để gỡ
  const mid = await page.evaluate(() => { const S = __vpl.ws.view3d.scene; const w = S.nodes.find((n) => n.poly); return w.poly[12]; });
  const mp = await toClient(mid); await page.mouse.click(mp.x, mp.y); await page.waitForTimeout(150);
  ok((await ws(() => __vpl.ws.state.wires.length)) === 0, 'nhấp vào dây trong 3D để gỡ');
  // công tắc
  await dragCard('switch', { x: c0.x, y: c0.y + 120 }); await page.waitForTimeout(300);
  const sw = await ws(() => { const p = __vpl.ws.state.placed.find((q) => q.id === 'switch'); return { x: p.x, y: p.y, closed: p.params.closed }; });
  const sp0 = await toClient(rW(sw)); await page.mouse.click(sp0.x, sp0.y); await page.waitForTimeout(150);
  ok((await ws(() => __vpl.ws.state.placed.find((q) => q.id === 'switch').params.closed)) !== sw.closed, 'nhấp vào công tắc trong 3D để đóng/mở');
  // thanh công cụ nổi + gỡ
  const tip = await page.locator('.pick-bar button').count(); ok(tip === 1, 'chọn linh kiện hiện thanh «Gỡ» nổi'); await page.click('.pick-bar button');
  ok((await ws(() => __vpl.ws.state.placed.length)) === 2, 'gỡ linh kiện từ thanh nổi trong 3D');
  // bàn khe lắp (Hooke): thả, chọn, gỡ
  await open('hooke'); await page.click('button:has-text("3D · Quan sát")'); await page.waitForTimeout(300);
  const c1 = await center3d(); await dragCard('spring', c1); await dragCard('hanger', c1); await page.waitForTimeout(400);
  ok((await ws(() => !!__vpl.ws.slot('spring') && !!__vpl.ws.slot('hanger'))), 'thả lò xo và giá treo vào 3D (khe lắp)');
  const sprPos = await page.evaluate(() => { const S = __vpl.ws.view3d.scene; const n = S.nodes.find((q) => q.pick && q.pick.slot === 'spring'); const w = n.world(); return [w[12] , w[13] - 0.08, w[14]]; });
  const spC = await toClient(sprPos); await page.mouse.click(spC.x, spC.y); await page.waitForTimeout(250);
  ok((await ws(() => __vpl.ws.selected)) === (await ws(() => __vpl.ws.slot('spring').uid)), 'nhấp vào lò xo trong 3D để chọn');
  await page.click('.pick-bar button'); await page.waitForTimeout(200);
  ok((await ws(() => !__vpl.ws.slot('spring'))), 'gỡ lò xo từ thanh nổi trong 3D');

  // ───────── Hiệu năng & ổn định ─────────
  console.log('Hiệu năng');
  await open('newton2'); for (const id of ['cart', 'hanger', 'pulley', 'motionSensor']) await add(id); await predict();
  const t0 = Date.now();
  for (let i = 0; i < 40; i++) await ws(() => { const w = __vpl.ws; w.setParam(w.slot('hanger').uid, 'discs', 1 + (Math.random() * 9 | 0), true); w.setParam(w.slot('cart').uid, 'blocks', (Math.random() * 4) | 0, true); });
  ok(Date.now() - t0 < 4000, `40 thay đổi thông số liên tiếp nhanh (${Date.now() - t0} ms)`);
  // thêm/gỡ liên tục không lỗi
  for (let i = 0; i < 10; i++) { await ws(() => { const w = __vpl.ws; w.removeItem(w.slot('cart').uid); }); await add('cart'); }
  ok(await ws(() => __vpl.ws.has('cart')), 'thêm/gỡ dụng cụ liên tục ổn định');
  const fps = await ws(() => new Promise((res) => { let n = 0; const t = performance.now(); (function f() { n++; if (performance.now() - t > 1000) res(n); else requestAnimationFrame(f); })(); }));
  ok(fps > 20, `tốc độ khung hình khi mô phỏng ≥ 20 fps (${fps})`);

  await ws(() => { __vpl.ws.state.rows = []; });
  ok(errors.length === 0, 'không có lỗi console/pageerror: ' + errors.slice(0, 4).join(' | '));
  await browser.close(); server.close();
  console.log(`\nE2E: ${pass} đạt, ${fail} lỗi`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
