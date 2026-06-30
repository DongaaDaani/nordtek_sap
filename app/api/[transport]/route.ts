import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { sapGet, sapPost, sapPatch, sapDelete } from "@/lib/sap";

const ENTITY_TYPES = [
  "item-groups", "item-features", "warehouses", "shippings", "payments",
  "currencies", "vat-groups", "salespeople", "workers", "users", "price-lists",
  "languages", "partner-groups", "document-series", "document-lead-times",
  "document-parity", "countries", "payment-statuses", "couriers",
] as const;

const DOC_TYPES = ["order", "invoice", "inquiry", "delivery"] as const;

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

// ─── MCP handler ──────────────────────────────────────────────────────────────
const handler = createMcpHandler(
  async (server) => {

    // ── SYSTEM ──────────────────────────────────────────────────────────────
    server.tool(
      "sap_status",
      "SAP API státusz lekérése — verzió, build, dátum, környezet.",
      {},
      async () => ok(await sapGet("/"))
    );

    // ── ENTITIES ─────────────────────────────────────────────────────────────
    server.tool(
      "sap_get_entity",
      `SAP törzsadat lista lekérése. Típusok: ${ENTITY_TYPES.join(", ")}`,
      {
        entity_type: z.enum(ENTITY_TYPES).describe("Az entitás típusa"),
      },
      async ({ entity_type }) => ok(await sapGet(`/entity/${entity_type}`))
    );

    // ── ITEMS ────────────────────────────────────────────────────────────────
    server.tool(
      "sap_list_items",
      "Az összes SAP cikkszám listájának lekérése.",
      {},
      async () => ok(await sapGet("/item/"))
    );

    server.tool(
      "sap_get_item_data",
      "Részletes cikkadatok lekérése: cikknév, csoportazonosító, készlet (main_stock, outer_stock), kompatibilitás (works_with, not_works_with), áfa, webshop jelzők. Készletellenőrzéshez és cikktulajdonságokhoz.",
      {},
      async () => ok(await sapGet("/item/data"))
    );

    server.tool(
      "sap_update_item",
      "Cikk SAP adatainak frissítése (warehouse_position, weight, qty_per_box, works_with, not_works_with, leírások, video_link).",
      {
        item_code: z.string().describe("SAP cikkszám"),
        warehouse_position: z.string().optional().describe("Raktárpozíció pl. A-01-02"),
        weight: z.string().optional().describe("Súly"),
        qty_per_box: z.number().optional().describe("Darab/doboz"),
        works_with: z.string().optional().describe("Kompatibilis cikkek vesszővel"),
        not_works_with: z.string().optional().describe("Inkompatibilis cikkek"),
        u_hu_generated: z.string().optional().describe("Magyar leírás"),
        u_en_generated: z.string().optional().describe("Angol leírás"),
        u_aip_de: z.string().optional().describe("Német leírás"),
        video_link: z.array(z.string()).optional().describe("Videó linkek listája"),
      },
      async ({ item_code, ...payload }) =>
        ok(await sapPatch(`/item/${item_code}`, payload))
    );

    server.tool(
      "sap_sync_item",
      "Cikk, készlet, ár és szett szinkronizálás indítása.",
      { item_code: z.string().describe("SAP cikkszám") },
      async ({ item_code }) => ok(await sapGet(`/item/${item_code}/sync`))
    );

    // ── BUSINESS PARTNERS ────────────────────────────────────────────────────
    server.tool(
      "sap_list_business_partners",
      "Business partnerek lekérése cardCode-ok alapján.",
      {
        card_codes: z.string().describe("CardCode-ok vesszővel, pl. C100001,C100002"),
      },
      async ({ card_codes }) =>
        ok(await sapGet(`/business-partner/?cardCodes=${encodeURIComponent(card_codes)}`))
    );

    server.tool(
      "sap_get_business_partner",
      "Egy business partner adatainak lekérése cardCode alapján.",
      { card_code: z.string().describe("Partner CardCode-ja, pl. C100001") },
      async ({ card_code }) => ok(await sapGet(`/business-partner/${card_code}`))
    );

    server.tool(
      "sap_search_business_partners",
      "Business partnerek keresése SAP mezők és értékek alapján.",
      {
        field: z.string().describe("SAP mezőnév (pl. E_Mail, CardName) — több mező vesszővel"),
        term: z.string().describe("Keresett érték — több érték vesszővel (mezőkkel azonos sorrendben)"),
        exclude: z.string().optional().describe("Kizárandó CardCode (opcionális)"),
      },
      async ({ field, term, exclude }) => {
        const params = new URLSearchParams({ field, term });
        if (exclude) params.set("exclude", exclude);
        return ok(await sapGet(`/business-partner/search?${params}`));
      }
    );

    server.tool(
      "sap_create_business_partner",
      "Új business partner létrehozása SAP-ban.",
      {
        name: z.string().describe("Partner neve"),
        foreign_name: z.string().optional(),
        type: z.string().describe("C = vevő, S = szállító, L = lead"),
        email: z.string().optional(),
        phone_1: z.string().optional(),
        phone_2: z.string().optional(),
        mobile_phone: z.string().optional(),
        fax: z.string().optional(),
        vat_id: z.string().optional().describe("EU adószám"),
        tax_id: z.string().optional(),
        sap_currency: z.string().optional().describe("Pénznem pl. EUR"),
        sap_price_list_id: z.number().optional(),
        sap_payment_id: z.number().optional(),
        sap_language_id: z.number().optional(),
        sales_person_id: z.number().optional(),
        sap_card_group_id: z.number().optional(),
        is_active: z.string().optional().describe("Y / N"),
        website: z.string().optional(),
        remarks: z.string().optional(),
        user_group: z.string().optional().describe("pl. B2B"),
        sap_vat_group_code: z.string().optional(),
        credit_limit: z.number().optional(),
        webshop_id: z.number().optional().describe("Webshop azonosító"),
        inactive_note: z.string().optional(),
      },
      async (payload) => ok(await sapPost("/business-partner/", payload))
    );

    server.tool(
      "sap_update_business_partner",
      "Meglévő business partner adatainak frissítése.",
      {
        card_code: z.string().describe("Partner CardCode-ja"),
        name: z.string().optional(),
        foreign_name: z.string().optional(),
        type: z.string().optional(),
        email: z.string().optional(),
        phone_1: z.string().optional(),
        phone_2: z.string().optional(),
        mobile_phone: z.string().optional(),
        fax: z.string().optional(),
        vat_id: z.string().optional(),
        tax_id: z.string().optional(),
        sap_currency: z.string().optional(),
        sap_price_list_id: z.number().optional(),
        sap_payment_id: z.number().optional(),
        sap_language_id: z.number().optional(),
        sales_person_id: z.number().nullable().optional(),
        is_active: z.string().optional(),
        website: z.string().optional(),
        remarks: z.string().optional(),
      },
      async ({ card_code, ...payload }) =>
        ok(await sapPatch(`/business-partner/${card_code}`, payload))
    );

    server.tool(
      "sap_sync_business_partners",
      "Business partner szinkronizálás indítása. Ha codes nincs megadva, az utolsó 10 perc változásait szinkronizálja.",
      {
        codes: z.string().optional().describe("CardCode-ok vesszővel (opcionális)"),
      },
      async ({ codes }) => ok(await sapPost("/business-partner/sync", codes ? { codes } : {}))
    );

    // ── CONTACTS ─────────────────────────────────────────────────────────────
    server.tool(
      "sap_get_contact",
      "Kapcsolattartó lekérése SAP CntctCode alapján.",
      { contact_id: z.number().describe("SAP CntctCode") },
      async ({ contact_id }) => ok(await sapGet(`/contact/${contact_id}`))
    );

    server.tool(
      "sap_create_contact",
      "Új kapcsolattartó létrehozása partnerhez.",
      {
        card_code: z.string(),
        name: z.string(),
        title: z.string().optional().describe("Pl. Ms., Mr."),
        position: z.string().optional(),
        phone_1: z.string().optional(),
        phone_2: z.string().optional(),
        mobile_phone: z.string().optional(),
        fax: z.string().optional(),
        email: z.string().optional(),
        remarks_1: z.string().optional(),
        remarks_2: z.string().optional(),
        is_active: z.boolean().optional(),
      },
      async (payload) => ok(await sapPost("/contact/", payload))
    );

    server.tool(
      "sap_update_contact",
      "Meglévő kapcsolattartó adatainak frissítése.",
      {
        contact_code: z.number().describe("SAP CntctCode"),
        card_code: z.string().optional(),
        name: z.string().optional(),
        title: z.string().optional(),
        position: z.string().optional(),
        phone_1: z.string().optional(),
        phone_2: z.string().optional(),
        mobile_phone: z.string().optional(),
        fax: z.string().optional(),
        email: z.string().optional(),
        remarks_1: z.string().optional(),
        remarks_2: z.string().optional(),
        is_active: z.boolean().optional(),
      },
      async ({ contact_code, ...payload }) =>
        ok(await sapPatch(`/contact/${contact_code}`, payload))
    );

    // ── ADDRESSES ────────────────────────────────────────────────────────────
    server.tool(
      "sap_get_addresses",
      "Partner összes számítási és szállítási cím listájának lekérése.",
      { card_code: z.string() },
      async ({ card_code }) => ok(await sapGet(`/address/${card_code}`))
    );

    server.tool(
      "sap_get_address",
      "Egy konkrét cím lekérése line number és card code alapján.",
      {
        card_code: z.string(),
        line_num: z.number().describe("Cím sorszáma (0-tól)"),
      },
      async ({ card_code, line_num }) =>
        ok(await sapGet(`/address/${line_num}/${card_code}`))
    );

    server.tool(
      "sap_create_address",
      "Új cím létrehozása partnerhez.",
      {
        card_code: z.string(),
        name: z.string().describe("Cím neve / azonosítója"),
        street: z.string(),
        city: z.string(),
        zip_code: z.string(),
        country: z.string().describe("Kétbetűs ország kód, pl. HU"),
        address_type: z.enum(["B", "S"]).describe("B = számlázási, S = szállítási"),
        block: z.string().optional(),
        street_number: z.string().optional(),
        building: z.string().optional(),
        vat_id: z.string().optional(),
      },
      async (payload) => ok(await sapPost("/address/", payload))
    );

    server.tool(
      "sap_update_address",
      "Meglévő cím frissítése.",
      {
        card_code: z.string(),
        line_num: z.number(),
        name: z.string().optional(),
        street: z.string().optional(),
        city: z.string().optional(),
        zip_code: z.string().optional(),
        country: z.string().optional(),
        address_type: z.enum(["B", "S"]).optional(),
        block: z.string().optional(),
        street_number: z.string().optional(),
        building: z.string().optional(),
        vat_id: z.string().optional(),
      },
      async ({ card_code, line_num, ...payload }) =>
        ok(await sapPatch(`/address/${line_num}/${card_code}`, payload))
    );

    // ── DOCUMENTS ────────────────────────────────────────────────────────────
    server.tool(
      "sap_get_documents",
      "Dokumentumok lekérése DocEntry lista alapján. Típusok: order, invoice, inquiry, delivery",
      {
        doc_type: z.enum(DOC_TYPES),
        doc_entries: z.string().describe("DocEntry-k vesszővel, pl. 1001,1002"),
      },
      async ({ doc_type, doc_entries }) =>
        ok(await sapGet(`/document/${doc_type}?docEntries=${encodeURIComponent(doc_entries)}`))
    );

    server.tool(
      "sap_get_document",
      "Egy dokumentum teljes lekérése (master_data + items sorok).",
      {
        doc_type: z.enum(DOC_TYPES),
        doc_entry: z.number().describe("SAP DocEntry"),
      },
      async ({ doc_type, doc_entry }) =>
        ok(await sapGet(`/document/${doc_type}/${doc_entry}`))
    );

    server.tool(
      "sap_get_demo_documents",
      "Demo dokumentumok lekérése megadott partnerekhez.",
      {
        doc_type: z.enum(DOC_TYPES),
        card_codes: z.string().describe("CardCode-ok vesszővel"),
      },
      async ({ doc_type, card_codes }) =>
        ok(await sapGet(`/document/demo/${doc_type}?cardCodes=${encodeURIComponent(card_codes)}`))
    );

    server.tool(
      "sap_create_document",
      "Új dokumentum (rendelés/számla/ajánlat/szállítólevél) létrehozása SAP-ban.",
      {
        doc_type: z.enum(DOC_TYPES),
        id: z.string().describe("Webshop rendelésszám, pl. WEB-10001"),
        uuid: z.string().optional(),
        mode: z.enum(["webshop", "manual"]).default("webshop"),
        card_code: z.string(),
        card_name: z.string(),
        contact_code: z.number().optional().describe("Kapcsolattartó CntctCode"),
        currency_code: z.string().describe("Pénznem, pl. EUR"),
        sap_vat_group_code: z.string().optional(),
        sap_payment_id: z.number().optional(),
        sap_shipping_id: z.number().optional(),
        shipping_method_id: z.number().optional(),
        shipping_cost: z.string().optional(),
        payment_surcharge: z.string().optional(),
        discount_amount: z.string().optional(),
        full_box_discount: z.string().optional(),
        seller_company_code: z.string().optional(),
        vat_validated: z.string().optional(),
        vat_number: z.string().optional(),
        vies_company_name: z.string().optional(),
        vies_company_address: z.string().optional(),
        billing_address: z.string().optional(),
        billing_zipcode: z.string().optional(),
        billing_city: z.string().optional(),
        billing_country_code: z.string().optional(),
        billing_country_name: z.string().optional(),
        shipping_address: z.string().optional(),
        shipping_zipcode: z.string().optional(),
        shipping_city: z.string().optional(),
        shipping_country_code: z.string().optional(),
        shipping_country_name: z.string().optional(),
        shipping_comment: z.string().optional(),
        language_code: z.string().optional(),
        fqdn: z.string().optional().describe("Webshop domain, pl. example.com"),
        due_date: z.string().optional().describe("manual módban: esedékesség YYYY-MM-DD"),
        shipping_date: z.string().optional().describe("manual módban: szállítási dátum YYYY-MM-DD"),
        prepaid: z.boolean().optional(),
        items: z.array(z.object({
          item_code: z.string(),
          qty: z.number(),
          unit_price: z.string(),
          warehouse_code: z.string().optional(),
          line_discount: z.string().optional(),
          dip_tube_cutting: z.string().optional(),
          dip_tube_cutting_price: z.string().optional(),
          full_box_discount_text: z.string().optional(),
        })).describe("Dokumentum sorok"),
      },
      async ({ doc_type, ...payload }) =>
        ok(await sapPost(`/document/${doc_type}`, payload))
    );

    server.tool(
      "sap_update_document",
      "Dokumentum fejadatainak frissítése.",
      {
        doc_type: z.enum(DOC_TYPES),
        doc_entry: z.number(),
        booking_date: z.string().optional().describe("YYYY-MM-DD"),
        shipping_date: z.string().optional().describe("YYYY-MM-DD"),
        document_date: z.string().optional().describe("YYYY-MM-DD"),
        sap_currency_code: z.string().optional(),
        sap_payment_id: z.number().optional(),
        comment: z.string().optional(),
        payment_status: z.string().optional().describe("O = nyitott, P = fizetve, C = részleges"),
        weborder_status: z.string().optional(),
        seller_company_code: z.string().optional(),
        vat_id: z.string().optional(),
        vat_valid: z.boolean().optional(),
        courier: z.string().optional().describe("pl. GLS, DPD"),
        tracking_number: z.string().optional(),
        total_weight: z.number().optional(),
        attached_file: z.string().optional(),
      },
      async ({ doc_type, doc_entry, ...payload }) =>
        ok(await sapPatch(`/document/${doc_type}/${doc_entry}`, payload))
    );

    server.tool(
      "sap_add_document_line",
      "Dokumentumhoz új tétel sor hozzáadása.",
      {
        doc_type: z.enum(DOC_TYPES),
        doc_entry: z.number(),
        item_code: z.string(),
        description: z.string().optional(),
        quantity: z.number(),
        price: z.string(),
        vat_group: z.string().optional(),
        discount_percent: z.number().optional(),
        sap_currency_code: z.string().optional(),
        sap_warehouse_code: z.string().optional(),
        parity: z.string().optional(),
        estimated_lead_time: z.number().optional(),
        free_text: z.string().optional(),
        line_total: z.string().optional(),
        tree_type: z.string().optional(),
        ship_date: z.string().optional().describe("YYYY-MM-DD"),
      },
      async ({ doc_type, doc_entry, ...payload }) =>
        ok(await sapPost(`/document/${doc_type}/${doc_entry}/line`, payload))
    );

    server.tool(
      "sap_update_document_line",
      "Dokumentumsor adatainak frissítése.",
      {
        doc_type: z.enum(DOC_TYPES),
        doc_entry: z.number(),
        line_num: z.number(),
        item_code: z.string().optional(),
        description: z.string().optional(),
        quantity: z.number().optional(),
        price: z.string().optional(),
        vat_group: z.string().optional(),
        discount_percent: z.number().optional(),
        sap_currency_code: z.string().optional(),
        sap_warehouse_code: z.string().optional(),
        parity: z.string().optional(),
        estimated_lead_time: z.number().optional(),
        free_text: z.string().optional(),
        line_total: z.string().optional(),
        ship_date: z.string().optional(),
      },
      async ({ doc_type, doc_entry, line_num, ...payload }) =>
        ok(await sapPatch(`/document/${doc_type}/${doc_entry}/line/${line_num}`, payload))
    );

    server.tool(
      "sap_delete_document_line",
      "Dokumentumsor törlése.",
      {
        doc_type: z.enum(DOC_TYPES),
        doc_entry: z.number(),
        line_num: z.number(),
      },
      async ({ doc_type, doc_entry, line_num }) =>
        ok(await sapDelete(`/document/delete-line/${doc_type}/${doc_entry}/${line_num}`))
    );

    // ── INVOICES / DELIVERIES ────────────────────────────────────────────────
    server.tool(
      "sap_get_invoice_deliveries",
      "Szállítólevelek DocNum listájának lekérése a megadott dátum után. Árbevétel-összesítőhöz használd a sap_revenue_summary tool-t.",
      {
        from: z.string().describe("Kezdő dátum pl. 2026-01-01 (Carbon::parse értelmezi)"),
      },
      async ({ from }) =>
        ok(await sapGet(`/invoice/deliveries?from=${encodeURIComponent(from)}`))
    );

    server.tool(
      "sap_get_invoice_delivery",
      "Szállítólevél adatai számlázáshoz/integrációhoz (konyvelesi_datum, OsszesenFC, tételek).",
      { doc_num: z.number().describe("Szállítólevél DocNum") },
      async ({ doc_num }) => ok(await sapGet(`/invoice/delivery/${doc_num}`))
    );

    server.tool(
      "sap_save_invoice_delivery_number",
      "Külső számlaszám mentése szállítólevélhez SAP-ban.",
      {
        doc_num: z.number(),
        invoice_number: z.string().describe("Külső számlaszám, pl. INV-2026-001"),
      },
      async ({ doc_num, invoice_number }) =>
        ok(await sapPost(`/invoice/delivery/${doc_num}`, { invoiceNumber: invoice_number }))
    );

    // ── WEBSHOP ──────────────────────────────────────────────────────────────
    server.tool(
      "sap_get_webshop_orders",
      "Webshop rendelések lapozott listája (doc_entry szerint csökkenő = legújabb első). Tartalmaz vevő adatot, szállítási/fizetési módot, tételeket árakkal és készlettel. Rendelés-elemzéshez, státusz lekérdezéshez.",
      {
        page: z.number().optional().default(1).describe("Oldalszám (alapért. 1, ~15 rekord/oldal)"),
      },
      async ({ page = 1 }) => ok(await sapGet(`/webshop/orders?page=${page}`))
    );

    server.tool(
      "sap_get_webshop_inquiries",
      "Webshop ajánlatkérések lapozott listája (id szerint csökkenő = legújabb első).",
      {
        page: z.number().optional().default(1),
      },
      async ({ page = 1 }) => ok(await sapGet(`/webshop/inquiries?page=${page}`))
    );

    server.tool(
      "sap_get_webshop_invoices",
      "SAP számla lista lapozva (doc_entry szerint csökkenő = legújabb első). Mezők: doc_entry, document_date, card_code, total, vat_total, discount_total, sap_currency_code, payment_status, courier, tracking_number, invoice_path stb. Időszak szerinti szűréshez iteráld az oldalakat — a sap_revenue_summary ezt automatikusan végzi.",
      {
        page: z.number().optional().default(1).describe("Oldalszám (alapért. 1, ~15 rekord/oldal)"),
      },
      async ({ page = 1 }) => ok(await sapGet(`/webshop/invoices?page=${page}`))
    );

    server.tool(
      "sap_get_webshop_products",
      "Webshop termékek lapozott listája (item_code szerint növekvő). Tartalmaz HUF/EUR árszinteket és készlet adatokat. Árlistához, készlet-áttekintéshez. Egy adott cikkhez használd a sap_find_product_stock tool-t.",
      {
        page: z.number().optional().default(1).describe("Oldalszám (alapért. 1, ~15 termék/oldal)"),
      },
      async ({ page = 1 }) => ok(await sapGet(`/webshop/products?page=${page}`))
    );

    server.tool(
      "sap_get_webshop_customers",
      "Webshop vevők lapozott listája számlázási/szállítási adatokkal, SAP business partner és kontakt hivatkozásokkal.",
      {
        page: z.number().optional().default(1),
      },
      async ({ page = 1 }) => ok(await sapGet(`/webshop/customers?page=${page}`))
    );

    // ── ANALYTICS — szerver-oldali aggregáció ────────────────────────────────
    server.tool(
      "sap_revenue_summary",
      "Árbevétel összesítő adott időszakra: iterálja a webshop számlákat és pénznemenként összesíti a bruttó/nettó/ÁFA összegeket. Visszaad számlaszámot, top partnereket és fizetési státusz bontást is. Pl.: 'április árbevétel', 'Q1 forgalom', 'múlt havi számlák összege', 'éves bevétel pénznemenként'.",
      {
        from: z.string().describe("Kezdő dátum YYYY-MM-DD, pl. 2026-04-01"),
        to: z.string().describe("Záró dátum YYYY-MM-DD, pl. 2026-04-30"),
        max_pages: z.number().optional().default(200).describe("Max iterált oldalszám (alapért. 200)"),
      },
      async ({ from, to, max_pages = 200 }) => {
        const fromDate = new Date(`${from}T00:00:00`);
        const toDate = new Date(`${to}T23:59:59`);

        // Aggregation buckets
        const grossByCur: Record<string, number> = {};
        const netByCur: Record<string, number> = {};
        const vatByCur: Record<string, number> = {};
        const discountByCur: Record<string, number> = {};
        const invoicesByCard: Record<string, number> = {};
        const byPaymentStatus: Record<string, number> = {};
        let invoiceCount = 0;
        let stoppedEarly = false;

        for (let page = 1; page <= max_pages && !stoppedEarly; page++) {
          let result: { data?: any[]; meta?: any } | null = null;
          try {
            result = await sapGet<{ data?: any[]; meta?: any }>(`/webshop/invoices?page=${page}`);
          } catch {
            break;
          }

          const invoices = result?.data ?? [];
          if (invoices.length === 0) break;

          for (const inv of invoices) {
            const rawDate = inv.document_date ?? inv.booking_date ?? null;
            if (!rawDate) continue;

            const docDate = new Date(`${rawDate}T00:00:00`);

            // Invoices are ordered by doc_entry desc (newest first).
            // Once we see a date before our from boundary, we can stop.
            if (docDate < fromDate) {
              stoppedEarly = true;
              break;
            }

            // Skip invoices newer than to boundary
            if (docDate > toDate) continue;

            // Within range — aggregate
            const cur = (inv.sap_currency_code ?? "UNKNOWN") as string;
            const gross = parseFloat(String(inv.total ?? "0")) || 0;
            const vat = parseFloat(String(inv.vat_total ?? "0")) || 0;
            const discount = parseFloat(String(inv.discount_total ?? "0")) || 0;
            const net = gross - vat;

            grossByCur[cur] = (grossByCur[cur] ?? 0) + gross;
            vatByCur[cur] = (vatByCur[cur] ?? 0) + vat;
            netByCur[cur] = (netByCur[cur] ?? 0) + net;
            discountByCur[cur] = (discountByCur[cur] ?? 0) + discount;

            const cardCode = inv.card_code ?? "unknown";
            invoicesByCard[cardCode] = (invoicesByCard[cardCode] ?? 0) + 1;

            const pStatus = inv.payment_status ?? "unknown";
            byPaymentStatus[pStatus] = (byPaymentStatus[pStatus] ?? 0) + 1;

            invoiceCount++;
          }
        }

        const revenueByCurrency = Object.entries(grossByCur).map(([currency, gross]) => ({
          currency,
          gross_total: Math.round(gross * 100) / 100,
          net_total: Math.round((netByCur[currency] ?? 0) * 100) / 100,
          vat_total: Math.round((vatByCur[currency] ?? 0) * 100) / 100,
          discount_total: Math.round((discountByCur[currency] ?? 0) * 100) / 100,
        }));

        const topCustomers = Object.entries(invoicesByCard)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 15)
          .map(([card_code, count]) => ({ card_code, invoice_count: count }));

        return ok({
          period: { from, to },
          invoice_count: invoiceCount,
          revenue_by_currency: revenueByCurrency,
          payment_status_breakdown: byPaymentStatus,
          top_customers_by_invoice_count: topCustomers,
          note: stoppedEarly
            ? `Az időszak elejét elérve leállt. Összesen ${invoiceCount} számla feldolgozva.`
            : `Max ${max_pages} oldal feldolgozva, ${invoiceCount} számla összesítve.`,
        });
      }
    );

    server.tool(
      "sap_find_product_stock",
      "Egy vagy több konkrét cikk árainak és készletszintjeinek lekérdezése cikkszám alapján. Végigiterál a webshop termékeken (item_code szerint rendezve) és visszaadja a talált cikkek teljes adatait (árak HUF/EUR, stocks). Pl.: 'mennyi van raktáron 100001-ből', 'mi az ára a 200005 cikknek'.",
      {
        item_codes: z.string().describe("Cikkszám(ok) vesszővel, pl. 100001 vagy 100001,100002,100003"),
        max_pages: z.number().optional().default(150).describe("Max iterált oldalszám (alapért. 150)"),
      },
      async ({ item_codes, max_pages = 150 }) => {
        const targets = new Set(item_codes.split(",").map((s) => s.trim()).filter(Boolean));
        const found: any[] = [];

        for (let page = 1; page <= max_pages && found.length < targets.size; page++) {
          let result: { data?: any[] } | null = null;
          try {
            result = await sapGet<{ data?: any[] }>(`/webshop/products?page=${page}`);
          } catch {
            break;
          }

          const products = result?.data ?? [];
          if (products.length === 0) break;

          for (const product of products) {
            if (targets.has(product.item_code)) {
              found.push(product);
              if (found.length >= targets.size) break;
            }
          }
        }

        const notFound = Array.from(targets).filter(
          (code) => !found.some((p) => p.item_code === code)
        );

        return ok({
          searched: Array.from(targets),
          found_count: found.length,
          not_found: notFound,
          products: found,
        });
      }
    );

    // ── FEATURE VALUES ───────────────────────────────────────────────────────
    server.tool(
      "sap_get_feature_values",
      "Webshop feature listák többnyelvű nevekkel (cosmetic_base, bottle_type, color, stb.).",
      {},
      async () => ok(await sapGet("/feature-values/"))
    );

    // ── PHONE SEARCH ─────────────────────────────────────────────────────────
    server.tool(
      "sap_phone_search",
      "Partner neve keresése telefonszám alapján.",
      {
        phone: z.string().describe("Telefonszám, pl. +36201234567 vagy 06201234567"),
      },
      async ({ phone }) =>
        ok(await sapGet(`/phone-search?request=${encodeURIComponent(phone)}`))
    );
  },

  { capabilities: { tools: {} } },

  {
    redisUrl: process.env.REDIS_URL,
    basePath: "/api",
    verboseLogs: process.env.NODE_ENV === "development",
    maxDuration: 300,
  }
);

export { handler as GET, handler as POST, handler as DELETE };
