const DEFAULT_BASE = "https://coasty.ai/v1";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000;

function getConfig() {
  const apiKey = process.env.COASTY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "COASTY_API_KEY is missing. Copy .env.local.example to .env.local and add a sk-coasty-test- key."
    );
  }
  if (apiKey.startsWith("Bearer ")) {
    throw new Error(
      'COASTY_API_KEY must be the raw key (sk-coasty-...). Do not include "Bearer " — that is an auth error for X-API-Key.'
    );
  }
  return {
    apiKey,
    baseUrl: (process.env.COASTY_BASE_URL || DEFAULT_BASE).replace(/\/$/, ""),
  };
}

async function coastyFetch(path, options = {}) {
  const { apiKey, baseUrl } = getConfig();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = {
    "X-API-Key": apiKey,
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[coasty] network error", { url, message });
    throw new Error(`Coasty network error: ${message}`);
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    console.error("[coasty] non-2xx", {
      url,
      status: res.status,
      body: data,
    });
    const detail =
      data?.error?.message ||
      data?.message ||
      (typeof data === "object" ? JSON.stringify(data) : text);
    throw new Error(`Coasty API ${res.status}: ${detail}`);
  }

  return data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractRunId(payload) {
  if (!payload || typeof payload !== "object") return null;
  return (
    payload.id ||
    payload.run_id ||
    payload.runId ||
    payload.data?.id ||
    payload.run?.id ||
    null
  );
}

function extractStatus(payload) {
  if (!payload || typeof payload !== "object") return "unknown";
  return (
    payload.status ||
    payload.state ||
    payload.run?.status ||
    payload.data?.status ||
    "unknown"
  );
}

const TERMINAL_OK = new Set([
  "succeeded",
  "success",
  "completed",
  "complete",
  "done",
  "finished",
]);

const TERMINAL_FAIL = new Set([
  "failed",
  "failure",
  "error",
  "cancelled",
  "canceled",
  "timed_out",
  "timeout",
]);

function isTerminal(status) {
  const s = String(status || "").toLowerCase();
  return TERMINAL_OK.has(s) || TERMINAL_FAIL.has(s);
}

function isSuccess(status) {
  return TERMINAL_OK.has(String(status || "").toLowerCase());
}

function extractFindings(run) {
  if (!run || typeof run !== "object") {
    return "NO_VIABLE_FINDINGS — empty Coasty payload";
  }

  const candidates = [
    run.result?.summary,
    run.result?.verdict,
    run.result?.output,
    run.result?.text,
    typeof run.result === "string" ? run.result : null,
    run.summary,
    run.output,
    run.text,
    run.message,
    run.data?.result?.summary,
    run.data?.summary,
  ].filter(Boolean);

  if (candidates.length) return String(candidates[0]).trim();

  try {
    return JSON.stringify(
      {
        status: extractStatus(run),
        result: run.result ?? null,
        error: run.error ?? null,
      },
      null,
      2
    );
  } catch {
    return "NO_VIABLE_FINDINGS — could not parse Coasty result";
  }
}

async function extractScreenshots(runId, run) {
  const inline = [];

  const pushShot = (shot, index = 0) => {
    if (!shot) return;
    if (typeof shot === "string") {
      inline.push({
        id: `inline-${index}`,
        image_b64: shot.replace(/^data:image\/\w+;base64,/, ""),
        mime_type: "image/png",
      });
      return;
    }
    if (typeof shot === "object") {
      const b64 =
        shot.image_b64 ||
        shot.imageB64 ||
        shot.b64 ||
        shot.data ||
        shot.screenshot;
      if (b64) {
        inline.push({
          id: shot.id || `inline-${index}`,
          image_b64: String(b64).replace(/^data:image\/\w+;base64,/, ""),
          mime_type: shot.mime_type || shot.mimeType || "image/png",
          width: shot.width,
          height: shot.height,
        });
      }
    }
  };

  const maybeArrays = [
    run?.screenshots,
    run?.result?.screenshots,
    run?.images,
    run?.frames,
  ];
  maybeArrays.forEach((arr) => {
    if (Array.isArray(arr)) arr.forEach(pushShot);
  });

  if (inline.length) return inline;

  try {
    const page = await coastyFetch(
      `/runs/${encodeURIComponent(runId)}/screenshots?include_image=true`
    );
    const frames = page?.data || page?.screenshots || page?.frames || [];
    if (Array.isArray(frames)) {
      frames.forEach(pushShot);
    }
  } catch (err) {
    console.warn(
      "[coasty] screenshot fetch skipped:",
      err instanceof Error ? err.message : err
    );
  }

  return inline.slice(0, 4);
}

export async function runCoastyTask(goal, hooks = {}) {
  const MAX_TASK_CHARS = 16000;
  const taskText =
    goal.length > MAX_TASK_CHARS
      ? `${goal.slice(0, MAX_TASK_CHARS - 24)}\n…[truncated for Coasty]`
      : goal;

  const submitBody = {
    task: taskText,
    max_steps: 40,
    deadline_seconds: 110,
    metadata: {
      agent: "hiveos-research",
      product: "HiveOS",
    },
  };

  console.log("[coasty] submitting task…");
  const created = await coastyFetch("/tasks", {
    method: "POST",
    headers: {
      "Idempotency-Key": `hiveos-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    },
    body: submitBody,
  });

  console.log("[coasty] create response:", {
    id: extractRunId(created),
    status: extractStatus(created),
  });

  let runId = extractRunId(created);
  let status = extractStatus(created);
  hooks.onStatus?.({ status, runId, raw: created });

  if (!runId) {
    if (isTerminal(status)) {
      const findings = extractFindings(created);
      const screenshots = await extractScreenshots("inline", created);
      return {
        findings,
        screenshots,
        runId: "inline",
        status,
        raw: created,
      };
    }
    throw new Error(
      "Coasty create response did not include a run id. See server logs for the full payload."
    );
  }

  const started = Date.now();
  let latest = created;

  while (!isTerminal(status)) {
    if (Date.now() - started > POLL_TIMEOUT_MS) {
      throw new Error(
        `Coasty research timed out after ${POLL_TIMEOUT_MS / 1000}s (last status: ${status}).`
      );
    }

    await sleep(POLL_INTERVAL_MS);
    latest = await coastyFetch(`/runs/${encodeURIComponent(runId)}`);
    status = extractStatus(latest);
    hooks.onStatus?.({ status, runId, raw: latest });
    console.log("[coasty] poll", { runId, status });
  }

  console.log("[coasty] final status:", { runId, status });

  if (!isSuccess(status)) {
    const errMsg =
      latest?.error?.message ||
      latest?.result?.summary ||
      `Research run ended with status "${status}"`;
    throw new Error(errMsg);
  }

  const findings = extractFindings(latest);
  const screenshots = await extractScreenshots(runId, latest);

  return {
    findings,
    screenshots,
    runId,
    status,
    raw: latest,
  };
}
