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

/** Build a query string from an object, skipping undefined/null values */
function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== "") {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
    }
  }
  return parts.length ? "?" + parts.join("&") : "";
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

    // ── INVOICES / DELIVERIES (számlázási integráció) ────────────────────────
    server.tool(
      "sap_get_invoice_deliveries",
      "Szállítólevelek listája számlázási/integrációs célra, dátumtartomány alapján szűrhető. Visszaad: docnum, docentry, DocCur, konyvelesi_datum, total, vat_total, SellerCompany.",
      {
        from: z.string().optional().describe("Kezdő dátum pl. 2026-01-01"),
        to: z.string().optional().describe("Záró dátum pl. 2026-06-30"),
      },
      async ({ from, to }) => {
        const q = buildQuery({ from, to });
        return ok(await sapGet(`/invoice/deliveries${q}`));
      }
    );

    server.tool(
      "sap_get_invoice_delivery",
      "Szállítólevél részletes adatai számlázáshoz/integrációhoz (konyvelesi_datum, OsszesenFC, tételek).",
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

    // ── WEBSHOP — DOKUMENTUM LISTÁK ─────────────────────────────────────────
    server.tool(
      "sap_get_webshop_orders",
      "Webshop rendelések lapozott listája szűrési lehetőségekkel. id szerint csökkenő sorrend (legújabb első). Tartalmaz vevőadatot, szállítási/fizetési módot, tételeket árakkal és készlettel.",
      {
        page: z.number().optional().default(1).describe("Oldalszám (alapért. 1)"),
        per_page: z.number().optional().describe("Rekord/oldal (max 100, alapért. 15)"),
        from: z.string().optional().describe("Kezdő dátum YYYY-MM-DD (webshop created_at mezőre)"),
        to: z.string().optional().describe("Záró dátum YYYY-MM-DD"),
        card_code: z.string().optional().describe("Partner CardCode szűrő, pl. C100001"),
        payment_status: z.string().optional().describe("Fizetési státusz szűrő"),
        weborder_status: z.string().optional().describe("Webshop rendelés státusz szűrő, pl. new, processing"),
        seller_company_code: z.string().optional().describe("Eladó cég kódja, pl. NORD"),
      },
      async ({ page = 1, per_page, from, to, card_code, payment_status, weborder_status, seller_company_code }) => {
        const q = buildQuery({ page, per_page, from, to, cardCode: card_code, payment_status, weborder_status, seller_company_code });
        return ok(await sapGet(`/webshop/orders${q}`));
      }
    );

    server.tool(
      "sap_get_webshop_inquiries",
      "Webshop ajánlatkérések lapozott listája szűrési lehetőségekkel. id szerint csökkenő sorrend.",
      {
        page: z.number().optional().default(1),
        per_page: z.number().optional().describe("Rekord/oldal (max 100, alapért. 15)"),
        from: z.string().optional().describe("Kezdő dátum YYYY-MM-DD (webshop created_at mezőre)"),
        to: z.string().optional().describe("Záró dátum YYYY-MM-DD"),
        card_code: z.string().optional().describe("Partner CardCode szűrő"),
        status: z.string().optional().describe("Ajánlat státusz szűrő"),
        seller_company_code: z.string().optional(),
      },
      async ({ page = 1, per_page, from, to, card_code, status, seller_company_code }) => {
        const q = buildQuery({ page, per_page, from, to, cardCode: card_code, status, seller_company_code });
        return ok(await sapGet(`/webshop/inquiries${q}`));
      }
    );

    server.tool(
      "sap_get_webshop_invoices",
      "SAP szamlák lapozott listája szűrési lehetőségekkel. doc_entry szerint csökkenő (legújabb első). Mezők: doc_entry, document_date, card_code, total, vat_total, sap_currency_code, payment_status, courier, tracking_number stb. Gyors árbevétel-elemzéshez használd a sap_revenue_summary tool-t.",
      {
        page: z.number().optional().default(1).describe("Oldalszám (alapért. 1)"),
        per_page: z.number().optional().describe("Rekord/oldal (max 100, alapért. 15)"),
        from: z.string().optional().describe("Kezdő dátum YYYY-MM-DD (document_date mezőre)"),
        to: z.string().optional().describe("Záró dátum YYYY-MM-DD"),
        card_code: z.string().optional().describe("Partner CardCode szűrő"),
        payment_status: z.string().optional().describe("Fizetési státusz: paid, open stb."),
        weborder_status: z.string().optional().describe("Webshop rendelési státusz szűrő"),
        seller_company_code: z.string().optional().describe("Eladó cég kódja"),
      },
      async ({ page = 1, per_page, from, to, card_code, payment_status, weborder_status, seller_company_code }) => {
        const q = buildQuery({ page, per_page, from, to, cardCode: card_code, payment_status, weborder_status, seller_company_code });
        return ok(await sapGet(`/webshop/invoices${q}`));
      }
    );

    server.tool(
      "sap_get_webshop_deliveries",
      "SAP szállítólevelek lapozott listája szűrési lehetőségekkel. doc_entry szerint csökkenő. Mezők: doc_entry, document_date, booking_date, card_code, total, vat_total, sap_currency_code, payment_status, tracking_number stb.",
      {
        page: z.number().optional().default(1).describe("Oldalszám (alapért. 1)"),
        per_page: z.number().optional().describe("Rekord/oldal (max 100, alapért. 15)"),
        from: z.string().optional().describe("Kezdő dátum YYYY-MM-DD (booking_date mezőre)"),
        to: z.string().optional().describe("Záró dátum YYYY-MM-DD"),
        card_code: z.string().optional().describe("Partner CardCode szűrő"),
        payment_status: z.string().optional().describe("Fizetési státusz szűrő"),
        seller_company_code: z.string().optional().describe("Eladó cég kódja"),
      },
      async ({ page = 1, per_page, from, to, card_code, payment_status, seller_company_code }) => {
        const q = buildQuery({ page, per_page, from, to, cardCode: card_code, payment_status, seller_company_code });
        return ok(await sapGet(`/webshop/deliveries${q}`));
      }
    );

    server.tool(
      "sap_get_webshop_products",
      "Webshop termékek lapozott listája szűrési lehetőségekkel (item_code szerint növekvő). Tartalmaz HUF/EUR árszinteket, készletadatokat (main_stock, outer_stock, total_stock, available_stock). Szűrhető cikkcsoportra, aktív státuszra, webshop-elérhetőségre, készletállapotra.",
      {
        page: z.number().optional().default(1).describe("Oldalszám (alapért. 1)"),
        per_page: z.number().optional().describe("Rekord/oldal (max 100, alapért. 15)"),
        sap_item_group_id: z.number().optional().describe("SAP cikkcsoport azonosító szűrő"),
        is_active: z.boolean().optional().describe("Csak aktív (true) vagy inaktív (false) cikkek"),
        sellable_in_webshop: z.boolean().optional().describe("Webshopban értékesíthető szűrő"),
        stock_status: z.enum(["in_stock", "out_of_stock"]).optional().describe("Készletállapot szűrő"),
      },
      async ({ page = 1, per_page, sap_item_group_id, is_active, sellable_in_webshop, stock_status }) => {
        const q = buildQuery({ page, per_page, sap_item_group_id, is_active, sellable_in_webshop, stock_status });
        return ok(await sapGet(`/webshop/products${q}`));
      }
    );

    server.tool(
      "sap_get_webshop_customers",
      "Webshop vevők lapozott listája számlázási/szállítási adatokkal, SAP business partner és kontakt hivatkozásokkal.",
      {
        page: z.number().optional().default(1),
        per_page: z.number().optional().describe("Rekord/oldal (max 100, alapért. 15)"),
      },
      async ({ page = 1, per_page }) => {
        const q = buildQuery({ page, per_page });
        return ok(await sapGet(`/webshop/customers${q}`));
      }
    );

    server.tool(
      "sap_list_webshop_business_partners",
      "Business partnerek lapozott listája a webshop rendszerből, kapcsolattartókkal és címekkel együtt. Szűrhető: aktív státusz, ország, partnercsoport, értékesítő. Pl.: 'HU aktív partnerek', 'egy értékesítő összes vevője', 'partnercsoport tagok'.",
      {
        page: z.number().optional().default(1),
        per_page: z.number().optional().describe("Rekord/oldal (max 100, alapért. 15)"),
        is_active: z.enum(["Y", "N"]).optional().describe("Aktív: Y, Inaktív: N"),
        country: z.string().optional().describe("Ország kód, pl. HU, DE, FR"),
        sap_card_group_id: z.number().optional().describe("SAP partnercsoport azonosító"),
        sales_person_id: z.number().optional().describe("Értékesítő azonosítója"),
      },
      async ({ page = 1, per_page, is_active, country, sap_card_group_id, sales_person_id }) => {
        const q = buildQuery({ page, per_page, is_active, country, sap_card_group_id, sales_person_id });
        return ok(await sapGet(`/webshop/business-partners${q}`));
      }
    );

    // ── ANALYTICS ────────────────────────────────────────────────────────────

    server.tool(
      "sap_revenue_summary",
      "Árbevétel analytics adott időszakra — egyetlen gyors API hívás. Visszaad: számla darabszám, devizánkénti bruttó/nettó/ÁFA összesítő, fizetési státusz szerinti bontás, top vevők. Pl.: 'április árbevétel', 'Q1 forgalom EUR-ban', 'múlt hónap számlák összege', 'éves bevétel devizánként', 'kik a top vevők'.",
      {
        from: z.string().optional().describe("Kezdő dátum YYYY-MM-DD, pl. 2026-04-01"),
        to: z.string().optional().describe("Záró dátum YYYY-MM-DD, pl. 2026-04-30"),
        currency: z.string().optional().describe("Pénznem szűrő, pl. EUR vagy HUF"),
        payment_status: z.string().optional().describe("Fizetési státusz szűrő, pl. paid, open"),
        seller_company_code: z.string().optional().describe("Eladó cég kódja, pl. NORD"),
        top_limit: z.number().optional().default(10).describe("Top vevők száma (max 100, alapért. 10)"),
      },
      async ({ from, to, currency, payment_status, seller_company_code, top_limit = 10 }) => {
        const q = buildQuery({ from, to, currency, payment_status, seller_company_code, top_limit });
        return ok(await sapGet(`/webshop/analytics/revenue${q}`));
      }
    );

    server.tool(
      "sap_analytics_inventory",
      "Készlet összesítő raktárak vagy cikkcsoportok szerint. Minden raktárhoz/csoporthoz visszaadja: cikkszám, mennyiség (on_hand, committed, on_order), becsült készletérték HUF-ban. Pl.: 'melyik raktárban mennyi van', 'teljes készletérték', 'cikkcsoport készlet', 'raktárak összehasonlítása'.",
      {
        group_by: z.enum(["warehouse", "item_group"]).optional().default("warehouse").describe("Csoportosítás: warehouse (alapért.) vagy item_group"),
        sap_item_group_id: z.number().optional().describe("SAP cikkcsoport azonosító szűrő"),
        warehouse_code: z.string().optional().describe("Raktár kód szűrő, pl. 01"),
        is_active: z.boolean().optional().describe("Csak aktív cikkek szűrő"),
        sellable_in_webshop: z.boolean().optional().describe("Webshopban értékesíthető cikkek szűrő"),
      },
      async ({ group_by = "warehouse", sap_item_group_id, warehouse_code, is_active, sellable_in_webshop }) => {
        const q = buildQuery({ group_by, sap_item_group_id, warehouse_code, is_active, sellable_in_webshop });
        return ok(await sapGet(`/webshop/analytics/inventory${q}`));
      }
    );

    server.tool(
      "sap_analytics_slow_moving",
      "Lassan mozgó vagy túlkészletezett cikkek listája — azon termékek, amelyekből sokat tartunk, de keveset adunk el. Alapértelmezés: az elmúlt 90 napban 0 eladott mennyiség, de van készleten. Hasznos: 'mi áll a raktárban', 'túlkészlet azonosítás', 'dead stock', 'milyen cikkeket nem adunk el'.",
      {
        from: z.string().optional().describe("Eladási időszak kezdete YYYY-MM-DD (alapért. ma-90 nap)"),
        to: z.string().optional().describe("Eladási időszak vége YYYY-MM-DD"),
        max_sold_quantity: z.number().optional().default(0).describe("Maximum eladott mennyiség az időszakban (alapért. 0)"),
        min_stock_quantity: z.number().optional().default(1).describe("Minimum jelenlegi készlet (alapért. 1)"),
        sap_item_group_id: z.number().optional().describe("SAP cikkcsoport szűrő"),
        warehouse_code: z.string().optional().describe("Raktár kód szűrő"),
        top_limit: z.number().optional().default(50).describe("Visszaadott cikkek száma (max 100, alapért. 50)"),
      },
      async ({ from, to, max_sold_quantity, min_stock_quantity, sap_item_group_id, warehouse_code, top_limit }) => {
        const q = buildQuery({ from, to, max_sold_quantity, min_stock_quantity, sap_item_group_id, warehouse_code, top_limit });
        return ok(await sapGet(`/webshop/analytics/inventory/slow-moving${q}`));
      }
    );

    server.tool(
      "sap_analytics_top_selling",
      "Legtöbbet eladott termékek listája eladott mennyiség alapján, SAP számlák és/vagy szállítólevelek alapján. Pl.: 'top 10 termék', 'legjobban fogyó cikkek ebben a hónapban', 'Q1 bestseller lista', 'melyik cikket adtuk el legtöbbet', 'egy konkrét cikk forgalma'.",
      {
        from: z.string().optional().describe("Kezdő dátum YYYY-MM-DD (document_date mezőre)"),
        to: z.string().optional().describe("Záró dátum YYYY-MM-DD"),
        document_type: z.enum(["invoice", "delivery"]).optional().describe("Dokumentum típus szűrő (alapért. mindkettő)"),
        item_code: z.string().optional().describe("Egy konkrét cikkszám forgalmának lekérdezése"),
        sap_item_group_id: z.number().optional().describe("SAP cikkcsoport szűrő"),
        top_limit: z.number().optional().default(10).describe("Visszaadott cikkek száma (max 100, alapért. 10)"),
      },
      async ({ from, to, document_type, item_code, sap_item_group_id, top_limit }) => {
        const q = buildQuery({ from, to, document_type, item_code, sap_item_group_id, top_limit });
        return ok(await sapGet(`/webshop/analytics/products/top-selling${q}`));
      }
    );

    server.tool(
      "sap_find_product_stock",
      "Egy vagy több konkrét cikk árainak és készletszintjeinek lekérdezése cikkszám alapján. Bulk lekérdezés egyetlen API hívással. Visszaad: HUF/EUR árszintek, main_stock, outer_stock, total_stock, available_stock. Pl.: 'mennyi van raktáron 100001-ből', 'mi az ára a 200005 cikknek', 'ezeknek a cikkeknek mennyi a készlete'.",
      {
        item_codes: z.string().describe("Cikkszám(ok) vesszővel, pl. 100001 vagy 100001,100002,100003"),
      },
      async ({ item_codes }) => {
        // Use the /webshop/products/bulk endpoint — single API call, no page iteration needed
        const codes = item_codes.split(",").map((s) => s.trim()).filter(Boolean);
        const queryString = codes.map((c) => `item_codes[]=${encodeURIComponent(c)}`).join("&");
        const result = await sapGet<any[]>(`/webshop/products/bulk?${queryString}`);
        const products = Array.isArray(result) ? result : [];
        const foundCodes = new Set(products.map((p: any) => p.item_code));
        const notFound = codes.filter((c) => !foundCodes.has(c));
        return ok({
          searched: codes,
          found_count: products.length,
          not_found: notFound,
          products,
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
