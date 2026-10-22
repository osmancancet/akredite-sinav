"use client";

import * as React from "react";
import { Archive, X } from "lucide-react";
import { useData, useVault } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { useShellUi } from "./shellStore";

const DAY = 86_400_000;

/** 7 gündür yedek alınmadıysa nazik hatırlatma şeridi (3 gün ertelenebilir). */
export function BackupReminder() {
  const data = useData();
  const update = useVault((s) => s.update);
  const setBackup = useShellUi((s) => s.setBackup);
  const { lastBackupAt, firstUseAt, backupReminderSnoozedUntil, onboarded } = data.ui;
  const [now] = React.useState(() => Date.now());
  const hasWork = data.courses.length > 0 && (data.exams.length > 0 || Object.keys(data.grades).length > 0);
  const since = lastBackupAt ? Date.parse(lastBackupAt) : firstUseAt ? Date.parse(firstUseAt) : now;
  const snoozed = backupReminderSnoozedUntil && Date.parse(backupReminderSnoozedUntil) > now;
  if (!onboarded || !hasWork || snoozed || now - since < 7 * DAY) return null;
  const days = Math.floor((now - since) / DAY);

  return (
    <div className="no-print border-b border-amber-200/80 bg-amber-50/80 px-4 py-2 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 text-[12.5px] text-amber-950">
        <Archive className="h-4 w-4 text-amber-700" />
        <span className="flex-1">
          {lastBackupAt ? `Son yedeğin üzerinden ${days} gün geçti.` : `${days} gündür hiç yedek alınmadı.`} Veriler yalnızca bu tarayıcıda; şifreli bir <strong>.akredite</strong> yedeği almanız önerilir.
        </span>
        <Button size="sm" onClick={() => setBackup("export")}>Şimdi yedek al</Button>
        <button
          className="cursor-pointer rounded p-1 text-amber-800/70 hover:bg-amber-100"
          aria-label="3 gün sonra hatırlat"
          title="3 gün sonra hatırlat"
          onClick={() => update("ui", (u) => ({ ...u, backupReminderSnoozedUntil: new Date(now + 3 * DAY).toISOString() }))}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
