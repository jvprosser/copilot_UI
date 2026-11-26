import {
  ActionRequest,
  ActionResponse,
  ChatRequest,
  ChatResponse,
} from "@/types/api-contract";

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.detail = detail;
  }
}

let cachedApiBase: string | null = null;

function normalizeBase(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim().replace(/\/+$/, "");
}

export async function resolveApiBase(): Promise<string> {
  if (cachedApiBase !== null) return cachedApiBase;

  if (typeof window !== "undefined") {
    try {
      // /config.js is written by serve.py at request time and is not a compiled module.
      const mod: unknown = await import(
        /* webpackIgnore: true */
        // @ts-expect-error Runtime module served by serve.py.
        "/config.js",
      );
      if (typeof mod === "object" && mod !== null && "API_BASE" in mod) {
        const runtimeBase = normalizeBase(
          (mod as Record<string, unknown>).API_BASE
        );
        if (runtimeBase !== null) {
          cachedApiBase = runtimeBase;
          return cachedApiBase;
        }
      }
    } catch {
      // /config.js is not present during `next dev`; fall through to env var.
    }
  }

  const envBase = normalizeBase(process.env.NEXT_PUBLIC_API_BASE_URL);
  cachedApiBase = envBase ?? "";
  return cachedApiBase;
}

function extractErrorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string" && detail.trim().length > 0) {
    return detail;
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (
          typeof item === "object" &&
          item !== null &&
          "msg" in item &&
          typeof (item as Record<string, unknown>).msg === "string"
        ) {
          return (item as Record<string, unknown>).msg as string;
        }
        return null;
      })
      .filter((msg): msg is string => msg !== null);
    if (messages.length > 0) return messages.join("; ");
  }
  return fallback;
}

function buildChatBody(payload: ChatRequest): Record<string, string> {
  const body: Record<string, string> = {
    user_text: payload.user_text,
    pack_id: payload.pack_id,
  };
  if (payload.dialect) body.dialect = payload.dialect;
  if (payload.entity_id) body.entity_id = payload.entity_id;
  if (payload.lane) body.lane = payload.lane;
  return body;
}

function detailFrom(body: unknown): unknown {
  if (typeof body === "object" && body !== null && "detail" in body) {
    return (body as Record<string, unknown>).detail;
  }
  return body;
}

async function readBody(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const apiBase = await resolveApiBase();
  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const parsed = await readBody(response);
  if (!response.ok) {
    const detail = detailFrom(parsed);
    const message = extractErrorMessage(
      detail,
      response.statusText || "Request failed",
    );
    throw new ApiClientError(message, response.status, detail);
  }
  return parsed as T;
}

export async function postChat(payload: ChatRequest): Promise<ChatResponse> {
  return postJson<ChatResponse>("/api/v1/chat", buildChatBody(payload));
}

function buildActionBody(payload: ActionRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    intent: payload.intent,
    pack_id: payload.pack_id,
    payload: payload.payload,
  };
  if (payload.run_id != null) body.run_id = payload.run_id;
  if (payload.entity_id != null) body.entity_id = payload.entity_id;
  if (payload.lane != null) body.lane = payload.lane;
  if (payload.dialect != null) body.dialect = payload.dialect;
  return body;
}

export async function postAction(
  payload: ActionRequest,
): Promise<ActionResponse> {
  return postJson<ActionResponse>("/api/v1/action", buildActionBody(payload));
}
