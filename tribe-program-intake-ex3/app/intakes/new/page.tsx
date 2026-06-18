"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const FIELDS = [
  { name: "title", label: "Title", textarea: false },
  { name: "description", label: "Description", textarea: true },
  { name: "budgetRange", label: "Budget range", textarea: false },
  { name: "timeline", label: "Timeline", textarea: false },
  { name: "industry", label: "Industry", textarea: false },
] as const;

type Field = (typeof FIELDS)[number]["name"];

export default function NewIntakePage() {
  const router = useRouter();
  const [values, setValues] = useState<Record<Field, string>>({
    title: "", description: "", budgetRange: "", timeline: "", industry: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allFilled = Object.values(values).every((v) => v.trim().length > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !allFilled) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/intakes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create intake");
      }
      const created = await res.json();
      router.push(`/intakes/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create intake");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 p-6">
      {error && <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}
      {FIELDS.map((f) => (
        <div key={f.name} className="flex flex-col">
          <label className="mb-1 text-sm font-medium">{f.label}</label>
          {f.textarea ? (
            <textarea className="rounded border border-zinc-300 p-2" rows={4}
              value={values[f.name]} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} />
          ) : (
            <input className="rounded border border-zinc-300 p-2"
              value={values[f.name]} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} />
          )}
        </div>
      ))}
      <button type="submit" disabled={submitting || !allFilled}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {submitting ? "Submitting…" : "Create intake"}
      </button>
    </form>
  );
}
