"use client";

import { useMemo, useState } from "react";

const products = [
  { id: 1, name: "نظارة شمسية كلاسيكية", category: "الأزياء", price: 79, oldPrice: 119, image: "/IMG_3026.jpeg", tag: "الأكثر طلباً" },
  { id: 2, name: "ساعة يومية أنيقة", category: "الإلكترونيات", price: 149, oldPrice: 199, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=700&auto=format&fit=crop&q=85", tag: "عرض خاص" },
  { id: 3, name: "حقيبة عملية", category: "الأزياء", price: 129, oldPrice: 169, image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=700&auto=format&fit=crop&q=85", tag: "وصل حديثاً" },
  { id: 4, name: "سماعة لاسلكية", category: "الإلكترونيات", price: 99, oldPrice: 139, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&auto=format&fit=crop&q=85", tag: "الأكثر مبيعاً" },
  { id: 5, name: "مجموعة عناية شخصية", category: "الجمال والعناية", price: 89, oldPrice: 115, image: "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=700&auto=format&fit=crop&q=85", tag: "اختيارنا" },
  { id: 6, name: "حذاء رياضي مريح", category: "الأزياء", price: 189, oldPrice: 239, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&auto=format&fit=crop&q=85", tag: "خصم مميز" },\n  { id: 7, name: "مصباح طاولة عصري", category: "المنزل", price: 115, oldPrice: 145, image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=700&auto=format&fit=crop&q=85", tag: "للمنزل" },
];

const categories = ["الكل", "الأزياء", "الإلكترونيات", "الجمال والعناية", "المنزل"];

export default function Page() {
  const [active, setActive] = useState("الكل");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<number[]>([]);
  const [cartOpen, setCartOpen] = useState(false);\n  const [favorites, setFavorites] = useState<number[]>([]);
  const cartProducts = cart.map((id) => products.find((p) => p.id === id)!).filter(Boolean);
  const cartTotal = cartProducts.reduce((sum, p) => sum + p.price, 0);
  const shown = useMemo(() => products.filter((p) =>
    (active === "الكل" || p.category === active) &&
    p.name.includes(search.trim())
  ), [active, search]);

  return (
    <main dir="rtl">
      {cartOpen && <div className="cart-overlay" onClick={() => setCartOpen(false)}><section className="cart-drawer" onClick={(e) => e.stopPropagation()} aria-label="سلة المشتريات"><div className="cart-heading"><h2>سلة المشتريات</h2><button onClick={() => setCartOpen(false)} aria-label="إغلاق السلة">×</button></div>{cartProducts.length === 0 ? <p className="cart-empty">سلتك فارغة حالياً. ابدأ بإضافة المنتجات التي أعجبتك.</p> : <><div className="cart-items">{cartProducts.map((p, i) => <div className="cart-item" key={`${p.id}-${i}`}><img src={p.image} alt={p.name}/><div><b>{p.name}</b><span>{p.price} ر.س</span></div><button aria-label="حذف المنتج" onClick={() => setCart((items) => { const next = [...items]; next.splice(i, 1); return next; })}>حذف</button></div>)}</div><div className="cart-total"><span>الإجمالي</span><b>{cartTotal.toLocaleString("ar-SA")} ر.س</b></div><p className="cart-disclaimer">هذه سلة تجريبية للمعاينة؛ الدفع وإتمام الطلب الإلكتروني غير مفعّلين بعد.</p></>}<button className="cart-continue" onClick={() => setCartOpen(false)}>متابعة التسوق</button></section></div>}
      <div className="top-strip">تسوّق بثقة من متاجر وبائعين محليين في جميع أنحاء المملكة</div>
      <header className="site-header">
        <a className="brand" href="#"><span className="brand-mark">J&amp;M</span><span>J & M<small>كل ما تحتاجه في مكان واحد</small></span></a>
        <nav className="main-nav"><a href="#products">المنتجات</a><a href="#categories">التصنيفات</a><a href="#seller">كن بائعاً</a></nav>
        <div className="header-actions"><a className="login-link" href="#seller">دخول / تسجيل</a><button className="cart-button" aria-label="فتح سلة المشتريات" onClick={() => setCartOpen(true)}>🛍️ <span>السلة</span><b>{cart.length}</b></button></div>
      </header>

      <section className="hero">
        <div className="hero-copy"><span className="eyebrow">تجربة تسوّق مختلفة</span><h1>كل اختياراتك<br/><em>في مكان واحد</em></h1><p>اكتشف منتجات متنوعة من بائعين موثوقين، وقارن خياراتك وتسوق بسهولة.</p><a className="primary-button" href="#products">اكتشف المنتجات <span>←</span></a><div className="hero-note"><span>✓</span> متاجر متنوعة&nbsp; · &nbsp;خيارات أكثر&nbsp; · &nbsp;تسوّق أسهل</div></div>
        <div className="hero-art"><div className="hero-orbit orbit-one"></div><div className="hero-orbit orbit-two"></div><div className="hero-card"><span className="floating-label">اختيارات تستحق</span><img src="/IMG_3026.jpeg" alt="نظارة شمسية" /><div className="hero-product-caption"><b>أناقتك تبدأ من هنا</b><span>منتجات مختارة لك</span></div></div><div className="hero-sticker">تسوّق<br/>واكتشف</div></div>
      </section>

      <section className="trust-row"><div><span>🚚</span><b>شحن من البائع</b><small>تفاصيل الشحن لكل منتج</small></div><div><span>🔒</span><b>تسوّق آمن</b><small>حسابات بائعين موثقة</small></div><div><span>✨</span><b>تنوع أكبر</b><small>منتجات من متاجر متعددة</small></div></section>

      <section className="catalog section-wrap" id="products">
        <div className="section-heading"><div><span className="eyebrow">تصفّح واكتشف</span><h2>منتجات مختارة</h2><p>اكتشف أحدث المنتجات والعروض من بائعينا</p></div><div className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن منتج..." /></div></div>
        <div className="category-list" id="categories">{categories.map((c) => <button key={c} onClick={() => setActive(c)} className={active === c ? "category active" : "category"}>{c}</button>)}</div>
        <div className="product-grid">{shown.map((p) => <article className="product-card" key={p.id}><div className="product-image"><img src={p.image} alt={p.name}/><span className="product-tag">{p.tag}</span><button className={favorites.includes(p.id) ? "heart favorited" : "heart"} aria-label={favorites.includes(p.id) ? "إزالة من المفضلة" : "أضف للمفضلة"} aria-pressed={favorites.includes(p.id)} onClick={() => setFavorites((items) => items.includes(p.id) ? items.filter((id) => id !== p.id) : [...items, p.id])}>{favorites.includes(p.id) ? "♥" : "♡"}</button></div><div className="product-info"><span className="product-category">{p.category}</span><h3>{p.name}</h3><div className="price-line"><b>{p.price} ر.س</b><del>{p.oldPrice} ر.س</del></div><button className="add-button" onClick={() => setCart((old) => [...old, p.id])}>أضف للسلة <span>＋</span></button></div></article>)}</div>
        {shown.length === 0 && <p className="empty-state">لا توجد منتجات مطابقة. جرّب كلمة بحث أخرى.</p>}
      </section>

      <section className="seller-banner" id="seller"><div><span className="eyebrow">لأصحاب المتاجر ورواد الأعمال</span><h2>عندك منتجات؟<br/>خلّها توصل لعملاء أكثر.</h2><p>انضم إلى J & M واعرض منتجاتك أمام عملاء من مختلف مناطق المملكة. أنت تتولى تجهيز وشحن طلباتك، ونحن نوفر لك واجهة البيع.</p><a className="light-button" href="#seller">التسجيل للبائعين قريباً <span>←</span></a></div><div className="seller-icon">🏪</div></section>

      <footer className="footer"><a className="brand footer-brand" href="#"><span className="brand-mark">J&amp;M</span><span>J & M<small>كل ما تحتاجه في مكان واحد</small></span></a><span>© {new Date().getFullYear()} J & M. جميع الحقوق محفوظة.</span><span>منصة تجمع البائعين والمشترين</span></footer>
    </main>
  );
}
