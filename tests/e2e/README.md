# Uçtan uca testler

Gerçek tarayıcıda (Chromium tabanlı) üretim derlemesi üzerinde çalışır. Her profil ayrı bir şifreli kasadır.

```bash
npm run build && npm start            # http://127.0.0.1:4173
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test:e2e
```

| Betik | Kapsam |
|---|---|
| `accred.mjs` | Kanıt Merkezi: şifreli ekler, SHA-256, öz değerlendirme, çıktılar, katalog, parola ve yedek, sahipsiz dosya temizliği, mobil |
| `team.mjs` | Ekip alışverişi (4 kasa), kanıt üreticileri, çoklu bağlantı, ders dosyası, ÖDR tabloları, eylemler, dönem |
| `adversarial.mjs` | Saldırgan rolü: kötü niyetli talep/teslim dosyaları, geri alınan içe aktarma, talep dışı kaleme ekleme, çıkış koruması |
| `offline-catalog.mjs` | Ağ kapalıyken katalog ve çalışma alanı açma |

İndirilen dosyalar `/tmp/akr-e2e-dl/` altına yazılır.
