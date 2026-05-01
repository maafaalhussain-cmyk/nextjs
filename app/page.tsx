"use client";

import { useState } from "react";

export default function Page() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const message = `الاسم: ${name}%0Aرقم الجوال: ${phone}`;
    const url = `https://wa.me/966559168717?text=${message}`;

    window.open(url, "_blank");
  };

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h1>🔥 تعلم كيف تربح من الذكاء الاصطناعي</h1>
      <p>ابدأ الآن بدون خبرة</p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="اسمك"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: "10px", margin: "5px", width: "220px" }}
          required
        />

        <br />

        <input
          type="text"
          placeholder="رقم جوالك"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ padding: "10px", margin: "5px", width: "220px" }}
          required
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
    </div>
  );
}
