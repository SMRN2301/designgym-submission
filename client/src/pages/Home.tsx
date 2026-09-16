import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  FlaskConical,
  History,
  Layers3,
  LockKeyhole,
  LayoutGrid,
  Lightbulb,
  ListChecks,
  Menu,
  MessageCircle,
  Play,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Target,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import {
  aggregateWeaknesses,
  createAttempt,
  DEMO_CONTENT,
  EMPTY_SUBMISSION,
  DeterministicRubricEvaluator,
  getProblem,
  PROBLEMS,
  RUBRIC,
  SEED_ATTEMPTS,
  type Attempt,
  type AttemptStatus,
  type Problem,
  type SubmissionContent,
} from "@/lib/designgym";

const STORAGE_KEY = "designgym-attempts-v1";
const evaluator = new DeterministicRubricEvaluator();

type View = "overview" | "problems" | "practice" | "review";

const problemImages: Record<string, string> = {
  "parking-lot": "/assets/parking-lot.jpg",
  "vending-machine": "/assets/vending-machine.jpg",
  "elevator-system": "/assets/elevator-system.jpg",
  "library-management": "/assets/library-management.jpg",
};

type Section = {
  key: keyof SubmissionContent;
  label: string;
  hint: string;
  placeholder: string;
  min: string;
};

const sections: Section[] = [
  { key: "assumptions", label: "Assumptions & requirements", hint: "Clarify the boundary before naming classes.", placeholder: "What is in scope? What are you intentionally assuming?", min: "Actors, scope, invariants" },
  { key: "classes", label: "Classes & interfaces", hint: "Name the nouns and the variation points.", placeholder: "List your classes, abstractions, and interfaces. One per line works well.", min: "At least 3 meaningful types" },
  { key: "responsibilities", label: "Responsibilities", hint: "Give each object a job it can own.", placeholder: "For each important class: what does it own, decide, or protect?", min: "Ownership, not just nouns" },
  { key: "interactions", label: "Key interactions", hint: "Trace one happy path end to end.", placeholder: "Describe the main flow. Who calls whom? Where does state change?", min: "One happy path" },
  { key: "edgeCases", label: "Edge cases & testability", hint: "Show where the design gets stressed.", placeholder: "What can fail or become ambiguous? Include the expected outcome and a test seam.", min: "Failure paths + test ideas" },
  { key: "tradeoffs", label: "Extensibility & trade-offs", hint: "Make one future change cheaper.", placeholder: "What would you change for a new requirement? What did you choose not to optimize for?", min: "One concrete extension" },
];

function readAttempts(): Attempt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : SEED_ATTEMPTS;
  } catch {
    return SEED_ATTEMPTS;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function statusLabel(status: AttemptStatus) {
  return status === "Completed" ? "Reviewed" : status;
}

function scoreTone(score: number) {
  return score >= 80 ? "good" : score >= 65 ? "mid" : "low";
}

function AppShell({ view, setView, children, attempts }: { view: View; setView: (view: View) => void; children: React.ReactNode; attempts: Attempt[] }) {
  const reviewed = attempts.filter((attempt) => attempt.status === "Completed").length;
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [scrollNav, setScrollNav] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  useEffect(() => {
    const handleSection = (event: Event) => setScrollNav((event as CustomEvent<string>).detail);
    window.addEventListener("designgym:section", handleSection);
    return () => window.removeEventListener("designgym:section", handleSection);
  }, []);
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [view]);
  const navActive = (key: string) => view === "overview" ? (scrollNav ? scrollNav === key : key === "overview") : view === key;
  const go = (next: View) => { setScrollNav(null); setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup" onClick={() => go("overview")} role="button" tabIndex={0} onKeyDown={(event) => event.key === "Enter" && go("overview")}>
          <div className="brand-mark" aria-label="DesignGym logo"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 13.5 20 8l11 5.5-11 5.5L9 13.5Z" /><path d="m9 20 11 5.5L31 20M9 26.5 20 32l11-5.5" /><circle cx="20" cy="20" r="3.2" /></svg></div>
          <div><div className="brand-name">DesignGym</div><div className="brand-sub">CipherSchools practice lab</div></div>
        </div>
        <div className="side-rule" />
        <div className="side-label">Workspace</div>
        <nav className="side-nav" aria-label="Primary navigation">
          <button className={navActive("overview") ? "active" : ""} onClick={() => go("overview")}><BarChart3 size={17} /> Home <span className="nav-ping" /></button>
          <button className={navActive("problems") ? "active" : ""} onClick={() => go("problems")}><LayoutGrid size={17} /> Problem library</button>
          <button className={navActive("practice") ? "active" : ""} onClick={() => go("practice")}><FlaskConical size={17} /> Practice</button>
          <button className={navActive("review") ? "active" : ""} onClick={() => go("review")}><History size={17} /> Attempt history <span className="nav-count">{reviewed}</span></button>
        </nav>
        <div className="side-spacer" />
        <div className="side-note">
          <div className="side-note-icon"><Sparkles size={15} /></div>
          <div><strong>Evidence over vibes.</strong><p>Every review points back to your own words.</p></div>
        </div>
        <div className="profile-area">
          {!user && <button className="auth-quick-action" onClick={() => navigate("/auth")}><span><LockKeyhole size={14} /> Sign in / Sign up</span><ArrowRight size={14} /></button>}
          <button className={`profile-chip ${profileOpen ? "open" : ""}`} onClick={() => setProfileOpen((current) => !current)} aria-expanded={profileOpen}><div className="avatar">{user?.name?.slice(0, 2).toUpperCase() || "AS"}</div><div><strong>{user?.name || "Arjun Sharma"}</strong><span>{user ? "Software development track" : "Preview learner"}</span></div><ChevronDown size={15} /></button>
          {profileOpen && <div className="profile-menu">{user ? <><div className="profile-menu-label">Signed in as {user.email || user.name}</div><button onClick={() => navigate("/account")}><UserRound size={14} /> Account settings</button><button onClick={() => logout()}><ArrowLeft size={14} /> Sign out</button></> : <><div className="profile-menu-label">Save attempts and feedback to your learner account.</div><button onClick={() => navigate("/auth")}><LockKeyhole size={14} /> Sign in</button><button onClick={() => navigate("/auth")}><Sparkles size={14} /> Create account</button></>}</div>}
        </div>
      </aside>
      <main className="main-content">{children}</main>
      <Copilot />
    </div>
  );
}

function Copilot() {
  const [open, setOpen] = useState(false);
  return <>
    <button className={`copilot-tab ${open ? "open" : ""}`} onClick={() => setOpen(!open)} aria-label="Toggle DesignGym copilot"><Bot size={17} /><span>Copilot</span></button>
    <aside className={`copilot-panel ${open ? "visible" : ""}`} aria-hidden={!open}>
      <div className="copilot-header"><div className="copilot-avatar"><Bot size={16} /></div><div><strong>DesignGym Copilot</strong><span>Practice-side guidance</span></div><button onClick={() => setOpen(false)} aria-label="Close copilot"><X size={16} /></button></div>
      <div className="copilot-status"><span /> Ready to help you think, not think for you.</div>
      <div className="copilot-message"><div className="copilot-bubble">Try asking: <strong>“What responsibility boundary should I challenge next?”</strong></div><div className="copilot-bubble muted">I’ll keep prompts focused on requirements, ownership, and trade-offs. Your design stays yours.</div></div>
      <div className="copilot-prompts"><button>Clarify my scope <ArrowUpRight size={13} /></button><button>Find a weak seam <ArrowUpRight size={13} /></button><button>Suggest an edge case <ArrowUpRight size={13} /></button></div>
      <div className="copilot-compose"><MessageCircle size={15} /><span>Ask about this attempt…</span><Send size={14} /></div>
    </aside>
  </>;
}

function Header({ eyebrow, title, description, action }: { eyebrow: string; title: React.ReactNode; description?: string; action?: React.ReactNode }) {
  return <header className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="header-action">{action}</div>}</header>;
}

function StatCard({ label, value, note, icon, tone = "neutral" }: { label: string; value: string; note: string; icon: React.ReactNode; tone?: string }) {
  return <div className={`stat-card ${tone}`}><div className="stat-icon">{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>;
}

function Overview({ attempts, startPractice, openReview }: { attempts: Attempt[]; startPractice: (problemId: string, content?: SubmissionContent) => void; openReview: (attempt: Attempt) => void }) {
  const completed = attempts.filter((attempt) => attempt.status === "Completed");
  const latest = completed[0];
  const weaknesses = aggregateWeaknesses(attempts);
  const best = completed.length ? Math.max(...completed.map((attempt) => attempt.evaluation?.overall ?? 0)) : 0;
  useEffect(() => {
    const anchors = [
      { id: "overview-anchor", key: "overview" },
      { id: "practice-anchor", key: "practice" },
      { id: "history-anchor", key: "review" },
    ];
    const sync = () => {
      const threshold = window.scrollY + window.innerHeight * 0.55;
      let active = "overview";
      anchors.forEach(({ id, key }) => { const node = document.getElementById(id); if (node && node.offsetTop <= threshold) active = key; });
      window.dispatchEvent(new CustomEvent("designgym:section", { detail: active }));
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);
  return <div className="content-wrap overview-page">
    <Header eyebrow="CipherSchools · Wednesday · 16 September 2026" title={<>Make the second attempt<br /><em>more useful</em> than the first.</>} description="A focused practice loop for CipherSchools learners building the design judgment employers expect." action={<button className="icon-button" aria-label="Help"><CircleHelp size={18} /></button>} />
    <section id="overview-anchor" data-reveal className="hero-strip" style={{ backgroundImage: "linear-gradient(90deg, rgba(27,39,49,.98) 0%, rgba(27,39,49,.88) 45%, rgba(27,39,49,.38) 100%), url('/assets/designgym-lab-hero.jpg')" }}>
      <div className="hero-copy"><div className="hero-kicker"><span className="live-dot" /> Your CipherSchools practice loop is active</div><h2>One clear design.<br /><span>Better feedback.</span></h2><p>Build the technical judgment behind production software. Write down your reasoning and get a review that shows exactly where to push next.</p><button className="primary-button" onClick={() => startPractice("parking-lot", DEMO_CONTENT)}><Play size={16} fill="currentColor" /> Continue with Parking Lot <ArrowRight size={16} /></button></div>
      <div className="hero-orbit" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit-core"><Layers3 size={34} /><span>LLD</span></div><div className="orbit-tag tag-top">requirements</div><div className="orbit-tag tag-right">feedback</div><div className="orbit-tag tag-bottom">retry</div></div>
    </section>
    <div data-reveal className="stats-grid"><StatCard label="Reviewed attempts" value={String(completed.length)} note="Across 2 problem types" icon={<History size={17} />} /><StatCard label="Best learning signal" value={best ? `${best}/100` : "—"} note="Parking Lot · 13 Sep" icon={<Target size={17} />} tone="lime" /><StatCard label="Current streak" value="3 days" note="Small reps compound" icon={<Zap size={17} />} tone="amber" /><StatCard label="Next focus" value={weaknesses[0]?.criterion ?? "Start a rep"} note={weaknesses[0] ? `Flagged in ${weaknesses[0].count} attempts` : "Pick a problem to begin"} icon={<Lightbulb size={17} />} tone="coral" /> </div>
    <div id="practice-anchor" data-reveal className="section-heading"><div><div className="eyebrow">Choose your next rep</div><h2>Practice problems</h2></div><button className="text-button" onClick={() => window.scrollTo({ top: document.getElementById("practice-anchor")?.offsetTop ?? 620, behavior: "smooth" })}>View all <ArrowRight size={15} /></button></div>
    <div className="problem-grid">{PROBLEMS.map((problem, index) => <ProblemCard key={problem.id} problem={problem} index={index} onStart={() => startPractice(problem.id)} />)}</div>
    {latest && <section id="history-anchor" data-reveal className="last-review-card"><div className="last-review-copy"><div className="eyebrow">Last reviewed · {formatDate(latest.updatedAt)}</div><h3>{getProblem(latest.problemId).name} <span className="score-pill">{latest.evaluation?.overall}/100</span></h3><p>{latest.evaluation?.summary}</p></div><button className="secondary-button" onClick={() => openReview(latest)}>Open feedback <ArrowRight size={16} /></button></section>}
  </div>;
}

function ProblemCard({ problem, index, onStart }: { problem: Problem; index: number; onStart: () => void }) {
  return <article data-reveal className={`problem-card accent-${problem.accent}`} style={{ animationDelay: `${index * 50}ms`, transitionDelay: `${index * 70}ms` }}><div className="problem-card-top"><span className="number-stamp">0{index + 1}</span><span className="difficulty">{problem.difficulty}</span></div><div className="problem-art"><img src={problemImages[problem.id]} alt={`${problem.name} practice visual`} /><div className="art-shade" /><span className="art-label">{problem.eyebrow}</span></div><div className="problem-eyebrow">{problem.eyebrow}</div><h3>{problem.name}</h3><p>{problem.description}</p><div className="concept-row">{problem.concepts.map((concept) => <span key={concept}>{concept}</span>)}</div><div className="problem-footer"><span><Clock3 size={14} /> {problem.time}</span><button className="start-link" onClick={onStart}>Start rep <ArrowRight size={14} /></button></div></article>;
}

function ProblemsView({ startPractice }: { startPractice: (problemId: string) => void }) {
  return <div className="content-wrap problems-page"><Header eyebrow="The CipherSchools practice library" title={<>Four systems.<br /><em>Infinite design decisions.</em></>} description="Curated prompts that move from foundations to scheduling, state, relationships, and change handling." action={<div className="library-stamp"><BookOpen size={15} /> 4 curated reps</div>} /><div className="library-intro"><div><span className="eyebrow">Built for deliberate practice</span><h2>Choose the tension you want to train.</h2></div><p>Each prompt is intentionally small enough to finish in one sitting, but rich enough to reveal how you think about ownership, abstraction, and behavior.</p></div><div className="problem-library-grid">{PROBLEMS.map((problem, index) => <ProblemCard key={problem.id} problem={problem} index={index} onStart={() => startPractice(problem.id)} />)}</div><section className="library-callout"><div className="callout-mark"><Sparkles size={20} /></div><div><span className="eyebrow">CipherSchools learner principle</span><h3>Practice should leave a trace.</h3><p>Every attempt becomes evidence for the next one: not a permanent grade, but a clearer next move.</p></div><ArrowUpRight size={19} /></section></div>;
}

function Practice({ problem, attempt, setAttempt, submitAttempt, backToOverview }: { problem: Problem; attempt: Attempt; setAttempt: (attempt: Attempt) => void; submitAttempt: () => void; backToOverview: () => void }) {
  const [requirementsOpen, setRequirementsOpen] = useState(true);
  const completedCount = sections.filter((section) => attempt.submission[section.key].trim().length >= 24).length;
  const updateContent = (key: keyof SubmissionContent, value: string) => setAttempt({ ...attempt, submission: { ...attempt.submission, [key]: value }, updatedAt: new Date().toISOString() });
  return <div className="practice-page">
    <div className="practice-topbar"><button className="back-button" onClick={backToOverview}><ArrowLeft size={16} /> Back to problems</button><div className="save-state"><span className="save-dot" /> Saved locally</div><div className="practice-meta"><span>{problem.name}</span><span className="slash">/</span><span>New attempt</span></div></div>
    <div className="practice-layout">
      <section className="workspace-column"><div className="workspace-heading"><div><div className="eyebrow">Structured written design · {problem.time}</div><h1>{problem.name}</h1><p>{problem.description}</p></div><div className="completion-ring"><strong>{completedCount}</strong><span>/ 6</span></div></div>
        <div className="completion-bar"><div style={{ width: `${(completedCount / 6) * 100}%` }} /></div>
        <div className="form-stack">{sections.map((section, index) => <div className="form-section" key={section.key}><div className="form-section-header"><div className="section-number">{String(index + 1).padStart(2, "0")}</div><div><h2>{section.label}</h2><p>{section.hint}</p></div><span className={`field-check ${attempt.submission[section.key].trim().length >= 24 ? "is-done" : ""}`}>{attempt.submission[section.key].trim().length >= 24 ? <Check size={13} /> : `${section.min}`}</span></div><textarea aria-label={section.label} value={attempt.submission[section.key]} onChange={(event) => updateContent(section.key, event.target.value)} placeholder={section.placeholder} /><div className="char-count">{attempt.submission[section.key].length} characters <span>·</span> {section.min}</div></div>)}</div>
        <div className="submit-dock"><div><strong>Ready to get a signal?</strong><span>We’ll evaluate completeness, structure, and reasoning quality.</span></div><button className="primary-button" onClick={submitAttempt} disabled={attempt.status !== "Draft"}><Send size={16} /> {attempt.status === "Draft" ? "Submit for feedback" : statusLabel(attempt.status)}</button></div>
      </section>
      <aside className="requirements-panel"><button className="requirements-toggle" onClick={() => setRequirementsOpen(!requirementsOpen)}><span><FileText size={16} /> Problem brief</span><ChevronDown size={17} className={requirementsOpen ? "rotate" : ""} /></button>{requirementsOpen && <div className="requirements-body"><div className="brief-tag">What good evidence looks like</div><p className="brief-intro">Don’t solve the problem in your head. Make the decisions visible enough that another engineer can challenge them.</p><div className="requirements-block"><h3>Functional requirements</h3>{problem.requirements.map((item) => <div className="req-item" key={item}><span><Check size={11} /></span><p>{item}</p></div>)}</div><div className="requirements-block"><h3>Assumptions to consider</h3>{problem.nonFunctional.map((item) => <div className="assumption-item" key={item}><span>↳</span><p>{item}</p></div>)}</div><div className="rubric-mini"><div className="eyebrow">Review lens</div><p>7 criteria · evidence linked · deterministic checks separated</p><div className="rubric-dots">{RUBRIC.map((item, index) => <span key={item} title={item} className={index < 4 ? "filled" : ""} />)}</div></div></div>}</aside>
    </div>
  </div>;
}

function Review({ attempt, problem, onRetry, onBack }: { attempt: Attempt; problem: Problem; onRetry: () => void; onBack: () => void }) {
  const evaluation = attempt.evaluation;
  if (!evaluation) return null;
  return <div className="content-wrap review-page"><div className="review-topbar"><button className="back-button" onClick={onBack}><ArrowLeft size={16} /> Back to history</button><span className="review-date">Reviewed {formatDate(evaluation.completedAt)}</span></div><Header eyebrow={`${problem.name} · Attempt review`} title={<>Here’s where your<br /><em>design got stronger.</em></>} description="A useful review is specific enough to change what you write next." action={<button className="secondary-button" onClick={onRetry}><RotateCcw size={15} /> Retry as new attempt</button>} />
    <section className="review-summary"><div className="score-orb"><div className="score-orb-inner"><strong>{evaluation.overall}</strong><span>/ 100</span></div></div><div className="summary-copy"><div className="signal-label"><span className="signal-dot" /> {evaluation.signal}</div><h2>{evaluation.summary}</h2><p>Feedback is grounded in evidence from this attempt. Use the next-focus card to shape your retry, not to chase a perfect score.</p></div><div className="summary-side"><div className="side-metric"><span>Strong areas</span><strong>{evaluation.feedback.filter((item) => item.score >= 80).length}<small> / 7</small></strong></div><div className="side-metric"><span>Evidence checks</span><strong>{evaluation.deterministic.filter((item) => item.passed).length}<small> / 4</small></strong></div></div></section>
    <div className="focus-card"><div className="focus-icon"><Target size={19} /></div><div><div className="eyebrow">Next attempt focus</div><h3>Make one responsibility boundary impossible to misunderstand.</h3><div className="focus-list">{evaluation.nextFocus.map((item) => <div key={item}><span>01</span><p>{item}</p></div>)}</div></div></div>
    <div className="review-section-title"><div><div className="eyebrow">Judgment-based feedback</div><h2>Seven lenses, one clear direction</h2></div><span className="legend"><i className="legend-good" /> strong <i className="legend-mid" /> developing <i className="legend-low" /> needs attention</span></div>
    <div className="feedback-list">{evaluation.feedback.map((item, index) => <FeedbackRow key={item.criterion} item={item} index={index} />)}</div>
    <section className="deterministic-card"><div className="deterministic-heading"><div><div className="eyebrow">Deterministic checks</div><h2>Completeness, without pretending it’s judgment</h2></div><span className="check-count">{evaluation.deterministic.filter((item) => item.passed).length} passed</span></div><div className="deterministic-grid">{evaluation.deterministic.map((item) => <div className={`deterministic-item ${item.passed ? "passed" : "failed"}`} key={item.label}><div className="det-icon">{item.passed ? <CheckCircle2 size={17} /> : <X size={17} />}</div><div><strong>{item.label}</strong><p>{item.detail}</p></div></div>)}</div></section>
    <div className="review-footer"><div><span className="eyebrow">Evidence snapshot</span><p>Your submission is preserved with this attempt. Retrying creates a new attempt; history stays intact.</p></div><button className="primary-button" onClick={onRetry}><RotateCcw size={16} /> Apply focus and retry</button></div>
  </div>;
}

function FeedbackRow({ item, index }: { item: NonNullable<Attempt["evaluation"]>["feedback"][number]; index: number }) {
  return <article className="feedback-row"><div className="feedback-index">{String(index + 1).padStart(2, "0")}</div><div className="feedback-main"><div className="feedback-title"><h3>{item.criterion}</h3><span className={`signal-badge ${scoreTone(item.score)}`}>{item.signal}</span></div><div className="score-bar"><div className={`score-fill ${scoreTone(item.score)}`} style={{ width: `${item.score}%` }} /></div><div className="feedback-grid"><div className="evidence-block"><span>Evidence from your submission</span><blockquote>“{item.evidence}”</blockquote></div><div className="feedback-detail"><div><span>Concern</span><p>{item.concern}</p></div><div><span>Suggestion</span><p>{item.suggestion}</p></div></div></div></div><div className="feedback-score"><strong>{item.score}</strong><span>/ 100</span></div></article>;
}

function HistoryView({ attempts, openReview, startPractice }: { attempts: Attempt[]; openReview: (attempt: Attempt) => void; startPractice: (problemId: string) => void }) {
  const reviewed = attempts.filter((attempt) => attempt.status === "Completed");
  const weaknesses = aggregateWeaknesses(attempts);
  return <div className="content-wrap"><Header eyebrow="Your learning trail" title={<>History that keeps<br /><em>the context.</em></>} description="Your old attempts aren’t overwritten. They become the material for the next one." action={<button className="primary-button" onClick={() => startPractice("vending-machine")}><Play size={15} fill="currentColor" /> New practice</button>} /><section className="trend-panel"><div className="trend-copy"><div className="eyebrow">Recurring weaknesses</div><h2>Patterns worth practicing</h2><p>These criteria showed up as developing or needs attention more than once.</p></div><div className="weakness-list">{weaknesses.length ? weaknesses.slice(0, 3).map((weakness, index) => <div className="weakness-row" key={weakness.criterion}><div className="weakness-rank">0{index + 1}</div><div className="weakness-bar"><div className="weakness-bar-fill" style={{ width: `${Math.min(100, weakness.count * 42)}%` }} /></div><strong>{weakness.criterion}</strong><span>{weakness.count} flags</span></div>) : <div className="empty-trend">Complete your first review to reveal patterns.</div>}</div></section><div className="history-head"><div><div className="eyebrow">All attempts</div><h2>{reviewed.length} reviewed attempts</h2></div><div className="history-filter"><ListChecks size={15} /> Structured written</div></div><div className="attempt-table"><div className="attempt-table-header"><span>Problem</span><span>Submitted</span><span>Status</span><span>Learning signal</span><span /></div>{attempts.map((attempt) => { const problem = getProblem(attempt.problemId); return <button className="attempt-row" key={attempt.id} onClick={() => attempt.evaluation ? openReview(attempt) : startPractice(attempt.problemId)}><div className="attempt-problem"><span className={`mini-art accent-${problem.accent}`}>{problem.name.charAt(0)}</span><div><strong>{problem.name}</strong><span>{problem.difficulty} · {attempt.format === "structured-written" ? "Written design" : attempt.format}</span></div></div><span className="attempt-date">{formatDate(attempt.createdAt)}</span><span><span className={`status-chip ${attempt.status.toLowerCase()}`}>{attempt.status === "Completed" ? <Check size={12} /> : <Clock3 size={12} />} {statusLabel(attempt.status)}</span></span><span className="attempt-signal">{attempt.evaluation ? <><strong>{attempt.evaluation.overall}</strong><span>{attempt.evaluation.signal}</span></> : <span>Draft in progress</span>}</span><ArrowRight size={17} className="row-arrow" /></button>})}</div></div>;
}

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [attempts, setAttempts] = useState<Attempt[]>(readAttempts);
  const [activeAttempt, setActiveAttempt] = useState<Attempt | null>(null);
  const [activeReview, setActiveReview] = useState<Attempt | null>(null);
  const { user } = useAuth();
  const remoteAttempts = trpc.attempts.list.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const saveRemoteAttempt = trpc.attempts.save.useMutation();
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts)); }, [attempts]);
  useEffect(() => {
    if (!remoteAttempts.data?.length) return;
    const mapped = remoteAttempts.data.map((row) => ({ id: row.clientId, problemId: row.problemId, status: row.status as AttemptStatus, format: row.format as Attempt["format"], createdAt: new Date(row.createdAt).toISOString(), updatedAt: new Date(row.updatedAt).toISOString(), submission: row.submission as SubmissionContent, evaluation: row.evaluation as Attempt["evaluation"] }));
    setAttempts((current) => [...mapped, ...current.filter((attempt) => !mapped.some((remote) => remote.id === attempt.id))]);
  }, [remoteAttempts.data]);

  const activeProblem = useMemo(() => activeAttempt ? getProblem(activeAttempt.problemId) : PROBLEMS[0], [activeAttempt]);
  const startPractice = (problemId: string, content = EMPTY_SUBMISSION) => { const attempt = createAttempt(problemId, content); setActiveAttempt(attempt); setActiveReview(null); setView("practice"); };
  const openReview = (attempt: Attempt) => { setActiveReview(attempt); setActiveAttempt(null); setView("review"); };
  const submitAttempt = () => {
    if (!activeAttempt) return;
    const submitted = { ...activeAttempt, status: "Submitted" as const, updatedAt: new Date().toISOString() };
    const evaluating = { ...submitted, status: "Evaluating" as const, updatedAt: new Date().toISOString() };
    setAttempts((current) => [evaluating, ...current.filter((item) => item.id !== evaluating.id)]);
    setActiveAttempt(evaluating);
    setView("practice");
    window.setTimeout(() => {
      const evaluated = { ...evaluating, status: "Completed" as const, evaluation: evaluator.evaluate(activeProblem, evaluating.submission), updatedAt: new Date().toISOString() };
      setAttempts((current) => [evaluated, ...current.filter((item) => item.id !== evaluated.id)]);
      if (user) saveRemoteAttempt.mutate({ clientId: evaluated.id, problemId: evaluated.problemId, status: evaluated.status, format: evaluated.format, submission: evaluated.submission, evaluation: evaluated.evaluation ?? null });
      setActiveReview(evaluated);
      setActiveAttempt(null);
      setView("review");
    }, 850);
  };
  const retryAttempt = () => { if (!activeReview) return; startPractice(activeReview.problemId, activeReview.submission); };
  const setDraft = (attempt: Attempt) => { setActiveAttempt(attempt); setAttempts((current) => [attempt, ...current.filter((item) => item.id !== attempt.id)]); };

  return <AppShell view={view} setView={setView} attempts={attempts}>{view === "overview" && <Overview attempts={attempts} startPractice={startPractice} openReview={openReview} />}{view === "problems" && <ProblemsView startPractice={startPractice} />}{view === "practice" && activeAttempt && <Practice problem={activeProblem} attempt={activeAttempt} setAttempt={setDraft} submitAttempt={submitAttempt} backToOverview={() => setView("overview")} />}{view === "review" && activeReview && <Review attempt={activeReview} problem={getProblem(activeReview.problemId)} onRetry={retryAttempt} onBack={() => { setActiveReview(null); setView("review"); }} />}{view === "review" && !activeReview && <HistoryView attempts={attempts} openReview={openReview} startPractice={startPractice} />}{view === "practice" && !activeAttempt && <HistoryView attempts={attempts} openReview={openReview} startPractice={startPractice} />}</AppShell>;
}
