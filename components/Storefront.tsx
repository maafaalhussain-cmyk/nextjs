"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  image_url: string | null;
  stock: number;
};

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [setupMissing, setSetupMissing] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProducts() {
      const supabase = getSupabase();
      if (!supabase) {
        if (active) {
          setSetupMissing(true);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("id,name,description,price,image_url,stock")
        .eq("status", "active")
        .gt("stock", 0)
        .order("created_at", { ascending: false })
        .limit(48);

      if (!active) return;
      if (error) setLoadError("تعذر تحميل المنتجات حالياً. يرجى المحاولة لاحقاً.");
      else setProducts((data ?? []) as Product[]);
      setLoading(false);
    }

    void loadProducts();
    return () => { active = false; };
  }, []);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("ar");
    if (!term) return products;
    return products.filter((product) =>
      `${product.name} ${product.description ?? ""}`.toLocaleLowerCase("ar").includes(term)
    );
  }, [products, search]);

  return (
    <main className="storefront" dir="rtl">
      <div className="store-topline">تسوّق بثقة · اكتشف متاجر ومنتجات متنوعة</div>
      <header className="store-header">
        <Link href="/" className="store-brand" aria-label="J and M الصفحة الرئيسية">
          <span className="store-brand-mark">J&amp;M</span>
          <span><strong>J &amp; M</strong><small>كل اختياراتك في مكان واحد</small></span>
        </Link>
        <nav className="store-nav" aria-label="التنقل الرئيسي">
          <a href="#products">المنتجات</a>
          <Link href="/about">عن J&amp;M</Link>
          <Link href="/contact">تواصل معنا</Link>
        </nav>
        <div className="store-actions">
          <Link href="/login" className="store-login">دخول</Link>
          <Link href="/register" className="store-join">انضم إلينا</Link>
        </div>
      </header>

      <section className="store-hero">
        <div className="store-hero-copy">
          <span className="store-eyebrow">مرحباً بك في J&amp;M</span>
          <h1>كل ما تبحث عنه،<br/><em>في مكان واحد.</em></h1>
          <p>منصة تجمع العملاء والمتاجر في تجربة تسوق واضحة وسهلة. اكتشف المنتجات وتعرّف على البائعين.</p>
          <div className="store-hero-actions">
            <a href="#products" className="store-primary">اكتشف المنتجات <span>←</span></a>
            <Link href="/register" className="store-secondary">ابدأ البيع معنا</Link>
          </div>
        </div>
        <div className="store-hero-art" aria-hidden="true">
          <div className="store-art-circle"><span>J&amp;M</span><b>تسوّق<br/>بأسلوبك</b></div>
          <span className="store-art-tag">اختيارات أكثر ✦</span>
        </div>
      </section>

      <section id="products" className="store-products">
        <div className="store-section-heading">
          <div><span className="store-eyebrow">تصفّح السوق</span><h2>منتجات مختارة</h2><p>المنتجات المتاحة حالياً من البائعين المعتمدين.</p></div>
          <label className="store-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث عن منتج..." aria-label="ابحث عن منتج"/></label>
        </div>

        {loading ? <div className="store-state" role="status">جارٍ تحميل المنتجات...</div> :
          setupMissing ? <div className="store-state"><strong>المتجر قيد الإعداد</strong><p>سيتم عرض المنتجات بعد ربط قاعدة بيانات المتجر بإعدادات النشر.</p></div> :
          loadError ? <div className="store-state" role="alert">{loadError}</div> :
          visibleProducts.length === 0 ? <div className="store-state"><strong>{search ? "لا توجد نتائج مطابقة" : "نعمل على إضافة المنتجات"}</strong><p>{search ? "جرّب كلمة بحث أخرى." : "ستظهر هنا المنتجات المنشورة والمتاحة من متاجر J&M."}</p></div> :
          <div className="store-product-grid">
            {visibleProducts.map((product) => (
              <article className="store-product-card" key={product.id}>
                <div className="store-product-image">
                  {product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy"/> : <span>J&amp;M</span>}
                </div>
                <div className="store-product-info">
                  <h3>{product.name}</h3>
                  <p>{product.description || "منتج من أحد متاجر J&M"}</p>
                  <strong>{Number(product.price).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</strong>
                  <small>متوفر · {product.stock}</small>
                </div>
              </article>
            ))}
          </div>}
      </section>

      <section className="store-seller-cta">
        <div><span className="store-eyebrow">هل لديك متجر؟</span><h2>خلّ منتجاتك توصل لعملاء أكثر.</h2><p>قدّم طلب الانضمام كبائع، وبعد مراجعة الإدارة يمكنك بدء عرض منتجاتك.</p></div>
        <Link href="/register" className="store-primary">سجّل كبائع <span>←</span></Link>
      </section>

      <footer className="store-footer">
        <Link href="/" className="store-footer-brand">J&amp;M</Link>
        <span>© {new Date().getFullYear()} J&amp;M · جميع الحقوق محفوظة</span>
        <div><Link href="/privacy">الخصوصية</Link><Link href="/shipping">الشحن</Link><Link href="/returns">الاسترجاع</Link></div>
      </footer>
    </main>
  );
}
