export const GUIDE_PAGES_INTRO =
  "You may find what you're looking for on these guide pages";

/** Keep staff tests and the care partner view consistent when only retrieval is available. */
export function assistantAnswer(result: {
  answer?: string;
  citedResources?: readonly unknown[];
  discussions?: readonly unknown[];
}): string {
  return (
    result.answer?.trim() ||
    (result.citedResources?.length
      ? GUIDE_PAGES_INTRO
      : result.discussions?.length
        ? 'These community discussions may help. You can also start a new discussion.'
        : 'I could not find a matching guide or discussion. Try different keywords, or ask the community by creating a discussion post.')
  );
}
