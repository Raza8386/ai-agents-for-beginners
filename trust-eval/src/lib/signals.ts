import type { Pack } from "./types";

/** Keyword signals that trigger optional evaluator packs in standard mode. */
const SIGNALS: Record<Exclude<Pack, "core">, RegExp[]> = {
  security: [
    /\bfirewall\b/i,
    /\bvulnerab/i,
    /\bexploit/i,
    /\bCVE-\d{4}-\d+/i,
    /\bmalware\b/i,
    /\bpenetration test|\bpentest/i,
    /\b(IAM|MFA|SSO|RBAC)\b/,
    /\bpassword policy|\bpasswords?\b/i,
    /\bencrypt/i,
    /\b(TLS|SSL|VPN|SIEM|EDR|IDS|IPS)\b/,
    /\bincident response\b/i,
    /\b(ISO ?27001|NIST|NCA ECC|SOC ?2|CIS benchmark)/i,
    /\bopen ports?\b|\bport \d+\b/i,
  ],
  privacy: [
    /\bpersonal (data|information)\b/i,
    /\bPII\b/,
    /\b(GDPR|PDPL|CCPA|HIPAA)\b/,
    /\bconsent\b/i,
    /\bdata subject\b/i,
    /\bcustomer (data|records)\b/i,
  ],
  finance: [
    /\binvest(ment|ing|or)?\b/i,
    /\b(stocks?|shares|crypto|bitcoin|portfolio)\b/i,
    /\b(loan|mortgage|credit score|interest rate)\b/i,
    /\btax(es|ation)?\b/i,
    /\bretirement\b/i,
  ],
  health: [
    /\b(diagnos|symptom|medication|dosage|dose|prescri)/i,
    /\b(mg|milligrams?)\b/i,
    /\b(disease|treatment|therapy|pregnan)/i,
  ],
  code: [/```/, /\b(def|function|class|import|const|SELECT|INSERT)\b/],
};

/** Returns the optional packs whose signals appear in the prompt or response, in catalogue order. */
export function detectPacks(prompt: string, response: string): Pack[] {
  const text = `${prompt}\n${response}`;
  return (Object.keys(SIGNALS) as Exclude<Pack, "core">[]).filter((pack) =>
    SIGNALS[pack].some((re) => re.test(text)),
  );
}
