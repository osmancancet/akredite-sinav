"use client";

import * as React from "react";
import { BookMarked, FileArchive, FileSpreadsheet, FileText, Gauge, GraduationCap, ListChecks, ListTodo, Loader2, Paperclip, Plus, Search, Send, Sparkles, Trash2, Users, Wrench } from "lucide-react";
import { useData, useVault } from "@/lib/store";
import type { ActiveFramework, EvidenceStatus, FwCriterion, FwEvidence, FwSub } from "@/lib/accreditation/types";
import { STATUS_LABEL } from "@/lib/accreditation/types";
import { criterionEvidence, estimatedScore, matKey, progressOf, recKey, selfAssessment } from "@/lib/accreditation/progress";
import { cn, foldTr, formatTrDate, num, todayIso, uid } from "@/lib/utils";
import { Card, CardBody, CardHeader, StatTile } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Field, Input, Select } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/confirm";
import { exportEvidenceMatrix, exportEvidencePackage, exportSelfStudyDocx, listAppDocuments } from "@/services/accreditationService";
import { frameworkSuggestions } from "@/lib/accreditation/matcher";
import { ActionsSection, ActionsTable } from "./Actions";
import { GeneratorsView } from "./GeneratorsView";
import { RequestDialog, TeamCoordinator } from "./Team";
import { EvidenceItem, SourceLink, STATUS_DOT, StatusSelect, type DocContext } from "./EvidenceItem";
import type { AccreditationApi } from "./useAccreditation";

type View = "olcutler" | "ureticiler" | "gorevler" | "ekip" | "kaynaklar";
const SUB_PAGE = 15;
/** "Ölçüt 1" → "1" (başlık zaten ölçüt adını taşıyor) */
const shortId = (id: string) => id.replace(/^(Ölçüt|Standart|Kriter)\s+/i, "").replace(/\s+[–-]\s+.*$/, "");
type Filter = "all" | "open" | "unassigned" | "files" | "noYear" | "suggested";

export function Workspace({ fw, api, onCatalog }: { fw: ActiveFramework; api: AccreditationApi; onCatalog: () => void }) {
  const [view, setView] = React.useState<View>("olcutler");
  const [selected, setSelected] = React.useState<string>(fw.snapshot.criteria[0]?.id ?? "");
  const ws = api.ws;
  const data = useData();
  const docs = React.useMemo(() => listAppDocuments(data), [data]);
  const suggestions = React.useMemo(() => frameworkSuggestions(ws, fw), [ws, fw]);
  const ctx: DocContext = React.useMemo(() => ({ docs, suggestions }), [docs, suggestions]);
  const openActions = (ws.actions[fw.slug] ?? []).filter((a) => a.status === "open").length;
  const pendingTeam = ws.requests.filter((r) => r.slug === fw.slug && !r.submissions.length).length;
  const p = progressOf(ws, fw);
  const tasks = fw.snapshot.criteria.flatMap((c) => criterionEvidence(ws, fw, c)).filter((e) => {
    const r = ws.records[recKey(fw.slug, e.id)];
    return r?.due && r.status !== "ready" && r.status !== "na";
  }).length;

  const goTo = (criterionId: string) => {
    setSelected(criterionId);
    setView("olcutler");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      <WorkspaceHeader fw={fw} api={api} onCatalog={onCatalog} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Hazır kanıt" tone="emerald" value={`%${num(p.pct, 0)}`} hint={`${p.ready} / ${p.total - p.na} gerekli kalem`} icon={<ListChecks />} />
        <StatTile label="Hazırlanıyor" tone="amber" value={p.inProgress} hint={`${p.missing} kalem henüz başlanmadı`} />
        <StatTile label="Şifreli dosya" tone="brand" value={p.attachments} hint="Bu çerçeveye eklenen" icon={<Paperclip />} />
        <ScoreTile fw={fw} api={api} />
      </div>

      <Tabs
        value={view}
        onChange={setView}
        items={[
          { value: "olcutler", label: "Ölçütler ve kanıtlar", icon: <ListChecks /> },
          { value: "ureticiler", label: "Kanıt üreticileri", icon: <Sparkles /> },
          {
            value: "gorevler",
            label: "Görevler ve eylemler",
            icon: <ListTodo />,
            badge: tasks + openActions ? <span className="ml-1 rounded bg-zinc-200/80 px-1 font-mono text-[10px]">{tasks + openActions}</span> : undefined,
          },
          { value: "ekip", label: "Ekip", icon: <Users />, badge: pendingTeam ? <span className="ml-1 rounded bg-zinc-200/80 px-1 font-mono text-[10px]">{pendingTeam}</span> : undefined },
          { value: "kaynaklar", label: "Kaynak belgeler ve kurallar", icon: <BookMarked /> },
        ]}
      />

      {view === "olcutler" && <CriteriaView fw={fw} api={api} selected={selected} onSelect={setSelected} ctx={ctx} />}
      {view === "ureticiler" && <GeneratorsView fw={fw} api={api} ctx={ctx} onOpen={goTo} />}
      {view === "gorevler" && <TasksView fw={fw} api={api} onOpen={goTo} />}
      {view === "ekip" && <TeamCoordinator fw={fw} api={api} />}
      {view === "kaynaklar" && <SourcesView fw={fw} api={api} />}
    </div>
  );
}

function WorkspaceHeader({ fw, api, onCatalog }: { fw: ActiveFramework; api: AccreditationApi; onCatalog: () => void }) {
  const data = useData();
  const key = useVault((s) => s.key);
  const [busy, setBusy] = React.useState<string | null>(null);
  const run = async (id: string, fn: () => Promise<unknown> | unknown) => {
    setBusy(id);
    try {
      await fn();
    } catch (e) {
      toast.error("Çıktı üretilemedi", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };
  const doc = fw.snapshot.documents?.find((d) => d.role === "Ölçütler") ?? fw.snapshot.documents?.[0];

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {api.ws.active.length > 1 ? (
              <Select value={fw.slug} onChange={(e) => api.setCurrent(e.target.value)} className="h-8 w-auto font-semibold" aria-label="Akreditasyon çerçevesi">
                {api.ws.active.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.snapshot.code} · {a.scopeLabel}
                  </option>
                ))}
              </Select>
            ) : (
              <span className="text-[17px] font-semibold tracking-tight text-zinc-950">{fw.snapshot.code}</span>
            )}
            <Badge tone={fw.snapshot.kind === "institutional" ? "sky" : "slate"}>{fw.snapshot.kind === "institutional" ? "Kurumsal" : "Program"}</Badge>
            {fw.snapshot.status === "custom" && <Badge tone="amber">Kurum tanımlı ölçüt seti</Badge>}
          </div>
          <div className="mt-1 text-[13px] text-zinc-700">{fw.scopeLabel}</div>
          {doc && (
            <a href={doc.url} target="_blank" rel="noreferrer noopener" className="mt-0.5 block truncate text-[11.5px] text-zinc-500 hover:text-brand-800">
              {doc.title} {doc.version && `· ${doc.version}`} · kasaya alındı {formatTrDate(fw.activatedAt.slice(0, 10))}
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("xlsx", () => exportEvidenceMatrix(data, fw))}>
            {busy === "xlsx" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />} Kanıt matrisi
          </Button>
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("docx", () => exportSelfStudyDocx(data, fw))}>
            {busy === "docx" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} Öz değerlendirme taslağı
          </Button>
          <Button
            size="sm"
            disabled={!!busy || !key}
            onClick={() =>
              run("zip", async () => {
                const r = await exportEvidencePackage(data, fw, key!);
                toast.success(`Kanıt paketi hazır: ${r.files} dosya`, r.missing ? `${r.missing} gerekli kalemde henüz dosya yok (İÇİNDEKİLER’de listelendi).` : "Tüm gerekli kalemlerde dosya var.");
              })
            }
          >
            {busy === "zip" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileArchive className="h-3.5 w-3.5" />} Kanıt paketi (.zip)
          </Button>
          <Button size="sm" variant="ghost" onClick={onCatalog}>
            <Plus className="h-3.5 w-3.5" /> Akreditasyon ekle
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ScoreTile({ fw, api }: { fw: ActiveFramework; api: AccreditationApi }) {
  const est = estimatedScore(api.ws, fw);
  if (est) {
    return (
      <StatTile
        label="Tahmini puan (resmi değil)"
        value={est.rated ? `${num(est.score, 0)}` : "—"}
        hint={`${est.max} üzerinden · ${est.rated}/${est.totalSubs} alt ölçüt puanlandı`}
        icon={<Gauge />}
      />
    );
  }
  const sa = selfAssessment(api.ws, fw);
  if (sa.total) {
    return (
      <StatTile
        label="Öz değerlendirme ortalaması"
        tone={sa.rated && sa.mean < 3 ? "amber" : "slate"}
        value={sa.rated ? `${num(sa.mean, 1)} / 5` : "—"}
        hint={`${sa.rated}/${sa.total} rehber satırı işaretlendi${sa.low ? ` · ${sa.low} satır 2 ve altı` : ""}`}
        icon={<Gauge />}
      />
    );
  }
  const subs = fw.snapshot.criteria.reduce((n, c) => n + (c.sub?.length ?? 0), 0);
  return <StatTile label="Ölçüt" value={fw.snapshot.criteria.length} hint={subs ? `${subs} alt ölçüt` : "Ana ölçüt"} icon={<Gauge />} />;
}

// ---------------------------------------------------------------------------
// Ölçütler
// ---------------------------------------------------------------------------

function CriteriaView({ fw, api, selected, onSelect, ctx }: { fw: ActiveFramework; api: AccreditationApi; selected: string; onSelect: (id: string) => void; ctx: DocContext }) {
  const year = useData().institution.academicYear;
  const [filter, setFilter] = React.useState<Filter>("all");
  const [query, setQuery] = React.useState("");
  const ws = api.ws;
  const criteria = fw.snapshot.criteria;
  const current = criteria.find((c) => c.id === selected) ?? criteria[0];
  const q = foldTr(query.trim());

  const visible = (e: FwEvidence) => {
    const r = ws.records[recKey(fw.slug, e.id)];
    const st = r?.status ?? "missing";
    if (filter === "open" && (st === "ready" || st === "na")) return false;
    if (filter === "unassigned" && (r?.owner || st === "ready" || st === "na")) return false;
    if (filter === "files" && !r?.attachments.length) return false;
    if (filter === "noYear" && (st === "na" || r?.attachments.some((a) => a.period === year))) return false;
    if (filter === "suggested" && (r?.attachments.length || !ctx.docs.some((d) => d.available && (ctx.suggestions.get(e.id) ?? []).some((x) => x.kind === d.kind)))) return false;
    if (q && !foldTr(`${e.title} ${r?.note ?? ""} ${r?.owner ?? ""}`).includes(q)) return false;
    return true;
  };
  const filtering = filter !== "all" || !!q;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(240px,300px)_1fr]">
      <Card className="lg:sticky lg:top-20">
        <div className="space-y-2 border-b border-zinc-100 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Kanıt, not veya sorumlu ara" className="pl-8" aria-label="Kanıt ara" />
          </div>
          <Select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Filtre">
            <option value="all">Tüm kanıtlar</option>
            <option value="open">Tamamlanmamış</option>
            <option value="unassigned">Sorumlusu atanmamış</option>
            <option value="files">Dosyası olan</option>
            <option value="noYear">{year} dosyası olmayan</option>
            <option value="suggested">Uygulamada hazır belgesi olan, eklenmemiş</option>
          </Select>
        </div>
        <nav className="max-h-[calc(100vh-14rem)] overflow-y-auto py-1" aria-label="Ölçütler">
          {criteria.map((c, i) => {
            const cp = progressOf(ws, fw, [c]);
            const hits = filtering ? criterionEvidence(ws, fw, c).filter(visible).length : null;
            const heading = c.heading && (i === 0 || criteria[i - 1].heading !== c.heading) ? c.heading : null;
            return (
              <React.Fragment key={c.id}>
                {heading && <div className="px-4 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-zinc-400">{heading}</div>}
                <button
                  onClick={() => onSelect(c.id)}
                  className={cn("block w-full px-4 py-2 text-left transition-colors", current?.id === c.id ? "bg-brand-50/70" : "hover:bg-zinc-50", hits === 0 && "opacity-45")}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[11px] text-zinc-500">{shortId(c.id)}</span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-zinc-900" title={c.title}>
                      {c.title}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-zinc-500">{hits ?? `%${num(cp.pct, 0)}`}</span>
                  </div>
                  <div className="mt-1.5 flex h-1 overflow-hidden rounded-full bg-zinc-100">
                    <div className="bg-emerald-600" style={{ width: `${cp.total ? (cp.ready / cp.total) * 100 : 0}%` }} />
                    <div className="bg-amber-400" style={{ width: `${cp.total ? (cp.inProgress / cp.total) * 100 : 0}%` }} />
                  </div>
                </button>
              </React.Fragment>
            );
          })}
        </nav>
      </Card>
      {current && <CriterionPanel key={current.id} fw={fw} c={current} api={api} visible={visible} filtering={filtering} ctx={ctx} />}
    </div>
  );
}

function CriterionPanel({ fw, c, api, visible, filtering, ctx }: { fw: ActiveFramework; c: FwCriterion; api: AccreditationApi; visible: (e: FwEvidence) => boolean; filtering: boolean; ctx: DocContext }) {
  const [open, setOpen] = React.useState<string | null>(null);
  const [newTitle, setNewTitle] = React.useState("");
  const [subQuery, setSubQuery] = React.useState("");
  const [showAll, setShowAll] = React.useState(false);
  const ws = api.ws;
  const all = criterionEvidence(ws, fw, c);
  const customIds = new Set((ws.custom[fw.slug] ?? []).map((x) => x.id));
  const subs = c.sub ?? [];
  const subIds = new Set(subs.map((s) => s.id));
  const general = all.filter((e) => !e.sub || !subIds.has(e.sub));
  const sq = foldTr(subQuery.trim());
  const shownSubs = sq ? subs.filter((s) => foldTr(`${s.id} ${s.title ?? ""} ${s.text}`).includes(sq)) : subs;
  const cp = progressOf(ws, fw, [c]);

  const list = (items: FwEvidence[]) => {
    const shown = items.filter(visible);
    if (!shown.length) return filtering && items.length ? <p className="px-3 py-2 text-xs text-zinc-400">Filtreyle eşleşen kanıt yok.</p> : null;
    return (
      <ul className="space-y-1">
        {shown.map((e) => (
          <EvidenceItem key={e.id} fw={fw} e={e} api={api} custom={customIds.has(e.id)} open={open === e.id} onToggle={() => setOpen(open === e.id ? null : e.id)} ctx={ctx} />
        ))}
      </ul>
    );
  };

  return (
    <Card>
      <div className="border-b border-zinc-100 px-5 py-4">
        {c.heading && <div className="text-[11px] font-medium text-zinc-500">{c.heading}</div>}
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-display text-[22px] font-medium leading-tight text-zinc-950">
            <span className="font-mono text-[15px] text-zinc-500">{shortId(c.id)}</span> {c.title}
          </h2>
          {typeof c.points === "number" && <Badge tone="slate">{c.points} puan</Badge>}
          {c.disciplineSpecific && <Badge tone="amber">Disipline özgü ölçüt</Badge>}
          {c.critical && <Badge tone="red">Kritik standart</Badge>}
        </div>
        {c.description && <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">{c.description}</p>}
        {c.appliesTo && <p className="mt-1 text-[12px] text-zinc-500">Kapsam: {c.appliesTo}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-zinc-500">
          <span>
            <b className="font-mono font-medium text-zinc-800">{cp.ready}</b> hazır · <b className="font-mono font-medium text-zinc-800">{cp.inProgress}</b> hazırlanıyor ·{" "}
            <b className="font-mono font-medium text-zinc-800">{cp.missing}</b> eksik
          </span>
          {c.source && <SourceLink source={c.source} />}
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-5">
        {subs.length > SUB_PAGE && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
              <Input value={subQuery} onChange={(e) => setSubQuery(e.target.value)} placeholder={`${subs.length} alt başlık içinde ara (ör. program adı)`} className="pl-8" aria-label="Alt ölçüt ara" />
            </div>
            <span className="text-[11.5px] text-zinc-500">{shownSubs.length} eşleşme</span>
          </div>
        )}
        {(showAll || subQuery ? shownSubs : shownSubs.slice(0, SUB_PAGE)).map((s) => (
          <SubBlock key={s.id} fw={fw} s={s} api={api} criterionId={c.id}>
            {list(all.filter((e) => e.sub === s.id))}
          </SubBlock>
        ))}
        {!showAll && !subQuery && shownSubs.length > SUB_PAGE && (
          <Button variant="outline" size="sm" onClick={() => setShowAll(true)}>
            Tüm alt başlıkları göster ({shownSubs.length})
          </Button>
        )}
        {(general.length > 0 || !subs.length) && (
          <section>
            {subs.length > 0 && <h3 className="mb-2 text-[12.5px] font-semibold text-zinc-800">Ölçüt geneli</h3>}
            {list(general)}
            {!general.length && !subs.length && <p className="px-3 text-xs text-zinc-500">Bu ölçüt için kuruluş belgesinde kanıt listesi yok; aşağıdan kendi kanıt kalemlerinizi ekleyin.</p>}
          </section>
        )}
        <ActionsSection fw={fw} api={api} criterionId={c.id} />
        <form
          className="flex gap-2 border-t border-zinc-100 pt-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!newTitle.trim()) return;
            api.addCustom(fw.slug, c.id, newTitle.trim());
            setNewTitle("");
          }}
        >
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={`${c.id} için kurumunuza özgü bir kanıt kalemi ekleyin`} aria-label="Yeni kanıt kalemi" />
          <Button type="submit" variant="outline" disabled={!newTitle.trim()}>
            <Plus className="h-4 w-4" /> Ekle
          </Button>
        </form>
      </div>
    </Card>
  );
}

function SubBlock({ fw, s, api, children, criterionId }: { fw: ActiveFramework; s: FwSub; api: AccreditationApi; children: React.ReactNode; criterionId: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const scale = fw.snapshot.scale;
  return (
    <section className="rounded-xl border border-zinc-200/80">
      <div className="px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-mono text-[11.5px] text-zinc-500">{s.id}</span>
          {s.title && <h3 className="text-[13.5px] font-semibold text-zinc-900">{s.title}</h3>}
          {s.critical && <Badge tone="red">Kritik</Badge>}
        </div>
        <p className={cn("mt-1 whitespace-pre-line text-[12.5px] leading-relaxed text-zinc-600", !expanded && "line-clamp-3")}>{s.text}</p>
        {(s.text.length > 260 || s.text.split("\n").length > 3) && (
          <button onClick={() => setExpanded(!expanded)} className="mt-0.5 text-[11.5px] font-medium text-brand-800 hover:underline">
            {expanded ? "Daha az göster" : "Tamamını göster"}
          </button>
        )}
        {s.maturity && <LevelPicker fw={fw} api={api} unitId={s.id} levels={s.maturity} label="Olgunluk düzeyi" criterionId={criterionId} statement={s.title ?? s.text} />}
        {s.rubric?.map((r) => (
          <div key={r.id} className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2.5">
            <p className="text-[12px] leading-relaxed text-zinc-700">{r.statement}</p>
            <LevelPicker fw={fw} api={api} unitId={r.id} levels={r.levels} scale={scale} label="Öz değerlendirme" criterionId={criterionId} statement={r.statement} />
            <SourceLink source={r.source} className="mt-1.5 text-[10.5px]" />
          </div>
        ))}
        {s.source && <SourceLink source={s.source} className="mt-2 text-[11px]" />}
      </div>
      <div className="border-t border-zinc-100 p-1.5">{children ?? <p className="px-3 py-2 text-xs text-zinc-400">Bu alt ölçüt için kuruluş belgesinde ayrıca kanıt sayılmamış; aşağıdan kanıt kalemi ekleyebilirsiniz.</p>}</div>
    </section>
  );
}

/** Düzey seçici: kuruluşun düzey tanımı seçilince altında gösterilir. */
function LevelPicker({
  fw,
  api,
  unitId,
  levels,
  scale,
  label,
  criterionId,
  statement,
}: {
  fw: ActiveFramework;
  api: AccreditationApi;
  unitId: string;
  levels: Record<string, string>;
  scale?: Record<string, string>;
  label: string;
  criterionId: string;
  statement: string;
}) {
  const level = api.ws.maturity[matKey(fw.slug, unitId)];
  const hasAction = (api.ws.actions[fw.slug] ?? []).some((a) => a.unitId === unitId && a.status === "open");
  const next = level ? levels[String(level + 1)] : undefined;
  const keys = Object.keys(levels).sort();
  return (
    <div className="mt-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11.5px] font-medium text-zinc-600">{label}</span>
        {keys.map((l) => (
          <button
            key={l}
            onClick={() => api.setMaturity(fw.slug, unitId, level === Number(l) ? null : Number(l))}
            title={`${scale?.[l] ? `${scale[l]}: ` : ""}${levels[l]}`}
            aria-pressed={level === Number(l)}
            className={cn(
              "h-7 min-w-7 rounded-md px-2 font-mono text-[12px] ring-1 ring-inset transition-colors",
              level === Number(l) ? "bg-zinc-900 text-white ring-zinc-900" : "bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-50",
            )}
          >
            {l}
            {scale?.[l] && level === Number(l) && <span className="ml-1.5 font-sans">{scale[l]}</span>}
          </button>
        ))}
      </div>
      {level && levels[String(level)] && <p className="mt-2 rounded-md bg-white px-3 py-2 text-[12px] leading-relaxed text-zinc-700 ring-1 ring-inset ring-zinc-200/80">{levels[String(level)]}</p>}
      {level != null && level <= 2 && !hasAction && (
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={() => {
            api.addAction(fw.slug, {
              criterionId,
              unitId,
              title: `${unitId}: ${level}. düzeyden ${level + 1}. düzeye — ${next ?? statement}`.slice(0, 240),
            });
            toast.success("İyileştirme eylemi açıldı", "Görevler ve eylemler sekmesinde sorumlu ve tarih atayın.");
          }}
        >
          <Wrench className="h-3.5 w-3.5" /> İyileştirme eylemi aç
        </Button>
      )}
      {hasAction && <p className="mt-1.5 text-[11px] text-amber-800">Bu satır için açık bir iyileştirme eylemi var.</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Görevler
// ---------------------------------------------------------------------------

function TasksView({ fw, api, onOpen }: { fw: ActiveFramework; api: AccreditationApi; onOpen: (criterionId: string) => void }) {
  const ws = api.ws;
  const [requestFor, setRequestFor] = React.useState<string | null>(null);
  const [owner, setOwner] = React.useState("");
  const [status, setStatus] = React.useState<EvidenceStatus | "open" | "">("open");
  const today = todayIso();
  const rows = fw.snapshot.criteria.flatMap((c) =>
    criterionEvidence(ws, fw, c).map((e) => {
      const r = ws.records[recKey(fw.slug, e.id)];
      return { c, e, r, st: r?.status ?? ("missing" as EvidenceStatus) };
    }),
  );
  const owners = Array.from(new Set(rows.map((x) => x.r?.owner).filter((x): x is string => !!x))).sort((a, b) => a.localeCompare(b, "tr"));
  const shown = rows
    .filter((x) => (!owner || x.r?.owner === owner) && (!status || (status === "open" ? x.st !== "ready" && x.st !== "na" : x.st === status)))
    .filter((x) => x.r?.owner || x.r?.due || status !== "open")
    .sort((a, b) => (a.r?.due ?? "9999").localeCompare(b.r?.due ?? "9999"));

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-6">
      <ActionsTable fw={fw} api={api} onOpen={onOpen} />
      <Card>
        <CardHeader
          icon={<ListTodo />}
          title="Kanıt görevleri"
          description="Sorumlu veya son tarih atanmış kalemler, son tarihe göre. Satıra tıklayınca ölçüt açılır."
          actions={
            <>
              <Select value={owner} onChange={(e) => setOwner(e.target.value)} className="h-8 w-auto" aria-label="Sorumlu">
                <option value="">Tüm sorumlular</option>
                {owners.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
              <Select value={status} onChange={(e) => setStatus(e.target.value as EvidenceStatus | "open" | "")} className="h-8 w-auto" aria-label="Durum">
                <option value="open">Tamamlanmamış (atanmış)</option>
                <option value="">Tüm durumlar</option>
                {(Object.keys(STATUS_LABEL) as EvidenceStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </>
          }
        />
        {shown.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="text-left text-[11px] text-zinc-500">
                <tr className="border-b border-zinc-100">
                  <th className="px-5 py-2 font-medium">Kanıt</th>
                  <th className="px-3 py-2 font-medium">Sorumlu</th>
                  <th className="px-3 py-2 font-medium">Son tarih</th>
                  <th className="px-3 py-2 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, 300).map(({ c, e, r, st }) => {
                  const late = !!r?.due && r.due < today && st !== "ready" && st !== "na";
                  return (
                    <tr key={e.id} className="cursor-pointer border-b border-zinc-50 last:border-0 hover:bg-zinc-50" onClick={() => onOpen(c.id)}>
                      <td className="px-5 py-2">
                        <div className="text-zinc-900">{e.title}</div>
                        <div className="font-mono text-[10.5px] text-zinc-400">
                          {e.sub ?? c.id} · {c.title}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-zinc-700">{r?.owner ?? "—"}</td>
                      <td className={cn("whitespace-nowrap px-3 py-2 font-mono tabular-nums", late ? "font-medium text-red-700" : "text-zinc-700")}>{r?.due ? formatTrDate(r.due) : "—"}</td>
                      <td className="px-3 py-2" onClick={(ev) => ev.stopPropagation()}>
                        <StatusSelect value={st} onChange={(s) => api.patchRecord(fw.slug, e.id, { status: s })} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {shown.length > 300 && <p className="px-5 py-2 text-xs text-zinc-500">İlk 300 kalem gösteriliyor; filtreyi daraltın.</p>}
          </div>
        ) : (
          <CardBody>
            <p className="text-sm text-zinc-500">
              {status === "open" ? "Atanmış açık görev yok. Bir kanıtı açıp sorumlu ve son tarih girdiğinizde burada listelenir." : "Bu filtreyle eşleşen kanıt yok."}
            </p>
          </CardBody>
        )}
      </Card>
      </div>
      <Card>
        <CardHeader icon={<Users />} title="Sorumlu bazında" description="Kişiye kanıt talebi dosyası gönderebilirsiniz." />
        <ul className="divide-y divide-zinc-100">
          {owners.length ? (
            owners.map((o) => {
              const mine = rows.filter((x) => x.r?.owner === o && x.st !== "na");
              const done = mine.filter((x) => x.st === "ready").length;
              const late = mine.filter((x) => x.r?.due && x.r.due < today && x.st !== "ready").length;
              return (
                <li key={o} className="px-5 py-2.5">
                  <button className="w-full text-left" onClick={() => setOwner(owner === o ? "" : o)}>
                    <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                      <span className={cn("truncate font-medium", owner === o ? "text-brand-800" : "text-zinc-900")}>{o}</span>
                      <span className="font-mono text-[11px] tabular-nums text-zinc-500">
                        {done}/{mine.length}
                      </span>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-zinc-100">
                      <div className="h-1 rounded-full bg-emerald-600" style={{ width: `${mine.length ? (done / mine.length) * 100 : 0}%` }} />
                    </div>
                    {late > 0 && <div className="mt-1 text-[11px] text-red-700">{late} gecikmiş</div>}
                  </button>
                  {mine.length > done && (
                    <Button size="sm" variant="ghost" className="mt-1 h-7 px-2 text-[11.5px]" onClick={() => setRequestFor(o)}>
                      <Send className="h-3 w-3" /> Kanıt talebi gönder
                    </Button>
                  )}
                </li>
              );
            })
          ) : (
            <li className="px-5 py-3 text-xs text-zinc-500">Henüz sorumlu atanmadı.</li>
          )}
        </ul>
        <div className="flex flex-wrap gap-3 border-t border-zinc-100 px-5 py-3 text-[11px] text-zinc-500">
          {(Object.keys(STATUS_LABEL) as EvidenceStatus[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[s])} /> {STATUS_LABEL[s]} {rows.filter((x) => x.st === s).length}
            </span>
          ))}
        </div>
      </Card>
      <RequestDialog fw={fw} api={api} recipient={requestFor} onClose={() => setRequestFor(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kaynaklar
// ---------------------------------------------------------------------------

function SourcesView({ fw, api }: { fw: ActiveFramework; api: AccreditationApi }) {
  const s = fw.snapshot;
  const [scope, setScope] = React.useState(fw.scopeLabel);
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card>
          <CardHeader icon={<BookMarked />} title="Kaynak belgeler" description={`Ölçüt verisi bu belgelerden alınmıştır · son erişim ${formatTrDate(s.accessed)}`} />
          {s.documents?.length ? (
            <ul className="divide-y divide-zinc-100">
              {s.documents.map((d) => (
                <li key={d.url} className="px-5 py-3">
                  <a href={d.url} target="_blank" rel="noreferrer noopener" className="text-[13px] font-medium text-zinc-900 hover:text-brand-800 hover:underline">
                    {d.title ?? d.url}
                  </a>
                  <div className="mt-0.5 text-[11.5px] text-zinc-500">{[d.role, d.version, d.date].filter(Boolean).join(" · ")}</div>
                </li>
              ))}
            </ul>
          ) : (
            <CardBody>
              <p className="text-sm text-zinc-500">{s.status === "custom" ? "Bu ölçüt seti kurumunuz tarafından tanımlandı." : "Belge kaydı yok."}</p>
            </CardBody>
          )}
        </Card>
        {s.cycle && (
          <Card>
            <CardHeader title="Süreç, puanlama ve karar" />
            <CardBody>
              <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-zinc-700">{s.cycle}</p>
            </CardBody>
          </Card>
        )}
        {s.scoring && (
          <Card>
            <CardHeader title="Puanlama ölçeği" />
            <CardBody>
              <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-zinc-700">{s.scoring}</p>
            </CardBody>
          </Card>
        )}
        {s.report && (
          <Card>
            <CardHeader title={s.report.title ?? "Öz değerlendirme raporu"} description={s.report.url ? <SourceLink source={s.report.url} /> : undefined} />
            <CardBody className="space-y-4 text-[12.5px] leading-relaxed text-zinc-700">
              {s.report.sections?.length ? (
                <div>
                  <div className="mb-1 text-[11.5px] font-medium text-zinc-500">Rapor bölümleri</div>
                  <ol className="list-decimal space-y-0.5 pl-5">
                    {s.report.sections.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
              {s.report.requiredAppendices?.length ? (
                <div>
                  <div className="mb-1 text-[11.5px] font-medium text-zinc-500">Zorunlu ekler</div>
                  <ul className="list-disc space-y-0.5 pl-5">
                    {s.report.requiredAppendices.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {s.report.writingRules?.length ? (
                <div>
                  <div className="mb-1 text-[11.5px] font-medium text-zinc-500">Yazım ve kanıt kuralları</div>
                  <ul className="list-disc space-y-0.5 pl-5">
                    {s.report.writingRules.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardBody>
          </Card>
        )}
      </div>
      <div className="space-y-6">
        {s.programOutcomes?.length ? <ProgramOutcomesCard fw={fw} /> : null}
        <Card>
          <CardHeader title="Çalışma alanı" />
          <CardBody className="space-y-4">
            <Field label="Kapsam">
              <Input value={scope} onChange={(e) => setScope(e.target.value)} onBlur={() => scope.trim() && scope !== fw.scopeLabel && api.setScope(fw.slug, scope.trim())} />
            </Field>
            <div className="text-[11.5px] text-zinc-500">Kasaya alınma: {formatTrDate(fw.activatedAt.slice(0, 10))}</div>
            {s.notes && <p className="rounded-lg bg-zinc-50 px-3 py-2 text-[11.5px] leading-relaxed text-zinc-600">{s.notes}</p>}
            <Button
              variant="ghost"
              size="sm"
              className="text-red-700 hover:bg-red-50 hover:text-red-800"
              onClick={async () => {
                const files = progressOf(api.ws, fw).attachments;
                if (
                  await confirmDialog({
                    title: `${s.code} çalışma alanı kaldırılsın mı?`,
                    message: `Durumlar, notlar, olgunluk değerleri ve ${files} şifreli dosya kalıcı olarak silinecek. Önce kanıt paketini veya .akredite yedeğini indirmeniz önerilir.`,
                    destructive: true,
                    confirmLabel: "Kaldır",
                  })
                ) {
                  await api.deactivate(fw.slug);
                  toast.success(`${s.code} kaldırıldı`);
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Çalışma alanını kaldır
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function ProgramOutcomesCard({ fw }: { fw: ActiveFramework }) {
  const data = useData();
  const update = useVault((st) => st.update);
  const list = fw.snapshot.programOutcomes ?? [];
  const same = data.programOutcomes.length === list.length && list.every((p, i) => foldTr(data.programOutcomes[i]?.text ?? "") === foldTr(p.text));
  return (
    <Card>
      <CardHeader
        icon={<GraduationCap />}
        title={`${fw.snapshot.code} program çıktıları`}
        description={same ? "Programınızın PÇ listesi bununla aynı." : "ÖÇ/PÇ analizi ve sınav belirtke tablolarında kullanılmak üzere programınıza aktarılabilir."}
      />
      <ol className="max-h-80 divide-y divide-zinc-100 overflow-y-auto">
        {list.map((p) => (
          <li key={p.id} className="px-5 py-2 text-[12px] leading-relaxed text-zinc-700">
            <span className="font-mono text-[11px] text-zinc-500">{p.id}</span> {p.group && <span className="text-[10.5px] uppercase tracking-wide text-zinc-400">{p.group} · </span>}
            {p.text}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-5 py-3">
        <SourceLink source={list[0]?.source ?? ""} className="text-[11px]" />
        <Button
          size="sm"
          variant="outline"
          disabled={same}
          onClick={async () => {
            const ok = await confirmDialog({
              title: "Program çıktıları değiştirilsin mi?",
              message: `Mevcut ${data.programOutcomes.length} program çıktısı ${fw.snapshot.code} listesindeki ${list.length} çıktıyla değiştirilecek. Derslerdeki ÖÇ–PÇ ilişki matrisi yeni listeye göre sıfırlanır; ders başına yeniden doldurmanız gerekir.`,
              confirmLabel: "Aktar",
            });
            if (!ok) return;
            update(
              "programOutcomes",
              list.map((p, i) => ({ id: uid("pc"), code: `PÇ-${i + 1}`, text: p.text })),
            );
            update("courses", (cs) => cs.map((c) => ({ ...c, ocPcMatrix: Object.fromEntries(c.outcomes.map((o) => [o.id, list.map(() => 0)])) })));
            toast.success(`${list.length} program çıktısı aktarıldı`, "Ders kataloğunda ÖÇ–PÇ ilişkilerini güncelleyin.");
          }}
        >
          Programıma aktar
        </Button>
      </div>
    </Card>
  );
}
