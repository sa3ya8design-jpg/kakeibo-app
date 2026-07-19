"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const C = {
  bg: "#F7EFE6", card: "#FFFDFA", ink: "#453729", sub: "#A08D7B",
  line: "#EADFD2", primary: "#6B5138",
};

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signedUp, setSignedUp] = useState(false);

  const inputStyle = {
    width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 14,
    padding: "12px 14px", fontSize: 16, color: C.ink, background: "#fff",
    fontFamily: "inherit", boxSizing: "border-box", outline: "none",
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) { setError("メールアドレスかパスワードが違います"); return; }
      router.push("/");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) { setError(error.message); return; }
      setSignedUp(true);
    }
  };

  if (signedUp) {
    return (
      <Wrap>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>登録が完了しました</h1>
        <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.7 }}>
          そのままログインに進んでください。
          (手順3で「Confirm email」をオフにしている場合は確認メールなしでログインできます)
        </p>
        <button onClick={() => { setSignedUp(false); setMode("login"); }} style={btnStyle}>
          ログイン画面へ
        </button>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>今井Family家計簿</h1>
      <p style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>
        {mode === "login" ? "ログイン" : "新規登録"}
      </p>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>メールアドレス</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>パスワード(6文字以上)</label>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        </div>

        {error && <div style={{ color: "#E08E7D", fontSize: 13, fontWeight: 600 }}>{error}</div>}

        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? "処理中…" : mode === "login" ? "ログイン" : "登録する"}
        </button>
      </form>

      <button
        onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
        style={{ marginTop: 16, background: "none", border: "none", color: C.primary, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
      >
        {mode === "login" ? "はじめての方はこちら(新規登録)" : "アカウントをお持ちの方はこちら(ログイン)"}
      </button>
    </Wrap>
  );
}

const labelStyle = { display: "block", fontSize: 12, fontWeight: 700, color: C.sub, marginBottom: 6 };
const btnStyle = {
  padding: "14px 0", borderRadius: 16, border: "none", fontFamily: "inherit",
  fontSize: 15, fontWeight: 700, cursor: "pointer", background: C.primary, color: "#FFFDFA",
};

function Wrap({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Zen Maru Gothic',sans-serif", color: C.ink }}>
      <div style={{ width: "100%", maxWidth: 360, background: C.card, borderRadius: 20, padding: 28, boxShadow: "0 6px 18px rgba(90,66,43,.07)" }}>
        {children}
      </div>
    </div>
  );
}
