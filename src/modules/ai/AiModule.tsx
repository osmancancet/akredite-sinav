"use client";

import * as React from "react";
import {
  Bot,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  MessageSquare,
  PlugZap,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { useData, useVault } from "@/lib/store";
import type { AiProvider, AiSettings } from "@/lib/types";
import { AI_PROVIDERS } from "@/lib/aiDefaults";
import { cn } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { navigateTo } from "@/hooks/useHashRoute";
import { AI_SYSTEM_PROMPT, aiChat, isConfigured, testConnection, type ChatMessage } from "@/services/aiCopilotService";
import { useAiRunner } from "./useAi";

export function AiModule() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <ProviderSettings />
        <div className="space-y-4">
          <GeminiGuide />
          <SecurityNotes />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <QualityChat />
        <ActionsIndex />
      </div>
    </div>
  );
}

function ProviderSettings() {
  const ai = useData().ai;
  const update = useVault((s) => s.update);
  const [show, setShow] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [result, setResult] = React.useState<{ ok: boolean; message: string; models?: string[] } | null>(null);
  const set = (patch: Partial<AiSettings>) => update("ai", (p) => ({ ...p, ...patch }));
  const provider = AI_PROVIDERS.find((p) => p.value === ai.provider)!;
  const custom = !provider.models.includes(ai.models[ai.provider]);

  const test = async () => {
    setTesting(true);
    setResult(null);
    const r = await testConnection(ai);
    setResult(r);
    setTesting(false);
    if (r.ok) toast.success("Bağlantı başarılı", r.message);
    else toast.error("Bağlantı başarısız", r.message);
  };

  return (
    <Card>
      <CardHeader
        icon={<Bot className="h-4 w-4" />}
        title="AI Sağlayıcısı (Kendi Anahtarını Getir)"
        description="İstekler tarayıcınızdan doğrudan sağlayıcıya gider. Arada AkrediteSınav sunucusu yoktur."
        actions={<Badge tone={isConfigured(ai) ? "emerald" : "amber"}>{isConfigured(ai) ? "Yapılandırıldı" : "Anahtar bekleniyor"}</Badge>}
      />
      <CardBody className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-4">
          {AI_PROVIDERS.map((p) => (
            <button
              key={p.value}
              onClick={() => {
                set({ provider: p.value as AiProvider });
                setResult(null);
              }}
              className={cn(
                "rounded-xl px-3 py-3 text-left ring-1 transition-colors cursor-pointer",
                ai.provider === p.value ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white ring-slate-200 hover:bg-slate-50",
              )}
            >
              <div className="text-sm font-semibold">{p.label}</div>
              <div className={cn("text-[11px]", ai.provider === p.value ? "text-indigo-100" : "text-slate-500")}>
                {p.value === "gemini" ? "Ücretsiz katman" : p.value === "ollama" ? "Tam yerel · %100 offline" : "Ücretli API"}
              </div>
            </button>
          ))}
        </div>

        {ai.provider !== "ollama" ? (
          <Field
            label={`${provider.label} API Anahtarı`}
            hint={
              <>
                Anahtar kasada AES-256-GCM ile şifreli saklanır.{" "}
                {provider.keyUrl && (
                  <a href={provider.keyUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-0.5 text-indigo-600 underline">
                    Anahtar al <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </>
            }
          >
            <div className="flex gap-2">
              <Input
                type={show ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                placeholder={provider.keyHint}
                value={ai.keys[ai.provider as Exclude<AiProvider, "ollama">]}
                onChange={(e) => set({ keys: { ...ai.keys, [ai.provider]: e.target.value.trim() } })}
                className="font-mono"
              />
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setShow((v) => !v)} aria-label="Göster/gizle">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => set({ keys: { ...ai.keys, [ai.provider]: "" } })} aria-label="Anahtarı sil">
                <Trash2 className="h-4 w-4 text-slate-400" />
              </Button>
            </div>
          </Field>
        ) : (
          <Field label="Ollama Adresi" hint="Ollama'yı OLLAMA_ORIGINS ortam değişkeniyle bu sayfanın adresine izin verecek şekilde başlatın (örn. OLLAMA_ORIGINS=* ollama serve).">
            <Input value={ai.ollamaUrl} onChange={(e) => set({ ollamaUrl: e.target.value })} className="font-mono" />
          </Field>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Model">
            <Select
              value={custom ? "__custom" : ai.models[ai.provider]}
              onChange={(e) => {
                if (e.target.value !== "__custom") set({ models: { ...ai.models, [ai.provider]: e.target.value } });
                else set({ models: { ...ai.models, [ai.provider]: "" } });
              }}
            >
              {[...provider.models, ...(result?.models ?? []).filter((m) => !provider.models.includes(m))].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
              <option value="__custom">Diğer (elle yaz)…</option>
            </Select>
          </Field>
          {custom ? (
            <Field label="Model adı">
              <Input value={ai.models[ai.provider]} onChange={(e) => set({ models: { ...ai.models, [ai.provider]: e.target.value } })} className="font-mono" />
            </Field>
          ) : (
            <Field label={`Yaratıcılık (temperature): ${ai.temperature.toFixed(1)}`} hint={ai.provider === "anthropic" ? "Claude modellerinde kullanılmaz; düzey 'effort: medium' ile ayarlıdır." : undefined}>
              <input type="range" min={0} max={1} step={0.1} value={ai.temperature} onChange={(e) => set({ temperature: Number(e.target.value) })} className="mt-2 w-full accent-indigo-600" disabled={ai.provider === "anthropic"} />
            </Field>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={test} loading={testing}>
            <PlugZap className="h-4 w-4" /> Bağlantıyı Test Et
          </Button>
          <Checkbox checked={ai.consentAccepted} onChange={(v) => set({ consentAccepted: v })} label={<span className="text-xs">Veri aktarım onayını hatırla</span>} />
        </div>
        {result && (
          <div className={cn("flex items-start gap-2 rounded-lg px-3 py-2 text-sm", result.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800")}>
            {result.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <XCircle className="mt-0.5 h-4 w-4" />}
            <span className="break-words">{result.message}</span>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function GeminiGuide() {
  return (
    <Card>
      <CardHeader icon={<KeyRound className="h-4 w-4" />} title="30 Saniyede Ücretsiz Gemini Anahtarı Al" description="Google AI Studio ücretsiz katmanı (gemini-2.5-flash) akademik kullanım için yeterlidir." />
      <CardBody>
        <ol className="space-y-2 text-sm text-slate-700">
          {[
            <>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer noopener" className="font-medium text-indigo-600 underline">
                aistudio.google.com/app/apikey
              </a>{" "}
              adresini açın ve Google hesabınızla giriş yapın.
            </>,
            <>Kullanım koşullarını onaylayın ve <strong>&quot;Create API key&quot;</strong> (API anahtarı oluştur) düğmesine tıklayın.</>,
            <>Oluşan <span className="font-mono">AIza…</span> ile başlayan anahtarı kopyalayın.</>,
            <>Soldaki alana yapıştırın, <strong>&quot;Bağlantıyı Test Et&quot;</strong> deyin. Hazırsınız!</>,
          ].map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          Not: Ücretsiz katmanda Google, gönderilen içeriği ürün iyileştirme için kullanabilir. Yayımlanmamış sınav soruları için ücretli katman veya tamamen yerel Ollama önerilir.
        </p>
      </CardBody>
    </Card>
  );
}

function SecurityNotes() {
  return (
    <Card>
      <CardHeader icon={<ShieldCheck className="h-4 w-4" />} title="Zero-Knowledge AI İlkeleri" />
      <CardBody className="space-y-2 text-xs text-slate-600">
        {[
          [Lock, "API anahtarları IndexedDB'de AES-256-GCM ile şifreli tutulur; .akredite yedeğine de şifreli girer."],
          [ShieldCheck, "Öğrenci ad, numara ve notları hiçbir AI isteğine eklenmez; PUKÖ için yalnızca toplu yüzdeler gönderilir."],
          [PlugZap, "İstekler tarayıcıdan doğrudan sağlayıcıya gider (CSP ile yalnızca bu 4 hedefe izin verilir)."],
          [Bot, "Ollama seçildiğinde tüm AI işlemleri bilgisayarınızda, internetsiz çalışır."],
        ].map(([Icon, t], i) => {
          const I = Icon as typeof Lock;
          return (
            <div key={i} className="flex gap-2">
              <I className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>{t as string}</span>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

const QUICK_PROMPTS = [
  "Bu dersin öğrenme çıktılarını Bloom taksonomisine göre değerlendir ve eksik bilişsel düzeyleri belirt.",
  "Bu ders için MEDEK uyumlu 14 haftalık ders izlencesi (haftalık konu + ilgili ÖÇ) hazırla.",
  "Bu dersin ÖÇ'lerinin ölçülmesi için uygun ölçme-değerlendirme yöntemlerini (sınav, proje, lab) öner.",
  "MEDEK öz değerlendirme raporunda 'Ölçme ve Değerlendirme' ölçütü için bu ders adına bir kanıt paragrafı yaz.",
];

function QualityChat() {
  const data = useData();
  const { run, busy, configured } = useAiRunner();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [withContext, setWithContext] = React.useState(true);
  const [courseId, setCourseId] = React.useState(data.ui.activeCourseId ?? data.courses[0]?.id ?? "");
  const course = data.courses.find((c) => c.id === courseId);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const ctx =
      withContext && course
        ? `\n\n[Bağlam — Kurum: ${data.institution.unitName}, ${data.institution.department}. Ders: ${course.code} ${course.name}, ${course.classYear}. sınıf, ${course.credit} kredi / ${course.ects} AKTS. ÖÇ'ler: ${course.outcomes.map((o) => `${o.code}: ${o.text}`).join(" | ")}]`
        : "";
    const next: ChatMessage[] = [...messages, { role: "user", content: text + ctx }];
    setMessages(next);
    setInput("");
    const reply = await run("chat", (s) => aiChat(s, AI_SYSTEM_PROMPT, next, false));
    if (reply) setMessages([...next, { role: "assistant", content: reply }]);
    else setMessages(messages);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={<MessageSquare className="h-4 w-4" />}
        title="Akademik Kalite Asistanı (Serbest Sohbet)"
        description="MEDEK/MÜDEK/YÖKAK, Bologna, ölçme-değerlendirme sorularınız için."
        actions={
          messages.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setMessages([])}>
              <Trash2 className="h-3.5 w-3.5" /> Temizle
            </Button>
          )
        }
      />
      <CardBody className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Checkbox checked={withContext} onChange={setWithContext} label={<span className="text-xs">Ders bağlamını ekle (ad + ÖÇ metinleri)</span>} />
          {withContext && (
            <Select className="h-8 w-72" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {data.courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </Select>
          )}
        </div>
        <div className="min-h-64 max-h-[480px] flex-1 space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-3 scrollbar-thin">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Hızlı başlangıç:</p>
              {QUICK_PROMPTS.map((p) => (
                <button key={p} onClick={() => send(p)} disabled={!!busy} className="block w-full rounded-lg bg-white px-3 py-2 text-left text-sm text-slate-700 ring-1 ring-slate-200 hover:ring-indigo-300 cursor-pointer">
                  <Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-violet-500" />
                  {p}
                </button>
              ))}
              {!configured && (
                <p className="text-xs text-amber-700">Önce yukarıdan bir sağlayıcı yapılandırın.</p>
              )}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn("max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm", m.role === "user" ? "ml-auto bg-indigo-600 text-white" : "bg-white text-slate-800 ring-1 ring-slate-200")}>
              {m.role === "user" ? m.content.split("\n\n[Bağlam")[0] : m.content}
            </div>
          ))}
          {busy === "chat" && <div className="w-24 animate-pulse rounded-xl bg-white px-3 py-2 text-sm text-slate-400 ring-1 ring-slate-200">yazıyor…</div>}
          <div ref={endRef} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex gap-2"
        >
          <Textarea
            rows={2}
            className="min-h-[44px]"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Örn. ÖÇ-3 için uygulamalı bir laboratuvar etkinliği öner…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
          />
          <Button type="submit" loading={busy === "chat"} disabled={!input.trim()} className="h-auto">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

function ActionsIndex() {
  const actions: { title: string; where: string; module: "sinav" | "rubrik" | "medek"; desc: string }[] = [
    { title: "ÖÇ + Bloom'a göre Soru & Rubrik Üret", where: "Modül 2 → Soru Editörü", module: "sinav", desc: "Hedef ÖÇ, Bloom düzeyi, tip ve puana göre özgün soru + kısmi puanlama rubriği." },
    { title: "✨ MEDEK'e Uyarla", where: "Modül 2 → her soru kartı", module: "sinav", desc: "Mevcut soruyu analiz edip ÖÇ, Bloom, cevap anahtarı ve rubrik atar." },
    { title: "İkiz Soru Üret (B Kitapçığı)", where: "Modül 2 → her soru kartı", module: "sinav", desc: "Aynı ÖÇ/Bloom/zorlukta eşdeğer soru üretir." },
    { title: "Bologna'ya Uygun ÖÇ Yaz", where: "Modül 2 → ÖÇ Ayarları", module: "sinav", desc: "ÖÇ metinlerini tek eylem fiilli, ölçülebilir biçime getirir." },
    { title: "Konu Başlığından Rubrik Doldur", where: "Modül 5", module: "rubrik", desc: "4 düzeyli tam dolu analitik rubrik tablosu." },
    { title: "PUKÖ Yaz", where: "Modül 6 → PUKÖ Raporu", module: "medek", desc: "Eşik altı ÖÇ'ler için resmi dilde kök neden + eylem planı." },
  ];
  return (
    <Card>
      <CardHeader icon={<Sparkles className="h-4 w-4" />} title="Modül İçi Tek Tık AI Aksiyonları" />
      <CardBody className="space-y-2">
        {actions.map((a) => (
          <button key={a.title} onClick={() => navigateTo(a.module)} className="block w-full rounded-lg px-3 py-2 text-left ring-1 ring-slate-200 hover:bg-violet-50 hover:ring-violet-200 cursor-pointer">
            <div className="text-sm font-medium text-slate-900">{a.title}</div>
            <div className="text-[11px] text-violet-700">{a.where}</div>
            <div className="text-[11px] text-slate-500">{a.desc}</div>
          </button>
        ))}
      </CardBody>
    </Card>
  );
}
