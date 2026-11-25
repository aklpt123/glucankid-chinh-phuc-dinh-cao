# Hướng dẫn gắn subdomain riêng cho trang GitHub Pages

Trang hiện đang chạy tại: <https://aklpt123.github.io/glucankid-chinh-phuc-dinh-cao/>

Mục tiêu: truy cập trang bằng subdomain của tên miền đã mua ở Tenten, ví dụ `chinhphuc.glucankid.vn`.
Trong hướng dẫn này, thay `chinhphuc.glucankid.vn` bằng subdomain bạn muốn dùng.

Khi xong, trang sẽ hiển thị trực tiếp trên subdomain (không phải chuyển trang), và link `aklpt123.github.io/...` cũ sẽ tự chuyển về subdomain mới.

---

## Bước 1 — Thêm bản ghi DNS trên Tenten

1. Đăng nhập <https://id.tenten.vn> → **Quản lý dịch vụ** → danh sách tên miền.
2. Ở dòng tên miền muốn dùng, bấm biểu tượng **DNS** (hình tròn xanh) để mở trang quản lý bản ghi.
3. Thêm một bản ghi mới:

   | Loại    | Host / Tên  | Giá trị              | TTL                  |
   |---------|-------------|----------------------|----------------------|
   | `CNAME` | `chinhphuc` | `aklpt123.github.io` | 3600 (hoặc mặc định) |

   - Ô **Host** chỉ ghi phần subdomain (`chinhphuc`), không ghi cả `chinhphuc.glucankid.vn`.
   - Ô **Giá trị** chỉ ghi `aklpt123.github.io`: không có `https://`, không có tên repo phía sau.

> **Lưu ý:** Nếu cột DNS của tên miền ghi **"Đã mua"** thay vì hiện biểu tượng DNS, tên miền đó có thể đang dùng nameserver ở nơi khác (Cloudflare, nhà cung cấp hosting…). Khi đó phải thêm bản ghi CNAME ở nơi đang quản lý nameserver, thêm trên Tenten sẽ không có tác dụng.

**Kiểm tra** (sau vài phút, có khi tới vài giờ):

```bash
dig chinhphuc.glucankid.vn +short
# Kết quả đúng sẽ có dòng: aklpt123.github.io.
```

---

## Bước 2 — Khai báo tên miền với GitHub

Tạo file tên `CNAME` (viết hoa, không có đuôi) ở thư mục gốc repo. File chỉ có đúng một dòng là subdomain:

```
chinhphuc.glucankid.vn
```

Sau đó commit và push lên nhánh `main`:

```bash
echo "chinhphuc.glucankid.vn" > CNAME
git add CNAME
git commit -m "Add custom domain"
git push origin main
```

Repo này build Pages từ nhánh `main`, nên GitHub sẽ tự nhận tên miền từ file `CNAME`. Không cần quyền admin cho bước này.

---

## Bước 3 — Chờ và bật HTTPS

1. Chờ DNS cập nhật (thường vài phút, chậm nhất vài giờ).
2. Sau khi DNS nhận, GitHub tự cấp chứng chỉ SSL, thường mất 15 phút đến 1 tiếng.
3. Tài khoản admin của repo (`aklpt123`) vào **Settings → Pages** và tích **Enforce HTTPS**.
4. *(Nên làm)* Tài khoản `aklpt123` vào **Settings tài khoản → Pages → Add a domain** để xác minh (verify) tên miền `glucankid.vn`. Làm vậy để người khác không trỏ được subdomain của bạn vào repo của họ.

**Kiểm tra cuối:** mở `https://chinhphuc.glucankid.vn`. Trang hiện ra và trình duyệt có biểu tượng ổ khoá là xong.

---

## Gặp lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Vào subdomain báo 404 của GitHub | Kiểm tra file `CNAME` đã được push và ghi đúng subdomain chưa. |
| Không vào được subdomain / `dig` không trả kết quả | DNS chưa cập nhật, hoặc thêm bản ghi sai chỗ (xem lưu ý ở Bước 1). |
| Không tích được "Enforce HTTPS" | Chứng chỉ SSL chưa cấp xong, chờ thêm rồi thử lại. |
