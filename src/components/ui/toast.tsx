"use client";

import { create } from "zustand";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, TriangleAlert, XCircle } from "lucide-react";

type ToastTone = "success" | "error" | "info" | "warning";
interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

const useToastStore = create<{ items: ToastItem[]; push: (t: Omit<ToastItem, "id">) => void; remove: (id: number) => void }>((set) => ({
  items: [],
  push: (t) => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items, { ...t, id }].slice(-4) }));
    setTimeout(() => set((s) => ({ items: s.items.filter((x) => x.id !== id) })), t.tone === "error" ? 7000 : 4200);
  },
  remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));

export const toast = {
  success: (title: string, description?: string) => useToastStore.getState().push({ tone: "success", title, description }),
  error: (title: string, description?: string) => useToastStore.getState().push({ tone: "error", title, description }),
  info: (title: string, description?: string) => useToastStore.getState().push({ tone: "info", title, description }),
  warning: (title: string, description?: string) => useToastStore.getState().push({ tone: "warning", title, description }),
};

const icons = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
  error: <XCircle className="h-5 w-5 text-red-600" />,
  info: <Info className="h-5 w-5 text-brand-600" />,
  warning: <TriangleAlert className="h-5 w-5 text-amber-600" />,
};

export function Toaster() {
  const { items, remove } = useToastStore();
  return (
    <div className="no-print pointer-events-none fixed bottom-4 left-4 right-4 z-[60] flex flex-col gap-2 sm:left-auto sm:w-96">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="pointer-events-auto flex w-full min-w-0 gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-[var(--shadow-pop)]"
            onClick={() => remove(t.id)}
          >
            {icons[t.tone]}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-zinc-900">{t.title}</div>
              {t.description && <div className="mt-0.5 break-words text-xs text-zinc-600">{t.description}</div>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
