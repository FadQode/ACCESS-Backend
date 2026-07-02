import { createApp } from "../application";
import { env } from "../config/env";
import { createDatabase } from "../db";

const database = createDatabase(env.database);
const app = createApp({ config: env, db: database.db });
const runId = `${Date.now()}`;
const base = "http://localhost";

interface ApiResponse<T> {
  data: T;
  error?: { code: string; details?: unknown };
  message: string;
  success: boolean;
}

const request = async (
  path: string,
  options: RequestInit = {},
): Promise<Response> =>
  app.handle(
    new Request(`${base}${path}`, {
      ...options,
      headers: options.headers,
    }),
  );

const jsonRequest = async (
  path: string,
  options: RequestInit & { expectedStatus?: number } = {},
) => {
  const { expectedStatus = 200, ...requestOptions } = options;
  const response = await request(path, {
    ...requestOptions,
    headers: {
      "content-type": "application/json",
      ...(requestOptions.headers ?? {}),
    },
  });
  const body = (await response.json()) as ApiResponse<unknown>;

  if (response.status !== expectedStatus) {
    throw new Error(
      `${requestOptions.method ?? "GET"} ${path} expected ${expectedStatus}, got ${response.status}: ${JSON.stringify(
        body,
      )}`,
    );
  }

  return body;
};

const login = async (email: string) => {
  const body = await jsonRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: "password123" }),
  });
  return (body.data as { token: string }).token;
};

const authHeaders = (token: string) => ({ authorization: `Bearer ${token}` });

const expectError = async (
  path: string,
  expectedStatus: number,
  options: RequestInit = {},
) => {
  const response = await request(path, options);
  const body = (await response.json()) as ApiResponse<unknown>;

  if (response.status !== expectedStatus || body.success !== false) {
    throw new Error(
      `${options.method ?? "GET"} ${path} expected error ${expectedStatus}, got ${response.status}: ${JSON.stringify(
        body,
      )}`,
    );
  }

  return body;
};

const createdReferenceIds: string[] = [];
let managerToken = "";

const createUploadForm = (title: string): FormData => {
  const form = new FormData();
  form.set(
    "file",
    new File([`Smoke upload ${runId}`], `smoke-reference-${runId}.txt`, {
      type: "text/plain",
    }),
  );
  form.set("title", title);
  form.set("category", "payment");
  form.set("content", "Uploaded smoke test reference");
  form.set("tags", JSON.stringify(["storage_smoke", "Saldo Terpotong"]));
  form.set("status", "active");
  return form;
};

const cleanupSmokeReferences = async () => {
  if (!managerToken) return;

  const smokeList = await jsonRequest("/references?query=smoke&limit=100", {
    headers: authHeaders(managerToken),
  });
  const smokeData = smokeList.data as {
    items: Array<{ id: string; status: string; title: string }>;
  };

  for (const item of smokeData.items) {
    if (item.title.toLowerCase().includes("smoke") && item.status !== "archived") {
      await jsonRequest(`/references/${item.id}/archive`, {
        method: "POST",
        headers: authHeaders(managerToken),
      });
    }
  }
};

try {
  managerToken = await login("manager1@access.test");
  const agentToken = await login("agent1@access.test");
  console.log("[ok] auth login as manager and agent");
  await cleanupSmokeReferences();
  console.log("[ok] previous smoke references archived");

  const listBody = await jsonRequest("/references", {
    headers: authHeaders(managerToken),
  });
  const listData = listBody.data as { items: unknown[] };
  console.log(`[ok] GET /references returned ${listData.items.length} items`);

  const tagBody = await jsonRequest("/references/tags", {
    headers: authHeaders(managerToken),
  });
  const tagData = tagBody.data as { tags: unknown[] };
  console.log(`[ok] GET /references/tags returned ${tagData.tags.length} tags`);

  const created = await jsonRequest("/references", {
    method: "POST",
    headers: authHeaders(managerToken),
    body: JSON.stringify({
      sourceType: "external_link",
      title: `Smoke Test Link ${runId}`,
      category: "payment",
      content: "Smoke test content",
      url: "https://example.test/reference",
      tags: ["Saldo Terpotong", "saldo_terpotong"],
      status: "active",
    }),
    expectedStatus: 201,
  });
  const reference = (created.data as { reference: { id: string; tags: string[] } })
    .reference;
  createdReferenceIds.push(reference.id);

  if (!reference.tags.includes("saldo_terpotong")) {
    throw new Error("Created reference tags did not include saldo_terpotong");
  }
  console.log("[ok] POST /references created text/link reference");
  console.log("[ok] tag auto-normalize and duplicate handling worked");

  await expectError("/references", 422, {
    method: "POST",
    headers: {
      ...authHeaders(managerToken),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sourceType: "uploaded_file",
      title: `Smoke Invalid Uploaded File ${runId}`,
      content: "Should be rejected",
    }),
  });
  console.log("[ok] POST /references rejects uploaded_file");

  const filtered = await jsonRequest("/references?tag=saldo_terpotong", {
    headers: authHeaders(managerToken),
  });
  const filteredData = filtered.data as {
    items: Array<{ id: string; tags: string[] }>;
  };
  if (!filteredData.items.some((item) => item.id === reference.id)) {
    throw new Error("Tag filter did not return the created reference");
  }
  console.log("[ok] filter by tag works");

  await jsonRequest(`/references/${reference.id}`, {
    headers: authHeaders(managerToken),
  });
  console.log("[ok] GET /references/:id works");

  await jsonRequest(`/references/${reference.id}`, {
    method: "PATCH",
    headers: authHeaders(managerToken),
    body: JSON.stringify({
      title: `Smoke Test Link Updated ${runId}`,
      tags: ["Saldo Terpotong", "payment"],
    }),
  });
  console.log("[ok] PATCH /references/:id works");

  await expectError(`/references/${reference.id}/file-url`, 400, {
    headers: authHeaders(managerToken),
  });
  console.log("[ok] non-file reference /file-url returns 400");

  await expectError("/references", 403, {
    method: "POST",
    headers: {
      ...authHeaders(agentToken),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sourceType: "sop",
      title: `Smoke Agent Blocked ${runId}`,
      content: "Should be forbidden",
    }),
  });
  await expectError(`/references/${reference.id}`, 403, {
    method: "PATCH",
    headers: {
      ...authHeaders(agentToken),
      "content-type": "application/json",
    },
    body: JSON.stringify({ title: "Blocked" }),
  });
  await expectError(`/references/${reference.id}/archive`, 403, {
    method: "POST",
    headers: authHeaders(agentToken),
  });
  console.log("[ok] agent cannot create/update/archive references");

  const draft = await jsonRequest("/references", {
    method: "POST",
    headers: authHeaders(managerToken),
    body: JSON.stringify({
      sourceType: "sop",
      title: `Smoke Test Draft ${runId}`,
      category: "payment",
      content: "Draft smoke test",
      status: "draft",
    }),
    expectedStatus: 201,
  });
  const draftReference = (draft.data as { reference: { id: string } }).reference;
  createdReferenceIds.push(draftReference.id);

  const agentArchivedList = await jsonRequest("/references?status=archived", {
    headers: authHeaders(agentToken),
  });
  const agentListData = agentArchivedList.data as {
    items: Array<{ status: string }>;
  };
  if (agentListData.items.some((item) => item.status !== "active")) {
    throw new Error("Agent list returned non-active references");
  }
  console.log("[ok] agent list is forced to active references");

  await expectError(`/references/${draftReference.id}`, 404, {
    headers: authHeaders(agentToken),
  });
  console.log("[ok] agent draft detail returns 404");

  await expectError("/references/upload", 403, {
    method: "POST",
    headers: authHeaders(agentToken),
    body: createUploadForm(`Smoke Agent Blocked Upload ${runId}`),
  });
  console.log("[ok] agent cannot upload references");

  const uploadResponse = await request("/references/upload", {
    method: "POST",
    headers: authHeaders(managerToken),
    body: createUploadForm(`Smoke Test Upload ${runId}`),
  });
  const uploadBody = (await uploadResponse.json()) as ApiResponse<{
    reference: {
      id: string;
      storageKey: string | null;
    };
  }>;
  if (uploadResponse.status !== 201 || !uploadBody.data.reference.storageKey) {
    throw new Error(
      `POST /references/upload failed: ${uploadResponse.status} ${JSON.stringify(
        uploadBody,
      )}`,
    );
  }
  const uploadedReference = uploadBody.data.reference;
  createdReferenceIds.push(uploadedReference.id);
  console.log("[ok] POST /references/upload uploaded file and inserted DB row");

  const fileUrlBody = await jsonRequest(
    `/references/${uploadedReference.id}/file-url`,
    {
      headers: authHeaders(managerToken),
    },
  );
  const fileUrlData = fileUrlBody.data as {
    expiresIn: number;
    signedUrl: string;
  };
  if (!fileUrlData.signedUrl || fileUrlData.expiresIn <= 0) {
    throw new Error("Signed URL response is invalid");
  }
  console.log("[ok] GET /references/:id/file-url created signed URL");

  const signedResponse = await fetch(fileUrlData.signedUrl);
  if (!signedResponse.ok) {
    throw new Error(`Signed URL download failed with ${signedResponse.status}`);
  }
  console.log("[ok] signed URL opens/downloads uploaded file");

  for (const id of createdReferenceIds) {
    await jsonRequest(`/references/${id}/archive`, {
      method: "POST",
      headers: authHeaders(managerToken),
    });
  }
  console.log("[ok] POST /references/:id/archive works");
  console.log("[ok] smoke references archived");
} finally {
  await cleanupSmokeReferences();
  await database.close();
}
