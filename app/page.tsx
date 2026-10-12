"use client";
import Link from "next/link";

export default function Home() {
  return (
    <main dir="rtl" className="launch-shell">
      <div className="launch-card">
        <div className="launch-mark">J&amp;M</div>
        <span className="eyebrow">J &amp; M MARKETPLACE</span>
        <h1>مرحباً بك في<br /><em>J &amp; M</em></h1>
        <p>منصة تسوّق تجمع العملاء والمتاجر في تجربة سهلة وآمنة. يمكنك تسجيل الدخول إلى حسابك أو فتح بوابة إدارة المشروع.</p>
        <div className="launch-progress"><span/><span/><span/><span/></div>
        <div style={{display:"flex",flexDirection:"column",gap:"12px",marginTop:"24px"}}>
          <Link href="/login" className="launch-contact" style={{textAlign:"center"}}>تسجيل الدخول</Link>
          <Link href="/owner" className="launch-contact" style={{textAlign:"center",background:"transparent",color:"inherit",border:"1px solid currentColor"}}>دخول مالك المشروع</Link>
        </div>
        <small style={{display:"block",marginTop:"18px"}}>بوابة المالك تتطلب تسجيل الدخول بحساب مخوّل.</small>
      </div>
      <footer>J &amp; M · جميع الحقوق محفوظة</footer>
    </main>
  );
}
