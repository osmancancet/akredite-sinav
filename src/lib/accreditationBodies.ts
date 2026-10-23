// YÖKAK tarafından tescil süresi devam eden ulusal akreditasyon kuruluşları.
// Kaynak: https://www.yokak.gov.tr/tescil-suresi-devam-eden-akreditasyon-kuruluslari/ (erişim: 23.10.2026)
// "validUntil" sayfadaki en son tescil dönemi bitiş tarihidir (YYYY-MM-DD).

export const YOKAK_REGISTRY_URL = "https://www.yokak.gov.tr/tescil-suresi-devam-eden-akreditasyon-kuruluslari/";
export const YOKAK_REGISTRY_ACCESSED = "2026-10-23";

export interface AccreditationBody {
  code: string;
  name: string;
  field: string;
  validUntil: string;
}

export const ACCREDITATION_BODIES: AccreditationBody[] = [
  { code: "DEDAK", name: "Dil Eğitim Programları Değerlendirme ve Akreditasyon Derneği", field: "Dil eğitimi", validUntil: "2027-09-15" },
  { code: "DEPAD", name: "Diş Hekimliği Eğitimi Programları Akreditasyon Derneği", field: "Diş hekimliği", validUntil: "2028-03-11" },
  { code: "DÖDAK", name: "Dil Öğrenim/Hazırlık Merkezleri Değerlendirme ve Akreditasyon Derneği", field: "Dil hazırlık", validUntil: "2027-01-24" },
  { code: "EPDAD", name: "Öğretmenlik Eğitim Programları Değerlendirme ve Akreditasyon Derneği", field: "Öğretmenlik", validUntil: "2027-03-30" },
  { code: "EPDAK", name: "Ebelik Eğitim Programları Değerlendirme ve Akreditasyon Derneği", field: "Ebelik", validUntil: "2028-09-03" },
  { code: "ECZAKDER", name: "Eczacılık Eğitimi Programlarını Değerlendirme ve Akreditasyon Derneği", field: "Eczacılık", validUntil: "2030-12-26" },
  { code: "ETMK", name: "Endüstriyel Tasarımcılar Meslek Kuruluşu", field: "Endüstriyel tasarım", validUntil: "2029-12-21" },
  { code: "FEDEK", name: "Fen, Edebiyat, Fen-Edebiyat, Dil ve Tarih-Coğrafya Fakülteleri Öğretim Programları Değerlendirme ve Akreditasyon Derneği", field: "Fen ve edebiyat", validUntil: "2028-04-09" },
  { code: "FTR-AD", name: "Fizyoterapi ve Rehabilitasyon Eğitim Programları Değerlendirme ve Akreditasyon Derneği", field: "Fizyoterapi", validUntil: "2027-09-18" },
  { code: "HEPDAK", name: "Hemşirelik Eğitim Programları Değerlendirme ve Akreditasyon Derneği", field: "Hemşirelik", validUntil: "2028-12-25" },
  { code: "İAA", name: "İlahiyat Akreditasyon Ajansı", field: "İlahiyat", validUntil: "2027-09-15" },
  { code: "İLAD", name: "İletişim Araştırmaları Derneği", field: "İletişim", validUntil: "2027-01-19" },
  { code: "MEDEK", name: "Mesleki Eğitim Değerlendirme ve Akreditasyon Derneği", field: "Meslek yüksekokulları", validUntil: "2030-08-21" },
  { code: "MİAK", name: "Mimarlık Eğitimi Akreditasyon Derneği", field: "Mimarlık", validUntil: "2027-11-17" },
  { code: "MÜDEK", name: "Mühendislik Eğitim Programları Değerlendirme ve Akreditasyon Derneği", field: "Mühendislik", validUntil: "2028-02-01" },
  { code: "PEMDER", name: "Peyzaj Mimarlığı Eğitim ve Bilim Derneği", field: "Peyzaj mimarlığı", validUntil: "2028-04-08" },
  { code: "SABAK", name: "Sağlık Bilimleri Eğitim Programları Değerlendirme ve Akreditasyon Derneği", field: "Sağlık bilimleri", validUntil: "2030-01-31" },
  { code: "SANAD", name: "Sanat Eğitimi Akreditasyon Derneği", field: "Sanat eğitimi", validUntil: "2027-05-16" },
  { code: "SATEAD", name: "Sanat ve Tasarım Eğitimi Değerlendirme ve Akreditasyon Derneği", field: "Sanat ve tasarım", validUntil: "2027-12-26" },
  { code: "SAYAK", name: "Sağlık Yönetimi Eğitim Programları Değerlendirme ve Akreditasyon Derneği", field: "Sağlık yönetimi", validUntil: "2027-09-26" },
  { code: "STAR", name: "Sosyal Beşeri ve Temel Bilimler Akreditasyon ve Rating Derneği", field: "Sosyal ve beşeri bilimler", validUntil: "2029-07-08" },
  { code: "SBD", name: "Spor Bilimleri Derneği", field: "Spor bilimleri", validUntil: "2028-01-19" },
  { code: "TAPLAK", name: "Tasarım ve Planlama Akreditasyon Derneği", field: "Tasarım ve planlama", validUntil: "2029-05-25" },
  { code: "TEPDAD", name: "Tıp Eğitimi Programlarını Değerlendirme ve Akreditasyon Derneği", field: "Tıp", validUntil: "2027-03-28" },
  { code: "TURAK", name: "Turizm Akademisyenleri Derneği", field: "Turizm", validUntil: "2029-01-19" },
  { code: "TPD", name: "Türk Psikologlar Derneği", field: "Psikoloji", validUntil: "2028-06-23" },
  { code: "Türk PDR-Der", name: "Türk Psikolojik Danışma ve Rehberlik Derneği", field: "Psikolojik danışmanlık", validUntil: "2026-12-21" },
  { code: "VEDEK", name: "Veteriner Hekimliği Eğitim Kurumları ve Programları Değerlendirme ve Akreditasyon Derneği", field: "Veteriner hekimliği", validUntil: "2029-12-19" },
  { code: "ZİDEK", name: "Ziraat Fakülteleri Eğitim Programları Değerlendirme ve Akreditasyon Derneği", field: "Ziraat", validUntil: "2029-07-08" },
];
