export class RetryFromMultiOrderChunkError extends Error {
  readonly chunkIndex: number;

  constructor(message: string, chunkIndex: number) {
    super(message);
    this.name = 'RetryFromMultiOrderChunkError';
    this.chunkIndex = chunkIndex;
  }
}
