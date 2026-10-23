# Araştırma görevi: Türk yükseköğretim akreditasyon ölçütleri ve kanıt beklentileri

Amaç: Bir akademik yazılımda "seçilen akreditasyona göre gerekli kanıt dosyaları ve kanıt ekleme yerleri" yapısını kurmak.
Kullanıcı açıkça "uydurma olmasın" dedi. Bu yüzden:

1. YALNIZCA birincil kaynak kullan: kuruluşun kendi resmi web sitesi (ölçütler/standartlar belgesi, öz değerlendirme raporu (ÖDR) kılavuzu/şablonu, değerlendirme süreci belgesi) ve yokak.gov.tr. Vikipedi, haber siteleri, üniversite sayfaları kanıt kaynağı DEĞİLDİR (yalnızca doğru belgeye ulaşmak için ipucu olabilir).
2. Her ölçüt ve her kanıt kalemi için kaynak URL'si ve mümkünse belge adı/sürüm/tarih/bölüm (sayfa) ver.
3. Kanıtları ikiye ayır:
   - "explicit": belge bu kanıtı/dokümanı açıkça istiyor veya ÖDR şablonunda/ek listesinde adıyla geçiyor (kısa bir alıntı ekle).
   - "derived": belgede açıkça adı geçmiyor ama ölçütün metni doğrudan bunu gerektiriyor (ör. ölçüt "program eğitim amaçları ilan edilmelidir" diyorsa → "ilan edildiğini gösteren web sayfası/yayın"). derived kalemlerde hangi ölçüt cümlesine dayandığını yaz.
   Kaynağa dayanmayan hiçbir kalem ekleme.
4. Bir kuruluşun ölçüt belgesine erişemiyorsan (site kapalı, PDF okunamıyor, giriş gerekiyor) status: "not_found" yaz ve ne denediğini notes'a yaz. TAHMİN ETME.
5. Ölçüt başlıklarını ve alt ölçüt metinlerini mümkün olduğunca belgedeki Türkçe ifadeyle (birebir veya çok yakın) yaz. Alt ölçüt sayısını eksiksiz ver.
6. Program akreditasyonunda birden çok "ölçüt seti" varsa (ör. genel ölçütler + disipline özgü ölçütler) ikisini de ver; disipline özgü olanları ayrı işaretle.

PDF okumak için WebFetch kullan; o işe yaramazsa curl ile indirip `python3 -I` ile metin çıkarmayı deneyebilirsin (pdftotext/PyPDF2 yoksa WebFetch'e farklı sayfa/offset ile tekrar dene). İndirdiğin dosyaları /tmp/akr-research/raw/<kuruluş>/ altına koy.

## Çıktı
Sonucu şu dosyaya JSON olarak YAZ (Write aracı ile): /tmp/akr-research/<GRUP>.json
Şema:
{
  "group": "<GRUP>",
  "bodies": [
    {
      "code": "MÜDEK",
      "name": "Tam resmi ad",
      "scope": "Hangi programları akredite eder (kısa)",
      "website": "https://...",
      "status": "verified" | "partial" | "not_found",
      "standardDocument": { "title": "...", "version": "...", "date": "...", "url": "..." },
      "selfStudyReport": { "title": "...", "url": "...", "sections": ["..."], "requiredAppendices": ["..."] },
      "cycle": "Akreditasyon süresi/döngüsü belgede yazıyorsa (ör. 5 yıl, ara değerlendirme) + kaynak",
      "criteria": [
        {
          "id": "Ölçüt 1",
          "title": "Öğrenciler",
          "disciplineSpecific": false,
          "subcriteria": [ { "id": "1.1", "text": "...", "source": "url (sayfa/bölüm)" } ],
          "evidence": [
            { "title": "Kısa kanıt adı (Türkçe)", "kind": "explicit" | "derived", "basis": "alıntı veya dayandığı ölçüt cümlesi", "source": "url" }
          ]
        }
      ],
      "notes": "Erişim sorunları, belirsizlikler, sürüm uyarıları"
    }
  ]
}
Son mesajında: her kuruluş için status ve ölçüt/kanıt sayılarını içeren kısa bir özet ver (JSON'u tekrar yazma).
