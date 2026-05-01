export default function Page() {
  return (
    <main style={{ padding: "40px", textAlign: "center" }}>
      <h1>🔥 تعلم كيف تربح من الذكاء الاصطناعي</h1>

      <p>بدون خبرة… وابدأ من اليوم</p>

      <button
        onClick={() => {
          window.location.href = "https://wa.me/966559168717";
        }}
        style={{ padding: "10px 20px", fontSize: "16px" }}
      >
        تواصل الآن
      </button>
    </main>
  );
}
