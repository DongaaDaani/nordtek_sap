"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import DataTable from "@/components/DataTable";
import { Loader2 } from "lucide-react";

const ENTITY_TYPES = [
  { value: "item-groups",          label: "Cikk csoportok" },
  { value: "item-features",        label: "Cikk jellemzők" },
  { value: "warehouses",           label: "Raktárak" },
  { value: "shippings",            label: "Szállítási módok" },
  { value: "payments",             label: "Fizetési módok" },
  { value: "currencies",           label: "Devizák" },
  { value: "vat-groups",           label: "ÁFA csoportok" },
  { value: "salespeople",          label: "Értékesítők" },
  { value: "workers",              label: "Munkatársak" },
  { value: "users",                label: "Felhasználók" },
  { value: "price-lists",          label: "Árlisták" },
  { value: "languages",            label: "Nyelvek" },
  { value: "partner-groups",       label: "Partner csoportok" },
  { value: "document-series",      label: "Dokumentum sorozatok" },
  { value: "document-lead-times",  label: "Átfutási idők" },
  { value: "document-parity",      label: "Paritások" },
  { value: "countries",            label: "Országok" },
  { value: "payment-statuses",     label: "Fizetési státuszok" },
  { value: "couriers",             label: "Futárok" },
];

export default function EntitiesPage() {
  const [selected, setSelected] = useState("warehouses");
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sap/entity/${selected}`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
      setLoaded(selected);
    } catch {
      setError("Hiba a lekérdezés során");
    } finally {
      setLoading(false);
    }
  }

  const columns = data.length > 0
    ? Object.keys(data[0]).map((k) => ({ key: k, header: k }))
    : [];

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">SAP Törzsadatok</h1>
        <p className="text-gray-500 mt-1">Referencia adatok lekérdezése</p>
      </div>

      <div className="flex gap-3 mb-6">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          {ENTITY_TYPES.map((e) => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Betöltés
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

      {data.length > 0 && (
        <>
          <div className="text-sm text-gray-500 mb-3">
            {ENTITY_TYPES.find((e) => e.value === loaded)?.label} — {data.length} rekord
          </div>
          <DataTable
            data={data}
            columns={columns}
            searchKeys={Object.keys(data[0]).slice(0, 2)}
          />
        </>
      )}
    </AppShell>
  );
}
