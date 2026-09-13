import { Requester } from "./types/requester";
import { SessionUser, LoginCredentials, ChangePasswordPayload } from "./types/auth";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
  description?: string | null;
}

// ---------------------------------------------------------------------------
// Authentication & Session API Calls
// ---------------------------------------------------------------------------

export async function loginApi(credentials: LoginCredentials): Promise<{ user: SessionUser }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) {
    const error: any = new Error(json.error?.message || "Invalid credentials.");
    error.status = res.status;
    error.code = json.error?.code;
    throw error;
  }
  return json;
}

export async function logoutApi(): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error?.message || "Logout failed.");
  }
}

export async function getMeApi(): Promise<{ user: SessionUser }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: "GET",
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) {
    const error: any = new Error(json.error?.message || "Not authenticated.");
    error.status = res.status;
    error.code = json.error?.code;
    throw error;
  }
  return json;
}

export async function changePasswordApi(payload: ChangePasswordPayload): Promise<{ user: SessionUser; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) {
    const error: any = new Error(json.error?.message || "Unable to change password.");
    error.status = res.status;
    error.code = json.error?.code;
    throw error;
  }
  return json;
}

// ---------------------------------------------------------------------------
// Reference Data & Ticket APIs
// ---------------------------------------------------------------------------

export async function getRequesters(): Promise<Requester[]> {
  const res = await fetch(`${API_BASE_URL}/api/requesters`, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Unable to load Development Requesters.");
  }
  const json = await res.json();
  return json.data || [];
}

export async function getRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_BASE_URL}/api/related-systems`, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Unable to load Related Systems.");
  }
  const json = await res.json();
  return json.data || [];
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE_URL}/api/categories`, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Unable to load Categories.");
  }
  const json = await res.json();
  return json.data || [];
}

export async function getNextTicketNumber(): Promise<string> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/tickets/next-number`, { credentials: "include" });
    if (!res.ok) return "TICK-2026-XXXX";
    const json = await res.json();
    return json.data?.nextTicketNumber || "TICK-2026-XXXX";
  } catch {
    return "TICK-2026-XXXX";
  }
}

export interface AttachmentMeta {
  id: number;
  fileName: string;
  contentType: string;
  fileSize: number;
  isDeleted?: boolean;
  removalReason?: string | null;
  deletedAt?: string | null;
  createdAt: string;
}

export interface TicketDetailData {
  id: number;
  ticketNumber: string;
  requesterId: number;
  requester?: Requester;
  category: Category;
  relatedSystem: RelatedSystem;
  summary: string;
  description: string;
  requestedPriority: string | null;
  itPriority?: string | null;
  currentStatus: string;
  isRequesterResolved?: boolean;
  assignedTo?: { id: number; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
  attachments: AttachmentMeta[];
}

export async function getTicketDetail(id: number | string, requesterId?: number): Promise<TicketDetailData> {
  const query = requesterId ? `?requesterId=${requesterId}` : "";
  const res = await fetch(`${API_BASE_URL}/api/tickets/${id}${query}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) {
    const error: any = new Error(json.error?.message || "Unable to load ticket detail.");
    error.status = res.status;
    error.code = json.error?.code;
    throw error;
  }
  return json.data;
}

export async function requestResolutionIndication(ticketId: number): Promise<TicketDetailData> {
  const res = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/resolve-indication`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) {
    const error: any = new Error(json.error?.message || "Unable to request resolution.");
    error.status = res.status;
    error.code = json.error?.code;
    throw error;
  }
  return json.data;
}

export async function addAttachmentToTicket(ticketId: number, requesterId: number, file: File): Promise<AttachmentMeta> {
  const formData = new FormData();
  formData.append("requesterId", String(requesterId));
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) {
    const error: any = new Error(json.error?.message || "Unable to add attachment.");
    error.status = res.status;
    error.code = json.error?.code;
    throw error;
  }
  return json.data;
}

export async function deleteAttachment(attachmentId: number, requesterId: number, reason: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/attachments/${attachmentId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requesterId, reason }),
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) {
    const error: any = new Error(json.error?.message || "Unable to remove attachment.");
    error.status = res.status;
    error.code = json.error?.code;
    throw error;
  }
  return json.data;
}

export function getAttachmentDownloadUrl(attachmentId: number, requesterId?: number): string {
  const query = requesterId ? `?requesterId=${requesterId}` : "";
  return `${API_BASE_URL}/api/attachments/${attachmentId}/download${query}`;
}

export function getAttachmentPreviewUrl(attachmentId: number, requesterId?: number): string {
  const query = requesterId ? `?requesterId=${requesterId}` : "";
  return `${API_BASE_URL}/api/attachments/${attachmentId}/preview${query}`;
}
