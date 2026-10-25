// Server-side Node.js port of the supplied reference/temp_links.py.
// Its JSON payload field order, spacing, HMAC, salt and Base64 padding match Python.
import crypto from "node:crypto";

const DEFAULT_BASE_URL = "https://telegram.tglink.space";
const DEFAULT_EXPIRY_SECONDS = 5600;

export function generateTempToken(fileId, options = {}) {
  const key = options.secret ?? process.env.TEMP_LINK_SECRET;
  if (!key) throw new Error("TEMP_LINK_SECRET is required on the server");
  const expiration = options.expiration ?? Number(process.env.TEMP_LINK_EXPIRY_SECONDS || DEFAULT_EXPIRY_SECONDS);
  const exp = Date.now() / 1000 + expiration;
  const salt = crypto.randomBytes(8).toString("hex");
  // Python json.dumps({"file_id": ..., "exp": ..., "salt": ...}) format.
  const payloadJson = `{\"file_id\": ${JSON.stringify(String(fileId))}, \"exp\": ${exp}, \"salt\": \"${salt}\"}`;
  const payload = Buffer.from(payloadJson, "utf8");
  const signature = crypto.createHmac("sha256", key).update(payload).digest();
  return Buffer.concat([payload, signature]).toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
}

export function parseFileUrl(source) {
  if (typeof source !== "string" || !source) return null;
  try {
    const url = new URL(source);
    const secureHash = url.searchParams.get("hash");
    const segments = url.pathname.split("/").filter(Boolean);
    const watchIndex = segments.indexOf("watch");
    const fileId = watchIndex >= 0 ? segments[watchIndex + 1] : segments[0];
    if (url.protocol !== "https:" || !fileId || !secureHash) return null;
    // Reject untrusted domains, redirects and protocols from potentially compromised DB records.
    const allowed = new URL(process.env.TEMP_LINK_BASE_URL || DEFAULT_BASE_URL);
    if (url.origin !== allowed.origin) return null;
    if (!/^\d+$/.test(fileId)) return null;
    return { fileId, secureHash, origin: url.origin };
  } catch {
    return null;
  }
}

export function buildTempUrl(fileId, secureHash, origin) {
  if (!fileId || !secureHash) return "";
  const base = origin || process.env.TEMP_LINK_BASE_URL || DEFAULT_BASE_URL;
  const token = generateTempToken(String(fileId));
  return `${base.replace(/\/$/, "")}/${encodeURIComponent(fileId)}?hash=${encodeURIComponent(secureHash)}&temp_token=${encodeURIComponent(token)}`;
}

export function tempUrlForFile(fileDoc) {
  if (!fileDoc || typeof fileDoc !== "object") return "";
  for (const key of ["source_link", "stream_link", "download_link", "cache_link"]) {
    const parsed = parseFileUrl(fileDoc[key]);
    if (parsed) return buildTempUrl(parsed.fileId, parsed.secureHash, parsed.origin);
  }
  // Older records with only dump_msg_id and file_hash.
  if (fileDoc.dump_msg_id && fileDoc.file_hash) {
    const fid = String(fileDoc.dump_msg_id);
    if (/^\d+$/.test(fid)) return buildTempUrl(fid, String(fileDoc.file_hash));
  }
  return "";
}
