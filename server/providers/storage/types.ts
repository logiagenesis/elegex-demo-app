export type StorageProviderId = "manus" | "s3" | "local";

export type StoragePutInput = {
  key: string;
  body: Uint8Array | Buffer | string;
  contentType: string;
};

export interface StorageProvider {
  readonly id: StorageProviderId;
  put(input: StoragePutInput): Promise<void>;
  getSignedUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
  read?(key: string): Promise<Buffer | undefined>;
}
