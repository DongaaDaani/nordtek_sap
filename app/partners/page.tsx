"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import DataTable from "@/components/DataTable";
import { SapBusinessPartner } from "@/types/sap";
import { Search, Loader2 } from "lucide-react";

export default function PartnersPage() {
  const [query, setQuery] = useState("");
  const [field, setField] = useState("CardName");
  const [results, setResults] = useState<SapBusinessPartner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/sap/business-partner/search?field=${encodeURIComponent(field)}&term=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setError("Hiba a lekérdezés során");
    } finally {
      setLoading(false);
    }
  }

  async function loadByCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = (e.currentTarget.elements.namedItem("cardCode") as HTMLInputElement).value.trim();
    if (!code) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sap/business-partner/?cardCodes=${encodeURIComponent(code)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setError("Hiba a lekérdezés során");
    } finally {
      setLoading(false);
    }
  }

  const cols = [
    { key: "card_code", header: "CardCode" },
    { key: "name", header: "Név" },
    { key: "type", header: "Típus" },
    { key: "email", header: "Email" },
    { key: "country", header: "Ország" },
    { key: "is_active", header: "Aktív", render: (r: SapBusinessPartner) => r.is_active ? "✅" : "❌" },
  ];

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Business Partnerek</h1>
        <p className="text-gray-500 mt-1">Keresés SAP partner adatokban</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Search by field */}
        <form onSubmit={search} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">Keresés mező alapján</h3>
          <div className="flex gap-2 mb-2">
            <select
              value={field}
              onChange={(e) => setField(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {["CardName", "E_Mail", "Phone1", "U_VatId"].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Keresett érték…"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Keresés
          </button>
        </form>

        {/* Load by CardCode */}
        <form onSubmit={loadByCode} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">Betöltés CardCode alapján</h3>
          <div className="flex gap-2">
            <input
              name="cardCode"
              placeholder="pl. C100001 (vesszővel több)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Betöltés
            </button>
          </div>
        </form>
      </div>

      {error && <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

      {results.length > 0 && (
        <DataTable
          data={results as unknown as Record<string, unknown>[]}
          columns={cols as Column<Record<string, unknown>>[]}
          searchKeys={["card_code", "name", "email"]}
        />
      )}
    </AppShell>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Column<T> = { key: string; header: string; render?: (row: T) => React.ReactNode };
