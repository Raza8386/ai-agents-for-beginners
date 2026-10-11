import { PACKS, type Pack } from "./types";

type OptionalPack = Exclude<Pack, "core">;

/** Keyword signals that trigger optional evaluator packs in standard mode. */
const SIGNALS: Record<Exclude<OptionalPack, RegulatoryPack>, RegExp[]> = {
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

/** Saudi references, used to decide whether general content falls under a Saudi regulator. */
const SAUDI_CONTEXT: RegExp[] = [
  /\bSaudi\b/i,
  /\bKSA\b/,
  /\bthe Kingdom\b/,
  /\b(SAMA|SDAIA|CITC|CST)\b/,
  /\b(Riyadh|Jeddah|Dammam)\b/i,
  /السعودية|المملكة/,
];

const AI_TOPIC =
  /\b(AI|artificial intelligence|machine learning|ML models?|LLMs?|large language models?|chatbots?|generative|neural networks?|algorithms?|algorithmic|automated decisions?)\b/i;

const FINANCIAL_INSTITUTION = /\b(bank(s|ing)?|insurer|insurance|fintech|payment service|financ(e|ing) compan(y|ies)|exchange house)\b/i;

type RegulatoryPack = "nca" | "sama" | "pdpl" | "sdaia";

interface RegulatoryTrigger {
  pack: RegulatoryPack;
  /** The general pack that always runs alongside this one, if any. */
  base?: Exclude<OptionalPack, RegulatoryPack>;
  /** Naming the regulator or its frameworks triggers the pack on its own. */
  direct: RegExp[];
  /** Otherwise, the pack triggers when this condition holds and its base pack (if any) fired. */
  inContext: (text: string) => boolean;
}

const saudi = (text: string) => SAUDI_CONTEXT.some((re) => re.test(text));

const REGULATORY: RegulatoryTrigger[] = [
  {
    pack: "nca",
    base: "security",
    direct: [
      /\bNCA\b/,
      /National Cybersecurity Authority/i,
      /الهيئة الوطنية للأمن السيبراني/,
      /\bECC[- ]?[12]\b/,
      /\bEssential Cybersecurity Controls\b/i,
      /\b(CCC|CSCC|OTCC|TCC)[- ]?[12]?\b/,
    ],
    inContext: saudi,
  },
  {
    pack: "sama",
    base: "security",
    direct: [/\bSAMA\b/, /Saudi Central Bank|Saudi Arabian Monetary (Agency|Authority)/i, /البنك المركزي السعودي/],
    inContext: (text) => saudi(text) && FINANCIAL_INSTITUTION.test(text),
  },
  {
    pack: "pdpl",
    base: "privacy",
    direct: [
      /\bPDPL\b/,
      /Personal Data Protection Law/i,
      /نظام حماية البيانات الشخصية/,
    ],
    inContext: saudi,
  },
  {
    pack: "sdaia",
    direct: [
      /\bSDAIA\b.{0,40}\b(AI )?ethic/i,
      /\bAI Ethics Principles\b/i,
      /مبادئ أخلاقيات الذكاء الاصطناعي/,
    ],
    inContext: (text) => saudi(text) && AI_TOPIC.test(text),
  },
];

/** Returns the optional packs whose signals appear in the prompt or response, in catalogue order. */
export function detectPacks(prompt: string, response: string): Pack[] {
  const text = `${prompt}\n${response}`;
  const hit = (patterns: RegExp[]) => patterns.some((re) => re.test(text));

  const triggered = new Set<OptionalPack>(
    (Object.keys(SIGNALS) as (keyof typeof SIGNALS)[]).filter((pack) => hit(SIGNALS[pack])),
  );
  for (const { pack, base, direct, inContext } of REGULATORY) {
    if (hit(direct) || ((!base || triggered.has(base)) && inContext(text))) {
      triggered.add(pack);
      // Regulatory guidance is also general guidance of its kind, so the base pack runs alongside.
      if (base) triggered.add(base);
    }
  }

  return PACKS.filter((pack): pack is OptionalPack => pack !== "core" && triggered.has(pack));
}
