declare module "@iarna/rtf-to-html" {
  const rtf: {
    fromString(
      source: string,
      callback: (error: Error | null, html: string) => void,
    ): void;
  };
  export default rtf;
}
