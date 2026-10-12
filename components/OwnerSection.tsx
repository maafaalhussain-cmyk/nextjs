"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

const content: Record<string,{title:string;description:string;icon:string;steps:string[]}> = {
  supervisors: {title:"المشرفون والصلاحيات",description:"المرحلة التالية هي إنشاء حسابات الفريق وربط كل حساب بالصلاحيات المسموحة له.",icon:"👥",steps:["تعيين دور owner لحسابك أولاً من Supabase SQL Editor.","إنشاء حساب المشرف من صفحة التسجيل العادية ثم تعيين دوره بأمان من قاعدة البيانات.","تحديد صلاحيات مستقلة للمنتجات والطلبات والتقارير قبل تمكين الفريق."]},
  products: {title:"إدارة المنتجات",description:"واجهة إدارة المنتجات ستُربط بجدول المنتجات وسياسات صلاحيات المالك والبائع.",icon:"🛍️",steps:["إعداد جدول المنتجات والمخزون والصور.","إضافة التعديل والحذف والموافقة على المنتجات.","اختبار سياسات قاعدة البيانات قبل فتح الإدارة."]},
  orders: {title:"إدارة الطلبات",description:"تحتاج إدارة الطلبات إلى جدول طلبات وسياسات تمنع أي مستخدم من الاطلاع على طلبات الآخرين.",icon:"📦",steps:["إعداد جداول الطلبات وبنود الطلب.","تحديد حالات الطلب ومسار الإلغاء والاسترجاع.","ربط الدفع قبل استقبال طلبات حقيقية."]},
  finance: {title:"المبيعات والأرباح",description:"لن تُعرض أرقام مالية وهمية؛ سيُبنى التقرير على الطلبات المكتملة والعمولات والتكاليف المسجلة.",icon:"💰",steps:["تحديد العمولة ورسوم المنصة.","حساب الإيراد والتكلفة وصافي الربح.","إضافة تقارير يومية وأسبوعية وشهرية بعد اكتمال بيانات الطلبات."]},
};

export default function OwnerSection({section}:{section:string}) {
  const [authorized,setAuthorized]=useState(false);
  const [loading,setLoading]=useState(true);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{let active=true;(async()=>{
    const sb=getSupabase();
    if(!sb){if(active){setFailed(true);setLoading(false)}return}
    const {data:{user}}=await sb.auth.getUser();
    if(!user){window.location.replace("/login");return}
    const {data,error}=await sb.from("user_roles").select("role").eq("user_id",user.id).maybeSingle();
    if(!active)return;
    if(error){setFailed(true)}else if(data?.role==="owner"){setAuthorized(true)}else{setFailed(true)}
    setLoading(false);
  })();return()=>{active=false}},[]);
  const item=content[section]||content.supervisors;
  if(loading)return <main className="owner-shell" dir="rtl"><p>جارٍ التحقق من الصلاحيات...</p></main>;
  if(!authorized)return <main className="owner-shell" dir="rtl"><div className="owner-message"><h1>لا يمكن فتح هذا القسم</h1><p>{failed?"تحقق من إعداد Supabase وتشغيل ملف الترحيل، أو تأكد أن حسابك يحمل دور المالك.":"هذه الصفحة مخصصة للمالك فقط."}</p><Link href="/owner">العودة إلى لوحة المالك</Link></div></main>;
  return <main className="owner-shell" dir="rtl">
    <header className="owner-header"><Link href="/owner" className="owner-brand"><span>J&amp;M</span><div><b>J &amp; M</b><small>لوحة مالك السوق</small></div></Link><Link href="/owner" className="owner-back">← لوحة المالك</Link></header>
    <section className="owner-welcome"><span className="owner-eyebrow">OWNER WORKSPACE</span><h1>{item.icon} {item.title}</h1><p>{item.description}</p></section>
    <section className="owner-next"><h2>المطلوب لإكمال هذا القسم</h2><ol>{item.steps.map(step=><li key={step}>{step}</li>)}</ol><p className="owner-safe-note">حماية الحسابات أولاً: لن يتم إنشاء صلاحيات إدارية من المتصفح أو الاعتماد على بيانات يرسلها المستخدم.</p></section>
    <Link href="/owner" className="owner-return">العودة إلى لوحة المالك</Link>
  </main>;
}
