import AppShell from "@/components/AppShell";
import DataTable from "@/components/DataTable";
import { sapGet } from "@/lib/sap";

export const dynamic = "force-dynamic";

async function getItems(): Promise<string[]> {
  try {
    const res = await sapGet<{ data: string[] }>("/item/");
    return res.data ?? [];
  } catch {
    return [];
  }
}

export default async function ItemsPage() {
  const items = await getItems();
  const rows = items.map((code) => ({ item_code: code }));

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cikkek</h1>
        <p className="text-gray-500 mt-1">{items.length} SAP cikkszám</p>
      </div>

      <DataTable
        data={rows}
        columns={[{ key: "item_code", header: "Cikkszám" }]}
        searchKeys={["item_code"]}
      />
    </AppShell>
  );
}
