"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function signUp() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "http://localhost:3000/dashboard",
      },
    });
  
    if (error) {
      alert(error.message);
    } else {
      alert("Check your email confirmation");
    }
  }
  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      window.location.href = "/dashboard";
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f7fa",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "40px",
          borderRadius: "20px",
          width: "400px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        <h1>Retail Systems Login</h1>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: "14px",
            borderRadius: "10px",
            border: "1px solid #ddd",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: "14px",
            borderRadius: "10px",
            border: "1px solid #ddd",
          }}
        />

        <button
          onClick={signIn}
          style={{
            background: "#111827",
            color: "white",
            padding: "14px",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          Login
        </button>

        <button
          onClick={signUp}
          style={{
            background: "#2563eb",
            color: "white",
            padding: "14px",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          Create Account
        </button>
      </div>
    </main>
  );
}