import React, { useEffect, useRef, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";

/**
 * Entry point for the Kanban Sticky Letters frontend.
 *
 * Responsibilities:
 * - Poll the backend's /api/letters endpoint periodically
 * - Render returned letters as randomized "sticky notes" on the page
 * - Provide a modern, pleasant UI with responsive behavior
 *
 * Notes:
 * - The backend base path can be overridden with Vite env var `VITE_API_BASE`.
 *   Example in development: VITE_API_BASE=http://localhost:3000
 *
 * - This file keeps all styles inline / scoped to avoid making additional CSS files.
 */

/* Config */
const POLL_INTERVAL_MS = 10000; // default 10s
const API_BASE = import.meta.env.VITE_API_BASE || ""; // prefix for requests, empty = same origin
const API_LETTERS = `${API_BASE}/api/letters`;

/* Utility: Fisher-Yates shuffle (in-place) */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
  return array;
}

/* A palette of pleasant sticky colors (soft pastels) */
const STICKY_COLORS = [
  ["#fffbe6", "#fff3bf"], // pale yellow
  ["#fff0f6", "#ffd6e7"], // pink
  ["#e6fffb", "#c9fff2"], // mint
  ["#f0f9ff", "#e0f2fe"], // sky
  ["#f8fafc", "#eef2ff"], // lavender
  ["#fff7ed", "#ffedd5"], // warm cream
];

/* Helper to generate random rotation */
function randomRotation() {
  return (Math.random() * 12 - 6).toFixed(2); // -6deg .. +6deg
}

/* Helper to pick a random color gradient */
function randomColor() {
  return STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];
}

/* Compute layout for notes: random absolute positions within container */
function computeLayout(notes, containerWidth, containerHeight) {
  // If container dimensions are too small, return a simple stacked layout
  if (!containerWidth || !containerHeight || containerWidth < 200) {
    return notes.map((n, i) => ({
      left: 12,
      top: 12 + i * 130,
      rotation: randomRotation(),
      color: randomColor(),
      zIndex: i + 1,
    }));
  }

  // For each note, try to place it at a random position.
  // This simple approach doesn't guarantee no overlap but produces an organic spread.
  return notes.map((n, i) => {
    // Keep some margin so notes don't get cut off
    const margin = 12;
    const maxLeft = Math.max(100, containerWidth - 180 - margin);
    const maxTop = Math.max(100, containerHeight - 140 - margin);

    const left = Math.floor(Math.random() * maxLeft) + margin;
    const top = Math.floor(Math.random() * maxTop) + margin;

    return {
      left,
      top,
      rotation: randomRotation(),
      color: randomColor(),
      zIndex: 100 + i,
    };
  });
}

/* Sticky note component */
function Sticky({ text, styleProps }) {
  const { left, top, rotation, color, zIndex } = styleProps;
  const [c1, c2] = color;
  const noteStyle = {
    position: "absolute",
    left: left,
    top: top,
    transform: `rotate(${rotation}deg)`,
    width: 220,
    minHeight: 110,
    padding: "12px 14px",
    borderRadius: 10,
    boxShadow: "0 12px 30px rgba(2, 6, 23, 0.6)",
    background: `linear-gradient(180deg, ${c1}, ${c2})`,
    color: "#08122a",
    fontWeight: 600,
    lineHeight: 1.3,
    whiteSpace: "pre-wrap",
    overflow: "hidden",
    zIndex,
    transition: "transform 320ms ease, opacity 320ms ease",
    opacity: 0,
    // subtle border to help separation on dark background
    border: "1px solid rgba(0,0,0,0.06)",
  };

  // useRef to animate opacity after mount (staggered fade-in)
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const delay = Math.floor(Math.random() * 350);
    const t = setTimeout(() => {
      el.style.opacity = "1";
    }, delay);
    return () => clearTimeout(t);
  }, []);

  return (
    <article ref={ref} className="sticky-note" style={noteStyle} aria-label="sticky note">
      <div style={{ fontSize: 14, marginBottom: 6, color: "rgba(0,0,0,0.45)", fontWeight: 700 }}>
        •
      </div>
      <div style={{ fontSize: 16, color: "#08122a", whiteSpace: "pre-wrap" }}>{text}</div>
    </article>
  );
}

/* The main App */
function App() {
  const containerRef = useRef(null);
  const [letters, setLetters] = useState([]); // array of {id, text}
  const [layout, setLayout] = useState([]); // layout per letter
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const pollingRef = useRef(null);

  const fetchLetters = useCallback(async () => {
    try {
      setError(null);
      const resp = await axios.get(API_LETTERS, { timeout: 5000 });
      // Expect response shape: { letters: [{id, text}], updatedAt }
      const data = resp.data || {};
      const items = Array.isArray(data.letters) ? data.letters : [];
      // Normalize to ensure text field exists
      const normalized = items.map((it, idx) => ({
        id: it.id != null ? it.id : idx + 1,
        text: it.text != null ? String(it.text) : String(it),
      }));
      // Shuffle so front-end shows random order each fetch (user requested random display)
      shuffle(normalized);
      setLetters(normalized);
      setLastUpdated(data.updatedAt || new Date().toISOString());
      setLoading(false);
    } catch (err) {
      console.error("[App] fetchLetters error:", err && err.message ? err.message : err);
      setError("无法从后端获取便签，请检查后端是否运行并且 Excel 文件可访问。");
      setLoading(false);
    }
  }, []);

  /* Compute layout whenever letters or container size change */
  useEffect(() => {
    const recalc = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const layoutResult = computeLayout(letters, Math.floor(rect.width), Math.floor(rect.height));
      setLayout(layoutResult);
    };

    recalc();
    // Recompute on window resize (throttled-ish via requestAnimationFrame)
    let raf = null;
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        recalc();
        raf = null;
      });
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [letters]);

  /* Setup polling on mount */
  useEffect(() => {
    fetchLetters(); // initial
    // clear any existing
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      fetchLetters();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchLetters]);

  /* Manual refresh handler */
  const onRefresh = async () => {
    setLoading(true);
    await fetchLetters();
    setLoading(false);
  };

  /* Render */
  return (
    <div style={{ minHeight: "60vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{
            width: 46, height: 46, borderRadius: 10, display: "grid", placeItems: "center",
            background: "linear-gradient(135deg,#6366f1,#06b6d4)", color: "white", fontWeight: 700, fontSize: 16
          }}>KB</div>
          <div>
            <h2 style={{ margin: 0, color: "#f8fafc", fontSize: 18 }}>Kanban — Sticky Letters</h2>
            <div style={{ color: "rgba(226,238,248,0.7)", fontSize: 13 }}>Read-only board · Randomized layout</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{
            padding: "8px 12px", background: "rgba(255,255,255,0.04)",
            color: "rgba(148,163,184,1)", borderRadius: 999, fontSize: 13, border: "1px solid rgba(255,255,255,0.03)"
          }}>Polling: every {Math.round(POLL_INTERVAL_MS / 1000)}s</div>
          <button
            onClick={onRefresh}
            title="Refresh now"
            style={{
              background: "linear-gradient(180deg,#06b6d4,#0ea5a6)",
              color: "white",
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              boxShadow: "0 6px 18px rgba(2,6,23,0.55)"
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          position: "relative",
          height: "62vh",
          borderRadius: 12,
          padding: 18,
          overflow: "auto",
          background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
          boxShadow: "0 8px 30px rgba(2,6,23,0.6)",
          border: "1px solid rgba(255,255,255,0.03)",
        }}
        role="region"
        aria-live="polite"
      >
        {loading && (
          <div style={{
            display: "grid",
            placeItems: "center",
            height: "100%",
            color: "rgba(226,238,248,0.7)"
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                border: "6px solid rgba(255,255,255,0.06)",
                borderTopColor: "rgba(255,255,255,0.14)",
                margin: "0 auto 12px",
                animation: "spin 1s linear infinite"
              }} />
              <div style={{ fontWeight: 700 }}>Loading notes…</div>
            </div>
          </div>
        )}

        {!loading && error && (
          <div style={{ color: "#fecaca", fontWeight: 700 }}>{error}</div>
        )}

        {!loading && !error && letters.length === 0 && (
          <div style={{ color: "rgba(148,163,184,1)" }}>
            没有便签可显示。请确认后端已启动且 Excel 文件位于正确位置（默认：backend/data/letters.xlsx）。
          </div>
        )}

        {/* Notes */}
        {!loading && letters.length > 0 && layout.length >= letters.length && (
          <>
            {letters.map((note, idx) => (
              <Sticky key={`${note.id}-${idx}`} text={note.text} styleProps={layout[idx]} />
            ))}
          </>
        )}

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>

      <div style={{ marginTop: 12, color: "rgba(148,163,184,1)", fontSize: 13 }}>
        Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : "-"}
      </div>
    </div>
  );
}

/* Mount the app */
const rootEl = document.getElementById("root");
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(<App />);
} else {
  // If the root container isn't present, log an informative message.
  console.error("[main.jsx] No root element found. Make sure index.html has an element with id='root'.");
}
