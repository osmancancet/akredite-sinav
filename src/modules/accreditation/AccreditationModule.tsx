"use client";

import * as React from "react";
import { FolderCheck, Inbox } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { FrameworkCatalog } from "./FrameworkCatalog";
import { Workspace } from "./Workspace";
import { TeamInbox } from "./Team";
import { useAccreditation } from "./useAccreditation";
import { takePendingTab } from "@/components/shell/shellStore";

type Mode = "work" | "inbox";

/** Modül 8: Akreditasyon Kanıt Merkezi */
export function AccreditationModule() {
  const api = useAccreditation();
  const [catalog, setCatalog] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>(() => takePendingTab<Mode>("akreditasyon", "work"));
  const current = api.ws.active.find((a) => a.slug === api.ws.current) ?? api.ws.active[0];
  const open = api.ws.inbox.filter((r) => !r.submissions.length).length;

  return (
    <div className="space-y-6">
      <Tabs
        value={mode}
        onChange={setMode}
        items={[
          { value: "work", label: "Akreditasyon çalışma alanı", icon: <FolderCheck /> },
          {
            value: "inbox",
            label: "Bana gelen talepler",
            icon: <Inbox />,
            badge: api.ws.inbox.length ? <span className="ml-1 rounded bg-zinc-200/80 px-1 font-mono text-[10px]">{open || api.ws.inbox.length}</span> : undefined,
          },
        ]}
      />
      {mode === "inbox" ? (
        <TeamInbox api={api} />
      ) : !current || catalog ? (
        <FrameworkCatalog api={api} onBack={current ? () => setCatalog(false) : undefined} />
      ) : (
        <Workspace key={current.slug} fw={current} api={api} onCatalog={() => setCatalog(true)} />
      )}
    </div>
  );
}
