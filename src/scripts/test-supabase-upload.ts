import { env } from "../config/env";
import { createSupabaseStorageService } from "../integrations/supabase/supabase-storage.service";

const fileName = `storage-smoke-${Date.now()}.txt`;
const content = `ACCESS reference storage smoke test ${new Date().toISOString()}`;
const buffer = new TextEncoder().encode(content);

const file = {
  name: fileName,
  size: buffer.byteLength,
  type: "text/plain",
  async arrayBuffer() {
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
  },
};

const storage = createSupabaseStorageService(env.supabase);
const uploaded = await storage.uploadReferenceFile(file);
const signed = await storage.createReferenceSignedUrl(uploaded.storageKey);

console.log("Uploaded reference file:");
console.log({
  storageProvider: uploaded.storageProvider,
  storageBucket: uploaded.storageBucket,
  storageKey: uploaded.storageKey,
  fileName: uploaded.fileName,
  fileMimeType: uploaded.fileMimeType,
  fileSize: uploaded.fileSize,
});
console.log("Signed URL:");
console.log({
  signedUrl: signed.signedUrl,
  expiresIn: signed.expiresIn,
});
