"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
type Row={period_start:string;account_code:string;side:string;seller_id:string|null;product_id:string|null;amount_halalas:number;transaction_count:number;entry_count:number};
const accounts:Record<string,string>={cash_clearing:"تسوية النقد",customer_receivable:"ذمم العملاء",seller_payable:"مستحقات البائعين",platform_commission_revenue:"عمولات المنصة",tax_payable:"ضريبة مستحقة",shipping_payable:"مستحقات الشحن",discount_expense:"خصومات",refund_payable:"مبالغ مستردة",payout_clearing:"تسوية المدفوعات",adjustment:"تسويات"};
const sides:Record<string,string>={debit:"مدين",credit:"دائن"};
function isoStart(date:string){return new Date(date+"T00:00:00+03:00").toISOString()}
function isoEndExclusive(date:string){const d=new Date(date+"T00:00:00+03:00");d.setUTCDate(d.getUTCDate()+1);return d.toISOString()}
function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Riyadh",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function monthStart(){return today().slice(0,7)+"-01"}
export default function OwnerFinance(){
 const [from,setFrom]=useState(monthStart());const [to,setTo]=useState(today());const [granularity,setGranularity]=useState("day");const [rows,setRows]=useState<Row[]>([]);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [loaded,setLoaded]=useState(false);
 async function runReport(){
  setError("");setBusy(true);const sb=getSupabase();if(!sb){setError("إعدادات Supabase غير متوفرة.");setBusy(false);setLoading(false);return}
  const {data:{user}}=await sb.auth.getUser();if(!user){window.location.replace("/login");return}
  const {data:role,error:roleError}=await sb.from("user_roles").select("role").eq("user_id",user.id).maybeSingle();
  if(roleError||role?.role!=="owner"){setError("هذه الصفحة مخصصة لمالك السوق فقط.");setBusy(false);setLoading(false);return}
  if(!from||!to||from>to){setError("حدد نطاق تاريخ صحيحاً.");setBusy(false);setLoading(false);return}
  const {data,error:rpcError}=await sb.rpc("get_financial_report",{p_from:isoStart(from),p_to:isoEndExclusive(to),p_granularity:granularity,p_seller_id:null,p_product_id:null});
  if(rpcError)setError("تعذر تحميل التقرير المالي: "+rpcError.message);
  else {setRows((data||[]) as Row[]);setLoaded(true)}
  setBusy(false);setLoading(false);
 }
 useEffect(()=>{void runReport()},[]);
 const totalDebits=rows.filter(r=>r.side==="debit").reduce((sum,r)=>sum+Number(r.amount_halalas),0);
 const totalCredits=rows.filter(r=>r.side==="credit").reduce((sum,r)=>sum+Number(r.amount_halalas),0);
 if(loading)return <main className="owner-shell" dir="rtl"><p>جارٍ تحميل التقرير المالي...</p></main>;
 return <main className="owner-shell" dir="rtl"><header className="owner-header"><Link href="/owner" className="owner-brand"><span>J&amp;M</span><div><b>J &amp; M</b><small>التقارير المالية</small></div></Link><Link href="/owner" className="owner-back">← لوحة المالك</Link></header>
 <section className="owner-welcome"><span className="owner-eyebrow">FINANCIAL REPORTING</span><h1>المبيعات والأرباح</h1><p>يعرض هذا التقرير القيود المالية المُرحّلة فقط من دفتر الأستاذ. لا يتم احتساب أرباح تقديرية من الطلبات غير المسجلة محاسبياً.</p></section>
 <section className="owner-next"><h2>فترة التقرير</h2><form className="owner-report-form" onSubmit={e=>{e.preventDefault();void runReport()}}><label>من تاريخ<input type="date" value={from} onChange={e=>setFrom(e.target.value)} required/></label><label>إلى تاريخ<input type="date" value={to} onChange={e=>setTo(e.target.value)} required/></label><label>التجميع<select value={granularity} onChange={e=>setGranularity(e.target.value)}><option value="minute">كل دقيقة</option><option value="hour">كل ساعة</option><option value="day">يومي</option><option value="week">أسبوعي</option><option value="month">شهري</option></select></label><button type="submit" disabled={busy}>{busy?"جارٍ التحميل...":"تحديث التقرير"}</button></form></section>
 {error&&<div className="owner-feedback error" role="alert">{error}</div>}
 {loaded&&<><section className="owner-finance-cards"><div><small>إجمالي المدين (عرض محاسبي)</small><b>{(totalDebits/100).toLocaleString("ar-SA",{style:"currency",currency:"SAR"})}</b></div><div><small>إجمالي الدائن (عرض محاسبي)</small><b>{(totalCredits/100).toLocaleString("ar-SA",{style:"currency",currency:"SAR"})}</b></div><div><small>عدد القيود</small><b>{rows.reduce((s,r)=>s+Number(r.entry_count),0).toLocaleString("ar-SA")}</b></div></section>
 <section className="owner-next owner-product-list"><div className="owner-list-heading"><h2>تفاصيل دفتر الأستاذ ({rows.length})</h2></div>{rows.length===0?<p className="owner-empty">لا توجد قيود مالية مُرحّلة خلال الفترة المحددة.</p>:<div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>الفترة</th><th>الحساب</th><th>النوع</th><th>المبلغ</th><th>المعاملات</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td>{new Date(r.period_start).toLocaleString("ar-SA",{dateStyle:"medium",timeStyle:granularity==="minute"||granularity==="hour"?"short":undefined})}</td><td>{accounts[r.account_code]||r.account_code}</td><td>{sides[r.side]||r.side}</td><td>{(Number(r.amount_halalas)/100).toLocaleString("ar-SA",{style:"currency",currency:"SAR"})}</td><td>{Number(r.transaction_count).toLocaleString("ar-SA")}</td></tr>)}</tbody></table></div>}</section></>}
 <p className="owner-safe-note">هذا تقرير قيود محاسبية وليس بديلاً عن مراجعة محاسب. الأرباح الصافية تحتاج ربط الإيرادات بالتكاليف والمرتجعات والرسوم والضرائب بشكل كامل.</p></main>;
}
