"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type PermissionKey="manage_products"|"view_orders"|"view_finance"|"manage_sellers";
type Permissions=Record<PermissionKey,boolean>;
type Supervisor={userId:string;email:string;fullName:string;permissions:Permissions};
const labels:Record<PermissionKey,string>={manage_products:"إدارة المنتجات",view_orders:"عرض الطلبات",view_finance:"عرض التقارير المالية",manage_sellers:"إدارة البائعين"};
const emptyPermissions=():Permissions=>({manage_products:false,view_orders:false,view_finance:false,manage_sellers:false});
export default function OwnerSupervisors(){
 const [rows,setRows]=useState<Supervisor[]>([]);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [notice,setNotice]=useState("");
 const [email,setEmail]=useState("");const [fullName,setFullName]=useState("");const [newPermissions,setNewPermissions]=useState<Permissions>(emptyPermissions());
 const [edits,setEdits]=useState<Record<string,Permissions>>({});
 async function request(path:string,method="GET",body?:unknown){
  const sb=getSupabase();if(!sb)throw new Error("إعدادات Supabase غير متوفرة.");
  const {data:{session}}=await sb.auth.getSession();if(!session){window.location.replace("/login");throw new Error("انتهت جلسة الدخول.")}
  const response=await fetch(path,{method,headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||"تعذر إكمال الطلب.");
  return data;
 }
 async function load(){
  setError("");try{const data=await request("/api/owner/supervisors");const supervisors=(data.supervisors||[]) as Supervisor[];setRows(supervisors);setEdits(Object.fromEntries(supervisors.map(s=>[s.userId,{...s.permissions}])))}catch(e){setError(e instanceof Error?e.message:"تعذر تحميل قائمة المشرفين.")}finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[]);
 async function invite(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");setNotice("");
  try{const result=await request("/api/owner/supervisors","POST",{email,fullName,permissions:newPermissions});setNotice(result.message||"تم إرسال الدعوة.");setEmail("");setFullName("");setNewPermissions(emptyPermissions());await load()}
  catch(e){setError(e instanceof Error?e.message:"تعذر إرسال الدعوة.")}finally{setBusy(false)}
 }
 async function save(s:Supervisor){
  setBusy(true);setError("");setNotice("");
  try{const result=await request("/api/owner/supervisors","PATCH",{userId:s.userId,permissions:edits[s.userId]||s.permissions});setNotice(result.message||"تم تحديث الصلاحيات.");await load()}
  catch(e){setError(e instanceof Error?e.message:"تعذر حفظ الصلاحيات.")}finally{setBusy(false)}
 }
 async function revoke(s:Supervisor){
  if(!window.confirm("هل تريد إلغاء صلاحيات هذا المشرف؟ سيبقى حسابه كحساب عميل."))return;
  setBusy(true);setError("");setNotice("");
  try{const result=await request("/api/owner/supervisors","DELETE",{userId:s.userId});setNotice(result.message||"تم إلغاء الصلاحيات.");await load()}
  catch(e){setError(e instanceof Error?e.message:"تعذر إلغاء الصلاحيات.")}finally{setBusy(false)}
 }
 function toggleNew(key:PermissionKey){setNewPermissions(p=>({...p,[key]:!p[key]}))}
 function toggleEdit(id:string,key:PermissionKey){setEdits(p=>({...p,[id]:{...(p[id]||emptyPermissions()),[key]:!(p[id]||emptyPermissions())[key]}}))}
 if(loading)return <main className="owner-shell" dir="rtl"><p>جارٍ تحميل المشرفين...</p></main>;
 return <main className="owner-shell" dir="rtl">
 <header className="owner-header"><Link href="/owner" className="owner-brand"><span>J&amp;M</span><div><b>J &amp; M</b><small>إدارة المشرفين</small></div></Link><Link href="/owner" className="owner-back">← لوحة المالك</Link></header>
 <section className="owner-welcome"><span className="owner-eyebrow">TEAM & ACCESS</span><h1>المشرفون والصلاحيات</h1><p>أرسل دعوة إلى بريد المشرف وحدد ما يستطيع الوصول إليه. لا يحصل المشرف على أي صلاحية تلقائياً.</p></section>
 {error&&<div className="owner-feedback error" role="alert">{error}</div>}{notice&&<div className="owner-feedback" role="status">{notice}</div>}
 <section className="owner-next owner-product-create"><h2>دعوة مشرف جديد</h2><form className="owner-supervisor-form" onSubmit={invite}>
 <label>اسم المشرف<input value={fullName} onChange={e=>setFullName(e.target.value)} minLength={2} maxLength={100} required placeholder="الاسم الكامل"/></label>
 <label>البريد الإلكتروني<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="supervisor@example.com"/></label>
 <fieldset><legend>الصلاحيات الممنوحة</legend><div className="owner-permission-options">{(Object.keys(labels) as PermissionKey[]).map(key=><label key={key}><input type="checkbox" checked={newPermissions[key]} onChange={()=>toggleNew(key)}/>{labels[key]}</label>)}</div></fieldset>
 <button type="submit" disabled={busy}>{busy?"جارٍ إرسال الدعوة...":"إرسال دعوة المشرف"}</button>
 </form><p className="owner-safe-note">يجب إعداد البريد الإلكتروني في Supabase Auth. مفتاح الخدمة يستخدم داخل الخادم فقط، ولا يُرسل إلى المتصفح.</p></section>
 <section className="owner-next owner-product-list"><div className="owner-list-heading"><h2>فريق العمل ({rows.length})</h2></div>
 {!rows.length?<p className="owner-empty">لا يوجد مشرفون حتى الآن. أرسل أول دعوة من النموذج أعلاه.</p>:<div className="owner-supervisor-list">{rows.map(s=><article className="owner-supervisor-card" key={s.userId}>
 <div className="owner-supervisor-heading"><div><b>{s.fullName||"مشرف J & M"}</b><small>{s.email}</small></div><small>{s.userId.slice(0,8)}…</small></div>
 <div className="owner-permission-options owner-permission-edit">{(Object.keys(labels) as PermissionKey[]).map(key=><label key={key}><input type="checkbox" checked={Boolean((edits[s.userId]||s.permissions)[key])} onChange={()=>toggleEdit(s.userId,key)}/>{labels[key]}</label>)}</div>
 <div className="owner-supervisor-actions"><button disabled={busy} onClick={()=>void save(s)}>حفظ الصلاحيات</button><button className="owner-delete" disabled={busy} onClick={()=>void revoke(s)}>إلغاء صلاحياته</button></div>
 </article>)}</div>}
 </section>
 </main>;
}
