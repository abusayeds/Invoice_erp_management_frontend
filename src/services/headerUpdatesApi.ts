import { api } from "@/lib/api/client";
import { LIST_PAGE_SIZE } from "@/components/ui/ListSidebarFooter";
import type { TPartyPagination } from "./customerTypes";

export type HeaderUpdate = {
  _id: string;
  title: string;
  description?: string;
  createdAt?: string;
  start_date?: string;
  actor_id?: { name?: string } | string | null;
};

export type HeaderUpdatesPage = {
  rows: HeaderUpdate[];
  pagination: TPartyPagination;
};

// Activities and HRM announcements have no notification read/unread fields.
// Keep their existing API contracts; never treat totalData as an unread count.
export async function fetchHeaderUpdates(
  tab: "notifications" | "announcements",
  page: number,
  signal?: AbortSignal,
): Promise<HeaderUpdatesPage> {
  const response = await api.raw.get(
    tab === "notifications" ? "/activities/all" : "/hrm/announcements",
    {
      params: {
        page,
        limit: LIST_PAGE_SIZE,
        sort: "-createdAt",
        ...(tab === "announcements" ? { status: "active" } : {}),
      },
      signal,
      skipGlobalLoading: true,
    },
  );
  const body = response.data;
  if (!Array.isArray(body?.data) || !body?.pagination) {
    throw new Error("Unable to load updates. Please try again.");
  }
  return { rows: body.data, pagination: body.pagination };
}
