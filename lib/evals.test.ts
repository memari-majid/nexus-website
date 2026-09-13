import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { nexusChatSystem } from "@/lib/assistant";
import {
  EVAL_JUDGE_ALT_MODEL_ID,
  EVAL_JUDGE_MODEL_ID,
  EVAL_CONTESTANT_TIMEOUT_MS,
  EVAL_JUDGE_TIMEOUT_MS,
  EVAL_MAX_DURATION_SECONDS,
  EVAL_RUNS_PER_IP_PER_DAY,
  GLOBAL_EVAL_USD_PER_DAY,
  GLOBAL_SOFT_DAILY_USD,
  evalPrechargeUsd,
} from "@/lib/chat-limits";
import { CHAT_MODELS, DEFAULT_MODEL_ID, defaultModel, findModel } from "@/lib/chat-models";
import {
  EVAL_RUBRIC,
  LIVE_EVAL_TURN,
  MAX_RUBRIC_SCORE,
  PUBLISHED_EVALS,
  challengerFor,
  clampJudgeScore,
  clampRubricScores,
  evalFrameLine,
  hasPublishedScores,
  judgeFor,
  parseEvalFrame,
  publishedEvalsSchema,
  rowLabel,
  rubricAverage,
  rubricPrompt,
} from "@/lib/evals";
import { hasDash } from "@/lib/plain-punctuation";

describe("the published artifact", () => {
  it("parses against the schema it is rendered with", () => {
    expect(publishedEvalsSchema.safeParse(PUBLISHED_EVALS).success).toBe(true);
  });

  it("carries provenance rather than a plausible story", () => {
    expect(PUBLISHED_EVALS.gitSha.length).toBeGreaterThanOrEqual(7);
    expect(PUBLISHED_EVALS.measuredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // A hash is either a real one or null. It is never invented after the fact.
    expect(
      PUBLISHED_EVALS.promptHash === null || PUBLISHED_EVALS.promptHash.length >= 16,
    ).toBe(true);
  });

  it("publishes no score that no judge measured", () => {
    for (const row of PUBLISHED_EVALS.rows) {
      if (row.rubricScores === null) continue;
      for (const key of Object.values(row.rubricScores)) {
        expect(key).toBeGreaterThanOrEqual(1);
        expect(key).toBeLessThanOrEqual(MAX_RUBRIC_SCORE);
      }
    }
    // Scored or unscored, `hasPublishedScores` reports what is in the file,
    // which is what decides whether the panel renders a Score column at all.
    expect(hasPublishedScores()).toBe(
      PUBLISHED_EVALS.rows.some((r) => r.rubricScores !== null),
    );
  });

  it("measured the prompt this site ships, or says it has no hash at all", () => {
    // The credibility of the whole table rests on this: a non-null hash that
    // no longer matches the rendered prompt means the published numbers
    // describe a prompt production does not send. Fix it by rerunning
    // `npx tsx evals/bakeoff.ts --json <models>` and then `evals/judge.ts`,
    // never by editing the artifact.
    if (PUBLISHED_EVALS.promptHash === null) {
      // Only the pre-writer run may do this, and it has to admit it in a note.
      expect(PUBLISHED_EVALS.notes.some((n) => n.includes("promptHash"))).toBe(true);
      return;
    }
    // Email is unconfigured in production, so this is the rendered prompt.
    const shipped = nexusChatSystem({ emailEnabled: false });
    expect(PUBLISHED_EVALS.promptHash).toBe(
      createHash("sha256").update(shipped).digest("hex"),
    );
    expect(PUBLISHED_EVALS.shape.promptCall).toBe("nexusChatSystem({ emailEnabled: false })");
  });

  it("parses a regenerated, fully scored artifact the same way as today's", () => {
    // What `bakeoff.ts --json` followed by `judge.ts` writes: a real prompt
    // hash, real rubric scores, an empty `unscored` list when the run covered
    // every picker model, and no transcripts (those go to their own file, which
    // nothing on the site imports). The page must not need a code change to
    // render it.
    const regenerated = {
      ...PUBLISHED_EVALS,
      promptHash: "a".repeat(64),
      shape: { ...PUBLISHED_EVALS.shape, promptCall: "nexusChatSystem({ emailEnabled: false })" },
      rows: PUBLISHED_EVALS.rows.map((row) => ({
        ...row,
        approximate: false,
        rubricScores: { consults: 5, specific: 4, human: 4.5, grounded: 5, forward: 4 },
      })),
      unscored: [],
    };
    const parsed = publishedEvalsSchema.safeParse(regenerated);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(hasPublishedScores(parsed.data)).toBe(true);
    expect(rubricAverage(parsed.data.rows[0].rubricScores)).toBe(4.5);
  });

  it("names every unscored picker model instead of quietly omitting it", () => {
    const covered = new Set([
      ...PUBLISHED_EVALS.rows.map((r) => r.modelId),
      ...PUBLISHED_EVALS.unscored.map((u) => u.modelId),
    ]);
    for (const model of CHAT_MODELS) expect([...covered], model.id).toContain(model.id);
  });

  it("ships no row still carrying the unread placeholder", () => {
    // `evals/bakeoff.ts` writes "Not read yet..." into `read` for any model it
    // has no previous human read for, and the panel renders `read` verbatim.
    // Without this, a newly added model ships that sentence to visitors and
    // nothing fails. The orchestrator fills the line in by hand after a
    // regeneration, before the artifact is committed.
    for (const row of PUBLISHED_EVALS.rows) {
      expect(row.read.trim().startsWith("Not read yet"), row.modelId).toBe(false);
    }
  });

  it("ships no em or en dash in anything a visitor reads", () => {
    const text = [
      PUBLISHED_EVALS.shape.scenario,
      PUBLISHED_EVALS.shape.promptCall,
      ...PUBLISHED_EVALS.rows.map((r) => r.read),
      ...PUBLISHED_EVALS.unscored.map((u) => u.why),
      ...PUBLISHED_EVALS.notes,
    ].join(" ");
    expect(hasDash(text)).toBe(false);
  });

  it("prefers today's picker label when a model was renamed", () => {
    const row = PUBLISHED_EVALS.rows.find((r) => r.modelId === DEFAULT_MODEL_ID);
    expect(row && rowLabel(row)).toBe(findModel(DEFAULT_MODEL_ID)?.label);
    // A model no longer in the picker keeps the label it was measured under.
    const gone = { ...PUBLISHED_EVALS.rows[0], modelId: "vendor/retired", label: "Retired" };
    expect(rowLabel(gone)).toBe("Retired");
  });
});

describe("rubricAverage", () => {
  it("is null for an unscored row and a one-decimal mean otherwise", () => {
    expect(rubricAverage(null)).toBeNull();
    expect(
      rubricAverage({ consults: 5, specific: 4, human: 4, grounded: 5, forward: 3 }),
    ).toBe(4.2);
  });
});

describe("judgeFor", () => {
  it("uses the cheapest seat when it is not in the run", () => {
    const opus = findModel(DEFAULT_MODEL_ID)!;
    const sonnet = findModel("anthropic/claude-sonnet-5")!;
    expect(judgeFor([opus, sonnet]).id).toBe(EVAL_JUDGE_MODEL_ID);
  });

  it("swaps when the visitor picks the judge as the challenger, so no model judges itself", () => {
    const opus = findModel(DEFAULT_MODEL_ID)!;
    const gemini = findModel(EVAL_JUDGE_MODEL_ID)!;
    expect(judgeFor([opus, gemini]).id).toBe(EVAL_JUDGE_ALT_MODEL_ID);
  });

  it("never returns a contestant, whichever two are picked", () => {
    for (const a of CHAT_MODELS) {
      for (const b of CHAT_MODELS) {
        if (a.id === b.id) continue;
        const judge = judgeFor([a, b]);
        expect([a.id, b.id], `${a.id} vs ${b.id}`).not.toContain(judge.id);
      }
    }
  });
});

describe("challengerFor", () => {
  it("takes the visitor's pick when it is a real, priced model", () => {
    expect(challengerFor("google/gemini-3.8-flash", defaultModel()).id).toBe(
      "google/gemini-3.8-flash",
    );
  });

  it("never lets the incumbent face itself", () => {
    const incumbent = defaultModel();
    expect(challengerFor(incumbent.id, incumbent).id).not.toBe(incumbent.id);
  });

  it("falls back rather than routing to an unpriced model", () => {
    const picked = challengerFor("vendor/not-in-the-allowlist", defaultModel());
    expect(CHAT_MODELS.map((m) => m.id)).toContain(picked.id);
  });
});

describe("the run's cost fences", () => {
  it("caps a visitor at one counted run a day, well inside the day's budget", () => {
    // The cap is a counter in the limiter (`reserveEvalRun`), taken before a
    // model is called, so a run that fails or is abandoned still counts. The
    // run cache only decides how the refusal reads. What must stay true is
    // that one visitor cannot take the whole day's evaluation budget: at this
    // cap the day affords many more runs than one visitor may start.
    expect(EVAL_RUNS_PER_IP_PER_DAY).toBe(1);
    const opus = findModel(DEFAULT_MODEL_ID)!;
    const sonnet = findModel("anthropic/claude-sonnet-5")!;
    const perRun = evalPrechargeUsd([opus, sonnet], judgeFor([opus, sonnet]));
    const runsTheDayAffords = Math.floor(GLOBAL_EVAL_USD_PER_DAY / perRun);
    expect(runsTheDayAffords).toBeGreaterThan(EVAL_RUNS_PER_IP_PER_DAY * 4);
  });

  it("keeps the eval sub-budget inside the global soft budget", () => {
    expect(GLOBAL_EVAL_USD_PER_DAY).toBeLessThan(GLOBAL_SOFT_DAILY_USD);
  });

  it("keeps both legs well inside the function ceiling", () => {
    const legsMs = EVAL_CONTESTANT_TIMEOUT_MS + EVAL_JUDGE_TIMEOUT_MS;
    expect(legsMs).toBeLessThan(EVAL_MAX_DURATION_SECONDS * 1000);
    // Room for the reservation, the store calls, and the settle.
    expect(EVAL_MAX_DURATION_SECONDS * 1000 - legsMs).toBeGreaterThanOrEqual(30_000);
  });

  it("prices a whole run at a fraction of the day's eval budget", () => {
    const opus = findModel(DEFAULT_MODEL_ID)!;
    const sonnet = findModel("anthropic/claude-sonnet-5")!;
    const precharge = evalPrechargeUsd([opus, sonnet], judgeFor([opus, sonnet]));
    expect(precharge).toBeGreaterThan(0);
    expect(precharge).toBeLessThan(GLOBAL_EVAL_USD_PER_DAY / 4);
  });
});

describe("the NDJSON frames", () => {
  it("round-trips every frame the route can send", () => {
    const reply = {
      modelId: "anthropic/claude-opus-5",
      label: "Claude Opus 5",
      text: "Start with retrieval.",
      totalMs: 4210,
      tokens: { input: 5200, output: 380, total: 5580 },
      costUsd: 0.0355,
    };
    const frames = [
      {
        type: "start" as const,
        contestants: [{ modelId: "a", label: "A" }],
        judge: { modelId: "j", label: "J" },
        shape: { turns: 1, maxOutputTokens: 600, scenario: LIVE_EVAL_TURN },
        cached: false,
      },
      { type: "reply" as const, reply },
      {
        type: "verdict" as const,
        verdict: {
          judgeModelId: "j",
          judgeLabel: "J",
          scores: [
            {
              modelId: "a",
              scores: { consults: 5, specific: 4, human: 4, grounded: 5, forward: 4 },
            },
          ],
          winnerModelId: "a",
          rationale: "It named a first step.",
        },
      },
      { type: "done" as const, totalCostUsd: 0.04, totalMs: 9000 },
      { type: "error" as const, message: "Nothing was spent." },
    ];
    for (const frame of frames) {
      const line = evalFrameLine(frame);
      expect(line.endsWith("\n")).toBe(true);
      expect(parseEvalFrame(line)).toEqual(frame);
    }
  });

  it("ignores a partial, blank, or crafted line instead of throwing", () => {
    expect(parseEvalFrame("")).toBeNull();
    expect(parseEvalFrame('{"type":"repl')).toBeNull();
    expect(parseEvalFrame('{"type":"unknown"}')).toBeNull();
    expect(parseEvalFrame('{"type":"done"}')).toBeNull();
    expect(parseEvalFrame("null")).toBeNull();
  });
});

describe("the judge's scoring", () => {
  it("shows the judge the same five rubric lines the table is read against", () => {
    const prompt = rubricPrompt();
    for (const line of EVAL_RUBRIC) expect(prompt).toContain(line.label);
    expect(hasDash(prompt)).toBe(false);
  });

  it("clamps anything a judge returns into the rubric's range", () => {
    expect(clampJudgeScore(9)).toBe(MAX_RUBRIC_SCORE);
    expect(clampJudgeScore(0)).toBe(1);
    expect(clampJudgeScore(-3)).toBe(1);
    expect(clampJudgeScore(4.44)).toBe(4.4);
    expect(clampJudgeScore("five")).toBe(1);
    expect(clampJudgeScore(undefined)).toBe(1);
    expect(clampJudgeScore(Number.NaN)).toBe(1);
  });

  it("fills every rubric key even when the judge skipped one", () => {
    expect(clampRubricScores({ consults: 5 })).toEqual({
      consults: 5,
      specific: 1,
      human: 1,
      grounded: 1,
      forward: 1,
    });
  });
});
