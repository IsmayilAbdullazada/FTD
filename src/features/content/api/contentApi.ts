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
  authorId: string;
}

export const contentApi = {
  getResources(_userId: string): Promise<ClinicalResource[]> {
    return safeFetchJson('/api/v1/resources', undefined);
  },

  createResource(payload: CreateResourcePayload): Promise<ClinicalResource> {
    const { authorId: _authorId, ...requestPayload } = payload;
    return safeFetchJson('/api/v1/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });
  },

  async deleteResource(id: string): Promise<void> {
    await safeFetchJson(`/api/v1/resources/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  getUpdates(_userId: string): Promise<ClinicUpdate[]> {
    return safeFetchJson('/api/v1/updates', undefined);
  },

  createUpdate(
    payload: Omit<ClinicUpdate, 'id' | 'createdAt'>,
  ): Promise<ClinicUpdate> {
    const { authorId: _authorId, ...requestPayload } = payload;
    return safeFetchJson('/api/v1/updates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });
  },

  deleteUpdate(id: string, _userId: string): Promise<{ success: boolean }> {
    return safeFetchJson(`/api/v1/updates/${id}`, { method: 'DELETE' });
  },

  getEvents(_userId: string): Promise<CalendarEvent[]> {
    return safeFetchJson('/api/v1/events', undefined);
  },

  createEvent(
    payload: Omit<CalendarEvent, 'id' | 'authorId'>,
    authorId: string,
  ): Promise<CalendarEvent> {
    return safeFetchJson('/api/v1/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  deleteEvent(id: string, _userId: string): Promise<{ success: boolean }> {
    return safeFetchJson(`/api/v1/events/${id}`, { method: 'DELETE' });
  },
};
