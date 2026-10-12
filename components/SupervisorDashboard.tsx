"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
type Section={key:string;title:string;detail:string;href:string;icon:string};
const sections:Section[]=[
 {key:"manage_products",title:"إدارة المنتجات",detail:"إضافة المنتجات وتحديث السعر والمخزون",href:"/owner/products",icon:"🛍️"},
 {key:"view_orders",title:"عرض الطلبات",detail:"متابعة الطلبات المسجلة",href:"/owner/orders",icon:"📦"},
 {key:"view_finance",title:"التقارير المالية",detail:"عرض قيود دفتر الأستاذ",href:"/owner/finance",icon:"💰"},
 {key:"manage_sellers",title:"إدارة البائعين",detail:"صلاحية مراجعة طلبات البائعين",href:"/owner/sellers",icon:"🏪"},
];
export default function SupervisorDashboard(){
 const [loading,setLoading]=useState(true);const [email,setEmail]=useState("");const [allowed,setAllowed]=useState<string[]>([]);const [error,setError]=useState("");
 useEffect(()=>{let active=true;(async()=>{const sb=getSupabase();if(!sb){if(active){setError("إعدادات Supabase غير متوفرة.");setLoading(false)}return}
 const {data:{user}}=await sb.auth.getUser();if(!user){window.location.replace("/login");return}
 const {data:role,error:roleError}=await sb.from("user_roles").select("role").eq("user_id",user.id).maybeSingle();
 if(!active)return;if(roleError){setError("تعذر التحقق من الدور. تأكد من تشغيل ترحيل 0009.");setLoading(false);return}
 if(role?.role==="owner"){window.location.replace("/owner");return}
 if(role?.role!=="supervisor"){window.location.replace("/account");return}
 setEmail(user.email||"");
 const perms=await Promise.all(sections.map(async s=>{const {data,error}=await sb.rpc("has_market_permission",{permission_name:s.key});return !error&&data===true?s.key:null}));
 if(active){setAllowed(perms.filter((x):x is string=>Boolean(x)));setLoading(false)}
 })();return()=>{active=false}},[]);
 async function logout(){const sb=getSupabase();if(sb)await sb.auth.signOut();window.location.replace("/login")}
 if(loading)return <main className="owner-shell" dir="rtl"><p>جارٍ التحقق من صلاحيات المشرف...</p></main>;
 return <main className="owner-shell" dir="rtl"><header className="owner-header"><Link href="/" className="owner-brand"><span>J&amp;M</span><div><b>J &amp; M</b><small>مساحة المشرف</small></div></Link><div className="owner-account"><span>{email}</span><button onClick={logout}>تسجيل الخروج</button></div></header>
 <section className="owner-welcome"><span className="owner-eyebrow">SUPERVISOR WORKSPACE</span><h1>مرحباً بك في مساحة العمل</h1><p>تظهر هنا الأقسام التي منحك مالك السوق صلاحية الوصول إليها. لا تستطيع تعديل صلاحياتك بنفسك.</p></section>
 {error&&<div className="owner-feedback error">{error}</div>}
 {allowed.length===0?<section className="owner-message"><h2>لا توجد صلاحيات مفعّلة</h2><p>تواصل مع مالك J &amp; M لمنحك صلاحية القسم المطلوب.</p></section>:<section className="owner-grid">{sections.filter(s=>allowed.includes(s.key)).map(s=><Link className="owner-tile" href={s.href} key={s.key}><span className="owner-icon">{s.icon}</span><span className="owner-status">مسموح</span><h2>{s.title}</h2><p>{s.detail}</p><span className="owner-arrow">فتح القسم ←</span></Link>)}</section>}
 <footer className="owner-footer">J &amp; M · مساحة مشرف بصلاحيات محددة · {new Date().getFullYear()}</footer></main>;
}
