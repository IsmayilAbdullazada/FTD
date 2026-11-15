import { safeFetchJson } from '@/shared/api/httpClient';

import {
  Audience,
  CalendarEvent,
  ClinicalResource,
  ClinicUpdate,
} from '@/types';

interface CreateResourcePayload {
  title: string;
  category: ClinicalResource['category'];
  summary: string;
  contentBody: string;
  diseaseDomain?: Audience;
  externalUrl?: string;
  fileAttachmentUrl?: string;
  additionalLinks?: { label: string; url: string }[];
  keyTakeaways?: string[];
}

export const contentApi = {
  getResources(): Promise<ClinicalResource[]> {
    return safeFetchJson('/api/v1/resources', undefined);
  },

  createResource(payload: CreateResourcePayload): Promise<ClinicalResource> {
    return safeFetchJson('/api/v1/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async deleteResource(id: string): Promise<void> {
    await safeFetchJson(`/api/v1/resources/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  getUpdates(): Promise<ClinicUpdate[]> {
    return safeFetchJson('/api/v1/updates', undefined);
  },

  createUpdate(
    payload: Omit<ClinicUpdate, 'id' | 'createdAt' | 'authorId'>,
  ): Promise<ClinicUpdate> {
    return safeFetchJson('/api/v1/updates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  deleteUpdate(id: string): Promise<{ success: boolean }> {
    return safeFetchJson(`/api/v1/updates/${id}`, { method: 'DELETE' });
  },

  getEvents(): Promise<CalendarEvent[]> {
    return safeFetchJson('/api/v1/events', undefined);
  },

  createEvent(
    payload: Omit<CalendarEvent, 'id' | 'authorId'>,
  ): Promise<CalendarEvent> {
    return safeFetchJson('/api/v1/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  deleteEvent(id: string): Promise<{ success: boolean }> {
    return safeFetchJson(`/api/v1/events/${id}`, { method: 'DELETE' });
  },
};
