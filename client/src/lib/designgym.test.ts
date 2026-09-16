import { describe, expect, it } from "vitest";
import {
  aggregateWeaknesses,
  createAttempt,
  DEMO_CONTENT,
  DeterministicRubricEvaluator,
  DiagramSubmission,
  EvaluationEngine,
  getProblem,
  InvalidStateTransitionError,
  MalformedSubmissionError,
  parseRubricEvaluation,
  StructuredWrittenSubmission,
  transitionAttempt,
  validateSubmission,
  type Evaluator,
} from "./designgym";

const problem = getProblem("parking-lot");

describe("Attempt state machine", () => {
  it("allows Draft → Submitted → Evaluating → Completed", () => {
    const draft = createAttempt("parking-lot");
    const submitted = transitionAttempt(draft, "Submitted");
    const evaluating = transitionAttempt(submitted, "Evaluating");
    const completed = transitionAttempt(evaluating, "Completed");
    expect(completed.status).toBe("Completed");
  });

  it("rejects illegal jumps with a typed error", () => {
    expect(() => transitionAttempt(createAttempt("parking-lot"), "Completed")).toThrow(InvalidStateTransitionError);
    expect(() => transitionAttempt(createAttempt("parking-lot"), "Completed")).toThrow("Draft → Completed");
  });

  it("does not allow terminal attempts to move again", () => {
    const submitted = transitionAttempt(createAttempt("parking-lot"), "Submitted");
    const completed = transitionAttempt(transitionAttempt(submitted, "Evaluating"), "Completed");
    expect(() => transitionAttempt(completed, "Draft")).toThrow(InvalidStateTransitionError);
  });
});

describe("Submission validation and strategies", () => {
  it("identifies missing or overly short sections", () => {
    expect(validateSubmission({ ...DEMO_CONTENT, edgeCases: "", tradeoffs: "too short" })).toEqual(["Edge cases", "Trade-offs"]);
  });

  it("rejects empty and malformed payloads", () => {
    expect(validateSubmission({ ...DEMO_CONTENT, classes: "" })).toContain("Classes & interfaces");
    expect(() => validateSubmission(null)).toThrow(MalformedSubmissionError);
    expect(() => validateSubmission({ ...DEMO_CONTENT, classes: 42 } as never)).toThrow("classes");
  });

  it("keeps deterministic findings separate from rubric feedback", () => {
    const evaluation = new DeterministicRubricEvaluator().evaluate(problem, DEMO_CONTENT);
    expect(evaluation.deterministic).toHaveLength(4);
    expect(evaluation.feedback).toHaveLength(7);
    expect(evaluation.feedback[0].evidence.length).toBeGreaterThan(10);
  });

  it("supports adding DiagramSubmission without changing Attempt", () => {
    const text = new StructuredWrittenSubmission(DEMO_CONTENT);
    const diagram = new DiagramSubmission(DEMO_CONTENT, "https://example.test/parking.svg");
    expect(text.format).toBe("structured-written");
    expect(diagram.format).toBe("diagram");
    expect(diagram.diagramUrl).toContain("parking.svg");
  });

  it("supports replacing the evaluator through the strategy interface", () => {
    const fixtureEvaluator: Evaluator = { evaluate: () => ({ overall: 100, signal: "Fixture", summary: "Fixture result", feedback: [], deterministic: [], nextFocus: [], completedAt: "now" }) };
    expect(fixtureEvaluator.evaluate(problem, DEMO_CONTENT)).toMatchObject({ signal: "Fixture" });
  });
});

describe("EvaluationEngine resilience", () => {
  it("falls back to deterministic feedback when the primary evaluator times out or fails", async () => {
    const failing: Evaluator = { evaluate: async () => { throw new Error("LLM timeout"); } };
    const result = await new EvaluationEngine(failing).evaluateAttempt(transitionAttempt(createAttempt("parking-lot", DEMO_CONTENT), "Submitted"), problem);
    expect(result.status).toBe("Completed");
    expect(result.evaluation?.source).toBe("deterministic-fallback");
    expect(result.evaluation?.failureDetails).toBe("LLM timeout");
    expect(result.evaluation?.feedback.length).toBe(7);
  });

  it("marks evaluation Failed if both primary and fallback evaluators fail", async () => {
    const failing: Evaluator = { evaluate: () => { throw new Error("service down"); } };
    const result = await new EvaluationEngine(failing, failing).evaluateAttempt(transitionAttempt(createAttempt("parking-lot"), "Submitted"), problem);
    expect(result.status).toBe("Failed");
  });
});

describe("Structured rubric JSON", () => {
  it("parses and normalizes rubric scoring output", () => {
    const feedback = parseRubricEvaluation(JSON.stringify({ feedback: [{ criterion: "Responsibility quality", score: 84.6, evidence: "ParkingLot coordinates entry.", concern: "May become a god object.", suggestion: "Move allocation behind a policy." }] }));
    expect(feedback[0]).toMatchObject({ criterion: "Responsibility quality", score: 85, signal: "Strong", confidence: "High" });
  });

  it("rejects invalid rubric JSON and missing required fields", () => {
    expect(() => parseRubricEvaluation("not-json")).toThrow(MalformedSubmissionError);
    expect(() => parseRubricEvaluation({ feedback: [{ criterion: "Only one field" }] })).toThrow("required fields");
  });
});

describe("Improvement loop", () => {
  it("aggregates repeated weak criteria across attempts", () => {
    const evaluator = new DeterministicRubricEvaluator();
    const first = { ...createAttempt("parking-lot", DEMO_CONTENT), status: "Completed" as const, evaluation: evaluator.evaluate(problem, DEMO_CONTENT) };
    const second = { ...createAttempt("vending-machine", DEMO_CONTENT), status: "Completed" as const, evaluation: evaluator.evaluate(getProblem("vending-machine"), { ...DEMO_CONTENT, tradeoffs: "short" }) };
    const weaknesses = aggregateWeaknesses([first, second]);
    expect(weaknesses.length).toBeGreaterThan(0);
    expect(weaknesses[0].count).toBeGreaterThanOrEqual(1);
  });
});
