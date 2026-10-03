# 🌐 Xuất bản lên GitHub Pages (web công khai)

Ứng dụng là **web tĩnh** nên có thể host miễn phí trên **GitHub Pages** với HTTPS.

## 1. Đẩy mã nguồn lên GitHub

```bash
cd "D:\MY WORKS\deepseek-app"
git init
git add -A
git commit -m "Bản đồ Di sản Văn hoá Việt Nam"
```

Trên github.com: **New repository** → đặt tên `vietnam-cultural-map` → chọn **Public** → **Create repository** (KHÔNG tick thêm README/.gitignore).

Quay lại terminal:

```bash
git remote add origin https://github.com/lopmaybay/vietnam-cultural-map.git
git branch -M main
git push -u origin main
```

> Lần đầu `push` sẽ mở trình duyệt để đăng nhập GitHub (hoặc dùng Personal Access Token).

## 2. Bật GitHub Pages

Repo → **Settings** → **Pages** (menu bên trái) → mục **Build and deployment**:

- **Source:** Deploy from a branch
- **Branch:** `main` → thư mục `/ (root)` → **Save**

Đợi 1–2 phút, web công khai tại:

> **https://lopmaybay.github.io/vietnam-cultural-map/**

## 3. Cập nhật dữ liệu khi cần

Sửa `data/heritage.json` (hoặc chạy `update.py`), rồi:

```bash
git add data/heritage.json
git commit -m "Cập nhật dữ liệu di sản"
git push
```

Người xem sẽ thấy dữ liệu mới sau tối đa ~1 giờ (hoặc bấm nút **"Cập nhật ngay"** trên web).
