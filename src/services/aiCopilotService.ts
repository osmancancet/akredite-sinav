// BYOK (Kendi API Anahtarını Getir) Zero-Knowledge AI İstemcisi
// ----------------------------------------------------------------------------
// İstekler tarayıcıdan DOĞRUDAN sağlayıcıya gider (client-side fetch). Arada
// AkrediteSınav sunucusu yoktur. Anahtarlar kasada AES-256-GCM ile şifreli durur.
// KVKK: Öğrenci kimlik verisi hiçbir AI isteğine eklenmez; yalnızca soru metni,
// ÖÇ metinleri ve toplu (anonim) başarı yüzdeleri gönderilir.
// ----------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";
import type {
  AiSettings,
  BloomLevel,
  Course,
  LearningOutcome,
  Question,
  QuestionType,
  RubricCriterion,
  RubricType,
} from "@/lib/types";
import { BLOOM_LEVELS, bloomLabel, questionTypeLabel, uid } from "@/lib/utils";
import type { OutcomeStat } from "@/lib/medekMath";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_BASE =
  "Sen Türkiye'deki yükseköğretim kurumlarında (Meslek Yüksekokulu ve Fakülteler) görev yapan, MEDEK, MÜDEK, FEDEK ve YÖKAK akreditasyon süreçlerinde uzman bir ölçme-değerlendirme ve kalite güvencesi danışmanısın. " +
  "Yanıtlarını resmi, akademik ve açık bir Türkçe ile yazarsın. Bloom Taksonomisi (Hatırlama, Anlama, Uygulama, Analiz, Değerlendirme, Yaratma) ve Bologna öğrenme çıktısı yazım ilkelerine hâkimsin.";

const JSON_RULE =
  "YALNIZCA geçerli bir JSON nesnesi döndür. JSON dışında açıklama, markdown kod bloğu veya ek metin yazma.";

export class AiError extends Error {}

export function isConfigured(s: AiSettings): boolean {
  if (s.provider === "ollama") return !!s.ollamaUrl;
  return !!s.keys[s.provider]?.trim();
}

function trimUrl(u: string) {
  return u.replace(/\/+$/, "");
}

async function readError(res: Response): Promise<string> {
  try {
    const j = await res.json();
    return j?.error?.message || j?.error || JSON.stringify(j).slice(0, 300);
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

/** Anthropic Claude — resmi SDK, tarayıcı modu. Opus 5.5 / Sonnet 5.5'te sunucu tarafı yedek model (fallback) açık. */
async function anthropicChat(s: AiSettings, system: string, messages: ChatMessage[]): Promise<string> {
  const client = new Anthropic({ apiKey: s.keys.anthropic.trim(), dangerouslyAllowBrowser: true, maxRetries: 1 });
  const model = s.models.anthropic;
  const supportsFallback = model === "claude-opus-5-5" || model === "claude-sonnet-5-5";
  try {
    if (supportsFallback) {
      const res = await client.beta.messages.create({
        model,
        max_tokens: 16000,
        system,
        messages,
        output_config: { effort: "medium" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
      if (res.stop_reason === "refusal") throw new AiError("Model bu isteği güvenlik politikası gereği yanıtlamadı.");
      return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    }
    const res = await client.messages.create({
      model,
      max_tokens: 16000,
      system,
      messages,
      output_config: { effort: "medium" },
    });
    if (res.stop_reason === "refusal") throw new AiError("Model bu isteği güvenlik politikası gereği yanıtlamadı.");
    return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new AiError("Anthropic API anahtarı geçersiz.");
    if (e instanceof Anthropic.RateLimitError) throw new AiError("Anthropic hız sınırı aşıldı; biraz sonra tekrar deneyin.");
    if (e instanceof Anthropic.APIConnectionError) throw new AiError("Anthropic API'ye bağlanılamadı (çevrimdışı olabilirsiniz).");
    if (e instanceof Anthropic.APIError) throw new AiError(`Anthropic API hatası ${e.status ?? ""}: ${e.message}`);
    throw e;
  }
}

async function geminiChat(s: AiSettings, system: string, messages: ChatMessage[], json: boolean): Promise<string> {
  const model = s.models.gemini || "gemini-2.5-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": s.keys.gemini.trim() },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: { temperature: s.temperature, ...(json ? { responseMimeType: "application/json" } : {}) },
    }),
  });
  if (!res.ok) throw new AiError(`Gemini hatası: ${await readError(res)}`);
  const j = await res.json();
  const text = (j?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
  if (!text) throw new AiError(`Gemini boş yanıt döndürdü (${j?.candidates?.[0]?.finishReason ?? "bilinmiyor"}).`);
  return text;
}

async function openaiChat(s: AiSettings, system: string, messages: ChatMessage[], json: boolean): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.keys.openai.trim()}` },
    body: JSON.stringify({
      model: s.models.openai || "gpt-4o-mini",
      temperature: s.temperature,
      messages: [{ role: "system", content: system }, ...messages],
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new AiError(`OpenAI hatası: ${await readError(res)}`);
  const j = await res.json();
  return j?.choices?.[0]?.message?.content ?? "";
}

async function ollamaChat(s: AiSettings, system: string, messages: ChatMessage[], json: boolean): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${trimUrl(s.ollamaUrl)}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: s.models.ollama || "llama3.1",
        stream: false,
        ...(json ? { format: "json" } : {}),
        options: { temperature: s.temperature },
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
  } catch {
    throw new AiError("Ollama'ya ulaşılamadı. Ollama'nın çalıştığından ve OLLAMA_ORIGINS ayarının bu adrese izin verdiğinden emin olun.");
  }
  if (!res.ok) throw new AiError(`Ollama hatası: ${await readError(res)}`);
  const j = await res.json();
  return j?.message?.content ?? "";
}

export async function aiChat(s: AiSettings, system: string, messages: ChatMessage[], json = false): Promise<string> {
  if (!isConfigured(s)) throw new AiError("AI sağlayıcısı yapılandırılmamış. Modül 7'den API anahtarınızı girin.");
  const sys = json ? `${system}\n\n${JSON_RULE}` : system;
  switch (s.provider) {
    case "gemini":
      return geminiChat(s, sys, messages, json);
    case "openai":
      return openaiChat(s, sys, messages, json);
    case "anthropic":
      return anthropicChat(s, sys, messages);
    case "ollama":
      return ollamaChat(s, sys, messages, json);
  }
}

export function extractJson<T>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        /* düşer */
      }
    }
    throw new AiError("AI yanıtı beklenen JSON biçiminde değil. Lütfen tekrar deneyin.");
  }
}

export async function aiJson<T>(s: AiSettings, prompt: string, system = SYSTEM_BASE): Promise<T> {
  const text = await aiChat(s, system, [{ role: "user", content: prompt }], true);
  return extractJson<T>(text);
}

export async function testConnection(s: AiSettings): Promise<{ ok: boolean; message: string; models?: string[] }> {
  try {
    if (s.provider === "ollama") {
      const res = await fetch(`${trimUrl(s.ollamaUrl)}/api/tags`);
      if (!res.ok) return { ok: false, message: `Ollama yanıtı: ${res.status}` };
      const j = await res.json();
      const models: string[] = (j?.models ?? []).map((m: { name: string }) => m.name);
      return { ok: true, message: `Ollama bağlantısı başarılı. ${models.length} yerel model bulundu.`, models };
    }
    if (!isConfigured(s)) return { ok: false, message: "API anahtarı girilmedi." };
    const reply = await aiJson<{ durum?: string }>(s, 'Bağlantı testi. Sadece {"durum":"hazir"} döndür.');
    return { ok: true, message: `Bağlantı başarılı (${s.models[s.provider]}). Yanıt: ${JSON.stringify(reply)}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

// ---------------------------------------------------------------------------
// Modül içi tek tık aksiyonlar
// ---------------------------------------------------------------------------

interface AiQuestionShape {
  type?: string;
  text?: string;
  options?: string[];
  correctIndex?: number;
  correctBool?: boolean;
  code?: string;
  codeLanguage?: string;
  latex?: string;
  answerKey?: string;
  rubric?: { description: string; points: number }[];
  bloom?: string;
  outcomeCodes?: string[];
}

const QUESTION_SCHEMA = `{
  "type": "mcq | open | code | truefalse | fill | latex",
  "text": "soru kökü (boşluk doldurmada boşluklar ________ ile)",
  "options": ["şık metni", "..."] (yalnızca mcq; 5 şık),
  "correctIndex": 0 (mcq doğru şık indeksi),
  "correctBool": true (yalnızca truefalse),
  "code": "soruya eşlik eden kod/şema (yalnızca code)",
  "codeLanguage": "sql | python | java | csharp | javascript ...",
  "latex": "LaTeX ifadesi (yalnızca latex)",
  "answerKey": "MEDEK cevap anahtarı / beklenen yanıt",
  "rubric": [{"description": "kısmi puanlama ölçütü", "points": 5}],
  "bloom": "hatirlama | anlama | uygulama | analiz | degerlendirme | yaratma",
  "outcomeCodes": ["ÖÇ-1"]
}`;

function outcomesText(outcomes: LearningOutcome[]) {
  return outcomes.map((o) => `${o.code}: ${o.text}`).join("\n");
}

function normalizeQuestion(raw: AiQuestionShape, base: Partial<Question>, course: Course, points: number): Partial<Question> {
  const types: QuestionType[] = ["mcq", "open", "code", "truefalse", "fill", "latex"];
  const type = (types.includes(raw.type as QuestionType) ? raw.type : base.type ?? "open") as QuestionType;
  const bloom = (BLOOM_LEVELS.some((b) => b.value === raw.bloom) ? raw.bloom : base.bloom ?? "uygulama") as BloomLevel;
  const options = type === "mcq" ? (raw.options ?? []).slice(0, 6).map((t) => ({ id: uid("op"), text: String(t) })) : [];
  const ci = typeof raw.correctIndex === "number" ? raw.correctIndex : 0;
  const outcomeIds = (raw.outcomeCodes ?? [])
    .map((code) => course.outcomes.find((o) => o.code.replace(/\s/g, "") === String(code).replace(/\s/g, ""))?.id)
    .filter((x): x is string => !!x);
  let rubric = (raw.rubric ?? []).filter((r) => r && r.description).map((r) => ({ id: uid("rl"), description: String(r.description), points: Number(r.points) || 0 }));
  const sum = rubric.reduce((s, r) => s + r.points, 0);
  if (rubric.length && sum > 0 && Math.abs(sum - points) > 0.01) {
    rubric = rubric.map((r) => ({ ...r, points: Math.round(((r.points / sum) * points) * 2) / 2 }));
    const diff = points - rubric.reduce((s, r) => s + r.points, 0);
    rubric[rubric.length - 1].points = Math.round((rubric[rubric.length - 1].points + diff) * 2) / 2;
  }
  if (!rubric.length) rubric = [{ id: uid("rl"), description: "Tam ve doğru yanıt", points }];
  return {
    type,
    bloom,
    text: raw.text ?? base.text ?? "",
    options,
    correctOptionId: options[ci]?.id,
    correctBool: type === "truefalse" ? !!raw.correctBool : undefined,
    code: type === "code" ? raw.code ?? "" : undefined,
    codeLanguage: type === "code" ? raw.codeLanguage ?? "sql" : undefined,
    latex: type === "latex" ? raw.latex ?? "" : undefined,
    answerKey: raw.answerKey ?? "",
    rubric,
    outcomeIds: outcomeIds.length ? outcomeIds : base.outcomeIds ?? [],
  };
}

export async function aiGenerateQuestion(
  s: AiSettings,
  course: Course,
  opts: { outcomeIds: string[]; bloom: BloomLevel; type: QuestionType; points: number; topic?: string },
): Promise<Partial<Question>> {
  const targets = course.outcomes.filter((o) => opts.outcomeIds.includes(o.id));
  const prompt = `Ders: ${course.code} ${course.name} (${course.classYear}. sınıf)
Dersin öğrenme çıktıları:
${outcomesText(course.outcomes)}

Hedef ÖÇ: ${targets.map((t) => t.code).join(", ") || "uygun olanı sen seç"}
Bloom düzeyi: ${bloomLabel(opts.bloom)}
Soru tipi: ${questionTypeLabel(opts.type)} (${opts.type})
Puan: ${opts.points}
${opts.topic ? `Konu / odak: ${opts.topic}` : ""}

Bu kriterlere tam uyan, özgün, üniversite düzeyinde bir sınav sorusu ve MEDEK uyumlu kısmi puanlama rubriği üret. Rubrik puanlarının toplamı ${opts.points} olmalı.
Şu JSON şemasını kullan:
${QUESTION_SCHEMA}`;
  const raw = await aiJson<AiQuestionShape>(s, prompt);
  return normalizeQuestion(raw, { type: opts.type, bloom: opts.bloom, outcomeIds: opts.outcomeIds }, course, opts.points);
}

export async function aiAdaptToMedek(s: AiSettings, course: Course, q: Question): Promise<Partial<Question>> {
  const prompt = `Aşağıdaki sınav sorusunu MEDEK ölçme-değerlendirme ilkelerine göre analiz et.
Ders: ${course.code} ${course.name}
Öğrenme çıktıları:
${outcomesText(course.outcomes)}

Soru tipi: ${questionTypeLabel(q.type)} — Puan: ${q.points}
Soru: ${q.text}
${q.code ? `Kod:\n${q.code}` : ""}${q.latex ? `\nLaTeX: ${q.latex}` : ""}
${q.options.length ? `Şıklar:\n${q.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o.text}`).join("\n")}` : ""}

Görev: Bu sorunun ölçtüğü ÖÇ kodlarını, Bloom düzeyini belirle; MEDEK cevap anahtarını ve toplamı ${q.points} olan kısmi puanlama rubriğini yaz. Soru metnini değiştirme (text alanına aynen yaz).
Şu JSON şemasını kullan:
${QUESTION_SCHEMA}`;
  const raw = await aiJson<AiQuestionShape>(s, prompt);
  const norm = normalizeQuestion({ ...raw, type: q.type, text: q.text }, q, course, q.points);
  return {
    outcomeIds: norm.outcomeIds,
    bloom: norm.bloom,
    answerKey: norm.answerKey,
    rubric: norm.rubric,
    ...(q.type === "mcq" && !q.correctOptionId && typeof raw.correctIndex === "number" ? { correctOptionId: q.options[raw.correctIndex]?.id } : {}),
    ...(q.type === "truefalse" && q.correctBool === undefined && typeof raw.correctBool === "boolean" ? { correctBool: raw.correctBool } : {}),
  };
}

export async function aiTwinQuestion(s: AiSettings, course: Course, q: Question): Promise<Partial<Question>> {
  const prompt = `B kitapçığı için aşağıdaki soruya EŞDEĞER bir "ikiz soru" üret: aynı ÖÇ'yü, aynı Bloom düzeyini (${bloomLabel(q.bloom)}), aynı soru tipini (${q.type}) ve aynı zorluğu korusun; ancak bağlam, veri ve sayılar farklı olsun.
Ders: ${course.code} ${course.name}
Öğrenme çıktıları:
${outcomesText(course.outcomes)}
Orijinal soru (${q.points} puan): ${q.text}
${q.code ? `Kod:\n${q.code}` : ""}${q.latex ? `\nLaTeX: ${q.latex}` : ""}
${q.options.length ? `Şıklar:\n${q.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o.text}`).join("\n")}` : ""}
Rubrik toplamı ${q.points} olmalı. Şu JSON şemasını kullan:
${QUESTION_SCHEMA}`;
  const raw = await aiJson<AiQuestionShape>(s, prompt);
  return normalizeQuestion({ ...raw, type: q.type }, q, course, q.points);
}

export async function aiGenerateRubric(
  s: AiSettings,
  course: Course,
  opts: { topic: string; type: RubricType; criteriaCount: number; totalPoints: number },
): Promise<{ title: string; description: string; criteria: RubricCriterion[] }> {
  const typeLabel = { proje: "Proje", odev: "Ödev", laboratuvar: "Laboratuvar Uygulama Föyü", sunum: "Sunum", isyeri: "3+1 İş Yeri Eğitimi (İşletmede Mesleki Eğitim)" }[opts.type];
  const prompt = `Ders: ${course.code} ${course.name}
Öğrenme çıktıları:
${outcomesText(course.outcomes)}

Etkinlik türü: ${typeLabel}
Konu: ${opts.topic}

Bu etkinlik için ${opts.criteriaCount} kriterli, toplam ağırlığı ${opts.totalPoints} puan olan MEDEK uyumlu analitik rubrik (dereceli puanlama anahtarı) üret. Her kriter için 4 performans düzeyinin (Yetersiz, Geliştirilmeli, İyi, Mükemmel) gözlenebilir davranış tanımlarını yaz ve kriteri ilgili ÖÇ kodlarıyla eşleştir.
JSON şeması:
{
  "title": "rubrik başlığı",
  "description": "kısa amaç açıklaması",
  "criteria": [
    {"name": "kriter adı", "weight": 20, "outcomeCodes": ["ÖÇ-1"], "levels": ["Yetersiz tanımı", "Geliştirilmeli tanımı", "İyi tanımı", "Mükemmel tanımı"]}
  ]
}`;
  const raw = await aiJson<{ title?: string; description?: string; criteria?: { name: string; weight: number; outcomeCodes?: string[]; levels?: string[] }[] }>(s, prompt);
  const crit = (raw.criteria ?? []).filter((c) => c?.name);
  if (!crit.length) throw new AiError("AI geçerli bir rubrik kriteri döndürmedi.");
  const sum = crit.reduce((a, c) => a + (Number(c.weight) || 0), 0) || crit.length;
  const criteria: RubricCriterion[] = crit.map((c) => {
    const lv = [...(c.levels ?? [])].slice(0, 4).map(String);
    while (lv.length < 4) lv.push("");
    return {
      id: uid("cr"),
      name: c.name,
      weight: Math.round((((Number(c.weight) || 1) / sum) * opts.totalPoints) * 2) / 2,
      outcomeIds: (c.outcomeCodes ?? []).map((code) => course.outcomes.find((o) => o.code === code)?.id).filter((x): x is string => !!x),
      levels: [lv[0], lv[1], lv[2], lv[3]],
    };
  });
  const diff = opts.totalPoints - criteria.reduce((a, c) => a + c.weight, 0);
  criteria[criteria.length - 1].weight = Math.round((criteria[criteria.length - 1].weight + diff) * 2) / 2;
  return { title: raw.title ?? `${typeLabel} Rubriği`, description: raw.description ?? "", criteria };
}

export interface AiPukoItem {
  outcomeCode: string;
  rootCause: string;
  plan: string;
  doAction: string;
  check: string;
  act: string;
}

export async function aiWritePuko(
  s: AiSettings,
  course: Course,
  examTitle: string,
  flagged: OutcomeStat[],
  allStats: OutcomeStat[],
  threshold: number,
  extraContext: string,
): Promise<{ items: AiPukoItem[]; generalEvaluation: string }> {
  const prompt = `Ders: ${course.code} ${course.name} — Ölçme aracı: ${examTitle}
Hedef eşik: %${threshold}
Tüm ÖÇ gerçekleşme düzeyleri (toplu, anonim):
${allStats.map((o) => `${o.code} (%${o.pct === null ? "-" : o.pct.toFixed(1)}): ${o.text}`).join("\n")}

Eşik altında kalan ÖÇ'ler: ${flagged.map((f) => f.code).join(", ")}
Ek bağlam (soru bazlı analiz): ${extraContext}

Görev: Eşik altındaki HER ÖÇ için resmi dilde, MEDEK/YÖKAK Sürekli İyileştirme (PUKÖ: Planla-Uygula-Kontrol Et-Önlem Al) eylem planı yaz. Kök neden analizi somut ve ölçülebilir olsun; eylemler bir sonraki dönemde uygulanabilir, tarihli/sorumlulu ve izlenebilir olsun. Ayrıca dersin genel değerlendirmesini 3-4 cümleyle yaz.
JSON şeması:
{
  "generalEvaluation": "genel değerlendirme paragrafı",
  "items": [{"outcomeCode": "ÖÇ-3", "rootCause": "...", "plan": "...", "doAction": "...", "check": "...", "act": "..."}]
}`;
  const raw = await aiJson<{ items?: AiPukoItem[]; generalEvaluation?: string }>(s, prompt);
  return { items: raw.items ?? [], generalEvaluation: raw.generalEvaluation ?? "" };
}

export async function aiPolishOutcomes(s: AiSettings, course: Course): Promise<string[]> {
  const prompt = `Aşağıdaki öğrenme çıktılarını Bologna ilkelerine göre (tek eylem fiili, gözlenebilir ve ölçülebilir, öğrenci merkezli, "...-ır/-er" kipinde) yeniden yaz. Sayıyı ve sırayı koru.
Ders: ${course.code} ${course.name}
${outcomesText(course.outcomes)}
JSON şeması: {"outcomes": ["ÖÇ-1 metni", "ÖÇ-2 metni"]}`;
  const raw = await aiJson<{ outcomes?: string[] }>(s, prompt);
  return (raw.outcomes ?? []).map(String);
}

export const AI_SYSTEM_PROMPT = SYSTEM_BASE;
