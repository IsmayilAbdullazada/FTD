import { ExternalLink, FileText, Link as LinkIcon } from 'lucide-react';
import { AudienceBadge } from '@/shared/components/AudienceBadge';
import { Button } from '@/shared/components/Button';
import type { ClinicalResource } from '@/types';
import { guideTopicLabel } from '../lib/guideTopics';
import { guideCardDescription } from '../lib/guideDescription';
import { GuideCardMenu } from './GuideCardMenu';
interface Props {
  resource: ClinicalResource;
  staff: boolean;
  busy?: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onApprove: () => void;
  onToggle: () => void;
  onDelete: () => void;
}
function domain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return 'Source';
  }
}
export function GuideCard({
  resource,
  staff,
  busy,
  onOpen,
  ...actions
}: Props) {
  const draft = resource.source === 'guide' && resource.status === 'DRAFT';
  const unpublished =
    resource.source === 'guide' &&
    resource.status === 'APPROVED' &&
    resource.isActive === false;
  const topic = guideTopicLabel(resource.category);
  return (
    <article
      data-guide-card={resource.id}
      className={`flex h-full min-w-0 flex-col rounded-2xl border bg-white p-5 text-left dark:bg-slate-900 sm:p-6 ${unpublished ? 'border-dashed border-slate-400 dark:border-slate-500' : 'border-slate-200 dark:border-slate-700'}`}
    >
      <div
        data-guide-header
        className="grid h-20 shrink-0 grid-cols-[minmax(0,1fr)_auto_44px] items-start gap-x-2"
      >
        <div className="min-w-0">
          <div className="mb-1.5 flex h-8 items-start text-xs font-semibold leading-4 text-[#002D72] dark:text-blue-300">
            {topic && <span>{topic}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <AudienceBadge condition={resource.diseaseDomain} />
            {staff && (draft || unpublished) && (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${draft ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200' : 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'}`}
              >
                {draft ? 'Draft' : 'Unpublished'}
              </span>
            )}
          </div>
        </div>
        <time
          dateTime={resource.createdAt}
          className="pt-3 text-xs leading-5 text-slate-600 dark:text-slate-400"
        >
          {new Date(resource.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </time>
        {staff ? (
          <GuideCardMenu resource={resource} disabled={busy} {...actions} />
        ) : (
          <span aria-hidden="true" className="h-11 w-11" />
        )}
      </div>
      <h3 className="mb-3 min-h-14 break-words font-serif text-xl font-semibold leading-7 text-slate-900 dark:text-white">
        {resource.title}
      </h3>
      <p
        data-guide-summary
        className="mb-5 min-h-[4.5rem] whitespace-normal break-words text-sm leading-6 text-slate-600 dark:text-slate-300"
      >
        {guideCardDescription({
          description: resource.summary,
          content: resource.contentBody,
          title: resource.title,
        })}
      </p>
      <div
        data-guide-footer
        className="mt-auto flex min-h-[61px] items-center justify-between gap-2 border-t border-slate-200 pt-4 dark:border-slate-700"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          {resource.fileAttachmentUrl && (
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-4 w-4 shrink-0" />
              PDF
            </span>
          )}
          {resource.externalUrl && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <ExternalLink className="h-4 w-4 shrink-0" />
              <span className="break-all">
                Website: {domain(resource.externalUrl)}
              </span>
            </span>
          )}
          {Boolean(resource.additionalLinks?.length) && (
            <span className="inline-flex items-center gap-1.5">
              <LinkIcon className="h-4 w-4 shrink-0" />+
              {resource.additionalLinks!.length} more links
            </span>
          )}
        </div>
        {staff && draft && (
          <Button variant="primary" disabled={busy} onClick={actions.onApprove}>
            Approve
          </Button>
        )}
        <Button
          variant="ghost"
          className="shrink-0 px-2"
          aria-label={`View guide: ${resource.title}`}
          onClick={onOpen}
        >
          View guide →
        </Button>
      </div>
    </article>
  );
}
