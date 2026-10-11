# TrustEval — Frontend UI

This document specifies the TrustEval user interface: the pages that exist today (§3–4) and the screens planned for the full product (§7). For system design see [`design.md`](design.md); for open work see [`task.md`](task.md).

## 1. Principles

- **Verdict first.** The answer to "can I trust this?" is the first thing on the report, in colour and in words, followed by the evidence behind it.
- **Show the evidence.** Every finding shows what was checked, the quote it relies on, and how to fix it.
- **Never hide gaps.** Skipped checks and notices (no judge configured, judge declined) are shown, never folded into a pass.
- **Plain language.** Labels say what things do ("Evaluate now", "Fix: …"), not internal names.
- **Works without JavaScript-heavy UI.** Plain Tailwind and React; no component library or animation dependency yet.

## 2. Stack and styling

| Concern | Choice |
|---|---|
| Framework | Next.js 15 App Router, React 19; `/try` is a client component, other pages are server components |
| Styling | Tailwind CSS v4 utility classes, no custom component library |
| Theme | Follows the operating system (`color-scheme: light dark`, Tailwind `dark:` variants) |
| Layout width | Content column `max-w-5xl`, `px-4` gutters |
| Bot protection | Cloudflare Turnstile widget, loaded only when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set |

### Colour tokens

| Use | Light | Dark |
|---|---|---|
| Page background | `slate-50` | `slate-950` |
| Surface (cards, header) | `white` + `slate-200` border | `slate-900` + `slate-800` border |
| Primary button | `slate-900` bg, white text | `white` bg, `slate-900` text |
| Secondary text | `slate-500` / `slate-600` | `slate-400` / `slate-500` |
| Error | `red-50` bg, `red-800` text | `red-950` bg, `red-200` text |
| Notice | `amber-50` bg, `amber-900` text | `amber-950` bg, `amber-200` text |

### Status colours

| Value | Badge (verdict) | Text (result status) |
|---|---|---|
| PASS / pass | `emerald-600` | `emerald-700` / dark `emerald-400` |
| WARN / warn | `amber-500` | `amber-700` / dark `amber-400` |
| FAIL / fail | `red-600` | `red-700` / dark `red-400` |
| PARTIAL / skipped | `slate-500` | `slate-500` |

Status is always shown as a word as well as a colour, so it never depends on colour alone.

## 3. Global layout

```
┌──────────────────────────────────────────────────────────┐
│ TrustEval                                    [ Try it ]  │  header: white / slate-900, bottom border
├──────────────────────────────────────────────────────────┤
│                                                          │
│   page content (max-w-5xl, py-8)                         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- **Header:** product name linking to `/`, primary "Try it" button linking to `/try`.
- **Metadata:** title "TrustEval — AI response evaluation".

## 4. Pages built

### 4.1 Landing page `/`

```
Can you trust this AI response?                       (h1, 3xl bold)
Paste a prompt and the answer your AI gave…           (lead paragraph)
[ Evaluate a response ]                               (primary button → /try)

┌ Pillars ───────────────────┐ ┌ 39 evaluators in 9 packs ──────────────┐
│ trust · safety · governance│ │ Core checks always run. In Standard    │
│ · risk · compliance        │ │ mode, packs (…) are added when the     │
└────────────────────────────┘ └ content calls for them. ───────────────┘
```

Pillar names and evaluator and pack counts are read from the catalogue at build time, so they stay in sync with `evaluators.ts`.

### 4.2 Evaluate page `/try`

#### Form

```
Evaluate an AI response                                         (h1)
┌──────────────────────────────────────────────────────────────┐
│ Examples: [Firewall policy (insecure)] [Saudi cloud hosting  │
│ (NCA)] [Saudi bank outsourcing (SAMA)] [Customer data sharing│
│ (PDPL)] [AI credit scoring (SDAIA)] [Customer email (PII)]   │
│ [Password guidance (good)]                                   │
│                                                              │
│ User prompt (optional but recommended)                       │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │                                                          │ │  3 rows
│ └──────────────────────────────────────────────────────────┘ │
│ 15 / 4000                                                    │
│ AI response *                                                │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Paste your AI's response here to evaluate…               │ │  8 rows
│ └──────────────────────────────────────────────────────────┘ │
│ 0 / 8000                                                     │
│ [ Quick | Standard ]  Core evaluators plus packs…  [Evaluate now] │
│ Press Ctrl+Enter to evaluate.                                │
│ [Turnstile widget, when configured]                          │
└──────────────────────────────────────────────────────────────┘
```

| Element | Behaviour |
|---|---|
| Example chips | Fill both fields with a prepared case. Most are deliberately bad, so each pack has something to fail on |
| User prompt | Optional, `maxLength` 4,000, live character count |
| AI response | Required, `maxLength` 8,000, live character count |
| Mode toggle | Two-button segmented control, `aria-pressed`. The hint text changes with the mode |
| Evaluate now | Disabled while the response is empty or a request is in flight; label becomes "Evaluating…" |
| Ctrl+Enter / ⌘+Enter | Submits from anywhere in the form |
| Turnstile | Token read from the form on submit; widget reset after every request, since tokens are single-use |

Limits come from `src/lib/limits.ts`, the same constants the server validates against.

#### Report

```
┌──────────────────────────────────────────────────────────────┐
│ [ FAIL ]  33 / 100   2 hard-fail · 0 soft-fail · 4.2s ·      │
│                      judge: claude-opus-5-5   [Export JSON]  │
│ ⚠ No judge model is configured, so only the rule-based…      │  notices (amber)
│ ┌trust┐┌safety┐┌governance┐┌risk┐┌compliance┐                │  pillar tiles + bar
│ │ 90  ││  0   ││    85    ││ 70 ││    0     │                │
│ └─────┘└──────┘└──────────┘└────┘└──────────┘                │
│ Packs run: core, security, nca                               │
│ ───────────────────────────────────────────────────────────  │
│ FAIL  Credential or secret exposure                          │
│       safety · hard-fail · rule · 0                          │
│       The response appears to contain 1 secret(s).           │
│       │ AWS access key: AKI…OP                               │  evidence (italic, left rule)
│       Fix: Remove the secret, rotate it if it is real…       │
│ ───────────────────────────────────────────────────────────  │
│ PASS  Answers the request …                                  │
└──────────────────────────────────────────────────────────────┘
```

| Part | Content |
|---|---|
| Verdict badge | PASS / WARN / FAIL / PARTIAL in its status colour |
| Score | Overall score out of 100, or "–" when nothing was scored |
| Summary line | Hard-fail and soft-fail counts, duration, judge model when used |
| Export JSON | Downloads the full `Report` as `trust-eval-<timestamp>.json` |
| Notices | One amber box per notice |
| Pillar tiles | Only pillars that were scored; number plus a proportional bar |
| Packs run | Always begins with "core" |
| Result list | In catalogue order: status word, name, pillar, severity, rule or LLM judge, score; then finding, evidence and fix when present |

#### States

| State | What the user sees |
|---|---|
| Empty | Form only; Evaluate disabled until the response has text |
| Loading | Button reads "Evaluating…" and is disabled; the previous report is cleared |
| Success | Report section below the form |
| Validation or server error | Red alert (`role="alert"`) with the server's message, e.g. "AI response is required", "Too many requests…" |
| No judge configured | Report with PARTIAL (or FAIL from rules), a notice, and LLM checks marked skipped |
| Judge declined | Same as above, with the decline reason as the notice |

### 4.3 Responsive behaviour

- Under 640 px, pillar tiles stack in one column; from `sm` they sit in five columns.
- The mode toggle, hint and button wrap onto new lines on narrow screens (`flex-wrap`).
- Text areas fill the content width.

## 5. Accessibility

**In place**
- Each text area is wrapped in its `<label>`; the required field is marked `required`.
- Mode buttons use `aria-pressed`; the error message uses `role="alert"`.
- Status is conveyed in text, not only colour.
- Native buttons and form submission, so keyboard use works throughout.

**Gaps to close** (also in `task.md`)
- Give the mode toggle group an accessible name (`aria-label="Evaluation mode"`).
- Announce loading and completion with an `aria-live="polite"` region, and move focus to the verdict when a report arrives.
- Mark pillar bars as decorative (`aria-hidden`), since the number beside them carries the value.
- Check colour contrast for `amber-500` badges with white text and `slate-500` secondary text in both themes.
- Visible focus styles on chips and toggle buttons.

## 6. Content guidelines

- Sentence case for headings and buttons ("Evaluate now", not "Evaluate Now").
- Findings are one or two sentences, specific to the response. Fixes start with a verb.
- Evidence is a short quote, redacted when it contains personal data or secrets.
- Numbers: scores as integers out of 100, durations to one decimal place in seconds.

## 7. Planned screens

The full product adds signed-in screens behind a sidebar layout. These follow the reference product's structure and the P2 roadmap in `task.md`; none are built yet.

```
┌────────────┬───────────────────────────────────────────────┐
│ TrustEval  │ Search…                      [user ▾]         │
│            ├───────────────────────────────────────────────┤
│ Dashboard  │                                               │
│ Evaluations│   page content                                │
│ AI systems │                                               │
│ Reports    │                                               │
│ Settings   │                                               │
│ Billing    │                                               │
└────────────┴───────────────────────────────────────────────┘
```

| Screen | Purpose | Main components |
|---|---|---|
| Sign in / sign up | Account access | Email and password, two-factor prompt, password reset |
| Dashboard | Health at a glance | Trust score trend chart, pass rate, average score, evaluations this month, recent evaluations, quick actions |
| AI systems | Register of AI systems being evaluated | Table (name, type, provider, model, deployment, last evaluated, status); add and edit form; archive with confirmation |
| New evaluation | Evaluate a registered system | Pick a system, choose packs or individual evaluators (searchable, grouped by pack), paste input or upload a batch file, run |
| Evaluation history | Past runs | Filterable table by system, verdict, date; status chips (pending, running, completed, failed) |
| Report | One evaluation in full | Today's report view plus PDF and CSV export, share link, and per-section "Was this helpful?" feedback |
| Settings | Organisation and personal settings | Profile, team members, API keys (create, copy once, revoke, last used), notifications, appearance, language |
| Billing | Plan and usage | Current plan, usage against limits, upgrade and downgrade, locked-feature prompts |

**Shared components to extract when these screens are built:** `VerdictBadge`, `PillarScores`, `ResultItem`, `NoticeList`, `ModeToggle`, `EmptyState`, `DataTable`, `ConfirmDialog`. The first four already exist inline in `/try` and should move to `src/components/` first.

## 8. Internationalisation

- All strings are inline English today. Before adding Arabic, move them into message files (for example with next-intl) keyed by screen, with ICU plurals for counts such as "3 hard-fail evaluators".
- Arabic needs a right-to-left layout: `dir="rtl"` on `<html>`, logical Tailwind utilities (`ms-`/`me-`, `ps-`/`pe-`, `start`/`end`) in place of left/right, and mirrored icons where direction matters.
- Evidence quotes keep the direction of the original text (`dir="auto"`).
