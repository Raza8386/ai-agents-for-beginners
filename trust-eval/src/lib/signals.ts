import { PACKS, type Pack } from "./types";

type OptionalPack = Exclude<Pack, "core">;

/** Keyword signals that trigger optional evaluator packs in standard mode. */
const SIGNALS: Record<Exclude<OptionalPack, "nca">, RegExp[]> = {
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
    /\bcyber ?security\b/i,
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

/** Mentions of NCA or its control frameworks trigger the NCA pack on their own. */
const NCA_DIRECT: RegExp[] = [
  /\bNCA\b/,
  /National Cybersecurity Authority/i,
  /الهيئة الوطنية للأمن السيبراني/,
  /\bECC[- ]?[12]\b/,
  /\bEssential Cybersecurity Controls\b/i,
  /\b(CCC|CSCC|OTCC|TCC)[- ]?[12]?\b/,
];

/** A Saudi context triggers the NCA pack only when the content is also about security. */
const SAUDI_CONTEXT: RegExp[] = [
  /\bSaudi\b/i,
  /\bKSA\b/,
  /\bthe Kingdom\b/,
  /\b(SAMA|SDAIA|CITC|CST)\b/,
  /\b(Riyadh|Jeddah|Dammam)\b/i,
  /السعودية|المملكة/,
];

/** Returns the optional packs whose signals appear in the prompt or response, in catalogue order. */
export function detectPacks(prompt: string, response: string): Pack[] {
  const text = `${prompt}\n${response}`;
  const hit = (patterns: RegExp[]) => patterns.some((re) => re.test(text));

  const triggered = new Set<OptionalPack>(
    (Object.keys(SIGNALS) as (keyof typeof SIGNALS)[]).filter((pack) => hit(SIGNALS[pack])),
  );
  if (hit(NCA_DIRECT) || (triggered.has("security") && hit(SAUDI_CONTEXT))) {
    triggered.add("nca");
    // NCA guidance is security guidance, so the general security pack runs alongside it.
    triggered.add("security");
  }

  return PACKS.filter((pack): pack is OptionalPack => pack !== "core" && triggered.has(pack));
}
