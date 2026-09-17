const critical = ["kill myself", "want to die", "hurt myself", "someone is hurting me", "muốn chết", "tự làm đau"];
const warning = ["i am scared", "i'm scared", "hurt me", "feel unsafe", "con sợ", "đánh con"];

export function assessSafety(content: string) {
  const normalized = content.toLocaleLowerCase();
  if (critical.some((term) => normalized.includes(term))) return { safe: false as const, severity: "critical" as const };
  if (warning.some((term) => normalized.includes(term))) return { safe: false as const, severity: "warning" as const };
  return { safe: true as const };
}

export function safeFallback(input: string, risky: boolean) {
  if (risky) return "Thank you for telling me. Please go to a trusted adult right now and tell them you need help. If you are in immediate danger, call your local emergency number.";
  return `I hear you. Let's take this one step at a time. What is one small thing about “${input.slice(0, 80)}” you would like help with?`;
}

export async function chatResponse(input: string) {
  const inputRisk = assessSafety(input);
  if (!inputRisk.safe) return { content: safeFallback(input, true), provider: "safety-fallback" as const, inputRisk };
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { content: safeFallback(input, false), provider: "fallback" as const, inputRisk };
  try {
    const response = await fetch(`${(process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`, {
      method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini", temperature: 0.3, messages: [{ role: "system", content: "You are a calm, child-safe learning helper. Never encourage secrecy, dependency, harm, or replacing trusted adults. Keep answers brief." }, { role: "user", content: input }] })
    });
    if (!response.ok) throw new Error(`Provider returned ${response.status}`);
    const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Provider returned no content");
    const outputRisk = assessSafety(content);
    return { content: outputRisk.safe ? content : safeFallback(input, true), provider: outputRisk.safe ? "openai-compatible" as const : "safety-fallback" as const, inputRisk, outputRisk };
  } catch {
    return { content: safeFallback(input, false), provider: "fallback" as const, inputRisk };
  }
}
