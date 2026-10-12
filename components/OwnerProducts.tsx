"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Product = {id:string;name:string;description:string;price:number;stock:number;status:string;image_url:string|null;created_at:string;seller_id:string};
const statuses = ["draft","pending","active","rejected","archived"];
const statusLabels:Record<string,string>={draft:"مسودة",pending:"بانتظار المراجعة",active:"منشور",rejected:"مرفوض",archived:"مؤرشف"};

export default function OwnerProducts() {
 const [rows,setRows]=useState<Product[]>([]);
 const [userId,setUserId]=useState("");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");
 const [query,setQuery]=useState("");
 async function load(){
  const sb=getSupabase(); if(!sb){setError("إعدادات Supabase غير متوفرة.");setLoading(false);return;}
  const {data:{user}}=await sb.auth.getUser();
  if(!user){window.location.replace("/login");return;}
  setUserId(user.id);
  const {data:allowed,error:roleError}=await sb.rpc("has_market_permission",{permission_name:"manage_products"});
  if(roleError||allowed!==true){setError("حسابك لا يملك صلاحية إدارة المنتجات. اطلب من المالك منحك هذه الصلاحية.");setLoading(false);return;}
  const {data,error:queryError}=await sb.from("products").select("id,name,description,price,stock,status,image_url,created_at,seller_id").order("created_at",{ascending:false}).limit(200);
  if(queryError)setError("تعذر تحميل المنتجات. تأكد من تشغيل ترحيل صلاحيات المالك في Supabase.");
  else setRows((data||[]) as Product[]);
  setLoading(false);
 }
 useEffect(()=>{void load()},[]);
 async function createProduct(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");setNotice("");
  const sb=getSupabase();if(!sb||!userId)return;
  const form=new FormData(e.currentTarget);
  const name=String(form.get("name")||"").trim();
  const description=String(form.get("description")||"").trim();
  const price=Number(form.get("price"));
  const stock=Number(form.get("stock"));
  const status=String(form.get("status")||"draft");
  if(name.length<2||!Number.isFinite(price)||price<=0||!Number.isInteger(stock)||stock<0){setError("تحقق من الاسم والسعر والكمية.");return;}
  setBusy(true);
  const {error:insertError}=await sb.from("products").insert({seller_id:userId,name,description,price,stock,status});
  if(insertError)setError("لم تتم إضافة المنتج: "+insertError.message);
  else {setNotice("تمت إضافة المنتج.");e.currentTarget.reset();await load();}
  setBusy(false);
 }
 async function updateProduct(id:string,patch:Partial<Product>){
  const sb=getSupabase();if(!sb)return;setError("");setNotice("");
  const {error:updateError}=await sb.from("products").update(patch).eq("id",id);
  if(updateError){setError("تعذر تحديث المنتج: "+updateError.message);return;}
  setRows(old=>old.map(p=>p.id===id?{...p,...patch}:p));setNotice("تم حفظ التغيير.");
 }
 async function deleteProduct(id:string){
  if(!window.confirm("هل تريد حذف هذا المنتج نهائياً؟"))return;
  const sb=getSupabase();if(!sb)return;
  const {error:deleteError}=await sb.from("products").delete().eq("id",id);
  if(deleteError){setError("تعذر حذف المنتج: "+deleteError.message);return;}
  setRows(old=>old.filter(p=>p.id!==id));setNotice("تم حذف المنتج.");
 }
 const filtered=rows.filter(p=>p.name.toLowerCase().includes(query.toLowerCase())||p.id.includes(query));
 if(loading)return <main className="owner-shell" dir="rtl"><p>جارٍ تحميل المنتجات...</p></main>;
 return <main className="owner-shell" dir="rtl">
  <header className="owner-header"><Link href="/owner" className="owner-brand"><span>J&amp;M</span><div><b>J &amp; M</b><small>إدارة المنتجات</small></div></Link><Link href="/owner" className="owner-back">← لوحة المالك</Link></header>
  <section className="owner-welcome"><span className="owner-eyebrow">PRODUCT CONTROL</span><h1>إدارة المنتجات</h1><p>إضافة المنتجات وتحديث السعر والمخزون وحالة النشر. يظهر المنتج في المتجر العام عندما تكون حالته «منشور».</p></section>
  {error&&<div className="owner-feedback error" role="alert">{error}</div>}{notice&&<div className="owner-feedback" role="status">{notice}</div>}
  <section className="owner-next owner-product-create"><h2>إضافة منتج</h2><form onSubmit={createProduct} className="owner-product-form">
   <label>اسم المنتج<input name="name" required minLength={2} maxLength={160} placeholder="مثال: سماعات لاسلكية"/></label>
   <label>السعر (ريال)<input name="price" type="number" min="0.01" step="0.01" required placeholder="99.00"/></label>
   <label>الكمية المتوفرة<input name="stock" type="number" min="0" step="1" defaultValue="0" required/></label>
   <label>حالة المنتج<select name="status" defaultValue="draft"><option value="draft">مسودة</option><option value="pending">بانتظار المراجعة</option><option value="active">منشور</option><option value="archived">مؤرشف</option></select></label>
   <label className="wide-field">الوصف<textarea name="description" rows={2} maxLength={5000} placeholder="وصف مختصر للمنتج"/></label>
   <button disabled={busy} type="submit">{busy?"جارٍ الحفظ...":"إضافة المنتج"}</button>
  </form></section>
  <section className="owner-next owner-product-list"><div className="owner-list-heading"><h2>المنتجات ({filtered.length})</h2><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث بالاسم أو رقم المنتج"/></div>
   {filtered.length===0?<p className="owner-empty">لا توجد منتجات مطابقة.</p>:<div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>المنتج</th><th>السعر</th><th>المخزون</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>{filtered.map(p=><tr key={p.id}><td><b>{p.name}</b><small>{p.id.slice(0,8)}…</small></td><td><input className="mini-input" type="number" min="0.01" step="0.01" defaultValue={p.price} aria-label={"سعر "+p.name} onBlur={e=>{const v=Number(e.target.value);if(Number.isFinite(v)&&v>0&&v!==Number(p.price))void updateProduct(p.id,{price:v})}}/> ر.س</td><td><input className="mini-input" type="number" min="0" step="1" defaultValue={p.stock} aria-label={"مخزون "+p.name} onBlur={e=>{const v=Number(e.target.value);if(Number.isInteger(v)&&v>=0&&v!==p.stock)void updateProduct(p.id,{stock:v})}}/></td><td><select className="mini-select" value={p.status} onChange={e=>void updateProduct(p.id,{status:e.target.value})}>{statuses.map(s=><option key={s} value={s}>{statusLabels[s]}</option>)}</select></td><td><button className="owner-delete" onClick={()=>void deleteProduct(p.id)}>حذف</button></td></tr>)}</tbody></table></div>}
  </section>
  <p className="owner-safe-note">تنبيه: المنتجات التي تنشئها من هذه الشاشة تُسجل على حساب المالك الحالي. المنتجات المنشورة تصبح ظاهرة وفق سياسات الكتالوج الحالية.</p>
 </main>;
}
