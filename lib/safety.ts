const critical = ["kill myself", "kill yourself", "want to die", "hurt myself", "hurt yourself", "someone is hurting me", "muốn chết", "tự làm đau"];
const warning = ["i am scared", "i'm scared", "hurt me", "feel unsafe", "con sao", "con sợ", "đánh con"];

export const MAX_INPUT = 4000;
export const MAX_OUTPUT = 4000;
export const MAX_HISTORY_MESSAGES = 10;
export const PROVIDER_TIMEOUT_MS = 5000;
export const PROVIDER_MAX_TOKENS = 400;
export const SYSTEM_PROMPT = "You are a calm, child-safe learning helper. Never encourage secrecy, dependency, harm, or replacing trusted adults. Keep answers brief and kind.";

export type Risk = { safe: true } | { safe: false; severity: "warning" | "critical" };
export type OutputRisk = { severity: "warning" | "critical"; content: string };
export type ChatHistoryMessage = { role: "user" | "assistant"; content: string };

export function assessSafety(content: string): Risk {
  const normalized = content.toLocaleLowerCase();
  if (critical.some((term) => normalized.includes(term))) return { safe: false as const, severity: "critical" as const };
  if (warning.some((term) => normalized.includes(term))) return { safe: false as const, severity: "warning" as const };
  return { safe: true as const };
}

export function safeFallback(input: string, risky: boolean) {
  if (risky) return "Thank you for telling me. Please go to a trusted adult right now and tell them you need help. If you are in immediate danger, call your local emergency number.";
  return `I hear you. Let's take this one step at a time. What is one small thing about “${input.slice(0, 80)}” you would like help with?`;
}

export type ChatResponse = { content: string; provider: "safety-fallback" | "fallback" | "openai-compatible"; inputRisk: Risk; outputRisk: OutputRisk | undefined };

async function fetchWithLimits(url: string, init: RequestInit, external?: AbortSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("Provider request timed out")), PROVIDER_TIMEOUT_MS);
  const forward = () => controller.abort(external?.reason);
  if (external?.aborted) controller.abort(external.reason);
  else external?.addEventListener("abort", forward, { once: true });
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    external?.removeEventListener("abort", forward);
  }
}

export async function chatResponse(input: string, options: { history?: ChatHistoryMessage[]; signal?: AbortSignal } = {}): Promise<ChatResponse> {
  const inputRisk = assessSafety(input);
  if (!inputRisk.safe) return { content: safeFallback(input, true), provider: "safety-fallback", inputRisk, outputRisk: undefined };
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { content: safeFallback(input, false), provider: "fallback", inputRisk, outputRisk: undefined };
  try {
    const history = (options.history ?? [])
      .slice(-MAX_HISTORY_MESSAGES)
      .map((message) => ({ role: message.role, content: message.content.slice(0, MAX_INPUT) }));
    const response = await fetchWithLimits(`${(process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        temperature: 0.3,
        max_tokens: PROVIDER_MAX_TOKENS,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history, { role: "user", content: input }],
      }),
    }, options.signal);
    if (!response.ok) throw new Error(`Provider returned ${response.status}`);
    const json = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    const raw = json.choices?.[0]?.message?.content;
    if (typeof raw !== "string" || !raw.trim()) throw new Error("Provider returned no usable content");
    const content = raw.trim().slice(0, MAX_OUTPUT);
    const outputRisk = assessSafety(content);
    if (!outputRisk.safe) return { content: safeFallback(input, true), provider: "safety-fallback", inputRisk, outputRisk: { severity: outputRisk.severity, content } };
    return { content, provider: "openai-compatible", inputRisk, outputRisk: undefined };
  } catch {
    return { content: safeFallback(input, false), provider: "fallback", inputRisk, outputRisk: undefined };
  }
}
