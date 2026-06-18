"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";

type Intake = {
  id: number; title: string; description: string; budgetRange: string; timeline: string;
  industry: string; createdAt: string; aiStatus: string; aiSummary: string | null;
  aiTags: string | null; aiRiskChecklist: string | null; aiError: string | null;
};

function parseList(raw: string | null): string[] | null {
  if (!raw) return null;
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : null; } catch { return null; }
}

export default function IntakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/intakes/${id}`);
        if (res.status === 404) throw new Error("not-found");
        if (!res.ok) throw new Error("Failed to load intake");
        setIntake(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load intake");
      }
    })();
  }, [id]);

  if (error === "not-found") return (
    <div className="p-6"><p>This intake doesn’t exist.</p><Link href="/" className="underline">Back to all intakes</Link></div>
  );
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!intake) return <div className="p-6 text-zinc-500">Loading…</div>;

  const tags = parseList(intake.aiTags);
  const risks = parseList(intake.aiRiskChecklist);
  const completed = intake.aiStatus === "completed" && tags && risks;

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{intake.title}</h1>
        <p className="text-sm text-zinc-500">{intake.industry} · {new Date(intake.createdAt).toLocaleString()}</p>
      </div>
      <dl className="space-y-2">
        <div><dt className="font-medium">Description</dt><dd>{intake.description}</dd></div>
        <div><dt className="font-medium">Budget range</dt><dd>{intake.budgetRange}</dd></div>
        <div><dt className="font-medium">Timeline</dt><dd>{intake.timeline}</dd></div>
      </dl>
      {completed ? (
        <div className="space-y-4">
          <div><h2 className="font-medium">AI summary</h2><p>{intake.aiSummary}</p></div>
          <div><h2 className="font-medium">Tags</h2>
            <ul className="flex gap-2">{tags!.map((t) => <li key={t} className="rounded bg-zinc-100 px-2 py-0.5 text-sm">{t}</li>)}</ul></div>
          <div><h2 className="font-medium">Risk checklist</h2>
            <ul className="list-disc pl-5">{risks!.map((r, idx) => <li key={idx}>{r}</li>)}</ul></div>
        </div>
      ) : (
        <div className="rounded border border-amber-300 bg-amber-50 p-4">
          <p className="font-medium text-amber-800">
            {intake.aiStatus === "pending"
              ? "AI triage has not completed for this intake yet."
              : "AI triage could not be completed. Your submission has been saved and is unaffected — a team member should review it manually."}
          </p>
          {intake.aiError && (
            <details className="mt-2 text-sm text-amber-700"><summary>Show technical details</summary><p className="mt-1">{intake.aiError}</p></details>
          )}
        </div>
      )}
      <Link href="/" className="inline-block underline">Back to all intakes</Link>
    </div>
  );
}
