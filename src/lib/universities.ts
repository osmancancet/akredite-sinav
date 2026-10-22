// Türkiye'deki üniversiteler ve logo dizini (otomatik üretildi).
// Kaynak: tr.wikipedia "Türkiye'deki üniversiteler listesi" + Wikidata/Wikimedia Commons + kurum web siteleri.
// Logolar public/logos/ altında yerel olarak tutulur; uygulama hiçbir harici sunucudan logo indirmez.
// Logolar ilgili kurumların tescilli işaretleridir; yalnızca kurumun kendi resmi belgelerinde kullanım içindir.

export interface UniversityEntry {
  slug: string;
  name: string;
  city: string;
  type: "Devlet" | "Vakıf";
  year: string;
  logo: string | null;
}

export const UNIVERSITIES: UniversityEntry[] = [
  {
    "slug": "abdullah-gul-universitesi",
    "name": "Abdullah Gül Üniversitesi",
    "city": "Kayseri",
    "type": "Devlet",
    "year": "2010",
    "logo": "abdullah-gul-universitesi.png"
  },
  {
    "slug": "acibadem-universitesi",
    "name": "Acıbadem Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2007",
    "logo": "acibadem-universitesi.png"
  },
  {
    "slug": "adana-alparslan-turkes-bilim-ve-teknoloji-universitesi",
    "name": "Adana Alparslan Türkeş Bilim ve Teknoloji Üniversitesi",
    "city": "Adana",
    "type": "Devlet",
    "year": "2011",
    "logo": "adana-alparslan-turkes-bilim-ve-teknoloji-universitesi.png"
  },
  {
    "slug": "adiyaman-universitesi",
    "name": "Adıyaman Üniversitesi",
    "city": "Adıyaman",
    "type": "Devlet",
    "year": "2006",
    "logo": "adiyaman-universitesi.png"
  },
  {
    "slug": "afyon-kocatepe-universitesi",
    "name": "Afyon Kocatepe Üniversitesi",
    "city": "Afyonkarahisar",
    "type": "Devlet",
    "year": "1992",
    "logo": "afyon-kocatepe-universitesi.png"
  },
  {
    "slug": "afyonkarahisar-saglik-bilimleri-universitesi",
    "name": "Afyonkarahisar Sağlık Bilimleri Üniversitesi",
    "city": "Afyonkarahisar",
    "type": "Devlet",
    "year": "2018",
    "logo": "afyonkarahisar-saglik-bilimleri-universitesi.png"
  },
  {
    "slug": "akdeniz-universitesi",
    "name": "Akdeniz Üniversitesi",
    "city": "Antalya",
    "type": "Devlet",
    "year": "1982",
    "logo": "akdeniz-universitesi.png"
  },
  {
    "slug": "aksaray-universitesi",
    "name": "Aksaray Üniversitesi",
    "city": "Aksaray",
    "type": "Devlet",
    "year": "2006",
    "logo": "aksaray-universitesi.png"
  },
  {
    "slug": "alanya-alaaddin-keykubat-universitesi",
    "name": "Alanya Alaaddin Keykubat Üniversitesi",
    "city": "Antalya",
    "type": "Devlet",
    "year": "2015",
    "logo": "alanya-alaaddin-keykubat-universitesi.png"
  },
  {
    "slug": "alanya-universitesi",
    "name": "Alanya Üniversitesi",
    "city": "Antalya",
    "type": "Vakıf",
    "year": "2011",
    "logo": "alanya-universitesi.png"
  },
  {
    "slug": "altinbas-universitesi",
    "name": "Altınbaş Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2008",
    "logo": "altinbas-universitesi.png"
  },
  {
    "slug": "amasya-universitesi",
    "name": "Amasya Üniversitesi",
    "city": "Amasya",
    "type": "Devlet",
    "year": "2006",
    "logo": "amasya-universitesi.png"
  },
  {
    "slug": "anadolu-universitesi",
    "name": "Anadolu Üniversitesi",
    "city": "Eskişehir",
    "type": "Devlet",
    "year": "1982",
    "logo": "anadolu-universitesi.png"
  },
  {
    "slug": "ankara-bilim-universitesi",
    "name": "Ankara Bilim Üniversitesi",
    "city": "Ankara",
    "type": "Vakıf",
    "year": "2020",
    "logo": "ankara-bilim-universitesi.png"
  },
  {
    "slug": "ankara-haci-bayram-veli-universitesi",
    "name": "Ankara Hacı Bayram Veli Üniversitesi",
    "city": "Ankara",
    "type": "Devlet",
    "year": "2018",
    "logo": "ankara-haci-bayram-veli-universitesi.png"
  },
  {
    "slug": "ankara-medipol-universitesi",
    "name": "Ankara Medipol Üniversitesi",
    "city": "Ankara",
    "type": "Vakıf",
    "year": "2018",
    "logo": "ankara-medipol-universitesi.png"
  },
  {
    "slug": "ankara-muzik-ve-guzel-sanatlar-universitesi",
    "name": "Ankara Müzik ve Güzel Sanatlar Üniversitesi",
    "city": "Ankara",
    "type": "Devlet",
    "year": "2017",
    "logo": "ankara-muzik-ve-guzel-sanatlar-universitesi.png"
  },
  {
    "slug": "ankara-sosyal-bilimler-universitesi",
    "name": "Ankara Sosyal Bilimler Üniversitesi",
    "city": "Ankara",
    "type": "Devlet",
    "year": "2013",
    "logo": "ankara-sosyal-bilimler-universitesi.png"
  },
  {
    "slug": "ankara-yildirim-beyazit-universitesi",
    "name": "Ankara Yıldırım Beyazıt Üniversitesi",
    "city": "Ankara",
    "type": "Devlet",
    "year": "2010",
    "logo": "ankara-yildirim-beyazit-universitesi.png"
  },
  {
    "slug": "ankara-universitesi",
    "name": "Ankara Üniversitesi",
    "city": "Ankara",
    "type": "Devlet",
    "year": "1946",
    "logo": "ankara-universitesi.png"
  },
  {
    "slug": "antalya-belek-universitesi",
    "name": "Antalya Belek Üniversitesi",
    "city": "Antalya",
    "type": "Vakıf",
    "year": "2015",
    "logo": null
  },
  {
    "slug": "antalya-bilim-universitesi",
    "name": "Antalya Bilim Üniversitesi",
    "city": "Antalya",
    "type": "Vakıf",
    "year": "2010",
    "logo": "antalya-bilim-universitesi.png"
  },
  {
    "slug": "ardahan-universitesi",
    "name": "Ardahan Üniversitesi",
    "city": "Ardahan",
    "type": "Devlet",
    "year": "2008",
    "logo": "ardahan-universitesi.png"
  },
  {
    "slug": "artvin-coruh-universitesi",
    "name": "Artvin Çoruh Üniversitesi",
    "city": "Artvin",
    "type": "Devlet",
    "year": "2007",
    "logo": "artvin-coruh-universitesi.png"
  },
  {
    "slug": "ataturk-universitesi",
    "name": "Atatürk Üniversitesi",
    "city": "Erzurum",
    "type": "Devlet",
    "year": "1957",
    "logo": "ataturk-universitesi.png"
  },
  {
    "slug": "atilim-universitesi",
    "name": "Atılım Üniversitesi",
    "city": "Ankara",
    "type": "Vakıf",
    "year": "1997",
    "logo": "atilim-universitesi.png"
  },
  {
    "slug": "avrasya-universitesi",
    "name": "Avrasya Üniversitesi",
    "city": "Trabzon",
    "type": "Vakıf",
    "year": "2010",
    "logo": "avrasya-universitesi.png"
  },
  {
    "slug": "aydin-adnan-menderes-universitesi",
    "name": "Aydın Adnan Menderes Üniversitesi",
    "city": "Aydın",
    "type": "Devlet",
    "year": "1992",
    "logo": "aydin-adnan-menderes-universitesi.png"
  },
  {
    "slug": "agri-ibrahim-cecen-universitesi",
    "name": "Ağrı İbrahim Çeçen Üniversitesi",
    "city": "Ağrı",
    "type": "Devlet",
    "year": "2007",
    "logo": "agri-ibrahim-cecen-universitesi.png"
  },
  {
    "slug": "bahcesehir-universitesi",
    "name": "Bahçeşehir Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "1998",
    "logo": "bahcesehir-universitesi.png"
  },
  {
    "slug": "balikesir-universitesi",
    "name": "Balıkesir Üniversitesi",
    "city": "Balıkesir",
    "type": "Devlet",
    "year": "1992",
    "logo": "balikesir-universitesi.png"
  },
  {
    "slug": "bandirma-onyedi-eylul-universitesi",
    "name": "Bandırma Onyedi Eylül Üniversitesi",
    "city": "Balıkesir",
    "type": "Devlet",
    "year": "2015",
    "logo": "bandirma-onyedi-eylul-universitesi.png"
  },
  {
    "slug": "bartin-universitesi",
    "name": "Bartın Üniversitesi",
    "city": "Bartın",
    "type": "Devlet",
    "year": "2008",
    "logo": "bartin-universitesi.png"
  },
  {
    "slug": "batman-universitesi",
    "name": "Batman Üniversitesi",
    "city": "Batman",
    "type": "Devlet",
    "year": "2007",
    "logo": "batman-universitesi.png"
  },
  {
    "slug": "bayburt-universitesi",
    "name": "Bayburt Üniversitesi",
    "city": "Bayburt",
    "type": "Devlet",
    "year": "2008",
    "logo": "bayburt-universitesi.png"
  },
  {
    "slug": "baskent-universitesi",
    "name": "Başkent Üniversitesi",
    "city": "Ankara",
    "type": "Vakıf",
    "year": "1994",
    "logo": "baskent-universitesi.png"
  },
  {
    "slug": "beykoz-universitesi",
    "name": "Beykoz Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2016",
    "logo": "beykoz-universitesi.png"
  },
  {
    "slug": "bezmialem-vakif-universitesi",
    "name": "Bezmialem Vakıf Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2010",
    "logo": "bezmialem-vakif-universitesi.png"
  },
  {
    "slug": "bilecik-seyh-edebali-universitesi",
    "name": "Bilecik Şeyh Edebali Üniversitesi",
    "city": "Bilecik",
    "type": "Devlet",
    "year": "2007",
    "logo": "bilecik-seyh-edebali-universitesi.png"
  },
  {
    "slug": "bingol-universitesi",
    "name": "Bingöl Üniversitesi",
    "city": "Bingöl",
    "type": "Devlet",
    "year": "2007",
    "logo": "bingol-universitesi.png"
  },
  {
    "slug": "biruni-universitesi",
    "name": "Biruni Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2014",
    "logo": "biruni-universitesi.png"
  },
  {
    "slug": "bitlis-eren-universitesi",
    "name": "Bitlis Eren Üniversitesi",
    "city": "Bitlis",
    "type": "Devlet",
    "year": "2007",
    "logo": "bitlis-eren-universitesi.png"
  },
  {
    "slug": "bolu-abant-izzet-baysal-universitesi",
    "name": "Bolu Abant İzzet Baysal Üniversitesi",
    "city": "Bolu",
    "type": "Devlet",
    "year": "1992",
    "logo": "bolu-abant-izzet-baysal-universitesi.png"
  },
  {
    "slug": "bogazici-universitesi",
    "name": "Boğaziçi Üniversitesi",
    "city": "İstanbul",
    "type": "Devlet",
    "year": "1971",
    "logo": "bogazici-universitesi.png"
  },
  {
    "slug": "burdur-mehmet-akif-ersoy-universitesi",
    "name": "Burdur Mehmet Akif Ersoy Üniversitesi",
    "city": "Burdur",
    "type": "Devlet",
    "year": "2006",
    "logo": "burdur-mehmet-akif-ersoy-universitesi.png"
  },
  {
    "slug": "bursa-teknik-universitesi",
    "name": "Bursa Teknik Üniversitesi",
    "city": "Bursa",
    "type": "Devlet",
    "year": "2010",
    "logo": "bursa-teknik-universitesi.png"
  },
  {
    "slug": "bursa-uludag-universitesi",
    "name": "Bursa Uludağ Üniversitesi",
    "city": "Bursa",
    "type": "Devlet",
    "year": "1975",
    "logo": "bursa-uludag-universitesi.png"
  },
  {
    "slug": "demiroglu-bilim-universitesi",
    "name": "Demiroğlu Bilim Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2006",
    "logo": "demiroglu-bilim-universitesi.png"
  },
  {
    "slug": "dicle-universitesi",
    "name": "Dicle Üniversitesi",
    "city": "Diyarbakır",
    "type": "Devlet",
    "year": "1973",
    "logo": "dicle-universitesi.png"
  },
  {
    "slug": "dokuz-eylul-universitesi",
    "name": "Dokuz Eylül Üniversitesi",
    "city": "İzmir",
    "type": "Devlet",
    "year": "1982",
    "logo": "dokuz-eylul-universitesi.png"
  },
  {
    "slug": "dogus-universitesi",
    "name": "Doğuş Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "1997",
    "logo": "dogus-universitesi.png"
  },
  {
    "slug": "duzce-universitesi",
    "name": "Düzce Üniversitesi",
    "city": "Düzce",
    "type": "Devlet",
    "year": "2006",
    "logo": "duzce-universitesi.png"
  },
  {
    "slug": "ege-universitesi",
    "name": "Ege Üniversitesi",
    "city": "İzmir",
    "type": "Devlet",
    "year": "1955",
    "logo": "ege-universitesi.png"
  },
  {
    "slug": "erciyes-universitesi",
    "name": "Erciyes Üniversitesi",
    "city": "Kayseri",
    "type": "Devlet",
    "year": "1978",
    "logo": "erciyes-universitesi.png"
  },
  {
    "slug": "erzincan-binali-yildirim-universitesi",
    "name": "Erzincan Binali Yıldırım Üniversitesi",
    "city": "Erzincan",
    "type": "Devlet",
    "year": "2006",
    "logo": "erzincan-binali-yildirim-universitesi.png"
  },
  {
    "slug": "erzurum-teknik-universitesi",
    "name": "Erzurum Teknik Üniversitesi",
    "city": "Erzurum",
    "type": "Devlet",
    "year": "2010",
    "logo": "erzurum-teknik-universitesi.png"
  },
  {
    "slug": "eskisehir-osmangazi-universitesi",
    "name": "Eskişehir Osmangazi Üniversitesi",
    "city": "Eskişehir",
    "type": "Devlet",
    "year": "1993",
    "logo": "eskisehir-osmangazi-universitesi.png"
  },
  {
    "slug": "eskisehir-teknik-universitesi",
    "name": "Eskişehir Teknik Üniversitesi",
    "city": "Eskişehir",
    "type": "Devlet",
    "year": "2018",
    "logo": "eskisehir-teknik-universitesi.png"
  },
  {
    "slug": "fatih-sultan-mehmet-universitesi",
    "name": "Fatih Sultan Mehmet Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2010",
    "logo": "fatih-sultan-mehmet-universitesi.png"
  },
  {
    "slug": "fenerbahce-universitesi",
    "name": "Fenerbahçe Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2016",
    "logo": "fenerbahce-universitesi.png"
  },
  {
    "slug": "firat-universitesi",
    "name": "Fırat Üniversitesi",
    "city": "Elazığ",
    "type": "Devlet",
    "year": "1975",
    "logo": "firat-universitesi.png"
  },
  {
    "slug": "galatasaray-universitesi",
    "name": "Galatasaray Üniversitesi",
    "city": "İstanbul",
    "type": "Devlet",
    "year": "1992",
    "logo": "galatasaray-universitesi.png"
  },
  {
    "slug": "gazi-universitesi",
    "name": "Gazi Üniversitesi",
    "city": "Ankara",
    "type": "Devlet",
    "year": "1982",
    "logo": "gazi-universitesi.png"
  },
  {
    "slug": "gaziantep-universitesi",
    "name": "Gaziantep Üniversitesi",
    "city": "Gaziantep",
    "type": "Devlet",
    "year": "1987",
    "logo": "gaziantep-universitesi.png"
  },
  {
    "slug": "gaziantep-islam-bilim-ve-teknoloji-universitesi",
    "name": "Gaziantep İslam Bilim ve Teknoloji Üniversitesi",
    "city": "Gaziantep",
    "type": "Devlet",
    "year": "2018",
    "logo": "gaziantep-islam-bilim-ve-teknoloji-universitesi.png"
  },
  {
    "slug": "gebze-teknik-universitesi",
    "name": "Gebze Teknik Üniversitesi",
    "city": "Kocaeli",
    "type": "Devlet",
    "year": "2014",
    "logo": "gebze-teknik-universitesi.png"
  },
  {
    "slug": "giresun-universitesi",
    "name": "Giresun Üniversitesi",
    "city": "Giresun",
    "type": "Devlet",
    "year": "2006",
    "logo": "giresun-universitesi.png"
  },
  {
    "slug": "gumushane-universitesi",
    "name": "Gümüşhane Üniversitesi",
    "city": "Gümüşhane",
    "type": "Devlet",
    "year": "2008",
    "logo": "gumushane-universitesi.png"
  },
  {
    "slug": "hacettepe-universitesi",
    "name": "Hacettepe Üniversitesi",
    "city": "Ankara",
    "type": "Devlet",
    "year": "1967",
    "logo": "hacettepe-universitesi.png"
  },
  {
    "slug": "hakkari-universitesi",
    "name": "Hakkari Üniversitesi",
    "city": "Hakkâri",
    "type": "Devlet",
    "year": "2008",
    "logo": "hakkari-universitesi.png"
  },
  {
    "slug": "halic-universitesi",
    "name": "Haliç Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "1998",
    "logo": "halic-universitesi.png"
  },
  {
    "slug": "harran-universitesi",
    "name": "Harran Üniversitesi",
    "city": "Şanlıurfa",
    "type": "Devlet",
    "year": "1992",
    "logo": "harran-universitesi.png"
  },
  {
    "slug": "hasan-kalyoncu-universitesi",
    "name": "Hasan Kalyoncu Üniversitesi",
    "city": "Gaziantep",
    "type": "Vakıf",
    "year": "2008",
    "logo": "hasan-kalyoncu-universitesi.png"
  },
  {
    "slug": "hatay-mustafa-kemal-universitesi",
    "name": "Hatay Mustafa Kemal Üniversitesi",
    "city": "Hatay",
    "type": "Devlet",
    "year": "1992",
    "logo": "hatay-mustafa-kemal-universitesi.png"
  },
  {
    "slug": "hitit-universitesi",
    "name": "Hitit Üniversitesi",
    "city": "Çorum",
    "type": "Devlet",
    "year": "2006",
    "logo": "hitit-universitesi.png"
  },
  {
    "slug": "isparta-uygulamali-bilimler-universitesi",
    "name": "Isparta Uygulamalı Bilimler Üniversitesi",
    "city": "Isparta",
    "type": "Devlet",
    "year": "2018",
    "logo": null
  },
  {
    "slug": "igdir-universitesi",
    "name": "Iğdır Üniversitesi",
    "city": "Iğdır",
    "type": "Devlet",
    "year": "2008",
    "logo": "igdir-universitesi.png"
  },
  {
    "slug": "isik-universitesi",
    "name": "Işık Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "1996",
    "logo": null
  },
  {
    "slug": "jandarma-ve-sahil-guvenlik-akademisi",
    "name": "Jandarma ve Sahil Güvenlik Akademisi",
    "city": "Ankara",
    "type": "Devlet",
    "year": "2016",
    "logo": "jandarma-ve-sahil-guvenlik-akademisi.png"
  },
  {
    "slug": "kto-karatay-universitesi",
    "name": "KTO Karatay Üniversitesi",
    "city": "Konya",
    "type": "Vakıf",
    "year": "2009",
    "logo": "kto-karatay-universitesi.png"
  },
  {
    "slug": "kadir-has-universitesi",
    "name": "Kadir Has Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "1997",
    "logo": "kadir-has-universitesi.png"
  },
  {
    "slug": "kafkas-universitesi",
    "name": "Kafkas Üniversitesi",
    "city": "Kars",
    "type": "Devlet",
    "year": "1992",
    "logo": "kafkas-universitesi.png"
  },
  {
    "slug": "kahramanmaras-sutcu-imam-universitesi",
    "name": "Kahramanmaraş Sütçü İmam Üniversitesi",
    "city": "Kahramanmaraş",
    "type": "Devlet",
    "year": "1992",
    "logo": "kahramanmaras-sutcu-imam-universitesi.png"
  },
  {
    "slug": "kahramanmaras-istiklal-universitesi",
    "name": "Kahramanmaraş İstiklal Üniversitesi",
    "city": "Kahramanmaraş",
    "type": "Devlet",
    "year": "2018",
    "logo": "kahramanmaras-istiklal-universitesi.png"
  },
  {
    "slug": "kapadokya-universitesi",
    "name": "Kapadokya Üniversitesi",
    "city": "Nevşehir",
    "type": "Vakıf",
    "year": "2017",
    "logo": "kapadokya-universitesi.png"
  },
  {
    "slug": "karabuk-universitesi",
    "name": "Karabük Üniversitesi",
    "city": "Karabük",
    "type": "Devlet",
    "year": "2007",
    "logo": "karabuk-universitesi.png"
  },
  {
    "slug": "karadeniz-teknik-universitesi",
    "name": "Karadeniz Teknik Üniversitesi",
    "city": "Trabzon",
    "type": "Devlet",
    "year": "1955",
    "logo": "karadeniz-teknik-universitesi.png"
  },
  {
    "slug": "karamanoglu-mehmetbey-universitesi",
    "name": "Karamanoğlu Mehmetbey Üniversitesi",
    "city": "Karaman",
    "type": "Devlet",
    "year": "2007",
    "logo": "karamanoglu-mehmetbey-universitesi.png"
  },
  {
    "slug": "kastamonu-universitesi",
    "name": "Kastamonu Üniversitesi",
    "city": "Kastamonu",
    "type": "Devlet",
    "year": "2006",
    "logo": "kastamonu-universitesi.png"
  },
  {
    "slug": "kayseri-universitesi",
    "name": "Kayseri Üniversitesi",
    "city": "Kayseri",
    "type": "Devlet",
    "year": "2018",
    "logo": "kayseri-universitesi.png"
  },
  {
    "slug": "kilis-7-aralik-universitesi",
    "name": "Kilis 7 Aralık Üniversitesi",
    "city": "Kilis",
    "type": "Devlet",
    "year": "2007",
    "logo": null
  },
  {
    "slug": "kocaeli-saglik-ve-teknoloji-universitesi",
    "name": "Kocaeli Sağlık ve Teknoloji Üniversitesi",
    "city": "Kocaeli",
    "type": "Vakıf",
    "year": "2020",
    "logo": "kocaeli-saglik-ve-teknoloji-universitesi.png"
  },
  {
    "slug": "kocaeli-universitesi",
    "name": "Kocaeli Üniversitesi",
    "city": "Kocaeli",
    "type": "Devlet",
    "year": "1992",
    "logo": "kocaeli-universitesi.png"
  },
  {
    "slug": "konya-gida-ve-tarim-universitesi",
    "name": "Konya Gıda ve Tarım Üniversitesi",
    "city": "Konya",
    "type": "Vakıf",
    "year": "2013",
    "logo": "konya-gida-ve-tarim-universitesi.png"
  },
  {
    "slug": "konya-teknik-universitesi",
    "name": "Konya Teknik Üniversitesi",
    "city": "Konya",
    "type": "Devlet",
    "year": "2018",
    "logo": "konya-teknik-universitesi.png"
  },
  {
    "slug": "koc-universitesi",
    "name": "Koç Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "1993",
    "logo": "koc-universitesi.png"
  },
  {
    "slug": "kutahya-dumlupinar-universitesi",
    "name": "Kütahya Dumlupınar Üniversitesi",
    "city": "Kütahya",
    "type": "Devlet",
    "year": "1992",
    "logo": null
  },
  {
    "slug": "kutahya-saglik-bilimleri-universitesi",
    "name": "Kütahya Sağlık Bilimleri Üniversitesi",
    "city": "Kütahya",
    "type": "Devlet",
    "year": "2018",
    "logo": "kutahya-saglik-bilimleri-universitesi.png"
  },
  {
    "slug": "kirklareli-universitesi",
    "name": "Kırklareli Üniversitesi",
    "city": "Kırklareli",
    "type": "Devlet",
    "year": "2007",
    "logo": "kirklareli-universitesi.png"
  },
  {
    "slug": "kirikkale-universitesi",
    "name": "Kırıkkale Üniversitesi",
    "city": "Kırıkkale",
    "type": "Devlet",
    "year": "1992",
    "logo": "kirikkale-universitesi.png"
  },
  {
    "slug": "kirsehir-ahi-evran-universitesi",
    "name": "Kırşehir Ahi Evran Üniversitesi",
    "city": "Kırşehir",
    "type": "Devlet",
    "year": "2006",
    "logo": "kirsehir-ahi-evran-universitesi.png"
  },
  {
    "slug": "lokman-hekim-universitesi",
    "name": "Lokman Hekim Üniversitesi",
    "city": "Ankara",
    "type": "Vakıf",
    "year": "2018",
    "logo": "lokman-hekim-universitesi.png"
  },
  {
    "slug": "mef-universitesi",
    "name": "MEF Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2012",
    "logo": "mef-universitesi.png"
  },
  {
    "slug": "malatya-turgut-ozal-universitesi",
    "name": "Malatya Turgut Özal Üniversitesi",
    "city": "Malatya",
    "type": "Devlet",
    "year": "2018",
    "logo": "malatya-turgut-ozal-universitesi.png"
  },
  {
    "slug": "maltepe-universitesi",
    "name": "Maltepe Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "1997",
    "logo": "maltepe-universitesi.png"
  },
  {
    "slug": "manisa-celal-bayar-universitesi",
    "name": "Manisa Celal Bayar Üniversitesi",
    "city": "Manisa",
    "type": "Devlet",
    "year": "1992",
    "logo": "manisa-celal-bayar-universitesi.png"
  },
  {
    "slug": "mardin-artuklu-universitesi",
    "name": "Mardin Artuklu Üniversitesi",
    "city": "Mardin",
    "type": "Devlet",
    "year": "2007",
    "logo": "mardin-artuklu-universitesi.png"
  },
  {
    "slug": "marmara-universitesi",
    "name": "Marmara Üniversitesi",
    "city": "İstanbul",
    "type": "Devlet",
    "year": "1982",
    "logo": "marmara-universitesi.png"
  },
  {
    "slug": "mersin-universitesi",
    "name": "Mersin Üniversitesi",
    "city": "Mersin",
    "type": "Devlet",
    "year": "1992",
    "logo": "mersin-universitesi.png"
  },
  {
    "slug": "milli-savunma-universitesi",
    "name": "Milli Savunma Üniversitesi",
    "city": "İstanbul",
    "type": "Devlet",
    "year": "2016",
    "logo": "milli-savunma-universitesi.png"
  },
  {
    "slug": "mimar-sinan-guzel-sanatlar-universitesi",
    "name": "Mimar Sinan Güzel Sanatlar Üniversitesi",
    "city": "İstanbul",
    "type": "Devlet",
    "year": "1982",
    "logo": "mimar-sinan-guzel-sanatlar-universitesi.png"
  },
  {
    "slug": "mudanya-universitesi",
    "name": "Mudanya Üniversitesi",
    "city": "Bursa",
    "type": "Vakıf",
    "year": "2022",
    "logo": "mudanya-universitesi.png"
  },
  {
    "slug": "munzur-universitesi",
    "name": "Munzur Üniversitesi",
    "city": "Tunceli",
    "type": "Devlet",
    "year": "2008",
    "logo": "munzur-universitesi.png"
  },
  {
    "slug": "mugla-sitki-kocman-universitesi",
    "name": "Muğla Sıtkı Koçman Üniversitesi",
    "city": "Muğla",
    "type": "Devlet",
    "year": "1992",
    "logo": "mugla-sitki-kocman-universitesi.png"
  },
  {
    "slug": "mus-alparslan-universitesi",
    "name": "Muş Alparslan Üniversitesi",
    "city": "Muş",
    "type": "Devlet",
    "year": "2007",
    "logo": "mus-alparslan-universitesi.png"
  },
  {
    "slug": "necmettin-erbakan-universitesi",
    "name": "Necmettin Erbakan Üniversitesi",
    "city": "Konya",
    "type": "Devlet",
    "year": "2010",
    "logo": "necmettin-erbakan-universitesi.png"
  },
  {
    "slug": "nevsehir-haci-bektas-veli-universitesi",
    "name": "Nevşehir Hacı Bektaş Veli Üniversitesi",
    "city": "Nevşehir",
    "type": "Devlet",
    "year": "2007",
    "logo": "nevsehir-haci-bektas-veli-universitesi.png"
  },
  {
    "slug": "nigde-omer-halisdemir-universitesi",
    "name": "Niğde Ömer Halisdemir Üniversitesi",
    "city": "Niğde",
    "type": "Devlet",
    "year": "1992",
    "logo": "nigde-omer-halisdemir-universitesi.png"
  },
  {
    "slug": "nuh-naci-yazgan-universitesi",
    "name": "Nuh Naci Yazgan Üniversitesi",
    "city": "Kayseri",
    "type": "Vakıf",
    "year": "2009",
    "logo": "nuh-naci-yazgan-universitesi.png"
  },
  {
    "slug": "ondokuz-mayis-universitesi",
    "name": "Ondokuz Mayıs Üniversitesi",
    "city": "Samsun",
    "type": "Devlet",
    "year": "1975",
    "logo": "ondokuz-mayis-universitesi.png"
  },
  {
    "slug": "ordu-universitesi",
    "name": "Ordu Üniversitesi",
    "city": "Ordu",
    "type": "Devlet",
    "year": "2006",
    "logo": "ordu-universitesi.png"
  },
  {
    "slug": "orta-dogu-teknik-universitesi",
    "name": "Orta Doğu Teknik Üniversitesi",
    "city": "Ankara",
    "type": "Devlet",
    "year": "1959",
    "logo": "orta-dogu-teknik-universitesi.png"
  },
  {
    "slug": "osmaniye-korkut-ata-universitesi",
    "name": "Osmaniye Korkut Ata Üniversitesi",
    "city": "Osmaniye",
    "type": "Devlet",
    "year": "2007",
    "logo": "osmaniye-korkut-ata-universitesi.png"
  },
  {
    "slug": "ostim-teknik-universitesi",
    "name": "Ostim Teknik Üniversitesi",
    "city": "Ankara",
    "type": "Vakıf",
    "year": "2017",
    "logo": "ostim-teknik-universitesi.png"
  },
  {
    "slug": "pamukkale-universitesi",
    "name": "Pamukkale Üniversitesi",
    "city": "Denizli",
    "type": "Devlet",
    "year": "1992",
    "logo": "pamukkale-universitesi.png"
  },
  {
    "slug": "piri-reis-universitesi",
    "name": "Piri Reis Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2008",
    "logo": "piri-reis-universitesi.png"
  },
  {
    "slug": "polis-akademisi",
    "name": "Polis Akademisi",
    "city": "Ankara",
    "type": "Devlet",
    "year": "1937",
    "logo": "polis-akademisi.png"
  },
  {
    "slug": "recep-tayyip-erdogan-universitesi",
    "name": "Recep Tayyip Erdoğan Üniversitesi",
    "city": "Rize",
    "type": "Devlet",
    "year": "2006",
    "logo": "recep-tayyip-erdogan-universitesi.png"
  },
  {
    "slug": "sabanci-universitesi",
    "name": "Sabancı Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "1996",
    "logo": "sabanci-universitesi.png"
  },
  {
    "slug": "sakarya-uygulamali-bilimler-universitesi",
    "name": "Sakarya Uygulamalı Bilimler Üniversitesi",
    "city": "Sakarya",
    "type": "Devlet",
    "year": "2018",
    "logo": "sakarya-uygulamali-bilimler-universitesi.png"
  },
  {
    "slug": "sakarya-universitesi",
    "name": "Sakarya Üniversitesi",
    "city": "Sakarya",
    "type": "Devlet",
    "year": "1992",
    "logo": "sakarya-universitesi.png"
  },
  {
    "slug": "samsun-universitesi",
    "name": "Samsun Üniversitesi",
    "city": "Samsun",
    "type": "Devlet",
    "year": "2018",
    "logo": "samsun-universitesi.png"
  },
  {
    "slug": "sanko-universitesi",
    "name": "Sanko Üniversitesi",
    "city": "Gaziantep",
    "type": "Vakıf",
    "year": "2013",
    "logo": "sanko-universitesi.png"
  },
  {
    "slug": "saglik-bilimleri-universitesi",
    "name": "Sağlık Bilimleri Üniversitesi",
    "city": "İstanbul",
    "type": "Devlet",
    "year": "2015",
    "logo": null
  },
  {
    "slug": "selcuk-universitesi",
    "name": "Selçuk Üniversitesi",
    "city": "Konya",
    "type": "Devlet",
    "year": "1975",
    "logo": "selcuk-universitesi.png"
  },
  {
    "slug": "siirt-universitesi",
    "name": "Siirt Üniversitesi",
    "city": "Siirt",
    "type": "Devlet",
    "year": "2007",
    "logo": "siirt-universitesi.png"
  },
  {
    "slug": "sinop-universitesi",
    "name": "Sinop Üniversitesi",
    "city": "Sinop",
    "type": "Devlet",
    "year": "2007",
    "logo": "sinop-universitesi.png"
  },
  {
    "slug": "sivas-bilim-ve-teknoloji-universitesi",
    "name": "Sivas Bilim ve Teknoloji Üniversitesi",
    "city": "Sivas",
    "type": "Devlet",
    "year": "2018",
    "logo": "sivas-bilim-ve-teknoloji-universitesi.png"
  },
  {
    "slug": "sivas-cumhuriyet-universitesi",
    "name": "Sivas Cumhuriyet Üniversitesi",
    "city": "Sivas",
    "type": "Devlet",
    "year": "1974",
    "logo": "sivas-cumhuriyet-universitesi.png"
  },
  {
    "slug": "suleyman-demirel-universitesi",
    "name": "Süleyman Demirel Üniversitesi",
    "city": "Isparta",
    "type": "Devlet",
    "year": "1992",
    "logo": "suleyman-demirel-universitesi.png"
  },
  {
    "slug": "ted-universitesi",
    "name": "TED Üniversitesi",
    "city": "Ankara",
    "type": "Vakıf",
    "year": "2009",
    "logo": "ted-universitesi.png"
  },
  {
    "slug": "tobb-ekonomi-ve-teknoloji-universitesi",
    "name": "TOBB Ekonomi ve Teknoloji Üniversitesi",
    "city": "Ankara",
    "type": "Vakıf",
    "year": "2003",
    "logo": "tobb-ekonomi-ve-teknoloji-universitesi.png"
  },
  {
    "slug": "tarsus-universitesi",
    "name": "Tarsus Üniversitesi",
    "city": "Mersin",
    "type": "Devlet",
    "year": "2018",
    "logo": "tarsus-universitesi.png"
  },
  {
    "slug": "tekirdag-namik-kemal-universitesi",
    "name": "Tekirdağ Namık Kemal Üniversitesi",
    "city": "Tekirdağ",
    "type": "Devlet",
    "year": "2006",
    "logo": "tekirdag-namik-kemal-universitesi.png"
  },
  {
    "slug": "tokat-gaziosmanpasa-universitesi",
    "name": "Tokat Gaziosmanpaşa Üniversitesi",
    "city": "Tokat",
    "type": "Devlet",
    "year": "1992",
    "logo": "tokat-gaziosmanpasa-universitesi.png"
  },
  {
    "slug": "toros-universitesi",
    "name": "Toros Üniversitesi",
    "city": "Mersin",
    "type": "Vakıf",
    "year": "2009",
    "logo": "toros-universitesi.png"
  },
  {
    "slug": "trabzon-universitesi",
    "name": "Trabzon Üniversitesi",
    "city": "Trabzon",
    "type": "Devlet",
    "year": "2018",
    "logo": "trabzon-universitesi.png"
  },
  {
    "slug": "trakya-universitesi",
    "name": "Trakya Üniversitesi",
    "city": "Edirne",
    "type": "Devlet",
    "year": "1982",
    "logo": "trakya-universitesi.png"
  },
  {
    "slug": "turk-hava-kurumu-universitesi",
    "name": "Türk Hava Kurumu Üniversitesi",
    "city": "Ankara",
    "type": "Vakıf",
    "year": "2011",
    "logo": "turk-hava-kurumu-universitesi.png"
  },
  {
    "slug": "turk-alman-universitesi",
    "name": "Türk-Alman Üniversitesi",
    "city": "İstanbul",
    "type": "Devlet",
    "year": "2010",
    "logo": "turk-alman-universitesi.png"
  },
  {
    "slug": "turk-japon-bilim-ve-teknoloji-universitesi",
    "name": "Türk-Japon Bilim ve Teknoloji Üniversitesi",
    "city": "İstanbul",
    "type": "Devlet",
    "year": "2017",
    "logo": "turk-japon-bilim-ve-teknoloji-universitesi.png"
  },
  {
    "slug": "ufuk-universitesi",
    "name": "Ufuk Üniversitesi",
    "city": "Ankara",
    "type": "Vakıf",
    "year": "1999",
    "logo": "ufuk-universitesi.png"
  },
  {
    "slug": "usak-universitesi",
    "name": "Uşak Üniversitesi",
    "city": "Uşak",
    "type": "Devlet",
    "year": "2006",
    "logo": "usak-universitesi.png"
  },
  {
    "slug": "van-yuzuncu-yil-universitesi",
    "name": "Van Yüzüncü Yıl Üniversitesi",
    "city": "Van",
    "type": "Devlet",
    "year": "1982",
    "logo": "van-yuzuncu-yil-universitesi.png"
  },
  {
    "slug": "yalova-universitesi",
    "name": "Yalova Üniversitesi",
    "city": "Yalova",
    "type": "Devlet",
    "year": "2008",
    "logo": "yalova-universitesi.png"
  },
  {
    "slug": "yasar-universitesi",
    "name": "Yaşar Üniversitesi",
    "city": "İzmir",
    "type": "Vakıf",
    "year": "2001",
    "logo": "yasar-universitesi.png"
  },
  {
    "slug": "yeditepe-universitesi",
    "name": "Yeditepe Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "1996",
    "logo": "yeditepe-universitesi.png"
  },
  {
    "slug": "yozgat-bozok-universitesi",
    "name": "Yozgat Bozok Üniversitesi",
    "city": "Yozgat",
    "type": "Devlet",
    "year": "2006",
    "logo": "yozgat-bozok-universitesi.png"
  },
  {
    "slug": "yuksek-ihtisas-universitesi",
    "name": "Yüksek İhtisas Üniversitesi",
    "city": "Ankara",
    "type": "Vakıf",
    "year": "2013",
    "logo": "yuksek-ihtisas-universitesi.png"
  },
  {
    "slug": "yildiz-teknik-universitesi",
    "name": "Yıldız Teknik Üniversitesi",
    "city": "İstanbul",
    "type": "Devlet",
    "year": "1982",
    "logo": "yildiz-teknik-universitesi.png"
  },
  {
    "slug": "zonguldak-bulent-ecevit-universitesi",
    "name": "Zonguldak Bülent Ecevit Üniversitesi",
    "city": "Zonguldak",
    "type": "Devlet",
    "year": "1992",
    "logo": "zonguldak-bulent-ecevit-universitesi.png"
  },
  {
    "slug": "canakkale-onsekiz-mart-universitesi",
    "name": "Çanakkale Onsekiz Mart Üniversitesi",
    "city": "Çanakkale",
    "type": "Devlet",
    "year": "1992",
    "logo": "canakkale-onsekiz-mart-universitesi.png"
  },
  {
    "slug": "cankaya-universitesi",
    "name": "Çankaya Üniversitesi",
    "city": "Ankara",
    "type": "Vakıf",
    "year": "1997",
    "logo": "cankaya-universitesi.png"
  },
  {
    "slug": "cankiri-karatekin-universitesi",
    "name": "Çankırı Karatekin Üniversitesi",
    "city": "Çankırı",
    "type": "Devlet",
    "year": "2007",
    "logo": "cankiri-karatekin-universitesi.png"
  },
  {
    "slug": "cag-universitesi",
    "name": "Çağ Üniversitesi",
    "city": "Mersin",
    "type": "Vakıf",
    "year": "1997",
    "logo": "cag-universitesi.png"
  },
  {
    "slug": "cukurova-universitesi",
    "name": "Çukurova Üniversitesi",
    "city": "Adana",
    "type": "Devlet",
    "year": "1973",
    "logo": "cukurova-universitesi.png"
  },
  {
    "slug": "ozyegin-universitesi",
    "name": "Özyeğin Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2007",
    "logo": "ozyegin-universitesi.png"
  },
  {
    "slug": "uskudar-universitesi",
    "name": "Üsküdar Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2011",
    "logo": "uskudar-universitesi.png"
  },
  {
    "slug": "ibn-haldun-universitesi",
    "name": "İbn Haldun Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2015",
    "logo": "ibn-haldun-universitesi.png"
  },
  {
    "slug": "ihsan-dogramaci-bilkent-universitesi",
    "name": "İhsan Doğramacı Bilkent Üniversitesi",
    "city": "Ankara",
    "type": "Vakıf",
    "year": "1984",
    "logo": "ihsan-dogramaci-bilkent-universitesi.png"
  },
  {
    "slug": "inonu-universitesi",
    "name": "İnönü Üniversitesi",
    "city": "Malatya",
    "type": "Devlet",
    "year": "2021",
    "logo": "inonu-universitesi.png"
  },
  {
    "slug": "iskenderun-teknik-universitesi",
    "name": "İskenderun Teknik Üniversitesi",
    "city": "Hatay",
    "type": "Devlet",
    "year": "2015",
    "logo": "iskenderun-teknik-universitesi.png"
  },
  {
    "slug": "istanbul-29-mayis-universitesi",
    "name": "İstanbul 29 Mayıs Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2010",
    "logo": "istanbul-29-mayis-universitesi.png"
  },
  {
    "slug": "istanbul-arel-universitesi",
    "name": "İstanbul Arel Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2007",
    "logo": "istanbul-arel-universitesi.png"
  },
  {
    "slug": "istanbul-atlas-universitesi",
    "name": "İstanbul Atlas Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2018",
    "logo": "istanbul-atlas-universitesi.png"
  },
  {
    "slug": "istanbul-aydin-universitesi",
    "name": "İstanbul Aydın Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2007",
    "logo": "istanbul-aydin-universitesi.png"
  },
  {
    "slug": "istanbul-beykent-universitesi",
    "name": "İstanbul Beykent Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "1997",
    "logo": "istanbul-beykent-universitesi.png"
  },
  {
    "slug": "istanbul-bilgi-universitesi",
    "name": "İstanbul Bilgi Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "1996",
    "logo": "istanbul-bilgi-universitesi.png"
  },
  {
    "slug": "istanbul-esenyurt-universitesi",
    "name": "İstanbul Esenyurt Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2013",
    "logo": "istanbul-esenyurt-universitesi.png"
  },
  {
    "slug": "istanbul-galata-universitesi",
    "name": "İstanbul Galata Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2019",
    "logo": "istanbul-galata-universitesi.png"
  },
  {
    "slug": "istanbul-gedik-universitesi",
    "name": "İstanbul Gedik Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2010",
    "logo": null
  },
  {
    "slug": "istanbul-gelisim-universitesi",
    "name": "İstanbul Gelişim Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2011",
    "logo": "istanbul-gelisim-universitesi.png"
  },
  {
    "slug": "istanbul-kent-universitesi",
    "name": "İstanbul Kent Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2016",
    "logo": "istanbul-kent-universitesi.png"
  },
  {
    "slug": "istanbul-kultur-universitesi",
    "name": "İstanbul Kültür Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "1997",
    "logo": "istanbul-kultur-universitesi.png"
  },
  {
    "slug": "istanbul-medeniyet-universitesi",
    "name": "İstanbul Medeniyet Üniversitesi",
    "city": "İstanbul",
    "type": "Devlet",
    "year": "2010",
    "logo": "istanbul-medeniyet-universitesi.png"
  },
  {
    "slug": "istanbul-medipol-universitesi",
    "name": "İstanbul Medipol Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2019",
    "logo": "istanbul-medipol-universitesi.png"
  },
  {
    "slug": "istanbul-nisantasi-universitesi",
    "name": "İstanbul Nişantaşı Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2009",
    "logo": "istanbul-nisantasi-universitesi.png"
  },
  {
    "slug": "istanbul-okan-universitesi",
    "name": "İstanbul Okan Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "1999",
    "logo": "istanbul-okan-universitesi.png"
  },
  {
    "slug": "istanbul-rumeli-universitesi",
    "name": "İstanbul Rumeli Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2015",
    "logo": null
  },
  {
    "slug": "istanbul-sabahattin-zaim-universitesi",
    "name": "İstanbul Sabahattin Zaim Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2010",
    "logo": "istanbul-sabahattin-zaim-universitesi.png"
  },
  {
    "slug": "istanbul-saglik-ve-teknoloji-universitesi",
    "name": "İstanbul Sağlık ve Teknoloji Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2018",
    "logo": "istanbul-saglik-ve-teknoloji-universitesi.png"
  },
  {
    "slug": "istanbul-teknik-universitesi",
    "name": "İstanbul Teknik Üniversitesi",
    "city": "İstanbul",
    "type": "Devlet",
    "year": "1944",
    "logo": "istanbul-teknik-universitesi.png"
  },
  {
    "slug": "istanbul-ticaret-universitesi",
    "name": "İstanbul Ticaret Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2001",
    "logo": "istanbul-ticaret-universitesi.png"
  },
  {
    "slug": "istanbul-topkapi-universitesi",
    "name": "İstanbul Topkapı Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2016",
    "logo": "istanbul-topkapi-universitesi.png"
  },
  {
    "slug": "istanbul-yeni-yuzyil-universitesi",
    "name": "İstanbul Yeni Yüzyıl Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2009",
    "logo": "istanbul-yeni-yuzyil-universitesi.png"
  },
  {
    "slug": "istanbul-universitesi",
    "name": "İstanbul Üniversitesi",
    "city": "İstanbul",
    "type": "Devlet",
    "year": "1933",
    "logo": "istanbul-universitesi.png"
  },
  {
    "slug": "istanbul-universitesi-cerrahpasa",
    "name": "İstanbul Üniversitesi-Cerrahpaşa",
    "city": "İstanbul",
    "type": "Devlet",
    "year": "2018",
    "logo": "istanbul-universitesi-cerrahpasa.png"
  },
  {
    "slug": "istinye-universitesi",
    "name": "İstinye Üniversitesi",
    "city": "İstanbul",
    "type": "Vakıf",
    "year": "2015",
    "logo": "istinye-universitesi.png"
  },
  {
    "slug": "izmir-bakircay-universitesi",
    "name": "İzmir Bakırçay Üniversitesi",
    "city": "İzmir",
    "type": "Devlet",
    "year": "2016",
    "logo": "izmir-bakircay-universitesi.png"
  },
  {
    "slug": "izmir-demokrasi-universitesi",
    "name": "İzmir Demokrasi Üniversitesi",
    "city": "İzmir",
    "type": "Devlet",
    "year": "2016",
    "logo": "izmir-demokrasi-universitesi.png"
  },
  {
    "slug": "izmir-ekonomi-universitesi",
    "name": "İzmir Ekonomi Üniversitesi",
    "city": "İzmir",
    "type": "Vakıf",
    "year": "2001",
    "logo": "izmir-ekonomi-universitesi.png"
  },
  {
    "slug": "izmir-katip-celebi-universitesi",
    "name": "İzmir Kâtip Çelebi Üniversitesi",
    "city": "İzmir",
    "type": "Devlet",
    "year": "2010",
    "logo": "izmir-katip-celebi-universitesi.png"
  },
  {
    "slug": "izmir-tinaztepe-universitesi",
    "name": "İzmir Tınaztepe Üniversitesi",
    "city": "İzmir",
    "type": "Vakıf",
    "year": "2018",
    "logo": "izmir-tinaztepe-universitesi.png"
  },
  {
    "slug": "izmir-yuksek-teknoloji-enstitusu",
    "name": "İzmir Yüksek Teknoloji Enstitüsü",
    "city": "İzmir",
    "type": "Devlet",
    "year": "1992",
    "logo": "izmir-yuksek-teknoloji-enstitusu.png"
  },
  {
    "slug": "sirnak-universitesi",
    "name": "Şırnak Üniversitesi",
    "city": "Şırnak",
    "type": "Devlet",
    "year": "2008",
    "logo": "sirnak-universitesi.png"
  }
];
