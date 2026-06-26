"use client";

import { useState, useCallback } from "react";
import {
  tokenizeQuery,
  validateQuery,
  Token,
  TokenizeResult,
  ValidateResult,
} from "../lib/api";

// ─── Token color mapping ───────────────────────────────────────────────────
const TOKEN_META: Record<string, { label: string; emoji: string }> = {
  KEYWORD: { label: "Keyword", emoji: "🔵" },
  IDENTIFIER: { label: "Identifier", emoji: "🟢" },
  STRING: { label: "String", emoji: "🟡" },
  NUMBER: { label: "Number", emoji: "🟣" },
  OPERATOR: { label: "Operator", emoji: "🔴" },
  PUNCTUATION: { label: "Punctuation", emoji: "⚫" },
  AGGREGATE_FUNCTION: { label: "Aggregate Fn", emoji: "🩷" },
  WILDCARD: { label: "Wildcard", emoji: "🔷" },
  UNKNOWN: { label: "Unknown", emoji: "⚪" },
};

const EXAMPLES = [
  {
    label: "SELECT with WHERE",
    query: "SELECT id, name, age FROM students WHERE age > 18 ORDER BY name ASC",
  },
  {
    label: "Aggregate Functions",
    query: "SELECT COUNT(*), AVG(salary) FROM employees WHERE department = 'Engineering'",
  },
  {
    label: "INSERT INTO",
    query: "INSERT INTO students (id, name, age) VALUES (1, 'Alice', 21)",
  },
  {
    label: "UPDATE SET",
    query: "UPDATE employees SET salary = 75000, department = 'HR' WHERE id = 5",
  },
  {
    label: "DELETE FROM",
    query: "DELETE FROM orders WHERE status = 'cancelled' AND total < 100",
  },
  {
    label: "Syntax Error (missing FROM)",
    query: "SELECT name age WHERE id = 1",
  },
];

// ─── Subcomponents ─────────────────────────────────────────────────────────

function TokenChip({ token }: { token: Token }) {
  const [hovered, setHovered] = useState(false);
  const meta = TOKEN_META[token.type] || { label: token.type, emoji: "⚪" };
  return (
    <span
      className={`token-chip token-${token.type}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`Type: ${meta.label} | Position: ${token.position}`}
    >
      {token.value}
      {hovered && (
        <span
          style={{
            fontSize: 10,
            opacity: 0.7,
            marginLeft: 3,
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {meta.label}
        </span>
      )}
    </span>
  );
}

function Legend() {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        padding: "12px 16px",
        background: "var(--surface-2)",
        borderRadius: 10,
        border: "1px solid var(--border)",
      }}
    >
      {Object.entries(TOKEN_META).map(([type, { label, emoji }]) => (
        <span
          key={type}
          className={`token-chip token-${type}`}
          style={{ fontSize: 12, cursor: "default" }}
        >
          {emoji} {label}
        </span>
      ))}
    </div>
  );
}

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "12px 20px",
        borderRadius: 12,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        minWidth: 90,
      }}
    >
      <span style={{ fontSize: 24, fontWeight: 700, color }}>{value}</span>
      <span
        style={{
          fontSize: 11,
          color: "var(--text-secondary)",
          fontWeight: 500,
          marginTop: 2,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function ValidationBadge({ valid }: { valid: boolean }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 18px",
        borderRadius: 100,
        background: valid ? "var(--success-light)" : "var(--error-light)",
        border: `1.5px solid ${valid ? "var(--success)" : "var(--error)"}`,
        color: valid ? "#15803D" : "#DC2626",
        fontWeight: 600,
        fontSize: 14,
      }}
    >
      {valid ? (
        <>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="8" fill="#22C55E" />
            <path
              d="M4.5 8.5L6.5 10.5L11.5 5.5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Query is Valid
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="8" fill="#EF4444" />
            <path
              d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Query has Errors
        </>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function Home() {
  const [query, setQuery] = useState(
    "SELECT id, name, age FROM students WHERE age > 18 ORDER BY name ASC"
  );
  const [tokenResult, setTokenResult] = useState<TokenizeResult | null>(null);
  const [validateResult, setValidateResult] = useState<ValidateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"tokens" | "validate">("tokens");

  const handleRun = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const [tok, val] = await Promise.all([
        tokenizeQuery(query),
        validateQuery(query),
      ]);
      setTokenResult(tok);
      setValidateResult(val);
    } catch (e: any) {
      setError(
        e?.message ||
          "Could not connect to the backend. Make sure FastAPI is running on http://localhost:8000"
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleExample = (q: string) => {
    setQuery(q);
    setTokenResult(null);
    setValidateResult(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* ── Header ── */}
      <header
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "0 32px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="4" width="16" height="2.5" rx="1.25" fill="white" />
              <rect x="2" y="8.75" width="11" height="2.5" rx="1.25" fill="white" opacity="0.7" />
              <rect x="2" y="13.5" width="14" height="2.5" rx="1.25" fill="white" opacity="0.5" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", lineHeight: 1.2 }}>
              SQL Tokenizer
            </div>
            <div style={{ fontWeight: 400, fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.2 }}>
              Lexical Analysis & Syntax Validation
            </div>
          </div>
        </div>
        <div
          style={{
            padding: "5px 14px",
            borderRadius: 100,
            background: "var(--accent-light)",
            color: "var(--accent)",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Compiler Construction · CS Project
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* ── Hero ── */}
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            SQL Query{" "}
            <span style={{ color: "var(--accent)" }}>Tokenizer</span>{" "}
            &amp; Validator
          </h1>
          <p
            style={{
              marginTop: 8,
              color: "var(--text-secondary)",
              fontSize: 15,
              fontWeight: 400,
            }}
          >
            Enter any SQL query below to break it into tokens and validate its
            syntax — no execution, pure compiler front-end analysis.
          </p>
        </div>

        {/* ── Two-column layout ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
          {/* ── Left: Input + Results ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Query Input */}
            <div
              style={{
                background: "var(--surface)",
                borderRadius: 16,
                border: "1px solid var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 18px 10px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: "var(--text-primary)",
                  }}
                >
                  SQL Query Input
                </span>
                <button
                  onClick={() => {
                    setQuery("");
                    setTokenResult(null);
                    setValidateResult(null);
                    setError(null);
                  }}
                  style={{
                    border: "none",
                    background: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: "Poppins, sans-serif",
                    padding: "4px 10px",
                    borderRadius: 6,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.target as HTMLElement).style.background = "var(--surface-2)")
                  }
                  onMouseLeave={(e) =>
                    ((e.target as HTMLElement).style.background = "transparent")
                  }
                >
                  Clear
                </button>
              </div>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. SELECT name, age FROM students WHERE age > 18"
                style={{
                  width: "100%",
                  minHeight: 130,
                  padding: "16px 18px",
                  border: "none",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "var(--text-primary)",
                  background: "transparent",
                }}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleRun();
                }}
              />
              <div
                style={{
                  padding: "10px 18px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <button
                  onClick={handleRun}
                  disabled={loading || !query.trim()}
                  style={{
                    padding: "9px 28px",
                    borderRadius: 10,
                    border: "none",
                    background:
                      loading || !query.trim()
                        ? "var(--border)"
                        : "var(--accent)",
                    color:
                      loading || !query.trim() ? "var(--text-muted)" : "white",
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor:
                      loading || !query.trim() ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "background 0.15s, transform 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && query.trim())
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--accent-dark)";
                  }}
                  onMouseLeave={(e) => {
                    if (!loading && query.trim())
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--accent)";
                  }}
                >
                  {loading ? (
                    <>
                      <span className="loading-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "white", display: "inline-block" }} />
                      <span className="loading-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "white", display: "inline-block" }} />
                      <span className="loading-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "white", display: "inline-block" }} />
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 2L14 8L4 14V2Z" fill="white" />
                      </svg>
                      Analyze Query
                    </>
                  )}
                </button>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    fontWeight: 400,
                  }}
                >
                  ⌘ + Enter to run
                </span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: 12,
                  background: "var(--error-light)",
                  border: "1px solid var(--error)",
                  color: "#B91C1C",
                  fontSize: 14,
                  fontWeight: 500,
                }}
                className="animate-in"
              >
                ⚠️ {error}
              </div>
            )}

            {/* Results Tabs */}
            {(tokenResult || validateResult) && (
              <div className="animate-in">
                {/* Tab bar */}
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    marginBottom: 16,
                    background: "var(--surface-2)",
                    padding: 4,
                    borderRadius: 12,
                    width: "fit-content",
                    border: "1px solid var(--border)",
                  }}
                >
                  {(["tokens", "validate"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: "7px 20px",
                        borderRadius: 9,
                        border: "none",
                        background:
                          activeTab === tab ? "var(--surface)" : "transparent",
                        color:
                          activeTab === tab
                            ? "var(--accent)"
                            : "var(--text-secondary)",
                        fontFamily: "Poppins, sans-serif",
                        fontWeight: activeTab === tab ? 600 : 400,
                        fontSize: 13,
                        cursor: "pointer",
                        boxShadow:
                          activeTab === tab
                            ? "0 1px 4px rgba(0,0,0,0.08)"
                            : "none",
                        transition: "all 0.15s",
                      }}
                    >
                      {tab === "tokens" ? "🔤 Tokens" : "✅ Validation"}
                    </button>
                  ))}
                </div>

                {/* ── Tokens Tab ── */}
                {activeTab === "tokens" && tokenResult && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Stats row */}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <StatBadge
                        label="Total Tokens"
                        value={tokenResult.count}
                        color="var(--accent)"
                      />
                      {Object.entries(tokenResult.type_counts).map(
                        ([type, count]) => (
                          <StatBadge
                            key={type}
                            label={TOKEN_META[type]?.label || type}
                            value={count}
                            color={
                              type === "KEYWORD"
                                ? "var(--token-keyword)"
                                : type === "IDENTIFIER"
                                ? "var(--token-identifier)"
                                : type === "STRING"
                                ? "var(--token-string)"
                                : type === "NUMBER"
                                ? "var(--token-number)"
                                : type === "OPERATOR"
                                ? "var(--token-operator)"
                                : type === "AGGREGATE_FUNCTION"
                                ? "var(--token-aggregate)"
                                : "var(--text-secondary)"
                            }
                          />
                        )
                      )}
                    </div>

                    {/* Token chips */}
                    <div
                      style={{
                        background: "var(--surface)",
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        padding: "20px",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: "var(--text-secondary)",
                          marginBottom: 14,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Token Stream
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        {tokenResult.tokens.map((tok, i) => (
                          <TokenChip key={i} token={tok} />
                        ))}
                      </div>
                    </div>

                    {/* Token table */}
                    <div
                      style={{
                        background: "var(--surface)",
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          padding: "14px 18px",
                          borderBottom: "1px solid var(--border)",
                          fontWeight: 600,
                          fontSize: 13,
                          color: "var(--text-secondary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Token Details
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: 13,
                          }}
                        >
                          <thead>
                            <tr
                              style={{
                                background: "var(--surface-2)",
                              }}
                            >
                              {["#", "Value", "Type", "Position"].map((h) => (
                                <th
                                  key={h}
                                  style={{
                                    padding: "10px 14px",
                                    textAlign: "left",
                                    fontWeight: 600,
                                    color: "var(--text-secondary)",
                                    fontSize: 12,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    borderBottom: "1px solid var(--border)",
                                  }}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {tokenResult.tokens.map((tok, i) => (
                              <tr
                                key={i}
                                style={{
                                  borderBottom: "1px solid var(--border)",
                                  transition: "background 0.1s",
                                }}
                                onMouseEnter={(e) =>
                                  ((e.currentTarget as HTMLElement).style.background =
                                    "var(--surface-2)")
                                }
                                onMouseLeave={(e) =>
                                  ((e.currentTarget as HTMLElement).style.background =
                                    "transparent")
                                }
                              >
                                <td
                                  style={{
                                    padding: "9px 14px",
                                    color: "var(--text-muted)",
                                    fontFamily: "JetBrains Mono, monospace",
                                    fontSize: 12,
                                  }}
                                >
                                  {i + 1}
                                </td>
                                <td
                                  style={{
                                    padding: "9px 14px",
                                    fontFamily: "JetBrains Mono, monospace",
                                    fontWeight: 500,
                                  }}
                                >
                                  <span className={`token-chip token-${tok.type}`} style={{ fontSize: 12 }}>
                                    {tok.value}
                                  </span>
                                </td>
                                <td style={{ padding: "9px 14px" }}>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: "var(--text-secondary)",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.04em",
                                    }}
                                  >
                                    {TOKEN_META[tok.type]?.label || tok.type}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    padding: "9px 14px",
                                    fontFamily: "JetBrains Mono, monospace",
                                    color: "var(--text-muted)",
                                    fontSize: 12,
                                  }}
                                >
                                  {tok.position}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Legend */}
                    <Legend />
                  </div>
                )}

                {/* ── Validation Tab ── */}
                {activeTab === "validate" && validateResult && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Status banner */}
                    <div
                      style={{
                        padding: "16px 20px",
                        borderRadius: 14,
                        background: validateResult.valid
                          ? "var(--success-light)"
                          : "var(--error-light)",
                        border: `1px solid ${validateResult.valid ? "var(--success)" : "var(--error)"}`,
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                      }}
                    >
                      <ValidationBadge valid={validateResult.valid} />
                      {validateResult.valid ? (
                        <span
                          style={{
                            fontSize: 14,
                            color: "#15803D",
                            fontWeight: 400,
                          }}
                        >
                          The query follows correct SQL grammar for SELECT, INSERT, UPDATE, and DELETE statements.
                        </span>
                      ) : (
                        <span style={{ fontSize: 14, color: "#B91C1C" }}>
                          {validateResult.errors[0]?.message}
                        </span>
                      )}
                    </div>

                    {/* Errors detail */}
                    {!validateResult.valid && validateResult.errors.length > 0 && (
                      <div
                        style={{
                          background: "var(--surface)",
                          borderRadius: 14,
                          border: "1px solid var(--border)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            padding: "12px 18px",
                            borderBottom: "1px solid var(--border)",
                            fontWeight: 600,
                            fontSize: 13,
                            color: "var(--text-secondary)",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          Error Details
                        </div>
                        {validateResult.errors.map((err, i) => (
                          <div
                            key={i}
                            style={{
                              padding: "14px 18px",
                              display: "flex",
                              gap: 12,
                              alignItems: "flex-start",
                              borderBottom:
                                i < validateResult.errors.length - 1
                                  ? "1px solid var(--border)"
                                  : "none",
                            }}
                          >
                            <div
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: "50%",
                                background: "var(--error)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                marginTop: 2,
                              }}
                            >
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M3 3L7 7M7 3L3 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            </div>
                            <div>
                              <div
                                style={{
                                  fontWeight: 500,
                                  fontSize: 14,
                                  color: "var(--text-primary)",
                                }}
                              >
                                {err.message}
                              </div>
                              {err.error_type && (
                                <div
                                  style={{
                                    display: "inline-block",
                                    marginTop: 6,
                                    padding: "2px 10px",
                                    borderRadius: 100,
                                    background: "var(--error-light)",
                                    border: "1px solid var(--error)",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: "#B91C1C",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                  }}
                                >
                                  {err.error_type}
                                </div>
                              )}
                              {err.hint && (
                                <div
                                  style={{
                                    marginTop: 8,
                                    padding: "8px 12px",
                                    borderRadius: 8,
                                    background: "#FFF7ED",
                                    border: "1px solid #FED7AA",
                                    fontSize: 13,
                                    color: "#92400E",
                                    lineHeight: 1.5,
                                  }}
                                >
                                  💡 <strong>Hint:</strong> {err.hint}
                                </div>
                              )}
                              {err.position >= 0 && (
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "var(--text-muted)",
                                    marginTop: 6,
                                    fontFamily: "JetBrains Mono, monospace",
                                  }}
                                >
                                  Position: {err.position}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Parse steps */}
                    <div
                      style={{
                        background: "var(--surface)",
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          padding: "12px 18px",
                          borderBottom: "1px solid var(--border)",
                          fontWeight: 600,
                          fontSize: 13,
                          color: "var(--text-secondary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Parser Trace
                      </div>
                      <div style={{ padding: "8px 18px 14px" }}>
                        {validateResult.steps.map((step, i) => (
                          <div key={i} className="step-item">
                            <div className="step-dot" />
                            <span style={{ color: "var(--text-primary)", fontSize: 13 }}>
                              {step}
                            </span>
                          </div>
                        ))}
                        {validateResult.steps.length === 0 && (
                          <div
                            style={{
                              padding: "12px 0",
                              color: "var(--text-muted)",
                              fontSize: 13,
                            }}
                          >
                            No steps recorded.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right: Examples + How It Works ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Examples */}
            <div
              style={{
                background: "var(--surface)",
                borderRadius: 16,
                border: "1px solid var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--border)",
                  fontWeight: 600,
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Examples
              </div>
              <div style={{ padding: "8px" }}>
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.label}
                    onClick={() => handleExample(ex.query)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      transition: "background 0.12s",
                      fontFamily: "Poppins, sans-serif",
                      marginBottom: 2,
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "var(--accent-light)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "transparent")
                    }
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: "var(--accent)",
                        marginBottom: 2,
                      }}
                    >
                      {ex.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ex.query}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* How It Works */}
            <div
              style={{
                background: "var(--surface)",
                borderRadius: 16,
                border: "1px solid var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--border)",
                  fontWeight: 600,
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                How It Works
              </div>
              <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  {
                    step: "1",
                    title: "Lexical Analysis",
                    desc: "The query string is scanned character by character. No Python libraries are used — pure manual scanning identifies keywords, identifiers, numbers, strings, operators, and punctuation.",
                    color: "var(--accent)",
                  },
                  {
                    step: "2",
                    title: "Token Stream",
                    desc: "Each recognized unit becomes a Token with a type, value, and source position. Unknown characters are flagged as lexical errors immediately.",
                    color: "var(--token-identifier)",
                  },
                  {
                    step: "3",
                    title: "Syntax Validation",
                    desc: "A recursive-descent parser checks that the token sequence conforms to SQL grammar rules for SELECT, INSERT, UPDATE, and DELETE statements.",
                    color: "var(--token-string)",
                  },
                ].map(({ step, title, desc, color }) => (
                  <div key={step} style={{ display: "flex", gap: 12 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: color,
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {step}
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: "var(--text-primary)",
                          marginBottom: 3,
                        }}
                      >
                        {title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          lineHeight: 1.6,
                        }}
                      >
                        {desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Supported Statements */}
            <div
              style={{
                background: "var(--accent-light)",
                borderRadius: 14,
                border: "1px solid #C7CDF9",
                padding: "14px 18px",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 12,
                  color: "var(--accent)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 10,
                }}
              >
                Supported SQL Statements
              </div>
              {[
                { kw: "SELECT", desc: "With WHERE, ORDER BY, GROUP BY, HAVING, LIMIT, aggregates, DISTINCT" },
                { kw: "INSERT", desc: "INTO table (cols) VALUES (...)" },
                { kw: "UPDATE", desc: "SET col = val WHERE ..." },
                { kw: "DELETE", desc: "FROM table WHERE ..." },
              ].map(({ kw, desc }) => (
                <div
                  key={kw}
                  style={{
                    display: "flex",
                    gap: 10,
                    marginBottom: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    className="token-chip token-KEYWORD"
                    style={{ fontSize: 11, flexShrink: 0 }}
                  >
                    {kw}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "20px 32px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: 12,
          marginTop: 40,
        }}
      >
        SQL Tokenizer &amp; Validator · Compiler Construction Project · Built with Next.js + FastAPI
      </footer>
    </div>
  );
}
