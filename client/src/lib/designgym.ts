export type AttemptStatus = "Draft" | "Submitted" | "Evaluating" | "Completed" | "Failed";
export type SubmissionFormat = "structured-written" | "diagram" | "code";

export class InvalidStateTransitionError extends Error {
  constructor(public readonly from: AttemptStatus, public readonly to: AttemptStatus) {
    super(`Invalid attempt transition: ${from} → ${to}`);
    this.name = "InvalidStateTransitionError";
  }
}

export class MalformedSubmissionError extends Error {
  constructor(message = "Submission payload is malformed") {
    super(message);
    this.name = "MalformedSubmissionError";
  }
}

export type SubmissionContent = {
  assumptions: string;
  classes: string;
  responsibilities: string;
  interactions: string;
  edgeCases: string;
  tradeoffs: string;
};

export interface Submission {
  readonly format: SubmissionFormat;
  readonly content: SubmissionContent;
}

export class StructuredWrittenSubmission implements Submission {
  readonly format = "structured-written" as const;
  constructor(readonly content: SubmissionContent) {}
}

export class DiagramSubmission implements Submission {
  readonly format = "diagram" as const;
  constructor(readonly content: SubmissionContent, readonly diagramUrl: string) {}
}

export type Problem = {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  difficulty: "Foundations" | "Intermediate" | "Stretch";
  time: string;
  concepts: string[];
  requirements: string[];
  nonFunctional: string[];
  accent: string;
};

export type FeedbackItem = {
  criterion: string;
  score: number;
  signal: "Strong" | "Developing" | "Needs attention";
  evidence: string;
  concern: string;
  suggestion: string;
  confidence: "High" | "Medium";
};

export type DeterministicFinding = {
  label: string;
  detail: string;
  passed: boolean;
};

export type Evaluation = {
  overall: number;
  signal: string;
  summary: string;
  feedback: FeedbackItem[];
  deterministic: DeterministicFinding[];
  nextFocus: string[];
  completedAt: string;
  source?: "primary" | "deterministic-fallback";
  failureDetails?: string;
};

export type Attempt = {
  id: string;
  problemId: string;
  status: AttemptStatus;
  createdAt: string;
  updatedAt: string;
  submission: SubmissionContent;
  format: SubmissionFormat;
  evaluation?: Evaluation;
};

export const RUBRIC = [
  "Requirement understanding",
  "Responsibility quality",
  "Encapsulation & interfaces",
  "Coupling & cohesion",
  "Extensibility & change handling",
  "Edge cases & testability",
  "Explanation & trade-offs",
];

export const PROBLEMS: Problem[] = [
  {
    id: "parking-lot",
    name: "Parking Lot",
    eyebrow: "Allocation systems",
    description: "Design a parking system that can allocate spots, price stays, and evolve with new vehicle types.",
    difficulty: "Foundations",
    time: "35 min",
    concepts: ["Strategy", "Allocation", "Pricing"],
    requirements: [
      "Support motorcycles, cars, and trucks with compatible spots.",
      "Allocate and release spots while reporting availability.",
      "Calculate a ticket price based on vehicle type and duration.",
      "Leave room for new pricing rules without changing the parking flow.",
    ],
    nonFunctional: ["Prefer clear ownership of allocation decisions.", "State consistency matters more than premature concurrency detail."],
    accent: "lime",
  },
  {
    id: "vending-machine",
    name: "Vending Machine",
    eyebrow: "Stateful behavior",
    description: "Model a machine that accepts money, dispenses products, returns change, and handles failure safely.",
    difficulty: "Intermediate",
    time: "30 min",
    concepts: ["State", "Inventory", "Commands"],
    requirements: [
      "Select an in-stock product and accept multiple denominations.",
      "Dispense only after sufficient payment and return change.",
      "Handle cancellation, sold-out products, and insufficient funds.",
      "Make inventory and payment behavior testable in isolation.",
    ],
    nonFunctional: ["Avoid leaking payment or inventory mutation across states.", "Explain how a new payment method fits."],
    accent: "amber",
  },
  {
    id: "elevator-system",
    name: "Elevator System",
    eyebrow: "Scheduling & control",
    description: "Design dispatching logic for multiple elevators while keeping scheduling policy replaceable.",
    difficulty: "Stretch",
    time: "45 min",
    concepts: ["Command", "Scheduling", "Events"],
    requirements: [
      "Accept hall calls and destination requests from passengers.",
      "Dispatch an appropriate elevator and track movement safely.",
      "Handle direction, capacity, doors, and emergency states.",
      "Allow scheduling policies to evolve without rewriting elevator state.",
    ],
    nonFunctional: ["Make policy decisions observable and unit-testable.", "Call out trade-offs between fairness and throughput."],
    accent: "sky",
  },
  {
    id: "library-management",
    name: "Library Management",
    eyebrow: "Relationships & rules",
    description: "Design lending and availability rules for a library with room for holds, fines, and new media types.",
    difficulty: "Intermediate",
    time: "35 min",
    concepts: ["Aggregates", "Rules", "Notifications"],
    requirements: [
      "Search and display available books and other media.",
      "Allow members to borrow and return items within policy.",
      "Track due dates, holds, and overdue fines.",
      "Support new media types and notification channels cleanly.",
    ],
    nonFunctional: ["Keep lending rules independent from notification delivery.", "Mention clock/time abstractions for tests."],
    accent: "coral",
  },
];

export const EMPTY_SUBMISSION: SubmissionContent = {
  assumptions: "",
  classes: "",
  responsibilities: "",
  interactions: "",
  edgeCases: "",
  tradeoffs: "",
};

export const DEMO_CONTENT: SubmissionContent = {
  assumptions: "A vehicle enters through an entry gate and receives a ticket. A parking lot has floors, each floor has spots, and a vehicle can only occupy one compatible spot. We optimize for one lot and consistent spot allocation.",
  classes: "ParkingLot\nParkingFloor\nParkingSpot (abstract)\nVehicle (abstract)\nTicket\nAllocationStrategy (interface)\nPricingStrategy (interface)",
  responsibilities: "ParkingLot coordinates entry and exit. ParkingFloor owns spots on its floor. ParkingSpot knows compatibility and occupancy. AllocationStrategy chooses a spot without mutating unrelated pricing rules. Ticket captures entry time, spot, and vehicle. PricingStrategy calculates a fee from ticket context.",
  interactions: "EntryGate asks ParkingLot for a spot through AllocationStrategy, then creates a Ticket. ExitGate closes the ticket and asks PricingStrategy for the fee before releasing the spot. The lot publishes availability after allocation and release.",
  edgeCases: "No compatible spot; duplicate exit for the same ticket; lost ticket; vehicle larger than remaining spots; pricing at a day boundary; two allocation requests observing the same spot.",
  tradeoffs: "I would start with in-memory repositories and an allocation strategy per floor. A composite strategy can later consider distance or EV charging. I keep payment outside the core domain so pricing can be tested without a gateway.",
};

export function createAttempt(problemId: string, content: SubmissionContent = EMPTY_SUBMISSION): Attempt {
  const now = new Date().toISOString();
  return {
    id: `attempt-${Date.now()}`,
    problemId,
    status: "Draft",
    createdAt: now,
    updatedAt: now,
    submission: { ...content },
    format: "structured-written",
  };
}

const allowedTransitions: Record<AttemptStatus, AttemptStatus[]> = {
  Draft: ["Submitted"],
  Submitted: ["Evaluating", "Failed"],
  Evaluating: ["Completed", "Failed"],
  Completed: [],
  Failed: [],
};

export function transitionAttempt(attempt: Attempt, next: AttemptStatus): Attempt {
  if (!allowedTransitions[attempt.status].includes(next)) {
    throw new InvalidStateTransitionError(attempt.status, next);
  }
  return { ...attempt, status: next, updatedAt: new Date().toISOString() };
}

export function validateSubmission(content: unknown): string[] {
  if (!content || typeof content !== "object") throw new MalformedSubmissionError("Submission must be an object");
  const labels: [keyof SubmissionContent, string][] = [
    ["assumptions", "Assumptions"],
    ["classes", "Classes & interfaces"],
    ["responsibilities", "Responsibilities"],
    ["interactions", "Interactions"],
    ["edgeCases", "Edge cases"],
    ["tradeoffs", "Trade-offs"],
  ];
  for (const [key] of labels) {
    if (typeof (content as Record<string, unknown>)[key] !== "string") throw new MalformedSubmissionError(`Submission field '${key}' must be a string`);
  }
  const typed = content as SubmissionContent;
  return labels.filter(([key]) => typed[key].trim().length < 24).map(([, label]) => label);
}

export interface EvaluatorStrategy {
  evaluate(problem: Problem, content: SubmissionContent): Evaluation | Promise<Evaluation>;
}

export type Evaluator = EvaluatorStrategy;

export function parseRubricEvaluation(raw: unknown): FeedbackItem[] {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try { parsed = JSON.parse(raw); } catch { throw new MalformedSubmissionError("Rubric output was not valid JSON"); }
  }
  const feedback = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" ? (parsed as { feedback?: unknown }).feedback : null;
  if (!Array.isArray(feedback)) throw new MalformedSubmissionError("Rubric JSON must contain a feedback array");
  return feedback.map((item, index) => {
    if (!item || typeof item !== "object") throw new MalformedSubmissionError(`Rubric item ${index + 1} is malformed`);
    const candidate = item as Record<string, unknown>;
    const required = ["criterion", "score", "evidence", "concern", "suggestion"];
    if (required.some((key) => typeof candidate[key] !== "string" && key !== "score") || typeof candidate.score !== "number") throw new MalformedSubmissionError(`Rubric item ${index + 1} is missing required fields`);
    const score = Math.max(0, Math.min(100, Math.round(candidate.score as number)));
    return { criterion: candidate.criterion as string, score, signal: score >= 80 ? "Strong" : score >= 65 ? "Developing" : "Needs attention", evidence: candidate.evidence as string, concern: candidate.concern as string, suggestion: candidate.suggestion as string, confidence: candidate.confidence === "Medium" ? "Medium" : "High" } as FeedbackItem;
  });
}

function snippet(text: string, fallback: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  return clean.length > 138 ? `${clean.slice(0, 138).trim()}…` : clean;
}

export class DeterministicRubricEvaluator implements Evaluator {
  evaluate(problem: Problem, content: SubmissionContent): Evaluation {
    const fullText = Object.values(content).join(" ").toLowerCase();
    const has = (...terms: string[]) => terms.some((term) => fullText.includes(term));
    const deterministic: DeterministicFinding[] = [
      { label: "All required sections present", detail: "Each section meets the minimum evidence threshold.", passed: validateSubmission(content).length === 0 },
      { label: "Named abstractions detected", detail: "At least one interface or abstract type is named.", passed: has("interface", "abstract", "strategy") },
      { label: "Edge cases are explicit", detail: "Failure paths are described instead of implied.", passed: content.edgeCases.trim().length >= 48 },
      { label: "No obvious duplicate class names", detail: "Class list contains no repeated exact names.", passed: new Set(content.classes.split(/[,\n]/).map((item) => item.trim().toLowerCase()).filter(Boolean)).size === content.classes.split(/[,\n]/).map((item) => item.trim().toLowerCase()).filter(Boolean).length },
    ];

    const signals = [
      { criterion: "Requirement understanding", score: has(...problem.requirements.slice(0, 2).map((item) => item.split(" ").slice(0, 2).join(" ").toLowerCase())) ? 88 : 68, evidence: snippet(content.assumptions, "No assumption evidence submitted."), concern: "The design needs more explicit boundaries around the scenario and its guarantees.", suggestion: "Name the primary actor, the system boundary, and one assumption that intentionally stays out of scope." },
      { criterion: "Responsibility quality", score: has("owns", "coordinates", "responsibil", "delegat") ? 84 : 61, evidence: snippet(content.responsibilities, "No responsibility evidence submitted."), concern: "Some behavior may be accumulating in an orchestration class.", suggestion: "For every important behavior, state the single object that owns the decision and why." },
      { criterion: "Encapsulation & interfaces", score: has("interface", "abstract", "port", "strategy") ? 86 : 58, evidence: snippet(content.classes, "No class or interface evidence submitted."), concern: "Variation points are not yet visible enough to protect the core flow.", suggestion: "Separate stable domain contracts from replaceable policies such as pricing, allocation, or notification." },
      { criterion: "Coupling & cohesion", score: has("outside", "separate", "repository", "depend") ? 79 : 63, evidence: snippet(content.interactions, "No interaction evidence submitted."), concern: "The interaction path could be clearer about who mutates state and who only decides.", suggestion: "Trace one happy path and mark each mutation boundary explicitly." },
      { criterion: "Extensibility & change handling", score: has("later", "new", "extend", "change", "strategy") ? 82 : 57, evidence: snippet(content.tradeoffs, "No extensibility evidence submitted."), concern: "The design hints at change but does not yet show a concrete seam.", suggestion: "Choose one likely change and show the new implementation you would add without editing the use case." },
      { criterion: "Edge cases & testability", score: content.edgeCases.trim().length >= 60 && has("test") ? 89 : content.edgeCases.trim().length >= 48 ? 77 : 52, evidence: snippet(content.edgeCases, "No edge-case evidence submitted."), concern: "Failure behavior and time-dependent behavior need more concrete test seams.", suggestion: "Pair each edge case with an expected outcome and name the dependency you would fake in a unit test." },
      { criterion: "Explanation & trade-offs", score: content.tradeoffs.trim().length >= 80 ? 85 : 62, evidence: snippet(content.tradeoffs, "No trade-off evidence submitted."), concern: "The reasoning is more valuable when it states what you deliberately did not optimize for.", suggestion: "Add one trade-off with a rejected alternative and the condition that would make you revisit it." },
    ].map((item) => ({ ...item, signal: item.score >= 80 ? "Strong" as const : item.score >= 65 ? "Developing" as const : "Needs attention" as const, confidence: "High" as const }));

    const overall = Math.round(signals.reduce((sum, item) => sum + item.score, 0) / signals.length);
    const weak = signals.filter((item) => item.score < 75).sort((a, b) => a.score - b.score).slice(0, 2);
    return {
      overall,
      signal: overall >= 80 ? "Strong foundation" : overall >= 68 ? "Promising, with clear next moves" : "Build the core reasoning first",
      summary: `${problem.name} design review completed with ${signals.filter((item) => item.score >= 80).length} strong rubric areas. The most useful signal is the evidence trail: every note below points back to a section in your submission.`,
      feedback: signals,
      deterministic,
      nextFocus: weak.length ? weak.map((item) => item.suggestion) : ["Stress-test the design with one new requirement.", "Write a second attempt that makes one policy replaceable."],
      completedAt: new Date().toISOString(),
    };
  }
}

export class EvaluationEngine {
  constructor(private readonly primary: EvaluatorStrategy, private readonly fallback: EvaluatorStrategy = new DeterministicRubricEvaluator()) {}

  async evaluateAttempt(attempt: Attempt, problem: Problem): Promise<Attempt> {
    const evaluating = transitionAttempt(attempt, "Evaluating");
    try {
      const evaluation = await this.primary.evaluate(problem, evaluating.submission);
      return { ...transitionAttempt(evaluating, "Completed"), evaluation: { ...evaluation, source: "primary" } };
    } catch (error) {
      try {
        const evaluation = await this.fallback.evaluate(problem, evaluating.submission);
        return { ...transitionAttempt(evaluating, "Completed"), evaluation: { ...evaluation, source: "deterministic-fallback", failureDetails: error instanceof Error ? error.message : "Primary evaluator failed" } };
      } catch {
        return transitionAttempt(evaluating, "Failed");
      }
    }
  }
}

export function aggregateWeaknesses(attempts: Attempt[]): { criterion: string; count: number }[] {
  const counts = new Map<string, number>();
  attempts.filter((attempt) => attempt.evaluation).forEach((attempt) => {
    attempt.evaluation?.feedback.filter((item) => item.score < 75).forEach((item) => counts.set(item.criterion, (counts.get(item.criterion) ?? 0) + 1));
  });
  return Array.from(counts.entries()).map(([criterion, count]) => ({ criterion, count })).sort((a, b) => b.count - a.count || a.criterion.localeCompare(b.criterion));
}

export function getProblem(id: string): Problem {
  return PROBLEMS.find((problem) => problem.id === id) ?? PROBLEMS[0];
}

export const SEED_ATTEMPTS: Attempt[] = [
  {
    id: "seed-parking-1",
    problemId: "parking-lot",
    status: "Completed",
    createdAt: "2026-09-13T10:15:00.000Z",
    updatedAt: "2026-09-13T10:38:00.000Z",
    format: "structured-written",
    submission: DEMO_CONTENT,
    evaluation: {
      overall: 74,
      signal: "Promising, with clear next moves",
      summary: "A well-framed first pass with strong domain vocabulary. The next lift is making policy changes cheaper.",
      feedback: [
        { criterion: "Requirement understanding", score: 82, signal: "Strong", evidence: "A vehicle enters through an entry gate and receives a ticket.", concern: "The concurrency assumption is only briefly named.", suggestion: "State how two simultaneous allocations are serialized.", confidence: "High" },
        { criterion: "Responsibility quality", score: 71, signal: "Developing", evidence: "ParkingLot coordinates entry and exit.", concern: "The lot risks becoming a thinly named god object.", suggestion: "Move availability queries and allocation decisions behind focused collaborators.", confidence: "High" },
        { criterion: "Encapsulation & interfaces", score: 79, signal: "Developing", evidence: "AllocationStrategy (interface) / PricingStrategy (interface)", concern: "The contracts do not show inputs and outputs yet.", suggestion: "Write the smallest policy interfaces before adding implementations.", confidence: "Medium" },
        { criterion: "Coupling & cohesion", score: 68, signal: "Developing", evidence: "ExitGate closes the ticket and asks PricingStrategy for the fee.", concern: "Mutation boundaries need a sharper trace.", suggestion: "Separate fee calculation from ticket closure and spot release.", confidence: "High" },
        { criterion: "Extensibility & change handling", score: 66, signal: "Developing", evidence: "A composite strategy can later consider distance or EV charging.", concern: "The proposed seam is good but not exercised.", suggestion: "Describe adding EV pricing without editing the exit use case.", confidence: "Medium" },
        { criterion: "Edge cases & testability", score: 77, signal: "Developing", evidence: "No compatible spot; duplicate exit; lost ticket; vehicle larger than remaining spots.", concern: "Expected outcomes are not paired with each case.", suggestion: "Turn the edge-case list into named tests with outcomes.", confidence: "High" },
        { criterion: "Explanation & trade-offs", score: 73, signal: "Developing", evidence: "I keep payment outside the core domain so pricing can be tested without a gateway.", concern: "A rejected alternative would make the trade-off more legible.", suggestion: "Explain why a single global allocator was not chosen.", confidence: "High" },
      ],
      deterministic: [
        { label: "All required sections present", detail: "Each section meets the minimum evidence threshold.", passed: true },
        { label: "Named abstractions detected", detail: "At least one interface or abstract type is named.", passed: true },
        { label: "Edge cases are explicit", detail: "Failure paths are described instead of implied.", passed: true },
        { label: "No obvious duplicate class names", detail: "Class list contains no repeated exact names.", passed: true },
      ],
      nextFocus: ["Write the exact responsibility boundary between ParkingLot, AllocationStrategy, and the floors.", "Turn one expected change—EV spots or peak pricing—into an extension test."],
      completedAt: "2026-09-13T10:38:00.000Z",
    },
  },
  {
    id: "seed-vending-1",
    problemId: "vending-machine",
    status: "Completed",
    createdAt: "2026-09-10T16:30:00.000Z",
    updatedAt: "2026-09-10T17:02:00.000Z",
    format: "structured-written",
    submission: { ...DEMO_CONTENT, assumptions: "The machine sells stocked products and can accept coins.", tradeoffs: "Use states for selection and payment." },
    evaluation: {
      overall: 68,
      signal: "Promising, with clear next moves",
      summary: "The machine lifecycle is understood. Feedback is asking for more explicit ownership around inventory and refunds.",
      feedback: RUBRIC.map((criterion, index) => ({ criterion, score: index === 1 || index === 5 ? 59 : 71, signal: index === 1 || index === 5 ? "Needs attention" as const : "Developing" as const, evidence: "Use states for selection and payment.", concern: "The responsibility boundary is not explicit enough.", suggestion: "Name the object that owns this decision and its test seam.", confidence: "Medium" as const })),
      deterministic: [
        { label: "All required sections present", detail: "Each section meets the minimum evidence threshold.", passed: true },
        { label: "Named abstractions detected", detail: "At least one interface or abstract type is named.", passed: true },
        { label: "Edge cases are explicit", detail: "Failure paths are described instead of implied.", passed: false },
        { label: "No obvious duplicate class names", detail: "Class list contains no repeated exact names.", passed: true },
      ],
      nextFocus: ["Make the refund/dispense boundary explicit with a failure-state test."],
      completedAt: "2026-09-10T17:02:00.000Z",
    },
  },
];
