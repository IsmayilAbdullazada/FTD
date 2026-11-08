import { safeFetchJson } from '@/shared/api/httpClient';
import { contentFallbackStore } from '@/shared/dev/devFallbackStore';
import { Audience, CalendarEvent, ClinicalResource, ClinicUpdate } from '@/types';

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
    return safeFetchJson('/api/v1/resources', undefined, () => [
      ...contentFallbackStore.resources,
    ]);
  },

  createResource(payload: CreateResourcePayload): Promise<ClinicalResource> {
    const { authorId: _authorId, ...requestPayload } = payload;
    return safeFetchJson(
      '/api/v1/resources',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      },
      () => {
        const resource: ClinicalResource = {
          id: `res-${Date.now()}`,
          title: payload.title,
          category: payload.category || 'BEHAVIORAL_AGITATION',
          summary: payload.summary,
          contentBody: payload.contentBody,
          diseaseDomain: payload.diseaseDomain || 'FTD',
          externalUrl: payload.externalUrl || '',
          fileAttachmentUrl: payload.fileAttachmentUrl || '',
          additionalLinks: payload.additionalLinks || [],
          keyTakeaways: payload.keyTakeaways || [],
          createdAt: new Date().toISOString(),
        };
        contentFallbackStore.resources.unshift(resource);
        return resource;
      },
    );
  },

  async deleteResource(id: string): Promise<void> {
    await safeFetchJson(
      `/api/v1/resources/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      () => {
        const index = contentFallbackStore.resources.findIndex(
          (resource) => resource.id === id,
        );
        if (index !== -1) contentFallbackStore.resources.splice(index, 1);
        return undefined;
      },
    );
  },

  getUpdates(_userId: string): Promise<ClinicUpdate[]> {
    return safeFetchJson('/api/v1/updates', undefined, () => [
      ...contentFallbackStore.updates,
    ]);
  },

  createUpdate(
    payload: Omit<ClinicUpdate, 'id' | 'createdAt'>,
  ): Promise<ClinicUpdate> {
    const { authorId: _authorId, ...requestPayload } = payload;
    return safeFetchJson(
      '/api/v1/updates',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      },
      () => {
        const update: ClinicUpdate = {
          id: `upd-${Date.now()}`,
          ...payload,
          createdAt: new Date().toISOString(),
        };
        contentFallbackStore.updates.unshift(update);
        return update;
      },
    );
  },

  deleteUpdate(id: string, _userId: string): Promise<{ success: boolean }> {
    return safeFetchJson(`/api/v1/updates/${id}`, { method: 'DELETE' }, () => {
      contentFallbackStore.updates = contentFallbackStore.updates.filter(
        (update) => update.id !== id,
      );
      return { success: true };
    });
  },

  getEvents(_userId: string): Promise<CalendarEvent[]> {
    return safeFetchJson('/api/v1/events', undefined, () => [
      ...contentFallbackStore.events,
    ]);
  },

  createEvent(
    payload: Omit<CalendarEvent, 'id' | 'authorId'>,
    authorId: string,
  ): Promise<CalendarEvent> {
    return safeFetchJson(
      '/api/v1/events',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      () => {
        const event = {
          id: `evt-${Date.now()}`,
          ...payload,
          authorId,
        } as CalendarEvent;
        contentFallbackStore.events.push(event);
        return event;
      },
    );
  },

  deleteEvent(id: string, _userId: string): Promise<{ success: boolean }> {
    return safeFetchJson(`/api/v1/events/${id}`, { method: 'DELETE' }, () => {
      contentFallbackStore.events = contentFallbackStore.events.filter(
        (event) => event.id !== id,
      );
      return { success: true };
    });
  },
};
