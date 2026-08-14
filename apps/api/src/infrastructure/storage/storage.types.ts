/**
 * Provider-agnostic object-storage contract, kept in the presigned-URL style of S3
 * so callers (upload flow, pipeline download, audio playback) don't care whether
 * files live in MinIO/AWS or on the local filesystem.
 */
export interface IStorage {
  /** Short-lived URL the browser PUTs the file to directly. */
  getPresignedPutUrl(key: string, contentType: string, expiresIn?: number): Promise<string>;
  /** Short-lived URL for playback/download of a stored object. */
  getPresignedGetUrl(key: string, expiresIn?: number): Promise<string>;
}

export const STORAGE = Symbol('STORAGE');
