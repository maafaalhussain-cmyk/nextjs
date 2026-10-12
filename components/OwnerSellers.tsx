"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
type Application={id:string;user_id:string;status:string;business_name:string|null;commercial_registration:string|null;submitted_at:string;name?:string;phone?:string};
const labels:Record<string,string>={pending:"بانتظار المراجعة",approved:"مقبول",rejected:"مرفوض"};
export default function OwnerSellers(){
 const [rows,setRows]=useState<Application[]>([]);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState("");const [error,setError]=useState("");const [notice,setNotice]=useState("");const [filter,setFilter]=useState("pending");
 async function load(){const sb=getSupabase();if(!sb){setError("إعدادات Supabase غير متوفرة.");setLoading(false);return}
 const {data:{user}}=await sb.auth.getUser();if(!user){window.location.replace("/login");return}
 const {data:allowed,error:permissionError}=await sb.rpc("has_market_permission",{permission_name:"manage_sellers"});
 if(permissionError||allowed!==true){setError("حسابك لا يملك صلاحية إدارة البائعين.");setLoading(false);return}
 const {data,error:queryError}=await sb.from("seller_applications").select("id,user_id,status,business_name,commercial_registration,submitted_at").order("submitted_at",{ascending:false}).limit(200);
 if(queryError){setError("تعذر تحميل طلبات البائعين: "+queryError.message);setLoading(false);return}
 const list=(data||[]) as Application[];
 const ids=list.map(a=>a.user_id);
 if(ids.length){const {data:profiles}=await sb.from("profiles").select("id,full_name,phone").in("id",ids);const map=new Map((profiles||[]).map(p=>[p.id,p]));for(const a of list){const p=map.get(a.user_id);a.name=p?.full_name||"";a.phone=p?.phone||""}}
 setRows(list);setLoading(false)
 }
 useEffect(()=>{void load()},[]);
 async function review(app:Application,decision:"approved"|"rejected"){
  if(!window.confirm(decision==="approved"?"هل تريد اعتماد هذا البائع؟":"هل تريد رفض طلب البائع؟"))return;
  const sb=getSupabase();if(!sb)return;setBusy(app.id);setError("");setNotice("");
  const {error:rpcError}=await sb.rpc("review_seller_application",{application_id:app.id,decision});
  if(rpcError)setError("تعذر تحديث الطلب: "+rpcError.message);else{setNotice(decision==="approved"?"تم اعتماد البائع.":"تم رفض الطلب.");await load()}
  setBusy("");
 }
 if(loading)return <main className="owner-shell" dir="rtl"><p>جارٍ تحميل طلبات البائعين...</p></main>;
 const filtered=rows.filter(a=>filter==="all"||a.status===filter);
 return <main className="owner-shell" dir="rtl"><header className="owner-header"><Link href="/owner" className="owner-brand"><span>J&amp;M</span><div><b>J &amp; M</b><small>إدارة البائعين</small></div></Link><Link href="/owner" className="owner-back">← لوحة المالك</Link></header>
 <section className="owner-welcome"><span className="owner-eyebrow">SELLER APPROVAL</span><h1>طلبات البائعين</h1><p>راجع طلبات الانضمام واعتمد البائع أو ارفض الطلب. تُحدّث حالة الملف الشخصي عبر إجراء قاعدة بيانات محمي.</p></section>
 {error&&<div className="owner-feedback error" role="alert">{error}</div>}{notice&&<div className="owner-feedback" role="status">{notice}</div>}
 <section className="owner-next owner-product-list"><div className="owner-list-heading"><h2>طلبات الانضمام ({filtered.length})</h2><select className="owner-filter-select" value={filter} onChange={e=>setFilter(e.target.value)}><option value="pending">بانتظار المراجعة</option><option value="approved">المعتمدة</option><option value="rejected">المرفوضة</option><option value="all">كل الطلبات</option></select></div>
 {!filtered.length?<p className="owner-empty">لا توجد طلبات في هذه القائمة.</p>:<div className="owner-seller-list">{filtered.map(a=><article className="owner-seller-card" key={a.id}><div><span className={"owner-order-status seller-"+a.status}>{labels[a.status]||a.status}</span><h3>{a.business_name||a.name||"طلب بائع"}</h3><p>اسم الحساب: {a.name||"غير متوفر"} · الجوال: {a.phone||"غير متوفر"}</p><p>رقم السجل: {a.commercial_registration||"لم يُسجل"} · تاريخ الطلب: {new Date(a.submitted_at).toLocaleDateString("ar-SA")}</p><small>معرّف الحساب: {a.user_id}</small></div>{a.status==="pending"&&<div className="owner-supervisor-actions"><button disabled={busy===a.id} onClick={()=>void review(a,"approved")}>{busy===a.id?"جارٍ الحفظ...":"اعتماد البائع"}</button><button className="owner-delete" disabled={busy===a.id} onClick={()=>void review(a,"rejected")}>رفض الطلب</button></div>}</article>)}</div>}
 </section></main>;
}
