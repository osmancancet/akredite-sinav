import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { suggestionsFor, type AppDocKind } from "@/lib/accreditation/matcher";

const kinds = (slug: string, title: string) => suggestionsFor(slug, { title }).map((s) => s.kind);

describe("kanıt üreticisi eşleştirmesi", () => {
  it.each<[string, string, AppDocKind[]]>([
    ["medek", "Ders değerlendirme dosyaları: Ders bilgi paketi, sınav ve cevap anahtarı, ölçme değerlendirme sınav örnekleri (en iyi - orta - en kötü), öğrenim ve program çıktıları gerçekleşme düzeyi", ["exam", "answerKey", "covers", "programPanel", "courseFile"]],
    ["dedak", "Belirtke tablosu", ["answerKey"]],
    ["medek", "Örnek rubrikler (değerlendirme formları): Sunum, staj veya laboratuvar uygulamaları", ["rubric"]],
    ["medek", "Ders öğrenme çıktıları – program çıktıları matrisi", ["courseInfo"]],
    ["medek", "Tablo 5.2 Ders ve Sınıf Büyüklükleri", ["odrTables"]],
    ["epdak", "Sınav ve madde analiz sonuçlarının, programın iyileştirilmesinde kullanımını gösteren belgeler", ["puko"]],
    ["star", "[1.6] Sınav takvimi, duyurulması, sınav tarihlerinin belirlenmesi", ["board"]],
    ["epdad", "[1.3.1] Ders not çizelgeleri", ["grades"]],
  ])("%s: %s", (slug, title, expected) => {
    expect(kinds(slug, title).sort()).toEqual([...expected].sort());
  });

  it.each<[string, string]>([
    ["ftr-ad", "Ders bilgi paketlerinde yer alan kaynakların kütüphanede bulunduğuna dair resmi belge"],
    ["miak", "Öğrenci Stüdyo Çalışmaları Sergisi: farklı öğretim üyelerinin projeleri, en düşük, orta ve en yüksek notlu örnekler"],
    ["hepdak", "Yıllara göre program amaçlarının başarım göstergelerine ulaşma durumunu gösteren tablo (Tablo Sİ.1.1.)"],
    ["turk-pdr-der-pdr-epdab", "Öğretim elemanlarına ve öğrencilere sunulan kütüphane olanaklarının eğitimin amaçları ve program çıktılarına ulaşmaya katkısı"],
    ["star", "[8.1] Toplantı takvimi (yıllık plan), toplantı gündemi, yoklama ve karar özetleri."],
    ["mudek", "Tablo 5.1 Öğretim Planı"],
    ["yokak-kap", "Ders bilgi paketlerinde öğrenci merkezli öğretim yöntemlerinin varlığı"],
    ["star", "[4.2] Kullanılan öğretim yöntemlerinin, öğrencinin Program Öğrenme Çıktılarına ulaşmasına sağlayacağı katkıya ilişkin açıklamalar"],
    ["tpd-tpd-ppab", "Program çıktılarına ulaşma düzeyi: Programı ve Bölümü değerlendirme anketleri ve/veya Çıkış Anketi/Mülakat sonuçları"],
    ["hepdak", "Program çıktılarına ulaşma durumunun paydaşlarla paylaşıldığını gösteren kanıtlar"],
    ["hepdak", "Program çıktılarına ulaşma durumunu değerlendiren bir ölçme-değerlendirme sisteminin oluşturulduğunu gösteren belgeler (prosedürler vb.)"],
    ["sanad", "Sergi ve jüri not çizelgeleri"],
    ["epdad", "[1.2.1] Değerlendirilmiş öğrenci çalışmaları (ödevler, projeler, sınavlar, puanlama anahtarları ve cevap anahtarları vb.)"],
  ])("öneri yok — %s: %s", (slug, title) => {
    expect(kinds(slug, title)).toEqual([]);
  });

  it("dayanak ifade özgün başlıktan (Türkçe karakterlerle) kesilir", () => {
    expect(suggestionsFor("medek", { title: "Sınav sorularının kazanımlarla uyumu: Soru- Kazanım Eşleştirme Tablosu" }).find((s) => s.kind === "answerKey")?.phrase).toBe("Soru- Kazanım Eşleştir");
  });

  it("katalog genelinde öneri sayıları makul ve her öneri ifadesi başlıkta geçer", () => {
    const dir = "public/frameworks";
    let total = 0;
    for (const f of fs.readdirSync(dir).filter((x) => x !== "index.json")) {
      const fw = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8"));
      for (const c of fw.criteria)
        for (const e of c.evidence ?? [])
          for (const s of suggestionsFor(fw.slug, e)) {
            total++;
            expect(e.title.includes(s.phrase)).toBe(true);
          }
    }
    expect(total).toBeGreaterThan(80);
    expect(total).toBeLessThan(200);
  });
});
