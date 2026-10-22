"use client";

import { A4Page, OfficialHeader, SignatureRow } from "@/components/print/DocParts";
import { scaleLabel } from "@/lib/medekMath";
import { bloomLabel, formatTrDate, round } from "@/lib/utils";
import { resolvePuko, type PukoCtx } from "@/services/medekExportService";

const pct = (v: number | null) => (v === null ? "—" : `%${round(v, 1)}`);

function PrintBar({ value, threshold }: { value: number | null; threshold: number }) {
  if (value === null) return <span>—</span>;
  return (
    <div className="relative h-[10px] w-full border border-black bg-white">
      <div className="h-full" style={{ width: `${Math.min(100, value)}%`, background: value < threshold ? "#e34948" : "#2a78d6", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }} />
      <div className="absolute inset-y-[-2px] border-l border-dashed border-black" style={{ left: `${threshold}%` }} />
    </div>
  );
}

export function PukoDocument({ ctx }: { ctx: PukoCtx }) {
  const { inst, course, exam, analysis, threshold, programOutcomes, sheet } = ctx;
  const st = analysis.stats;
  const entries = resolvePuko(ctx);
  return (
    <A4Page>
      <OfficialHeader inst={inst} title="Dönem Sonu Ders Değerlendirme ve PUKÖ Raporu" subtitle={`${inst.accreditationBody} / YÖKAK Sürekli İyileştirme Kanıtı — ${inst.academicYear} ${inst.semester} Yarıyılı`} />
      <div className="doc-section-title">1. Ders ve Ölçme Aracı Bilgileri</div>
      <table className="doc-table compact">
        <tbody>
          <tr>
            <th className="w-[20%] text-left">Ders</th>
            <td>{course.code} — {course.name}</td>
            <th className="w-[18%] text-left">Öğretim Elemanı</th>
            <td>{course.instructor}</td>
          </tr>
          <tr>
            <th className="text-left">Ölçme Aracı</th>
            <td>{exam.title} ({exam.examType}) — {formatTrDate(exam.date)}</td>
            <th className="text-left">Öğrenci / Eşik</th>
            <td>{st.n} öğrenci · %{threshold}</td>
          </tr>
        </tbody>
      </table>
      <div className="doc-section-title">2. Sınav İstatistikleri</div>
      <table className="doc-table compact text-center">
        <thead>
          <tr>
            <th>Ortalama</th>
            <th>Medyan</th>
            <th>Std. Sapma</th>
            <th>En Yüksek</th>
            <th>En Düşük</th>
            <th>Başarı Oranı (≥%50)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="text-center">
            <td>{round(st.mean, 2)}</td>
            <td>{round(st.median, 2)}</td>
            <td>{round(st.sd, 2)}</td>
            <td>{round(st.max, 1)}</td>
            <td>{round(st.min, 1)}</td>
            <td>%{round(st.passRate, 1)}</td>
          </tr>
        </tbody>
      </table>
      <div className="doc-section-title">3. Soru Bazlı Başarı</div>
      <table className="doc-table compact">
        <thead>
          <tr>
            <th>Soru</th>
            <th>Bloom</th>
            <th>ÖÇ</th>
            <th>Maks.</th>
            <th>Ort.</th>
            <th>Başarı %</th>
          </tr>
        </thead>
        <tbody>
          {analysis.questionStats.map((q) => (
            <tr key={q.questionId}>
              <td className="text-center">{q.label}</td>
              <td>{bloomLabel(q.bloom)}</td>
              <td>{q.outcomeIds.map((id) => course.outcomes.find((o) => o.id === id)?.code).filter(Boolean).join(", ")}</td>
              <td className="text-center">{q.maxPoints}</td>
              <td className="text-center">{round(q.avg, 2)}</td>
              <td className="text-center">%{round(q.pct, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="doc-section-title">4. ÖÇ Gerçekleşme Düzeyleri</div>
      <p className="text-[8.5pt] italic">Başarı(ÖÇ_k)% = Σ X_i / Σ P_i × 100 (i ∈ Q_k). Kesikli çizgi: hedef eşik %{threshold}.</p>
      <table className="doc-table compact">
        <thead>
          <tr>
            <th className="w-[8%]">ÖÇ</th>
            <th>Öğrenme Çıktısı</th>
            <th className="w-[10%]">Sorular</th>
            <th className="w-[9%]">Başarı</th>
            <th className="w-[7%]">5&apos;lik</th>
            <th className="w-[16%]">Grafik</th>
            <th className="w-[14%]">Durum</th>
          </tr>
        </thead>
        <tbody>
          {analysis.outcomeStats.map((o) => (
            <tr key={o.outcomeId}>
              <td className="text-center font-bold">{o.code}</td>
              <td className="text-[9pt]">{o.text}</td>
              <td className="text-center">{o.questionLabels.join(", ") || "—"}</td>
              <td className="text-center">{pct(o.pct)}</td>
              <td className="text-center">{o.scale5 === null ? "—" : o.scale5.toFixed(2)}</td>
              <td className="align-middle">
                <PrintBar value={o.pct} threshold={threshold} />
              </td>
              <td className="text-center text-[8.5pt] font-bold">{o.pct === null ? "Ölçülmedi" : o.flagged ? "⚠ İYİLEŞTİRME GEREKLİ" : scaleLabel(o.pct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="doc-section-title">5. ÖÇ – PÇ İlişki Matrisi</div>
      <table className="doc-table compact text-center">
        <thead>
          <tr>
            <th>ÖÇ</th>
            {programOutcomes.map((p) => (
              <th key={p.id}>{p.code.replace("PÇ-", "P")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {course.outcomes.map((o) => (
            <tr key={o.id} className="text-center">
              <td className="font-bold">{o.code}</td>
              {programOutcomes.map((_, j) => (
                <td key={j}>{course.ocPcMatrix[o.id]?.[j] ?? 0}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="doc-section-title">6. PÇ Sağlanma Oranları</div>
      <table className="doc-table compact">
        <thead>
          <tr>
            <th className="w-[8%]">PÇ</th>
            <th>Program Çıktısı</th>
            <th className="w-[10%]">Σ W</th>
            <th className="w-[10%]">Sağlanma</th>
            <th className="w-[16%]">Grafik</th>
          </tr>
        </thead>
        <tbody>
          {analysis.poStats.map((p) => (
            <tr key={p.poId}>
              <td className="text-center font-bold">{p.code}</td>
              <td className="text-[8.5pt]">{p.text}</td>
              <td className="text-center">{p.weightSum}</td>
              <td className="text-center">{pct(p.pct)}</td>
              <td className="align-middle">
                <PrintBar value={p.pct} threshold={threshold} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="doc-section-title">7. Sürekli İyileştirme (PUKÖ) Eylem Planı</div>
      {entries.length === 0 && <p>Tüm öğrenme çıktıları hedef eşik değerin üzerinde gerçekleşmiştir.</p>}
      {entries.map((e) => {
        const o = analysis.outcomeStats.find((x) => x.outcomeId === e.outcomeId)!;
        return (
          <div key={e.outcomeId} className="avoid-break mb-2">
            <div className="font-bold">
              {o.code} — {o.text} (Gerçekleşme: {pct(o.pct)})
            </div>
            <table className="doc-table compact">
              <tbody>
                {(
                  [
                    ["Kök Neden Analizi", e.rootCause],
                    ["P — Planla", e.plan],
                    ["U — Uygula", e.doAction],
                    ["K — Kontrol Et", e.check],
                    ["Ö — Önlem Al", e.act],
                  ] as const
                ).map(([k, v]) => (
                  <tr key={k}>
                    <th className="w-[20%] text-left">{k}</th>
                    <td className="text-[9.5pt]">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
      <div className="doc-section-title">8. Genel Değerlendirme</div>
      <p className="text-justify">{sheet.generalEvaluation || "—"}</p>
      <SignatureRow
        items={[
          { title: "Ders Sorumlusu", name: course.instructor },
          { title: inst.headTitle || "Bölüm Başkanı", name: inst.headOfDepartment },
          { title: "Bölüm Kalite Komisyonu" },
        ]}
      />
    </A4Page>
  );
}
