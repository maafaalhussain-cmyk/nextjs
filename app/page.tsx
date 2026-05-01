export default function Page() {
  return (
    <main style={{ padding: "40px", textAlign: "center" }}>
      <h1>🔥 تعلم كيف تربح من الذكاء الاصطناعي</h1>
      <p>ابدأ الآن بدون خبرة</p>

      <form
        action="https://wa.me/966559168717"
        method="get"
        target="_blank"
        style={{ marginTop: "20px" }}
      >
        <input
          type="text"
          name="text"
          placeholder="اكتب اسمك ورقمك"
          required
          style={{ padding: "10px", margin: "5px", width: "220px" }}
        />

        <br />

        <button
          type="submit"
          style={{
            padding: "12px 20px",
            backgroundColor: "green",
            color: "white",
            border: "none",
            borderRadius: "6px",
            marginTop: "10px",
          }}
        >
          إرسال على واتساب
        </button>
      </form>
    </main>
  );
}
