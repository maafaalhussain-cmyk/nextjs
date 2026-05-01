export default function Page() {
  async function send(formData: FormData) {
    "use server";

    const name = formData.get("name");
    const phone = formData.get("phone");

    const message = `الاسم: ${name}%0Aالجوال: ${phone}`;

    return Response.redirect(
      `https://wa.me/966559168717?text=${message}`
    );
  }

  return (
    <main style={{ padding: "40px", textAlign: "center" }}>
      <h1>🔥 تعلم كيف تربح من الذكاء الاصطناعي</h1>

      <p>ابدأ الآن بدون خبرة</p>

      <form action={send}>
        <input name="name" placeholder="اسمك" required />
        <br /><br />

        <input name="phone" placeholder="رقمك" required />
        <br /><br />

        <button type="submit">تواصل الآن</button>
      </form>
    </main>
  );
}
