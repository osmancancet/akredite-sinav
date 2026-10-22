# Zero-Knowledge (Sıfır Sunucu Verisi) Şifreleme Mimarisi

## 1. Kriptografik Standartlar (window.crypto.subtle)
- Anahtar Türetme (KDF): Kullanıcının Master Parolasından PBKDF2, SHA-256, 100.000 iterasyon ve rastgele 16-byte Salt ile 256-bit AES-GCM anahtarı türetilir.
- Veri Şifreleme: IndexedDB'ye yazılan her kayıt her işlemde yeni üretilen 12-byte IV ile AES-256-GCM kullanılarak şifrelenir.
- Oturum Yönetimi: Kullanıcı ilk açılışta şifre girmeden de "Otomatik Yerel Kasa Anahtarı" ile sistemi hemen kullanabilir; istediği zaman özel Master Parola belirleyebilir veya tüm kasasını `.akredite` uzantılı şifreli paket olarak indirebilir.

## 2. "Güvenliği Kanıtla" (Şüpheci Akademisyen Denetim Paneli)
Üst barda yer alan yeşil "🔒 Zero-Knowledge: Verileriniz Cihazınızdan Çıkmaz" rozetine tıklandığında açılan modalda kullanıcıya şu 3 kanıt canlı sunulur:
1. Canlı Şifreli Veri Görünümü (Ciphertext Inspector): IndexedDB'de tutulan sınav verisinin ham şifreli (Base64/Hex) halini canlı gösterir.
2. Sıfır Ağ Çıkışı Kanıtı: Uygulamanın hiçbir uzak sunucuya veri göndermediğini doğrular.
3. Uçak Modu (Offline) Testi: Kullanıcının çevrimdışı durumu canlı görmesini ve çevrimdışı çıktı alabilmesini sağlar.
