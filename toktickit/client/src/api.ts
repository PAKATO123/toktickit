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
