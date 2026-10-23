"use client";

import { A4Page, OfficialHeader, SignatureRow } from "@/components/print/DocParts";
import type { Course, Exam, Institution } from "@/lib/types";
import { formatTrDate, maskName, maskStudentNo, num } from "@/lib/utils";
import { roomSheets, type EvidenceSample, type RoomSheet, type SeatingCtx } from "@/services/seatingExportService";

function ExamInfo({ ctx, s }: { ctx: SeatingCtx; s: RoomSheet }) {
  return (
    <table className="doc-table compact mb-2">
      <tbody>
        <tr>
          <th className="w-[18%] text-left">Ders</th>
          <td>{ctx.course.code} — {ctx.course.name}</td>
          <th className="w-[15%] text-left">Derslik</th>
          <td className="w-[22%] font-bold">{s.room.name}</td>
        </tr>
        <tr>
          <th className="text-left">Sınav</th>
          <td>{ctx.exam.title} ({ctx.exam.examType})</td>
          <th className="text-left">Öğrenci</th>
          <td>{s.rows.length} (A: {s.countA} · B: {s.countB})</td>
        </tr>
        <tr>
          <th className="text-left">Tarih / Saat</th>
          <td>{formatTrDate(ctx.exam.date, true)} · {ctx.exam.startTime} ({ctx.exam.durationMin} dk)</td>
          <th className="text-left">Gözetmen</th>
          <td>{s.invigilatorNames.join(", ") || "—"}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function DoorListDocument({ ctx, mask }: { ctx: SeatingCtx; mask: boolean }) {
  return (
    <>
      {roomSheets(ctx, mask).map((s) => (
        <A4Page key={s.room.id}>
          <OfficialHeader inst={ctx.inst} title="Sınav Kapı Listesi" subtitle={`${s.room.name} — ${ctx.plan.mode === "butterfly" ? "Kelebek (anti-kopya) düzeni" : "Numara sıralı düzen"}`} right="KAPIYA ASILACAKTIR" />
          <ExamInfo ctx={ctx} s={s} />
          <table className="doc-table compact">
            <thead>
              <tr>
                <th className="w-[12%]">Sıra No</th>
                <th className="w-[26%]">Öğrenci No</th>
                <th>Adı Soyadı</th>
                <th className="w-[14%]">Kitapçık</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r) => (
                <tr key={r.seatNo}>
                  <td className="text-center font-bold">{r.seatNo}</td>
                  <td className="text-center">{r.no}</td>
                  <td>{r.name}</td>
                  <td className="text-center font-bold">{r.booklet}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {mask && <p className="mt-1 text-[8.5pt] italic">Kişisel veriler 6698 sayılı KVKK kapsamında maskelenmiştir.</p>}
        </A4Page>
      ))}
    </>
  );
}

export function AttendanceDocument({ ctx }: { ctx: SeatingCtx }) {
  return (
    <>
      {roomSheets(ctx, false).map((s) => (
        <A4Page key={s.room.id}>
          <OfficialHeader inst={ctx.inst} title="Sınav Yoklama ve İmza Tutanağı" subtitle={s.room.name} right="RESMİ TUTANAK" />
          <ExamInfo ctx={ctx} s={s} />
          <table className="doc-table compact tall">
            <thead>
              <tr>
                <th className="w-[9%]">Sıra No</th>
                <th className="w-[19%]">Öğrenci No</th>
                <th>Adı Soyadı</th>
                <th className="w-[11%]">Kitapçık</th>
                <th className="w-[22%]">İmza</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r) => (
                <tr key={r.seatNo}>
                  <td className="text-center">{r.seatNo}</td>
                  <td className="text-center">{r.no}</td>
                  <td>{r.name}</td>
                  <td className="text-center">{r.booklet}</td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
          <table className="doc-table mt-3 avoid-break">
            <tbody>
              <tr>
                <td className="font-bold">Sınava Kayıtlı: {s.rows.length}</td>
                <td className="font-bold">Sınava Giren: [ ........ ]</td>
                <td className="font-bold">Girmeyen: [ ........ ]</td>
              </tr>
              <tr>
                <td colSpan={3}>Teslim Edilen Evrak: [ ........ ] adet cevap kağıdı (A: {s.countA} / B: {s.countB} basıldı)</td>
              </tr>
              <tr style={{ height: "16mm" }}>
                <td colSpan={3} className="align-top text-[9.5pt]">Tutanak / Açıklama (kopya girişimi, sağlık sorunu vb.):</td>
              </tr>
            </tbody>
          </table>
          <div className="avoid-break">
            <SignatureRow
              items={[
                ...(s.invigilatorNames.length ? s.invigilatorNames : ["", ""]).map((n, i) => ({ title: `Gözetmen ${i + 1}`, name: n })),
                { title: "Ders Sorumlusu", name: ctx.course.instructor },
              ]}
            />
          </div>
        </A4Page>
      ))}
    </>
  );
}

export function EnvelopeDocument({ ctx }: { ctx: SeatingCtx }) {
  const sheets = roomSheets(ctx, false);
  return (
    <A4Page>
      {sheets.map((s) => (
        <div key={s.room.id} className="avoid-break mb-6 border-2 border-black p-4">
          <div className="text-center">
            <div className="font-bold uppercase">{ctx.inst.university}</div>
            <div className="text-[10pt]">{ctx.inst.unitName} — {ctx.inst.department}</div>
            <div className="mt-1 text-[18pt] font-bold tracking-wide">SINAV EVRAK ZARFI</div>
          </div>
          <table className="doc-table mt-2">
            <tbody>
              {(
                [
                  ["Ders", `${ctx.course.code} — ${ctx.course.name}`, true],
                  ["Sınav Türü", `${ctx.exam.examType} · ${ctx.inst.academicYear} ${ctx.inst.semester}`],
                  ["Tarih / Saat", `${formatTrDate(ctx.exam.date, true)} · ${ctx.exam.startTime}`],
                  ["Derslik", s.room.name, true],
                  ["Kayıtlı Öğrenci", String(s.rows.length)],
                  ["Kitapçık Dağılımı", `A: ${s.countA}   B: ${s.countB}`],
                  ["Sınava Giren / Girmeyen", ".......... / .........."],
                  ["Zarftaki Kağıt Sayısı", ".........."],
                  ["Gözetmen(ler)", s.invigilatorNames.join(", ") || "—"],
                  ["Ders Sorumlusu", ctx.course.instructor],
                ] as [string, string, boolean?][]
              ).map(([k, v, big]) => (
                <tr key={k}>
                  <th className="w-[32%] text-left">{k}</th>
                  <td className={big ? "text-[13pt] font-bold" : ""}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <SignatureRow items={[{ title: "Teslim Eden (Gözetmen)", name: s.invigilatorNames[0] }, { title: "Teslim Alan (Ders Sorumlusu)", name: ctx.course.instructor }]} />
        </div>
      ))}
    </A4Page>
  );
}

export function EvidenceCoversDocument({
  inst,
  course,
  exam,
  samples,
  classMean,
  mask,
}: {
  inst: Institution;
  course: Course;
  exam: Exam;
  samples: EvidenceSample[];
  classMean: number;
  mask: boolean;
}) {
  const total = exam.questions.reduce((a, q) => a + q.points, 0);
  return (
    <>
      {samples.map((s) => (
        <A4Page key={s.kind}>
          <OfficialHeader inst={inst} title={`${inst.accreditationBody} Kanıt Klasörü`} subtitle={`${inst.academicYear} ${inst.semester} Yarıyılı`} />
          <div className="my-14 text-center">
            <div className="text-[30pt] font-bold uppercase leading-tight">{s.kind} Notlu</div>
            <div className="text-[24pt] font-bold">SINAV KAĞIDI ÖRNEĞİ</div>
          </div>
          <table className="doc-table">
            <tbody>
              {(
                [
                  ["Ders Kodu / Adı", `${course.code} — ${course.name}`],
                  ["Ölçme Aracı", `${exam.title} (${exam.examType})`],
                  ["Sınav Tarihi", formatTrDate(exam.date, true)],
                  ["Öğretim Elemanı", course.instructor],
                  ["Öğrenci No", mask ? maskStudentNo(s.studentNo) : s.studentNo],
                  ["Adı Soyadı", mask ? maskName(s.fullName) : s.fullName],
                  ["Aldığı Puan", `${num(s.score, 1)} / ${total}`],
                  ["Sınıf Ortalaması", String(num(classMean, 2))],
                  ["Ölçülen ÖÇ'ler", course.outcomes.map((o) => o.code).join(", ")],
                ] as [string, string][]
              ).map(([k, v]) => (
                <tr key={k}>
                  <th className="w-[32%] text-left">{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="doc-section-title mt-8">Klasör İçeriği Kontrol Listesi</div>
          <ul className="space-y-1 pl-4">
            {["Öğrencinin sınav kağıdı (aslı)", "Sınav soruları ve cevap anahtarı", "MEDEK puanlama rubriği", "Belirtke tablosu (ÖÇ × soru)", "ÖÇ/PÇ başarı analizi ve PUKÖ raporu"].map((t) => (
              <li key={t}>☐ {t}</li>
            ))}
          </ul>
          <SignatureRow items={[{ title: "Ders Sorumlusu", name: course.instructor }, { title: inst.headTitle || "Bölüm Başkanı", name: inst.headOfDepartment }]} />
        </A4Page>
      ))}
    </>
  );
}
