"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type Mode = "game" | "tutor";
type Step = "closed" | "loading" | "create" | "enter" | "forgot" | "unavailable";

const input = "w-full rounded-xl border-2 border-gray-300 px-4 py-3 text-center font-nunito text-2xl tracking-[0.5em] text-text-dark focus:border-sky-dark focus:outline-none";

/**
 * Game | Tutor pill in the /learn header. Flipping needs the parent PIN, which is set
 * the first time (entered twice, plus the account password) and verified on the server
 * only. The PIN is a UX nudge to keep children on track, NOT an access boundary: the
 * account password is the real boundary (it is also what resets the PIN). Switching
 * children is deliberately NOT gated: profiles are not secret and login already lands on
 * the picker.
 */
export function ModeToggle({ mode }: { mode: Mode }) {
  const router = useRouter();
  const target: Mode = mode === "game" ? "tutor" : "game";
  const [step, setStep] = useState<Step>("closed");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  // The header <nav> is its own stacking context (sticky z-30), so a dialog rendered inside it
  // can never rise above the map art (z up to 2000). Portal to <body> instead.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const close = () => { setStep("closed"); setPin(""); setConfirm(""); setPassword(""); setMsg(""); };

  async function open() {
    setStep("loading"); setMsg("");
    try {
      const r = await fetch("/api/parent-pin");
      const d = await r.json();
      if (!d.available) { setStep("unavailable"); return; }
      if (d.lockedForSec > 0) setMsg(`Too many tries. Please wait ${Math.ceil(d.lockedForSec / 60)} min. ลองใหม่ภายหลัง`);
      if (d.needsReset) { setMsg("Your PIN needs to be set again. ตั้งรหัสใหม่"); setStep("forgot"); return; }
      setStep(d.hasPin ? "enter" : "create");
    } catch { setStep("unavailable"); }
  }

  const explain = (d: { error?: string; remaining?: number; retryAfterSec?: number }) => {
    if (d.error === "locked" || d.error === "busy") return `Too many tries. Wait ${Math.max(1, Math.ceil((d.retryAfterSec ?? 300) / 60))} min and try again. ลองใหม่ภายหลัง`;
    if (d.error === "wrong_pin") return `Wrong PIN. ${d.remaining ?? 0} tries left. รหัสผิด`;
    if (d.error === "wrong_password") return `Wrong password. ${d.remaining ?? 0} tries left. รหัสผ่านผิด`;
    if (d.error === "password_required") return "Please enter your account password. กรุณาใส่รหัสผ่าน";
    if (d.error === "pin_needs_reset") return "Your PIN needs to be set again. ตั้งรหัสใหม่";
    if (d.error === "pin_exists") return "A PIN already exists. Use Forgot PIN to change it.";
    if (d.error === "pin_mismatch") return "The two PINs are different. รหัสสองครั้งไม่ตรงกัน";
    if (d.error === "pin_format") return "Use exactly 4 digits. ใช้ตัวเลข 4 หลัก";
    return "Something went wrong. Please try again.";
  };

  async function flip(pinValue: string) {
    const r = await fetch("/api/learn-mode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: target, pin: pinValue }) });
    const d = await r.json();
    if (!r.ok) { setMsg(explain(d)); setPin(""); return false; }
    close(); router.push("/learn"); router.refresh();
    return true;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMsg("");
    try {
      if (step === "create") {
        const r = await fetch("/api/parent-pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, pin, confirm }) });
        const d = await r.json();
        if (!r.ok) { setMsg(explain(d)); return; }
        await flip(pin);
      } else if (step === "enter") {
        await flip(pin);
      } else if (step === "forgot") {
        const r = await fetch("/api/parent-pin/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, pin, confirm }) });
        const d = await r.json();
        if (!r.ok) { setMsg(explain(d)); return; }
        await flip(pin);
      }
    } catch { setMsg("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  const pill = "rounded-full px-2.5 py-1 font-nunito text-xs font-bold whitespace-nowrap";
  return (
    <>
      <button
        onClick={open}
        className="flex items-center rounded-full bg-white/15 p-0.5 hover:bg-white/25"
        aria-label={`Mode: ${mode === "game" ? "Game" : "Tutor"}. Parent PIN needed to change.`}
        title="Parent PIN needed to change"
      >
        <span className={`${pill} ${mode === "game" ? "bg-white text-sky-dark" : "text-white"}`}>🎮<span className="hidden sm:inline"> Game</span></span>
        <span className={`${pill} ${mode === "tutor" ? "bg-white text-sky-dark" : "text-white"}`}>🧑‍🏫<span className="hidden sm:inline"> Tutor</span></span>
      </button>

      {mounted && step !== "closed" && createPortal(
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true">
          <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-gray-800">
            <p className="text-4xl">🔐</p>
            <h2 className="mt-1 font-nunito text-xl font-extrabold text-text-dark dark:text-gray-100">
              {step === "create" ? "Create a parent PIN" : step === "forgot" ? "Reset your PIN" : `Switch to ${target === "game" ? "Game" : "Tutor"} mode`}
            </h2>
            <p className="font-sarabun text-sm text-text-mid dark:text-gray-400">
              {step === "create" ? "ตั้งรหัสผู้ปกครอง 4 หลัก (ครั้งแรก) ต้องใส่รหัสผ่านบัญชี" : step === "forgot" ? "ใส่รหัสผ่านบัญชีของคุณ" : "ใส่รหัสผู้ปกครอง 4 หลัก"}
            </p>

            {step === "loading" && <p className="mt-4 text-text-mid">…</p>}
            {step === "unavailable" && (
              <p className="mt-4 rounded-xl bg-orange-50 p-3 font-nunito text-sm text-orange-700">
                Mode switching is not available yet. Please try again later.
              </p>
            )}

            {(step === "create" || step === "enter" || step === "forgot") && (
              <div className="mt-4 space-y-3">
                {(step === "forgot" || step === "create") && (
                  <input type="password" autoComplete="current-password" placeholder="Account password" value={password}
                    onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 font-nunito text-base text-text-dark focus:border-sky-dark focus:outline-none" />
                )}
                <input type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="off" autoFocus
                  placeholder={step === "forgot" || step === "create" ? "New PIN" : "PIN"} value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} className={input} />
                {(step === "create" || step === "forgot") && (
                  <input type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="off"
                    placeholder="Confirm PIN" value={confirm}
                    onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))} className={input} />
                )}
              </div>
            )}

            {msg && <p className="mt-3 rounded-xl bg-orange-50 p-2 font-nunito text-sm font-semibold text-orange-700">{msg}</p>}

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={close} className="min-h-[48px] flex-1 rounded-xl bg-gray-200 font-nunito text-sm font-bold text-text-dark">Cancel</button>
              {(step === "create" || step === "enter" || step === "forgot") && (
                <button type="submit" disabled={busy || pin.length !== 4 || ((step === "create" || step === "forgot") && (confirm.length !== 4 || !password))}
                  className="min-h-[48px] flex-1 rounded-xl bg-leaf font-nunito text-sm font-bold text-white disabled:opacity-50">
                  {busy ? "…" : step === "create" ? "Save & switch" : step === "forgot" ? "Reset & switch" : "Switch"}
                </button>
              )}
            </div>
            {step === "enter" && (
              <button type="button" onClick={() => { setStep("forgot"); setPin(""); setConfirm(""); setMsg(""); }} className="mt-3 font-nunito text-xs font-semibold text-sky-dark underline">
                Forgot PIN? / ลืมรหัส
              </button>
            )}
          </form>
        </div>,
        document.body
      )}
    </>
  );
}
