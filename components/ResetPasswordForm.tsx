"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 خانات على الأقل.");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setError("خدمة الحسابات غير مهيأة حالياً. حاول لاحقاً.");
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("تم تحديث كلمة المرور. يمكنك الآن تسجيل الدخول.");
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحديث كلمة المرور. افتح أحدث رابط وصلك عبر البريد.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell" dir="rtl">
      <aside className="auth-visual">
        <Link href="/" className="auth-brand"><span className="auth-brand-mark">J&amp;M</span><span>J &amp; M<small>اكتشف. تسوّق. استمتع.</small></span></Link>
        <div className="auth-visual-copy">
          <span className="auth-kicker">حسابك بأمان</span>
          <h1>خطوة جديدة<br/><em>لكلمة مرور آمنة</em></h1>
          <p>اختر كلمة مرور قوية لحماية حسابك ومتابعة تجربتك مع J &amp; M.</p>
        </div>
        <div className="auth-visual-bottom"><span>J &amp; M</span><span>كل اختياراتك في مكان واحد</span></div>
      </aside>
      <section className="auth-panel">
        <div className="auth-mobile-brand"><Link href="/" className="auth-brand"><span className="auth-brand-mark">J&amp;M</span><span>J &amp; M<small>اكتشف. تسوّق. استمتع.</small></span></Link></div>
        <div className="auth-card">
          <Link href="/login" className="auth-back">← العودة لتسجيل الدخول</Link>
          <span className="auth-kicker">استعادة الحساب</span>
          <h2>تعيين كلمة مرور جديدة</h2>
          <p className="auth-intro">أدخل كلمة المرور الجديدة مرتين لتأكيدها.</p>
          <form className="auth-form" onSubmit={submit}>
            <label>كلمة المرور الجديدة<input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required placeholder="8 خانات على الأقل"/></label>
            <label>تأكيد كلمة المرور<input type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={8} required placeholder="أعد كتابة كلمة المرور"/></label>
            {error && <div className="auth-notice auth-error" role="alert">{error}</div>}
            {message && <div className="auth-notice" role="status">{message}</div>}
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? "جارٍ التحديث..." : "حفظ كلمة المرور"} <span>←</span></button>
          </form>
          {message && <div className="auth-switch"><Link href="/login">الانتقال إلى تسجيل الدخول</Link></div>}
        </div>
        <div className="auth-footer">© {new Date().getFullYear()} J &amp; M — جميع الحقوق محفوظة</div>
      </section>
    </main>
  );
}
