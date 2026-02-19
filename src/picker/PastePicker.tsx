import { useEffect, useMemo, useRef, useState } from "react";
import { listClips, selectClip, hidePicker } from "../api";
import type { Clip } from "../api";
import { useTheme } from "./useTheme";
import "./picker.css";

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
  const { cycle, label } = useTheme();

  async function refresh(q?: string) {
    const data = await listClips(250, q);
    setClips(data);
    setIdx((old) => Math.min(old, Math.max(0, data.length - 1)));
  }

  // Initial + focus/visibility refresh
  useEffect(() => {
    refresh().catch(console.error);
    setTimeout(() => inputRef.current?.focus(), 30);

    const onVis = () => {
      if (!document.hidden) {
        refresh(query).catch(console.error);
        setTimeout(() => inputRef.current?.focus(), 30);
      }
    };
    const onFocus = () => refresh(query).catch(console.error);

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => refresh(query).catch(console.error), 120);
    return () => clearTimeout(t);
  }, [query]);

  // Scroll selected row into view
  useEffect(() => {
    rowRefs.current[idx]?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  const selected = useMemo(() => clips[idx], [clips, idx]);

  async function onSelect(c: Clip) {
    try {
      const res = await selectClip(c.id);
      if (!res.pasted) {
        setToast(`Copied. Press ${platformHint()} to paste. (Enable permissions for auto-paste)`);
        setTimeout(() => setToast(null), 2500);
      }
    } catch (e: any) {
      console.error(e);
      setToast(`Error: ${e?.message ?? String(e)}`);
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
        e.preventDefault();
        hidePicker().catch(console.error);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clips.length, selected]);

  return (
    <div className="pickerRoot">
      <div className="topbar">
        <div className="brand">
          <div className="brandTitle">Paste Picker</div>
          <div className="brandSub">Search • ↑↓ • Enter • Esc</div>
        </div>

        <div className="searchWrap">
          <input
            ref={inputRef}
            className="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clipboard history…  (Ctrl/⌘K to focus)"
          />
        </div>

        <button className="btn" onClick={cycle} title="Toggle theme">
          Theme: {label}
        </button>

        <div className="chip">Ctrl+Shift+V</div>
      </div>

      {toast && <div className="toast">{toast}</div>}

      <div className="panel">
        <div className="list">
          {clips.length === 0 ? (
            <div className="empty">No clipboard items yet.</div>
          ) : (
            clips.map((c, i) => (
              <div
                key={c.id}
                ref={(el) => {rowRefs.current[i] = el;}}
                onClick={() => onSelect(c)}
                className={`row ${i === idx ? "rowActive" : ""}`}
              >
                <div className="meta">
                  <span className="pill">#{c.id}</span>
                  <span className="pill">{c.content.length} chars</span>
                </div>
                <div className="content">
                  {c.content.length > 420 ? c.content.slice(0, 420) + "…" : c.content}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="footer">
          <div className="hint">Tip: Ctrl/⌘K focuses search</div>
          <div className="hint">Esc closes</div>
        </div>
      </div>
    </div>
  );
}
