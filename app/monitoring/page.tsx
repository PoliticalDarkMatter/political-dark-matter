"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Play, Star, Clock, FolderOpen } from "lucide-react";

interface Project {
  id: string;
  name: string;
  chips: string[];
  chipMode: "AND" | "OR";
  period: string;
  created: string;
  lastRun: string | null;
  notes: string;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "nigdy";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 1) return `${d} dni temu`;
  if (h >= 1) return `${h}h temu`;
  return "przed chwilą";
}

const PERIOD_LABELS: Record<string, string> = {
  "1h": "1 godzina", "24h": "24 godziny", "7d": "7 dni", "30d": "30 dni", "1y": "rok",
};

export default function MonitoringPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([] as Project[]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [newPeriod, setNewPeriod] = useState("24h");
  const [newNotes, setNewNotes] = useState("");

  useEffect(function () {
    try {
      const raw = localStorage.getItem("ns_projects");
      if (raw) setProjects(JSON.parse(raw) as Project[]);
    } catch { /* ignore */ }
  }, []);

  function saveProjects(updated: Project[]) {
    setProjects(updated);
    try { localStorage.setItem("ns_projects", JSON.stringify(updated)); } catch { /* ignore */ }
  }

  function createProject() {
    if (!newName.trim() || !newKeywords.trim()) return;
    const chips = newKeywords.split(",").map(function (k) { return k.trim(); }).filter(Boolean);
    const project: Project = {
      id: Date.now().toString(),
      name: newName.trim(),
      chips,
      chipMode: "AND",
      period: newPeriod,
      created: new Date().toISOString(),
      lastRun: null,
      notes: newNotes.trim(),
    };
    saveProjects([project, ...projects]);
    setShowNew(false);
    setNewName(""); setNewKeywords(""); setNewPeriod("24h"); setNewNotes("");
  }

  function deleteProject(id: string) {
    saveProjects(projects.filter(function (p) { return p.id !== id; }));
  }

  function openProject(project: Project) {
    // Zapisz projekt jako aktywne wyszukiwanie i przejdź do dashboardu
    try {
      localStorage.setItem("ns_active_project", JSON.stringify(project));
      // Zaktualizuj lastRun
      const updated = projects.map(function (p) {
        return p.id === project.id ? { ...p, lastRun: new Date().toISOString() } : p;
      });
      saveProjects(updated);
    } catch { /* ignore */ }
    const q = project.chips.join(project.chipMode === "AND" ? " " : " OR ");
    router.push("/dashboard?q=" + encodeURIComponent(q) + "&period=" + project.period);
  }

  return (
    <div style={{ padding: "24px", maxWidth: 900, margin: "0 auto", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Projekty monitoringu</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>
            Zapisywalne badania narracyjne — wracaj do analiz w dowolnym momencie
          </p>
        </div>
        <button
          onClick={function () { setShowNew(true); }}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "9px 16px", borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none", color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: "pointer", boxShadow: "0 2px 8px rgba(99,102,241,0.25)",
            whiteSpace: "nowrap",
          }}>
          <Plus size={15} /> Nowy projekt
        </button>
      </div>

      {/* New project form */}
      {showNew && (
        <div style={{ background: "#fff", border: "1px solid #c7d2fe", borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: "0 4px 16px rgba(99,102,241,0.1)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Nowy projekt</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Nazwa projektu
              </label>
              <input value={newName} onChange={function (e) { setNewName(e.target.value); }}
                placeholder="np. Monitoring kampanii wyborczej"
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Słowa kluczowe (oddziel przecinkami)
              </label>
              <input value={newKeywords} onChange={function (e) { setNewKeywords(e.target.value); }}
                placeholder="np. Tusk, inflacja, koalicja"
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Okres
                </label>
                <select value={newPeriod} onChange={function (e) { setNewPeriod(e.target.value); }}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#0f172a", outline: "none", background: "#fff" }}>
                  {Object.entries(PERIOD_LABELS).map(function (e) {
                    return <option key={e[0]} value={e[0]}>{e[1]}</option>;
                  })}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Notatki (opcjonalne)
                </label>
                <input value={newNotes} onChange={function (e) { setNewNotes(e.target.value); }}
                  placeholder="Kontekst, cel analizy…"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={createProject}
              style={{ padding: "8px 18px", background: "#6366f1", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Utwórz projekt
            </button>
            <button onClick={function () { setShowNew(false); }}
              style={{ padding: "8px 18px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, color: "#64748b", fontSize: 13, cursor: "pointer" }}>
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Projects list */}
      {projects.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
          <FolderOpen size={40} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <p style={{ fontSize: 15, fontWeight: 500, color: "#64748b", margin: "0 0 6px" }}>Brak zapisanych projektów</p>
          <p style={{ fontSize: 13, margin: 0 }}>Utwórz projekt by zapisywać badania narracyjne i wracać do nich później</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {projects.map(function (project) {
            return (
              <div key={project.id} style={{ background: "#fff", border: "1px solid #e8edf2", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <Star size={14} style={{ color: "#f59e0b", flexShrink: 0 }} />
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {project.name}
                      </h3>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                      {project.chips.map(function (chip, i) {
                        return (
                          <span key={i} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 5, padding: "2px 8px", fontSize: 11, color: "#4338ca", fontWeight: 500 }}>
                            {chip}
                          </span>
                        );
                      })}
                      <span style={{ background: "#f1f5f9", borderRadius: 5, padding: "2px 8px", fontSize: 11, color: "#64748b" }}>
                        {PERIOD_LABELS[project.period] || project.period}
                      </span>
                    </div>
                    {project.notes && (
                      <p style={{ margin: 0, fontSize: 12, color: "#64748b", fontStyle: "italic" }}>{project.notes}</p>
                    )}
                    <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#94a3b8" }}>
                        <Clock size={11} /> Ostatnio: {timeAgo(project.lastRun)}
                      </span>
                      <span style={{ fontSize: 11, color: "#cbd5e1" }}>
                        Utworzono {new Date(project.created).toLocaleDateString("pl-PL")}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={function () { openProject(project); }}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8, color: "#4338ca", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      <Play size={12} /> Otwórz
                    </button>
                    <button onClick={function () { deleteProject(project.id); }}
                      style={{ padding: "7px 10px", background: "#fff", border: "1px solid #fee2e2", borderRadius: 8, color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FB / X info */}
      <div style={{ marginTop: 32, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#92400e" }}>ℹ️ Social media — dostępność źródeł</h3>
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "#78350f", lineHeight: 1.6 }}>
          <strong>X (Twitter):</strong> od 2023 API płatne ($100/mies.). Alternatywa: ręcznie dodaj konta jako RSS via <code style={{ background: "#fef3c7", padding: "1px 5px", borderRadius: 3 }}>nitter.poast.org/USERNAME/rss</code> w Ustawieniach → Źródła RSS.<br />
          <strong>Facebook:</strong> Meta API wymaga review. Publiczne strony FB można śledzić via <code style={{ background: "#fef3c7", padding: "1px 5px", borderRadius: 3 }}>rsshub.app/facebook/page/PAGENAME</code>.<br />
          <strong>Reddit:</strong> ✅ Darmowe — wyszukiwanie aktywne w każdym zapytaniu (r/poland, r/europe).<br />
          <strong>YouTube komentarze:</strong> Planowane w Fazie 2 (YouTube Data API v3, darmowe).
        </p>
      </div>
    </div>
  );
}
