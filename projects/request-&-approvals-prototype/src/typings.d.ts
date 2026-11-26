type Gtag = (command: 'config', trackingId: string, config?: { page_path?: string }) => void;

interface Window {
  gtag?: Gtag;
}

declare module 'bidi-js' {
  export interface EmbeddingLevels {
    levels: Uint8Array;
    paragraphs: { start: number; end: number; level: number }[];
  }

  export interface Bidi {
    getEmbeddingLevels(text: string, explicitDirection?: 'ltr' | 'rtl' | 'auto'): EmbeddingLevels;
    getReorderedString(text: string, embeddingLevels: EmbeddingLevels, start?: number, end?: number): string;
    getReorderSegments(text: string, embeddingLevels: EmbeddingLevels, start?: number, end?: number): [number, number][];
  }

  export default function bidiFactory(): Bidi;
}
