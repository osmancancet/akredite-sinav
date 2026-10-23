# MEDEK Önlisans Program Ölçütleri v1.1 Rehberi: alt ölçüt başına 1-5 rubrik hücreleri (yerleşim tabanlı tablo çıkarımı)
import sys, re, json, pdfplumber
pdf = pdfplumber.open(sys.argv[1])
out = {}
clean = lambda s: re.sub(r"\s+", " ", (s or "").replace("­", "")).strip()
for pno, page in enumerate(pdf.pages, start=1):
    for t in page.extract_tables():
        hdr = False
        for row in t:
            cells = [clean(c) for c in row]
            rest = [c for c in cells[1:] if c]
            if rest == ["1", "2", "3", "4", "5"]:
                hdr = True; continue
            # birleştirilmiş sütunlu sayfalarda boş hücreler atlanır; soldan sağa sıralı 5 dolu hücre = 5 düzey
            if hdr and len(rest) == 5:
                m = re.match(r"^(\d+\.\d+(?:\.\d+)?)\.?\s", cells[0])
                if m and m.group(1) not in out:
                    out[m.group(1)] = {"page": pno, "pdr": cells[0], "levels": {str(i + 1): rest[i] for i in range(5)}}
                hdr = False
json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(out), sorted(out, key=lambda k: [int(x) for x in k.split(".")]))
