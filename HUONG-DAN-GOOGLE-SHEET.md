# Hướng dẫn lưu người chơi & bảng xếp hạng vào Google Sheet

Minigame `minigame.glucankid.vn` sẽ gửi dữ liệu về một Google Sheet thông qua **Google Apps Script** (miễn phí, không cần server riêng).

Khi cài xong:

- Mỗi lượt **đăng ký** thêm một dòng vào tab `Contact_Info`: họ tên, SĐT, độ tuổi của bé, thời gian đăng ký.
- Mỗi lượt **về đích** cập nhật vào dòng đó: điểm game (số câu đúng), thời gian chơi, chi tiết từng câu.
- Tab `Point` tự xếp hạng những người đã về đích.
- **Bảng xếp hạng** trong game lấy dữ liệu thật từ Sheet, người chơi nào cũng thấy cùng một bảng (top 10, SĐT được che dạng `098***4321`).
- Luật lượt chơi được kiểm tra trên Sheet: **mỗi SĐT chỉ được về đích 1 lần**. Đã về đích thì đổi máy hay đổi trình duyệt cũng không chơi lại được. Người đăng ký mà **chưa về đích** (đóng tab giữa chừng, hết pin, đổi máy…) thì được đăng ký lại và chơi lại từ đầu, vẫn dùng dòng cũ trong Sheet.

---

## Bước 1 — Tạo Google Sheet và dán script

1. Mở Google Sheet dữ liệu của chương trình. Sheet phải có tab `Contact_Info` (STT · User-name · SĐT · Độ tuổi con(Chọn) · Điểm game · Thời gian chơi) và tab `Point`. Nếu chưa có, `setup` sẽ tự tạo.
2. Vào **Tệp → Cài đặt** (File → Settings), đặt **Múi giờ** là `(GMT+07:00) Bangkok, Hà Nội, Jakarta`, rồi bấm Lưu.
3. Ngay trong Sheet đó, vào **Tiện ích mở rộng → Apps Script** (Extensions → Apps Script). Phải mở từ trong Sheet. Nếu tạo project ở script.google.com, script sẽ không gắn với Sheet nào.
4. Xoá hết nội dung có sẵn trong file `Code.gs`, dán toàn bộ nội dung file [`google-apps-script/Code.gs`](google-apps-script/Code.gs) trong repo này vào, rồi bấm 💾 **Lưu**.

## Bước 2 — Chạy `setup` để tạo các tab

1. Trên thanh công cụ Apps Script, chọn hàm **`setup`** ở ô danh sách hàm, rồi bấm **▶ Chạy** (Run).
2. Lần đầu Google sẽ hỏi quyền:
   - Bấm **Xem xét quyền** (Review permissions) và chọn tài khoản.
   - Nếu thấy cảnh báo *"Google chưa xác minh ứng dụng này"*: bấm **Nâng cao** (Advanced), sau đó **Đi tới … (không an toàn)**. Đây là script của chính bạn nên không sao.
   - Bấm **Cho phép** (Allow).
3. Quay lại Sheet kiểm tra:

| Tab | Nội dung |
|---|---|
| `Contact_Info` | Cột **A–F giữ nguyên** như cũ: STT · User-name · SĐT · Độ tuổi con(Chọn) · Điểm game (số câu đúng) · Thời gian chơi (giây). Script **thêm các cột phụ G–K**: Thời gian đăng ký · Thời gian hoàn thành · Chi tiết đáp án · Tổng số câu · Mã phiên. Cột K "Mã phiên" bị ẩn, **không sửa, không xoá, không đổi thứ tự cột**. Dòng nào có "Điểm game" và "Thời gian hoàn thành" để trống là người đó đã đăng ký nhưng chưa về đích. |
| `Point` | Bảng xếp hạng tự động, cùng cột với bảng xếp hạng trong game: **Hạng · Nhà leo núi · SĐT · Điểm** (dạng `5/6`) **· Thời gian** (dạng `00:45`). Tab này liệt kê **tất cả** người đã về đích, còn trong game chỉ hiện top 10 và SĐT được che. Nhiều câu đúng hơn đứng trước, cùng điểm thì ai chơi nhanh hơn đứng trước. Tab này tự cập nhật, không cần sửa tay. Nếu tab đang có dữ liệu nhập tay từ dòng 2 trở xuống, `setup` sẽ dừng và báo lỗi để không ghi đè dữ liệu đó. Xoá dữ liệu đó đi rồi chạy lại. |

## Bước 3 — Deploy thành Web App

1. Trong Apps Script, bấm **Triển khai → Tạo bản triển khai mới** (Deploy → New deployment).
2. Bấm ⚙️ cạnh "Chọn loại" và chọn **Ứng dụng web** (Web app).
3. Điền:
   - **Mô tả:** `Minigame v1`
   - **Thực thi dưới tên** (Execute as): **Tôi** (Me)
   - **Người có quyền truy cập** (Who has access): **Bất kỳ ai** (Anyone)
4. Bấm **Triển khai** (Deploy) rồi **sao chép URL Web App**. URL có dạng:

   ```
   https://script.google.com/macros/s/AKfycb....../exec
   ```

5. Kiểm tra nhanh: dán URL đó vào trình duyệt, thêm `?action=leaderboard` ở cuối. Thấy `{"ok":true,"rows":[]}` là đúng.

## Bước 4 — Gắn URL vào game

Mở `index.html`, tìm dòng:

```js
const SHEET_API_URL = '';
```

Dán URL Web App vào giữa hai dấu nháy:

```js
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycb....../exec';
```

Sau đó commit và push lên `main`. Khoảng 1 phút sau minigame sẽ bắt đầu ghi vào Sheet.

## Bước 5 — Chơi thử

1. Mở `https://minigame.glucankid.vn` bằng **cửa sổ ẩn danh**, đăng ký bằng một SĐT thật và chơi hết 6 câu.
2. Kiểm tra trong Sheet:
   - Tab `Contact_Info` có dòng mới, đã điền "Điểm game", "Thời gian chơi" và "Thời gian hoàn thành".
   - Tab `Point` có tên bạn.
   - Bảng xếp hạng cuối game có tên bạn, kèm nhãn **"Bạn"**.
3. Thử đăng ký lại bằng cùng SĐT, trên máy khác hoặc trình duyệt khác. Game phải báo *"Số điện thoại này đã tham gia 01 lượt chơi"*.
4. Thử với một SĐT khác: đăng ký, trả lời 1–2 câu rồi đóng tab. Sang máy khác đăng ký lại bằng SĐT đó, game phải cho chơi lại từ đầu, và trong `Contact_Info` vẫn chỉ có 1 dòng cho SĐT đó.
5. Xoá các dòng chơi thử trong tab `Contact_Info` trước khi chạy chương trình thật.

---

## Lưu ý vận hành

- **Sửa script về sau:** vào **Triển khai → Quản lý bản triển khai** (Manage deployments), bấm ✏️, chọn **Phiên bản: Phiên bản mới** rồi Triển khai. Làm theo cách này URL giữ nguyên. Nếu chọn "Tạo bản triển khai mới" thì sẽ ra URL khác, phải dán lại vào `index.html`.
- **Bảo mật dữ liệu:** Sheet chứa SĐT khách hàng. Chỉ chia sẻ cho người cần xem và đừng bật "Bất kỳ ai có đường liên kết". URL Web App chỉ cho phép đăng ký, gửi kết quả và xem top 10 với SĐT đã che. Không ai đọc được danh sách SĐT đầy đủ qua URL đó.
- **Bảng xếp hạng** trong game có thể chậm tối đa khoảng 30 giây so với Sheet (để giảm tải). Khi có người mới về đích, bảng được làm mới ngay.
- **Trang "Quản trị Marketing" trong game** vẫn chỉ đọc dữ liệu trên chính trình duyệt đang mở. Dữ liệu đầy đủ của mọi người chơi giờ nằm ở **Google Sheet**: xem, lọc và xuất file ngay trên Sheet.
- **Giới hạn cần biết:**
  - Điểm và thời gian chơi do trình duyệt người chơi tính rồi gửi lên. Script có chặn những giá trị vô lý (ví dụ thời gian chơi dài hơn thời gian thực kể từ lúc đăng ký), nhưng người rành kỹ thuật vẫn có thể gửi kết quả giả. Nếu có trao giải theo thứ hạng, nên đối chiếu tab `Contact_Info` trước khi trao.
  - Ai có URL Web App cũng có thể gửi đăng ký giả với SĐT bất kỳ.
  - Apps Script miễn phí chạy tốt với vài nghìn lượt chơi mỗi ngày. Nếu chạy quảng cáo lớn (nhiều người chơi cùng lúc), cần theo dõi xem có lỗi "Chưa gửi được thông tin" không.
- **Chưa gắn URL** (`SHEET_API_URL = ''`) thì game chạy như cũ: chỉ lưu trên trình duyệt, bảng xếp hạng dùng dữ liệu mẫu.
