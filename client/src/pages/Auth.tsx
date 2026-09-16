import { useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useLocation } from "wouter";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

type AuthMode = "login" | "signup" | "reset";

export default function Auth() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<AuthMode>("login");
  const [identifier, setIdentifier] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const login = trpc.auth.login.useMutation({ onSuccess: () => navigate("/") });
  const signup = trpc.auth.signup.useMutation({ onSuccess: () => navigate("/") });
  const requestReset = trpc.auth.requestPasswordReset.useMutation({ onSuccess: ({ token }) => { setResetToken(token || ""); setMessage(token ? "Demo reset token generated. In production, this is delivered by email or SMS." : "If an account matches, reset instructions will be sent."); } });
  const reset = trpc.auth.resetPassword.useMutation({ onSuccess: () => { setMode("login"); setPassword(""); setResetPassword(""); setResetToken(""); setMessage("Password updated. Sign in with your new password."); } });
  const pending = login.isPending || signup.isPending || requestReset.isPending || reset.isPending;
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); setMessage("");
    if (mode === "login") login.mutate({ identifier, password });
    else if (mode === "signup") signup.mutate({ name, identifier, password });
    else if (resetToken) reset.mutate({ token: resetToken, password: resetPassword });
    else requestReset.mutate({ identifier });
  };
  const error = login.error?.message || signup.error?.message || requestReset.error?.message || reset.error?.message || message;
  const inputHint = identifier.includes("@") ? "Email address" : /^\+?[0-9 ()-]*$/.test(identifier) && identifier.length > 3 ? "Phone number" : "Username, email, or phone";
  const title = mode === "login" ? "Sign in to your lab." : mode === "signup" ? "Create your learner account." : "Recover your account.";
  return <main className="auth-page">
    <section className="auth-visual"><div className="auth-brand"><div className="brand-mark"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 13.5 20 8l11 5.5-11 5.5L9 13.5Z" /><path d="m9 20 11 5.5L31 20M9 26.5 20 32l11-5.5" /><circle cx="20" cy="20" r="3.2" /></svg></div><div><strong>DesignGym</strong><span>CipherSchools practice lab</span></div></div><div className="auth-visual-copy"><div className="eyebrow">A better second attempt starts here</div><h1>Turn course knowledge into <em>design judgment.</em></h1><p>Practice the systems that show up in real interviews and real software. Keep your attempts, feedback, and next moves in one place.</p><div className="auth-proof"><div><Check size={14} /> Evidence-linked feedback</div><div><Check size={14} /> Progress that stays with you</div><div><Check size={14} /> Built for CipherSchools learners</div></div></div><div className="auth-visual-foot"><span>DESIGNGYM / CIPHERSCHOOLS</span><span>LLD PRACTICE LAB · 01</span></div></section>
    <section className="auth-card-wrap"><div className="auth-card"><div className="auth-card-top"><div><div className="eyebrow">{mode === "login" ? "Welcome back" : mode === "signup" ? "Start your practice record" : "Account recovery"}</div><h2>{title}</h2><p>{mode === "login" ? "Continue where your last design left off." : mode === "signup" ? "Your attempts and feedback will follow you across reps." : "Reset your password with a one-time recovery token."}</p></div><div className="auth-card-icon"><ShieldCheck size={18} /></div></div>{mode !== "reset" && <button type="button" className="oauth-button" onClick={() => startLogin()}><span className="google-glyph">G</span><span>Continue with Google / OAuth</span><ArrowRight size={15} /></button>}{mode !== "reset" && <div className="auth-divider"><span>or use your credentials</span></div>}<form onSubmit={submit}>{mode === "signup" && <label><span>Full name</span><div className="auth-input"><UserRound size={16} /><input value={name} onChange={event => setName(event.target.value)} placeholder="Arjun Sharma" required /></div></label>}<label><span>{mode === "reset" && resetToken ? "New password" : inputHint}</span><div className="auth-input">{mode === "reset" && resetToken ? <LockKeyhole size={16} /> : <Mail size={16} />}<input type={mode === "reset" && resetToken ? (showPassword ? "text" : "password") : "text"} value={mode === "reset" && resetToken ? resetPassword : identifier} onChange={event => mode === "reset" && resetToken ? setResetPassword(event.target.value) : setIdentifier(event.target.value)} placeholder={mode === "reset" && resetToken ? "At least 8 characters" : mode === "login" ? "you@example.com" : "username or +91 phone"} minLength={mode === "reset" && resetToken ? 8 : undefined} required /></div></label>{(mode === "login" || mode === "signup") && <label><span>Password</span><div className="auth-input"><LockKeyhole size={16} /><input type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} required /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></label>}{mode === "reset" && resetToken && <label><span>One-time reset token</span><div className="auth-input"><ShieldCheck size={16} /><input value={resetToken} onChange={event => setResetToken(event.target.value)} required /></div></label>}{error && <div className={message && !login.error && !signup.error && !requestReset.error && !reset.error ? "auth-success" : "auth-error"}>{error}</div>}<button className="auth-submit" disabled={pending}>{pending ? "Securing your session…" : mode === "login" ? "Enter DesignGym" : mode === "signup" ? "Create my account" : resetToken ? "Update password" : "Send reset instructions"}<ArrowRight size={16} /></button></form>{mode === "login" && <button className="auth-forgot" onClick={() => { setMode("reset"); setMessage(""); }}>Forgot password?</button>}{mode !== "reset" && <div className="auth-switch">{mode === "login" ? "New to DesignGym?" : "Already have an account?"}<button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button></div>}{mode === "reset" && <div className="auth-switch"><button onClick={() => { setMode("login"); setMessage(""); }}>Back to sign in</button></div>}<div className="auth-security"><LockKeyhole size={13} /> Passwords are hashed before storage. Sessions use secure, signed cookies.</div></div><button className="auth-back" onClick={() => navigate("/")}>Preview the lab without signing in <ArrowRight size={14} /></button></section>
  </main>;
}
