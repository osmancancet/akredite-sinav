"use client";

import * as React from "react";
import { create } from "zustand";
import { TriangleAlert } from "lucide-react";
import { Dialog } from "./dialog";
import { Button } from "./button";

interface ConfirmRequest {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  resolve: (ok: boolean) => void;
}

const useConfirmStore = create<{ req: ConfirmRequest | null; set: (r: ConfirmRequest | null) => void }>((set) => ({
  req: null,
  set: (req) => set({ req }),
}));

export function confirmDialog(opts: Omit<ConfirmRequest, "resolve">): Promise<boolean> {
  return new Promise((resolve) => useConfirmStore.getState().set({ ...opts, resolve }));
}

export function ConfirmHost() {
  const { req, set } = useConfirmStore();
  const close = (ok: boolean) => {
    req?.resolve(ok);
    set(null);
  };
  return (
    <Dialog
      open={!!req}
      onClose={() => close(false)}
      size="sm"
      title={req?.title ?? ""}
      icon={<TriangleAlert className="h-5 w-5 text-amber-600" />}
      footer={
        <>
          <Button variant="outline" onClick={() => close(false)}>Vazgeç</Button>
          <Button variant={req?.destructive ? "destructive" : "default"} onClick={() => close(true)}>
            {req?.confirmLabel ?? "Onayla"}
          </Button>
        </>
      }
    >
      <div className="text-sm text-zinc-700">{req?.message}</div>
    </Dialog>
  );
}
