"use client";

import { useEffect, useState } from "react";

interface BusinessPortfolio {
  id: string;
  name: string;
  verificationStatus: string;
  createdTime?: string;
}

interface BusinessPortfolioResponse {
  account: { id: string; name: string };
  portfolios: BusinessPortfolio[];
}

interface BusinessPortfolioPanelProps {
  connected: boolean;
}

export function BusinessPortfolioPanel({ connected }: BusinessPortfolioPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BusinessPortfolioResponse | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/business/portfolio", { credentials: "include" });
      const payload = (await res.json().catch(() => ({}))) as BusinessPortfolioResponse & { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to fetch business portfolios");
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch business portfolios");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!connected) return;
    load();
  }, [connected]);

  if (!connected) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-[#fffef9] p-6 shadow-xl">
        <p className="text-sm text-stone-700">Connect Instagram to view business portfolio information.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-[#fffef9] p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl text-stone-800">Business Portfolio</h3>
          <p className="text-xs text-stone-600">Loaded using Meta business management authorization.</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {data && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-xs uppercase tracking-wide text-stone-600">Connected account</p>
          <p className="mt-1 text-sm font-semibold text-stone-800">{data.account.name || "Meta Account"}</p>
          <p className="text-xs text-stone-600">{data.account.id}</p>
        </div>
      )}

      <div className="space-y-3">
        {!loading && data && data.portfolios.length === 0 && (
          <p className="text-sm text-stone-600">No business portfolios returned for this account.</p>
        )}
        {data?.portfolios.map((p) => (
          <div key={p.id} className="rounded-xl border border-amber-200 bg-white p-4">
            <p className="text-sm font-semibold text-stone-800">{p.name}</p>
            <p className="mt-1 text-xs text-stone-600">ID: {p.id}</p>
            <p className="mt-1 text-xs text-stone-600">Verification: {p.verificationStatus}</p>
            {p.createdTime && <p className="mt-1 text-xs text-stone-500">Created: {new Date(p.createdTime).toLocaleString()}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

