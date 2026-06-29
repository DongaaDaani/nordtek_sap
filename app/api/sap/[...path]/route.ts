/**
 * SAP API proxy — a frontend hívja, hogy CORS-mentes legyen.
 * URL: /api/sap/<path> → https://interface-v2.nordtek.hu/v1/<path>
 *
 * Példa: GET /api/sap/item/ → GET https://interface-v2.nordtek.hu/v1/item/
 */

import { NextRequest, NextResponse } from "next/server";

const SAP_BASE_URL = process.env.SAP_BASE_URL || "https://interface-v2.nordtek.hu/v1";
const SAP_CLIENT_ID = process.env.SAP_CLIENT_ID || "";
const SAP_API_KEY = process.env.SAP_API_KEY || "";

function authHeader() {
  return `Basic ${Buffer.from(`${SAP_CLIENT_ID}:${SAP_API_KEY}`).toString("base64")}`;
}

async function proxy(req: NextRequest, params: { path: string[] }) {
  const sapPath = "/" + params.path.join("/");
  const search = req.nextUrl.search;
  const url = `${SAP_BASE_URL}${sapPath}${search}`;

  const headers: Record<string, string> = {
    Authorization: authHeader(),
    Accept: "application/json",
  };

  let body: BodyInit | undefined;
  const contentType = req.headers.get("content-type") || "";
  if (req.method !== "GET" && req.method !== "HEAD") {
    if (contentType.includes("multipart/form-data")) {
      body = await req.formData();
    } else {
      body = await req.text();
      headers["Content-Type"] = "application/json";
    }
  }

  const sapRes = await fetch(url, {
    method: req.method,
    headers,
    body,
    cache: "no-store",
  });

  const data = await sapRes.text();

  return new NextResponse(data, {
    status: sapRes.status,
    headers: {
      "Content-Type": sapRes.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
