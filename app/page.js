"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  PenLine, ReceiptText, PieChart, Settings2, X, Sparkles,
  ChevronLeft, ChevronRight, LogOut, Trash2, Copy,
} from "lucide-react";

/* ── 配色トークン ──────────────────────────── */
const C = {
  bg: "#F7EFE6", card: "#FFFDFA", ink: "#453729", sub: "#A08D7B",
  line: "#EADFD2", primary: "#6B5138", shared: "#DCA94F", income: "#5E8A67",
  danger: "#E08E7D",
};
const MEMBER_COLORS = ["#7C9A82", "#E08E7D", "#8E9BB5", "#B58EA8"];

/* ── 日付ユーティリティ ───────────────────────── */
const pad = (n) => String(n).padStart(2, "0");
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const curYM = () => todayStr().slice(0, 7);
const shiftYM = (ym, delta) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const ymLabel = (ym) => `${ym.split("-")[0]}年${Number(ym.split("-")[1])}月`;
const yen = (n) => "¥" + Number(n || 0).toLocaleString("ja-JP");

/* ── 小さな共通部品 ─────────────────────────── */
function Card({ children, style }) {
  return (
    <div style={{ background: C.card, borderRadius: 20, padding: 18, boxShadow: "0 6px 18px rgba(90,66,43,.07)", ...style }}>
      {children}
    </div>
  );
}
function SectionLabel({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, letterSpacing: "0.08em", marginBottom: 8 }}>{children}</div>;
}
// 支払者スタンプ(判子風の丸)
function Stamp({ p, size = 34, active = true, onClick }) {
  return (
    <button onClick={onClick} aria-label={p.label} style={{
      width: size, height: size, borderRadius: "50%",
      background: active ? p.color : "transparent",
      color: active ? "#FFFDFA" : p.color,
      border: `2px solid ${p.color}`,
      fontSize: size * 0.42, fontWeight: 700,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      cursor: onClick ? "pointer" : "default",
      transition: "all .15s ease", fontFamily: "inherit", flexShrink: 0, padding: 0,
    }}>
      {(p.label || "?")[0]}
    </button>
  );
}

const inputStyle = {
  width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 14,
  padding: "12px 14px", fontSize: 16, color: C.ink, background: "#fff",
  fontFamily: "inherit", boxSizing: "border-box", outline: "none",
};

/* ── 入力フォーム(新規・編集で共用) ─────────────── */
function EntryForm({ categories, payers, defaultPayerKey, initial, onSave, onDelete }) {
  const [type, setType] = useState(initial?.type || "expense");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [categoryId, setCategoryId] = useState(initial?.category_id || "");
  const [item, setItem] = useState(initial?.item || "");
  const [payerKey, setPayerKey] = useState(initial ? (initial.payer_user_id || "shared") : defaultPayerKey);
  const [date, setDate] = useState(initial?.date || todayStr());
  const [saving, setSaving] = useState(false);

  const valid = Number(amount) > 0 && item.trim() && (type === "income" || categoryId);

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    await onSave({
      type,
      amount: Number(amount),
      category_id: type === "income" ? null : categoryId,
      item: item.trim(),
      payer_key: payerKey,
      date,
    });
    setSaving(false);
    if (!initial) { setAmount(""); setItem(""); setCategoryId(""); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", background: C.bg, borderRadius: 14, padding: 4 }}>
        {[["expense", "支出"], ["income", "収入"]].map(([v, l]) => (
          <button key={v} onClick={() => setType(v)} style={{
            flex: 1, padding: "9px 0", borderRadius: 11, border: "none", fontFamily: "inherit",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
            background: type === v ? C.card : "transparent",
            color: type === v ? (v === "income" ? C.income : C.ink) : C.sub,
            boxShadow: type === v ? "0 2px 6px rgba(90,66,43,.1)" : "none",
          }}>{l}</button>
        ))}
      </div>

      <div>
        <SectionLabel>金額</SectionLabel>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 20, color: C.sub }}>¥</span>
          <input value={amount} inputMode="numeric"
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="0"
            style={{ ...inputStyle, paddingLeft: 34, fontSize: 24, fontWeight: 700 }} />
        </div>
      </div>

      {type === "expense" && (
        <div>
          <SectionLabel>カテゴリー</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {categories.map((c) => (
              <button key={c.id} onClick={() => setCategoryId(c.id)} style={{
                padding: "8px 13px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                fontFamily: "inherit", cursor: "pointer",
                border: `1.5px solid ${categoryId === c.id ? C.primary : C.line}`,
                background: categoryId === c.id ? C.primary : "#fff",
                color: categoryId === c.id ? "#FFFDFA" : C.ink,
                transition: "all .12s ease",
              }}>{c.name}</button>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionLabel>項目</SectionLabel>
        <input value={item} onChange={(e) => setItem(e.target.value)}
          placeholder={type === "income" ? "給与 など" : "スーパー など"} style={inputStyle} />
      </div>

      <div>
        <SectionLabel>{type === "income" ? "受取者" : "支払者"}</SectionLabel>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
          {payers.map((p) => (
            <div key={p.key} style={{ textAlign: "center", width: 56 }}>
              <Stamp p={p} size={46} active={payerKey === p.key} onClick={() => setPayerKey(p.key)} />
              <div style={{ fontSize: 11, color: payerKey === p.key ? C.ink : C.sub, marginTop: 4, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>日付</SectionLabel>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
      </div>

      <button onClick={save} disabled={!valid || saving} style={{
        padding: "15px 0", borderRadius: 16, border: "none", fontFamily: "inherit",
        fontSize: 16, fontWeight: 700, cursor: valid ? "pointer" : "default",
        background: valid ? C.primary : C.line, color: valid ? "#FFFDFA" : C.sub,
        transition: "background .15s ease",
      }}>{saving ? "保存中…" : initial ? "変更を保存" : "記入する"}</button>

      {initial && (
        <button onClick={onDelete} style={{
          padding: "11px 0", borderRadius: 16, fontFamily: "inherit", fontSize: 14, fontWeight: 700,
          background: "transparent", border: `1.5px solid ${C.danger}`, color: C.danger, cursor: "pointer",
        }}>この明細を削除</button>
      )}
    </div>
  );
}

/* ── メイン ──────────────────────────────── */
export default function Home() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [ready, setReady] = useState(false);
  const [myId, setMyId] = useState(null);
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [entries, setEntries] = useState([]);
  const [yearEntries, setYearEntries] = useState([]);
  const [balances, setBalances] = useState([]);

  const [tab, setTab] = useState("input");
  const [ym, setYm] = useState(curYM());
  const [statsMode, setStatsMode] = useState("month");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState("");

  // 残高記録フォーム
  const [balDate, setBalDate] = useState(`${curYM()}-10`);
  const [balName, setBalName] = useState("");
  const [balAmount, setBalAmount] = useState("");

  // 設定画面フォーム
  const [nameEdit, setNameEdit] = useState("");
  const [newCat, setNewCat] = useState("");
  const [tCat, setTCat] = useState("");
  const [tItem, setTItem] = useState("");
  const [tAmount, setTAmount] = useState("");
  const [tPayer, setTPayer] = useState("shared");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 1800); };

  /* --- 初期読み込み --- */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);

      const { data: mem } = await supabase
        .from("household_members").select("household_id")
        .eq("user_id", user.id).limit(1);
      if (!mem || mem.length === 0) { router.push("/onboarding"); return; }
      const hid = mem[0].household_id;

      // 今月の固定費を未生成なら生成
      await supabase.rpc("generate_fixed_costs", { p_household: hid, p_month: curYM() });

      const [hh, mems, cats, tmpl] = await Promise.all([
        supabase.from("households").select("*").eq("id", hid).single(),
        supabase.from("household_members").select("*").eq("household_id", hid).order("created_at"),
        supabase.from("categories").select("*").eq("household_id", hid).order("sort_order"),
        supabase.from("fixed_cost_templates").select("*").eq("household_id", hid).order("sort_order"),
      ]);
      setHousehold(hh.data);
      setMembers(mems.data || []);
      setCategories(cats.data || []);
      setTemplates(tmpl.data || []);
      const me = (mems.data || []).find((m) => m.user_id === user.id);
      setNameEdit(me ? me.display_name : "");
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- データ取得 --- */
  const fetchEntries = useCallback(async () => {
    if (!household) return;
    const { data } = await supabase
      .from("transactions")
      .select("*, categories(name)")
      .eq("household_id", household.id)
      .gte("date", `${ym}-01`)
      .lt("date", `${shiftYM(ym, 1)}-01`)
      .order("date").order("created_at");
    setEntries(data || []);
  }, [supabase, household, ym]);

  const fetchYear = useCallback(async () => {
    if (!household) return;
    const year = ym.split("-")[0];
    const { data } = await supabase
      .from("transactions")
      .select("*, categories(name)")
      .eq("household_id", household.id)
      .gte("date", `${year}-01-01`)
      .lt("date", `${Number(year) + 1}-01-01`)
      .order("date");
    setYearEntries(data || []);
  }, [supabase, household, ym]);

  const fetchBalances = useCallback(async () => {
    if (!household) return;
    const { data } = await supabase
      .from("balance_records")
      .select("*")
      .eq("household_id", household.id)
      .order("record_date", { ascending: false })
      .limit(60);
    setBalances(data || []);
  }, [supabase, household]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);
  useEffect(() => { if (statsMode === "year") fetchYear(); }, [statsMode, fetchYear]);
  useEffect(() => { fetchBalances(); }, [fetchBalances]);

  /* --- 支払者リスト(メンバー+共通) --- */
  const payers = useMemo(() => [
    ...members.map((m, i) => ({ key: m.user_id, label: m.display_name, color: MEMBER_COLORS[i % MEMBER_COLORS.length] })),
    { key: "shared", label: "共通", color: C.shared },
  ], [members]);
  const payerOf = (e) => payers.find((p) => p.key === (e.payer_user_id || "shared")) || payers[payers.length - 1];

  /* --- 明細のCRUD --- */
  const refreshAfterChange = () => { fetchEntries(); if (statsMode === "year") fetchYear(); };

  const addEntry = async (d) => {
    const { error } = await supabase.from("transactions").insert({
      household_id: household.id, date: d.date, type: d.type,
      category_id: d.category_id, item: d.item, amount: d.amount,
      payer_user_id: d.payer_key === "shared" ? null : d.payer_key,
    });
    if (error) { showToast("保存に失敗しました"); return; }
    showToast("記入しました");
    if (!d.date.startsWith(ym)) setYm(d.date.slice(0, 7));
    refreshAfterChange();
  };

  const updateEntry = async (d) => {
    const { error } = await supabase.from("transactions").update({
      date: d.date, type: d.type, category_id: d.category_id,
      item: d.item, amount: d.amount,
      payer_user_id: d.payer_key === "shared" ? null : d.payer_key,
    }).eq("id", editing.id);
    if (error) { showToast("保存に失敗しました"); return; }
    setEditing(null); showToast("変更を保存しました"); refreshAfterChange();
  };

  const deleteEntry = async () => {
    const { error } = await supabase.from("transactions").delete().eq("id", editing.id);
    if (error) { showToast("削除に失敗しました"); return; }
    setEditing(null); showToast("削除しました"); refreshAfterChange();
  };

  /* --- 残高記録 --- */
  const saveBalance = async () => {
    if (!balDate || !balName.trim() || !(Number(balAmount) >= 0) || balAmount === "") return;
    const { error } = await supabase.from("balance_records").upsert({
      household_id: household.id, record_date: balDate,
      account_name: balName.trim(), amount: Number(balAmount),
    }, { onConflict: "household_id,record_date,account_name" });
    if (error) { showToast("保存に失敗しました"); return; }
    showToast("残高を記録しました");
    setBalName(""); setBalAmount("");
    fetchBalances();
  };
  const deleteBalance = async (id) => {
    const { error } = await supabase.from("balance_records").delete().eq("id", id);
    if (error) { showToast("削除に失敗しました"); return; }
    fetchBalances();
  };
  const accountNames = useMemo(() => [...new Set(balances.map((b) => b.account_name))].slice(0, 6), [balances]);

  /* --- 設定 --- */
  const saveDisplayName = async () => {
    if (!nameEdit.trim()) return;
    const { error } = await supabase.from("household_members")
      .update({ display_name: nameEdit.trim() })
      .eq("household_id", household.id).eq("user_id", myId);
    if (error) { showToast("保存に失敗しました"); return; }
    showToast("表示名を変更しました");
    const { data } = await supabase.from("household_members").select("*").eq("household_id", household.id).order("created_at");
    setMembers(data || []);
  };

  const addCategory = async () => {
    const name = newCat.trim();
    if (!name) return;
    const { error } = await supabase.from("categories").insert({
      household_id: household.id, name,
      sort_order: (categories[categories.length - 1]?.sort_order || 0) + 1,
    });
    if (error) { showToast("同じ名前のカテゴリーがあります"); return; }
    setNewCat(""); showToast("カテゴリーを追加しました");
    const { data } = await supabase.from("categories").select("*").eq("household_id", household.id).order("sort_order");
    setCategories(data || []);
  };

  const refreshTemplates = async () => {
    const { data } = await supabase.from("fixed_cost_templates").select("*").eq("household_id", household.id).order("sort_order");
    setTemplates(data || []);
  };
  const addTemplate = async () => {
    if (!tCat || !tItem.trim() || !(Number(tAmount) > 0)) return;
    const { error } = await supabase.from("fixed_cost_templates").insert({
      household_id: household.id, category_id: tCat, item: tItem.trim(),
      amount: Number(tAmount),
      payer_user_id: tPayer === "shared" ? null : tPayer,
      sort_order: (templates[templates.length - 1]?.sort_order || 0) + 1,
    });
    if (error) { showToast("追加に失敗しました"); return; }
    setTItem(""); setTAmount(""); showToast("固定費を追加しました(来月から反映)");
    refreshTemplates();
  };
  const deleteTemplate = async (id) => {
    const { error } = await supabase.from("fixed_cost_templates").delete().eq("id", id);
    if (error) { showToast("削除に失敗しました"); return; }
    refreshTemplates();
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(household.invite_code);
      showToast("招待コードをコピーしました");
    } catch {
      showToast(`招待コード: ${household.invite_code}`);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  /* --- 集計用の計算 --- */
  const sum = (arr) => arr.reduce((s, e) => s + e.amount, 0);
  const expenses = entries.filter((e) => e.type === "expense");
  const incomes = entries.filter((e) => e.type === "income");
  const balance = sum(incomes) - sum(expenses);

  const filtered = filter === "all" ? entries : entries.filter((e) => (e.payer_user_id || "shared") === filter);
  const byDate = useMemo(() => {
    const m = {};
    filtered.forEach((e) => { (m[e.date] = m[e.date] || []).push(e); });
    return Object.entries(m);
  }, [filtered]);

  const catName = (e) => (e.categories ? e.categories.name : e.type === "income" ? "収入" : "未分類");
  const catTotals = useMemo(() => {
    const list = categories.map((c) => ({ name: c.name, v: sum(expenses.filter((e) => e.category_id === c.id)) }));
    const other = sum(expenses.filter((e) => !e.category_id));
    if (other > 0) list.push({ name: "未分類", v: other });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, entries]);
  const maxCat = Math.max(1, ...catTotals.map((x) => x.v));

  // 年間集計
  const year = ym.split("-")[0];
  const yExpenses = yearEntries.filter((e) => e.type === "expense");
  const yIncomes = yearEntries.filter((e) => e.type === "income");
  const yCatTotals = useMemo(() => {
    const m = {};
    yExpenses.forEach((e) => { const n = catName(e); m[n] = (m[n] || 0) + e.amount; });
    return Object.entries(m).map(([name, v]) => ({ name, v })).sort((a, b) => b.v - a.v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearEntries]);
  const yMaxCat = Math.max(1, ...yCatTotals.map((x) => x.v));
  const monthlyTotals = useMemo(() => {
    const arr = Array.from({ length: 12 }, () => 0);
    yExpenses.forEach((e) => { arr[Number(e.date.slice(5, 7)) - 1] += e.amount; });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearEntries]);
  const maxMonthly = Math.max(1, ...monthlyTotals);

  const balByDate = useMemo(() => {
    const m = {};
    balances.forEach((b) => { (m[b.record_date] = m[b.record_date] || []).push(b); });
    return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 3);
  }, [balances]);

  const filterChips = [{ key: "all", label: "全て" }, ...payers];

  /* --- 画面 --- */
  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Zen Maru Gothic',sans-serif", color: C.sub, fontSize: 14, fontWeight: 600 }}>
        読み込み中…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", justifyContent: "center", fontFamily: "'Zen Maru Gothic','Hiragino Maru Gothic ProN',sans-serif", color: C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700&display=swap');
        * { -webkit-tap-highlight-color: transparent; }
        button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid ${C.primary}; outline-offset: 2px; }
        input[type="date"] { color-scheme: light; -webkit-appearance: none; appearance: none; min-width: 0; max-width: 100%; display: block; text-align: left; }
        input[type="date"]::-webkit-date-and-time-value { text-align: left; }
        select { -webkit-appearance: none; appearance: none; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      <div style={{ width: "100%", maxWidth: 430, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* ヘッダー */}
        <header style={{ padding: "20px 20px 8px" }}>
          <div style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>{household.name}</div>
          {(tab === "list" || tab === "stats") && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <button onClick={() => setYm(shiftYM(ym, -1))} aria-label="前の月" style={navBtn}><ChevronLeft size={20} /></button>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, minWidth: 110, textAlign: "center" }}>
                {tab === "stats" && statsMode === "year" ? `${year}年` : ymLabel(ym)}
              </h1>
              <button onClick={() => setYm(shiftYM(ym, 1))} aria-label="次の月" style={navBtn}><ChevronRight size={20} /></button>
              {ym !== curYM() && (
                <button onClick={() => setYm(curYM())} style={{ marginLeft: 4, background: "none", border: `1.5px solid ${C.line}`, borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: C.sub, cursor: "pointer", fontFamily: "inherit" }}>
                  今月へ
                </button>
              )}
            </div>
          )}
          {tab === "input" && <h1 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700 }}>記入する</h1>}
          {tab === "settings" && <h1 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700 }}>設定</h1>}
        </header>

        {/* 本文 */}
        <main style={{ flex: 1, padding: "8px 16px 96px", overflowY: "auto" }}>

          {tab === "input" && (
            <Card>
              <EntryForm
                categories={categories}
                payers={payers}
                defaultPayerKey={myId}
                onSave={addEntry}
              />
            </Card>
          )}

          {tab === "list" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {filterChips.map((p) => (
                  <button key={p.key} onClick={() => setFilter(p.key)} style={{
                    flex: 1, padding: "9px 0", borderRadius: 999, fontFamily: "inherit",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    border: `1.5px solid ${filter === p.key ? C.primary : C.line}`,
                    background: filter === p.key ? C.primary : C.card,
                    color: filter === p.key ? "#FFFDFA" : C.ink,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{p.label}</button>
                ))}
              </div>

              <Card style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>
                  {filter === "all" ? "この月の支出合計" : `${filterChips.find((p) => p.key === filter)?.label} の支出合計`}
                </span>
                <span style={{ fontSize: 20, fontWeight: 700 }}>
                  {yen(sum(filtered.filter((e) => e.type === "expense")))}
                </span>
              </Card>

              {byDate.length === 0 && (
                <Card style={{ textAlign: "center", color: C.sub, fontSize: 14 }}>
                  この条件の明細はまだありません
                </Card>
              )}
              {byDate.map(([date, list]) => (
                <Card key={date} style={{ padding: "12px 16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, marginBottom: 6 }}>
                    {Number(date.slice(8))}日
                  </div>
                  {list.map((e) => (
                    <button key={e.id} onClick={() => setEditing(e)} style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%",
                      padding: "9px 2px", background: "none", border: "none",
                      borderTop: `1px solid ${C.line}`, cursor: "pointer",
                      fontFamily: "inherit", textAlign: "left", color: C.ink,
                    }}>
                      <Stamp p={payerOf(e)} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.item}</div>
                        <div style={{ fontSize: 11, color: C.sub }}>{catName(e)}</div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: e.type === "income" ? C.income : C.ink }}>
                        {e.type === "income" ? "+" : ""}{yen(e.amount)}
                      </div>
                    </button>
                  ))}
                </Card>
              ))}
            </div>
          )}

          {tab === "stats" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", background: C.card, borderRadius: 14, padding: 4, boxShadow: "0 6px 18px rgba(90,66,43,.07)" }}>
                {[["month", "月間"], ["year", "年間"]].map(([v, l]) => (
                  <button key={v} onClick={() => setStatsMode(v)} style={{
                    flex: 1, padding: "9px 0", borderRadius: 11, border: "none", fontFamily: "inherit",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    background: statsMode === v ? C.primary : "transparent",
                    color: statsMode === v ? "#FFFDFA" : C.sub,
                  }}>{l}</button>
                ))}
              </div>

              {statsMode === "month" && (
                <>
                  <Card>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.sub, fontWeight: 600 }}>
                      <span>収入 {yen(sum(incomes))}</span>
                      <span>支出 {yen(sum(expenses))}</span>
                    </div>
                    <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>この月の収支</span>
                      <span style={{ fontSize: 26, fontWeight: 700, color: balance >= 0 ? C.income : C.danger }}>
                        {balance >= 0 ? "+" : ""}{yen(balance)}
                      </span>
                    </div>
                  </Card>

                  <Card>
                    <SectionLabel>カテゴリー別</SectionLabel>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {catTotals.map(({ name, v }) => (
                        <div key={name}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                            <span style={{ fontWeight: 600 }}>{name}</span>
                            <span style={{ fontWeight: 700, color: v ? C.ink : C.sub }}>{yen(v)}</span>
                          </div>
                          <div style={{ height: 7, borderRadius: 4, background: C.bg }}>
                            <div style={{ height: 7, borderRadius: 4, width: `${(v / maxCat) * 100}%`, background: C.primary, opacity: 0.8, transition: "width .3s ease" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <SectionLabel>支払者別(支出)</SectionLabel>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {payers.map((p) => (
                        <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Stamp p={p} size={30} />
                          <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{p.label}</span>
                          <span style={{ fontSize: 15, fontWeight: 700 }}>
                            {yen(sum(expenses.filter((e) => (e.payer_user_id || "shared") === p.key)))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </>
              )}

              {statsMode === "year" && (
                <>
                  <Card>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.sub, fontWeight: 600 }}>
                      <span>収入 {yen(sum(yIncomes))}</span>
                      <span>支出 {yen(sum(yExpenses))}</span>
                    </div>
                    <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>{year}年の収支</span>
                      <span style={{ fontSize: 26, fontWeight: 700, color: sum(yIncomes) - sum(yExpenses) >= 0 ? C.income : C.danger }}>
                        {sum(yIncomes) - sum(yExpenses) >= 0 ? "+" : ""}{yen(sum(yIncomes) - sum(yExpenses))}
                      </span>
                    </div>
                  </Card>

                  <Card>
                    <SectionLabel>月別の支出推移</SectionLabel>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 90 }}>
                      {monthlyTotals.map((v, i) => (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                          <div style={{ width: "100%", height: Math.max(2, (v / maxMonthly) * 70), borderRadius: 3, background: `${ym}` === `${year}-${pad(i + 1)}` ? C.primary : C.line, transition: "height .3s ease" }} />
                          <span style={{ fontSize: 9, color: C.sub, fontWeight: 700 }}>{i + 1}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <SectionLabel>カテゴリー別(年間総額)</SectionLabel>
                    {yCatTotals.length === 0 && <div style={{ fontSize: 13, color: C.sub }}>まだ支出データがありません</div>}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {yCatTotals.map(({ name, v }) => (
                        <div key={name}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                            <span style={{ fontWeight: 600 }}>{name}</span>
                            <span style={{ fontWeight: 700 }}>{yen(v)}</span>
                          </div>
                          <div style={{ height: 7, borderRadius: 4, background: C.bg }}>
                            <div style={{ height: 7, borderRadius: 4, width: `${(v / yMaxCat) * 100}%`, background: C.primary, opacity: 0.8 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </>
              )}

              {/* 残高記録(月間/年間どちらでも表示) */}
              <Card>
                <SectionLabel>残高の記録(毎月10日など)</SectionLabel>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                  <input type="date" value={balDate} onChange={(e) => setBalDate(e.target.value)} style={inputStyle} />
                  <input value={balName} onChange={(e) => setBalName(e.target.value)} placeholder="口座名(例:現金)" style={inputStyle} />
                  {accountNames.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {accountNames.map((n) => (
                        <button key={n} onClick={() => setBalName(n)} style={{
                          padding: "5px 11px", borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                          border: `1.5px solid ${C.line}`, background: balName === n ? C.bg : "#fff", color: C.ink, cursor: "pointer",
                        }}>{n}</button>
                      ))}
                    </div>
                  )}
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: C.sub }}>¥</span>
                    <input value={balAmount} inputMode="numeric"
                      onChange={(e) => setBalAmount(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="残高" style={{ ...inputStyle, paddingLeft: 32 }} />
                  </div>
                  <button onClick={saveBalance} style={{
                    padding: "12px 0", borderRadius: 14, border: "none", fontFamily: "inherit",
                    fontSize: 14, fontWeight: 700, cursor: "pointer", background: C.primary, color: "#FFFDFA",
                  }}>残高を記録する</button>
                  <div style={{ fontSize: 11, color: C.sub }}>同じ日付・同じ口座名で記録すると上書きされます</div>
                </div>

                {balByDate.map(([date, list]) => (
                  <div key={date} style={{ borderTop: `1px solid ${C.line}`, paddingTop: 10, marginTop: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, marginBottom: 4 }}>
                      {date.replace(/-/g, "/")}(合計 {yen(sum(list))})
                    </div>
                    {list.map((b) => (
                      <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{b.account_name}</span>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{yen(b.amount)}</span>
                        <button onClick={() => deleteBalance(b.id)} aria-label="削除" style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", padding: 4 }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </Card>
            </div>
          )}

          {tab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Card>
                <SectionLabel>メンバー</SectionLabel>
                {payers.filter((p) => p.key !== "shared").map((p) => (
                  <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <Stamp p={p} size={30} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{p.label}{p.key === myId ? "(あなた)" : ""}</span>
                  </div>
                ))}

                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
                  <SectionLabel>あなたの表示名</SectionLabel>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={nameEdit} onChange={(e) => setNameEdit(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={saveDisplayName} style={{
                      padding: "0 16px", borderRadius: 14, border: "none", fontFamily: "inherit",
                      fontSize: 13, fontWeight: 700, cursor: "pointer", background: C.primary, color: "#FFFDFA", flexShrink: 0,
                    }}>変更</button>
                  </div>
                </div>

                {members.length < 2 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
                    <SectionLabel>配偶者を招待</SectionLabel>
                    <button onClick={copyInvite} style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%",
                      padding: "12px 0", borderRadius: 14, fontFamily: "inherit", fontSize: 16, fontWeight: 700,
                      letterSpacing: "0.15em", border: `1.5px dashed ${C.primary}`, background: C.bg, color: C.primary, cursor: "pointer",
                    }}>
                      {household.invite_code} <Copy size={15} />
                    </button>
                    <div style={{ fontSize: 12, color: C.sub, marginTop: 8, lineHeight: 1.6 }}>
                      このコードを配偶者に伝えてください。配偶者はアカウント登録後、「招待コードで参加」からこのコードを入力すると同じ家計簿を使えます。
                    </div>
                  </div>
                )}
              </Card>

              <Card>
                <SectionLabel>固定費テンプレート</SectionLabel>
                {templates.map((t) => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
                    <Stamp p={payers.find((p) => p.key === (t.payer_user_id || "shared")) || payers[payers.length - 1]} size={26} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{t.item}</div>
                      <div style={{ fontSize: 11, color: C.sub }}>{categories.find((c) => c.id === t.category_id)?.name || ""}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{yen(t.amount)}</div>
                    <button onClick={() => deleteTemplate(t.id)} aria-label="削除" style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", padding: 4 }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                  <select value={tCat} onChange={(e) => setTCat(e.target.value)} style={{ ...inputStyle, color: tCat ? C.ink : C.sub }}>
                    <option value="">カテゴリーを選択</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input value={tItem} onChange={(e) => setTItem(e.target.value)} placeholder="項目(例:インターネット)" style={inputStyle} />
                  <input value={tAmount} inputMode="numeric" onChange={(e) => setTAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="金額" style={inputStyle} />
                  <select value={tPayer} onChange={(e) => setTPayer(e.target.value)} style={inputStyle}>
                    {payers.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                  <button onClick={addTemplate} style={{
                    padding: "12px 0", borderRadius: 14, border: "none", fontFamily: "inherit",
                    fontSize: 14, fontWeight: 700, cursor: "pointer", background: C.primary, color: "#FFFDFA",
                  }}>固定費を追加</button>
                </div>
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.sub }}>
                  <Sparkles size={14} /> 毎月、その月に最初にアプリを開いたときに自動で明細に追加されます
                </div>
              </Card>

              <Card>
                <SectionLabel>カテゴリー</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  {categories.map((c) => (
                    <span key={c.id} style={{ padding: "7px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600, background: C.bg, color: C.ink }}>{c.name}</span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="新しいカテゴリー名" style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={addCategory} style={{
                    padding: "0 16px", borderRadius: 14, border: "none", fontFamily: "inherit",
                    fontSize: 13, fontWeight: 700, cursor: "pointer", background: C.primary, color: "#FFFDFA", flexShrink: 0,
                  }}>追加</button>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: C.sub }}>並び替え・削除はPhase 2で対応予定です</div>
              </Card>

              <button onClick={logout} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "13px 0", borderRadius: 16, fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                background: "transparent", border: `1.5px solid ${C.line}`, color: C.sub, cursor: "pointer",
              }}>
                <LogOut size={16} /> ログアウト
              </button>
            </div>
          )}
        </main>

        {/* 編集シート */}
        {editing && (
          <div onClick={() => setEditing(null)} style={{ position: "fixed", inset: 0, background: "rgba(69,55,41,.35)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 20 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, maxHeight: "88vh", overflowY: "auto", background: C.card, borderRadius: "24px 24px 0 0", padding: "18px 18px 28px", boxSizing: "border-box" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>明細を編集</span>
                <button onClick={() => setEditing(null)} aria-label="閉じる" style={{ background: "none", border: "none", cursor: "pointer", color: C.sub, padding: 4 }}><X size={20} /></button>
              </div>
              <EntryForm
                categories={categories}
                payers={payers}
                defaultPayerKey={myId}
                initial={editing}
                onSave={updateEntry}
                onDelete={deleteEntry}
              />
            </div>
          </div>
        )}

        {/* トースト */}
        {toast && (
          <div style={{ position: "fixed", bottom: 96, left: "50%", transform: "translateX(-50%)", background: C.ink, color: "#FFFDFA", padding: "10px 20px", borderRadius: 999, fontSize: 13, fontWeight: 600, zIndex: 30, boxShadow: "0 6px 18px rgba(69,55,41,.25)", whiteSpace: "nowrap" }}>
            {toast}
          </div>
        )}

        {/* ボトムナビ */}
        <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: C.card, borderTop: `1px solid ${C.line}`, display: "flex", padding: "8px 0 14px", zIndex: 10 }}>
          {[["input", "入力", PenLine], ["list", "一覧", ReceiptText], ["stats", "集計", PieChart], ["settings", "設定", Settings2]].map(([v, l, Icon]) => (
            <button key={v} onClick={() => { setTab(v); setEditing(null); }} style={{
              flex: 1, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              color: tab === v ? C.primary : C.sub, fontWeight: 700, fontSize: 11,
            }}>
              <Icon size={21} strokeWidth={tab === v ? 2.4 : 1.8} />
              {l}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

const navBtn = {
  background: "none", border: "none", cursor: "pointer", color: "#A08D7B",
  padding: 4, display: "flex", alignItems: "center",
};
