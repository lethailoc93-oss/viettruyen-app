# HướngDự án Web App Tiểu Thuyết Tương Tác / Text-Based RPG sử dụng AI, thiết kế bằng React, Vite, và TailwindCSS (Custom).

## 🌍 Triển khai lên Web (Cho người khác chơi)

App được thiết kế theo mô hình Client-Server để vượt rào CORS chặn API LLM.

**1. Mang Backend lên máy chủ ảo (Render.com)**
- Đăng nhập [Render.com](https://render.com) và chọn tạo "Web Service".
- Kết nối Github repo này.
- Render sẽ tự động nhận diện file `render.yaml` tôi đã viết sẵn và deploy máy chủ Backend lên mạng.
- Lúc này bạn sẽ có 1 đường link Backend, ví dụ: `https://vtbc-api.onrender.com`

**2. Đẩy Giao diện lên Netlify / Vercel**
- Đăng nhập Netlify, chọn repo Github này để deploy.
- Vô cùng quan trọng: Trong cài đặt site ở Netlify (Site Settings -> Environment Variables), bạn hãy thêm biến môi trường sau:
  - Key: `VITE_BACKEND_URL`
  - Value: `https://vtbc-api.onrender.com/api/proxy/chat` (Thay bằng link Render thật của bạn).
- Lúc này Netlify sẽ compile giao diện và trỏ mọi request API về Backend của bạn trên Render. Vậy là bất cứ ai cũng truy cập và chơi bình thường!

## Các tính năng chính (Bản cập nhật SillyTavern)
- **Hoàn toàn vượt CORS:** Nhờ Proxy Server độc lập.
- **Card Import V2/V3:** Nhập thẻ nhân vật định dạng SillyTavern (.png, .webp) nội bộ.
- **Token Budgeting thông minh:** Quản lý giới hạn context khi chat tự động cắt tỉa y hệt SillyTavern.
- **Extensions:** Xương sống có sẵn để vẽ ảnh bằng ComfyUI và Text-to-Speech bằng ElevenLabs.
# Hướng dẫn Cài đặt Tiện ích Vượt Tường Lửa (Bypasser) & Máy chủ Local

Để ứng dụng Viết Truyện AI (SangTacViet) của bạn chạy mượt mà, tải nhanh và không bị chặn bởi Cloudflare, bạn **bắt buộc** phải thiết lập 2 công cụ đi kèm dưới đây. Quá trình này rất nhanh gọn, chỉ mất 1 phút!

---

## Phần 1: Cài đặt Tiện ích mở rộng (Chrome Extension)

Lõi tải truyện thông minh của chúng ta nằm ở tiện ích này. Nó giúp "bóc tách" văn bản một cách chuyên nghiệp.

1. **Tải Thư mục Extension**: Giữ thư mục `chrome-extension` trên máy tính của bạn (đừng xóa nó).
2. **Mở Quản lý Tiện ích:** Trên Google Chrome (hoặc Cốc Cốc, Edge, Brave), gõ `chrome://extensions/` vào thanh địa chỉ và ấn Enter.
3. Bật **Chế độ dành cho nhà phát triển (Developer mode)** ở góc trên bên phải màn hình.
4. Bấm nút **Tải tiện ích đã giải nén (Load unpacked)** ở góc trên bên trái.
5. Trỏ tới thư mục `chrome-extension` trên máy bạn.
6. Xong! Bạn sẽ thấy Tiện ích **SangTacViet Bypasser** xuất hiện. Đừng quên ghim (pin) nó lên thanh công cụ để tiện theo dõi.

---

## Phần 2: Khởi động Server Trạm Trung Chuyển (Local WebSocket Relay)

Trình duyệt không thể tự gửi dữ liệu thẳng cho ứng dụng nếu không có "Trạm Trung Chuyển" này.

1. Mở Terminal (Command Prompt hoặc PowerShell) trên máy tính của bạn.
2. Di chuyển đến thư mục gốc của dự án (Nơi chứa file `ws-relay-server.js`).
3. Chạy lệnh sau:
   ```bash
   node ws-relay-server.js 8080
   ```
4. Nếu thấy dòng chữ `🔌 WS Relay + HTTP Proxy running on port 8080` là thành công! (Hãy bấm thu nhỏ cửa sổ đen này lại, **ĐỪNG TẮT NÓ** khi đang viết truyện).

---

## Phần 3: Kết nối Ứng dụng của bạn

- Mở ứng dụng Truyện (trên web hoặc localhost).
- Vào phần **Cài đặt (biểu tượng Bánh Răng)**.
- Đảm bảo dòng **URL Proxy** có giá trị là `ws://localhost:8080`.
- Bắt đầu tìm kiếm truyện, tải chương, hoặc dùng tính năng Nghiên cứu (Research). Mọi thứ sẽ mượt như lụa!

### 🆘 Gặp lỗi không tải được truyện?
1. Kiểm tra lại cửa sổ đen (Terminal) chạy lệnh ở Phần 2 có bị tắt không.
2. Click vào biểu tượng Extension mới cài ở Phần 1 trên trình duyệt, xem nó đang báo chữ "ON" (Màu xanh) hay "OFF" (Màu đỏ). Nếu đỏ hãy coi lại Phần 2.
3. Mọi thứ OK nhưng vẫn kẹt? Bấm biểu tượng "Reload/Tải lại" extension đó trong `chrome://extensions/`.
