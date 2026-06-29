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

// ─── Helper ────────────────────────────────────────────────────────────────────
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
      "sap_update_item",
      "Cikk SAP adatainak frissítése (warehouse_position, weight, qty_per_box, works_with, not_works_with, leírások, video_link).",
      {
        item_code: z.string().describe("SAP cikkszám"),
        warehouse_position: z.string().optional().describe("Raktárpozíció pl. A-01-02"),
        weight: z.string().optional().describe("Súly"),
        qty_per_box: z.number().optional().describe("Darab/doboz"),
        works_with: z.string().optional().describe("Kompatibilis cikkek vesszővel elválasztva"),
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
        card_codes: z.string().describe("CardCode-ok vesszővel elválasztva, pl. C100001,C100002"),
      },
      async ({ card_codes }) =>
        ok(await sapGet(`/business-partner/?cardCodes=${encodeURIComponent(card_codes)}`))
    );

    server.tool(
      "sap_get_business_partner",
      "Egy business partner adatainak lekérése cardCode alapján.",
      { card_code: z.string().describe("Partner kardkódja pl. C100001") },
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
        foreign_name: z.string().optional().describe("Idegen neve"),
        type: z.string().describe("Típus: C (vevő), S (szállító), L (lead)"),
        email: z.string().optional(),
        phone_1: z.string().optional(),
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
      },
      async (payload) => ok(await sapPost("/business-partner/", payload))
    );

    server.tool(
      "sap_update_business_partner",
      "Meglévő business partner adatainak frissítése.",
      {
        card_code: z.string().describe("Partner kardkódja"),
        name: z.string().optional(),
        foreign_name: z.string().optional(),
        type: z.string().optional(),
        email: z.string().optional(),
        phone_1: z.string().optional(),
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
        codes: z.string().optional().describe("CardCode-ok vesszővel elválasztva (opcionális)"),
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
        card_code: z.string().describe("Partner kardkódja"),
        name: z.string().describe("Teljes név"),
        title: z.string().optional().describe("Megszólítás pl. Ms., Mr."),
        position: z.string().optional().describe("Beosztás"),
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
      "Partner összes címének lekérése.",
      { card_code: z.string().describe("Partner kardkódja") },
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
        country: z.string().describe("Kétbetűs ország kód pl. HU"),
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
        doc_type: z.enum(DOC_TYPES).describe("Dokumentum típusa"),
        doc_entries: z.string().describe("DocEntry-k vesszővel elválasztva pl. 1001,1002"),
      },
      async ({ doc_type, doc_entries }) =>
        ok(await sapGet(`/document/${doc_type}?docEntries=${encodeURIComponent(doc_entries)}`))
    );

    server.tool(
      "sap_get_document",
      "Egy dokumentum teljes lekérése (master_data + items).",
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
        card_codes: z.string().describe("CardCode-ok vesszővel elválasztva"),
      },
      async ({ doc_type, card_codes }) =>
        ok(await sapGet(`/document/demo/${doc_type}?cardCodes=${encodeURIComponent(card_codes)}`))
    );

    server.tool(
      "sap_create_document",
      "Új dokumentum (rendelés/számla/ajánlat/szállítólevél) létrehozása SAP-ban.",
      {
        doc_type: z.enum(DOC_TYPES),
        id: z.string().describe("Webshop rendelésszám pl. WEB-10001"),
        uuid: z.string().optional(),
        mode: z.enum(["webshop", "manual"]).default("webshop"),
        card_code: z.string().describe("Vevő kardkódja"),
        card_name: z.string().describe("Vevő neve"),
        contact_code: z.number().optional().describe("Kapcsolattartó CntctCode"),
        currency_code: z.string().describe("Pénznem pl. EUR"),
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
      "Dokumentumsorhoz új tétel hozzáadása.",
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
      "Szállítólevelek DocNum listájának lekérése a megadott dátum után.",
      {
        from: z.string().describe("Kezdő dátum pl. 2026-01-01 (Carbon::parse értelmezi)"),
      },
      async ({ from }) =>
        ok(await sapGet(`/invoice/deliveries?from=${encodeURIComponent(from)}`))
    );

    server.tool(
      "sap_get_invoice_delivery",
      "Szállítólevél adatai számlázáshoz/integrációhoz.",
      { doc_num: z.number().describe("Szállítólevél DocNum") },
      async ({ doc_num }) => ok(await sapGet(`/invoice/delivery/${doc_num}`))
    );

    server.tool(
      "sap_save_invoice_delivery_number",
      "Külső számlaszám mentése szállítólevélhez SAP-ban.",
      {
        doc_num: z.number().describe("Szállítólevél DocNum"),
        invoice_number: z.string().describe("Külső számlaszám pl. INV-2026-001"),
      },
      async ({ doc_num, invoice_number }) =>
        ok(await sapPost(`/invoice/delivery/${doc_num}`, { invoiceNumber: invoice_number }))
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
        phone: z.string().describe("Telefonszám pl. +36201234567 vagy 06201234567"),
      },
      async ({ phone }) =>
        ok(await sapGet(`/phone-search?request=${encodeURIComponent(phone)}`))
    );
  },

  // Server metadata
  {
    capabilities: { tools: {} },
  },

  // Adapter options
  {
    redisUrl: process.env.REDIS_URL,
    basePath: "/api",
    verboseLogs: process.env.NODE_ENV === "development",
    maxDuration: 60,
  }
);

export { handler as GET, handler as POST, handler as DELE