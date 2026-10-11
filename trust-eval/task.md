# TrustEval — Tasks

Status: `[x]` done · `[ ]` to do. Priorities: **P0** before relying on results · **P1** before a public launch · **P2** product roadmap.

## Done

- [x] Evaluation engine: catalogue, pack signals, rule evaluators, Claude judge with structured output, aggregation (`src/lib/`)
- [x] `POST /api/evaluate` with input validation, per-IP rate limit and optional Turnstile
- [x] `/try` page: examples, Quick/Standard modes, Ctrl+Enter, report view, JSON export
- [x] Rule-only operation when no API key is set, with PARTIAL verdicts and a notice
- [x] Judge refusals and malformed output reported as skipped checks, not errors
- [x] Regulatory packs: NCA ECC (6), SAMA (5), PDPL (6), SDAIA AI Ethics (7)
- [x] Shared regulatory trigger table in `signals.ts`
- [x] 41 unit tests; typecheck and production build pass
- [x] Accessibility fixes on `/try`: named mode group, live region, focus to report, decorative bars hidden, AA contrast, visible focus (axe: 0 violations, light and dark)
- [x] README, `design.md`, `frontend-ui.md`, PR [Raza8386/ai-agents-for-beginners#1](https://github.com/Raza8386/ai-agents-for-beginners/pull/1)

## P0 — Verify before relying on results

- [ ] **Run a real Claude-graded evaluation.** Set `ANTHROPIC_API_KEY`, run each `/try` example, and confirm the request is accepted, the JSON parses, and the verdicts match expectations. So far the judge has only run against a stub client.
- [ ] **Check regulatory figures against the official texts:**
  - [ ] NCA: ECC-1:2018 vs ECC-2:2024 subdomain numbers used in criteria (2-2, 2-5, 2-12, 2-13, 3-1, 4-2)
  - [ ] NCA: 12-month minimum retention for security event logs
  - [ ] NCA: in-Kingdom hosting rule (ECC 4-2, CCC) and which entities it applies to
  - [ ] SAMA: CSF four-domain structure and the maturity level 3 minimum
  - [ ] SAMA: approval or no-objection for material outsourcing and for customer data hosted abroad
  - [ ] PDPL: Royal Decree M/19 (2021), 2023 amendments, list of lawful bases
  - [ ] PDPL: 72-hour breach notification to SDAIA under the Implementing Regulations
  - [ ] PDPL: transfer conditions and the sensitive-data categories
  - [ ] SDAIA: exact names of the seven AI Ethics Principles
- [ ] **Build a small eval set.** Write 20–30 labelled prompt/response pairs (pass and fail per pack) and measure verdict agreement, so changes to criteria or the model can be compared.

## P1 — Before a public launch

- [ ] Shared rate limiting (for example Redis or Upstash) instead of in-memory, per-instance counters
- [ ] Trusted-proxy handling for the client IP instead of trusting `x-forwarded-for` as-is
- [ ] Turnstile keys configured in the deployed environment
- [ ] Measure Standard-mode latency and cost per evaluation; tune effort, or offer a faster judge model for Quick mode
- [ ] Request logging and monitoring that doesn't store submitted content
- [ ] Privacy notice on `/try`: what is sent to the judge model and that nothing is stored
- [ ] UI tests (Playwright) for the form, error states and report rendering
- [ ] Add the axe-core accessibility check for `/try` to the automated tests (part of the Playwright UI tests above)
- [ ] Extract `VerdictBadge`, `PillarScores`, `ResultItem` and `NoticeList` from `/try` into `src/components/`
- [ ] Decide whether `trust-eval` stays in this course repo or moves to its own repository

## P2 — Product roadmap

- [ ] **Match the reference API.** Capture `/try` on the reference site with only the Fetch/XHR filter, and align the request and response shapes where useful.
- [ ] **Accounts and organisations:** sign-up, login, two-factor authentication, team members
- [ ] **AI-systems register:** name, type, provider, model and version, deployment type, endpoint
- [ ] **Persistence:** Postgres tables for evaluations, results and reports; evaluation history and trust-score trends on a dashboard
- [ ] **API keys** for programmatic evaluation, with per-plan usage limits
- [ ] **Reports:** PDF and CSV export, shareable report links
- [ ] **Custom evaluators:** organisations define their own criteria and packs
- [ ] **More regulatory packs:** for example the NCA Cloud Cybersecurity Controls (CCC) as its own pack, and other jurisdictions
- [ ] **Batch evaluation:** upload many prompt/response pairs, using the Message Batches API for lower cost
- [ ] **Arabic interface** and Arabic-language evaluation content
