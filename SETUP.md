# Nordtek SAP Interface — Telepítési útmutató

## 1. GitHub repo előkészítése

```bash
git init
git add .
git commit -m "Initial: Nordtek SAP MCP + frontend"
git remote add origin https://github.com/DongaaDaani/nordtek_sap
git push -u origin main
```

> ⚠️ A `.env.local` fájl **nem kerül be a git repóba** (`.gitignore` védi) — a hitelesítő adatokat Vercel-ben kell beállítani.

---

## 2. Vercel deploy

1. Menj a [vercel.com](https://vercel.com) oldalra
2. **Add New Project** → GitHub repo: `DongaaDaani/nordtek_sap`
3. Framework: **Next.js** (automatikusan felismeri)
4. **Environment Variables** — add meg:

| Változó | Érték |
|---------|-------|
| `SAP_BASE_URL` | `https://interface-v2.nordtek.hu/v1` |
| `SAP_CLIENT_ID` | `scgsmart` |
| `SAP_API_KEY` | `K6xzXLZKvnM6FtaS3db8lrspENDevt4qK6490AktJIaM1h5Doh0f8hq3y23YDmj5` |
| `NEXT_PUBLIC_APP_URL` | `https://nordtek-sap.vercel.app` (a te URL-ed) |
| `REDIS_URL` | Opcionális — csak SSE transporthoz kell (ingyenes: upstash.com) |

5. **Deploy** gomb → ~2 perc

---

## 3. MCP csatlakoztatása Coworkhoz

A deploy után az MCP szerver elérhető:

```
https://YOUR-APP.vercel.app/api/mcp
```

### Cowork / Claude Desktop beállítás

Nyisd meg a Claude Desktop beállításait és add hozzá az MCP szervert:

```json
{
  "mcpServers": {
    "nordtek-sap": {
      "url": "https://YOUR-APP.vercel.app/api/mcp"
    }
  }
}
```

*Vagy Cowork-ban: Settings → Plugins & MCP → Remote MCP → URL megadása*

---

## 4. Elérhető MCP toolok (30 db)

| Tool | Leírás |
|------|--------|
| `sap_status` | API státusz és build info |
| `sap_get_entity` | Törzsadatok (raktárak, devizák, áfacsoportok stb.) |
| `sap_list_items` | Összes cikkszám |
| `sap_update_item` | Cikk frissítése |
| `sap_sync_item` | Cikk szinkron |
| `sap_list_business_partners` | Partnerek CardCode lista alapján |
| `sap_get_business_partner` | Egy partner adatai |
| `sap_search_business_partners` | Partner keresés (név, email stb.) |
| `sap_create_business_partner` | Új partner létrehozása |
| `sap_update_business_partner` | Partner frissítése |
| `sap_sync_business_partners` | Partner szinkron |
| `sap_get_contact` | Kapcsolattartó |
| `sap_create_contact` | Új kapcsolattartó |
| `sap_update_contact` | Kapcsolattartó frissítése |
| `sap_get_addresses` | Partner összes cím |
| `sap_get_address` | Egy cím |
| `sap_create_address` | Új cím |
| `sap_update_address` | Cím frissítése |
| `sap_get_documents` | Dokumentumok DocEntry alapján |
| `sap_get_document` | Egy dokumentum |
| `sap_get_demo_documents` | Demo dokumentumok |
| `sap_create_document` | Új dokumentum (order/invoice/delivery) |
| `sap_update_document` | Dokumentum fejléc frissítése |
| `sap_add_document_line` | Dokumentumsor hozzáadása |
| `sap_update_document_line` | Dokumentumsor frissítése |
| `sap_delete_document_line` | Dokumentumsor törlése |
| `sap_get_invoice_deliveries` | Szállítólevél lista dátum alapján |
| `sap_get_invoice_delivery` | Egy szállítólevél |
| `sap_save_invoice_delivery_number` | Számlaszám mentése szállítólevélhez |
| `sap_get_feature_values` | Webshop feature értékek (többnyelvű) |
| `sap_phone_search` | Partner keresés telefonszám alapján |

---

## 5. Helyi fejlesztés

```bash
npm install
npm run dev
# → http://localhost:3000
```
