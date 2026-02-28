# Nhạc Chung DPS (DPS Music Room)

🎵 **Nhạc Chung DPS** là một ứng dụng nghe nhạc chung thời gian thực (real-time shared music room), cho phép nhiều người cùng tham gia vào một phòng, thêm bài hát từ YouTube vào danh sách chờ và cùng nhau nghe nhạc đồng bộ hoàn toàn.

Ứng dụng được thiết kế tối giản, không yêu cầu đăng nhập, dữ liệu được lưu tạm thời trên server và tự động xóa khi phòng trống.

![Screenshot](https://dps.media/wp-content/uploads/2023/08/dpsmedia.svg) *(Giao diện dark mode với theme màu thương hiệu DPS Media)*

## ✨ Tính năng chính

- **Real-time Sync:** Mọi thao tác (Phát, Tạm dừng, Bỏ qua bài, Thêm/Xóa/Ưu tiên bài trong hàng chờ) đều được đồng bộ lập tức đến tất cả người trong phòng qua WebSockets.
- **Sync On Join:** Người mới vào phòng giữa chừng sẽ tự động bắt kịp vị trí giây bài hát đang phát của những người khác.
- **Phòng ẩn danh (Ephemeral Rooms):** Truy cập ứng dụng sẽ tự tạo một phòng mới với ID ngẫu nhiên. Dữ liệu phòng tồn tại trên RAM server và sẽ bị xóa sạch 10 phút sau khi người cuối cùng rời đi.
- **Khóa Controls (Anti-scrub):** Chặn người dùng tự ý kéo thanh thời gian của YouTube để đảm bảo không ai bị lệch nhịp.
- **Nhận dạng vui nhộn:** Người dùng được gán tên con vật ngẫu nhiên (VD: `Swift Panda`, `Hungry Deer`) thay vì phải tạo tài khoản.
- **Server-side YouTube Metadata:** Tự động lấy tên và thumbnail video YouTube mà không lo bị lỗi CORS.

---

## 🚀 Công nghệ sử dụng

- **Frontend:** React (Vite), Tailwind CSS (v4), Socket.io-client, YouTube IFrame API.
- **Backend:** Node.js, Express, Socket.io (lưu state in-memory).
- **Icons:** React Icons (`react-icons/fa`).

---

## 🛠 Hướng dẫn Cài đặt & Chạy cục bộ

Dự án này bao gồm 2 phần: **Frontend** (nằm ở thư mục gốc) và **Backend Server** (nằm trong thư mục `/server`). Bạn cần chạy cả 2 tiến trình này song song.

### 1. Cài đặt Dependencies

Mở terminal tại thư mục gốc của dự án và cài đặt cho Frontend:
```bash
npm install
```

Tiếp theo, di chuyển vào thư mục `server` và cài đặt cho Backend:
```bash
cd server
npm install
```

### 2. Chạy ứng dụng (Development)

Bạn cần mở 2 cửa sổ Terminal:

**Terminal 1 (Chạy Backend Server trên port 3001):**
```bash
cd server
npm run dev
```

**Terminal 2 (Chạy Frontend Vite trên port 5173):**
```bash
# Ở thư mục gốc của dự án
npm run dev
```

### 3. Sử dụng

1. Mở trình duyệt và truy cập `http://localhost:5173`.
2. Hệ thống sẽ tự động tạo một phòng mới và chuyển hướng bạn đến URL dạng: `http://localhost:5173/room/<uuid>`
3. Bấm nút **"Chia sẻ"** góc trên bên phải để copy link gửi cho bạn bè.
4. Paste link YouTube vào ô thêm bài hát và quẩy thôi! 🎶

---

## 📁 Cấu trúc thư mục

```text
dps-music-room/
├── server/                 # ⚙️ BACKEND NODE.JS
│   ├── package.json
│   └── server.js           # Server Express + Socket.io, quản lý state các phòng
│
├── src/                    # 🎨 FRONTEND REACT
│   ├── components/         # Các UI components
│   │   ├── AddSongForm.jsx # Form nhập link YouTube
│   │   ├── QueueList.jsx   # Danh sách hàng chờ
│   │   ├── UsersList.jsx   # Sidebar hiển thị người đang nghe
│   │   └── VideoPlayer.jsx # Trình phát YouTube IFrame API đồng bộ
│   ├── context/
│   │   └── SocketContext.jsx # Quản lý kết nối Socket.io và state của phòng
│   ├── pages/
│   │   └── Room.jsx        # Layout chính của phòng nghe nhạc
│   ├── utils/
│   │   └── utils.js        # Các hàm tiện ích (tạo tên thú, extract YT ID, lấy meta)
│   ├── App.jsx             # Entry point, xử lý routing tạo phòng tự động
│   ├── main.jsx
│   └── index.css           # Global CSS, cài đặt Brand colors
│
├── package.json
├── vite.config.js          # Cấu hình Vite (có proxy /socket.io và /api tới server 3001)
└── README.md
```

---

## 📋 Ghi chú về luồng dữ liệu (Architecture)

1. **Proxy:** Trong môi trường Dev, File `vite.config.js` được cấu hình để tự động proxy các request `/socket.io` và `/api` sang cổng `3001` của Node.js server.
2. **Metadata API:** Frontend gọi `/api/youtube-meta?videoId=...` => Node.js Server gọi `youtube.com/oembed` => Trả về Frontend. (Tránh lỗi CORS 401 trên trình duyệt).
3. **Recovery:** Nếu người dùng F5 hoặc rớt mạng, khi kết nối lại Socket.io, Server sẽ gửi lại toàn bộ `room_state` hiện tại để UI tự động phục hồi.

---

*Made with ❤️ for DPS Media.*
