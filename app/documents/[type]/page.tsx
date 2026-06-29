"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import DataTable from "@/components/DataTable";
import { SapDocumentMaster } from "@/types/sap";
import { Loader2 } from "lucide-react";

const typeLabel: Record<string, string> = {
  order: "Rendelések",
  invoice: "Számlák",
  delivery: "Szállítólevelek",
  inquiry: "Ajánlatkérések",
};

export default function DocumentsPage() {
  const params = useParams();
  const docType = params.type as string;

  const [docEntries, setDocEntries] = useState("");
  const [documents, setDocuments] = useState<SapDocumentMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(e: React.FormEvent) {
    e.preventDefault();
    if (!docEntries.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/sap/document/${docType}?docEntries=${encodeURIComponent(docEntries)}`
      );
      const data = await res.json();
      setDocuments(Array.isArray(data?.master_data) ? data.master_data : []);
    } catch {
      setError("Hiba a lekérdezés során");
    } finally {
      setLoading(false);
    }
  }

  const cols = [
    { key: "doc_entry", header: "DocEntry" },
    { key: "doc_number", header: "DocNum" },
    { key: "card_code", header: "Partner" },
    { key: "card_name", header: "Név" },
    { key: "total", header: "Összeg" },
    { key: "sap_currency_code", header: "Deviza" },
    { key: "status", header: "Státusz" },
    { key: "booking_date", header: "Könyvelési dátum" },
  ];

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{typeLabel[docType] ?? docType}</h1>
        <p className="text-gray-500 mt-1">Dokumentumok betöltése DocEntry alapján</p>
      </div>

      <form onSubmit={load} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          DocEntry-k (vesszővel elválasztva)
        </label>
        <div className="flex gap-3">
          <input
            value={docEntries}
            onChange={(e) => setDocEntries(e.target.value)}
            placeholder="pl. 1001,1002,1003"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Betöltés
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {documents.length > 0 && (
        <DataTable
          data={documents as unknown as Record<string, unknown>[]}
          columns={cols}
          searchKeys={["card_code", "card_name", "doc_number"]}
        />
      )}
    </AppShell>
  );
}
