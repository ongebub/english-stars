import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Where emailed auth links land: password recovery, email confirmation, magic
 * links.
 *
 * TWO THINGS THIS ROUTE USED TO GET WRONG, both of which locked Matt out on
 * 2026-09-21 and would do the same to any user on a phone:
 *
 * 1. It only understood `?code=`, which is the PKCE flow. Exchanging that code
 *    requires the verifier stashed by the browser that *requested* the reset.
 *    Open the emailed link anywhere else — a mail app's in-app browser, a
 *    different default browser, a desktop — and the exchange fails with
 *    "code challenge does not match previously saved code verifier". On phones
 *    that is the ordinary path, not the edge case. So we now prefer
 *    `?token_hash=` + `verifyOtp`, which carries no browser state and works
 *    wherever the link is opened. (This needs the Supabase recovery email
 *    template to use {{ .TokenHash }} — see entities/english-allstars/notes.md
 *    in the Aurora repo. The `code` branch stays as a fallback for links
 *    already in flight and for templates not yet switched over.)
 *
 * 2. On any failure it redirected to /login with nothing attached. A dead link
 *    and a wrong password therefore looked identical, which is exactly why
 *    "reset the password" appeared to loop forever: the reset had worked, the
 *    link had not, and the page said the same thing either way. Every exit now
 *    carries a reason the login page can translate.
 */

type FailureReason =
  | 'link_expired'
  | 'link_wrong_browser'
  | 'link_invalid'
  | 'link_missing';

function backToLogin(origin: string, reason: FailureReason) {
  return NextResponse.redirect(`${origin}/login?error=${reason}`);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const next = searchParams.get('next') ?? '/dashboard';
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const code = searchParams.get('code');

  // Supabase's own /verify endpoint redirects here with these when it rejects
  // the link before we ever see a token — expired, already consumed, revoked.
  const upstreamError = searchParams.get('error') ?? searchParams.get('error_code');
  if (upstreamError) {
    const expired =
      upstreamError.includes('expired') || upstreamError.includes('otp_expired');
    return backToLogin(origin, expired ? 'link_expired' : 'link_invalid');
  }

  const supabase = await createClient();

  // Preferred path: stateless, works in any browser.
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'recovery' | 'email' | 'signup' | 'magiclink' | 'invite',
      token_hash: tokenHash,
    });

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    const message = error.message.toLowerCase();
    const expired = message.includes('expired') || message.includes('not found');
    return backToLogin(origin, expired ? 'link_expired' : 'link_invalid');
  }

  // Fallback: PKCE. Only succeeds in the browser that started the flow.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    // Name this case specifically. It is not a bad link and it is not a bad
    // password — it is the right link opened in the wrong browser, and saying
    // so is the difference between a ten-second fix and an hour spent
    // resetting a password that was never wrong.
    const message = error.message.toLowerCase();
    if (message.includes('code verifier') || message.includes('code challenge')) {
      return backToLogin(origin, 'link_wrong_browser');
    }

    const expired = message.includes('expired') || message.includes('not found');
    return backToLogin(origin, expired ? 'link_expired' : 'link_invalid');
  }

  return backToLogin(origin, 'link_missing');
}
