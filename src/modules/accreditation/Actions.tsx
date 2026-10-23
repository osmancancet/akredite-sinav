"use client";

import * as React from "react";
import { CheckCircle2, Circle, Plus, Trash2, Wrench } from "lucide-react";
import type { ActiveFramework, ImprovementAction } from "@/lib/accreditation/types";
import { cn, formatTrDate, todayIso } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { confirmDialog } from "@/components/ui/confirm";
import type { AccreditationApi } from "./useAccreditation";

function ActionRow({ fw, api, a, showCriterion, onOpen }: { fw: ActiveFramework; api: AccreditationApi; a: ImprovementAction; showCriterion?: boolean; onOpen?: (criterionId: string) => void }) {
  const done = a.status === "done";
  const late = !done && !!a.due && a.due < todayIso();
  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 py-2.5">
      <button
        className={cn("mt-0.5", done ? "text-emerald-600" : "text-zinc-400 hover:text-zinc-700")}
        aria-label={done ? "Açık olarak işaretle" : "Tamamlandı olarak işaretle"}
        onClick={() => api.patchAction(fw.slug, a.id, { status: done ? "open" : "done" })}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1 basis-60">
        <div className={cn("text-[12.5px] leading-snug", done ? "text-zinc-400 line-through" : "text-zinc-900")}>{a.title}</div>
        <div className="mt-0.5 text-[11px] text-zinc-500">
          {showCriterion && (
            <button className="font-mono hover:text-brand-800 hover:underline" onClick={() => onOpen?.(a.criterionId)}>
              {a.criterionId}
            </button>
          )}
          {showCriterion && " · "}
          açıldı {formatTrDate(a.createdAt.slice(0, 10))}
          {done && a.doneAt && ` · tamamlandı ${formatTrDate(a.doneAt.slice(0, 10))}`}
          {late && <span className="font-medium text-red-700"> · gecikti</span>}
        </div>
      </div>
      <Input
        key={`o-${a.owner ?? ""}`}
        defaultValue={a.owner ?? ""}
        placeholder="Sorumlu"
        aria-label="Eylem sorumlusu"
        className="h-8 w-40"
        onBlur={(e) => e.target.value !== (a.owner ?? "") && api.patchAction(fw.slug, a.id, { owner: e.target.value.trim() || undefined })}
      />
      <Input type="date" value={a.due ?? ""} aria-label="Eylem son tarihi" className="h-8 w-36" onChange={(e) => api.patchAction(fw.slug, a.id, { due: e.target.value || undefined })} />
      <Button
        size="icon"
        variant="ghost"
        aria-label="Eylemi sil"
        onClick={async () => {
          if (await confirmDialog({ title: "Eylem silinsin mi?", message: a.title, destructive: true, confirmLabel: "Sil" })) api.removeAction(fw.slug, a.id);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}

/** Ölçüt panelindeki iyileştirme eylemleri */
export function ActionsSection({ fw, api, criterionId }: { fw: ActiveFramework; api: AccreditationApi; criterionId: string }) {
  const [title, setTitle] = React.useState("");
  const list = (api.ws.actions[fw.slug] ?? []).filter((a) => a.criterionId === criterionId);
  return (
    <section className="rounded-xl border border-zinc-200/80">
      <div className="flex items-center gap-2 px-4 pt-3 text-[12.5px] font-semibold text-zinc-800">
        <Wrench className="h-3.5 w-3.5 text-zinc-400" /> İyileştirme eylemleri (PUKÖ)
        <span className="font-normal text-zinc-400">{list.length ? `${list.filter((a) => a.status === "done").length}/${list.length} tamamlandı` : ""}</span>
      </div>
      {list.length > 0 && (
        <ul className="mt-1 divide-y divide-zinc-100">
          {list.map((a) => (
            <ActionRow key={a.id} fw={fw} api={api} a={a} />
          ))}
        </ul>
      )}
      <form
        className="flex gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          api.addAction(fw.slug, { criterionId, title: title.trim() });
          setTitle("");
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Eylem ekleyin (ör. Danışma kurulu toplantısını yılda iki kez yapmak)" aria-label="Yeni iyileştirme eylemi" />
        <Button type="submit" variant="outline" disabled={!title.trim()}>
          <Plus className="h-4 w-4" /> Eylem
        </Button>
      </form>
    </section>
  );
}

/** Görevler sekmesindeki bütün eylemler */
export function ActionsTable({ fw, api, onOpen }: { fw: ActiveFramework; api: AccreditationApi; onOpen: (criterionId: string) => void }) {
  const [showDone, setShowDone] = React.useState(false);
  const all = api.ws.actions[fw.slug] ?? [];
  const list = all.filter((a) => showDone || a.status === "open").sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  return (
    <Card>
      <CardHeader
        icon={<Wrench />}
        title="İyileştirme eylemleri"
        description="Düşük öz değerlendirme düzeylerinden veya ölçüt panelinden açılan eylemler. Öz değerlendirme raporuna ve kanıt matrisine aktarılır."
        actions={
          all.some((a) => a.status === "done") ? (
            <Button size="sm" variant="ghost" onClick={() => setShowDone(!showDone)}>
              {showDone ? "Tamamlananları gizle" : `Tamamlananları göster (${all.filter((a) => a.status === "done").length})`}
            </Button>
          ) : undefined
        }
      />
      {list.length ? (
        <ul className="divide-y divide-zinc-100">
          {list.map((a) => (
            <ActionRow key={a.id} fw={fw} api={api} a={a} showCriterion onOpen={onOpen} />
          ))}
        </ul>
      ) : (
        <CardBody>
          <p className="text-sm text-zinc-500">Açık eylem yok. Bir rehber satırında 1 veya 2 düzeyini seçtiğinizde “İyileştirme eylemi aç” görünür.</p>
        </CardBody>
      )}
    </Card>
  );
}
