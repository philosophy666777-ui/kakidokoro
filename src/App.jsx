import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";

/*
  書きどころ — 縦書き創作エディタ（叩き台）
  タブは添付シナリオ講座フォーマットをベースに再構成。
  データはブラウザ内の永続ストレージに自動保存（この端末内のみ）。
*/

const STORE_KEY = "kakidokoro:v3";
const LH = 1.9;
const CHAR_COLORS = ["#2E5A6E", "#6B7A4B", "#A65A5A", "#7A6A93", "#B58B3E", "#4B7A74"];
const FONTS = [
  { id: "mincho", label: "明朝", stack: `"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif JP",serif` },
  { id: "gothic", label: "ゴシック", stack: `"Hiragino Kaku Gothic ProN","Yu Gothic","Noto Sans JP",sans-serif` },
  { id: "maru", label: "丸ゴシック", stack: `"Hiragino Maru Gothic ProN","Zen Maru Gothic","Noto Sans JP",sans-serif` },
];
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);

// ---- Format schemas (from the uploaded template) ----
const CONCEPT_FIELDS = [
  { k: "background", label: "どんな世界？／どうなった世界？（背景）", rows: 2 },
  { k: "badSituation", label: "悪い状況（事件の前に悪い状況がある場合）", rows: 2 },
  { k: "intent", label: "企画意図", rows: 2 },
];
const SJ_FIELDS = [
  { k: "incident", label: "事件（問題）" }, { k: "conflict", label: "葛藤（欲望）" },
  { k: "resolution", label: "解決（成就）" }, { k: "lesson", label: "教訓（主張）" },
];
const ENDING_FIELDS = [
  { k: "p1", label: "オチ➊ 幸福劇の代償", hint: "一発逆転で成功を得るが、その代わりに～という悲劇に襲われる。" },
  { k: "p2", label: "オチ➋ 悲劇の代償（メリバ）", hint: "悲劇に襲われたが、その代わりに～という成功を得る。" },
  { k: "p3", label: "オチ❸ 悲劇の悲劇", hint: "悲劇に襲われ、しかもさらに～という悲劇に襲われる。" },
];
const PLOT_FIELDS = [
  { k: "seedPlot", label: "プロットのタネ（誰が、どうする／10字ほど）" },
  { k: "onelinePlot", label: "1行プロット（誰が、何を、どうする／50字ほど）", rows: 2 },
  { k: "threelinePlot", label: "3行プロット（誰が・いつ・どうして・何を・どうやって・どうする／150字）", rows: 3 },
  { k: "tenlinePlot", label: "10行プロット（600字ほど）", rows: 6 },
];
const ABC_FIELDS = [
  { k: "A", label: "A：物語を貫く大問題が勃発" }, { k: "B", label: "B：個人的な問題が表面化し悪化" },
  { k: "pinch1", label: "pinch1：危機1（精神/肉体の葛藤）" }, { k: "C", label: "C：情報整理→対策→修行" },
  { k: "Cp", label: "C'：根本原因に気づく" }, { k: "pinch2", label: "pinch2：危機2" },
  { k: "Bp", label: "B'：個人的な問題を解決" }, { k: "Ap", label: "A'：本来の姿に戻り大問題を解決" },
  { k: "ochi", label: "オチ：日常を取り戻す" },
];
const MYSTERY_FIELDS = [
  { k: "open", label: "書き出し（違和感＋疑問文）", rows: 3, hint: "少し気になる～があった。というのは～なのだ。〈主人公〉は疑問に思った。～したのか？" },
  { k: "hint1", label: "ヒント1", hint: "一つわかったことがある。それは、～だ。" },
  { k: "hint2", label: "ヒント2" }, { k: "hint3", label: "ヒント3" },
  { k: "answer", label: "解明（答え＋最終的にどうなったか）", rows: 3 },
];
const COLLAPSE_FIELDS = [
  { k: "s01", label: "01 書き出し（ヒビ）", rows: 2 }, { k: "s02", label: "02 最初の逸脱（崩壊スタート）", rows: 2 },
  { k: "s03", label: "03 転げ落ち（3回の繰り返し）", rows: 3 }, { k: "s04", label: "04 どん底", rows: 2 },
  { k: "s05", label: "05 覚醒スイッチ", rows: 2 }, { k: "s06", label: "06 価値観の反転", rows: 1 },
  { k: "s06b", label: "06-2 新しい信念", rows: 1 }, { k: "s07", label: "07 V字回復の行動（クライマックス）", rows: 2 },
  { k: "s08", label: "08 結果と余韻", rows: 2 },
];
const CHAR_FIELDS = [
  ["gender", "性別"], ["age", "年齢"], ["birth", "生年月日／星座"], ["actorImage", "キャライメージ（俳優）"],
  ["job", "職業"], ["salary", "月給"], ["workplace", "職場"],
  ["personality", "性格", "例）雨に濡れた捨てネコを見て涙ぐみ拾ってしまう優しく繊細な心"],
  ["weakness", "短所・弱点", "例）超スタイルがいいのに首から上がない（セルティ）"],
  ["speech", "口調・口ぐせ", "例）「不幸だ」「お前はもう死んでいる」"],
  ["desire", "欲望", "例）強い海賊になりたい"], ["goal", "達成したいこと（目標）", "例）海賊王になる"],
  ["wound", "心の傷（コンプレックス）or秘密"],
  ["wants", "欲しいもの"], ["promise", "約束"], ["likes", "好き"], ["dislikes", "嫌い"],
  ["hobby", "趣味"], ["subject", "得意科目"], ["habit", "癖"], ["medical", "病歴"],
  ["fashion", "ファッション"], ["skill", "特技"], ["prop", "重要な小道具"],
  ["rival", "敵・ライバル（どう怖い／ムカつく）"], ["lover", "恋人（どうドキッとする）"],
  ["ally", "仲間"], ["brother", "兄弟"], ["spouse", "配偶者"], ["sister", "姉妹"],
  ["father", "父"], ["mother", "母"],
];
const emptyChar = (name = "新しい人物") => ({ id: uid(), name, feature: "", role: "", note: "" });

const DEFAULT_STATE = {
  title: "無題の原稿", keyword: "",
  staff: { script: "", original: "", director: "", cast: "", author: "", date: "" },
  settings: { charsPerLine: 20, linesPerPage: 20, fontId: "mincho", fontSizePx: 20, showGrid: true, exportFontPx: 16, exportTitlePage: true },
  plot: [
    { id: uid(), title: "発端 — 実家に戻る", note: "母の訃報。十年ぶりの帰郷。", current: true, body: "　神棚の埃を、母は決して払わなかった。\n　それが家の決まりなのだと、幼い私はずっと信じていた。" },
    { id: uid(), title: "違和感 — 神棚の埃", note: "触れてはいけないものとして残されている。", current: false, body: "" },
    { id: uid(), title: "転回 — 父の手記", note: "神棚の由来が明かされる。", current: false, body: "" },
  ],
  concept: { background: "", badSituation: "", intent: "", irony: "", reversal: "", badEndPattern: "",
    sj: { incident: "", conflict: "", resolution: "", lesson: "" }, ending: { p1: "", p2: "", p3: "" } },
  structure: { seedPlot: "", onelinePlot: "", threelinePlot: "", tenlinePlot: "", abc: {}, mystery: {}, collapse: {} },
  characters: [
    { id: uid(), name: "私（語り手）", feature: "三十代・編集者", role: "主人公", note: "故郷を捨てたつもりでいる。", desire: "過去から自由になりたい" },
    { id: uid(), name: "母", feature: "既に故人", role: "回想の中の存在", note: "神棚の禁忌を守り続けた。" },
  ],
  world: "地方の旧家。神棚は「祀るもの」ではなく「触れてはならないもの」として扱われている。\n家の禁忌が物語の背骨。",
  emotion: { scenes: [{ id: uid(), label: "帰郷" }, { id: uid(), label: "発見" }, { id: uid(), label: "対峙" }], values: {}, reader: {} },
  authorReview: "",
  savedCritiques: [],  // AI講評の保存分
  feedback: [],        // 読者・編集者からの感想
  aiProviders: { useOpenAI: false, openaiKey: "", openaiModel: "gpt-5.5",
    useGemini: false, geminiKey: "", geminiModel: "gemini-3.1-pro" },
  writingSeconds: 0,
};

async function storageGet(key) { try { if (window.storage) { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; } } catch (e) {} return null; }
async function storageSet(key, value) { try { if (window.storage) { await window.storage.set(key, JSON.stringify(value)); return true; } } catch (e) {} return false; }

function applyLoaded(p, s) {
  return {
    ...p, ...s,
    settings: { ...p.settings, ...(s.settings || {}) },
    concept: { ...p.concept, ...(s.concept || {}), sj: { ...p.concept.sj, ...(s.concept?.sj || {}) }, ending: { ...p.concept.ending, ...(s.concept?.ending || {}) } },
    structure: { ...p.structure, ...(s.structure || {}) },
    emotion: { ...p.emotion, ...(s.emotion || {}) },
    aiProviders: { ...p.aiProviders, ...(s.aiProviders || {}) },
  };
}

// 旧バージョン（本文が1つの塊）からの移行：本文を節ごとに持たせる
function migrate(st) {
  const plot = (st.plot || []).map((p) => ({ body: "", ...p }));
  const anyBody = plot.some((p) => (p.body || "").length > 0);
  if (!anyBody && typeof st.text === "string" && st.text.length > 0) {
    let idx = plot.findIndex((p) => p.current);
    if (idx < 0) idx = 0;
    if (plot[idx]) plot[idx] = { ...plot[idx], body: st.text };
  }
  const { text, ...rest } = st;
  return { ...rest, plot };
}

// ---- AI providers ----
const CRIT_PROMPT = (ctx) =>
  `あなたは日本語小説の編集者兼評論家です。次の原稿を、構成・文体・ペースの3観点で講評してください。\n${ctx}\n\n出力はJSONオブジェクトのみ（前置き・マークダウン・コードフェンス禁止）。形式:{"kousei":0から100の整数,"buntai":0から100の整数,"pace":0から100の整数,"comment":"200字以内。良い点と、次の一手を具体的に1つ"}`;

async function callClaude(prompt) {
  const res = await fetch("/api/claude", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Claudeの呼び出しに失敗しました");
  return data.text || "";
}
async function callOpenAI(prompt, key, model) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: model || "gpt-5.5", messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "OpenAIエラー");
  return data.choices?.[0]?.message?.content || "";
}
async function callGemini(prompt, key, model) {
  const m = model || "gemini-3.1-pro";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Geminiエラー");
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}
function parseCritique(raw) {
  const t = (raw || "").replace(/```json|```/g, "").trim();
  try { const o = JSON.parse(t); return { kousei: o.kousei ?? null, buntai: o.buntai ?? null, pace: o.pace ?? null, comment: o.comment || t }; }
  catch { return { kousei: null, buntai: null, pace: null, comment: t || "解析できませんでした。" }; }
}

const CSS = `
:root{ --paper:#E9E5DA; --paper-2:#F1EEE6; --edge:#D6D0C1; --sumi:#211E1A; --sumi-soft:#5b554d;
  --ai:#1F3A4D; --ai-2:#35617B; --shu:#B5533C; --kin:#A98B4F; }
*{box-sizing:border-box}
.kd-root{ min-height:100vh; background:var(--paper); color:var(--sumi); font-family:${FONTS[1].stack}; -webkit-font-smoothing:antialiased }
.kd-top{ display:flex; align-items:center; gap:16px; padding:12px 20px; border-bottom:1px solid var(--edge); background:var(--paper-2); position:sticky; top:0; z-index:20 }
.kd-brand{ font-weight:700; letter-spacing:.14em; font-size:15px }
.kd-brand small{ display:block; font-weight:400; letter-spacing:.05em; font-size:10px; color:var(--sumi-soft) }
.kd-title-input{ border:none; background:transparent; font:inherit; font-size:14px; color:var(--sumi); border-bottom:1px dashed var(--edge); padding:2px 4px; min-width:160px }
.kd-title-input:focus{ outline:none; border-bottom-color:var(--ai) }
.kd-spacer{ flex:1 }
.kd-meta{ font-size:12px; color:var(--sumi-soft); display:flex; gap:14px; align-items:center }
.kd-dot{ width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:5px;vertical-align:middle }
.kd-btn{ font:inherit; font-size:13px; border:1px solid var(--ai); color:var(--ai); background:transparent; padding:7px 14px; border-radius:2px; cursor:pointer; letter-spacing:.06em; transition:.15s }
.kd-btn:hover{ background:var(--ai); color:var(--paper-2) }
.kd-btn.solid{ background:var(--ai); color:var(--paper-2) }
.kd-btn.solid:hover{ background:var(--ai-2) }
.kd-btn.ghost{ border-color:var(--edge); color:var(--sumi-soft) }
.kd-btn.ghost:hover{ background:var(--edge); color:var(--sumi) }
.kd-btn.sm{ padding:4px 10px; font-size:12px }
.kd-btn:disabled{ opacity:.5; cursor:default }
.kd-tabs{ display:flex; gap:2px; padding:0 12px; border-bottom:1px solid var(--edge); background:var(--paper-2); overflow-x:auto }
.kd-tab{ font:inherit; font-size:13px; border:none; background:transparent; cursor:pointer; padding:11px 15px; color:var(--sumi-soft); letter-spacing:.06em; border-bottom:2px solid transparent; white-space:nowrap }
.kd-tab:hover{ color:var(--sumi) }
.kd-tab.on{ color:var(--ai); border-bottom-color:var(--ai); font-weight:700 }

.kd-write{ display:grid; grid-template-columns:220px 1fr 250px; height:calc(100vh - 98px) }
.kd-pane{ overflow-y:auto; padding:16px }
.kd-pane.left{ border-right:1px solid var(--edge); background:var(--paper-2) }
.kd-pane.right{ border-left:1px solid var(--edge); background:var(--paper-2) }
.kd-pane.center{ display:flex; flex-direction:column; padding:0 }
.kd-h{ font-size:11px; letter-spacing:.18em; color:var(--sumi-soft); margin:0 0 10px; font-weight:700 }
.kd-settings{ display:flex; flex-wrap:wrap; gap:14px 18px; align-items:center; padding:10px 18px; border-bottom:1px solid var(--edge); background:var(--paper-2); font-size:12px }
.kd-field{ display:flex; align-items:center; gap:6px; color:var(--sumi-soft) }
.kd-field select, .kd-field input[type=number]{ font:inherit; font-size:12px; border:1px solid var(--edge); background:var(--paper); color:var(--sumi); border-radius:2px; padding:3px 5px }
.kd-field input[type=number]{ width:52px }
.kd-check{ display:flex; align-items:center; gap:5px; cursor:pointer; color:var(--sumi-soft) }
.kd-editor-wrap{ flex:1; overflow:auto; padding:24px; display:flex; justify-content:center }
.kd-editor{ writing-mode:vertical-rl; -webkit-writing-mode:vertical-rl; border:1px solid var(--edge); background:var(--paper-2); color:var(--sumi); padding:20px; resize:none; outline:none; line-height:1.9; letter-spacing:.06em; height:70vh }
.kd-editor:focus{ border-color:var(--ai) }
.kd-editor.grid{ background-image:repeating-linear-gradient(to left, rgba(181,83,60,.32) 0, rgba(181,83,60,.32) 1px, transparent 1px, transparent var(--adv,1.9em)); background-origin:content-box; background-position:right top }
.kd-counts{ display:flex; gap:20px; justify-content:center; padding:9px; font-size:12px; color:var(--sumi-soft); border-top:1px solid var(--edge); background:var(--paper-2); flex-wrap:wrap }
.kd-counts b{ color:var(--ai); font-weight:700 }
.kd-plot-item{ border:1px solid var(--edge); border-left:3px solid transparent; border-radius:2px; padding:9px 10px; margin-bottom:8px; background:var(--paper); cursor:pointer; transition:.12s }
.kd-plot-item:hover{ border-color:var(--ai-2) }
.kd-plot-item.cur{ border-left-color:var(--kin); background:#F4EFE0 }
.kd-plot-t{ font-size:13px; font-weight:700; display:flex; align-items:center; gap:6px }
.kd-plot-n{ font-size:11px; color:var(--sumi-soft); margin-top:3px; line-height:1.5 }
.kd-here{ font-size:9px; color:var(--kin); border:1px solid var(--kin); border-radius:2px; padding:0 4px; letter-spacing:.1em }
.kd-ref-toggle{ display:flex; gap:2px; margin-bottom:12px }
.kd-ref-toggle button{ flex:1; font:inherit; font-size:11px; padding:5px; border:1px solid var(--edge); background:var(--paper); color:var(--sumi-soft); cursor:pointer; border-radius:2px }
.kd-ref-toggle button.on{ background:var(--ai); color:var(--paper-2); border-color:var(--ai) }
.kd-card{ border:1px solid var(--edge); border-radius:2px; padding:11px; margin-bottom:9px; background:var(--paper) }
.kd-name{ display:flex; align-items:center; gap:7px; font-size:13px; font-weight:700 }
.kd-swatch{ width:11px;height:11px;border-radius:2px;flex:none }
.kd-input, .kd-area{ width:100%; font:inherit; font-size:13px; border:1px solid var(--edge); border-radius:2px; background:var(--paper-2); color:var(--sumi); padding:7px 8px }
.kd-input:focus, .kd-area:focus{ outline:none; border-color:var(--ai) }
.kd-area{ resize:vertical; line-height:1.6 }
.kd-mini{ font:inherit; font-size:11px; border:none; background:transparent; color:var(--shu); cursor:pointer; padding:2px 4px }
.kd-mini:hover{ text-decoration:underline }
.kd-page{ max-width:860px; margin:0 auto; padding:24px 22px }
.kd-sec{ border:1px solid var(--edge); border-radius:2px; background:var(--paper-2); margin-bottom:16px; overflow:hidden }
.kd-sec-h{ font-size:13px; font-weight:700; letter-spacing:.08em; color:var(--ai); padding:11px 14px; border-bottom:1px solid var(--edge); background:var(--paper); display:flex; align-items:center; gap:8px }
.kd-sec-b{ padding:14px }
.kd-lbl{ font-size:11px; color:var(--sumi-soft); margin:0 0 4px; letter-spacing:.04em }
.kd-fld{ margin-bottom:12px } .kd-fld:last-child{ margin-bottom:0 }
.kd-grid2{ display:grid; grid-template-columns:1fr 1fr; gap:12px }
.kd-char-head{ display:flex; align-items:center; gap:10px; cursor:pointer; padding:11px 12px }
.kd-char-head:hover{ background:var(--paper-2) }
.kd-chev{ font-size:11px; color:var(--sumi-soft); transition:.15s; flex:none }
.kd-chev.open{ transform:rotate(90deg) }
.kd-char-sum{ flex:1; min-width:0 }
.kd-char-nm{ font-size:14px; font-weight:700 }
.kd-char-meta{ font-size:11px; color:var(--sumi-soft); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.kd-char-detail{ border-top:1px solid var(--edge); padding:14px; background:var(--paper-2) }
.kd-emo-grid{ border-collapse:collapse; width:100%; font-size:12px; margin-top:14px }
.kd-emo-grid th, .kd-emo-grid td{ border:1px solid var(--edge); padding:5px 7px; text-align:center }
.kd-emo-grid th{ background:var(--paper-2); font-weight:700; color:var(--sumi-soft) }
.kd-emo-grid input{ width:46px; font:inherit; font-size:12px; text-align:center; border:1px solid var(--edge); background:var(--paper); border-radius:2px; padding:2px }
.kd-emo-grid .rowh{ text-align:left; background:var(--paper-2) }
.kd-scores{ display:flex; gap:8px; margin:8px 0; flex-wrap:wrap }
.kd-chip{ font-size:11px; color:var(--sumi-soft); border:1px solid var(--edge); border-radius:10px; padding:1px 9px; background:var(--paper-2) }
.kd-chip b{ color:var(--ai) }
.kd-ai-panel{ position:fixed; right:0; top:0; height:100vh; width:360px; background:var(--paper-2); border-left:1px solid var(--edge); box-shadow:-8px 0 24px rgba(0,0,0,.08); z-index:40; display:flex; flex-direction:column }
.kd-ai-head{ display:flex; align-items:center; padding:14px 16px; border-bottom:1px solid var(--edge) }
.kd-ai-body{ padding:16px; overflow-y:auto; flex:1 }
.kd-ai-card{ border:1px solid var(--edge); border-radius:2px; padding:12px; margin-bottom:12px; background:var(--paper) }
.kd-ai-lens{ font-size:12px; font-weight:700; letter-spacing:.06em; color:var(--ai); margin-bottom:4px }
.kd-ai-comment{ font-size:12.5px; line-height:1.7 }
.kd-cfg{ border:1px solid var(--edge); border-radius:2px; background:var(--paper); padding:12px; margin-bottom:14px }
.kd-cfg .kd-lbl{ margin-top:8px }
.kd-empty{ color:var(--sumi-soft); font-size:12px; line-height:1.7 }
.kd-note{ font-size:11px; color:var(--sumi-soft); line-height:1.6; margin-top:8px }
.kd-rec-meta{ font-size:11px; color:var(--sumi-soft); margin-bottom:6px }
@media (max-width:820px){ .kd-write{ grid-template-columns:1fr; height:auto } .kd-pane.left,.kd-pane.right{ border:none; border-bottom:1px solid var(--edge) } .kd-ai-panel{ width:100vw } .kd-grid2{ grid-template-columns:1fr } }
.kd-print{ display:none }
.kd-pg{ background:#fff }
@media print{
  .kd-root{ background:#fff !important }
  .kd-root > *:not(.kd-print){ display:none !important }
  .kd-print{ display:block !important; color:#000 }
  .kd-pg{ break-after:page; page-break-after:always; display:flex; justify-content:flex-start; padding:0 }
  .kd-pg:last-child{ break-after:auto; page-break-after:auto }
  .kd-pg-title{ justify-content:center; align-items:flex-start; height:70vh }
  @page{ size:A4; margin:14mm }
}
`;

function Area({ label, hint, value, onChange, rows = 2 }) {
  return (<div className="kd-fld"><div className="kd-lbl">{label}</div>
    <textarea className="kd-area" rows={rows} value={value || ""} placeholder={hint || ""} onChange={(e) => onChange(e.target.value)} /></div>);
}
function Inp({ label, hint, value, onChange, type }) {
  return (<div className="kd-fld"><div className="kd-lbl">{label}</div>
    <input className="kd-input" type={type || "text"} value={value || ""} placeholder={hint || ""} onChange={(e) => onChange(e.target.value)} /></div>);
}

export default function App() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("write");
  const [refTab, setRefTab] = useState("chars");
  const [saveStatus, setSaveStatus] = useState("—");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResults, setAiResults] = useState([]);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const focusRef = useRef(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (!printing) return;
    const t = setTimeout(() => { try { window.print(); } catch (e) {} }, 180);
    const fallback = setTimeout(() => setPrinting(false), 4000);
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    return () => { clearTimeout(t); clearTimeout(fallback); window.removeEventListener("afterprint", done); };
  }, [printing]);

  useEffect(() => { (async () => {
    const s = await storageGet(STORE_KEY);
    if (s) setState((p) => migrate(applyLoaded(p, s)));
    setLoaded(true);
  })(); }, []);
  useEffect(() => {
    if (!loaded) return; setSaveStatus("保存中"); clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => { const ok = await storageSet(STORE_KEY, state); setSaveStatus(ok ? "保存済み" : "端末保存のみ"); }, 700);
    return () => clearTimeout(saveTimer.current);
  }, [state, loaded]);
  useEffect(() => { const t = setInterval(() => { if (focusRef.current) setState((s) => ({ ...s, writingSeconds: s.writingSeconds + 1 })); }, 1000); return () => clearInterval(t); }, []);

  const patch = useCallback((p) => setState((s) => ({ ...s, ...p })), []);
  const patchSettings = (p) => setState((s) => ({ ...s, settings: { ...s.settings, ...p } }));
  const patchAP = (p) => setState((s) => ({ ...s, aiProviders: { ...s.aiProviders, ...p } }));
  const setConcept = (k, v) => setState((s) => ({ ...s, concept: { ...s.concept, [k]: v } }));
  const setConceptSub = (g, k, v) => setState((s) => ({ ...s, concept: { ...s.concept, [g]: { ...s.concept[g], [k]: v } } }));
  const setStruct = (k, v) => setState((s) => ({ ...s, structure: { ...s.structure, [k]: v } }));
  const setStructSub = (g, k, v) => setState((s) => ({ ...s, structure: { ...s.structure, [g]: { ...s.structure[g], [k]: v } } }));

  const font = FONTS.find((f) => f.id === state.settings.fontId) || FONTS[0];
  const curNode = state.plot.find((p) => p.current) || state.plot[0];
  const curBody = curNode?.body || "";
  const fullText = state.plot.map((p) => p.body || "").join("\n");
  const setCurBody = (v) => setState((s) => { const id = (s.plot.find((p) => p.current) || s.plot[0])?.id; return { ...s, plot: s.plot.map((p) => p.id === id ? { ...p, body: v } : p) }; });
  const chars = [...curBody].filter((c) => c !== "\n").length;
  const totalChars = [...fullText].filter((c) => c !== "\n").length;
  const estLines = Math.ceil(chars / Math.max(1, state.settings.charsPerLine));
  const perPage = state.settings.charsPerLine * state.settings.linesPerPage;
  const pages = (totalChars / Math.max(1, perPage)).toFixed(1);
  const hh = Math.floor(state.writingSeconds / 3600), mm = Math.floor((state.writingSeconds % 3600) / 60);
  const timeLabel = `${hh}時間${String(mm).padStart(2, "0")}分`;
  const setCurrent = (id) => setState((s) => ({ ...s, plot: s.plot.map((p) => ({ ...p, current: p.id === id })) }));
  const movePlot = (id, dir) => setState((s) => {
    const arr = [...s.plot];
    const i = arr.findIndex((p) => p.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return s;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return { ...s, plot: arr };
  });
  const curPlot = curNode;

  async function runAnalysis() {
    setAiOpen(true); setAiBusy(true); setAiResults([]);
    const ctx = `【作品名】${state.title}\n【キーワード】${state.keyword}\n【現在地】${curPlot ? curPlot.title : "未設定"}\n【総文字数】${totalChars}字\n【累計執筆時間】${timeLabel}\n【本文（抜粋）】\n${fullText.slice(0, 2500)}`;
    const prompt = CRIT_PROMPT(ctx);
    const ap = state.aiProviders;
    const jobs = [{ name: "Claude", fn: () => callClaude(prompt) }];
    if (ap.useOpenAI && ap.openaiKey) jobs.push({ name: `OpenAI ${ap.openaiModel}`, fn: () => callOpenAI(prompt, ap.openaiKey, ap.openaiModel) });
    if (ap.useGemini && ap.geminiKey) jobs.push({ name: `Gemini ${ap.geminiModel}`, fn: () => callGemini(prompt, ap.geminiKey, ap.geminiModel) });
    const out = await Promise.all(jobs.map(async (j) => {
      try { const raw = await j.fn(); return { id: uid(), provider: j.name, ...parseCritique(raw) }; }
      catch (e) { return { id: uid(), provider: j.name, kousei: null, buntai: null, pace: null, comment: `分析に失敗：${e.message || "接続エラー"}（このプレビューでは外部AIがネットワーク制限で動かない場合があります。ダウンロードしてご自身の環境で実行すると有効です）` }; }
    }));
    setAiResults(out); setAiBusy(false);
  }
  const saveCritique = (r) => setState((s) => ({ ...s, savedCritiques: [{ id: uid(), provider: r.provider, kousei: r.kousei, buntai: r.buntai, pace: r.pace, comment: r.comment, date: today() }, ...s.savedCritiques] }));

  const TABS = [["write", "執筆"], ["concept", "企画"], ["structure", "構成"], ["chars", "登場人物"], ["world", "世界観"], ["emotion", "気分曲線"], ["review", "感想"], ["export", "出力"]];

  return (
    <div className="kd-root">
      <style>{CSS}</style>
      <div className="kd-top">
        <div className="kd-brand">書きどころ<small>KAKIDOKORO · 叩き台</small></div>
        <input className="kd-title-input" value={state.title} onChange={(e) => patch({ title: e.target.value })} aria-label="作品名" />
        <div className="kd-spacer" />
        <div className="kd-meta">
          <span>執筆 {timeLabel}</span>
          <span><span className="kd-dot" style={{ background: saveStatus === "保存中" ? "#B58B3E" : "#6B7A4B" }} />{saveStatus}</span>
        </div>
        <button className="kd-btn solid" onClick={runAnalysis} disabled={aiBusy}>{aiBusy ? "分析中…" : "AIで分析"}</button>
      </div>

      <div className="kd-tabs">
        {TABS.map(([k, label]) => <button key={k} className={`kd-tab ${view === k ? "on" : ""}`} onClick={() => setView(k)}>{label}</button>)}
      </div>

      {view === "write" && (
        <div className="kd-write">
          <div className="kd-pane left">
            <div className="kd-h">プロット · 現在地</div>
            {state.plot.map((p) => (
              <div key={p.id} className={`kd-plot-item ${p.current ? "cur" : ""}`} onClick={() => setCurrent(p.id)} title="クリックで現在地に設定">
                <div className="kd-plot-t">{p.current && <span className="kd-here">執筆中</span>}{p.title}</div>
                {p.note && <div className="kd-plot-n">{p.note}</div>}
              </div>
            ))}
            <div className="kd-note">節をクリックで「執筆中」を移動。編集は構成タブで。</div>
          </div>
          <div className="kd-pane center">
            <div className="kd-settings">
              <label className="kd-field">書体
                <select value={state.settings.fontId} onChange={(e) => patchSettings({ fontId: e.target.value })}>
                  {FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </label>
              <label className="kd-field">字の大きさ<input type="number" min={12} max={40} value={state.settings.fontSizePx} onChange={(e) => patchSettings({ fontSizePx: Number(e.target.value) })} />px</label>
              <label className="kd-field">一行の字数<input type="number" min={1} max={60} value={state.settings.charsPerLine} onChange={(e) => patchSettings({ charsPerLine: Number(e.target.value) })} /></label>
              <label className="kd-field">行数<input type="number" min={1} max={60} value={state.settings.linesPerPage} onChange={(e) => patchSettings({ linesPerPage: Number(e.target.value) })} /></label>
              <label className="kd-check"><input type="checkbox" checked={state.settings.showGrid} onChange={(e) => patchSettings({ showGrid: e.target.checked })} />行のガイド線</label>
            </div>
            <div className="kd-editor-wrap">
              <textarea className={`kd-editor ${state.settings.showGrid ? "grid" : ""}`}
                style={{ fontFamily: font.stack, fontSize: state.settings.fontSizePx + "px", lineHeight: LH, width: "min(78vh, 900px)", "--adv": state.settings.fontSizePx * LH + "px" }}
                value={curBody} onChange={(e) => setCurBody(e.target.value)}
                onFocus={() => (focusRef.current = true)} onBlur={() => (focusRef.current = false)} spellCheck={false} aria-label="本文" />
            </div>
            <div className="kd-counts">
              <span>現在の節：<b>{curNode ? curNode.title : "—"}</b></span>
              <span>この節 <b>{chars}</b> 字（約 {estLines} 行）</span>
              <span>全体 <b>{totalChars}</b> 字・約 <b>{pages}</b> 枚（{perPage}字／枚）</span>
            </div>
          </div>
          <div className="kd-pane right">
            <div className="kd-ref-toggle">
              <button className={refTab === "chars" ? "on" : ""} onClick={() => setRefTab("chars")}>登場人物</button>
              <button className={refTab === "world" ? "on" : ""} onClick={() => setRefTab("world")}>世界観</button>
            </div>
            {refTab === "chars" && state.characters.map((c, i) => (
              <div className="kd-card" key={c.id}>
                <div className="kd-name"><span className="kd-swatch" style={{ background: CHAR_COLORS[i % CHAR_COLORS.length] }} />{c.name}</div>
                {(c.role || c.desire) && <div className="kd-plot-n" style={{ marginTop: 6 }}>{c.role && `役割：${c.role}`}{c.role && c.desire && " ／ "}{c.desire && `欲望：${c.desire}`}</div>}
              </div>
            ))}
            {refTab === "world" && <div className="kd-card"><div style={{ fontSize: 12.5, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{state.world}</div></div>}
            <div className="kd-note">参照専用。目線を外さず設定を確認できます。</div>
          </div>
        </div>
      )}

      {view === "concept" && (
        <div className="kd-page">
          <div className="kd-sec"><div className="kd-sec-h">表紙・基本情報</div><div className="kd-sec-b">
            <div className="kd-grid2">
              <Inp label="キーワード" value={state.keyword} onChange={(v) => patch({ keyword: v })} />
              <Inp label="作者" value={state.staff.author} onChange={(v) => setState((s) => ({ ...s, staff: { ...s.staff, author: v } }))} />
              <Inp label="脚本" value={state.staff.script} onChange={(v) => setState((s) => ({ ...s, staff: { ...s.staff, script: v } }))} />
              <Inp label="原作" value={state.staff.original} onChange={(v) => setState((s) => ({ ...s, staff: { ...s.staff, original: v } }))} />
              <Inp label="監督" value={state.staff.director} onChange={(v) => setState((s) => ({ ...s, staff: { ...s.staff, director: v } }))} />
              <Inp label="出演" value={state.staff.cast} onChange={(v) => setState((s) => ({ ...s, staff: { ...s.staff, cast: v } }))} />
            </div></div></div>
          <div className="kd-sec"><div className="kd-sec-h">背景・状況・意図</div><div className="kd-sec-b">
            {CONCEPT_FIELDS.map((f) => <Area key={f.k} label={f.label} hint={f.hint} rows={f.rows} value={state.concept[f.k]} onChange={(v) => setConcept(f.k, v)} />)}
          </div></div>
          <div className="kd-sec"><div className="kd-sec-h">運命の皮肉 → 一発逆転（既定路線）</div><div className="kd-sec-b">
            <div className="kd-note" style={{ marginTop: 0, marginBottom: 10 }}>「運命の皮肉」は必ず入る前提。そこから「一発逆転」でハッピーエンドに向かうのが基本の型。ひねりは次の「オチ」で加えます。</div>
            <Area label="運命の皮肉（必ず入る）" rows={2} hint="本当は主人公は～したいが、皮肉なことに～のせいで、～するハメに。" value={state.concept.irony} onChange={(v) => setConcept("irony", v)} />
            <Area label="一発逆転（ハッピーエンドの基本形）" rows={2} hint="それが幸いなことに主人公は～するおかげで、（一発逆転で）～することに。" value={state.concept.reversal} onChange={(v) => setConcept("reversal", v)} />
          </div></div>
          <div className="kd-sec"><div className="kd-sec-h">SJの法則（魅力ポイント＝テーマ）</div><div className="kd-sec-b">
            {SJ_FIELDS.map((f) => <Inp key={f.k} label={f.label} value={state.concept.sj?.[f.k]} onChange={(v) => setConceptSub("sj", f.k, v)} />)}
          </div></div>
          <div className="kd-sec"><div className="kd-sec-h">オチ＝バッドエンドのパターン（既定路線にひねりを加える／3択）</div><div className="kd-sec-b">
            <div className="kd-note" style={{ marginTop: 0, marginBottom: 10 }}>上の「一発逆転」の先に、どんな代償・悲劇を足すか。➊➋はメリバ寄り、❸は完全なバッドエンド。1つ選んで書き加えます。</div>
            {ENDING_FIELDS.map((f) => <Area key={f.k} label={f.label} hint={f.hint} rows={2} value={state.concept.ending?.[f.k]} onChange={(v) => setConceptSub("ending", f.k, v)} />)}
          </div></div>
        </div>
      )}

      {view === "structure" && (
        <div className="kd-page">
          <div className="kd-sec"><div className="kd-sec-h">プロット（タネ→1行→3行→10行）</div><div className="kd-sec-b">
            {PLOT_FIELDS.map((f) => f.rows ? <Area key={f.k} label={f.label} rows={f.rows} value={state.structure[f.k]} onChange={(v) => setStruct(f.k, v)} /> : <Inp key={f.k} label={f.label} value={state.structure[f.k]} onChange={(v) => setStruct(f.k, v)} />)}
          </div></div>
          <div className="kd-sec"><div className="kd-sec-h">節（章の順番／執筆タブと連動）</div><div className="kd-sec-b">
            <div className="kd-note" style={{ marginTop: 0, marginBottom: 10 }}>この並び順がそのまま章の順番になります（執筆タブの一覧・PDF出力の順に反映）。▲▼で入れ替え。</div>
            {state.plot.map((p, i) => (
              <div className="kd-fld" key={p.id}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--sumi-soft)", minWidth: 18, textAlign: "right" }}>{i + 1}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <button className="kd-btn sm ghost" style={{ padding: "0 7px", lineHeight: 1.4 }} disabled={i === 0} onClick={() => movePlot(p.id, -1)} title="上へ">▲</button>
                    <button className="kd-btn sm ghost" style={{ padding: "0 7px", lineHeight: 1.4 }} disabled={i === state.plot.length - 1} onClick={() => movePlot(p.id, 1)} title="下へ">▼</button>
                  </div>
                  <input className="kd-input" value={p.title} onChange={(e) => setState((s) => ({ ...s, plot: s.plot.map((x) => x.id === p.id ? { ...x, title: e.target.value } : x) }))} />
                  <button className={`kd-btn sm ${p.current ? "solid" : "ghost"}`} onClick={() => setCurrent(p.id)}>{p.current ? "現在地" : "ここへ"}</button>
                </div>
                <textarea className="kd-area" rows={1} style={{ marginTop: 6 }} value={p.note} onChange={(e) => setState((s) => ({ ...s, plot: s.plot.map((x) => x.id === p.id ? { ...x, note: e.target.value } : x) }))} />
                <button className="kd-mini" onClick={() => setState((s) => ({ ...s, plot: s.plot.filter((x) => x.id !== p.id) }))}>削除</button>
              </div>
            ))}
            <button className="kd-btn ghost" onClick={() => setState((s) => ({ ...s, plot: [...s.plot, { id: uid(), title: "新しい節", note: "", current: false, body: "" }] }))}>＋ 節を追加</button>
          </div></div>
          <div className="kd-sec"><div className="kd-sec-h">ABCの構成 ver2</div><div className="kd-sec-b">
            {ABC_FIELDS.map((f) => <Inp key={f.k} label={f.label} value={state.structure.abc?.[f.k]} onChange={(v) => setStructSub("abc", f.k, v)} />)}
          </div></div>
          <div className="kd-sec"><div className="kd-sec-h">ナゾ＆解明のフォーマット</div><div className="kd-sec-b">
            {MYSTERY_FIELDS.map((f) => f.rows ? <Area key={f.k} label={f.label} hint={f.hint} rows={f.rows} value={state.structure.mystery?.[f.k]} onChange={(v) => setStructSub("mystery", f.k, v)} /> : <Inp key={f.k} label={f.label} hint={f.hint} value={state.structure.mystery?.[f.k]} onChange={(v) => setStructSub("mystery", f.k, v)} />)}
          </div></div>
          <div className="kd-sec"><div className="kd-sec-h">内面崩壊＆V字回復（8ステージ）</div><div className="kd-sec-b">
            {COLLAPSE_FIELDS.map((f) => <Area key={f.k} label={f.label} rows={f.rows} value={state.structure.collapse?.[f.k]} onChange={(v) => setStructSub("collapse", f.k, v)} />)}
          </div></div>
        </div>
      )}

      {view === "chars" && <CharactersView state={state} setState={setState} />}
      {view === "world" && (<div className="kd-page"><div className="kd-h">世界観・設定</div>
        <textarea className="kd-area" style={{ minHeight: "50vh", fontSize: 14 }} value={state.world} onChange={(e) => patch({ world: e.target.value })} /></div>)}
      {view === "emotion" && <EmotionView state={state} setState={setState} />}
      {view === "review" && <ReviewView state={state} setState={setState} />}
      {view === "export" && <ExportView state={state} setState={setState} onExport={() => setPrinting(true)} />}

      {aiOpen && (
        <div className="kd-ai-panel">
          <div className="kd-ai-head">
            <div className="kd-h" style={{ margin: 0 }}>複数AIによる分析</div>
            <div className="kd-spacer" />
            <button className="kd-btn ghost sm" onClick={() => setCfgOpen((v) => !v)}>{cfgOpen ? "設定を閉じる" : "AI設定"}</button>
            <button className="kd-btn ghost sm" style={{ marginLeft: 6 }} onClick={() => setAiOpen(false)}>閉じる</button>
          </div>
          <div className="kd-ai-body">
            {cfgOpen && (
              <div className="kd-cfg">
                <div className="kd-lbl" style={{ marginTop: 0 }}>使用するAI</div>
                <div style={{ fontSize: 12, color: "var(--sumi-soft)", lineHeight: 1.6 }}>
                  ・Claude … このアプリ内で常に動作（追加設定なし）<br />
                  ・OpenAI / Gemini … APIキーを入れて有効化。<b>ご自身の環境で実行時に動作</b>します。
                </div>
                <label className="kd-check" style={{ marginTop: 10 }}>
                  <input type="checkbox" checked={state.aiProviders.useOpenAI} onChange={(e) => patchAP({ useOpenAI: e.target.checked })} />OpenAI（GPT）を使う
                </label>
                {state.aiProviders.useOpenAI && (<>
                  <input className="kd-input" style={{ marginTop: 6 }} placeholder="OpenAI APIキー" value={state.aiProviders.openaiKey} onChange={(e) => patchAP({ openaiKey: e.target.value })} />
                  <input className="kd-input" style={{ marginTop: 6 }} placeholder="モデル名（例 gpt-5.5）" value={state.aiProviders.openaiModel} onChange={(e) => patchAP({ openaiModel: e.target.value })} />
                </>)}
                <label className="kd-check" style={{ marginTop: 10 }}>
                  <input type="checkbox" checked={state.aiProviders.useGemini} onChange={(e) => patchAP({ useGemini: e.target.checked })} />Gemini を使う
                </label>
                {state.aiProviders.useGemini && (<>
                  <input className="kd-input" style={{ marginTop: 6 }} placeholder="Google AI Studio APIキー" value={state.aiProviders.geminiKey} onChange={(e) => patchAP({ geminiKey: e.target.value })} />
                  <input className="kd-input" style={{ marginTop: 6 }} placeholder="モデル名（例 gemini-3.1-pro）" value={state.aiProviders.geminiModel} onChange={(e) => patchAP({ geminiModel: e.target.value })} />
                </>)}
                <div className="kd-note">キーはこの端末のブラウザ内にのみ保存されます。共有端末では入力を避けてください。</div>
              </div>
            )}
            {aiBusy && <div className="kd-empty">構成・文体・ペースで講評しています…</div>}
            {!aiBusy && aiResults.length === 0 && <div className="kd-empty">「AIで分析」で講評が出ます。各講評は「感想に保存」で感想タブに残せます。</div>}
            {aiResults.map((r) => (
              <div className="kd-ai-card" key={r.id}>
                <div className="kd-ai-lens">{r.provider}</div>
                {(r.kousei != null || r.buntai != null || r.pace != null) && (
                  <div className="kd-scores">
                    <span className="kd-chip">構成 <b>{r.kousei ?? "-"}</b></span>
                    <span className="kd-chip">文体 <b>{r.buntai ?? "-"}</b></span>
                    <span className="kd-chip">ペース <b>{r.pace ?? "-"}</b></span>
                  </div>
                )}
                <div className="kd-ai-comment">{r.comment}</div>
                <button className="kd-btn ghost sm" style={{ marginTop: 10 }} onClick={() => saveCritique(r)}>感想に保存</button>
              </div>
            ))}
            {!aiBusy && aiResults.length > 0 && <button className="kd-btn ghost" style={{ width: "100%" }} onClick={runAnalysis}>もう一度分析する</button>}
          </div>
        </div>
      )}

      <div className="kd-print">
        {printing && (
          <PrintPages text={fullText} cpl={state.settings.charsPerLine} lpp={state.settings.linesPerPage}
            fontStack={font.stack} fontPx={state.settings.exportFontPx} titlePage={state.settings.exportTitlePage}
            title={state.title} author={state.staff.author} />
        )}
      </div>
    </div>
  );
}

function CharactersView({ state, setState }) {
  const [openId, setOpenId] = useState(null);
  const setChar = (id, k, v) => setState((s) => ({ ...s, characters: s.characters.map((c) => c.id === id ? { ...c, [k]: v } : c) }));
  const addChar = () => { const c = emptyChar(); setState((s) => ({ ...s, characters: [...s.characters, c] })); setOpenId(c.id); };
  const removeChar = (id) => setState((s) => ({ ...s, characters: s.characters.filter((c) => c.id !== id) }));
  return (
    <div className="kd-page">
      <div className="kd-h">登場人物 — 一覧をクリックで詳細プロファイリングに展開</div>
      {state.characters.map((c, i) => {
        const open = openId === c.id;
        return (
          <div className="kd-sec" key={c.id}>
            <div className="kd-char-head" onClick={() => setOpenId(open ? null : c.id)}>
              <span className={`kd-chev ${open ? "open" : ""}`}>▶</span>
              <span className="kd-swatch" style={{ background: CHAR_COLORS[i % CHAR_COLORS.length] }} />
              <div className="kd-char-sum">
                <div className="kd-char-nm">{c.name || "（無名）"}</div>
                <div className="kd-char-meta">{[c.role && `役割:${c.role}`, c.feature, c.desire && `欲望:${c.desire}`].filter(Boolean).join(" ／ ") || "詳細未入力"}</div>
              </div>
              <button className="kd-mini" onClick={(e) => { e.stopPropagation(); removeChar(c.id); }}>削除</button>
            </div>
            {open && (
              <div className="kd-char-detail">
                <div className="kd-grid2">
                  <Inp label="名前" value={c.name} onChange={(v) => setChar(c.id, "name", v)} />
                  <Inp label="役割" value={c.role} onChange={(v) => setChar(c.id, "role", v)} />
                </div>
                <Inp label="特徴" value={c.feature} onChange={(v) => setChar(c.id, "feature", v)} />
                <div className="kd-grid2">
                  {CHAR_FIELDS.map(([k, label, hint]) => <Inp key={k} label={label} hint={hint} value={c[k]} onChange={(v) => setChar(c.id, k, v)} />)}
                </div>
                <Area label="心の傷・秘密・その他メモ" rows={2} value={c.note} onChange={(v) => setChar(c.id, "note", v)} />
              </div>
            )}
          </div>
        );
      })}
      <button className="kd-btn ghost" onClick={addChar}>＋ 人物を追加</button>
      <div className="kd-note">ここで追加した人物は感情曲線の列にもなります。</div>
    </div>
  );
}

function ReviewView({ state, setState }) {
  const [form, setForm] = useState({ from: "読者", venue: "", comment: "", date: today() });
  const removeCritique = (id) => setState((s) => ({ ...s, savedCritiques: s.savedCritiques.filter((c) => c.id !== id) }));
  const addFeedback = () => {
    if (!form.comment.trim()) return;
    setState((s) => ({ ...s, feedback: [{ id: uid(), ...form }, ...s.feedback] }));
    setForm({ from: "読者", venue: "", comment: "", date: today() });
  };
  const removeFeedback = (id) => setState((s) => ({ ...s, feedback: s.feedback.filter((f) => f.id !== id) }));

  return (
    <div className="kd-page">
      <div className="kd-sec">
        <div className="kd-sec-h">自分の講評メモ</div>
        <div className="kd-sec-b">
          <textarea className="kd-area" rows={4} placeholder="作品に対する自分の感想（600字ほど）" value={state.authorReview} onChange={(e) => setState((s) => ({ ...s, authorReview: e.target.value }))} />
        </div>
      </div>

      <div className="kd-sec">
        <div className="kd-sec-h">① AIの講評（分析から保存した記録）</div>
        <div className="kd-sec-b">
          {state.savedCritiques.length === 0 && <div className="kd-empty">「AIで分析」の結果を「感想に保存」すると、ここに溜まります。</div>}
          {state.savedCritiques.map((c) => (
            <div className="kd-card" key={c.id}>
              <div className="kd-rec-meta">{c.provider} ・ {c.date}
                {(c.kousei != null || c.buntai != null || c.pace != null) && <>　構成{c.kousei ?? "-"}／文体{c.buntai ?? "-"}／ペース{c.pace ?? "-"}</>}
              </div>
              <div className="kd-ai-comment">{c.comment}</div>
              <button className="kd-mini" onClick={() => removeCritique(c.id)}>削除</button>
            </div>
          ))}
        </div>
      </div>

      <div className="kd-sec">
        <div className="kd-sec-h">② 読者・編集者からの感想</div>
        <div className="kd-sec-b">
          <div className="kd-grid2">
            <div className="kd-fld"><div className="kd-lbl">立場</div>
              <select className="kd-input" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })}>
                {["読者", "編集者", "選考委員", "友人・知人", "その他"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <Inp label="媒体・賞名など" hint="例）カクヨム／〇〇文学賞 一次選考" value={form.venue} onChange={(v) => setForm({ ...form, venue: v })} />
          </div>
          <Area label="感想・講評" rows={3} value={form.comment} onChange={(v) => setForm({ ...form, comment: v })} />
          <div className="kd-grid2">
            <Inp label="日付" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
            <div className="kd-fld" style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="kd-btn solid" onClick={addFeedback}>記録する</button>
            </div>
          </div>
          <div style={{ marginTop: 6 }}>
            {state.feedback.length === 0 && <div className="kd-empty">まだ記録はありません。</div>}
            {state.feedback.map((f) => (
              <div className="kd-card" key={f.id}>
                <div className="kd-rec-meta">{f.from}{f.venue && ` ・ ${f.venue}`} ・ {f.date}</div>
                <div className="kd-ai-comment" style={{ whiteSpace: "pre-wrap" }}>{f.comment}</div>
                <button className="kd-mini" onClick={() => removeFeedback(f.id)}>削除</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function paginate(text, cpl, lpp) {
  const lines = [];
  for (const p of (text || "").split("\n")) {
    const arr = Array.from(p);
    if (arr.length === 0) { lines.push(""); continue; }
    for (let i = 0; i < arr.length; i += cpl) lines.push(arr.slice(i, i + cpl).join(""));
  }
  const pages = [];
  for (let i = 0; i < lines.length; i += lpp) pages.push(lines.slice(i, i + lpp));
  if (pages.length === 0) pages.push([""]);
  return pages;
}

function PrintPages({ text, cpl, lpp, fontStack, fontPx, titlePage, title, author }) {
  const pages = paginate(text, cpl, lpp);
  const pageStyle = { writingMode: "vertical-rl", whiteSpace: "pre", fontFamily: fontStack, fontSize: fontPx + "px", lineHeight: 1.8, height: Math.ceil(cpl * fontPx * 1.06) + "px", letterSpacing: 0, color: "#000" };
  return (
    <>
      {titlePage && (
        <div className="kd-pg kd-pg-title">
          <div style={{ writingMode: "vertical-rl", fontFamily: fontStack, color: "#000" }}>
            <div style={{ fontSize: fontPx * 1.8 + "px", fontWeight: 700, marginLeft: 40 }}>{title || "無題"}</div>
            {author && <div style={{ fontSize: fontPx + "px" }}>{author}</div>}
          </div>
        </div>
      )}
      {pages.map((pg, i) => (
        <div className="kd-pg" key={i}><div style={pageStyle}>{pg.join("\n")}</div></div>
      ))}
    </>
  );
}

function ExportView({ state, setState, onExport }) {
  const st = state.settings;
  const font = FONTS.find((f) => f.id === st.fontId) || FONTS[0];
  const fullText = state.plot.map((p) => p.body || "").join("\n");
  const pages = paginate(fullText, st.charsPerLine, st.linesPerPage);
  const setS = (p) => setState((s) => ({ ...s, settings: { ...s.settings, ...p } }));
  const fileRef = useRef(null);
  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = (state.title || "原稿").replace(/[\\/:*?"<>|\s]/g, "_");
    a.href = url; a.download = `kakidokoro_${safe}_${today()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (window.confirm("現在の内容を、読み込むファイルの内容で置き換えます。よろしいですか？")) {
          setState((p) => migrate(applyLoaded(DEFAULT_STATE, parsed)));
        }
      } catch (err) { window.alert("読み込みに失敗しました。このアプリで書き出したJSONファイルを選んでください。"); }
      e.target.value = "";
    };
    reader.readAsText(file);
  };
  return (
    <div className="kd-page">
      <div className="kd-h">PDF出力（縦書き・ガイド線なし）</div>
      <div className="kd-sec"><div className="kd-sec-h">出力設定</div><div className="kd-sec-b">
        <div className="kd-grid2">
          <div className="kd-fld"><div className="kd-lbl">一行の字数</div><input className="kd-input" type="number" min={1} max={60} value={st.charsPerLine} onChange={(e) => setS({ charsPerLine: Number(e.target.value) })} /></div>
          <div className="kd-fld"><div className="kd-lbl">1ページの行数</div><input className="kd-input" type="number" min={1} max={60} value={st.linesPerPage} onChange={(e) => setS({ linesPerPage: Number(e.target.value) })} /></div>
          <div className="kd-fld"><div className="kd-lbl">出力用の字の大きさ(px)</div><input className="kd-input" type="number" min={8} max={30} value={st.exportFontPx} onChange={(e) => setS({ exportFontPx: Number(e.target.value) })} /></div>
          <div className="kd-fld"><div className="kd-lbl">書体</div><select className="kd-input" value={st.fontId} onChange={(e) => setS({ fontId: e.target.value })}>{FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select></div>
        </div>
        <label className="kd-check"><input type="checkbox" checked={st.exportTitlePage} onChange={(e) => setS({ exportTitlePage: e.target.checked })} />表紙（タイトル・作者）を付ける</label>
        <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="kd-btn solid" onClick={onExport}>PDFで書き出す</button>
          <span className="kd-note" style={{ margin: 0 }}>本文 全 {pages.length} ページ（{st.charsPerLine}字 × {st.linesPerPage}行）</span>
        </div>
        <div className="kd-note">ボタンで印刷ダイアログが開きます。送信先を「PDFに保存」にすると、ガイド線なしの縦書きPDFになります。プレビュー内で開かない場合は、jsxをダウンロードしてご自身の環境で実行してください。</div>
      </div></div>
      <div className="kd-sec"><div className="kd-sec-h">データの引き継ぎ（別のPCへ移す）</div><div className="kd-sec-b">
        <div className="kd-note" style={{ marginTop: 0, marginBottom: 10 }}>原稿・設定・登場人物・気分曲線・講評など、すべてを1つのファイルに書き出せます。新しいPCでこのアプリを開き、そのファイルを読み込めば続きから使えます。</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="kd-btn solid" onClick={exportData}>データを書き出す</button>
          <button className="kd-btn ghost" onClick={() => fileRef.current && fileRef.current.click()}>データを読み込む</button>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={importData} />
        </div>
        <div className="kd-note">読み込むと今の内容は上書きされます。念のため、先に書き出してから読み込むと安全です。</div>
      </div></div>
      <div className="kd-sec"><div className="kd-sec-h">プレビュー（1ページ目）</div><div className="kd-sec-b" style={{ overflowX: "auto" }}>
        <div style={{ border: "1px solid var(--edge)", background: "#fff", padding: 16, display: "inline-block" }}>
          <div style={{ writingMode: "vertical-rl", whiteSpace: "pre", fontFamily: font.stack, fontSize: st.exportFontPx + "px", lineHeight: 1.8, height: Math.ceil(st.charsPerLine * st.exportFontPx * 1.06) + "px", color: "#000" }}>{pages[0].join("\n")}</div>
        </div>
      </div></div>
    </div>
  );
}

function EmotionView({ state, setState }) {
  const scenes = state.plot; // 章（節）＝場面。構成タブと連動
  const READER_COLOR = "#B5533C";
  const getV = (cid, sid) => { const v = state.emotion.values?.[cid]?.[sid]; return typeof v === "number" ? v : 0; };
  const setV = (cid, sid, val) => setState((s) => { const values = { ...(s.emotion.values || {}) }; values[cid] = { ...(values[cid] || {}), [sid]: val }; return { ...s, emotion: { ...s.emotion, values } }; });
  const getR = (sid) => { const v = state.emotion.reader?.[sid]; return typeof v === "number" ? v : 0; };
  const setR = (sid, val) => setState((s) => ({ ...s, emotion: { ...s.emotion, reader: { ...(s.emotion.reader || {}), [sid]: val } } }));
  const chartData = scenes.map((sc, i) => { const row = { name: `${i + 1}.${sc.title || "無題"}`, "読者の気分": getR(sc.id) }; state.characters.forEach((c) => { row[c.name] = getV(c.id, sc.id); }); return row; });
  return (
    <div className="kd-page">
      <div className="kd-h">気分曲線 — 読者の気分（読み心地）＋ 登場人物の感情</div>
      <div className="kd-note" style={{ marginTop: 0, marginBottom: 10 }}>横軸は構成タブの節（章）と連動しています。節の追加・削除・並べ替え・改名は構成タブで。縦軸は −5（暗い・不安・重い）〜 +5（明るい・高揚・軽い）。太い朱色の線が「読者が読み進めながら感じる気分の上下」、細い線が各登場人物の感情です。</div>
      {scenes.length === 0 ? (
        <div className="kd-empty">構成タブで節を追加すると、ここに横軸として並びます。</div>
      ) : (<>
      <div style={{ background: "var(--paper-2)", border: "1px solid var(--edge)", borderRadius: 2, padding: "16px 10px 8px" }}>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 8, right: 20, bottom: 8, left: -10 }}>
            <CartesianGrid stroke="#D6D0C1" strokeDasharray="2 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5b554d" }} />
            <YAxis domain={[-5, 5]} tick={{ fontSize: 12, fill: "#5b554d" }} />
            <ReferenceLine y={0} stroke="#B5533C" strokeOpacity={0.4} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 2, border: "1px solid #D6D0C1" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="読者の気分" stroke={READER_COLOR} strokeWidth={3.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            {state.characters.map((c, i) => <Line key={c.id} type="monotone" dataKey={c.name} stroke={CHAR_COLORS[i % CHAR_COLORS.length]} strokeWidth={1.75} strokeOpacity={0.85} dot={{ r: 2.5 }} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="kd-emo-grid">
        <thead><tr>
          <th style={{ textAlign: "left" }}>節（章）</th>
          <th style={{ color: READER_COLOR }}><span className="kd-swatch" style={{ background: READER_COLOR, display: "inline-block", marginRight: 5 }} />読者の気分</th>
          {state.characters.map((c, i) => <th key={c.id}><span className="kd-swatch" style={{ background: CHAR_COLORS[i % CHAR_COLORS.length], display: "inline-block", marginRight: 5 }} />{c.name}</th>)}
        </tr></thead>
        <tbody>
          {scenes.map((sc, i) => (
            <tr key={sc.id}>
              <td className="rowh" style={{ fontSize: 12 }}>{i + 1}. {sc.title || "（無題）"}</td>
              <td style={{ background: "#F6ECE7" }}><input type="number" min={-5} max={5} value={getR(sc.id)} onChange={(e) => setR(sc.id, Number(e.target.value))} /></td>
              {state.characters.map((c) => <td key={c.id}><input type="number" min={-5} max={5} value={getV(c.id, sc.id)} onChange={(e) => setV(c.id, sc.id, Number(e.target.value))} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="kd-note">節名は構成タブでの章タイトルがそのまま表示されます。人物は登場人物タブと共有です。</div>
      </>)}
    </div>
  );
}
