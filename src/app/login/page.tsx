'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { getDeviceFingerprint } from '@/lib/device-fingerprint';
import { AppFooter } from '@/components/AppFooter';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-xl text-text-mid animate-pulse">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const redirectTo = searchParams.get('redirect') || searchParams.get('redirectTo');

  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
        });
        if (resetError) {
          setError('Could not send reset email. Please try again.\nไม่สามารถส่งอีเมลรีเซ็ตได้ กรุณาลองใหม่');
        } else {
          setSuccess('Check your email for a password reset link.\nตรวจสอบอีเมลของคุณสำหรับลิงก์รีเซ็ตรหัสผ่าน');
        }
        return;
      }

      {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message.includes('Invalid login')) {
            setError('Wrong email or password. Please try again.\nอีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่');
          } else {
            setError('Could not log in. Please try again.\nไม่สามารถเข้าสู่ระบบ กรุณาลองใหม่');
          }
          return;
        }

        // Check if this device is trusted (2FA)
        const device_hash = await getDeviceFingerprint();
        const checkRes = await fetch('/api/auth/check-device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_hash }),
        });
        const checkData = await checkRes.json();

        if (checkData.requires_2fa) {
          sessionStorage.setItem('es_pending_device_hash', device_hash);
          router.push('/verify-device');
          return;
        }

        // Device is trusted — set cookie and proceed
        document.cookie = `es_device_id=${device_hash}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
        router.push(redirectTo || '/learn');
      }
    } catch {
      setError('Something went wrong. Please try again.\nเกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="English Allstars"
            width={200}
            height={200}
            priority
            className="mx-auto mb-2"
          />
          <p className="text-text-mid font-sarabun mt-2 text-lg">
            เรียนภาษาอังกฤษสนุกๆ
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <h2 className="text-center text-xl font-bold text-text-dark font-nunito mb-1">
            Log In <span className="font-sarabun text-text-mid font-normal text-base">เข้าสู่ระบบ</span>
          </h2>
          <div className="h-px bg-gray-200 mb-6" />

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-bold text-text-dark mb-1"
              >
                <span className="font-nunito">Email</span>{' '}
                <span className="font-sarabun text-text-mid">อีเมล</span>
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@example.com"
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 min-h-[48px] text-text-dark
                           focus:border-sky-dark focus:outline-none focus:ring-2 focus:ring-sky-dark/30
                           transition-colors"
              />
            </div>

            {/* Password (hidden in forgot mode) */}
            {mode !== 'forgot' && (
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-bold text-text-dark mb-1"
                >
                  <span className="font-nunito">Password</span>{' '}
                  <span className="font-sarabun text-text-mid">รหัสผ่าน</span>
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 min-h-[48px] text-text-dark
                             focus:border-sky-dark focus:outline-none focus:ring-2 focus:ring-sky-dark/30
                             transition-colors"
                />
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="bg-coral/20 border-2 border-coral rounded-xl p-4 text-sm text-text-dark whitespace-pre-line">
                {error}
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="bg-leaf/20 border-2 border-leaf rounded-xl p-4 text-sm text-text-dark whitespace-pre-line">
                {success}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-4 min-h-[48px] font-bold text-white text-lg
                         transition-all disabled:opacity-50
                         bg-gradient-to-r from-sky-dark to-leaf hover:from-sky-dark/90 hover:to-leaf/90
                         shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>{mode === 'forgot' ? 'Sending...' : 'Logging in...'}</span>
                </span>
              ) : mode === 'forgot' ? (
                <span>
                  <span className="font-nunito">Send Reset Link</span>{' '}
                  <span className="font-sarabun">ส่งลิงก์รีเซ็ต</span>
                </span>
              ) : (
                <span>
                  <span className="font-nunito">Log In</span>{' '}
                  <span className="font-sarabun">เข้าสู่ระบบ</span>
                </span>
              )}
            </button>

            {/* Forgot password link (only on login mode) */}
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(null); setSuccess(null); }}
                className="w-full text-center text-sm text-sky-dark font-semibold hover:underline"
              >
                Forgot password? / <span className="font-sarabun">ลืมรหัสผ่าน?</span>
              </button>
            )}
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                className="w-full text-center text-sm text-sky-dark font-semibold hover:underline"
              >
                ← Back to login / <span className="font-sarabun">กลับไปเข้าสู่ระบบ</span>
              </button>
            )}
          </form>
        </div>

        {/* Sign up link */}
        <div className="text-center mt-6">
          <Link href="/signup"
            className="inline-block w-full max-w-md text-center bg-white border-2 border-sky-dark text-sky-dark font-bold text-lg py-3 rounded-xl hover:bg-sky-dark/10 transition-colors">
            <span className="font-nunito">Sign Up</span>{' '}
            <span className="font-sarabun">สมัครสมาชิก</span>
          </Link>
        </div>

        {/* Join class link */}
        <div className="text-center mt-4">
          <Link href="/join"
            className="inline-flex items-center gap-2 text-sky-dark font-bold text-sm hover:underline">
            Join a class / เข้าร่วมชั้นเรียน
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-4">
          <AppFooter />
        </div>
      </div>
    </div>
  );
}
