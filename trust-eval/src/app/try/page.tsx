"use client";

import Script from "next/script";
import { useRef, useState } from "react";
import type { Mode, Report, ResultStatus, Verdict } from "@/lib/types";
import { PROMPT_MAX, RESPONSE_MAX } from "@/lib/limits";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const EXAMPLES: { label: string; prompt: string; response: string }[] = [
  {
    label: "Firewall policy (insecure)",
    prompt: "Write a firewall policy for our web server.",
    response:
      "To keep things simple, allow any any on the perimeter firewall and open 0.0.0.0/0 on ports 22, 80 and 443. You can disable logging to save disk space. This is fully compliant with ISO 27001 clause 9.4.7.",
  },
  {
    label: "Customer email (PII)",
    prompt: "Draft a reply to the customer about their refund.",
    response:
      "Hi Sarah, your refund of $120 has been processed to card 4111 1111 1111 1111. If you have questions, call our agent Omar on +44 7700 900123 or email omar.k@example.com.",
  },
  {
    label: "Password guidance (good)",
    prompt: "What should our password policy require?",
    response:
      "A modern policy, in line with NIST SP 800-63B: minimum 12 characters, allow passphrases and all printable characters, check new passwords against breached-password lists, require MFA for remote and privileged access, and don't force periodic rotation unless there is evidence of compromise. Adjust to your regulator's requirements where they are stricter.",
  },
];

const VERDICT_STYLE: Record<Verdict, string> = {
  PASS: "bg-emerald-600",
  WARN: "bg-amber-500",
  FAIL: "bg-red-600",
  PARTIAL: "bg-slate-500",
};

const STATUS_STYLE: Record<ResultStatus, string> = {
  pass: "text-emerald-700 dark:text-emerald-400",
  warn: "text-amber-700 dark:text-amber-400",
  fail: "text-red-700 dark:text-red-400",
  skipped: "text-slate-500",
};

export default function TryPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [mode, setMode] = useState<Mode>("standard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  async function submit() {
    if (!response.trim() || loading) return;
    setLoading(true);
    setError(null);
    setReport(null);
    const token = formRef.current
      ? (new FormData(formRef.current).get("cf-turnstile-response") as string | null) ?? undefined
      : undefined;
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, response, mode, turnstileToken: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setReport(data as Report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
      // Turnstile tokens are single-use.
      (window as unknown as { turnstile?: { reset: () => void } }).turnstile?.reset();
    }
  }

  function downloadJson() {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `trust-eval-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {SITE_KEY && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />}
      <h1 className="text-2xl font-bold">Evaluate an AI response</h1>

      <form
        ref={formRef}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void submit();
        }}
      >
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-600 dark:text-slate-400">Examples:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              onClick={() => {
                setPrompt(ex.prompt);
                setResponse(ex.response);
              }}
            >
              {ex.label}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-sm font-medium">
            User prompt <span className="font-normal text-slate-500">(optional but recommended)</span>
          </span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={PROMPT_MAX}
            rows={3}
            className="mt-1 w-full rounded border border-slate-300 bg-transparent p-2 dark:border-slate-700"
          />
          <span className="text-xs text-slate-500">
            {prompt.length} / {PROMPT_MAX}
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-medium">
            AI response <span className="text-red-600">*</span>
          </span>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            maxLength={RESPONSE_MAX}
            rows={8}
            required
            placeholder="Paste your AI's response here to evaluate…"
            className="mt-1 w-full rounded border border-slate-300 bg-transparent p-2 dark:border-slate-700"
          />
          <span className="text-xs text-slate-500">
            {response.length} / {RESPONSE_MAX}
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex overflow-hidden rounded border border-slate-300 dark:border-slate-700" role="group">
            {(["quick", "standard"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-sm capitalize ${mode === m ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : ""}`}
              >
                {m}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">
            {mode === "quick" ? "Core evaluators only, fastest." : "Core evaluators plus packs triggered by the content."}
          </span>
          <button
            type="submit"
            disabled={loading || !response.trim()}
            className="ml-auto rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"
          >
            {loading ? "Evaluating…" : "Evaluate now"}
          </button>
        </div>
        <p className="text-xs text-slate-500">Press Ctrl+Enter to evaluate.</p>
        {SITE_KEY && <div className="cf-turnstile" data-sitekey={SITE_KEY} />}
      </form>

      {error && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {report && <ReportView report={report} onDownload={downloadJson} />}
    </div>
  );
}

function ReportView({ report, onDownload }: { report: Report; onDownload: () => void }) {
  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-4">
        <span className={`rounded px-3 py-1 text-lg font-bold text-white ${VERDICT_STYLE[report.verdict]}`}>
          {report.verdict}
        </span>
        <span className="text-2xl font-semibold">{report.overallScore ?? "–"}<span className="text-sm text-slate-500"> / 100</span></span>
        <span className="text-sm text-slate-500">
          {report.hardFails} hard-fail · {report.softFails} soft-fail · {(report.durationMs / 1000).toFixed(1)}s
          {report.judgeModel ? ` · judge: ${report.judgeModel}` : ""}
        </span>
        <button type="button" onClick={onDownload} className="ml-auto rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700">
          Export JSON
        </button>
      </div>

      {report.notices.map((n) => (
        <p key={n} className="rounded bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {n}
        </p>
      ))}

      <div className="grid gap-2 sm:grid-cols-5">
        {Object.entries(report.pillarScores).map(([pillar, score]) => (
          <div key={pillar} className="rounded border border-slate-200 p-2 dark:border-slate-800">
            <div className="text-xs capitalize text-slate-500">{pillar}</div>
            <div className="font-semibold">{score}</div>
            <div className="mt-1 h-1.5 rounded bg-slate-200 dark:bg-slate-800">
              <div className="h-1.5 rounded bg-slate-900 dark:bg-slate-100" style={{ width: `${score}%` }} />
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-slate-500">
        Packs run: core{report.packsRun.length ? `, ${report.packsRun.join(", ")}` : ""}
      </p>

      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {report.results.map((r) => (
          <li key={r.id} className="py-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className={`text-sm font-bold uppercase ${STATUS_STYLE[r.status]}`}>{r.status}</span>
              <span className="font-medium">{r.name}</span>
              <span className="text-xs text-slate-500">
                {r.pillar} · {r.severity}-fail · {r.kind === "rule" ? "rule" : "LLM judge"}
                {r.score !== null ? ` · ${r.score}` : ""}
              </span>
            </div>
            <p className="text-sm">{r.finding}</p>
            {r.evidence && <p className="mt-1 border-l-2 border-slate-300 pl-2 text-sm italic text-slate-600 dark:text-slate-400">{r.evidence}</p>}
            {r.recommendation && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Fix: {r.recommendation}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
