"use client";

import { useState } from "react";

export default function Page() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    const message = `الاسم: ${name}%0Aالرقم: ${phone}`;
    window.location.href = `https://wa.me/966559168717?text=${message}`;
  };

  return (
    <main style={{ padding: "40px", textAlign: "center" }}>
      <h1>🔥 تعلم كيف تربح من الذكاء الاصطناعي</h1>
      <p>ابدأ الآن بدون خبرة</p>

      <form onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
        <input
          type="text"
          placeholder="اسمك"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: "10px", margin: "5px", width: "200px" }}
        />

        <br />

        <input
          type="tel"
          placeholder="رقمك"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ padding: "10px", margin: "5px", width: "200px" }}
        />

        <br />

        <button
          type="submit"
          style={{
            marginTop: "10px",
            padding: "10px 20px",
            backgroundColor: "green",
            color: "white",
            border: "none",
            borderRadius: "5px",
          }}
        >
          إرسال واتساب
        </button>
      </form>
    </main>
  );
}
