import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Storage — localStorage
// ---------------------------------------------------------------------------
const store = {
  async set(key, value) {
    localStorage.setItem(key, value);
  },
  async get(key) {
    const value = localStorage.getItem(key);
    return value !== null ? { key, value } : null;
  },
  async list(prefix) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    return { keys };
  },
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { key: "supervision", label: "Supervision", desc: "Qualifications, experience, communication/clarity of direction", individual: false },
  { key: "planning", label: "Planning", desc: "Objectives, alignment with policy & directives, equipment selection/condition, local hazards, route planning/plotting, PPE, supplies, approved float/dive plan", individual: false },
  { key: "team_selection", label: "Team selection", desc: "Training & qualifications, experience, cohesiveness, familiarity with area & equipment", individual: false },
  { key: "fitness", label: "Individual / team fitness", desc: "Illness, medications, stress, alcohol, fatigue & food, emotion, rehydration (IMSAFER)", individual: true },
  { key: "environment", label: "Environment", desc: "Weather forecast & advisories, wind, seas, tides, depths, currents, river discharge, debris/ice, surf, rocks, reefs, traffic, uncharted water, remoteness, security (personnel and/or equipment)", individual: false },
  { key: "complexity", label: "Task complexity", desc: "New location or operation, route complexity, vessel maneuverability, time constraints, task load, number of people &/or organizations involved", individual: false },
  { key: "contingency", label: "Contingency resources", desc: "Availability of emergency services, shore support, first aid, emergency evacuation plan(s)", individual: false },
  { key: "comms", label: "Communications", desc: "Two-way radio (VHF or emergency dispatch), EPIRB/PLB, GPS-linked, satellite phone, position/location resources (e.g., AIS, chart plotters, mobile apps)", individual: false },
];

const PRESETS = {
  project: ["OctoStalking", "Sandy Suckers"],
  operation: ["Individual Tracking", "VIE Tagging"],
  location: ["Blue Heron Bridge", "Jupiter Lighthouse Park", "Ocean Inlet Park", "Peanut Island", "Kaito Bridge"],
};

function initScores() {
  const s = {};
  CATEGORIES.forEach(c => { s[c.key] = { team: 0, individual: 0 }; });
  return s;
}

function colorsFor(v) {
  if (v <= 4) return { bg: "#E1F5EE", text: "#085041", accent: "#1D9E75" };
  if (v <= 7) return { bg: "#FAEEDA", text: "#633806", accent: "#EF9F27" };
  return { bg: "#FCEBEB", text: "#501313", accent: "#E24B4A" };
}

function getCountedTotal(scores) {
  return CATEGORIES.reduce((s, c) => s + scores[c.key].team, 0);
}

function getRating(total) {
  if (total <= 32) return { label: "Green", color: "#1D9E75", bg: "#E1F5EE", text: "#085041", desc: "Proceed — apply standard procedures and precautions." };
  if (total <= 56) return { label: "Amber", color: "#EF9F27", bg: "#FAEEDA", text: "#633806", desc: "Caution — apply additional measures to minimize risk." };
  return { label: "Red", color: "#E24B4A", bg: "#FCEBEB", text: "#501313", desc: "Stop — apply measures to reduce risk before starting or continuing." };
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------
function buildCSV(entries) {
  const scoreHeaders = CATEGORIES.flatMap(c =>
    c.individual ? [`${c.label} (Group)`, `${c.label} (Indiv, not counted)`] : [c.label]
  );
  const headers = ["Date/Time", "Project", "Operation", "Participants", "Location", ...scoreHeaders, "Total", "Rating", "Notes"];
  const rows = entries.map(e => {
    const scoreVals = CATEGORIES.flatMap(c =>
      c.individual ? [e.scores[c.key].team, e.scores[c.key].individual] : [e.scores[c.key].team]
    );
    return [
      new Date(e.ts).toLocaleString(),
      e.project || "",
      e.operation || "",
      e.participants || "",
      e.location || "",
      ...scoreVals,
      e.total,
      e.rating,
      (e.notes || "").replace(/"/g, '""'),
    ].map(v => `"${v}"`).join(",");
  });
  return [headers.join(","), ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const sec = { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 12 };
const inputSty = { width: "100%", fontSize: 13, padding: "6px 8px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit", boxSizing: "border-box" };
const selectSty = { width: "100%", fontSize: 13, padding: "6px 8px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit", boxSizing: "border-box", cursor: "pointer" };
const labelSty = { fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 };
const btnPrimary = { fontSize: 13, padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 500, background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none" };
const btnOutline = { fontSize: 13, padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 500, background: "transparent", color: "var(--color-text-primary)", border: "0.5px solid var(--color-border-secondary)" };

function numInputSty(value, muted) {
  const c = colorsFor(value);
  return {
    width: 52, fontSize: 14, fontWeight: 500, padding: "4px 0",
    border: `1.5px solid ${c.accent}`, borderRadius: 8,
    background: c.bg, color: c.text,
    textAlign: "center", fontFamily: "inherit",
    opacity: muted ? 0.7 : 1,
  };
}

// ---------------------------------------------------------------------------
// SelectOrText
// ---------------------------------------------------------------------------
function SelectOrText({ field, label, placeholder, value, onChange }) {
  const options = PRESETS[field];
  if (!options) {
    return (
      <div>
        <label style={labelSty}>{label}</label>
        <input style={inputSty} type="text" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
      </div>
    );
  }
  const isOther = value !== "" && value !== "__other__" && !options.includes(value);
  const selectVal = isOther ? "__other__" : value;

  return (
    <div>
      <label style={labelSty}>{label}</label>
      <select style={selectSty} value={selectVal} onChange={e => onChange(e.target.value)}>
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__other__">Other…</option>
      </select>
      {(value === "__other__" || isOther) && (
        <input
          style={{ ...inputSty, marginTop: 6 }}
          type="text"
          placeholder={`Enter ${label.toLowerCase()}…`}
          value={isOther ? value : ""}
          onChange={e => onChange(e.target.value)}
          autoFocus
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NewTab
// ---------------------------------------------------------------------------
function NewTab({ onSaved }) {
  const [meta, setMeta] = useState({ project: "", operation: "", participants: "", location: "" });
  const [notes, setNotes] = useState("");
  const [scores, setScores] = useState(initScores);
  const [msg, setMsg] = useState("");

  const counted = getCountedTotal(scores);
  const rating = getRating(counted);

  const updateScore = (key, type, val) => {
    const n = Math.min(10, Math.max(0, parseInt(val) || 0));
    setScores(prev => ({ ...prev, [key]: { ...prev[key], [type]: n } }));
  };

  const handleSave = async () => {
    const entry = { ts: Date.now(), ...meta, notes, scores, total: counted, rating: rating.label };
    try {
      await store.set(`gar:${entry.ts}`, JSON.stringify(entry));
      setMsg(`Saved at ${new Date(entry.ts).toLocaleString()}`);
      setTimeout(() => setMsg(""), 3000);
      onSaved();
    } catch (err) {
      setMsg(`Save failed: ${err?.message || err}`);
    }
  };

  const handleClear = () => {
    setMeta({ project: "", operation: "", participants: "", location: "" });
    setNotes(""); setScores(initScores()); setMsg("");
  };

  return (
    <div>
      <div style={sec}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <SelectOrText field="project" label="Project" placeholder="e.g. Octopus spatial ecology" value={meta.project} onChange={v => setMeta(p => ({...p, project: v}))} />
          <SelectOrText field="operation" label="Operation" placeholder="e.g. VIE tagging survey" value={meta.operation} onChange={v => setMeta(p => ({...p, operation: v}))} />
          <div>
            <label style={labelSty}>Participants</label>
            <input style={inputSty} type="text" placeholder="e.g. Cheyne, Brooks" value={meta.participants} onChange={e => setMeta(p => ({...p, participants: e.target.value}))} />
          </div>
          <SelectOrText field="location" label="Location" placeholder="e.g. Blue Heron Bridge" value={meta.location} onChange={v => setMeta(p => ({...p, location: v}))} />
        </div>
      </div>

      <div style={sec}>
        {CATEGORIES.map((cat, i) => (
          <div key={cat.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < CATEGORIES.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{cat.label}</span>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{cat.desc}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {cat.individual && <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Group</span>}
                <input type="number" min={0} max={10} value={scores[cat.key].team}
                  onChange={e => updateScore(cat.key, "team", e.target.value)}
                  style={numInputSty(scores[cat.key].team, false)} />
              </div>
              {cat.individual && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Indiv <span style={{ opacity: 0.55 }}>(not counted)</span></span>
                  <input type="number" min={0} max={10} value={scores[cat.key].individual}
                    onChange={e => updateScore(cat.key, "individual", e.target.value)}
                    style={numInputSty(scores[cat.key].individual, true)} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, margin: "1rem 0", alignItems: "stretch" }}>
        <div style={{ borderRadius: 8, padding: "10px 16px", background: "#E1F5EE", display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#085041" }}>Total</span>
          <span style={{ fontSize: 24, fontWeight: 500, color: "#085041" }}>{counted}</span>
          <span style={{ fontSize: 13, color: "#085041", opacity: 0.6 }}>/80</span>
        </div>
        <div style={{ flex: 1, borderRadius: 10, padding: "10px 14px", background: rating.bg, border: `0.5px solid ${rating.color}55` }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: rating.color, marginBottom: 2 }}>{rating.label}</div>
          <div style={{ fontSize: 12, color: rating.text }}>{rating.desc}</div>
        </div>
      </div>

      <div style={sec}>
        <label style={labelSty}>Notes</label>
        <textarea style={{ ...inputSty, resize: "vertical", minHeight: 56 }} placeholder="Risk mitigations, observations, decisions…" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
        <button style={btnPrimary} onClick={handleSave}>Save assessment</button>
        <button style={btnOutline} onClick={handleClear}>Clear</button>
      </div>
      {msg && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 8 }}>{msg}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PDF generation — builds a standalone HTML page and opens it in a new tab
// ---------------------------------------------------------------------------
function buildPrintHTML(entry) {
  const rating = getRating(entry.total);
  const ratingColor = rating.color;
  const ratingBg = rating.bg;
  const metaFields = [
    ["Project", entry.project],
    ["Operation", entry.operation],
    ["Participants", entry.participants],
    ["Location", entry.location],
    ["Date/Time", new Date(entry.ts).toLocaleString()],
  ].filter(([, v]) => v);

  const categoryRows = CATEGORIES.map(cat => {
    const score = entry.scores[cat.key].team;
    const indivScore = entry.scores[cat.key].individual;
    const scoreColor = score <= 4 ? "#1D9E75" : score <= 7 ? "#EF9F27" : "#E24B4A";
    const indivColor = indivScore <= 4 ? "#1D9E75" : indivScore <= 7 ? "#EF9F27" : "#E24B4A";
    const indivRow = cat.individual ? `
      <tr style="background:#fafafa;">
        <td style="padding:4px 8px 4px 24px; font-size:10px; color:#888; border-bottom:1px solid #eee;">
          ${cat.label} — Individual <span style="font-size:9px;">(not counted in total)</span>
        </td>
        <td style="padding:4px 8px; text-align:right; font-size:10px; color:${indivColor}; font-weight:600; border-bottom:1px solid #eee;">${indivScore}</td>
      </tr>` : "";
    return `
      <tr>
        <td style="padding:7px 8px; font-size:11px; color:#222; border-bottom:1px solid #eee; vertical-align:top;">
          <strong>${cat.label}</strong>
          <div style="font-size:9.5px; color:#888; margin-top:2px;">${cat.desc}</div>
        </td>
        <td style="padding:7px 8px; text-align:right; font-size:13px; font-weight:700; color:${scoreColor}; border-bottom:1px solid #eee; vertical-align:middle;">${score}</td>
      </tr>${indivRow}`;
  }).join("");

  const metaHtml = metaFields.map(([k, v]) =>
    `<div style="margin-bottom:3px;"><span style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.04em;">${k}</span><br><span style="font-size:12px;color:#111;font-weight:500;">${v}</span></div>`
  ).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>MOCC GAR — ${entry.project || "Assessment"} ${new Date(entry.ts).toLocaleDateString()}</title>
  <style>
    @page { margin: 18mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111; background: white; }
    @media screen { body { max-width: 680px; margin: 2rem auto; padding: 0 1rem; } }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-end;">
    <div>
      <div style="font-size:18px;font-weight:700;letter-spacing:-0.02em;">MOCC GAR Worksheet</div>
      <div style="font-size:11px;color:#666;margin-top:2px;">Generalized Assessment of Risk — Scientific Diving</div>
    </div>
    <div style="text-align:right;font-size:10px;color:#888;">${new Date(entry.ts).toLocaleString()}</div>
  </div>

  <!-- Meta -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px 20px;margin-bottom:16px;padding:10px 12px;background:#f7f7f7;border-radius:6px;">
    ${metaHtml}
  </div>

  <!-- Ratings legend -->
  <div style="display:flex;gap:8px;margin-bottom:14px;font-size:10px;">
    <div style="padding:4px 10px;border-radius:4px;background:#E1F5EE;color:#085041;"><strong>Green</strong> ≤32</div>
    <div style="padding:4px 10px;border-radius:4px;background:#FAEEDA;color:#633806;"><strong>Amber</strong> 33–56</div>
    <div style="padding:4px 10px;border-radius:4px;background:#FCEBEB;color:#501313;"><strong>Red</strong> &gt;56</div>
    <div style="margin-left:auto;font-size:9.5px;color:#888;align-self:center;">Score 0 (no risk) → 10 (highest risk) per category</div>
  </div>

  <!-- Scores table -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:14px;border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;">
    <thead>
      <tr style="background:#111;color:white;">
        <th style="padding:7px 8px;text-align:left;font-size:11px;font-weight:600;">Category</th>
        <th style="padding:7px 8px;text-align:right;font-size:11px;font-weight:600;width:60px;">Score</th>
      </tr>
    </thead>
    <tbody>
      ${categoryRows}
    </tbody>
  </table>

  <!-- Total + Rating -->
  <div style="display:flex;gap:12px;margin-bottom:14px;align-items:stretch;">
    <div style="padding:10px 18px;background:#f0f0f0;border-radius:6px;text-align:center;min-width:90px;">
      <div style="font-size:10px;color:#666;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.05em;">Total</div>
      <div style="font-size:28px;font-weight:700;color:#111;line-height:1;">${entry.total}<span style="font-size:13px;font-weight:400;color:#888;">/80</span></div>
    </div>
    <div style="flex:1;padding:10px 14px;border-radius:6px;background:${ratingBg};border:1.5px solid ${ratingColor};">
      <div style="font-size:13px;font-weight:700;color:${ratingColor};margin-bottom:3px;">${rating.label}</div>
      <div style="font-size:11px;color:#333;">${rating.desc}</div>
    </div>
  </div>

  ${entry.notes ? `
  <!-- Notes -->
  <div style="padding:10px 12px;background:#f7f7f7;border-radius:6px;border-left:3px solid #ccc;">
    <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Notes</div>
    <div style="font-size:12px;color:#333;line-height:1.5;">${entry.notes}</div>
  </div>` : ""}

  <script>window.onload = () => window.print();</script>
</body>
</html>`;
}

// No-op placeholder kept for buildPrintHTML which is still used by PrintView


// ---------------------------------------------------------------------------
// EntryDetail — inline view of a single assessment
// ---------------------------------------------------------------------------
function EntryDetail({ entry, onBack, onPrint }) {
  const rating = getRating(entry.total);
  return (
    <div>
      <button onClick={onBack} style={{ ...btnOutline, marginBottom: "1rem", display: "flex", alignItems: "center", gap: 6 }}>
        ‹ Back
      </button>
      <div style={sec}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 }}>MOCC GAR worksheet</div>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: "0.75rem" }}>{new Date(entry.ts).toLocaleString()}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 12, color: "var(--color-text-secondary)" }}>
          {[["Project", entry.project], ["Operation", entry.operation], ["Participants", entry.participants], ["Location", entry.location]].map(([k, v]) => v ? (
            <span key={k}><strong style={{ color: "var(--color-text-primary)" }}>{k}:</strong> {v}</span>
          ) : null)}
        </div>
      </div>

      <div style={sec}>
        {CATEGORIES.map((cat) => (
          <div key={cat.key}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>
              <span style={{ color: "var(--color-text-primary)" }}>{cat.label}</span>
              <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{entry.scores[cat.key].team}</span>
            </div>
            {cat.individual && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0 4px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 11, color: "var(--color-text-secondary)" }}>
                <span>Individual <span style={{ opacity: 0.6 }}>(not counted)</span></span>
                <span>{entry.scores[cat.key].individual}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, margin: "1rem 0", alignItems: "stretch" }}>
        <div style={{ borderRadius: 8, padding: "10px 16px", background: "#E1F5EE", display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#085041" }}>Total</span>
          <span style={{ fontSize: 24, fontWeight: 500, color: "#085041" }}>{entry.total}</span>
          <span style={{ fontSize: 13, color: "#085041", opacity: 0.6 }}>/80</span>
        </div>
        <div style={{ flex: 1, borderRadius: 10, padding: "10px 14px", background: rating.bg, border: `0.5px solid ${rating.color}55` }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: rating.color, marginBottom: 2 }}>{rating.label}</div>
          <div style={{ fontSize: 12, color: rating.text }}>{rating.desc}</div>
        </div>
      </div>

      {entry.notes && (
        <div style={{ ...sec, marginBottom: "1rem" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Notes</div>
          <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{entry.notes}</div>
        </div>
      )}

      <button style={btnPrimary} onClick={onPrint}>
        View printable version
      </button>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 8 }}>
        Shows a clean formatted page — then use your browser's Share → Print or Save as PDF.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSVView — inline CSV export
// ---------------------------------------------------------------------------
function CSVView({ entries, onBack }) {
  const csv = buildCSV(entries);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(csv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  const filename = `GAR_assessments_${new Date().toISOString().slice(0, 10)}.csv`;

  return (
    <div>
      <button onClick={onBack} style={{ ...btnOutline, marginBottom: "1rem" }}>‹ Back</button>
      <div style={sec}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 }}>Export CSV</div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: "0.75rem" }}>
          {entries.length} assessment{entries.length !== 1 ? "s" : ""} — download or copy below.
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
          <a href={dataUri} download={filename} style={{ ...btnPrimary, textDecoration: "none", display: "inline-block" }}>Download .csv</a>
          <button style={btnOutline} onClick={handleCopy}>{copied ? "Copied!" : "Copy to clipboard"}</button>
        </div>
        <textarea
          readOnly
          value={csv}
          style={{ ...inputSty, fontFamily: "monospace", fontSize: 10, minHeight: 120, resize: "vertical", whiteSpace: "pre" }}
          onFocus={e => e.target.select()}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PrintView — full-screen clean render, user prints from browser
// ---------------------------------------------------------------------------
function PrintView({ entry, onBack }) {
  const rating = getRating(entry.total);
  const metaFields = [
    ["Project", entry.project],
    ["Operation", entry.operation],
    ["Participants", entry.participants],
    ["Location", entry.location],
    ["Date/Time", new Date(entry.ts).toLocaleString()],
  ].filter(([, v]) => v);

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#111", background: "white", minHeight: "100vh", padding: "1.5rem 1.25rem" }}>
      {/* Back button - hidden on print */}
      <div className="no-print" style={{ marginBottom: "1.25rem" }}>
        <button onClick={onBack} style={{ ...btnOutline, fontSize: 12 }}>‹ Back</button>
        <span style={{ fontSize: 11, color: "#888", marginLeft: 10 }}>Use browser Share → Print to save as PDF</span>
      </div>

      {/* Header */}
      <div style={{ borderBottom: "2px solid #111", paddingBottom: 10, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>MOCC GAR Worksheet</div>
          <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>Generalized Assessment of Risk — Scientific Diving</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 10, color: "#888" }}>{new Date(entry.ts).toLocaleString()}</div>
      </div>

      {/* Meta */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 16px", marginBottom: 16, padding: "10px 12px", background: "#f7f7f7", borderRadius: 6 }}>
        {metaFields.map(([k, v]) => (
          <div key={k} style={{ marginBottom: 2 }}>
            <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.04em" }}>{k}</div>
            <div style={{ fontSize: 12, color: "#111", fontWeight: 500 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, fontSize: 10 }}>
        <div style={{ padding: "4px 10px", borderRadius: 4, background: "#E1F5EE", color: "#085041" }}><strong>Green</strong> ≤32</div>
        <div style={{ padding: "4px 10px", borderRadius: 4, background: "#FAEEDA", color: "#633806" }}><strong>Amber</strong> 33–56</div>
        <div style={{ padding: "4px 10px", borderRadius: 4, background: "#FCEBEB", color: "#501313" }}><strong>Red</strong> &gt;56</div>
        <div style={{ marginLeft: "auto", fontSize: 9, color: "#888", alignSelf: "center" }}>0 = no risk · 10 = highest risk</div>
      </div>

      {/* Scores */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, border: "1px solid #e0e0e0" }}>
        <thead>
          <tr style={{ background: "#111", color: "white" }}>
            <th style={{ padding: "7px 8px", textAlign: "left", fontSize: 11, fontWeight: 600 }}>Category</th>
            <th style={{ padding: "7px 8px", textAlign: "right", fontSize: 11, fontWeight: 600, width: 60 }}>Score</th>
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map(cat => {
            const score = entry.scores[cat.key].team;
            const indiv = entry.scores[cat.key].individual;
            const sc = score <= 4 ? "#1D9E75" : score <= 7 ? "#EF9F27" : "#E24B4A";
            const ic = indiv <= 4 ? "#1D9E75" : indiv <= 7 ? "#EF9F27" : "#E24B4A";
            return [
              <tr key={cat.key} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "7px 8px", fontSize: 11, color: "#222", verticalAlign: "top" }}>
                  <strong>{cat.label}</strong>
                  <div style={{ fontSize: 9.5, color: "#888", marginTop: 2 }}>{cat.desc}</div>
                </td>
                <td style={{ padding: "7px 8px", textAlign: "right", fontSize: 13, fontWeight: 700, color: sc, verticalAlign: "middle" }}>{score}</td>
              </tr>,
              cat.individual && (
                <tr key={cat.key + "_indiv"} style={{ background: "#fafafa", borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "4px 8px 4px 24px", fontSize: 10, color: "#888" }}>
                    {cat.label} — Individual <span style={{ fontSize: 9 }}>(not counted in total)</span>
                  </td>
                  <td style={{ padding: "4px 8px", textAlign: "right", fontSize: 10, color: ic, fontWeight: 600 }}>{indiv}</td>
                </tr>
              )
            ];
          })}
        </tbody>
      </table>

      {/* Total + Rating */}
      <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "stretch" }}>
        <div style={{ padding: "10px 18px", background: "#f0f0f0", borderRadius: 6, textAlign: "center", minWidth: 90 }}>
          <div style={{ fontSize: 10, color: "#666", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#111", lineHeight: 1 }}>{entry.total}<span style={{ fontSize: 13, fontWeight: 400, color: "#888" }}>/80</span></div>
        </div>
        <div style={{ flex: 1, padding: "10px 14px", borderRadius: 6, background: rating.bg, border: `1.5px solid ${rating.color}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: rating.color, marginBottom: 3 }}>{rating.label}</div>
          <div style={{ fontSize: 11, color: "#333" }}>{rating.desc}</div>
        </div>
      </div>

      {/* Notes */}
      {entry.notes && (
        <div style={{ padding: "10px 12px", background: "#f7f7f7", borderRadius: 6, borderLeft: "3px solid #ccc" }}>
          <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Notes</div>
          <div style={{ fontSize: 12, color: "#333", lineHeight: 1.5 }}>{entry.notes}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HistoryTab
// ---------------------------------------------------------------------------
function HistoryTab() {
  const [entries, setEntries] = useState([]);
  const [view, setView] = useState("list"); // "list" | "entry" | "csv"
  const [activeEntry, setActiveEntry] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await store.list("gar:");
      const keys = result?.keys || [];
      const loaded = [];
      for (const k of keys) {
        try {
          const r = await store.get(k);
          if (r) loaded.push(JSON.parse(r.value));
        } catch {}
      }
      loaded.sort((a, b) => b.ts - a.ts);
      setEntries(loaded);
    } catch { setEntries([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const dotColor = r => r === "Green" ? "#1D9E75" : r === "Amber" ? "#EF9F27" : "#E24B4A";

  if (view === "print" && activeEntry) {
    return <PrintView entry={activeEntry} onBack={() => setView("entry")} />;
  }

  if (view === "entry" && activeEntry) {
    return <EntryDetail entry={activeEntry} onBack={() => { setView("list"); setActiveEntry(null); }} onPrint={() => setView("print")} />;
  }

  if (view === "csv") {
    return <CSVView entries={entries} onBack={() => setView("list")} />;
  }

  return (
    <div>
      <div style={sec}>
        {loading
          ? <div style={{ textAlign: "center", padding: "2rem", fontSize: 13, color: "var(--color-text-secondary)" }}>Loading…</div>
          : entries.length === 0
            ? <div style={{ textAlign: "center", padding: "2rem", fontSize: 13, color: "var(--color-text-secondary)" }}>No saved assessments yet.</div>
            : entries.map(e => (
              <div key={e.ts}
                onClick={() => { setActiveEntry(e); setView("entry"); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)", cursor: "pointer" }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: dotColor(e.rating), flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{new Date(e.ts).toLocaleString()}</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-primary)", marginTop: 2, fontWeight: 500 }}>{e.project||"—"} · {e.operation||"—"} · {e.location||"—"}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: dotColor(e.rating) }}>{e.total}/80</div>
                  <div style={{ fontSize: 16, color: "var(--color-text-secondary)" }}>›</div>
                </div>
              </div>
            ))
        }
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={btnOutline} onClick={() => { if (entries.length === 0) { alert("No assessments to export."); return; } setView("csv"); }}>Export CSV</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------
export default function GARApp() {
  const [tab, setTab] = useState("form");
  const [historyKey, setHistoryKey] = useState(0);

  const tabSty = active => ({
    fontSize: 13, padding: "6px 12px 10px", cursor: "pointer",
    color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
    fontWeight: active ? 500 : 400,
    borderBottom: active ? "2px solid var(--color-text-primary)" : "2px solid transparent",
    marginBottom: -1, background: "none", border: "none",
  });

  return (
    <div style={{ padding: "1rem 0", maxWidth: 680 }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)" }}>MOCC GAR worksheet</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>Generalized Assessment of Risk — scientific diving</p>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        <button style={tabSty(tab === "form")} onClick={() => setTab("form")}>New assessment</button>
        <button style={tabSty(tab === "history")} onClick={() => setTab("history")}>History</button>
      </div>
      {tab === "form" && <NewTab onSaved={() => setHistoryKey(k => k + 1)} />}
      {tab === "history" && <HistoryTab key={historyKey} />}
    </div>
  );
}
