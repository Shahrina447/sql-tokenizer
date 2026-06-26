const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Token {
  type: string;
  value: string;
  position: number;
}

export interface TokenizeResult {
  tokens: Token[];
  count: number;
  type_counts: Record<string, number>;
}

export interface ValidationError {
  message: string;
  position: number;
  hint?: string;
  error_type?: string;
}

export interface ValidateResult {
  valid: boolean;
  errors: ValidationError[];
  steps: string[];
  tokens: Token[];
}

export interface Example {
  label: string;
  query: string;
}

export async function tokenizeQuery(query: string): Promise<TokenizeResult> {
  const res = await fetch(`${API_BASE}/tokenize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error("Tokenize request failed");
  return res.json();
}

export async function validateQuery(query: string): Promise<ValidateResult> {
  const res = await fetch(`${API_BASE}/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error("Validate request failed");
  return res.json();
}

export async function getExamples(): Promise<{ examples: Example[] }> {
  const res = await fetch(`${API_BASE}/examples`);
  if (!res.ok) throw new Error("Examples request failed");
  return res.json();
}
