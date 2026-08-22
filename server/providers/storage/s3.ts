import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { ENV } from "../../_core/env";

import type { StorageProvider } from "./types";
import { assertStorageKey } from "./validation";

function createClient() {
  return new S3Client({
    endpoint: ENV.s3Endpoint,
    region: ENV.s3Region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: ENV.s3AccessKeyId,
      secretAccessKey: ENV.s3SecretAccessKey,
    },
  });
}

export const s3StorageProvider: StorageProvider = {
  id: "s3",
  async put({ key, body, contentType }) {
    await createClient().send(
      new PutObjectCommand({
        Bucket: ENV.s3Bucket,
        Key: assertStorageKey(key),
        Body: body,
        ContentType: contentType,
      })
    );
  },
  async getSignedUrl(key) {
    return getSignedUrl(
      createClient(),
      new GetObjectCommand({
        Bucket: ENV.s3Bucket,
        Key: assertStorageKey(key),
      }),
      { expiresIn: 60 }
    );
  },
  async delete(key) {
    await createClient().send(
      new DeleteObjectCommand({
        Bucket: ENV.s3Bucket,
        Key: assertStorageKey(key),
      })
    );
  },
};
