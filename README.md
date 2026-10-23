# AkrediteSınav

Zero-Knowledge (tarayıcı içi şifreli) akademik sınav, sınav operasyonu ve MEDEK/MÜDEK/YÖKAK akreditasyon stüdyosu.

## Çalıştırma

```bash
npm install
npm run dev        # geliştirme: http://localhost:3000
npm run build      # statik üretim çıktısı -> out/
npm start          # out/ klasörünü http://127.0.0.1:4173 adresinde servis eder (bağımlılıksız)
```

`out/` klasörü herhangi bir statik sunucudan (veya kurum intranetinden) yayımlanabilir; sunucu tarafı kod yoktur.
İlk açılışta kasa, demo veri setiyle (VTYS dersi, 5 ÖÇ, 6 soru, 8 derslik program, 6 gözetmen, 4 derslik, 75 öğrenci, 40 öğrencilik not simülasyonu, 2 rubrik) otomatik doldurulur.

## Test

```bash
npm test        # Vitest: ECDH alışverişi ve kötü niyetli dosyalar, eşleştirme kuralları (32 çerçeve), ekip veri dönüşümleri
npm run typecheck && npm run lint && npm run build
npm start & npm run test:e2e   # tarayıcıda uçtan uca (tests/e2e/README.md)
```

## Öne çıkan özellikler

- **Akreditasyon Kanıt Merkezi:** YÖKAK tescilli 29 kuruluşun tamamı ve YÖKAK KAP/UKAP için 32 ölçüt seti (ölçüt, alt ölçüt, kuruluşun örnek kanıt listesi; her kalem kaynak belge ve sayfa atfıyla). Kanıt başına durum, sorumlu, son tarih, not ve tarayıcıda AES-256-GCM ile şifrelenen dosya ekleri; uygulamanın ürettiği belgeleri tek tıkla kanıta ekleme; MEDEK Rehberi 1–5 düzeyli öz değerlendirme ve YÖKAK olgunluk düzeyleriyle tahmini puan (resmi değil); görev takibi; kanıt matrisi (.xlsx), öz değerlendirme çalışma raporu (.docx) ve SHA-256 içindekili kanıt paketi (.zip). Katalogda olmayan çerçeveler için kurum tanımlı ölçüt seti. Kaynak ve yeniden üretim: `scripts/frameworks/README.md`.
- **Ekipten şifreli kanıt toplama (sunucusuz):** Koordinatör, sorumlu öğretim elemanına kalem kalem `.akredite-talep` dosyası gönderir; öğretim elemanı belgelerini kendi tarayıcısında ekleyip `.akredite-teslim` paketi döndürür. Paket talebe özel ECDH P-256 anahtarına HKDF-SHA256 + AES-256-GCM ile şifrelenir, yalnızca talebi oluşturan kasa açabilir; iki tarafta aynı doğrulama kodu görünür. İçe aktarmada SHA-256 doğrulaması, tekrar gönderim engeli ve yalnızca talep edilen kalemlere ekleme.
- **Kanıt üreticileri:** Uygulamanın ürettiği belgeler (sınav kağıdı, cevap anahtarı/belirtke, kağıt kapakları, rubrik, PUKÖ, not çizelgesi, ders dosyası, MEDEK ÖDR tabloları…) kuruluş belgesinde adıyla geçen kanıt kalemlerine dar kurallarla önerilir; her öneri dayandığı ifadeyi gösterir. Bir belge tek kopya olarak birden çok kanıta bağlanır (referans sayımlı silme).
- **Ders dosyası ve ÖDR tabloları:** Ders bilgi formu (ÖÇ, ÖÇ–PÇ matrisi, ölçme araçlarının ÖÇ kapsamı) + dersin bütün ölçme araçlarının belgeleri tek ZIP'te; MEDEK ÖDR Tablo 5.1, 5.2, 6.1, 6.2 şablon sütunlarıyla, verisi olan hücreler doldurulmuş.
- **İyileştirme eylemleri ve dönem:** Düşük öz değerlendirme düzeyinden eylem (sorumlu, tarih, durum) — rapor ve matrise aktarılır. Her dosyada akademik yıl; "bu yılın dosyası olmayan" filtresi.
- **Genel Bakış ve kurulum sihirbazı:** dönem iş akışı ilerlemesi, yaklaşan sınavlar, akreditasyon durumu; ilk açılışta demo veya kendi kurumunuzla 2 dakikada kurulum.
- **Soru bankası ve metinden soru aktarma:** Word'deki sınavı yapıştırın; numara, puan, şık, doğru cevap, kod bloğu ve Bloom düzeyi otomatik algılanır.
- **Madde analizi:** güçlük (p), ayırt edicilik (D, %27), düzeltilmiş madde-toplam korelasyonu, Cronbach α, SEM ve Ebel kararları.
- **Program çıktıları panosu:** dersler × PÇ planlanan katkı ve gerçekleşen başarı; desteklenmeyen PÇ uyarısı; öz değerlendirme eki Word raporu.
- **Tek tık ders kanıt klasörü (ZIP):** tüm resmi belgeler klasörlenmiş, SHA-256 bütünlük özetli.
- **Takvim (.ics), optik cevap anahtarı, öğrenci düzeyi sınav çakışması denetimi, ⌘K global arama.**

## Üniversite logoları

Modül 1 → **Üniversite Seç** ile Türkiye'deki 205 yükseköğretim kurumundan biri seçildiğinde antet ve logo tüm Word/PDF çıktılarına (sınav kağıdı, cevap anahtarı, tutanaklar, PUKÖ raporu vb.) otomatik uygulanır. 197 kurumun logosu `public/logos/` altında uygulamayla birlikte gelir (256 px PNG); seçim internet gerektirmez ve logo şifreli kasaya kopyalanır. Logosu bulunmayan 8 kurum için "Logo Yükle" ile elle ekleme yapılabilir.

Liste kaynağı tr.wikipedia "Türkiye'deki üniversiteler listesi"; logolar Wikidata/Wikimedia Commons, tr/en Wikipedia ve kurum web sitelerinden alınmıştır. Dosya bazında kaynaklar `public/logos/KAYNAKLAR.md` içindedir. **Logolar ilgili kurumların tescilli işaretleridir**; bu depo onlar üzerinde hak iddia etmez ve yalnızca kurum personelinin kendi resmi belgelerinde kurum kimliğini göstermesi amacıyla sunar. Kurumların kaldırma talepleri karşılanır.

## Güvenlik mimarisi

- **Şifreleme:** Her koleksiyon IndexedDB'ye AES-256-GCM (yazım başına yeni 12 byte IV, koleksiyon adı AAD) ile yazılır.
- **Anahtar:** Varsayılan olarak dışa aktarılamaz (non-extractable) cihaz anahtarı; isteğe bağlı master parola (PBKDF2-SHA256, 100.000 iterasyon, 16 byte salt). Parola modunda anahtar yalnızca bellekte tutulur.
- **Kanıt dosyaları:** Ayrı bir IndexedDB tablosunda dosya başına AES-256-GCM (AAD `blob:<kimlik>`) ile saklanır; master parola değişiminde yeniden şifrelenir, hiçbir kayda bağlı olmayan dosyalar sıfırlama/geri yükleme sonrası silinir.
- **Yedek:** `.akredite` paketi (sürüm 2) = PBKDF2 + AES-256-GCM ile şifrelenmiş tam kasa ve kanıt dosyaları (JSON zarf + Base64 şifreli yük). Sürüm 1 yedekleri okunmaya devam eder.
- **Ağ:** CSP `connect-src` yalnızca uygulamanın kendisine ve kullanıcının seçtiği BYOK AI uç noktalarına izin verir. "Güvenliği Kanıtla" modalı tüm ağ olaylarını canlı listeler.
- **Çevrimdışı:** Tüm modüller tek pakette yüklenir; Service Worker statik dosyaları önbelleğe alır. Word (`docx`), Excel (`xlsx`) ve A4 PDF (tarayıcı yazdırma motoru) çıktıları internetsiz üretilir.

## Modüller ve kaynak kodu

| Modül | Arayüz | Mantık / Çıktı |
|---|---|---|
| 1 Kasa, Antet & Güvenlik | `src/modules/vault`, `src/components/shell` | `src/lib/cryptoVault.ts`, `src/lib/demoSeeder.ts`, `src/lib/networkAudit.ts` |
| 2 Sınav Kağıdı & Belirtke | `src/modules/exam` | `src/lib/booklet.ts`, `src/lib/medekMath.ts`, `src/services/examExportService.ts` |
| 3 Sınav Programı & Gözetmen | `src/modules/scheduler` | `src/lib/scheduler.ts`, `src/services/scheduleExportService.ts` |
| 4 Kapı Listesi & Yoklama | `src/modules/seating` | `src/lib/seating.ts`, `src/services/seatingExportService.ts` |
| 5 Analitik Rubrik | `src/modules/rubric` | `src/lib/rubricTemplates.ts`, `src/services/rubricExportService.ts` |
| 6 ÖÇ/PÇ & PUKÖ | `src/modules/medek` | `src/lib/medekMath.ts`, `src/services/medekExportService.ts` |
| 7 BYOK AI Asistanı | `src/modules/ai` | `src/services/aiCopilotService.ts` |
| 8 Akreditasyon Kanıt Merkezi | `src/modules/accreditation` | `src/lib/accreditation/*`, `src/services/accreditationService.ts`, `public/frameworks/*.json` |

## BYOK AI

Gemini (`gemini-2.5-flash`), OpenAI (`gpt-4o-mini`), Anthropic Claude (resmi `@anthropic-ai/sdk`, tarayıcı modu, varsayılan `claude-opus-5-5`) ve yerel Ollama (`http://localhost:11434`) desteklenir. Ollama için tarayıcı erişimine izin verin: `OLLAMA_ORIGINS=* ollama serve`.
Öğrenci kimlik verileri hiçbir AI isteğine eklenmez; PUKÖ için yalnızca toplu başarı yüzdeleri gönderilir.
