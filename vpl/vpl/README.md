# Virtual Physics Laboratory – Phòng thí nghiệm vật lý ảo

Phòng thí nghiệm vật lý tương tác chạy hoàn toàn trên trình duyệt (HTML + JavaScript ES modules, **không cần cài gói, không cần bước build**).
Học sinh tự chọn dụng cụ, tự lắp bàn thí nghiệm, tự đo, tự xử lý số liệu và viết báo cáo; mọi số liệu đều sinh từ mô hình vật lý.

## Chạy

```bash
cd vpl
node serve.js          # http://localhost:8080   (đổi cổng: node serve.js 9000)
```
Cần Node.js ≥ 18 (chỉ để chạy máy chủ tĩnh; có thể dùng bất kỳ máy chủ tĩnh nào khác). Mở trực tiếp `index.html` bằng `file://` **không** chạy được vì trình duyệt chặn ES modules.

## Kiểm thử

```bash
npm test               # 51 kiểm thử đơn vị/tích hợp: thống kê, vật lý, khí, bộ giải mạch, dụng cụ, lưu trữ, báo cáo, hiệu năng
npm run test:e2e       # kiểm thử thao tác người dùng trên Chromium thật (Playwright; cần có sẵn gói `playwright`)
```

## Cấu trúc

```
js/core/         lõi khoa học, không phụ thuộc giao diện (kiểm thử được bằng Node)
  stats.js         trung bình, độ lệch chuẩn, hồi quy tuyến tính, khớp parabol, độ không đảm bảo đo (loại A/B), chữ số có nghĩa
  physics.js       RK4, xe–ròng rọc–vật treo (ma sát, quán tính ròng rọc), rơi tự do có lực cản v², đạo hàm số
  gas.js           khí lý tưởng, cân bằng nhiệt có trễ, nén đoạn nhiệt, thể tích chết
  circuit.js       bộ giải mạch DC (MNA + Newton–Raphson): điện trở, nguồn có r trong, bóng đèn tungsten, điốt Shockley
  instruments.js   thư viện dụng cụ: thông số, giới hạn đo, độ chia, độ phân giải, sai số, mô hình đọc số
  store.js         lưu/khôi phục phiên (localStorage, có kiểm tra schema và dữ liệu hỏng)
js/ui/           workspace, bàn thí nghiệm (khe lắp / mạch tự do), đồ thị canvas, panel số liệu–phân tích, báo cáo
js/experiments/  mỗi thí nghiệm là một module riêng, dùng chung nền tảng
js/registry.js   danh mục (thêm thí nghiệm = thêm 1 file + 1 dòng)
```

### Thêm một thí nghiệm
Tạo `js/experiments/<ten>.js` xuất một đối tượng gồm `meta` (mục tiêu, lý thuyết, dự đoán, câu hỏi, gợi ý, kết luận), `columns`, `graphs`, `library`, `slots` (hoặc `kind: 'circuit'`), `draw`, `controls`, `analyze`… rồi đăng ký trong `registry.js`. Xem `newton2.js` (bàn kiểu khe lắp) và `ohm.js` (mạch tự do) làm mẫu.

## Ba mô hình
- **Lý tưởng**: bỏ ma sát, lực cản, trễ nhiệt, điện trở trong; dụng cụ đo hoàn hảo.
- **Thực tế**: ma sát và quán tính ròng rọc, lực cản không khí, thể tích chết, điện trở trong nguồn và dụng cụ, dung sai điện trở ±5 %, độ phân giải hữu hạn.
- **Thực tế + nhiễu đo**: thêm sai số hệ thống riêng của từng dụng cụ (cố định theo phiên) và nhiễu ngẫu nhiên σ = 0,4·Δ (Δ là sai số thiết bị công bố); nam châm điện nhả chậm; thời gian phản xạ khi bấm tay.

## Tình trạng

**Đã hoàn thành (chạy được, có kiểm thử)**
- Trang chủ, danh mục (tìm kiếm, lọc theo phân khu/chủ đề/mức độ/trạng thái), tiến độ học tập.
- Experiment Workspace: thư viện dụng cụ kéo thả (chuột và cảm ứng) hoặc nhấn «+», thẻ thông số từng dụng cụ, bàn thí nghiệm, bảng thông số, thu gọn các khu vực, nhật ký, lưu/khôi phục phiên.
- **Chế độ 3D** (nút «3D · Quan sát» trên bàn thí nghiệm): bộ máy WebGL tự viết (`js/ui/gl3d.js`, không cần thư viện) với ánh sáng, kim loại phản chiếu, kính/nước trong suốt, bóng đổ, camera xoay bằng chuột; cảnh 3D của từng thí nghiệm nằm ở `js/ui/scenes/` và chạy theo trạng thái mô phỏng thật. Có thể lắp ráp ngay trong 3D: kéo dụng cụ từ thư viện thả vào cảnh, nhấp để chọn/gỡ; ở mạch điện còn kéo linh kiện để di chuyển, nhấp hai cực để nối dây, nhấp dây để gỡ, nhấp công tắc để đóng/mở (dùng chung trạng thái với bàn 2D, nên hai chế độ luôn khớp nhau).
- **12 thí nghiệm, 4 mỗi phân khu** (chọn những bài trọng tâm, được hỏi nhiều nhất):
  - Cơ học: Định luật II Newton · Rơi tự do (xác định g) · Con lắc đơn (T²–L, ảnh hưởng biên độ) · Lực đàn hồi – định luật Hooke.
  - Nhiệt học: Boyle–Mariotte (đẳng nhiệt) · Gay-Lussac (đẳng tích) · Charles (đẳng áp) · Nhiệt dung riêng và cân bằng nhiệt (nhận diện kim loại ẩn).
  - Điện: Định luật Ohm · Mắc điện trở nối tiếp/song song · Suất điện động và điện trở trong của pin · Đặc tuyến V–A của bóng đèn và điốt.
- Quy trình sư phạm: mục tiêu → câu hỏi → kiến thức nền → dự đoán → dụng cụ → quy trình → số liệu → phân tích → câu hỏi thảo luận (có kiểm tra) → gợi ý từng bước → kết luận **khóa** cho đến khi hoàn thành.
- Bảng số liệu (tự động/thủ công, sửa, loại điểm, xóa), đồ thị (chọn trục, log, phóng/thu, kéo, tọa độ, hồi quy, hệ số góc, r, R², giao điểm trục), thống kê đo lặp (u_A, u_B, U), so sánh thực nghiệm–lý thuyết, báo cáo HTML/PDF (qua hộp thoại in) và CSV.

**Còn thiếu (chưa làm)**
- Phạm vi chủ đích thu hẹp còn 12 thí nghiệm. Chưa có: ném xiên, mặt phẳng nghiêng/ma sát, va chạm, sóng, quay; cảm ứng điện từ, tụ điện, mạch RLC (Từ học nói riêng chưa có bài nào).
- Dụng cụ chưa có: thước kẹp, panme, ôm kế/đồng hồ vạn năng, máy hiện sóng, máy phát tín hiệu, galvanometer, cảm biến từ trường, cuộn dây, nam châm, ổ cân hơi…; chưa có mô phỏng 3D (Three.js) và giải mạch xoay chiều.
- Tạo PDF dựa vào hộp thoại in của trình duyệt (chưa sinh PDF trực tiếp).
- Chưa kiểm thử trên Safari/Firefox (chỉ Chromium) và chưa kiểm thử trên thiết bị cảm ứng thật.
