import type { AiProvider, AiSettings } from "./types";

export const AI_PROVIDERS: {
  value: AiProvider;
  label: string;
  models: string[];
  endpoint: string;
  keyUrl?: string;
  keyHint?: string;
}[] = [
  {
    value: "gemini",
    label: "Google Gemini",
    models: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"],
    endpoint: "https://generativelanguage.googleapis.com",
    keyUrl: "https://aistudio.google.com/app/apikey",
    keyHint: "AIza...",
  },
  {
    value: "openai",
    label: "OpenAI",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
    endpoint: "https://api.openai.com",
    keyUrl: "https://platform.openai.com/api-keys",
    keyHint: "sk-...",
  },
  {
    value: "anthropic",
    label: "Anthropic Claude",
    models: ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"],
    endpoint: "https://api.anthropic.com",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyHint: "sk-ant-...",
  },
  {
    value: "ollama",
    label: "Ollama (Yerel)",
    models: ["llama3.1", "qwen2.5", "gemma2", "mistral"],
    endpoint: "http://localhost:11434",
  },
];

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: "gemini",
  keys: { gemini: "", openai: "", anthropic: "" },
  models: {
    gemini: "gemini-2.5-flash",
    openai: "gpt-4o-mini",
    anthropic: "claude-opus-5-5",
    ollama: "llama3.1",
  },
  ollamaUrl: "http://localhost:11434",
  temperature: 0.4,
  consentAccepted: false,
};
