// Uygulamanın ürettiği belgeleri, kuruluş belgesinde adı AÇIKÇA geçen kanıt kalemlerine öneren kurallar.
// Kurallar bilerek dar tutulur: yalnızca belge türünü adıyla anan ifadeler eşleşir. Her öneri dayandığı
// ifadeyi gösterir; kanıta ekleme kararı her zaman kullanıcıdadır.

import type { ActiveFramework, FwEvidence } from "./types";
import { criterionEvidence } from "./progress";
import type { AccreditationWorkspace } from "./types";
import { foldTr } from "@/lib/utils";

export type AppDocKind =
  | "exam"
  | "answerKey"
  | "covers"
  | "rubric"
  | "attendance"
  | "board"
  | "grades"
  | "puko"
  | "programPanel"
  | "courseInfo"
  | "courseFile"
  | "odrTables";

export const KIND_LABEL: Record<AppDocKind, string> = {
  exam: "Sınav kağıdı",
  answerKey: "Cevap anahtarı ve belirtke tablosu",
  covers: "En yüksek / orta / en düşük kağıt kapakları",
  rubric: "Rubrik",
  attendance: "Sınav yoklama tutanağı",
  board: "Sınav programı",
  grades: "Not çizelgesi",
  puko: "ÖÇ analizi ve PUKÖ raporu",
  programPanel: "Program çıktıları sağlanma raporu",
  courseInfo: "Ders bilgi formu (ÖÇ–PÇ matrisi)",
  courseFile: "Ders dosyası",
  odrTables: "ÖDR tabloları",
};

interface Rule {
  kind: AppDocKind;
  re: RegExp;
  /** Ek koşul: başlıkta bu ifade de geçmeli */
  also?: RegExp;
  /** Olumsuz koşul: başlıkta bu ifade geçerse öneri yapılmaz (anket, prosedür, süreç kanıtları) */
  not?: RegExp;
  only?: (slug: string) => boolean;
}

// Ölçme sonucu değil, süreç/anket/paylaşım kanıtı isteyen kalemler (uygulamanın raporları bunları karşılamaz)
const OUT_OF_SCOPE = /anket|mulakat|prosedur|paylasil|olusturuldugunu|ogretim yontem/;

// Desenler foldTr (küçük harf, aksansız, ı→i) uygulanmış başlık üzerinde çalışır.
const RULES: Rule[] = [
  { kind: "exam", re: /sinav (sorulari|kagitlari|ornekleri)|sinav ve cevap anahtari|kisa sinav\/sinav/ },
  { kind: "answerKey", re: /cevap anahtar|yanit anahtar|belirtke|soru.{0,25}(kazanim|ogrenme ciktisi).{0,25}(eslestir|iliskilendir)/, not: /degerlendirilmis ogrenci calismalar/ },
  { kind: "covers", re: /en (iyi|yuksek)[^.;]{0,30}(orta|en (dusuk|kotu))|en dusuk gecer|en yuksek not/, also: /sinav|kagit|ders dosya/ },
  { kind: "rubric", re: /rubrik|dereceli puanlama|puanlama anahtar/, not: /degerlendirilmis ogrenci calismalar/ },
  { kind: "attendance", re: /sinav[^.;]{0,15}(yoklama|imza (listesi|cizelgesi|tutanagi))/ },
  { kind: "board", re: /sinav (programi|takvimi)/ },
  { kind: "grades", re: /not cizelge|not dagilim|basari (notu )?dagilim/, not: /juri|sergi/ },
  { kind: "puko", re: /(?<!program )(ogrenme|ders) ciktilar\w* (gerceklesme|saglanma|ulasma)|madde analiz/, not: OUT_OF_SCOPE },
  {
    kind: "programPanel",
    re: /program ciktilar\w*( her biri icin)? (saglanma|gerceklesme|ulasma) (duzey|durum|oran)|program ciktilari gerceklesme|program ciktilar\w* (olcme|degerlendirme) sonuc|program ciktilar\w* basarim gostergelerine ulasma/,
    not: OUT_OF_SCOPE,
  },
  { kind: "courseInfo", re: /(ders )?(ogrenme )?ciktilar?\w*\s*[–\-/]\s*program ciktilar?\w* (matris|iliski|eslestirme)|ders (ogrenme )?ciktilar\w*[^.;]{0,20}program ciktilar\w*[^.;]{0,20}(matris|iliski|eslestirme)/ },
  { kind: "courseFile", re: /ders dosya|ders degerlendirme dosya/ },
  { kind: "odrTables", re: /^(odr )?tablo (5\.1|5\.2|6\.1|6\.2)\b/, only: (slug) => slug === "medek" },
];

export interface Suggestion {
  kind: AppDocKind;
  /** Kanıt kalemindeki, öneriye dayanak olan özgün ifade */
  phrase: string;
}

export function suggestionsFor(slug: string, e: Pick<FwEvidence, "title">): Suggestion[] {
  const folded = foldTr(e.title);
  // foldTr Türkçe metinde karakter sayısını korur; dayanak ifade özgün başlıktan kesilir
  const sameLength = folded.length === e.title.length;
  const out: Suggestion[] = [];
  for (const r of RULES) {
    if (r.only && !r.only(slug)) continue;
    const m = r.re.exec(folded);
    if (!m || (r.also && !r.also.test(folded)) || (r.not && r.not.test(folded))) continue;
    if (out.some((s) => s.kind === r.kind)) continue;
    out.push({ kind: r.kind, phrase: sameLength ? e.title.slice(m.index, m.index + m[0].length) : m[0] });
  }
  return out;
}

/** Çerçevedeki her kanıt kalemi için öneriler (yalnızca öneri olanlar) */
export function frameworkSuggestions(ws: AccreditationWorkspace, fw: ActiveFramework): Map<string, Suggestion[]> {
  const map = new Map<string, Suggestion[]>();
  for (const c of fw.snapshot.criteria) {
    for (const e of criterionEvidence(ws, fw, c)) {
      const s = suggestionsFor(fw.slug, e);
      if (s.length) map.set(e.id, s);
    }
  }
  return map;
}
