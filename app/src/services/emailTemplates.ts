export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );
}

export function composeEmail(input: {
  subject: string;
  paragraphs: string[];
  action: { label: string; url: string };
  greeting?: string;
}) {
  const greeting = input.greeting ?? 'Hello,';
  const { label, url } = input.action;
  if (!['https:', 'http:'].includes(new URL(url).protocol))
    throw new Error('Email links must use HTTP or HTTPS');
  return {
    subject: input.subject,
    text: [
      greeting,
      ...input.paragraphs,
      `${label}: ${url}`,
      'Warm regards,\nThe Care Partner Connect team',
      'This is an automated message from Care Partner Connect.',
    ].join('\n\n'),
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f8fafc;color:#1e293b;font-family:Arial,sans-serif"><main style="max-width:600px;margin:24px auto;padding:28px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px"><p style="margin:0 0 24px;color:#002d72;font-size:18px;font-weight:bold">Hopkins Care Partner Connect</p><p>${escapeHtml(greeting)}</p>${input.paragraphs.map((paragraph) => `<p style="line-height:1.6">${escapeHtml(paragraph)}</p>`).join('')}<p style="margin:28px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#002d72;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">${escapeHtml(label)}</a></p><p style="line-height:1.6">Warm regards,<br>The Care Partner Connect team</p><p style="border-top:1px solid #e2e8f0;padding-top:16px;font-size:12px;color:#64748b">This is an automated message from Care Partner Connect.</p><p style="font-size:12px;overflow-wrap:anywhere">If the button does not work, copy this link into your browser:<br><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p></main></body></html>`,
  };
}
