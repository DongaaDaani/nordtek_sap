"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { SapContact } from "@/types/sap";
import { Loader2 } from "lucide-react";

export default function ContactsPage() {
  const [contactId, setContactId] = useState("");
  const [contact, setContact] = useState<SapContact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId.trim()) return;
    setLoading(true);
    setError("");
    setContact(null);
    try {
      const res = await fetch(`/api/sap/contact/${encodeURIComponent(contactId)}`);
      if (!res.ok) throw new Error("Nem található");
      setContact(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Hiba");
    } finally {
      setLoading(false);
    }
  }

  const fields: [keyof SapContact, string][] = [
    ["id", "ID"],
    ["card_code", "CardCode"],
    ["name", "Név"],
    ["title", "Megszólítás"],
    ["position", "Beosztás"],
    ["phone_1", "Telefon 1"],
    ["phone_2", "Telefon 2"],
    ["mobile_phone", "Mobil"],
    ["email", "Email"],
    ["remarks_1", "Megjegyzés 1"],
    ["remarks_2", "Megjegyzés 2"],
  ];

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kapcsolattartók</h1>
        <p className="text-gray-500 mt-1">Keresés SAP CntctCode alapján</p>
      </div>

      <form onSubmit={load} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6 max-w-md">
        <label className="block text-sm font-medium text-gray-700 mb-2">SAP CntctCode</label>
        <div className="flex gap-3">
          <input
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            placeholder="pl. 12345"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Betöltés
          </button>
        </div>
      </form>

      {error && <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

      {contact && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden max-w-2xl">
          <div className="bg-blue-50 px-5 py-4 border-b border-gray-200">
            <div className="font-semibold text-gray-900 text-lg">{contact.name}</div>
            <div className="text-sm text-gray-500">{contact.card_code}</div>
          </div>
          <dl className="divide-y divide-gray-100">
            {fields.map(([key, label]) => (
              contact[key] !== undefined && contact[key] !== "" && (
                <div key={key} className="flex px-5 py-3 text-sm">
                  <dt className="w-36 text-gray-500 shrink-0">{label}</dt>
                  <dd className="text-gray-900 font-medium">{String(contact[key])}</dd>
                </div>
              )
            ))}
            <div className="flex px-5 py-3 text-sm">
              <dt className="w-36 text-gray-500 shrink-0">Aktív</dt>
              <dd>{contact.is_active ? "✅ Igen" : "❌ Nem"}</dd>
            </div>
          </dl>
        </div>
      )}
    </AppShell>
  );
}
