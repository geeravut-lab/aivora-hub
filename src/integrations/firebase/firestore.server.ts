/**
 * Server-only Firestore access over the REST API.
 *
 * Only the handful of operations the hub needs, with just enough value
 * encoding for the documents it writes. Security rules do not apply here —
 * these calls use the service account, so treat every function as privileged.
 */
import { accessToken, hubProjectId } from "./google-auth.server";

type FirestoreValue = Record<string, unknown>;
type FirestoreFields = Record<string, FirestoreValue>;

interface FirestoreDocument {
  name?: string;
  fields?: FirestoreFields;
  updateTime?: string;
}

function base(): string {
  return `https://firestore.googleapis.com/v1/projects/${hubProjectId()}/databases/(default)/documents`;
}

/* ---------- value encoding ---------- */

function encodeValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } };
  }
  if (typeof value === "object") {
    return { mapValue: { fields: encodeFields(value as Record<string, unknown>) } };
  }
  return { stringValue: String(value) };
}

export function encodeFields(data: Record<string, unknown>): FirestoreFields {
  const fields: FirestoreFields = {};
  for (const [key, value] of Object.entries(data)) fields[key] = encodeValue(value);
  return fields;
}

function decodeValue(value: FirestoreValue): unknown {
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value["booleanValue"];
  if ("stringValue" in value) return value["stringValue"];
  if ("integerValue" in value) return Number(value["integerValue"]);
  if ("doubleValue" in value) return value["doubleValue"];
  if ("timestampValue" in value) return new Date(String(value["timestampValue"]));
  if ("arrayValue" in value) {
    const inner = (value["arrayValue"] as { values?: FirestoreValue[] } | undefined)?.values ?? [];
    return inner.map(decodeValue);
  }
  if ("mapValue" in value) {
    const inner = (value["mapValue"] as { fields?: FirestoreFields } | undefined)?.fields ?? {};
    return decodeFields(inner);
  }
  return null;
}

export function decodeFields(fields: FirestoreFields | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields ?? {})) out[key] = decodeValue(value);
  return out;
}

/* ---------- requests ---------- */

async function request<T>(
  path: string,
  init: { method: string; body?: unknown; query?: string },
): Promise<{ ok: boolean; status: number; data: T }> {
  const token = await accessToken();
  const url = `${base()}${path}${init.query ? `?${init.query}` : ""}`;
  const res = await fetch(url, {
    method: init.method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
  const text = await res.text();
  const data = (text ? JSON.parse(text) : {}) as T;
  return { ok: res.ok, status: res.status, data };
}

export interface DocSnapshot {
  exists: boolean;
  data: Record<string, unknown>;
  updateTime: string | null;
}

/** Read one document. A missing document is `exists: false`, not an error. */
export async function getDoc(path: string): Promise<DocSnapshot> {
  const res = await request<FirestoreDocument & { error?: unknown }>(`/${path}`, { method: "GET" });
  if (res.status === 404) return { exists: false, data: {}, updateTime: null };
  if (!res.ok) {
    throw new Error(`firestore get ${path} failed: ${res.status} ${JSON.stringify(res.data)}`);
  }
  return {
    exists: true,
    data: decodeFields(res.data.fields),
    updateTime: res.data.updateTime ?? null,
  };
}

/**
 * Write a document. `merge: true` uses an updateMask so untouched fields
 * survive — the REST equivalent of set({ merge: true }).
 */
export async function setDoc(
  path: string,
  data: Record<string, unknown>,
  options: { merge?: boolean } = {},
): Promise<void> {
  const keys = Object.keys(data);
  const query = options.merge
    ? keys.map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`).join("&")
    : undefined;

  const res = await request<unknown>(`/${path}`, {
    method: "PATCH",
    body: { fields: encodeFields(data) },
    ...(query ? { query } : {}),
  });
  if (!res.ok) {
    throw new Error(`firestore set ${path} failed: ${res.status} ${JSON.stringify(res.data)}`);
  }
}

/**
 * Update a document only if it has not changed since it was read.
 * Returns false when the precondition failed — which is how a one-time SSO
 * ticket stays one-time under concurrent exchanges.
 */
export async function updateDocIfUnchanged(
  path: string,
  data: Record<string, unknown>,
  updateTime: string,
): Promise<boolean> {
  const token = await accessToken();
  const params = new URLSearchParams();
  for (const key of Object.keys(data)) params.append("updateMask.fieldPaths", key);
  params.append("currentDocument.updateTime", updateTime);

  const res = await fetch(`${base()}/${path}?${params.toString()}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: encodeFields(data) }),
  });

  if (res.ok) return true;
  if (res.status === 400 || res.status === 409 || res.status === 412) return false;
  throw new Error(`firestore conditional update ${path} failed: ${res.status}`);
}

export interface QueryResult {
  id: string;
  data: Record<string, unknown>;
}

/** Single equality filter — all this app needs (apps by slug). */
export async function queryCollection(
  collectionId: string,
  field: string,
  equals: string,
  limit = 1,
): Promise<QueryResult[]> {
  const res = await request<Array<{ document?: FirestoreDocument }>>(":runQuery", {
    method: "POST",
    body: {
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: "EQUAL",
            value: { stringValue: equals },
          },
        },
        limit,
      },
    },
  });

  if (!res.ok) {
    throw new Error(`firestore query ${collectionId} failed: ${res.status}`);
  }

  const rows: QueryResult[] = [];
  for (const entry of Array.isArray(res.data) ? res.data : []) {
    if (!entry.document?.name) continue;
    rows.push({
      id: entry.document.name.split("/").pop() ?? "",
      data: decodeFields(entry.document.fields),
    });
  }
  return rows;
}
