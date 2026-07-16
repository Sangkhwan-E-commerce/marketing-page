const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
// Folder prefix inside the shared bucket so this site's files don't collide
// with the other webservice's objects.
const PREFIX = (process.env.R2_PREFIX || "lullapos/").replace(/^\/+/, "").replace(/\/*$/, "/");

const META_KEY = `${PREFIX}meta.json`;

let client = null;
function getClient() {
  if (client) return client;
  if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET || !PUBLIC_URL) {
    throw new Error(
      "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL."
    );
  }
  client = new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
  });
  return client;
}

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf-8");
}

// Reads the small JSON file that tracks which image URL is assigned to
// each homepage slot (hero, whyFree, ...). Returns {} if it doesn't exist yet.
async function getMeta() {
  try {
    const res = await getClient().send(
      new GetObjectCommand({ Bucket: BUCKET, Key: META_KEY })
    );
    const text = await streamToString(res.Body);
    return JSON.parse(text);
  } catch (err) {
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return {};
    }
    throw err;
  }
}

async function saveMeta(meta) {
  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: META_KEY,
      Body: JSON.stringify(meta, null, 2),
      ContentType: "application/json",
    })
  );
}

// Uploads a new image for the given slot, updates meta.json, and removes
// the previous image for that slot (if any) to avoid orphaned files.
async function uploadSlotImage(slot, buffer, mimetype, originalName) {
  const ext = (originalName.match(/\.[a-zA-Z0-9]+$/) || [".jpg"])[0].toLowerCase();
  const key = `${PREFIX}${slot}-${Date.now()}${ext}`;

  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    })
  );

  const url = `${PUBLIC_URL}/${key}`;
  const meta = await getMeta();
  const previousUrl = meta[slot];
  meta[slot] = url;
  await saveMeta(meta);

  if (previousUrl && previousUrl.startsWith(PUBLIC_URL)) {
    const previousKey = previousUrl.slice(PUBLIC_URL.length + 1);
    if (previousKey && previousKey !== key) {
      await getClient()
        .send(new DeleteObjectCommand({ Bucket: BUCKET, Key: previousKey }))
        .catch(() => {}); // best-effort cleanup
    }
  }

  return url;
}

async function clearSlotImage(slot) {
  const meta = await getMeta();
  const previousUrl = meta[slot];
  delete meta[slot];
  await saveMeta(meta);

  if (previousUrl && previousUrl.startsWith(PUBLIC_URL)) {
    const previousKey = previousUrl.slice(PUBLIC_URL.length + 1);
    await getClient()
      .send(new DeleteObjectCommand({ Bucket: BUCKET, Key: previousKey }))
      .catch(() => {});
  }
}

module.exports = { getMeta, saveMeta, uploadSlotImage, clearSlotImage };
