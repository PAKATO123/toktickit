import { Requester } from "./types/requester";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
  description?: string | null;
}

export async function getRequesters(): Promise<Requester[]> {
  const res = await fetch(`${API_BASE_URL}/api/requesters`);
  if (!res.ok) {
    throw new Error("Unable to load Development Requesters.");
  }
  const json = await res.json();
  return json.data || [];
}

export async function getRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_BASE_URL}/api/related-systems`);
  if (!res.ok) {
    throw new Error("Unable to load Related Systems.");
  }
  const json = await res.json();
  return json.data || [];
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE_URL}/api/categories`);
  if (!res.ok) {
    throw new Error("Unable to load Categories.");
  }
  const json = await res.json();
  return json.data || [];
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
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
  attachments: AttachmentMeta[];
}

export async function getTicketDetail(id: number | string, requesterId: number): Promise<TicketDetailData> {
  const res = await fetch(`${API_BASE_URL}/api/tickets/${id}?requesterId=${requesterId}`);
  const json = await res.json();
  if (!res.ok) {
    const error: any = new Error(json.error?.message || "Unable to load ticket detail.");
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

export function getAttachmentDownloadUrl(attachmentId: number, requesterId: number): string {
  return `${API_BASE_URL}/api/attachments/${attachmentId}/download?requesterId=${requesterId}`;
}

export function getAttachmentPreviewUrl(attachmentId: number, requesterId: number): string {
  return `${API_BASE_URL}/api/attachments/${attachmentId}/preview?requesterId=${requesterId}`;
}
