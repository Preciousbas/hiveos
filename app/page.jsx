"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const AGENTS = [
  { id: "ceo", label: "CEO", role: "Command" },
  { id: "research", label: "Research", role: "Computer use" },
  { id: "marketing", label: "Marketing", role: "Go-to-market" },
  { id: "engineering", label: "Engineering", role: "Build plan" },
  { id: "qa", label: "QA", role: "Assurance" },
  { id: "finance", label: "Finance", role: "Unit economics" },
];

const INITIAL_STATUS = Object.fromEntries(
  AGENTS.map((a) => [a.id, "idle"])
);

function statusColor(status) {
  switch (status) {
    case "running":
      return "text-hive-accent";
    case "done":
      return "text-hive-ok";
    case "error":
      return "text-hive-danger";
    default:
      return "text-hive-muted";
  }
}

function StatusDot({ status }) {
  const color =
    status === "running"
      ? "bg-hive-accent"
      : status === "done"
        ? "bg-hive-ok"
        : status === "error"
          ? "bg-hive-danger"
          : "bg-hive-muted/50";
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${color} ${
        status === "running" ? "animate-pulseSoft" : ""
      }`}
    />
  );
}

function AgentText({ children }) {
  const text = typeof children === "string" ? children : "";
  if (!text) return null;

  const cleaned = text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/_{2}([^_]+)_{2}/g, "**$1**");

  const parts = cleaned.split(/(\*\*[^*]+\*\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <strong key={i} className="font-semibold text-hive-text">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function Panel({ title, subtitle, status, children, wide }) {
  return (
    <section
      className={`relative overflow-hidden rounded-xl border border-hive-border bg-hive-panel/90 backdrop-blur-sm ${
        wide ? "md:col-span-2" : ""
      } ${status === "running" ? "shadow-glow border-hive-borderHot" : ""}`}
    >
      {status === "running" && (
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute inset-x-0 h-16 bg-gradient-to-b from-hive-accent/20 to-transparent animate-scan" />
        </div>
      )}
      <header className="flex items-center justify-between gap-3 border-b border-hive-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-hive-text">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-xs text-hive-muted">{subtitle}</p>
          ) : null}
        </div>
        <div
          className={`flex items-center gap-2 text-xs uppercase tracking-wider ${statusColor(status)}`}
        >
          <StatusDot status={status} />
          {status}
        </div>
      </header>
      <div className="max-h-[320px] overflow-y-auto px-4 py-3 text-sm leading-relaxed text-hive-text/90 whitespace-pre-wrap">
        {children}
      </div>
    </section>
  );
}

function shotSrc(shot) {
  if (!shot?.image_b64) return null;
  const mime = shot.mime_type || "image/png";
  return `data:${mime};base64,${shot.image_b64}`;
}

function MemoryList({ memory, activeId, onSelect, disabled }) {
  if (memory.length === 0) {
    return <p className="text-xs text-hive-muted">No missions yet.</p>;
  }

  return (
    <ul className="max-h-64 space-y-2 overflow-y-auto">
      {memory.map((m) => {
        const active = m.id === activeId;
        return (
          <li key={m.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(m)}
              className={`w-full rounded-md border px-2 py-1.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? "border-hive-accent/50 bg-hive-accent/10"
                  : "border-hive-border/70 bg-hive-bg/40 hover:border-hive-borderHot hover:bg-hive-panel2"
              }`}
            >
              <div className="truncate text-xs text-hive-text">{m.goal}</div>
              <div className="mt-0.5 font-mono text-[10px] text-hive-muted opacity-70">
                {m.createdAt
                  ? new Date(m.createdAt).toLocaleString()
                  : m.id}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function HomePage() {
  const [goal, setGoal] = useState("");
  const [running, setRunning] = useState(false);
  const [statuses, setStatuses] = useState(INITIAL_STATUS);
  const [briefs, setBriefs] = useState(null);
  const [research, setResearch] = useState(null);
  const [marketing, setMarketing] = useState("");
  const [engineering, setEngineering] = useState("");
  const [qa, setQa] = useState("");
  const [finance, setFinance] = useState("");
  const [ceoBrief, setCeoBrief] = useState("");
  const [feed, setFeed] = useState([]);
  const [memory, setMemory] = useState([]);
  const [error, setError] = useState("");
  const [missionId, setMissionId] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const feedEndRef = useRef(null);
  const abortRef = useRef(null);

  const loadMemory = useCallback(async () => {
    try {
      const res = await fetch("/api/memory");
      const data = await res.json();
      if (res.ok) setMemory(data.missions || []);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    loadMemory();
  }, [loadMemory]);

  useEffect(() => {
    if (activityOpen) {
      feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [feed, activityOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  const resetMission = () => {
    setStatuses({ ...INITIAL_STATUS });
    setBriefs(null);
    setResearch(null);
    setMarketing("");
    setEngineering("");
    setQa("");
    setFinance("");
    setCeoBrief("");
    setFeed([]);
    setError("");
    setMissionId("");
  };

  const restoreMission = useCallback(
    (m) => {
      if (running || !m) return;
      setGoal(m.goal || "");
      setMissionId(m.id || "");
      setBriefs(m.briefs || null);
      setResearch(
        m.research
          ? {
              findings: m.research.findings || "",
              runId: m.research.runId,
              screenshots: [],
            }
          : null
      );
      setMarketing(m.marketing || "");
      setEngineering(m.engineering || "");
      setQa(m.qa || "");
      setFinance(m.finance || "");
      setCeoBrief(m.ceoBrief || "");
      setFeed([]);
      setError("");
      setStatuses(
        Object.fromEntries(AGENTS.map((a) => [a.id, "done"]))
      );
      setMobileMenuOpen(false);
      setActivityOpen(false);
    },
    [running]
  );

  const launch = async () => {
    if (running || !goal.trim()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    resetMission();
    setRunning(true);
    setActivityOpen(true);

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goal.trim() }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Launch failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let event;
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          applyEvent(event);
        }
      }

      if (buffer.trim()) {
        try {
          applyEvent(JSON.parse(buffer));
        } catch {
          /* ignore trailing partial */
        }
      }

      await loadMemory();
    } catch (err) {
      if (err?.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Mission failed";
      setError(message);
      setStatuses((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(next)) {
          if (v === "running") next[k] = "error";
        }
        return next;
      });
    } finally {
      setRunning(false);
    }
  };

  function applyEvent(event) {
    if (!event || typeof event !== "object") return;

    if (event.type === "mission") {
      setMissionId(event.missionId || "");
      return;
    }

    if (event.type === "feed" && event.item) {
      setFeed((prev) => [...prev, event.item]);
      return;
    }

    if (event.type === "agent_status" && event.agent) {
      setStatuses((prev) => ({
        ...prev,
        [event.agent]: event.status || "running",
      }));
      return;
    }

    if (event.type === "stage") {
      const agent = event.agent;
      if (agent) {
        setStatuses((prev) => ({ ...prev, [agent]: event.status || "done" }));
      }

      switch (event.stage) {
        case "ceo_delegate":
          setBriefs(event.data || null);
          break;
        case "research":
          setResearch(event.data || null);
          break;
        case "marketing":
          setMarketing(event.data?.output || "");
          break;
        case "engineering":
          setEngineering(event.data?.output || "");
          break;
        case "qa":
          setQa(event.data?.output || "");
          break;
        case "finance":
          setFinance(event.data?.output || "");
          break;
        case "ceo_synthesize":
          setCeoBrief(event.data?.brief || "");
          break;
        default:
          break;
      }
      return;
    }

    if (event.type === "error") {
      setError(event.message || "Unknown error");
      setStatuses((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(next)) {
          if (v === "running") next[k] = "error";
        }
        return next;
      });
      return;
    }

    if (event.type === "complete") {
      setMissionId(event.missionId || missionId);
      setStatuses((prev) => {
        const next = { ...prev };
        for (const a of AGENTS) next[a.id] = "done";
        return next;
      });
    }
  }

  const ceoPanelBody = useMemo(() => {
    if (ceoBrief) return ceoBrief;
    if (briefs) {
      return [
        "DELEGATION COMPLETE",
        "",
        `Research: ${briefs.research_brief}`,
        "",
        `Marketing: ${briefs.marketing_brief}`,
        "",
        `Engineering: ${briefs.engineering_brief}`,
        "",
        `QA: ${briefs.qa_brief}`,
        "",
        `Finance: ${briefs.finance_brief}`,
      ].join("\n");
    }
    return "";
  }, [briefs, ceoBrief]);

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 hive-grid opacity-40" />

      {/* Mobile memory drawer */}
      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(100%,320px)] flex-col border-r border-hive-border bg-hive-panel shadow-xl">
            <header className="flex items-center justify-between border-b border-hive-border px-4 py-3">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-hive-muted">
                Memory
              </h3>
              <button
                type="button"
                aria-label="Close"
                className="rounded-md px-2 py-1 text-hive-muted hover:bg-hive-panel2 hover:text-hive-text"
                onClick={() => setMobileMenuOpen(false)}
              >
                ✕
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-3">
              <p className="mb-3 text-[11px] text-hive-muted">
                Completed missions are saved automatically. Tap one to reopen it.
              </p>
              <MemoryList
                memory={memory}
                activeId={missionId}
                onSelect={restoreMission}
                disabled={running}
              />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
        {/* Top bar */}
        <header className="flex flex-col gap-4 border-b border-hive-border pb-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              aria-label="Open memory menu"
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-hive-border bg-hive-panel text-hive-text lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="flex flex-col gap-1.5" aria-hidden>
                <span className="block h-0.5 w-4 rounded-full bg-current" />
                <span className="block h-0.5 w-4 rounded-full bg-current" />
                <span className="block h-0.5 w-4 rounded-full bg-current" />
              </span>
            </button>
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-tight text-hive-text md:text-5xl">
                HiveOS
              </h1>
              <p className="mt-1 max-w-xl text-sm text-hive-muted">
                An operating system for work.
              </p>
            </div>
          </div>
        </header>

        {/* Mission input */}
        <form
          className="flex flex-col gap-3 rounded-xl border border-hive-border bg-hive-panel p-3 md:flex-row md:items-stretch"
          onSubmit={(e) => {
            e.preventDefault();
            launch();
          }}
        >
          <label className="sr-only" htmlFor="mission-goal">
            Mission goal
          </label>
          <input
            id="mission-goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={running}
            placeholder="Prepare my product launch for next Friday."
            className="flex-1 rounded-lg border border-hive-border bg-hive-bg px-4 py-3 text-sm text-hive-text outline-none ring-hive-accent/40 placeholder:text-hive-muted/45 focus:ring-2 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={running || !goal.trim()}
            className="rounded-lg bg-hive-accent px-6 py-3 text-sm font-semibold text-hive-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? "Running…" : "Launch"}
          </button>
        </form>

        {error ? (
          <div className="rounded-lg border border-hive-danger/40 bg-hive-danger/10 px-4 py-3 text-sm text-hive-danger">
            {error}
          </div>
        ) : null}

        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_280px]">
          {/* Sidebar — desktop only for memory; workforce always */}
          <aside className="flex flex-col gap-4">
            <div className="rounded-xl border border-hive-border bg-hive-panel p-3">
              <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-hive-muted">
                Workforce
              </h3>
              <ul className="space-y-1">
                {AGENTS.map((agent) => (
                  <li key={agent.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-hive-panel2"
                      onClick={() => {
                        document
                          .getElementById(`panel-${agent.id}`)
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                      }}
                    >
                      <span>
                        <span className="block text-sm text-hive-text">
                          {agent.label}
                        </span>
                        <span className="block text-[11px] text-hive-muted">
                          {agent.role}
                        </span>
                      </span>
                      <StatusDot status={statuses[agent.id]} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="hidden rounded-xl border border-hive-border bg-hive-panel p-3 lg:block">
              <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-hive-muted">
                Memory
              </h3>
              <MemoryList
                memory={memory}
                activeId={missionId}
                onSelect={restoreMission}
                disabled={running}
              />
            </div>
          </aside>

          {/* Center — agent panels */}
          <main className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div id="panel-ceo">
              <Panel
                title="CEO"
                subtitle={ceoBrief ? "Executive brief" : "Delegation"}
                status={statuses.ceo}
              >
                <AgentText>{ceoPanelBody}</AgentText>
              </Panel>
            </div>

            <div id="panel-research">
              <Panel
                title="Research"
                subtitle="Coasty computer-use"
                status={statuses.research}
              >
                <AgentText>
                  {research?.findings ||
                    (statuses.research === "running"
                      ? "Browsing primary sources…"
                      : "")}
                </AgentText>
                {research?.screenshots?.length ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {research.screenshots.map((shot, i) => {
                      const src = shotSrc(shot);
                      if (!src) return null;
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={shot.id || i}
                          src={src}
                          alt={`Research screenshot ${i + 1}`}
                          className="h-28 w-full rounded-md border border-hive-border object-cover"
                        />
                      );
                    })}
                  </div>
                ) : null}
              </Panel>
            </div>

            <div id="panel-marketing">
              <Panel
                title="Marketing"
                subtitle="Launch copy"
                status={statuses.marketing}
              >
                <AgentText>
                  {marketing ||
                    (statuses.marketing === "running"
                      ? "Drafting from Research findings…"
                      : "")}
                </AgentText>
              </Panel>
            </div>

            <div id="panel-engineering">
              <Panel
                title="Engineering"
                subtitle="Build plan"
                status={statuses.engineering}
              >
                <AgentText>
                  {engineering ||
                    (statuses.engineering === "running"
                      ? "Drafting technical plan…"
                      : "")}
                </AgentText>
              </Panel>
            </div>

            <div id="panel-qa">
              <Panel title="QA" subtitle="Test plan" status={statuses.qa}>
                <AgentText>
                  {qa ||
                    (statuses.qa === "running"
                      ? "Writing pass/fail checks…"
                      : "")}
                </AgentText>
              </Panel>
            </div>

            <div id="panel-finance">
              <Panel
                title="Finance"
                subtitle="Unit economics"
                status={statuses.finance}
              >
                <AgentText>
                  {finance ||
                    (statuses.finance === "running"
                      ? "Modeling pricing…"
                      : "")}
                </AgentText>
              </Panel>
            </div>
          </main>

          {/* Right — collapsible activity feed */}
          <aside className="flex flex-col rounded-xl border border-hive-border bg-hive-panel lg:min-h-[420px]">
            <button
              type="button"
              className="flex w-full items-center justify-between border-b border-hive-border px-4 py-3 text-left hover:bg-hive-panel2/60"
              onClick={() => setActivityOpen((o) => !o)}
              aria-expanded={activityOpen}
            >
              <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-hive-muted">
                Activity
                {feed.length > 0 ? (
                  <span className="ml-2 text-hive-text/70">{feed.length}</span>
                ) : null}
              </h3>
              <span
                className="font-mono text-sm text-hive-muted"
                aria-hidden
              >
                {activityOpen ? "▲" : "▼"}
              </span>
            </button>
            {activityOpen ? (
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {feed.map((item) => (
                  <div key={item.id} className="text-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-hive-accent2">
                        {item.agent}
                      </span>
                      <span className="font-mono text-[10px] text-hive-muted">
                        {new Date(item.ts).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-hive-text/85">{item.text}</p>
                  </div>
                ))}
                <div ref={feedEndRef} />
              </div>
            ) : null}
          </aside>
        </div>

        <footer className="border-t border-hive-border pt-3 text-center font-mono text-[11px] text-hive-muted">
          HiveOS · Built with Coasty & OpenAI
        </footer>
      </div>
    </div>
  );
}
