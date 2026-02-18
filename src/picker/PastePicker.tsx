import { useEffect, useMemo, useRef, useState } from "react";
import { listClips, selectClip } from "../api";
import type { Clip }  from "../api";

function platformHint() {
  const isMac = navigator.userAgent.toLowerCase().includes("mac");
  return isMac ? "⌘V" : "Ctrl+V";
}

export default function PastePicker() {
  const [query, setQuery] = useState("");
  const [clips, setClips] = useState<Clip[]>([]);
  const [idx, setIdx] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    rowRefs.current[idx]?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  useEffect(() => {
    const onVis = () => {
        // When the window becomes visible again, reload newest clips
        if (!document.hidden) {
        refresh(query).catch(console.error);
        setTimeout(() => inputRef.current?.focus(), 30);
        }
    };

    const onFocus = () => {
        refresh(query).catch(console.error);
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);

    return () => {
        document.removeEventListener("visibilitychange", onVis);
        window.removeEventListener("focus", onFocus);
    };
  }, [query]);


  async function refresh(q?: string) {
    const data = await listClips(200, q);
    setClips(data);
    setIdx(0);
  }

  useEffect(() => {
    refresh();
    // focus search on mount
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => refresh(query), 120);
    return () => clearTimeout(t);
  }, [query]);

  const selected = useMemo(() => clips[idx], [clips, idx]);

  async function onSelect(c: Clip) {
    const res = await selectClip(c.id);
    if (!res.pasted) {
      setToast(`Copied. Press ${platformHint()} to paste. (Enable Accessibility/permissions for auto-paste)`);
      setTimeout(() => setToast(null), 2500);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIdx((v) => Math.min(v + 1, Math.max(0, clips.length - 1)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((v) => Math.max(v - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selected) onSelect(selected);
      } else if (e.key === "Escape") {
        // Optional: just close/hide window from UI later (can add a "hide_picker" command)
        // For now, user can click away; you can wire a hide command easily.
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clips, selected]);

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clipboard history…"
          style={{ flex: 1, padding: 10, fontSize: 14 }}
        />
        <div style={{ fontSize: 12, opacity: 0.7 }}>Ctrl+Shift+V</div>
      </div>

      {toast && (
        <div style={{ marginTop: 10, padding: 10, border: "1px solid #ccc", borderRadius: 8 }}>
          {toast}
        </div>
      )}

      <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
        {clips.length === 0 ? (
          <div style={{ padding: 16, opacity: 0.7 }}>No clipboard items yet.</div>
        ) : (
          clips.map((c, i) => (
            <div
              key={c.id}
              ref={(el) => (rowRefs.current[i] = el)}
              onClick={() => onSelect(c)}
              style={{
                padding: 12,
                cursor: "pointer",
                background: i === idx ? "rgba(0,0,0,0.06)" : "transparent",
                borderBottom: "1px solid #eee",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.6 }}>#{c.id}</div>
              <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {c.content.length > 280 ? c.content.slice(0, 280) + "…" : c.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
