/**
 * Asana API helpers using Personal Access Token.
 * Base URL: https://app.asana.com/api/1.0
 */

const ASANA_BASE = "https://app.asana.com/api/1.0";

async function asanaFetch(
  accessToken: string,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${ASANA_BASE}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export type AsanaWorkspace = { gid: string; name: string };

export async function getWorkspaces(accessToken: string): Promise<AsanaWorkspace[]> {
  const res = await asanaFetch(accessToken, "/workspaces");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { errors?: Array<{ message?: string }> })?.errors?.[0]?.message ?? "Failed to fetch workspaces");
  }
  const data = (await res.json()) as { data: Array<{ gid: string; name: string }> };
  return data.data.map((w) => ({ gid: w.gid, name: w.name }));
}

export async function getMe(accessToken: string): Promise<{ gid: string }> {
  const res = await asanaFetch(accessToken, "/users/me");
  if (!res.ok) throw new Error("Failed to fetch Asana user");
  const data = (await res.json()) as { data: { gid: string } };
  return { gid: data.data.gid };
}

export type AsanaTaskNormalized = {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string | null;
  source: "asana";
};

export async function getTasks(
  accessToken: string,
  workspaceGid: string
): Promise<AsanaTaskNormalized[]> {
  const user = await getMe(accessToken);
  const all: AsanaTaskNormalized[] = [];
  let offset: string | undefined;
  const optFields = "gid,name,due_on,completed";

  do {
    const params = new URLSearchParams({
      assignee: user.gid,
      workspace: workspaceGid,
      opt_fields: optFields,
      limit: "100",
    });
    if (offset) params.set("offset", offset);
    const res = await asanaFetch(accessToken, `/tasks?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { errors?: Array<{ message?: string }> })?.errors?.[0]?.message ?? "Failed to fetch Asana tasks");
    }
    const data = (await res.json()) as {
      data: Array<{ gid: string; name: string; due_on: string | null; completed: boolean }>;
      next_page?: { offset: string } | null;
    };
    for (const t of data.data) {
      all.push({
        id: `asana-${t.gid}`,
        title: t.name ?? "",
        completed: t.completed ?? false,
        dueDate: t.due_on ? `${t.due_on}T12:00:00.000Z` : null,
        source: "asana",
      });
    }
    offset = data.next_page?.offset ?? undefined;
  } while (offset);

  return all;
}

export async function updateTaskCompleted(
  accessToken: string,
  taskGid: string,
  completed: boolean
): Promise<void> {
  const res = await asanaFetch(accessToken, `/tasks/${taskGid}`, {
    method: "PUT",
    body: JSON.stringify({ data: { completed } }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { errors?: Array<{ message?: string }> })?.errors?.[0]?.message ?? "Failed to update Asana task");
  }
}
