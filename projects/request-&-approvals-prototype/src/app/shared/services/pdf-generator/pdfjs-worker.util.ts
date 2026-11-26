export function pdfjsWorkerSrc(version: string): string {
  return `/assets/pdfjs/pdf.worker.min.mjs?v=${version}`;
}
