"use client";

import * as React from "react";
import { useData, useVault } from "@/lib/store";
import type { AiSettings } from "@/lib/types";
import { isConfigured } from "@/services/aiCopilotService";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/confirm";
import { navigateTo } from "@/hooks/useHashRoute";
import { AI_PROVIDERS } from "@/lib/aiDefaults";

/** Modül içi tek tık AI aksiyonlarını yapılandırma, onay ve hata yönetimiyle çalıştırır. */
export function useAiRunner() {
  const settings = useData().ai;
  const update = useVault((s) => s.update);
  const [busy, setBusy] = React.useState<string | null>(null);

  const run = React.useCallback(
    async <T,>(label: string, fn: (s: AiSettings) => Promise<T>): Promise<T | null> => {
      if (!isConfigured(settings)) {
        toast.warning("AI asistanı yapılandırılmadı", "Modül 7'den ücretsiz Gemini anahtarı veya başka bir sağlayıcı ekleyin.");
        navigateTo("ai");
        return null;
      }
      if (!settings.consentAccepted && settings.provider !== "ollama") {
        const provider = AI_PROVIDERS.find((p) => p.value === settings.provider)?.label;
        const ok = await confirmDialog({
          title: "BYOK AI veri aktarım onayı",
          message: `Bu işlem, ilgili soru/ÖÇ metnini tarayıcınızdan doğrudan ${provider} API'sine gönderir (AkrediteSınav sunucusu yoktur). Öğrenci kimlik bilgileri hiçbir zaman gönderilmez. Sınav soruları için tamamen yerel çalışmak isterseniz Ollama seçin. Onaylıyor musunuz?`,
          confirmLabel: "Onaylıyorum",
        });
        if (!ok) return null;
        update("ai", (p) => ({ ...p, consentAccepted: true }));
      }
      setBusy(label);
      try {
        return await fn(settings);
      } catch (e) {
        toast.error("AI isteği başarısız", e instanceof Error ? e.message : String(e));
        return null;
      } finally {
        setBusy(null);
      }
    },
    [settings, update],
  );

  return { run, busy, settings, configured: isConfigured(settings) };
}
