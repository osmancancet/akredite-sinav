"use client";

import type { Invigilator } from "@/lib/types";
import { dutiesOf, scheduleDates } from "@/lib/scheduler";
import { A4Page, OfficialHeader, SignatureRow } from "@/components/print/DocParts";
import { docNumberPrefix, formatTrDate, todayIso, trDayName } from "@/lib/utils";
import { boardRows, type ScheduleCtx } from "@/services/scheduleExportService";

export function BoardDocument({ ctx }: { ctx: ScheduleCtx }) {
  const { inst, schedule } = ctx;
  const rows = boardRows(ctx);
  const dates = scheduleDates(schedule.settings);
  return (
    <A4Page orientation="landscape">
      <OfficialHeader inst={inst} title={`${schedule.settings.periodName} Sınav Programı`} subtitle={`${inst.department} — ${inst.program}`} right={`İlan: ${formatTrDate(todayIso())}`} />
      <div className="doc-section-title">Haftalık Sınav Takvimi</div>
      <table className="doc-table compact">
        <thead>
          <tr>
            <th className="w-[13%]">Tarih</th>
            {schedule.settings.slots.map((s) => (
              <th key={s.id}>
                {s.start}–{s.end}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dates.map((d, di) => (
            <tr key={d}>
              <td className="text-center font-semibold">
                {formatTrDate(d)}
                <br />
                <span className="font-normal">{trDayName(d)}</span>
              </td>
              {schedule.settings.slots.map((s) => (
                <td key={s.id} className="text-[8.5pt]">
                  {rows
                    .filter((r) => r.dayIndex === di && r.slotId === s.id)
                    .map((r) => (
                      <div key={r.code} className="mb-1">
                        <strong>{r.code}</strong> {r.name} ({r.classYear}. Sınıf)
                        <br />
                        <span className="text-[8pt]">{r.rooms}</span>
                      </div>
                    ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="doc-section-title">Ayrıntılı Sınav Listesi</div>
      <table className="doc-table compact">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Saat</th>
            <th>Kod</th>
            <th>Ders Adı</th>
            <th>Sınıf</th>
            <th>Öğr.</th>
            <th>Derslik(ler)</th>
            <th>Gözetmen(ler)</th>
            <th>Öğretim Elemanı</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{formatTrDate(r.date)} {r.day}</td>
              <td className="text-center">{r.time}</td>
              <td>{r.code}</td>
              <td>{r.name}</td>
              <td className="text-center">{r.classYear}.</td>
              <td className="text-center">{r.students}</td>
              <td>{r.rooms}</td>
              <td>{r.invigilators}</td>
              <td>{r.instructor}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <SignatureRow items={[{ title: inst.headTitle || "Bölüm Başkanı", name: inst.headOfDepartment }]} />
    </A4Page>
  );
}

export function NoticeDocument({ ctx, inv }: { ctx: ScheduleCtx; inv: Invigilator }) {
  const { inst, schedule } = ctx;
  const dates = scheduleDates(schedule.settings);
  const duties = dutiesOf(schedule, inv.id).sort(
    (a, b) =>
      a.entry.dayIndex - b.entry.dayIndex ||
      schedule.settings.slots.findIndex((s) => s.id === a.entry.slotId) - schedule.settings.slots.findIndex((s) => s.id === b.entry.slotId),
  );
  return (
    <A4Page>
      <OfficialHeader inst={inst} right={`Tarih: ${formatTrDate(todayIso())}`} />
      <p className="mt-2">
        Sayı&nbsp;&nbsp;: {docNumberPrefix(inst.department)}-{new Date().getFullYear()}/{String(ctx.invigilators.indexOf(inv) + 1).padStart(3, "0")}
        <br />
        Konu&nbsp;: Sınav Gözetmenlik Görevlendirmesi
      </p>
      <p className="mt-5 font-bold">
        Sayın {inv.title} {inv.name},
      </p>
      <p className="mt-3 text-justify indent-8">
        {inst.unitName} {inst.department} {inst.academicYear} {inst.semester} yarıyılı &quot;{schedule.settings.periodName}&quot; kapsamında aşağıda belirtilen
        sınavlarda gözetmen olarak görevlendirilmiş bulunmaktasınız. Sınav başlama saatinden en az 15 dakika önce sınav evrakını teslim almak üzere bölüm
        sekreterliğinde hazır bulunmanızı ve sınav sonunda yoklama tutanağı ile birlikte evrakı ders sorumlusuna teslim etmenizi rica ederim.
      </p>
      <table className="doc-table mt-4">
        <thead>
          <tr>
            <th>Sıra</th>
            <th>Tarih</th>
            <th>Saat</th>
            <th>Ders</th>
            <th>Derslik</th>
            <th>Öğr.</th>
            <th>Birlikte Görevli</th>
          </tr>
        </thead>
        <tbody>
          {duties.map((d, i) => {
            const c = ctx.courses.find((x) => x.id === d.entry.courseId);
            const s = schedule.settings.slots.find((x) => x.id === d.entry.slotId);
            const alloc = d.entry.rooms.find((r) => r.roomId === d.roomId);
            const others = (alloc?.invigilatorIds ?? [])
              .filter((id) => id !== inv.id)
              .map((id) => ctx.invigilators.find((x) => x.id === id))
              .filter(Boolean)
              .map((x) => `${x!.title} ${x!.name}`)
              .join(", ");
            return (
              <tr key={i}>
                <td className="text-center">{i + 1}</td>
                <td>{formatTrDate(dates[d.entry.dayIndex] ?? "", true)}</td>
                <td className="text-center">{s?.start}–{s?.end}</td>
                <td>{c?.code} {c?.name}</td>
                <td className="text-center">{ctx.rooms.find((r) => r.id === d.roomId)?.name}</td>
                <td className="text-center">{alloc?.studentCount}</td>
                <td>{others || "—"}</td>
              </tr>
            );
          })}
          {duties.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center">Bu dönemde görev atanmamıştır.</td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="mt-2 font-bold">Toplam görev sayısı: {duties.length}</p>
      <div className="doc-section-title">Gözetmen Yönergesi</div>
      <ol className="list-decimal pl-6 text-[10pt]">
        <li>Öğrenci kimlik kontrolü yapılarak yoklama tutanağı imzalatılır; sınava girmeyen öğrenciler tutanakta belirtilir.</li>
        <li>Kelebek oturma düzenine (kapı listesindeki sıra numaralarına) uyulması sağlanır; A/B kitapçıklar sıralı dağıtılır.</li>
        <li>Sınavın ilk 20 dakikası ve son 10 dakikasında öğrencinin salondan çıkmasına izin verilmez.</li>
        <li>Kopya girişiminde tutanak tutularak ders sorumlusu ve bölüm başkanlığına bildirilir.</li>
        <li>Sınav sonunda kağıt sayısı ile imza sayısı karşılaştırılarak sınav zarfı kapatılır.</li>
      </ol>
      <div className="flex justify-end">
        <div className="w-1/2">
          <SignatureRow items={[{ title: inst.headTitle || "Bölüm Başkanı", name: inst.headOfDepartment }]} />
        </div>
      </div>
      <table className="doc-table mt-6">
        <thead>
          <tr>
            <th>TEBELLÜĞ EDEN</th>
            <th>Tarih</th>
            <th>İmza</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ height: "14mm" }}>
            <td className="text-center align-middle">
              {inv.title} {inv.name}
            </td>
            <td className="text-center align-middle">....../....../20......</td>
            <td />
          </tr>
        </tbody>
      </table>
    </A4Page>
  );
}
