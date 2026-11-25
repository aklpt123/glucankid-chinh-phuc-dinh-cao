# Hướng dẫn gắn subdomain `minigame.glucankid.vn` cho trang GitHub Pages

- Trang minigame hiện đang chạy tại: <https://aklpt123.github.io/glucankid-chinh-phuc-dinh-cao/>
- Địa chỉ mới muốn dùng: **`minigame.glucankid.vn`**
- Trang chính `glucankid.vn` giữ nguyên, không bị ảnh hưởng.

Khi xong, minigame sẽ hiển thị trực tiếp trên `minigame.glucankid.vn` (không phải chuyển trang), và link `aklpt123.github.io/...` cũ sẽ tự chuyển về địa chỉ mới.

---

## Bước 1 — Thêm bản ghi DNS cho `minigame`

### 1.1. Xác định nơi quản lý DNS của `glucankid.vn`

Tại thời điểm viết hướng dẫn, `glucankid.vn` đang dùng nameserver:

```
ns1.secureweb.vn
ns2.secureweb.vn
ns3.secureweb.vn
```

Trên trang danh sách tên miền của Tenten, cột DNS của `glucankid.vn` ghi **"Đã mua"** chứ không có biểu tượng DNS. Như vậy DNS của tên miền này **không** sửa trực tiếp ở trang danh sách tên miền. Nó do dịch vụ đang chạy trang chính `glucankid.vn` quản lý (nhiều khả năng là gói hosting đi kèm).

Bản ghi phải thêm ở **nơi quản lý DNS** đó, theo một trong các cách sau:

- Vào trang quản trị hosting của `glucankid.vn` (cPanel / DirectAdmin / Plesk…) → mục **Zone Editor / DNS Management**.
- Hoặc trong id.tenten.vn → **Quản lý dịch vụ** → gói hosting của `glucankid.vn` → quản lý DNS.
- Nếu không tìm thấy: gửi vé hỗ trợ (**Hỗ trợ – Quản lý vé**) cho Tenten, nhờ thêm bản ghi ở mục 1.2.

### 1.2. Bản ghi cần thêm

| Loại    | Host / Tên | Giá trị              | TTL                  |
|---------|------------|----------------------|----------------------|
| `CNAME` | `minigame` | `aklpt123.github.io` | 3600 (hoặc mặc định) |

- Ô **Host** chỉ ghi `minigame`. Một số trang quản trị đòi tên đầy đủ, khi đó ghi `minigame.glucankid.vn.` (có dấu chấm ở cuối).
- Ô **Giá trị** chỉ ghi `aklpt123.github.io`: không có `https://`, không có tên repo phía sau.

> ⚠️ **Không sửa hay xoá** các bản ghi sẵn có của `glucankid.vn` (bản ghi `@`, `www`, `MX`…). Làm vậy sẽ làm hỏng trang chính và email. Chỉ **thêm mới** đúng một bản ghi `minigame`.

### 1.3. Kiểm tra

Sau vài phút, có khi tới vài giờ:

```bash
dig minigame.glucankid.vn +short
# Kết quả đúng sẽ có dòng: aklpt123.github.io.
```

---

## Bước 2 — Khai báo tên miền với GitHub

Chỉ làm bước này **sau khi** Bước 1 đã kiểm tra thành công.

Tạo file tên `CNAME` (viết hoa, không có đuôi) ở thư mục gốc repo, chỉ có đúng một dòng:

```
minigame.glucankid.vn
```

Sau đó commit và push lên nhánh `main`:

```bash
echo "minigame.glucankid.vn" > CNAME
git add CNAME
git commit -m "Add custom domain minigame.glucankid.vn"
git push origin main
```

Repo này build Pages từ nhánh `main`, nên GitHub sẽ tự nhận tên miền từ file `CNAME`. Không cần quyền admin cho bước này.

---

## Bước 3 — Chờ và bật HTTPS

1. Sau khi push file `CNAME`, GitHub tự cấp chứng chỉ SSL cho `minigame.glucankid.vn`, thường mất 15 phút đến 1 tiếng.
2. Tài khoản admin của repo (`aklpt123`) vào **Settings → Pages** và tích **Enforce HTTPS**.
3. *(Nên làm)* Tài khoản `aklpt123` vào **Settings tài khoản → Pages → Add a domain** để xác minh (verify) tên miền `glucankid.vn`. Làm vậy để người khác không trỏ được subdomain của bạn vào repo của họ.

**Kiểm tra cuối:**

- Mở `https://minigame.glucankid.vn`: minigame hiện ra và trình duyệt có biểu tượng ổ khoá.
- Mở `https://glucankid.vn`: trang chính vẫn hoạt động bình thường.

---

## Gặp lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Vào `minigame.glucankid.vn` báo 404 của GitHub | Kiểm tra file `CNAME` đã được push và ghi đúng `minigame.glucankid.vn` chưa. |
| Không vào được / `dig` không trả kết quả | DNS chưa cập nhật, hoặc bản ghi được thêm sai chỗ (phải thêm ở nơi quản lý nameserver `secureweb.vn`, xem Bước 1.1). |
| Trang chính `glucankid.vn` bị lỗi sau khi sửa DNS | Có thể đã sửa nhầm bản ghi `@` hoặc `www`. Khôi phục lại giá trị cũ. |
| Không tích được "Enforce HTTPS" | Chứng chỉ SSL chưa cấp xong, chờ thêm rồi thử lại. |
