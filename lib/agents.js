import { chatCompletion, parseJsonLoose } from "./openai.js";
import { runCoastyTask } from "./coasty.js";
import {
  CEO_PROMPT,
  RESEARCH_GOAL,
  MARKETING_PROMPT,
  ENGINEERING_PROMPT,
  QA_PROMPT,
  FINANCE_PROMPT,
  fillPrompt,
} from "./prompts.js";

export async function ceoDelegate(userGoal) {
  const prompt = fillPrompt(CEO_PROMPT, {
    mode: "delegate",
    user_goal: userGoal,
    research_findings: "",
    marketing_output: "",
    engineering_output: "",
    qa_output: "",
    finance_output: "",
  });

  const raw = await chatCompletion({
    system: prompt,
    user: `Delegate this mission: ${userGoal}`,
    temperature: 0.3,
    json: true,
  });

  const parsed = parseJsonLoose(raw);

  const required = [
    "research_brief",
    "marketing_brief",
    "engineering_brief",
    "qa_brief",
    "finance_brief",
  ];
  for (const key of required) {
    if (!parsed[key] || typeof parsed[key] !== "string") {
      throw new Error(`CEO delegate missing "${key}" in JSON response.`);
    }
  }

  return {
    research_brief: parsed.research_brief.trim(),
    marketing_brief: parsed.marketing_brief.trim(),
    engineering_brief: parsed.engineering_brief.trim(),
    qa_brief: parsed.qa_brief.trim(),
    finance_brief: parsed.finance_brief.trim(),
  };
}

export async function runResearch(researchBrief, hooks = {}) {
  const goal = fillPrompt(RESEARCH_GOAL, {
    research_brief_from_ceo: researchBrief,
  });
  return runCoastyTask(goal, hooks);
}

export async function runMarketing(marketingBrief, researchFindings) {
  const prompt = fillPrompt(MARKETING_PROMPT, {
    marketing_brief_from_ceo: marketingBrief,
    research_findings: researchFindings,
  });
  return chatCompletion({
    system: "You are HiveOS Marketing. Follow the task instructions exactly.",
    user: prompt,
    temperature: 0.5,
  });
}

export async function runEngineering(engineeringBrief, researchFindings) {
  const prompt = fillPrompt(ENGINEERING_PROMPT, {
    engineering_brief_from_ceo: engineeringBrief,
    research_findings: researchFindings,
  });
  return chatCompletion({
    system: "You are HiveOS Engineering. Be concrete and executable.",
    user: prompt,
    temperature: 0.35,
  });
}

export async function runQA(
  qaBrief,
  researchFindings,
  marketingOutput,
  engineeringOutput
) {
  const prompt = fillPrompt(QA_PROMPT, {
    qa_brief_from_ceo: qaBrief,
    research_findings: researchFindings,
    marketing_output: marketingOutput,
    engineering_output: engineeringOutput,
  });
  return chatCompletion({
    system: "You are HiveOS QA. Prefer specific pass/fail checks.",
    user: prompt,
    temperature: 0.3,
  });
}

export async function runFinance(
  financeBrief,
  researchFindings,
  engineeringOutput
) {
  const prompt = fillPrompt(FINANCE_PROMPT, {
    finance_brief_from_ceo: financeBrief,
    research_findings: researchFindings,
    engineering_output: engineeringOutput,
  });
  return chatCompletion({
    system: "You are HiveOS Finance. Use numbers and state assumptions.",
    user: prompt,
    temperature: 0.3,
  });
}

export async function ceoSynthesize({
  researchFindings,
  marketingOutput,
  engineeringOutput,
  qaOutput,
  financeOutput,
}) {
  const prompt = fillPrompt(CEO_PROMPT, {
    mode: "synthesize",
    user_goal: "",
    research_findings: researchFindings,
    marketing_output: marketingOutput,
    engineering_output: engineeringOutput,
    qa_output: qaOutput,
    finance_output: financeOutput,
  });

  return chatCompletion({
    system: prompt,
    user: "Synthesize the executive brief now.",
    temperature: 0.4,
  });
}
