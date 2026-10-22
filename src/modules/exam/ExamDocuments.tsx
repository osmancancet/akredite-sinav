"use client";

import * as React from "react";
import type { Course, Exam, Institution } from "@/lib/types";
import { buildBooklet, correctAnswerText, type BookletType } from "@/lib/booklet";
import { buildBlueprint } from "@/lib/medekMath";
import { A4Page, AnswerLines, Latex, OfficialHeader, RichText, SignatureRow } from "@/components/print/DocParts";
import { bloomLabel, formatTrDate, OPTION_LETTERS, questionTypeLabel, round } from "@/lib/utils";

export function ExamPaper({ inst, course, exam, booklet }: { inst: Institution; course: Course; exam: Exam; booklet: BookletType }) {
  const items = buildBooklet(exam, booklet);
  const total = exam.questions.reduce((s, q) => s + q.points, 0);
  return (
    <A4Page>
      <OfficialHeader
        inst={inst}
        title={exam.title}
        subtitle={`${inst.academicYear} ${inst.semester} Yarıyılı · ${exam.examType}`}
        right={
          <div className="inline-block border-2 border-black px-3 py-1 text-center">
            <div className="text-[8pt]">KİTAPÇIK</div>
            <div className="text-[20pt] font-bold leading-none">{booklet}</div>
          </div>
        }
      />
      <table className="doc-table compact mb-2">
        <tbody>
          <tr>
            <th className="w-[18%] text-left">Ders</th>
            <td>{course.code} — {course.name}</td>
            <th className="w-[14%] text-left">Tarih</th>
            <td className="w-[20%]">{formatTrDate(exam.date, true)}</td>
          </tr>
          <tr>
            <th className="text-left">Öğretim Elemanı</th>
            <td>{course.instructor}</td>
            <th className="text-left">Saat / Süre</th>
            <td>{exam.startTime} · {exam.durationMin} dk</td>
          </tr>
          <tr>
            <th className="text-left">Adı Soyadı</th>
            <td />
            <th className="text-left">Öğrenci No</th>
            <td />
          </tr>
          <tr>
            <th className="text-left">İmza</th>
            <td />
            <th className="text-left">Toplam Puan</th>
            <td>{total}</td>
          </tr>
        </tbody>
      </table>
      {exam.instructions && (
        <div className="mb-3 border border-black px-2 py-1 text-[9pt] italic leading-snug">
          <strong className="not-italic">Sınav Kuralları: </strong>
          {exam.instructions.split("\n").filter(Boolean).join(" • ")}
        </div>
      )}
      <ol className="space-y-3">
        {items.map(({ number, question: q }) => (
          <li key={q.id} className="avoid-break">
            <div className="flex gap-1">
              <span className="font-bold">S{number}.</span>
              <div className="flex-1">
                <RichText text={q.text} /> <span className="font-semibold">({q.points} Puan)</span>
              </div>
            </div>
            {q.type === "mcq" && (
              <div className="mt-1 grid gap-0.5 pl-6">
                {q.options.map((o, i) => (
                  <div key={o.id}>
                    <span className="font-semibold">{OPTION_LETTERS[i]})</span> {o.text}
                  </div>
                ))}
              </div>
            )}
            {q.type === "truefalse" && <div className="mt-1 pl-6">(&nbsp;&nbsp;&nbsp;) Doğru &nbsp;&nbsp;&nbsp;&nbsp; (&nbsp;&nbsp;&nbsp;) Yanlış</div>}
            {q.type === "code" && q.code && <pre className="doc-code mt-1 ml-6">{q.code}</pre>}
            {q.type === "latex" && q.latex && (
              <div className="ml-6">
                <Latex expr={q.latex} />
              </div>
            )}
            {q.answerLines > 0 && q.type !== "mcq" && q.type !== "truefalse" && (
              <AnswerLines count={q.answerLines} className="ml-6 mt-1" />
            )}
          </li>
        ))}
      </ol>
      <table className="doc-table compact mt-4 avoid-break">
        <thead>
          <tr>
            {items.map((it) => (
              <th key={it.question.id}>S{it.number}</th>
            ))}
            <th>TOPLAM</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {items.map((it) => (
              <td key={it.question.id} className="text-center text-[8pt] text-gray-600">/{it.question.points}</td>
            ))}
            <td className="text-center text-[8pt] text-gray-600">/{total}</td>
          </tr>
          <tr style={{ height: "9mm" }}>
            {items.map((it) => (
              <td key={it.question.id} />
            ))}
            <td />
          </tr>
        </tbody>
      </table>
      <div className="mt-3 flex justify-between text-[10pt]">
        <span>Başarılar dilerim.</span>
        <span className="text-center">
          {course.instructor}
          <br />
          <span className="text-[9pt]">Ders Sorumlusu</span>
        </span>
      </div>
    </A4Page>
  );
}

export function BlueprintTable({ course, exam, compact }: { course: Course; exam: Exam; compact?: boolean }) {
  const bp = buildBlueprint(exam, course);
  return (
    <table className={compact ? "doc-table compact" : "w-full border-collapse text-xs"}>
      <thead>
        <tr className={compact ? "" : "bg-zinc-100 text-zinc-700"}>
          <th className={cellCls(compact)}>Soru</th>
          <th className={cellCls(compact)}>Tip</th>
          <th className={cellCls(compact)}>Bloom</th>
          {course.outcomes.map((o) => (
            <th key={o.id} className={cellCls(compact)} title={o.text}>
              {o.code}
            </th>
          ))}
          <th className={cellCls(compact)}>Puan</th>
        </tr>
      </thead>
      <tbody>
        {bp.rows.map((r) => (
          <tr key={r.question.id}>
            <td className={cellCls(compact, "font-semibold text-center")}>{r.label}</td>
            <td className={cellCls(compact)}>{questionTypeLabel(r.question.type)}</td>
            <td className={cellCls(compact)}>{bloomLabel(r.question.bloom)}</td>
            {course.outcomes.map((o) => (
              <td key={o.id} className={cellCls(compact, "text-center tabular-nums")}>
                {r.cells[o.id] ? round(r.cells[o.id], 2) : compact ? "" : <span className="text-zinc-300">—</span>}
              </td>
            ))}
            <td className={cellCls(compact, "text-center font-semibold tabular-nums")}>{r.question.points}</td>
          </tr>
        ))}
        <tr className={compact ? "" : "bg-zinc-50 font-semibold"}>
          <td colSpan={3} className={cellCls(compact, "text-right font-bold")}>ÖÇ Toplam Puan</td>
          {course.outcomes.map((o) => (
            <td key={o.id} className={cellCls(compact, `text-center font-bold tabular-nums ${bp.totals[o.id] === 0 && !compact ? "bg-red-50 text-red-700" : ""}`)}>
              {round(bp.totals[o.id] ?? 0, 2)}
            </td>
          ))}
          <td className={cellCls(compact, "text-center font-bold tabular-nums")}>{bp.totalPoints}</td>
        </tr>
        <tr className={compact ? "" : "bg-zinc-50"}>
          <td colSpan={3} className={cellCls(compact, "text-right font-bold")}>Ağırlık (%)</td>
          {course.outcomes.map((o) => (
            <td key={o.id} className={cellCls(compact, "text-center tabular-nums")}>%{round(bp.percents[o.id] ?? 0, 1)}</td>
          ))}
          <td className={cellCls(compact, "text-center tabular-nums")}>%100</td>
        </tr>
      </tbody>
    </table>
  );
}

function cellCls(compact?: boolean, extra = "") {
  return compact ? extra : `border border-zinc-200 px-2 py-1 ${extra}`;
}

export function AnswerKeyDocument({ inst, course, exam }: { inst: Institution; course: Course; exam: Exam }) {
  const a = buildBooklet(exam, "A");
  const b = buildBooklet(exam, "B");
  const bp = buildBlueprint(exam, course);
  return (
    <>
      <A4Page>
        <OfficialHeader inst={inst} title="Cevap Anahtarı ve MEDEK Puanlama Rubriği" subtitle={`${course.code} ${course.name} — ${exam.title} (${formatTrDate(exam.date)})`} right={<span>GİZLİDİR</span>} />
        <div className="doc-section-title">1. A / B Kitapçık Eşleştirme ve Doğru Cevaplar</div>
        <table className="doc-table compact">
          <thead>
            <tr>
              <th>A No</th>
              <th>B No</th>
              <th>Tip</th>
              <th>Puan</th>
              <th>ÖÇ</th>
              <th>Bloom</th>
              <th>A Cevap</th>
              <th>B Cevap</th>
            </tr>
          </thead>
          <tbody>
            {a.map((qa) => {
              const qb = b.find((x) => x.question.id === qa.question.id)!;
              return (
                <tr key={qa.question.id}>
                  <td className="text-center">S{qa.number}</td>
                  <td className="text-center">S{qb.number}</td>
                  <td>{questionTypeLabel(qa.question.type)}</td>
                  <td className="text-center">{qa.question.points}</td>
                  <td>{qa.question.outcomeIds.map((id) => course.outcomes.find((o) => o.id === id)?.code).filter(Boolean).join(", ")}</td>
                  <td>{bloomLabel(qa.question.bloom)}</td>
                  <td className="text-center font-bold">{qa.correctLetter ?? (qa.question.type === "truefalse" ? (qa.question.correctBool ? "D" : "Y") : "Rubrik")}</td>
                  <td className="text-center font-bold">{qb.correctLetter ?? (qb.question.type === "truefalse" ? (qb.question.correctBool ? "D" : "Y") : "Rubrik")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="doc-section-title">2. Soru Bazlı Cevap Anahtarı ve Kısmi Puanlama Rubriği (A Kitapçığı Sırası)</div>
        {a.map((qa) => (
          <div key={qa.question.id} className="mb-3 avoid-break">
            <div className="font-bold">
              S{qa.number}. ({qa.question.points} Puan) — {questionTypeLabel(qa.question.type)} · {bloomLabel(qa.question.bloom)}
            </div>
            <div className="text-[10pt]">
              <RichText text={qa.question.text} />
            </div>
            <div className="mt-1 border-l-2 border-black pl-2 text-[10pt]">
              <strong>Beklenen Yanıt: </strong>
              {qa.question.type === "code" ? <pre className="doc-code mt-1">{qa.question.answerKey}</pre> : correctAnswerText(qa)}
              {qa.question.type !== "code" && qa.question.answerKey && qa.question.type !== "fill" && qa.question.type !== "open" && qa.question.type !== "latex" && (
                <div className="text-[9.5pt] italic">{qa.question.answerKey}</div>
              )}
            </div>
            {qa.question.rubric.length > 0 && (
              <table className="doc-table compact mt-1">
                <thead>
                  <tr>
                    <th className="text-left">Puanlama Ölçütü</th>
                    <th className="w-[15%]">Puan</th>
                  </tr>
                </thead>
                <tbody>
                  {qa.question.rubric.map((r) => (
                    <tr key={r.id}>
                      <td>{r.description}</td>
                      <td className="text-center">{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </A4Page>
      <A4Page>
        <OfficialHeader inst={inst} title="Sınav Belirtke Tablosu (ÖÇ × Soru Matrisi)" subtitle={`${course.code} ${course.name} — ${exam.title}`} />
        <BlueprintTable course={course} exam={exam} compact />
        <div className="doc-section-title">Öğrenme Çıktıları</div>
        <table className="doc-table compact">
          <tbody>
            {course.outcomes.map((o) => (
              <tr key={o.id}>
                <td className="w-[12%] text-center font-bold">{o.code}</td>
                <td>{o.text}</td>
                <td className="w-[16%] text-center">%{round(bp.percents[o.id] ?? 0, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {bp.uncovered.length > 0 && (
          <p className="mt-2 text-[10pt] font-bold">
            Uyarı: {course.outcomes.filter((o) => bp.uncovered.includes(o.id)).map((o) => o.code).join(", ")} bu sınavda ölçülmemektedir.
          </p>
        )}
        <SignatureRow items={[{ title: "Ders Sorumlusu", name: course.instructor }, { title: inst.headTitle || "Bölüm Başkanı", name: inst.headOfDepartment }]} />
      </A4Page>
    </>
  );
}
