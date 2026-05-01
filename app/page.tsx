"use client";

import { useState } from "react";

export default function Page() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const message = `السلام عليكم 👋
أنا اسمي ${name}

حاب أعرف أكثر عن عرضك 👇
رقم جوالي: ${phone}`;

    const url = `https://wa.me/966559168717?text=${encodeURIComponent(
      message
    )}`;

    window.location.href = url;
  };

  return (
    <main style={{ padding: "20px", textAlign: "center" }}>
      <h1>تواصل معنا</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="الاسم"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ display: "block", margin: "10px auto", padding: "10px" }}
        />

        <input
          type="tel"
          placeholder="رقم الجوال"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          style={{ display: "block", margin: "10px auto", padding: "10px" }}
        />

        <button
          type="submit"
          style={{
            padding: "10px 20px",
            backgroundColor: "green",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
         إرسال عبر واتساب
        </button>
      </form>
    </main>
  );
}
