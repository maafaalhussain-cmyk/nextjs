"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
type Order={id:string;customer_id:string;status:string;subtotal:number;shipping_amount:number;total:number;currency:string;created_at:string};
const labels:Record<string,string>={pending:"بانتظار الدفع",paid:"مدفوع",processing:"قيد التجهيز",shipped:"تم الشحن",delivered:"تم التسليم",cancelled:"ملغي",refunded:"مسترد"};
export default function OwnerOrders(){
 const [rows,setRows]=useState<Order[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [query,setQuery]=useState("");const [status,setStatus]=useState("all");
 useEffect(()=>{let active=true;(async()=>{const sb=getSupabase();if(!sb){if(active){setError("إعدادات Supabase غير متوفرة.");setLoading(false)}return}
 const {data:{user}}=await sb.auth.getUser();if(!user){window.location.replace("/login");return}
 const {data:role,error:roleError}=await sb.from("user_roles").select("role").eq("user_id",user.id).maybeSingle();
 if(roleError||role?.role!=="owner"){if(active){setError("هذه الصفحة مخصصة لمالك السوق فقط.");setLoading(false)}return}
 const {data,error:queryError}=await sb.from("orders").select("id,customer_id,status,subtotal,shipping_amount,total,currency,created_at").order("created_at",{ascending:false}).limit(300);
 if(!active)return;if(queryError)setError("تعذر قراءة الطلبات. تأكد من تشغيل ترحيل صلاحيات المالك.");else setRows((data||[]) as Order[]);setLoading(false);
 })();return()=>{active=false}},[]);
 const filtered=rows.filter(o=>(status==="all"||o.status===status)&&(o.id.toLowerCase().includes(query.toLowerCase())||o.customer_id.toLowerCase().includes(query.toLowerCase())));
 if(loading)return <main className="owner-shell" dir="rtl"><p>جارٍ تحميل الطلبات...</p></main>;
 return <main className="owner-shell" dir="rtl"><header className="owner-header"><Link href="/owner" className="owner-brand"><span>J&amp;M</span><div><b>J &amp; M</b><small>إدارة الطلبات</small></div></Link><Link href="/owner" className="owner-back">← لوحة المالك</Link></header>
 <section className="owner-welcome"><span className="owner-eyebrow">ORDER OPERATIONS</span><h1>الطلبات</h1><p>عرض الطلبات المسجلة في قاعدة البيانات. تغيير حالة الطلب والدفع يحتاج مساراً خادمياً موثوقاً حتى لا تتغير الحالة دون تحقق.</p></section>
 {error&&<div className="owner-feedback error" role="alert">{error}</div>}
 <section className="owner-next owner-product-list"><div className="owner-list-heading"><h2>كل الطلبات ({filtered.length})</h2><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث برقم الطلب أو العميل"/></div>
 <div className="owner-order-filters"><label>الحالة<select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">كل الحالات</option>{Object.entries(labels).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></label></div>
 {filtered.length===0?<p className="owner-empty">لا توجد طلبات مطابقة. إذا كانت قاعدة البيانات جديدة، فهذا طبيعي حتى يتم إنشاء أول طلب.</p>:<div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>رقم الطلب</th><th>معرّف العميل</th><th>التاريخ</th><th>الإجمالي</th><th>الحالة</th></tr></thead><tbody>{filtered.map(o=><tr key={o.id}><td><b>{o.id.slice(0,8)}…</b><small>{o.id}</small></td><td><small>{o.customer_id}</small></td><td>{new Date(o.created_at).toLocaleString("ar-SA",{dateStyle:"medium",timeStyle:"short"})}</td><td><b>{Number(o.total).toLocaleString("ar-SA",{minimumFractionDigits:2,maximumFractionDigits:2})} {o.currency}</b></td><td><span className="owner-order-status">{labels[o.status]||o.status}</span></td></tr>)}</tbody></table></div>}
 </section><p className="owner-safe-note">لا يتم تنفيذ استرداد الأموال أو تغيير حالة الدفع من هذه الصفحة؛ يجب تأكيد ذلك من مزود الدفع عبر الخادم.</p></main>;
}
