import { NextResponse } from "next/server";
import {
  ceoDelegate,
  runResearch,
  runMarketing,
  runEngineering,
  runQA,
  runFinance,
  ceoSynthesize,
} from "@/lib/agents";
import { appendMission } from "@/lib/memory";
import { feedEvent } from "@/lib/feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const goal = typeof body?.goal === "string" ? body.goal.trim() : "";
  if (!goal || goal.length < 4) {
    return NextResponse.json(
      { error: "Provide a mission goal (at least a few words)." },
      { status: 400 }
    );
  }
  if (goal.length > 4000) {
    return NextResponse.json(
      { error: "Mission goal is too long (max 4000 characters)." },
      { status: 400 }
    );
  }

  const missingEnv = [];
  if (!process.env.OPENAI_API_KEY) missingEnv.push("OPENAI_API_KEY");
  if (!process.env.COASTY_API_KEY) missingEnv.push("COASTY_API_KEY");

  if (missingEnv.length) {
    return NextResponse.json(
      {
        error: `Missing required environment variable(s): ${missingEnv.join(
          ", "
        )}. Copy .env.local.example to .env.local and add your keys.`,
      },
      { status: 503 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      const emitFeed = (stage, payload) => {
        send({ type: "feed", item: feedEvent(stage, payload) });
      };

      const missionId = `msn_${Date.now()}`;

      try {
        send({ type: "mission", missionId, goal });
        emitFeed("mission_started", { goal });

        send({ type: "agent_status", agent: "ceo", status: "running" });
        const briefs = await ceoDelegate(goal);
        send({
          type: "stage",
          stage: "ceo_delegate",
          agent: "ceo",
          status: "done",
          data: briefs,
        });
        emitFeed("ceo_delegate");

        send({ type: "agent_status", agent: "research", status: "running" });
        emitFeed("research_started");

        const research = await runResearch(briefs.research_brief, {
          onStatus: ({ status }) => {
            emitFeed("research_status", { status });
            send({
              type: "agent_status",
              agent: "research",
              status: "running",
              detail: status,
            });
          },
        });

        send({
          type: "stage",
          stage: "research",
          agent: "research",
          status: "done",
          data: {
            findings: research.findings,
            screenshots: research.screenshots,
            runId: research.runId,
            coastyStatus: research.status,
          },
        });
        emitFeed("research_done");

        send({ type: "agent_status", agent: "marketing", status: "running" });
        send({ type: "agent_status", agent: "engineering", status: "running" });
        emitFeed("specialists_started");

        const [marketingOutput, engineeringOutput] = await Promise.all([
          runMarketing(briefs.marketing_brief, research.findings),
          runEngineering(briefs.engineering_brief, research.findings),
        ]);

        send({
          type: "stage",
          stage: "marketing",
          agent: "marketing",
          status: "done",
          data: { output: marketingOutput },
        });
        emitFeed("marketing_done");

        send({
          type: "stage",
          stage: "engineering",
          agent: "engineering",
          status: "done",
          data: { output: engineeringOutput },
        });
        emitFeed("engineering_done");

        send({ type: "agent_status", agent: "qa", status: "running" });
        send({ type: "agent_status", agent: "finance", status: "running" });

        const [qaOutput, financeOutput] = await Promise.all([
          runQA(
            briefs.qa_brief,
            research.findings,
            marketingOutput,
            engineeringOutput
          ),
          runFinance(
            briefs.finance_brief,
            research.findings,
            engineeringOutput
          ),
        ]);

        send({
          type: "stage",
          stage: "qa",
          agent: "qa",
          status: "done",
          data: { output: qaOutput },
        });
        emitFeed("qa_done");

        send({
          type: "stage",
          stage: "finance",
          agent: "finance",
          status: "done",
          data: { output: financeOutput },
        });
        emitFeed("finance_done");

        send({ type: "agent_status", agent: "ceo", status: "running" });
        emitFeed("ceo_synthesize");
        const finalBrief = await ceoSynthesize({
          researchFindings: research.findings,
          marketingOutput,
          engineeringOutput,
          qaOutput,
          financeOutput,
        });

        send({
          type: "stage",
          stage: "ceo_synthesize",
          agent: "ceo",
          status: "done",
          data: { brief: finalBrief },
        });

        const saved = await appendMission({
          id: missionId,
          goal,
          briefs,
          research: {
            findings: research.findings,
            runId: research.runId,
            screenshotCount: research.screenshots?.length || 0,
          },
          marketing: marketingOutput,
          engineering: engineeringOutput,
          qa: qaOutput,
          finance: financeOutput,
          ceoBrief: finalBrief,
        });

        emitFeed("mission_complete");
        send({
          type: "complete",
          missionId: saved.id,
          result: {
            briefs,
            research: {
              findings: research.findings,
              screenshotCount: research.screenshots?.length || 0,
              runId: research.runId,
            },
            marketing: marketingOutput,
            engineering: engineeringOutput,
            qa: qaOutput,
            finance: financeOutput,
            ceoBrief: finalBrief,
          },
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown mission failure";
        console.error("[hiveos] mission error:", err);
        emitFeed("mission_error", { message });
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
