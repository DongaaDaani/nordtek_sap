import AppShell from "@/components/AppShell";
import { sapGet } from "@/lib/sap";
import { SapStatus } from "@/types/sap";
import { Package, Users, FileText, Cpu } from "lucide-react";

export const dynamic = "force-dynamic";

async function getStatus(): Promise<SapStatus | null> {
  try {
    return await sapGet<SapStatus>("/");
  } catch {
    return null;
  }
}

async function getItemCount(): Promise<number> {
  try {
    const res = await sapGet<{ data: string[] }>("/item/");
    return res.data?.length ?? 0;
  } catch {
    return 0;
  }
}

export default async function DashboardPage() {
  const [status, itemCount] = await Promise.all([getStatus(), getItemCount()]);

  const cards = [
    { label: "API státusz", value: status ? "Online" : "Elérhetetlen", icon: Cpu, color: status ? "green" : "red" },
    { label: "Összes cikk", value: itemCount.toString(), icon: Package, color: "blue" },
    { label: "Környezet", value: status?.environment ?? "—", icon: Cpu, color: "purple" },
    { label: "Build dátum", value: status?.date ?? "—", icon: FileText, color: "orange" },
  ];

  const colorMap: Record<string, string> = {
    green:  "bg-green-100 text-green-700",
    red:    "bg-red-100 text-red-700",
    blue:   "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-700",
  };

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Nordtek SAP Interface — áttekintő</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className={`inline-flex p-2 rounded-lg mb-3 ${colorMap[c.color]}`}>
              <c.icon size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{c.value}</div>
            <div className="text-sm text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* MCP Setup card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">MCP csatlakoztatása Coworkhoz</h2>
        <p className="text-sm text-blue-700 mb-4">
          A Claude / Cowork az alábbi URL-en éri el az MCP szervert. Streamable HTTP és SSE transport is támogatott.
        </p>
        <div className="space-y-2">
          <div>
            <div className="text-xs font-medium text-blue-600 mb-1">Streamable HTTP (ajánlott, Redis nélkül)</div>
            <code className="block bg-white border border-blue-200 rounded-lg px-4 py-2 text-sm font-mono text-blue-900">
              {process.env.NEXT_PUBLIC_APP_URL || "https://your-app.vercel.app"}/api/mcp
            </code>
          </div>
          <div>
            <div className="text-xs font-medium text-blue-600 mb-1">SSE (Redis szükséges)</div>
            <code className="block bg-white border border-blue-200 rounded-lg px-4 py-2 text-sm font-mono text-blue-900">
              {process.env.NEXT_PUBLIC_APP_URL || "https://your-app.vercel.app"}/api/sse
            </code>
          </div>
        </div>

        <div className="mt-4 text-xs text-blue-600">
          <strong>Elérhető toolok (30):</strong>{" "}
          sap_status, sap_get_entity, sap_list_items, sap_update_item, sap_sync_item,
          sap_list_business_partners, sap_get_business_partner, sap_search_business_partners,
          sap_create_business_partner, sap_update_business_partner, sap_sync_business_partners,
          sap_get_contact, sap_create_contact, sap_update_contact,
          sap_get_addresses, sap_get_address, sap_create_address, sap_update_address,
          sap_get_documents, sap_get_document, sap_get_demo_documents,
          sap_create_document, sap_update_document, sap_add_document_line,
          sap_update_document_line, sap_delete_document_line,
          sap_get_invoice_deliveries, sap_get_invoice_delivery, sap_save_invoice_delivery_number,
          sap_get_feature_values, sap_phone_search
        </div>
      </div>

      {/* API info */}
      {status && (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">SAP API info</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(status).map(([k, v]) => (
              <div key={k}>
                <dt className="text-gray-500 capitalize">{k}</dt>
                <dd className="font-medium text-gray-900">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </AppShell>
  );
}
