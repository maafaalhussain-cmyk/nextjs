"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

type OwnerState = "loading" | "signed-out" | "not-owner" | "ready" | "error";

const sections = [
  { icon: "👥", title: "المشرفون والصلاحيات", detail: "إدارة حسابات فريق العمل", href: "/owner/supervisors", status: "متاح" },
  { icon: "🛍️", title: "المنتجات", detail: "إدارة المنتجات والمخزون", href: "/owner/products", status: "متاح" },
  { icon: "📦", title: "الطلبات", detail: "متابعة الطلبات وحالاتها", href: "/owner/orders", status: "متاح" },
  { icon: "💰", title: "المبيعات والأرباح", detail: "التقارير المالية والعمولات", href: "/owner/finance", status: "متاح" },
];

export default function OwnerDashboardPage() {
  const [state, setState] = useState<OwnerState>("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = getSupabase();
      if (!supabase) { if (active) setState("error"); return; }
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!active) return;
      if (userError || !user) { window.location.replace("/login"); return; }
      setEmail(user.email || "");
      const { data: role, error: roleError } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      if (!active) return;
      if (roleError) { setState("error"); return; }
      setState(role?.role === "owner" ? "ready" : "not-owner");
    })();
    return () => { active = false; };
  }, []);

  async function logout() {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
    window.location.replace("/login");
  }

  if (state === "loading") return <main className="owner-shell" dir="rtl"><p>جارٍ التحقق من صلاحيات المالك...</p></main>;
  if (state === "signed-out") return <main className="owner-shell" dir="rtl"><h1>سجّل الدخول أولاً</h1><Link href="/login">الانتقال لتسجيل الدخول</Link></main>;
  if (state === "not-owner") return <main className="owner-shell" dir="rtl"><div className="owner-message"><span>🔒</span><h1>هذه الصفحة خاصة بمالك السوق</h1><p>الحساب الحالي لا يملك صلاحية المالك. لا تمنح نفسك الصلاحية من هذه الصفحة؛ يجب تعيينها بأمان من لوحة قاعدة البيانات.</p><Link href="/account">العودة إلى حسابي</Link></div></main>;
  if (state === "error") return <main className="owner-shell" dir="rtl"><div className="owner-message"><h1>تعذر التحقق من صلاحيات المالك</h1><p>تأكد من إعداد مفاتيح Supabase وتشغيل ملف الترحيل الذي ينشئ جدول user_roles، ثم جرّب مجدداً.</p><Link href="/login">العودة لتسجيل الدخول</Link></div></main>;

  return <main className="owner-shell" dir="rtl">
    <header className="owner-header">
      <Link href="/" className="owner-brand"><span>J&amp;M</span><div><b>J &amp; M</b><small>لوحة مالك السوق</small></div></Link>
      <div className="owner-account"><span>{email}</span><button onClick={logout}>تسجيل الخروج</button></div>
    </header>
    <section className="owner-welcome"><span className="owner-eyebrow">OWNER CONTROL CENTER</span><h1>أهلاً بك في لوحة المالك 👑</h1><p>من هنا ستدير سوق J &amp; M وصلاحيات الفريق. الوصول لهذه الصفحة متاح لحساب المالك فقط.</p></section>
    <section className="owner-notice"><b>ملاحظة الإعداد الأولي</b><p>إذا كانت هذه أول مرة، تأكد من تعيين دور owner لبريد حسابك في ملف SQL قبل استخدام أدوات الإدارة.</p></section>
    <section className="owner-grid">{sections.map(item => <Link className="owner-tile" href={item.href} key={item.title}><span className="owner-icon">{item.icon}</span><span className="owner-status">{item.status}</span><h2>{item.title}</h2><p>{item.detail}</p><span className="owner-arrow">فتح القسم ←</span></Link>)}</section>
    <footer className="owner-footer">J &amp; M · لوحة إدارة داخلية · {new Date().getFullYear()}</footer>
  </main>;
}
