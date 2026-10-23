# Kanıt odaklı ürün planı

Tarih: 23 Ekim 2026 · Kapsam: kullanıcı onayıyla Faz 1 (kanıt etrafında yeniden konumlandırma) ve Faz 2-A (sunucusuz ekip kanıt alışverişi). Alan adı en son alınacak.

## 1. Marka ve alan adı analizi

Ölçütler: (1) ürünün yeni merkezini (kanıt) anlatması, (2) Türk üniversitelerinde güven vermesi (.com.tr), (3) marka tescil edilebilirliği (salt tanımlayıcı adlar zayıf), (4) .com ve .com.tr'nin birlikte boş olması, (5) Türkçe karakter sorunu yaşamaması (ı → i).

Not: "akredite.com" (2017) ve "akredite.com.tr" (Akredite Danışmanlık) alınmış; "Akredite" adı akreditasyon danışmanlığı yapan bir firma tarafından kullanılıyor — karışıklık ve itiraz riski nedeniyle ana marka olarak önerilmez.

whois taraması (23.10.2026, satın almadan önce kayıt firmasında yeniden doğrulanmalı):

| Aday | Fikir | .com | .com.tr | Değerlendirme |
|---|---|---|---|---|
| **Kanıthane** | "-hane" (kütüphane, eczane): kanıtların evi | boş | boş | Ayırt edici, tescile uygun, kısa, iki uzantı boş. **Öneri** |
| Kanıtla | "Kanıtla!" emir kipi; "Güvenliği kanıtla" özelliğiyle bağ | dolu | boş | Güçlü fiil, ama .com yok |
| Kanıt Kasası | Şifreli kasa vurgusu | boş | boş | Tanımlayıcı; tescil zayıf |
| Kanıtsal | "Kanıta dayalı" sıfatı | boş | boş | Akademik ton, ayırt edici |
| Kalite Defteri | Kalite komisyonunun defteri | boş | boş | Samimi; kurumsal satışta hafif |
| İzkasa | İzlenebilirlik + kasa | boş | boş | Kısa ama anlamı açıklama ister |
| Sağlama | Matematikte "sağlama yapmak" = doğrulama | dolu | boş | Zekice; .com yok |
| Kanıt Merkezi | Modülün bugünkü adı | boş | boş | Tanımlayıcı; tescil zayıf |

Öneri: **Kanıthane** — `kanithane.com.tr` (ana) + `kanithane.com` (yönlendirme). Slogan önerisi: "Akreditasyon kanıtlarınızın şifreli evi." Uygulamada marka tek dosyada (`src/lib/brand.ts`); karar verildiğinde tek satırla değişir. Kasa veritabanı adı ve `.akredite` dosya uzantısı mevcut kullanıcıların verisi için değişmez.

Satın alma sonrası: Türk kayıt firmasından .com.tr, Cloudflare Registrar'dan .com; DNS Cloudflare (ücretsiz) → Workers özel alan adı. TÜRKPATENT'te 9. ve 42. sınıf ön araştırması önerilir.

## 2. Faz 1 — Kanıt etrafında yeniden konumlandırma

1. **Gezinme:** "Akreditasyon" (Pano, Kanıt merkezi) · "Kanıt üreticileri" (sınav, rubrik, program, kapı listesi, ÖÇ/PÇ) · "Sistem". Genel bakış akreditasyon hazırlığıyla açılır.
2. **Kanıt üreticisi eşleşme önerileri:** Uygulama belgeleri, kuruluş belgesinde adı açıkça geçen kanıt kalemlerine önerilir. Kurallar dar tutulur (ör. "cevap anahtarı", "belirtke", "rubrik", "ders dosyası", "madde analizi"); her öneri dayandığı ifadeyi gösterir, ekleme kararı kullanıcıdadır.
3. **Ders dosyası:** Ders başına bilgi formu (ÖÇ, AKTS, ÖÇ–PÇ matrisi, ölçme araçları) + dersin bütün sınavlarının belgeleri tek ZIP'te, SHA-256 içindekili.
4. **MEDEK ÖDR tabloları:** Tablo 5.1, 5.2, 6.1, 6.2 şablondaki sütunlarla; uygulamada verisi olan hücreler doldurulur, olmayanlar boş bırakılır (uydurma yok).
5. **Dönem ve çoklu bağlantı:** Her dosyaya akademik yıl; aynı dosya birden çok kanıta bağlanabilir (tek şifreli kopya, referans sayımıyla silme).
6. **İyileştirme eylemleri:** Düşük öz değerlendirme düzeyinden (≤2) eylem; sorumlu, son tarih, durum; raporlara ve görevlere yansır.

## 3. Faz 2-A — Sunucusuz ekip kanıt alışverişi

- Koordinatör, sorumlu kişiye seçili kanıt kalemleri için **talep dosyası** (`.akredite-talep`) üretir. Dosya yalnızca kalem başlıklarını, son tarihi ve koordinatörün bu talebe özel **ECDH P-256 açık anahtarını** içerir.
- Öğretim elemanı dosyayı kendi tarayıcısında açar, dosyalarını ekler ve **teslim paketi** (`.akredite-teslim`) üretir. Paket, geçici ECDH anahtarı + HKDF-SHA256 + AES-256-GCM ile yalnızca koordinatörün açabileceği biçimde şifrelenir. Parola paylaşımı gerekmez; e-postayla gönderilmesi güvenlidir.
- Koordinatör paketi içe aktarır: talep kimliği ve parmak izi doğrulanır, her dosyanın SHA-256'sı kontrol edilir, aynı teslim ikinci kez alınmaz, dosyalar kendi kasasında yeniden şifrelenip ilgili kanıtlara eklenir.
- Ortadaki adam riskine karşı her iki tarafta aynı **doğrulama kodu** (açık anahtar parmak izi) gösterilir.
- Sunucu yok; CLAUDE.md'deki Zero-Knowledge kuralı aynen korunur.

## 4. Test planı

- Birim testleri (Vitest): eşleştirme kuralları (32 çerçevede eşleşme listesi), ölçüt ayrıştırıcı, ilerleme/puan hesapları, ECDH alışverişi (doğru anahtar, yanlış anahtar, bozulmuş paket, yanlış talep), ÖDR tablosu satırları.
- Uçtan uca (iki ayrı tarayıcı profili = iki kasa): koordinatör talep üretir → öğretim elemanı teslim eder → koordinatör içe aktarır; bozulmuş/yeniden gönderilmiş/başka koordinatöre ait paketler reddedilir; çevrimdışı çalışır.
- Ders dosyası ZIP (`shasum -c`), ÖDR tabloları içerik denetimi, çoklu bağlantı ve referans sayımlı silme, dönem alanı, eylemlerin raporlara yansıması, yedek/geri yükleme, mobil, koyu tema, harici istek = 0, mevcut gerileme paketleri.

## 5. Uygulama sonucu (23 Ekim 2026)

| Madde | Durum | Not |
|---|---|---|
| Marka tek dosyada | ✅ | `src/lib/brand.ts`; öneri Kanıthane, karar kullanıcıda (şu an AkrediteSınav) |
| Gezinme | ✅ | Akreditasyon · Kanıt üreticileri · Sistem; Genel Bakış akreditasyon hazırlık panosuyla açılır |
| Eşleşme önerileri | ✅ | 12 belge türü, dar kurallar; 32 çerçevede tüm eşleşmeler tek tek incelendi, yanlış pozitifler (kütüphane, stüdyo sergisi, program amaçları) birim testiyle engellendi |
| Kanıt üreticileri sekmesi | ✅ | Belge bir kez üretilir, seçili kalemlere tek kopya bağlanır |
| Ders dosyası + bilgi formu | ✅ | ZIP içinde iç SHA-256 içindekiler (`shasum -c` ile doğrulandı) |
| MEDEK ÖDR tabloları | ✅ | 5.1, 5.2, 6.1, 6.2; verisi olmayan sütunlar boş, açıklama notlarıyla |
| Dönem, çoklu bağlantı | ✅ | Bağlantı kaldırılınca paylaşılan dosya korunur |
| İyileştirme eylemleri | ✅ | Düşük düzeyden tek tık; Görevler, Word ve Excel'de |
| Ekip alışverişi (Faz 2-A) | ✅ | Talep/teslim, doğrulama kodu, çevrimdışı teslim, yedekle taşınan anahtar |
| Tanıtım sayfası | ✅ | Kanıt odaklı mesaj, yeni ekran görüntüleri, ekip güvenliği |
| Bağımsız güvenlik incelemesi | ✅ | 7 bulgu + 1 olası sonsuz döngü düzeltildi: dış dosyalarda alan türü/ayrılmış kimlik denetimi, doğrulama kodunun talep içeriğine bağlanması, atomik ve geri alınabilir içe aktarma, silinmiş kanıta içe aktarma engeli, yükleme sırasında silme yarışı, eşleştirmede olumsuz koşullar, dosya adı tekrar döngüsü |
| Kayıt güvencesi | ✅ | 350 ms gecikmeli yazma, sekme gizlenince/kapanırken hemen yapılır; kaydedilmemiş değişiklik varken çıkışta tarayıcı uyarısı |
| Test | ✅ | Vitest 40/40; saldırgan e2e 20/20; ekip e2e 56/56 (4 ayrı kasa: koordinatör, öğretim elemanı, başka koordinatör, yedekten geri yüklenen); Kanıt Merkezi e2e 30/30; çevrimdışı katalog; eski paketler gerilemesiz; koyu tema + 390 px taşma yok; harici istek 0 |
