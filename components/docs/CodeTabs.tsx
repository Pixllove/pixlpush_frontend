"use client";

import { useEffect, useId, useState } from "react";
import CodeBlock from "./CodeBlock";

const EVENT = "pp-docs-tab";
const storageKey = (group: string) => `pp-docs-tab:${group}`;

type Option = string | { code: string; language?: string; filename?: string };

// One snippet in several flavours, with the tabs inside the code header. Tabs that share a `group`
// (e.g. "package-manager") stay in sync across the page and are remembered for the next visit.
export default function CodeTabs({ options, label, group, language = "Shell", filename }: { options: Record<string, Option>; label: string; group?: string; language?: string; filename?: string }) {
  const keys = Object.keys(options);
  const [selected, setSelected] = useState(keys[0]);
  const id = useId();

  useEffect(() => {
    if (!group) return;
    try { const saved = localStorage.getItem(storageKey(group)); if (saved && keys.includes(saved)) setSelected(saved); } catch { /* storage blocked */ }
    const sync = (event: Event) => { const detail = (event as CustomEvent<{ group: string; value: string }>).detail; if (detail.group === group && keys.includes(detail.value)) setSelected(detail.value); };
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);

  const choose = (value: string) => {
    setSelected(value);
    if (!group) return;
    try { localStorage.setItem(storageKey(group), value); } catch { /* storage blocked */ }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { group, value } }));
  };

  const option = options[selected];
  const current = typeof option === "string" ? { code: option } : option;
  return <CodeBlock code={current.code} language={current.language ?? language} filename={current.filename ?? filename} tabsLabel={label}
    tabs={keys.map((key) => ({ label: key, selected: key === selected, onSelect: () => choose(key), id: `${id}-tab-${key}`, panelId: `${id}-panel` }))} />;
}
