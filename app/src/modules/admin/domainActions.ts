import type { Request, Response, Router } from 'express';
import { HttpError } from '../../lib/http.js';
import auth from '../auth/auth.routes.js';
import posts from '../posts/posts.routes.js';
import moderation from '../moderation/moderation.routes.js';
import guides from '../guides/guides.routes.js';
import resources from '../resources/resources.routes.js';
import cohorts from '../cohorts/cohorts.routes.js';
import content from '../content/content.routes.js';
import messages from '../messages/messages.routes.js';
import notifications from '../notifications/notifications.routes.js';

/** Reuse the exact authorized domain handlers; the caller supplies the shared database transaction. */
export async function invokeDomain(
  req: Request,
  router: Router,
  method: string,
  path: string,
  body: unknown,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = Object.create(req) as Request;
    Object.assign(child, {
      method,
      url: path,
      originalUrl: path,
      baseUrl: '',
      params: {},
      query: {},
      body,
      user: req.user,
    });
    let status = 200;
    const response = Object.create(req.res!) as Response;
    response.locals = { ...req.res?.locals };
    response.status = (code: number) => {
      status = code;
      return response;
    };
    response.json = (value: unknown) => {
      if (status >= 400)
        reject(
          new HttpError(
            status,
            (value as { error?: string })?.error || 'Domain action failed',
          ),
        );
      else resolve(value);
      return response;
    };
    child.res = response;
    try {
      router(child, response, (error?: unknown) =>
        reject(error || new HttpError(404, 'Domain operation not found')),
      );
    } catch (error) {
      reject(error);
    }
  });
}
export interface ActionField {
  name: string;
  label: string;
  type: 'text' | 'longtext' | 'number' | 'boolean' | 'date' | 'select' | 'json';
  required?: boolean;
  options?: string[];
}
export interface DomainAction {
  id: string;
  label: string;
  table: string;
  destructive: boolean;
  fields: ActionField[];
  execute: (req: Request, args: Record<string, unknown>) => Promise<unknown>;
}
const field = (
  name: string,
  type: ActionField['type'] = 'text',
  required = true,
  options?: string[],
): ActionField => ({
  name,
  label: name.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
  type,
  required,
  ...(options ? { options } : {}),
});
const id = (a: Record<string, unknown>, name = 'id') =>
  encodeURIComponent(String(a[name]));
function action(
  actionId: string,
  label: string,
  table: string,
  router: Router,
  method: string,
  path: (a: Record<string, unknown>) => string,
  fields: ActionField[],
  destructive = false,
  body?: (a: Record<string, unknown>) => unknown,
): DomainAction {
  return {
    id: actionId,
    label,
    table,
    fields,
    destructive,
    execute: (req, args) =>
      invokeDomain(req, router, method, path(args), body ? body(args) : args),
  };
}
export const domainActions: DomainAction[] = [
  action(
    'create-post',
    'Create discussion',
    'posts',
    posts,
    'POST',
    () => '/',
    [field('title'), field('content', 'longtext'), field('targetCohortId')],
  ),
  action(
    'edit-post',
    'Edit discussion',
    'posts',
    posts,
    'PUT',
    (a) => '/' + id(a),
    [
      field('id'),
      field('title', 'text', false),
      field('content', 'longtext', false),
      field('targetCohortId', 'text', false),
    ],
  ),
  action(
    'delete-post',
    'Delete discussion',
    'posts',
    posts,
    'DELETE',
    (a) => '/' + id(a),
    [field('id')],
    true,
  ),
  action(
    'create-comment',
    'Create reply',
    'comments',
    posts,
    'POST',
    (a) => '/' + id(a, 'postId') + '/comments',
    [
      field('postId'),
      field('content', 'longtext'),
      field('parentCommentId', 'text', false),
    ],
  ),
  action(
    'edit-comment',
    'Edit reply',
    'comments',
    posts,
    'PUT',
    (a) => '/' + id(a, 'postId') + '/comments/' + id(a),
    [field('postId'), field('id'), field('content', 'longtext')],
  ),
  action(
    'delete-comment',
    'Delete reply',
    'comments',
    posts,
    'DELETE',
    (a) => '/' + id(a, 'postId') + '/comments/' + id(a),
    [field('postId'), field('id')],
    true,
  ),
  ...(['POST', 'COMMENT'] as const).map((entityType) =>
    action(
      'moderate-' + entityType.toLowerCase(),
      'Moderate ' + entityType.toLowerCase(),
      entityType === 'POST' ? 'posts' : 'comments',
      moderation,
      'POST',
      () => '/action',
      [
        field('entityId'),
        field(
          'action',
          'select',
          true,
          entityType === 'POST'
            ? ['APPROVE', 'REJECT', 'CLINICAL_REDIRECT']
            : ['APPROVE', 'REJECT'],
        ),
        field('rejectionCode', 'text', false),
        field('rejectionMessage', 'longtext', false),
        field('sanitizedContent', 'longtext', false),
        field('condition', 'select', false, ['FTD', 'AD', 'BOTH']),
        field('assignedGroupIds', 'json', false),
      ],
      true,
      (a) => ({ ...a, entityType }),
    ),
  ),
  action(
    'close-post',
    'Close or reopen discussion',
    'posts',
    posts,
    'PUT',
    (a) => '/' + id(a) + '/close',
    [field('id'), field('isClosed', 'boolean')],
  ),
  action(
    'reply-policy',
    'Change reply moderation',
    'posts',
    posts,
    'PUT',
    (a) => '/' + id(a) + '/unmoderated-replies',
    [field('id'), field('allowUnmoderatedReplies', 'boolean')],
  ),
  action(
    'upvote-post',
    'Toggle your discussion upvote',
    'post_upvotes',
    posts,
    'POST',
    (a) => '/' + id(a) + '/upvote',
    [field('id')],
  ),
  action(
    'private-reply',
    'Send private discussion reply',
    'moderator_private_notes',
    posts,
    'POST',
    (a) => '/' + id(a, 'postId') + '/private-note',
    [
      field('postId'),
      field('message', 'longtext'),
      field('action', 'select', true, ['KEEP_PENDING', 'PUBLISH']),
    ],
  ),
  action(
    'private-message',
    'Send private message',
    'private_messages',
    messages,
    'POST',
    () => '/',
    [field('carePartnerId'), field('content', 'longtext')],
  ),
  action(
    'create-cohort',
    'Create community group',
    'cohorts',
    cohorts,
    'POST',
    () => '/',
    [
      field('name'),
      field('slug'),
      field('description', 'longtext'),
      field('geographicRegion'),
      field('radiusMiles', 'number', false),
      field('tag', 'text', false),
    ],
  ),
  action(
    'reassign-member',
    'Reassign primary community group',
    'cohort_members',
    cohorts,
    'POST',
    () => '/members/reassign',
    [field('userId'), field('newGroupId')],
    true,
  ),
  action(
    'create-invitation',
    'Send invitation',
    'invitations',
    auth,
    'POST',
    () => '/invitations',
    [
      field('email'),
      field('firstName', 'text', false),
      field('lastName', 'text', false),
      field('primaryCohortSlug'),
      field('condition', 'select', true, ['FTD', 'AD']),
      field('phoneNumber', 'text', false),
      field('clinicPatientId', 'text', false),
    ],
  ),
  action(
    'revoke-invitation',
    'Revoke invitation',
    'invitations',
    auth,
    'POST',
    (a) => '/invitations/' + id(a) + '/revoke',
    [field('id')],
    true,
  ),
  action(
    'create-resource',
    'Create linked resource',
    'resources',
    resources,
    'POST',
    () => '/',
    [
      field('title'),
      field('summary', 'longtext'),
      field('contentBody', 'longtext'),
      field('category'),
      field('diseaseDomain', 'select', true, ['FTD', 'AD', 'BOTH']),
      field('externalUrl'),
      field('keyTakeaways', 'json', false),
    ],
  ),
  action(
    'edit-resource',
    'Edit linked resource',
    'resources',
    resources,
    'PUT',
    (a) => '/' + id(a),
    [
      field('id'),
      field('title'),
      field('summary', 'longtext'),
      field('contentBody', 'longtext'),
      field('category'),
      field('diseaseDomain', 'select', true, ['FTD', 'AD', 'BOTH']),
      field('externalUrl'),
      field('keyTakeaways', 'json', false),
    ],
  ),
  action(
    'delete-resource',
    'Delete linked resource',
    'resources',
    resources,
    'DELETE',
    (a) => '/' + id(a),
    [field('id')],
    true,
  ),
  action(
    'create-update',
    'Create clinic update',
    'clinic_updates',
    content,
    'POST',
    () => '/updates',
    [
      field('title'),
      field('summary', 'longtext'),
      field('body', 'longtext'),
      field('category', 'select', true, [
        'CLINICAL_TRIAL',
        'MEDICATION',
        'RESEARCH',
        'ANNOUNCEMENT',
      ]),
      field('condition', 'select', true, ['FTD', 'AD', 'BOTH']),
      field('trialStatus', 'select', false, ['RECRUITING', 'CLOSED']),
      field('externalUrl', 'text', false),
    ],
  ),
  action(
    'delete-update',
    'Delete clinic update',
    'clinic_updates',
    content,
    'DELETE',
    (a) => '/updates/' + id(a),
    [field('id')],
    true,
  ),
  action(
    'create-event',
    'Create calendar event',
    'calendar_events',
    content,
    'POST',
    () => '/events',
    [
      field('title'),
      field('type', 'select', true, [
        'CARE_PARTNER_CONFERENCE',
        'SUPPORT_GROUP',
        'SOCIAL',
      ]),
      field('startsAt', 'date'),
      field('location'),
      field('description', 'longtext'),
      field('condition', 'select', false, ['FTD', 'AD', 'BOTH']),
    ],
  ),
  action(
    'delete-event',
    'Delete calendar event',
    'calendar_events',
    content,
    'DELETE',
    (a) => '/events/' + id(a),
    [field('id')],
    true,
  ),
  action(
    'create-guide',
    'Save guide document',
    'chatbot_guides',
    guides,
    'POST',
    () => '/',
    [
      field('title'),
      field('description', 'longtext'),
      field('condition', 'select', true, ['FTD', 'AD', 'GENERAL']),
      field('fileName'),
      field('pdfUrl', 'text', false),
      field('content', 'longtext', false),
      field('status', 'select', true, ['DRAFT', 'APPROVED']),
    ],
  ),
  action(
    'edit-guide',
    'Edit guide metadata',
    'chatbot_guides',
    guides,
    'PUT',
    (a) => '/' + id(a),
    [
      field('id'),
      field('title', 'text', false),
      field('description', 'longtext', false),
      field('category', 'text', false),
      field('publisher', 'text', false),
      field('year', 'text', false),
      field('topicTag', 'text', false),
      field('condition', 'select', false, ['FTD', 'AD', 'GENERAL']),
    ],
  ),
  action(
    'approve-guide',
    'Approve guide',
    'chatbot_guides',
    guides,
    'PATCH',
    (a) => '/' + id(a) + '/approve',
    [field('id')],
  ),
  action(
    'toggle-guide',
    'Publish or unpublish guide',
    'chatbot_guides',
    guides,
    'PATCH',
    (a) => '/' + id(a) + '/toggle',
    [field('id')],
    true,
  ),
  action(
    'delete-guide',
    'Delete guide',
    'chatbot_guides',
    guides,
    'DELETE',
    (a) => '/' + id(a),
    [field('id')],
    true,
  ),
  action(
    'mark-notification-read',
    'Mark your notification read',
    'notifications',
    notifications,
    'POST',
    (a) => '/' + id(a) + '/read',
    [field('id')],
  ),
];
export function validateAction(
  def: Pick<DomainAction, 'fields'>,
  input: Record<string, unknown>,
) {
  const values: Record<string, unknown> = {};
  if (
    Object.keys(input).some(
      (name) => !def.fields.some((field) => field.name === name),
    )
  )
    throw new HttpError(400, 'Unknown action field');
  for (const field of def.fields) {
    const value = input[field.name];
    if (value === undefined || value === '') {
      if (field.required)
        throw new HttpError(400, `${field.label} is required`);
      continue;
    }
    if (field.type === 'boolean' && typeof value !== 'boolean')
      throw new HttpError(400, `${field.label} must be a boolean`);
    if (
      field.type === 'number' &&
      (typeof value !== 'number' || !Number.isFinite(value))
    )
      throw new HttpError(400, `${field.label} must be a number`);
    if (
      ['text', 'longtext', 'date', 'select'].includes(field.type) &&
      (typeof value !== 'string' || value.length > 20000)
    )
      throw new HttpError(400, `${field.label} must be text`);
    if (field.options && !field.options.includes(String(value)))
      throw new HttpError(400, `Invalid ${field.label}`);
    values[field.name] = value;
  }
  return values;
}
export const actionField = field;
