export default function Page() {
  return (
    <main style={{ padding: "40px", textAlign: "center" }}>
      <h1>🔥 تعلم كيف تربح من الذكاء الاصطناعي</h1>
      <p>ابدأ الآن بدون خبرة</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const name = e.target.name.value;
          const phone = e.target.phone.value;
          const msg = e.target.msg.value;

          const text = `الاسم: ${name}%0Aالرقم: ${phone}%0A${msg}`;
          window.open(
            `https://wa.me/966559168717?text=${text}`,
            "_blank"
          );
        }}
        style={{ marginTop: "20px" }}
      >
        <input
          name="name"
          placeholder="اسمك"
          required
          style={{ padding: "10px", margin: "5px", width: "220px" }}
        />
        <br />

        <input
          name="phone"
          placeholder="رقمك"
          required
          style={{ padding: "10px", margin: "5px", width: "220px" }}
        />
        <br />

        <textarea
          name="msg"
          placeholder="وش تبي تتعلم؟"
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
