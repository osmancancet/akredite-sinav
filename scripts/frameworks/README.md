# Akreditasyon ölçüt kataloğu

`public/frameworks/*.json` dosyaları bu klasördeki betiklerle üretilir; elle düzenlenmez.

## Kaynak

`data/accreditation-research/G*.json` — YÖKAK tescil listesindeki 29 program akreditasyon kuruluşu ile YÖKAK KAP/UKAP için, yalnızca kuruluşların resmi sitelerinde yayımlanan belgelerden (ölçüt belgesi, öz değerlendirme raporu kılavuzu/şablonu, rehber) çıkarılmış ham araştırma verisi. Toplama kuralları `BRIEF.md` içindedir. Özet kurallar:

- Her ölçüt, alt ölçüt ve kanıt kalemi bir kaynak URL'si (ve mümkünse sayfa) taşır. Kaynağı olmayan kalem normalize edilirken **reddedilir** ve raporlanır.
- `kind: "explicit"` = belgede örnek kanıt / istenen tablo olarak birebir geçer. `kind: "derived"` = belgede kanıt olarak sayılmaz, ölçüt metninin istediği bir uygulamanın kanıtı olarak türetilmiştir; `basis` alanı dayanağı alıntılar.
- Erişim tarihi: 23.10.2026.

`medek_rubric.json` — MEDEK Önlisans Program Ölçütleri v1.1 Rehberi'ndeki 1–5 düzey tablosu; `medek_rubric.py` ile PDF'ten yerleşim tabanlı tablo çıkarımıyla (pdfplumber) üretilmiştir.

## Yeniden üretme

```bash
npm run frameworks
```

Rehber tablosunu yeniden çıkarmak için (ayrı bir sanal ortamda `pdfplumber` gerekir):

```bash
python -I scripts/frameworks/medek_rubric.py <rehber.pdf> data/accreditation-research/medek_rubric.json
```

## Güncelleme

Bir kuruluş ölçütlerini güncellediğinde ilgili kuruluşun kaydı `G*.json` içinde güncellenir ve `npm run frameworks` çalıştırılır. Kullanıcıların etkinleştirdiği çerçeveler kasalarında anlık görüntü (snapshot) olarak saklandığından, katalog güncellemesi devam eden çalışmaları değiştirmez.
