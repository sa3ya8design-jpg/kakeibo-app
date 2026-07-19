"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const C = {
  bg: "#F7EFE6", card: "#FFFDFA", ink: "#453729", sub: "#A08D7B",
  line: "#EADFD2", primary: "#6B5138",
};

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState("create"); // create | join
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputStyle = {
    width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 14,
    padding: "12px 14px", fontSize: 16, color: C.ink, background: "#fff",
    fontFamily: "inherit", boxSizing: "border-box", outline: "none",
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "create") {
      const { error } = await supabase.rpc("create_household", {
        p_name: "今井Family家計簿",
        p_display_name: displayName,
      });
      setLoading(false);
      if (error) { setError(error.message); return; }
    } else {
      const { error } = await supabase.rpc("join_household", {
        p_invite_code: inviteCode.trim(),
        p_display_name: displayName,
      });
      setLoading(false);
      if (error) { setError("招待コードが正しくないか、すでに参加済みです"); return; }
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Zen Maru Gothic',sans-serif", color: C.ink }}>
      <div style={{ width: "100%", maxWidth: 360, background: C.card, borderRadius: 20, padding: 28, boxShadow: "0 6px 18px rgba(90,66,43,.07)" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>ようこそ</h1>
        <p style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>
          最初のログインですね。世帯を新しく作るか、配偶者から受け取った招待コードで参加してください。
        </p>

        <div style={{ display: "flex", background: C.bg, borderRadius: 14, padding: 4, marginBottom: 18 }}>
          {[["create", "はじめて作る"], ["join", "招待コードで参加"]].map(([v, l]) => (
            <button key={v} onClick={() => { setMode(v); setError(""); }} style={{
              flex: 1, padding: "9px 0", borderRadius: 11, border: "none", fontFamily: "inherit",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              background: mode === v ? C.card : "transparent",
              color: mode === v ? C.ink : C.sub,
              boxShadow: mode === v ? "0 2px 6px rgba(90,66,43,.1)" : "none",
            }}>{l}</button>
          ))}
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>あなたの表示名</label>
            <input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="例:夫 / 妻 / お名前" style={inputStyle} />
          </div>

          {mode === "join" && (
            <div>
              <label style={labelStyle}>招待コード</label>
              <input required value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="配偶者の設定画面に表示されるコード" style={inputStyle} />
            </div>
          )}

          {error && <div style={{ color: "#E08E7D", fontSize: 13, fontWeight: 600 }}>{error}</div>}

          <button type="submit" disabled={loading} style={{
            padding: "14px 0", borderRadius: 16, border: "none", fontFamily: "inherit",
            fontSize: 15, fontWeight: 700, cursor: "pointer", background: C.primary, color: "#FFFDFA",
          }}>
            {loading ? "処理中…" : mode === "create" ? "世帯を作成する" : "参加する"}
          </button>
        </form>

        {mode === "create" && (
          <p style={{ fontSize: 12, color: C.sub, marginTop: 14, lineHeight: 1.6 }}>
            作成後、設定画面に招待コードが表示されます。配偶者にそのコードを伝えてもらい、「招待コードで参加」から登録してもらってください。
          </p>
        )}
      </div>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 12, fontWeight: 700, color: "#A08D7B", marginBottom: 6 };
