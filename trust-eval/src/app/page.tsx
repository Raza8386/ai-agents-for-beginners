import Link from "next/link";
import { EVALUATORS } from "@/lib/evaluators";
import { PILLARS } from "@/lib/types";

export default function Home() {
  const packs = [...new Set(EVALUATORS.map((e) => e.pack))];
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold">Can you trust this AI response?</h1>
        <p className="max-w-2xl text-slate-600 dark:text-slate-400">
          Paste a prompt and the answer your AI gave. TrustEval runs deterministic checks and an independent
          LLM judge across five pillars and returns a PASS, WARN, FAIL or PARTIAL verdict with evidence and fixes.
        </p>
        <Link href="/try" className="inline-block rounded-md bg-slate-900 px-4 py-2 text-white dark:bg-white dark:text-slate-900">
          Evaluate a response
        </Link>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="font-semibold">Pillars</h2>
          <p className="mt-1 text-sm capitalize text-slate-600 dark:text-slate-400">{PILLARS.join(" · ")}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="font-semibold">{EVALUATORS.length} evaluators in {packs.length} packs</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Core checks always run. In Standard mode, packs ({packs.filter((p) => p !== "core").join(", ")}) are added
            when the content calls for them.
          </p>
        </div>
      </section>
    </div>
  );
}
