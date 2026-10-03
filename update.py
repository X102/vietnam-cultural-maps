# -*- coding: utf-8 -*-
"""Cập nhật dữ liệu di sản cho Bản đồ Di sản Văn hoá Việt Nam.

Cách dùng — thêm di sản mới:
  1. Tạo một file JSON trong thư mục  data/pending/  chứa một mục (object)
     hoặc một mảng các mục. Ví dụ  data/pending/moi.json:
        {
          "id": "festival-x", "name": "Lễ hội ...", "category": "festival",
          "type": "Lễ hội truyền thống", "year": null, "province": "Tỉnh ...",
          "region": "dbsh", "coords": [105.8, 21.0],
          "summary": "...", "description": "...", "source": "https://..."
        }
  2. Chạy:  python update.py
  3. Script sẽ gộp mục mới vào data/heritage.json, tăng version và cập nhật
     ngày "updated". Trên web, bấm "Cập nhật ngay" (hoặc đợi tối đa 1 giờ) để
     bản đồ tự nạp lại dữ liệu mới.

Các giá trị hợp lệ:
  - category: world | intangible | documentary | festival | site
  - region:   tdmnpb | dbsh | btb | dhntb | tn | dnb | dbscl
  - coords:   [kinh độ, vĩ độ]  (GeoJSON order: longitude trước)
"""
import datetime
import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
PENDING = os.path.join(DATA, "pending")
MAIN = os.path.join(DATA, "heritage.json")

VALID_CATEGORIES = {"world", "intangible", "documentary", "festival", "site"}
VALID_REGIONS = {"tdmnpb", "dbsh", "btb", "dhntb", "tn", "dnb", "dbscl"}


def main():
    os.makedirs(PENDING, exist_ok=True)
    data = json.load(open(MAIN, encoding="utf-8"))
    existing = {h["id"] for h in data["heritage"]}
    added = 0

    for f in sorted(glob.glob(os.path.join(PENDING, "*.json"))):
        items = json.load(open(f, encoding="utf-8"))
        if isinstance(items, dict):
            items = [items]
        for it in items:
            if not isinstance(it, dict) or not it.get("id"):
                print(f"  [bo qua] thieu truong 'id' trong {os.path.basename(f)}")
                continue
            if it["id"] in existing:
                print(f"  [bo qua] da ton tai id: {it['id']}")
                continue
            cat = it.get("category")
            reg = it.get("region")
            if cat not in VALID_CATEGORIES:
                print(f"  [canh bao] category khong hop le cho {it['id']}: {cat!r}")
            if reg not in VALID_REGIONS:
                print(f"  [canh bao] region khong hop le cho {it['id']}: {reg!r}")
            data["heritage"].append(it)
            existing.add(it["id"])
            added += 1
            print(f"  [+] da them: {it['id']} - {it.get('name', '')}")
        os.remove(f)

    if added:
        v = data["meta"].get("version", "1.0.0").split(".")
        v[-1] = str(int(v[-1]) + 1)
        data["meta"]["version"] = ".".join(v)

    data["meta"]["updated"] = datetime.date.today().isoformat()
    json.dump(data, open(MAIN, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"\nOK. Da them {added} muc moi. Tong {len(data['heritage'])} di san. "
          f"Version {data['meta']['version']}.")


if __name__ == "__main__":
    main()
