/**
 * Fast Web Tools — Cloudflare Worker API
 * D1 binding name: DB
 *
 *   GET  /comments?article_id=xxx
 *   POST /comments             body: { article_id, name, text }
 *   GET  /article-likes?id=xxx
 *   POST /article-like         body: { id, action: 'like' | 'unlike' }
 *   GET  /tool-likes?id=xxx
 *   POST /tool-like            body: { id, action: 'like' | 'unlike' }
 *   GET  /tool-usage?id=xxx
 *   POST /tool-usage           body: { id }
 *   GET  /popular-tools
 *   POST /visit                body: { article_id?, visitor_id? }
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json;charset=UTF-8", ...CORS_HEADERS }
  });
}
function errorResponse(message, status = 400) {
  return jsonResponse({ success: false, error: message }, status);
}
function handleOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

const MAX_ID_LEN = 150;
const MAX_URL_LEN = 300;
const MAX_NAME_LEN = 40;
const MAX_TEXT_LEN = 400;
const MAX_COMMENTS_RETURNED = 30;
const MAX_VISITOR_ID_LEN = 100;

function sanitizeKey(value) {
  return String(value == null ? "" : value)
    .replace(/^https?:\/\//i, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

// Visit tracking preserves the FULL post URL so the dashboard can
// display the real article name and link back to the exact post.
function sanitizeVisitUrl(value) {
  return String(value == null ? "" : value)
    .trim()
    .replace(/[^a-zA-Z0-9_\-\.:\/]/g, "_")
    .slice(0, MAX_URL_LEN);
}

function isNonEmptyString(value, maxLen) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLen;
}
function clean(value, maxLen) {
  return String(value == null ? "" : value).trim().slice(0, maxLen);
}
async function readJson(request) {
  try {
    const data = await request.json();
    return data && typeof data === "object" ? data : {};
  } catch (e) { return null; }
}
function formatDate(date) {
  try { return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch (e) { return date.toISOString().slice(0, 10); }
}
function nowTimestamp() { return new Date().toISOString(); }
function toDisplayDate(rawCreatedAt) {
  if (!rawCreatedAt) return "";
  const parsed = new Date(rawCreatedAt);
  if (isNaN(parsed.getTime())) return rawCreatedAt;
  return formatDate(parsed);
}

async function ensureCounterRow(db, table, idColumn, countColumn, id) {
  await db.prepare(
    `INSERT INTO ${table} (${idColumn}, ${countColumn}) VALUES (?1, 0)
     ON CONFLICT(${idColumn}) DO NOTHING`
  ).bind(id).run();
  const row = await db.prepare(
    `SELECT ${countColumn} AS count FROM ${table} WHERE ${idColumn} = ?1`
  ).bind(id).first();
  return row && typeof row.count === "number" ? row.count : 0;
}
async function adjustCounterRow(db, table, idColumn, countColumn, id, delta) {
  await db.prepare(
    `INSERT INTO ${table} (${idColumn}, ${countColumn}) VALUES (?1, MAX(?2, 0))
     ON CONFLICT(${idColumn}) DO UPDATE SET ${countColumn} = MAX(${countColumn} + ?2, 0)`
  ).bind(id, delta).run();
  const row = await db.prepare(
    `SELECT ${countColumn} AS count FROM ${table} WHERE ${idColumn} = ?1`
  ).bind(id).first();
  return row && typeof row.count === "number" ? row.count : 0;
}

async function getComments(url, db) {
  const rawId = url.searchParams.get("article_id");
  if (!isNonEmptyString(rawId, MAX_ID_LEN)) return errorResponse("Missing or invalid article_id", 400);
  const articleId = sanitizeKey(rawId);
  try {
    const result = await db.prepare(
      `SELECT name, comment, created_at FROM comments
         WHERE article_id = ?1 AND (status = 'published' OR status IS NULL)
         ORDER BY id DESC LIMIT ?2`
    ).bind(articleId, MAX_COMMENTS_RETURNED).all();
    const comments = (result && result.results ? result.results : []).map((row) => ({
      name: row.name || "Guest",
      text: row.comment || "",
      date: toDisplayDate(row.created_at)
    }));
    return jsonResponse({ success: true, comments });
  } catch (e) { return errorResponse("Failed to load comments", 500); }
}

async function postComment(request, db) {
  const body = await readJson(request);
  if (body === null) return errorResponse("Invalid JSON body", 400);
  const rawArticleId = body.article_id;
  const rawName = body.name;
  const rawText = body.text;
  if (!isNonEmptyString(rawArticleId, MAX_ID_LEN)) return errorResponse("Missing or invalid article_id", 400);
  if (!isNonEmptyString(rawText, MAX_TEXT_LEN)) return errorResponse("Comment text is required (max 400 characters)", 400);
  const articleId = sanitizeKey(rawArticleId);
  const name = clean(rawName, MAX_NAME_LEN) || "Guest";
  const text = clean(rawText, MAX_TEXT_LEN);
  const now = new Date();
  const storedTimestamp = nowTimestamp();
  try {
    await db.prepare(
      `INSERT INTO comments (article_id, name, comment, created_at) VALUES (?1, ?2, ?3, ?4)`
    ).bind(articleId, name, text, storedTimestamp).run();
    return jsonResponse({ success: true, comment: { name, text, date: formatDate(now) } });
  } catch (e) { return errorResponse("Failed to save comment", 500); }
}

async function getArticleLikes(url, db) {
  const rawId = url.searchParams.get("id");
  if (!isNonEmptyString(rawId, MAX_ID_LEN)) return errorResponse("Missing or invalid id", 400);
  const id = sanitizeKey(rawId);
  try {
    const count = await ensureCounterRow(db, "article_likes", "article_id", "likes", id);
    return jsonResponse({ success: true, count });
  } catch (e) { return errorResponse("Failed to load article likes", 500); }
}
async function postArticleLike(request, db) {
  const body = await readJson(request);
  if (body === null) return errorResponse("Invalid JSON body", 400);
  const rawId = body.id;
  const action = body.action;
  if (!isNonEmptyString(rawId, MAX_ID_LEN)) return errorResponse("Missing or invalid id", 400);
  if (action !== "like" && action !== "unlike") return errorResponse("action must be 'like' or 'unlike'", 400);
  const id = sanitizeKey(rawId);
  const delta = action === "like" ? 1 : -1;
  try {
    const count = await adjustCounterRow(db, "article_likes", "article_id", "likes", id, delta);
    return jsonResponse({ success: true, count });
  } catch (e) { return errorResponse("Failed to update article like", 500); }
}

async function getToolLikes(url, db) {
  const rawId = url.searchParams.get("id");
  if (!isNonEmptyString(rawId, MAX_ID_LEN)) return errorResponse("Missing or invalid id", 400);
  const id = sanitizeKey(rawId);
  try {
    const count = await ensureCounterRow(db, "tool_likes", "tool_id", "likes", id);
    return jsonResponse({ success: true, count });
  } catch (e) { return errorResponse("Failed to load tool likes", 500); }
}
async function postToolLike(request, db) {
  const body = await readJson(request);
  if (body === null) return errorResponse("Invalid JSON body", 400);
  const rawId = body.id;
  const action = body.action;
  if (!isNonEmptyString(rawId, MAX_ID_LEN)) return errorResponse("Missing or invalid id", 400);
  if (action !== "like" && action !== "unlike") return errorResponse("action must be 'like' or 'unlike'", 400);
  const id = sanitizeKey(rawId);
  const delta = action === "like" ? 1 : -1;
  try {
    const count = await adjustCounterRow(db, "tool_likes", "tool_id", "likes", id, delta);
    return jsonResponse({ success: true, count });
  } catch (e) { return errorResponse("Failed to update tool like", 500); }
}

async function getToolUsage(url, db) {
  const rawId = url.searchParams.get("id");
  if (!isNonEmptyString(rawId, MAX_ID_LEN)) return errorResponse("Missing or invalid id", 400);
  const id = sanitizeKey(rawId);
  try {
    const count = await ensureCounterRow(db, "tool_usage", "tool_id", "uses", id);
    return jsonResponse({ success: true, count });
  } catch (e) { return errorResponse("Failed to load tool usage", 500); }
}
async function postToolUsage(request, db) {
  const body = await readJson(request);
  if (body === null) return errorResponse("Invalid JSON body", 400);
  const rawId = body.id;
  if (!isNonEmptyString(rawId, MAX_ID_LEN)) return errorResponse("Missing or invalid id", 400);
  const id = sanitizeKey(rawId);
  try {
    const count = await adjustCounterRow(db, "tool_usage", "tool_id", "uses", id, 1);
    return jsonResponse({ success: true, count });
  } catch (e) { return errorResponse("Failed to update tool usage", 500); }
}

async function getPopularTools(db) {
  try {
    const result = await db.prepare(
      `SELECT tool_id AS id, uses AS count FROM tool_usage ORDER BY uses DESC LIMIT 6`
    ).all();
    const tools = (result && result.results ? result.results : []).map((row) => ({
      id: row.id,
      count: typeof row.count === "number" ? row.count : 0
    }));
    return jsonResponse({ success: true, tools });
  } catch (e) { return errorResponse("Failed to load popular tools", 500); }
}

async function postVisit(request, db) {
  const body = await readJson(request);
  const safeBody = body === null ? {} : body;
  const rawArticleId = safeBody.article_id;
  const articleId =
    typeof rawArticleId === "string" && rawArticleId.trim().length > 0 && rawArticleId.length <= MAX_URL_LEN
      ? sanitizeVisitUrl(rawArticleId)
      : null;
  const visitorId = isNonEmptyString(safeBody.visitor_id, MAX_VISITOR_ID_LEN)
    ? clean(safeBody.visitor_id, MAX_VISITOR_ID_LEN)
    : null;
  try {
    await db.prepare(
      `INSERT INTO visits (article_id, visitor_id, created_at) VALUES (?1, ?2, ?3)`
    ).bind(articleId, visitorId, Date.now()).run();
    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ success: false, error: "Failed to record visit" }, 500);
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return handleOptions();
    const db = env.DB;
    if (!db) return errorResponse("D1 binding 'DB' is not configured", 500);
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const method = request.method;
    try {
      if (path === "/comments" && method === "GET") return await getComments(url, db);
      if (path === "/comments" && method === "POST") return await postComment(request, db);
      if (path === "/article-likes" && method === "GET") return await getArticleLikes(url, db);
      if (path === "/article-like" && method === "POST") return await postArticleLike(request, db);
      if (path === "/tool-likes" && method === "GET") return await getToolLikes(url, db);
      if (path === "/tool-like" && method === "POST") return await postToolLike(request, db);
      if (path === "/tool-usage" && method === "GET") return await getToolUsage(url, db);
      if (path === "/tool-usage" && method === "POST") return await postToolUsage(request, db);
      if (path === "/popular-tools" && method === "GET") return await getPopularTools(db);
      if (path === "/visit" && method === "POST") return await postVisit(request, db);
      return errorResponse("Not found", 404);
    } catch (e) { return errorResponse("Internal server error", 500); }
  }
};
