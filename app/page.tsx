"use client";

import { useState } from "react";

export default function Page() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const text = encodeURIComponent(
      `الاسم: ${name}\nرقم الجوال: ${phone}`
    );

    const url = `https://wa.me/966559168717?text=${text}`;
    window.open(url, "_blank");
  }

  return (
    <main style={{ padding: 40, textAlign: "center" }}>
      <h1>🔥 تعلم كيف تربح من الذكاء الاصطناعي</h1>
      <p>ابدأ الآن بدون خبرة</p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="اسمك"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <br />

        <input
          type="text"
          placeholder="رقم جوالك"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <br />

        <button type="submit">إرسال على واتساب</button>
      </form>
    </main>
  );
}
