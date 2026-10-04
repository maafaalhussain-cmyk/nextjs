"use client";

import Link from "next/link";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Props = { mode: "login" | "register" };

export default function AuthForm({ mode }: Props) {
  const isRegister = mode === "register";
  const [role, setRole] = useState<"customer" | "seller">("customer");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice("");
    setError("");
    const supabase = getSupabase();
    if (!supabase) {
      setError("لم يتم إعداد خدمة الحسابات بعد. أضف مفاتيح Supabase في إعدادات بيئة النشر ثم أعد المحاولة.");
      return;
    }
    setBusy(true);
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    try {
      if (!isRegister && resetMode) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
        setNotice("إذا كان البريد مسجلاً لدينا، فسيصلك رابط آمن لإعادة تعيين كلمة المرور.");
        return;
      }
      if (isRegister) {
        const fullName = String(data.get("name") || "").trim();
        const phone = String(data.get("phone") || "").trim();
        const { data: result, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, phone, requested_role: role } },
        });
        if (signUpError) throw signUpError;
        if (!result.session) {
          setNotice("تم إنشاء طلب الحساب. تحقق من بريدك الإلكتروني واضغط رابط التأكيد لإكمال التسجيل. " + (role === "seller" ? "سيبقى حساب البائع بانتظار مراجعة الإدارة قبل تفعيل البيع." : ""));
        } else {
          window.location.href = role === "seller" ? "/seller" : "/account";
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        window.location.href = "/account";
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      if (/invalid login credentials/i.test(message)) setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      else if (/user already registered/i.test(message)) setError("هذا البريد مسجل مسبقاً. جرّب تسجيل الدخول.");
      else if (/email not confirmed/i.test(message)) setError("يرجى تأكيد بريدك الإلكتروني أولاً.");
      else setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell" dir="rtl">
      <aside className="auth-visual">
        <Link href="/" className="auth-brand"><span className="auth-brand-mark">J&amp;M</span><span>J &amp; M<small>اكتشف. تسوّق. استمتع.</small></span></Link>
        <div className="auth-visual-copy">
          <span className="auth-kicker">تجربة تسوّق تجمع الكل</span>
          <h1>{isRegister ? <>مكانك بين<br/><em>عالم من الخيارات</em></> : <>مرحباً بعودتك<br/><em>اشتقنا لك</em></>}</h1>
          <p>منتجات متنوعة، متاجر متعددة، وتجربة بسيطة صُممت لتكون أقرب لاحتياجك.</p>
          <div className="auth-perks"><span>✦ خيارات أكثر</span><span>✦ متاجر متنوعة</span><span>✦ تجربة سهلة</span></div>
        </div>
        <div className="auth-visual-bottom"><span>J &amp; M</span><span>كل اختياراتك في مكان واحد</span></div>
        <div className="auth-orb auth-orb-one"/><div className="auth-orb auth-orb-two"/>
      </aside>
      <section className="auth-panel">
        <div className="auth-mobile-brand"><Link href="/" className="auth-brand"><span className="auth-brand-mark">J&amp;M</span><span>J &amp; M<small>اكتشف. تسوّق. استمتع.</small></span></Link></div>
        <div className="auth-card">
          <Link href="/" className="auth-back">← العودة للمتجر</Link>
          <span className="auth-kicker">{isRegister ? "ابدأ رحلتك معنا" : "سعيدون برؤيتك مجدداً"}</span>
          <h2>{isRegister ? "أنشئ حسابك" : "تسجيل الدخول"}</h2>
          <p className="auth-intro">{isRegister ? "أنشئ حساباً جديداً واستمتع بتجربة J & M." : "أدخل بياناتك للوصول إلى حسابك ومتابعة تسوقك."}</p>
          {isRegister && <div className="role-picker" aria-label="نوع الحساب">
            <button type="button" className={role === "customer" ? "role-option selected" : "role-option"} onClick={() => setRole("customer")}><span>🛍️</span><b>عميل</b><small>أرغب في التسوق</small></button>
            <button type="button" className={role === "seller" ? "role-option selected" : "role-option"} onClick={() => setRole("seller")}><span>🏪</span><b>بائع</b><small>أرغب في عرض منتجاتي</small></button>
          </div>}
          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegister && <label>الاسم الكامل<input name="name" autoComplete="name" placeholder="اكتب اسمك الكامل" required minLength={3}/></label>}
            <label>البريد الإلكتروني<input name="email" type="email" autoComplete="email" placeholder="name@example.com" required/></label>
            {isRegister && <label>رقم الجوال<input name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="05xxxxxxxx" pattern="05[0-9]{8}" required/><small className="field-hint">أدخل رقم جوال سعودي يبدأ بـ 05</small></label>}
            {(!resetMode || isRegister) && <label>كلمة المرور<div className="password-wrap"><input name="password" type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} placeholder="••••••••" minLength={8} required/><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "إخفاء" : "إظهار"}</button></div>{isRegister && <small className="field-hint">8 خانات على الأقل</small>}</label>}
            {!isRegister && <div className="auth-form-meta"><label className="remember"><input type="checkbox" name="remember"/> تذكرني</label><button type="button" className="text-link" onClick={() => { setResetMode(!resetMode); setError(""); setNotice(""); }}>{resetMode ? "العودة لتسجيل الدخول" : "نسيت كلمة المرور؟"}</button></div>}
            {error && <div className="auth-notice auth-error" role="alert">{error}</div>}
            {notice && <div className="auth-notice" role="status">{notice}</div>}
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? "جارٍ المعالجة..." : isRegister ? (role === "seller" ? "إنشاء حساب بائع" : "إنشاء حساب") : resetMode ? "إرسال رابط الاستعادة" : "دخول إلى حسابي"} <span>←</span></button>
          </form>
          <div className="auth-switch">{isRegister ? "لديك حساب بالفعل؟" : "ليس لديك حساب؟"} <Link href={isRegister ? "/login" : "/register"}>{isRegister ? "سجّل الدخول" : "أنشئ حساباً جديداً"}</Link></div>
          <p className="auth-terms">بالمتابعة، أنت توافق على شروط الاستخدام وسياسة الخصوصية.</p>
        </div>
        <div className="auth-footer">© {new Date().getFullYear()} J &amp; M — جميع الحقوق محفوظة</div>
      </section>
    </main>
  );
}
