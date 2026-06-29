"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { Phone, Loader2 } from "lucide-react";

export default function PhoneSearchPage() {
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setSearched(false);
    try {
      const res = await fetch(`/api/sap/phone-search?request=${encodeURIComponent(phone)}`);
      const text = await res.text();
      setResult(text.trim() || null);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Telefonkeresés</h1>
        <p className="text-gray-500 mt-1">Partner neve telefonszám alapján</p>
      </div>

      <form onSubmit={search} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-md">
        <label className="block text-sm font-medium text-gray-700 mb-2">Telefonszám</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+36201234567"
              className="w-full pl-9 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Keresés
          </button>
        </div>
      </form>

      {searched && (
        <div className={`mt-6 max-w-md rounded-xl border p-5 ${result ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
          {result ? (
            <div>
              <div className="text-xs text-green-600 font-medium mb-1">Partner találat</div>
              <div className="text-xl font-semibold text-gray-900">{result}</div>
            </div>
          ) : (
            <div className="text-gray-500 text-sm">Nem található partner ehhez a telefonszámhoz.</div>
          )}
        </div>
      )}
    </AppShell>
  );
}
