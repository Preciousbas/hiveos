export function feedEvent(stage, payload = {}) {
  const ts = new Date().toISOString();
  const map = {
    mission_started: {
      agent: "System",
      text: `Mission launched: “${payload.goal || "—"}”`,
    },
    ceo_delegate: {
      agent: "CEO",
      text: "Broke the goal into Research, Marketing, Engineering, QA, and Finance briefs.",
    },
    research_started: {
      agent: "Research",
      text: "Opening a real browser session via Coasty…",
    },
    research_status: {
      agent: "Research",
      text: `Computer-use status: ${payload.status || "running"}`,
    },
    research_done: {
      agent: "Research",
      text: "Findings ready. Handing off to the rest of the workforce.",
    },
    specialists_started: {
      agent: "System",
      text: "Marketing, Engineering, QA, and Finance are working in parallel.",
    },
    marketing_done: {
      agent: "Marketing",
      text: "Launch copy drafted from Research findings.",
    },
    engineering_done: {
      agent: "Engineering",
      text: "Technical plan and first-PR brief ready.",
    },
    qa_done: {
      agent: "QA",
      text: "Test plan and risk notes filed.",
    },
    finance_done: {
      agent: "Finance",
      text: "Pricing sketch and kill-criteria ready.",
    },
    ceo_synthesize: {
      agent: "CEO",
      text: "Synthesizing the executive brief across all departments.",
    },
    mission_complete: {
      agent: "CEO",
      text: "Mission complete. Workforce standing by.",
    },
    mission_error: {
      agent: "System",
      text: payload.message || "Mission failed.",
    },
  };

  const base = map[stage] || {
    agent: "System",
    text: stage,
  };

  return {
    id: `${stage}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    stage,
    ts,
    agent: base.agent,
    text: base.text,
  };
}
