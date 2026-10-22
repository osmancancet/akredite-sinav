# AkrediteSınav — Kapsamlı Analiz ve Gece Geliştirme Planı

Tarih: 23 Ekim 2026 · Durum: kullanıcı tarafından önceden onaylandı ("planla → geliştir → test et").

## 1. Mevcut durum analizi

### Güçlü yanlar
- 7 modülün tamamı çalışıyor; 13 farklı Word/Excel çıktısı ve A4 PDF baskısı uçtan uca test edildi.
- Zero-Knowledge mimarisi gerçek: AES-256-GCM, PBKDF2, CSP ile ağ kilidi, çevrimdışı yeniden yükleme.
- Yeni tasarım dili (nötr yüzey + tek vurgu, serif başlıklar, Three.js kasa görseli, ⌘K paleti).
- 205 üniversite + 197 logo; Bologna/Excel'den ders içe aktarma.

### Kullanıcı yolculuğundaki boşluklar (kim, nerede takılıyor?)

| Kim | Nerede takılıyor | Etki |
|---|---|---|
| Yeni kullanıcı | İlk açılışta demo veri geliyor; kendi kurumuna geçmenin yolu belirsiz (Veri → Temizle → tek tek ayar) | **Yüksek** — ilk 5 dakikada bırakma riski |
| Herkes | Ana ekran = Kasa ayarları; "bu dönem ne yapmalıyım, sırada ne var" görünmüyor | **Yüksek** |
| Öğretim elemanı | Sorular her dönem sıfırdan; önceki sınavın sorusunu yeniden kullanma yok | **Yüksek** |
| Öğretim elemanı | Sorular genelde Word'de yazılmış; uygulamaya tek tek kopyalamak gerekiyor | **Yüksek** |
| Öğretim elemanı | Çoktan seçmeli sınavlar optik okuyucuyla okunuyor; cevap anahtarı dosyası yok | Orta |
| Kalite komisyonu | Soru kalitesi kanıtı (madde güçlüğü, ayırt edicilik, güvenirlik) yok — ölçme-değerlendirme ölçütünün temel kanıtı | **Yüksek (vurucu)** |
| Bölüm başkanı / kalite | Program çıktıları yalnızca tek sınav içinde görülüyor; dersler × PÇ bütün tablo yok — öz değerlendirme raporunun kalbi | **Yüksek (vurucu)** |
| Öğretim elemanı | Dönem sonu ders dosyası için 8 ayrı çıktıyı tek tek indirmek gerekiyor | **Yüksek (vurucu)** |
| Gözetmen | Görevler takvime elle giriliyor | Orta |
| Herkes | Tarayıcı depolama alanını boşaltırsa veri kaybı; yedek almayı hatırlatan yok | **Yüksek (güven)** |
| Herkes | ⌘K yalnızca modülleri buluyor; ders/sınav/rubrik araması yok | Orta |
| Sınav koordinatörü | Alttan ders alan öğrenci aynı saatte iki sınava düşebiliyor (öğrenci düzeyi çakışma yok) | Orta |

## 2. Plan (öncelik sırasıyla)

### Faz A — İlk izlenim ve güven
- **A1 Genel Bakış ana sayfası:** Dönem iş akışı (Antet → Dersler → ÖÇ → Sınav → Program → Öğrenci listesi → Notlar → PUKÖ) ilerleme çubuğu ve her adım için tek tık "Devam et"; yaklaşan sınavlar; hızlı eylemler; kasa durumu.
- **A2 Kurulum sihirbazı:** İlk açılışta "Demo ile keşfet" veya "Kendi kurumumla başla". İkincisinde üniversite seçimi (logo), birim/bölüm/program, dönem ve isteğe bağlı ders içe aktarma; demo veriden temiz kasaya geçiş.
- **A3 Veri güvencesi:** `navigator.storage.persist()` ile kalıcı depolama talebi; 7 gündür yedek alınmadıysa nazik hatırlatma şeridi; son yedek tarihinin takibi.
- **A4 Global arama:** ⌘K paletinde ders, sınav, rubrik ve öğrenci araması; seçince ilgili modül ve kayıt açılır.

### Faz B — Sınav hazırlığında hız
- **B1 Soru Bankası:** Soruları bankaya kaydet; ders/ÖÇ/Bloom/tip/metin filtresi; kullanım sayısı ve son kullanım; tek tıkla aktif sınava ekleme; bir sınavın tüm sorularını bankaya alma.
- **B2 Metinden toplu soru aktarma:** Word'den yapıştırılan numaralı sorular ("1. … A) … B) …", "(10 puan)", "Cevap: C") otomatik ayrıştırılır; tip, şıklar, doğru cevap ve puan algılanır; önizlemeden sonra eklenir.
- **B3 Optik form cevap anahtarı:** A/B kitapçıkları için Excel ve düz metin (CSV) cevap anahtarı.

### Faz C — Ölçme-değerlendirme derinliği (vurucu)
- **C1 Madde analizi:** Her soru için güçlük indeksi (p), ayırt edicilik (D, üst/alt %27), madde-toplam korelasyonu (düzeltilmiş r); test için Cronbach α (KR-20 genellemesi), SEM; madde kararı (iyi / gözden geçir / düzelt / çıkar) ve yorum. Modül 6'da sekme + PUKÖ raporuna bölüm.
- **C2 Program Çıktıları Panosu:** Not girilmiş tüm sınavlardan dersler × PÇ ısı haritası, PÇ bazlı ortalama ve zayıf PÇ'ler; resmi Word raporu (öz değerlendirme eki).

### Faz D — Operasyon ve teslim
- **D1 Tek tıkla Ders Kanıt Klasörü (ZIP):** Sınav kağıdı A/B, cevap anahtarı + belirtke, kapı listesi, yoklama tutanağı, zarf etiketi, kanıt kapakları, rubrikler, PUKÖ raporu, not Excel'i — klasörlenmiş tek ZIP.
- **D2 Gözetmen takvim dosyası (.ics):** Her gözetmene ya da tümüne; Google/Outlook/Apple Takvim'e içe aktarılabilir.
- **D3 Öğrenci düzeyi çakışma denetimi:** Aynı öğrencinin aynı saatte iki sınavı varsa çakışma denetçisinde raporlanır.

### Kapsam dışı (bilinçli)
- Sunucu tarafı hesap/senkronizasyon (Zero-Knowledge kararı gereği; ayrı bir B fazı olarak konuşuldu).
- Üniversite Bologna sitelerinden otomatik çekme (CORS + CSP; yapıştırma ile çözüldü).
- Dönem içi ağırlıklı çoklu ölçme aracı birleştirme — zaman kalırsa.

## 3. Kabul ölçütleri
- `tsc`, ESLint ve `next build` hatasız.
- Hesaplamalar (madde analizi, α, PÇ panosu, soru ayrıştırıcı) bağımsız betiklerle bilinen örneklerde doğrulanır.
- Yeni her özellik için tarayıcıda uçtan uca test; mevcut test paketleri (13 çıktı, yedek, parola, çevrimdışı) gerilemesiz geçer.
- Harici ağ isteği sayısı 0 kalır.
- Push ve Cloudflare yayını kullanıcı onayına bırakılır; tüm iş yerel commit'lerde hazır bekler.
