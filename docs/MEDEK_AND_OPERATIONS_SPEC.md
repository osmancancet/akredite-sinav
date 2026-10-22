# MEDEK / MÜDEK / YÖKAK Akreditasyon ve Sınav Operasyon Standartları

## 1. Öğrenme Çıktısı (ÖÇ) ve Belirtke Tablosu Matematiği
- Bir dersin N adet Öğrenme Çıktısı (ÖÇ-1, ÖÇ-2, ..., ÖÇ-N) bulunur.
- Sınavdaki her soru (S_i) en az bir ÖÇ_k ve bir Bloom Taksonomisi basamağı (Hatırlama, Anlama, Uygulama, Analiz, Değerlendirme, Yaratma) ile eşleştirilir.
- Belirtke Tablosu Matrisi: Satırlarda Sorular, sütunlarda Öğrenme Çıktıları, Puan ve Bloom düzeyi yer alır. Her bir ÖÇ'nin sınav içindeki toplam puan ağırlığı ve yüzdesi otomatik hesaplanır. Kapsanmayan ÖÇ varsa arayüzde uyarı verilir.

## 2. Sınav Sonu ÖÇ ve PÇ (Program Çıktısı) Başarı Hesaplama Formülleri
- M öğrencinin girdiği bir sınavda, i. sorunun maksimum puanı P_i, sınıfın i. sorudan aldığı ortalama puan X_i olsun.
- Belirli bir ÖÇ_k'yi ölçen sorular kümesi Q_k ise, ÖÇ_k gerçekleşme yüzdesi:
  Başarı(ÖÇ_k)% = ( Toplam_{i in Q_k}(X_i) / Toplam_{i in Q_k}(P_i) ) * 100
- ÖÇ - PÇ İlişki Matrisi: Her ÖÇ_k, bölümün Program Çıktılarına (PÇ-1 .. PÇ-12) 0 (İlişkisiz) ile 5 (Çok Yüksek Katkı) arasında bir ağırlıkla (W_{k,j}) bağlanır.
- PÇ_j Sağlanma Oranı:
  Başarı(PÇ_j)% = Toplam_{k=1..N}( Başarı(ÖÇ_k)% * W_{k,j} ) / Toplam_{k=1..N}( W_{k,j} )
- PUKÖ Kuralı: Kurumun belirlediği hedef eşik değerin (varsayılan %60) altında kalan her ÖÇ_k için sistem otomatik olarak "İyileştirme Gerekli" bayrağı açar ve PUKÖ raporunda Kök Neden + Gelecek Dönem Eylem Planı oluşturur.

## 3. Çakışmasız Sınav Programı ve Gözetmen Dağıtım Kuralları
### Kesin Kısıtlar (Hard Constraints):
1. Sınıf Çakışması: Aynı programın aynı sınıfına (Örn: 1. Sınıf) aynı gün ve saat diliminde iki sınav konulamaz.
2. Derslik Kapasitesi ve Bölme: Bir derslikte aynı saatte iki farklı sınav yapılamaz. Öğrenci sayısı tek derslik kapasitesini aşıyorsa sistem dersi otomatik olarak birden fazla dersliğe (Örn: Amfi-1 + D-102) böler.
3. Gözetmen Çakışması ve Kısıtları: Bir gözetmen aynı saatte iki sınıfa atanamaz ve "Müsait Değil" olarak işaretlediği saatlere görev yazılamaz.

### Yumuşak Kısıtlar (Soft Constraints):
1. Öğrenci Yorgunluk Kuralı: Aynı sınıfa bir günde en fazla 2 sınav konulmalı, mümkünse aralarında boş saat bırakılmalıdır.
2. Adil Gözetmen Dağıtımı: Tüm gözetmenlerin toplam görev sayısı arasındaki standart sapma minimize edilmeli ve arayüzde "Adalet Skoru (%)" olarak gösterilmelidir.

## 4. Kapı Listesi, Kelebek Sistemi ve Yoklama Tutanağı Kuralları (KVKK Uyumlu)
- Öğrenciler atanmış dersliklere kapasite oranında "Rastgele Karıştırarak (Kelebek/Anti-Kopya)" veya "Numara Sıralı" dağıtılır ve her öğrenciye Sıra No (1..K) verilir.
- Kapı Listesi Çıktısı: İsteğe bağlı KVKK maskeleme seçeneği sunar (Örn: 230101*** - A*** Y*** veya tam açık).
- Yoklama Tutanağı Çıktısı: Her derslik için ayrı sayfada; üstte Sınav/Ders/Derslik/Tarih/Saat anteti, ortada "Sıra No | Öğrenci No | Adı Soyadı | Kitapçık (A/B) | İmza" tablosu, en altta ise "Sınava Giren: [...] | Girmeyen: [...] | Teslim Edilen Evrak: [...] | Gözetmen İmza | Ders Sorumlusu İmza" resmi tutanak bloğu yer alır.
