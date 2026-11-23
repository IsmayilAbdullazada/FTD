const activity = (
  type: string,
  title: string,
  message: string,
  action = 'View discussion',
) => ({ type, title, message, action });
export const activities = {
  ADMIN_EMAIL_DELIVERY_FAILED: activity(
    'SYSTEM',
    'Email delivery needs attention',
    'An email could not be delivered after its available attempts. Review delivery details in the CS Admin console.',
    'Open system notifications',
  ),
  ADMIN_ACCOUNT_SECURITY: activity(
    'SYSTEM',
    'Staff account security update',
    'A staff account had a security event. Review the account activity in the CS Admin console.',
    'Review account activity',
  ),
  ADMIN_CONSOLE_ACTION: activity(
    'SYSTEM',
    'An administrator changed application data',
    'Another administrator completed a destructive console action. Review its audit entry.',
    'Review audit log',
  ),
  ADMIN_GUIDE_PUBLISHED: activity(
    'SYSTEM',
    'Guide publication changed',
    'A guide was approved or unpublished. Review its current publication status.',
    'Open Guides',
  ),
  ADMIN_USER_ACTIVITY: activity(
    'SYSTEM',
    'A care partner joined the community',
    'A new care partner completed registration. Review account activity in the CS Admin console.',
    'Review account activity',
  ),
  CLINICAL_FOLLOWUP_REQUIRED: activity(
    'MODERATION',
    'Clinical follow-up requested',
    'A discussion needs follow-up from the moderation team. Please sign in to review it.',
    'Open moderation dashboard',
  ),
  POST_SUBMITTED: activity(
    'ACTIVITY',
    'We received your discussion',
    'Thank you for sharing with the community. Your discussion has been submitted to the moderation team for review.',
  ),
  REPLY_SUBMITTED: activity(
    'ACTIVITY',
    'We received your reply',
    'Thank you for contributing. Your reply has been submitted for review and will be visible to the community once approved.',
  ),
  POST_REVIEW_REQUIRED: activity(
    'MODERATION',
    'A discussion is ready for review',
    'A care partner has submitted or updated a discussion. Please sign in to review it when you are available.',
    'Open moderation dashboard',
  ),
  REPLY_REVIEW_REQUIRED: activity(
    'MODERATION',
    'A reply is ready for review',
    'A community reply has been submitted or updated. Please sign in to review it before it is published.',
    'Open moderation dashboard',
  ),
  POST_APPROVED: activity(
    'APPROVAL',
    'Your discussion has been published',
    'The moderation team has reviewed and approved your discussion. It is now available to its community.',
  ),
  REPLY_APPROVED: activity(
    'APPROVAL',
    'Your reply has been approved',
    'The moderation team has reviewed and approved your reply. Thank you for contributing to the conversation.',
  ),
  POST_NOT_PUBLISHED: activity(
    'REJECTION',
    'An update on your discussion',
    'The moderation team has reviewed your discussion and has not published it. Please sign in to read their feedback.',
    'View your submissions',
  ),
  REPLY_NOT_PUBLISHED: activity(
    'REJECTION',
    'An update on your reply',
    'The moderation team has reviewed your reply and has not published it. Please sign in to read their feedback.',
    'View your submissions',
  ),
  POST_CLINICAL_FOLLOWUP: activity(
    'CLINICAL_ESCALATION',
    'Your discussion needs clinical follow-up',
    'The moderation team has reviewed your discussion and recommends contacting your clinical care team through your usual channel. Please sign in to review their feedback.',
    'View your submissions',
  ),
  POST_REPLY: activity(
    'ACTIVITY',
    'There is a new reply to your discussion',
    'A new reply is available in a discussion you started. Sign in to read it and continue the conversation.',
  ),
  REPLY_RESPONSE: activity(
    'ACTIVITY',
    'Someone has replied to your comment',
    'A new response to your reply is available. Sign in to read it and continue the conversation.',
  ),
  POST_UPDATED: activity(
    'ACTIVITY',
    'Your discussion has been updated',
    'A moderator has updated your discussion. Please sign in to review the changes.',
    'View your submissions',
  ),
  REPLY_UPDATED: activity(
    'ACTIVITY',
    'Your reply has been updated',
    'A moderator has updated your reply. Please sign in to review the changes.',
    'View your submissions',
  ),
  POST_CLOSED: activity(
    'ACTIVITY',
    'Your discussion has been closed',
    'A moderator has closed your discussion to new replies. Please sign in to review the discussion.',
  ),
  POST_REOPENED: activity(
    'ACTIVITY',
    'Your discussion has been reopened',
    'A moderator has reopened your discussion. Community members can reply again.',
  ),
  POST_REMOVED: activity(
    'ACTIVITY',
    'Your discussion has been removed',
    'A moderator has removed your discussion. If you have questions, please contact your care team through your usual contact channel.',
    'Open Care Partner Connect',
  ),
  REPLY_REMOVED: activity(
    'ACTIVITY',
    'Your reply has been removed',
    'A moderator has removed your reply. If you have questions, please contact your care team through your usual contact channel.',
    'Open Care Partner Connect',
  ),
  REPLY_POLICY_CHANGED: activity(
    'ACTIVITY',
    'Reply settings have changed for your discussion',
    'A moderator has changed how replies are reviewed in your discussion. Please sign in to see the current settings.',
  ),
  PRIVATE_REPLY: activity(
    'DIRECT_CHAT',
    'You have a private discussion reply',
    'A private reply is available in a discussion you are part of. Please sign in to read it and respond.',
  ),
  PRIVATE_MESSAGE: activity(
    'DIRECT_CHAT',
    'You have a new private message',
    'A new private message is available for your account. Please sign in to Care Partner Connect for more information.',
    'Open Care Partner Connect',
  ),
  COHORT_CHANGED: activity(
    'ACTIVITY',
    'Your community group has been updated',
    'Your care team has updated your primary community group. Sign in to see your current group and its discussions.',
    'View your community',
  ),
  WELCOME: activity(
    'ACTIVITY',
    'Welcome to Care Partner Connect',
    'Your account is ready. We are glad you are here. Sign in to connect with your community and explore the available resources.',
    'Open Care Partner Connect',
  ),
  INVITATION_ACCEPTED: activity(
    'ACTIVITY',
    'Your invitation has been accepted',
    'An invited care partner has completed registration. Sign in to view your community membership.',
    'Open moderation dashboard',
  ),
  PASSWORD_CHANGED: activity(
    'SECURITY',
    'Your Care Partner Connect password was changed',
    'Your password has been updated and existing sessions have been signed out. If you did not make this change, reset your password immediately and contact your care team through your usual contact channel.',
    'Review account access',
  ),
  GUIDE_REVIEW_REQUIRED: activity(
    'MODERATION',
    'A guide is ready for review',
    'A new draft guide has been saved. Please sign in to review it before it is made available to care partners.',
    'Open moderation dashboard',
  ),
  GUIDE_APPROVED: activity(
    'APPROVAL',
    'Your guide has been approved',
    'Your guide has been reviewed and approved. Sign in to review its publication details.',
    'Open moderation dashboard',
  ),
} as const;
export type ActivityKind = keyof typeof activities;
export interface ActivityContext {
  userId?: string;
  action?: string;
  emailId?: string;
  auditId?: string;
  postId?: string;
  commentId?: string;
  guideId?: string;
}
