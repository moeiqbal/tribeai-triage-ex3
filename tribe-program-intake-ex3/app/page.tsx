"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Intake = { id: number; title: string; industry: string; createdAt: string; aiStatus: string };

export default function HomePage() {
  const [intakes, setIntakes] = useState<Intake[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null); setIntakes(null);
    try {
      const res = await fetch("/api/intakes");
      if (!res.ok) throw new Error("Failed to load intakes");
      setIntakes(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load intakes");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error) return (
    <div className="p-6">
      <p className="text-red-600">{error}</p>
      <button onClick={load} className="mt-2 rounded bg-black px-4 py-2 text-white">Retry</button>
    </div>
  );
  if (intakes === null) return <div className="p-6 text-zinc-500">Loading intakes…</div>;
  if (intakes.length === 0) return (
    <div className="p-6">
      <p className="text-zinc-600">No intakes yet.</p>
      <Link href="/intakes/new" className="mt-2 inline-block rounded bg-black px-4 py-2 text-white">Create your first intake</Link>
    </div>
  );
  return (
    <ul className="space-y-3 p-6">
      {intakes.map((i) => (
        <li key={i.id} className="rounded border border-zinc-200 p-4">
          <Link href={`/intakes/${i.id}`} className="font-medium underline">{i.title}</Link>
          <div className="mt-1 text-sm text-zinc-500">
            {i.industry} · {new Date(i.createdAt).toLocaleString()} ·{" "}
            <span className="rounded bg-zinc-100 px-2 py-0.5">{i.aiStatus}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
