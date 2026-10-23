"use client";

import * as React from "react";
import { FrameworkCatalog } from "./FrameworkCatalog";
import { Workspace } from "./Workspace";
import { useAccreditation } from "./useAccreditation";

/** Modül 8: Akreditasyon Kanıt Merkezi */
export function AccreditationModule() {
  const api = useAccreditation();
  const [catalog, setCatalog] = React.useState(false);
  const current = api.ws.active.find((a) => a.slug === api.ws.current) ?? api.ws.active[0];

  if (!current || catalog) return <FrameworkCatalog api={api} onBack={current ? () => setCatalog(false) : undefined} />;
  return <Workspace key={current.slug} fw={current} api={api} onCatalog={() => setCatalog(true)} />;
}
