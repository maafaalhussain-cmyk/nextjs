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
          style={{ padding: "10px", margin: "5px", width: "220px" }}
        />

        <br />

        <input
          type="text"
          placeholder="رقم الجوال"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ padding: "10px", margin: "5px", width: "220px" }}
        />

        <br />

        <button
          type="submit"
          style={{
            padding: "12px 25px",
            backgroundColor: "green",
            color: "white",
            border: "none",
            borderRadius: "6px",
            marginTop: "10px",
            fontSize: "16px",
          }}
        >
          إرسال على واتساب
        </button>
      </form>
    </main>
  );
}
