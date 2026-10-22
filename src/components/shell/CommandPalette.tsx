"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/useMounted";

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon?: React.ReactNode;
  keywords?: string;
  run: () => void;
}

const fold = (s: string) => s.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i");

export function CommandPalette({ open, onClose, items }: { open: boolean; onClose: () => void; items: CommandItem[] }) {
  const mounted = useMounted();
  const [q, setQ] = React.useState("");
  const [index, setIndex] = React.useState(0);
  const [wasOpen, setWasOpen] = React.useState(open);
  const listRef = React.useRef<HTMLDivElement>(null);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQ("");
      setIndex(0);
    }
  }

  const filtered = React.useMemo(() => {
    const f = fold(q.trim());
    return f ? items.filter((it) => fold(`${it.label} ${it.hint ?? ""} ${it.keywords ?? ""} ${it.group}`).includes(f)) : items;
  }, [items, q]);

  const choose = (it?: CommandItem) => {
    if (!it) return;
    onClose();
    it.run();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(filtered[index]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  React.useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="no-print fixed inset-0 z-[70] flex items-start justify-center bg-zinc-950/30 p-4 pt-[14vh] backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-label="Komut paleti"
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[var(--shadow-pop)]"
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
          >
            <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setIndex(0);
                }}
                onKeyDown={onKey}
                placeholder="Modül veya eylem ara…"
                className="h-12 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus-visible:outline-none"
              />
              <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">ESC</kbd>
            </div>
            <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5 scrollbar-thin">
              {filtered.map((it, i) => {
                const header = i === 0 || filtered[i - 1].group !== it.group ? it.group : null;
                return (
                  <React.Fragment key={it.id}>
                    {header && <div className="px-2.5 pb-1 pt-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-400">{header}</div>}
                    <button
                      data-idx={i}
                      onMouseMove={() => setIndex(i)}
                      onClick={() => choose(it)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13px]",
                        i === index ? "bg-zinc-100 text-zinc-950" : "text-zinc-700",
                      )}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 [&_svg]:h-3.5 [&_svg]:w-3.5">{it.icon}</span>
                      <span className="flex-1">
                        {it.label}
                        {it.hint && <span className="ml-2 text-xs text-zinc-400">{it.hint}</span>}
                      </span>
                      {i === index && <CornerDownLeft className="h-3.5 w-3.5 text-zinc-400" />}
                    </button>
                  </React.Fragment>
                );
              })}
              {!filtered.length && <div className="px-3 py-10 text-center text-sm text-zinc-400">Sonuç yok</div>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
