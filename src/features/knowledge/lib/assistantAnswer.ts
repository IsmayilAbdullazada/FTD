/** Keep staff tests and the care partner view consistent when only retrieval is available. */
export function assistantAnswer(result: {
  answer?: string;
  citedResources?: readonly unknown[];
  discussions?: readonly unknown[];
}): string {
  return (
    result.answer?.trim() ||
    (result.citedResources?.length
      ? 'Here are relevant pages from the care guides. Review the source documents for details.'
      : result.discussions?.length
        ? 'These community discussions may help. You can also start a new discussion.'
        : 'I could not find a matching guide or discussion. Try different keywords, or ask the community by creating a discussion post.')
  );
}
