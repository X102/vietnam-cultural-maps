# 🇻🇳 Bản đồ Di sản Văn hoá Việt Nam

Bản đồ web tương tác hiển thị **7 vùng văn hoá** và **các di sản văn hoá nổi bật** của Việt Nam, bao gồm:

- 🏛 **Di sản thế giới UNESCO** (8 di sản)
- 🎭 **Di sản văn hoá phi vật thể UNESCO** (16 di sản)
- 📜 **Di sản tư liệu** (5 di sản)
- 🎉 **Lễ hội truyền thống** tiêu biểu
- 🗺 **Di tích – danh thắng** nổi bật

Ranh giới 63 tỉnh/thành được tô màu theo 7 vùng; mỗi di sản là một điểm đánh dấu trên bản đồ.

---

## 🚀 Cách chạy

### Cách 1 (khuyên dùng) — nháy đúp `start.bat`

1. Nháy đúp **`start.bat`** trong thư mục này.
2. Trình duyệt tự mở tại **http://localhost:8000**.

> `start.bat` tự tìm Python (ưu tiên Python đi kèm DeepSeek Harness, sau đó đến `python`/`py` trên hệ thống).

### Cách 2 — chạy thủ công

```bash
cd "D:\MY WORKS\deepseek-app"
python serve.py          # hoặc: python -m http.server 8000
```

Rồi mở http://localhost:8000.

> ⚠️ Cần mở qua **máy chủ web** (không mở trực tiếp `index.html` bằng `file://`), vì trình duyệt chặn `fetch` dữ liệu JSON từ ổ đĩa cục bộ. Bản đồ nền (OpenStreetMap/CARTO) cần kết nối Internet.

---

## 🔄 Cơ chế cập nhật dữ liệu

Dữ liệu di sản nằm trong **`data/heritage.json`** — đây là nguồn dữ liệu duy nhất.

- **Tự động mỗi giờ**: web tự tải lại `heritage.json` sau mỗi 60 phút (có đồng hồ đếm ngược trong bảng điều khiển).
- **Cập nhật ngay**: bấm nút **"Cập nhật ngay"** để nạp lại dữ liệu tức thì.

### Thêm di sản mới

1. Tạo file JSON trong **`data/pending/`** (một mục hoặc một mảng các mục), ví dụ `data/pending/moi.json`:

   ```json
   {
     "id": "festival-101",
     "name": "Lễ hội Nghinh Ông",
     "category": "festival",
     "type": "Lễ hội truyền thống",
     "year": null,
     "province": "Bến Tre",
     "region": "dbscl",
     "coords": [106.7, 10.1],
     "summary": "Lễ hội cúng cá Ông của ngư dân ven biển.",
     "description": "Mô tả chi tiết hơn…",
     "source": "https://vietnam.travel"
   }
   ```

2. Chạy **`python update.py`** để gộp vào `heritage.json` (tự tăng version và cập nhật ngày).
3. Trên web, bấm **"Cập nhật ngay"** (hoặc đợi tối đa 1 giờ).

### Giá trị hợp lệ

| Trường | Giá trị |
|---|---|
| `category` | `world` · `intangible` · `documentary` · `festival` · `site` |
| `region` | `tdmnpb` · `dbsh` · `btb` · `dhntb` · `tn` · `dnb` · `dbscl` |
| `coords` | `[kinh độ, vĩ độ]` (longitude trước, theo chuẩn GeoJSON) |

### 7 vùng văn hoá

| Mã | Vùng |
|---|---|
| `tdmnpb` | Trung du và miền núi phía Bắc |
| `dbsh` | Đồng bằng sông Hồng |
| `btb` | Bắc Trung Bộ |
| `dhntb` | Duyên hải Nam Trung Bộ |
| `tn` | Tây Nguyên |
| `dnb` | Đông Nam Bộ |
| `dbscl` | Đồng bằng sông Cửu Long |

---

## 📁 Cấu trúc thư mục

```
deepseek-app/
├── index.html              # Giao diện chính
├── css/style.css           # Giao diện
├── js/
│   ├── app.js              # Logic bản đồ & dữ liệu
│   └── vendor/leaflet/     # Leaflet 1.9.4 (chạy offline)
├── data/
│   ├── heritage.json       # ⭐ Dữ liệu di sản (nguồn cập nhật)
│   ├── vietnam-regions.geojson  # Ranh giới 63 tỉnh (đã đơn giản hoá)
│   └── pending/            # Nơi đặt di sản mới để gộp
├── serve.py                # Máy chủ web tĩnh
├── start.bat               # Khởi động một chạm
└── update.py               # Script gộp dữ liệu mới
```

---

## 📚 Nguồn dữ liệu

- [UNESCO World Heritage Centre](https://whc.unesco.org/) — danh sách Di sản thế giới.
- [UNESCO Intangible Cultural Heritage](https://ich.unesco.org/) — danh sách Di sản phi vật thể (16 di sản, đến 12/2024 gồm Lễ hội Vía Bà Chúa Xứ núi Sam).
- Cục Di sản văn hoá – Bộ VHTTDL ([dsvh.gov.vn](https://dsvh.gov.vn/)).
- Ranh giới hành chính: bộ dữ liệu [dvhcvn](https://github.com/daohoangson/dvhcvn) (63 tỉnh/thành).

> Ghi chú: bản đồ dùng phân chia 63 tỉnh/thành (trước sáp nhập hành chính 2025) vì các di sản văn hoá được tham chiếu theo tên tỉnh truyền thống. Tên "Huế" (thay "Thừa Thiên Huế" từ 1/2025) được giữ theo dữ liệu nguồn.
