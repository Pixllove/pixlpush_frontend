import { NextResponse } from "next/server";
import { callBackendWithRefresh } from "@/lib/auth/server";

/** Project-scoped backend areas this proxy may reach. Anything else is a 404. */
const ALLOWED = [
  "deactivate",
  "restore",
  "firebase",
  "sdk-keys",
  // Includes only the current read/status and test-send operations.
  "email-settings",
  "billing",
  "members",
  "users",
  "events",
  "lifecycle-segments",
  // The commit carries `emailConsentConfirmed` in its JSON body.
  "user-imports",
  "audience-groups",
  // Includes PATCH /:domainId (DKIM selector) and /:domainId/activate.
  "sending-domains",
  "invitations",
  "audit-logs",
  "push-templates",
  "push-deeplinks",
  "push-campaigns",
  "push-deliveries",
  // Includes /languages, /default-language, /translate, /suggest,
  // /deliverability-check, and the existing template CRUD routes under the
  // same backend resource.
  "email-templates",
  "email-campaigns",
  "email-deliveries",
  "journeys",
  "analytics",
  // Home AI workspace: /assistants, /context, /business-context,
  // /business-context/analyze, /chat, /conversations and /flows/:flowId/draft.
  // Chat and drafts only return text to review; they never send or change
  // anything themselves.
  "ai",
];

type Params = { params: { projectId: string; path: string[] } };

function normalizePublicUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function normalizeBusinessContextAnalyzeBody(path: string[], body: unknown): unknown {
  if (path[0] !== "ai" || path[1] !== "business-context" || !["analyze", "detect-links"].includes(path[2] ?? "")) return body;
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const payload = body as Record<string, unknown>;
  return typeof payload.url === "string" ? { ...payload, url: normalizePublicUrl(payload.url) } : body;
}

/** Forwards to /projects/:projectId/<path>. Roles are enforced upstream. */
async function proxy(request: Request, { params }: Params) {
  if (!ALLOWED.includes(params.path[0])) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Not found." } },
      { status: 404 },
    );
  }

  const path = [params.projectId, ...params.path]
    .map(encodeURIComponent)
    .join("/");
  const query = new URL(request.url).search;
  // A CSV upload is forwarded as raw text with its own content type.
  const type = request.headers.get("content-type") ?? "";
  const csvType = type && !type.includes("json") ? type : undefined;
  // Fastify rejects an empty body sent as application/json, hence `{}`.
  const body =
    request.method === "GET"
      ? undefined
      : type.startsWith("multipart/form-data")
        ? // An editor image upload: forwarded byte for byte, boundary and all.
          await request.arrayBuffer()
        : csvType
          ? await request.text()
        : await request.json().catch(() => ({}));
  const normalizedBody = normalizeBusinessContextAnalyzeBody(params.path, body);

  const result = await callBackendWithRefresh(`/projects/${path}${query}`, {
    method: request.method,
    body: normalizedBody,
    contentType: csvType,
  });
  // No body (204 from DELETE): NextResponse.json would throw on a 204.
  if (result.body === null)
    return new NextResponse(null, { status: result.status });
  return NextResponse.json(result.body, { status: result.status });
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
};
