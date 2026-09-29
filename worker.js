/**
 * Fast Web Tools — Cloudflare Worker API
 * D1 binding name: DB
 * Deployed from: github.com/FastWebTools/fastwebtools-api-worker
 *
 *   GET  /version              (public, no auth)
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
 *   POST /heartbeat            body: { visitor_id }    — keeps session alive
 *   POST /leave                body: { visitor_id }    — immediate offline signal (sendBeacon)
 */

const WORKER_VERSION = "1.2.0-github";
const DEPLOYED_AT = "2026-09-29";

// v1.0.6: session dedupe window. If the same visitor_id had a visit within
// this many milliseconds, additional page loads are treated as the same
// session and do NOT create a new row in `visits`.
const VISIT_SESSION_MS = 30 * 60 * 1000; // 30 minutes

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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

// v1.0.5: event log tables for date-filterable tool analytics.
// Idempotent — runs once per worker instance.
let eventTablesInit = false;
async function ensureEventTables(db) {
  if (eventTablesInit) return;
  try {
    await db.batch([
      db.prepare("CREATE TABLE IF NOT EXISTS tool_usage_events (id INTEGER PRIMARY KEY AUTOINCREMENT, tool_id TEXT NOT NULL, created_at INTEGER NOT NULL)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_tue_created ON tool_usage_events(created_at)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_tue_tool ON tool_usage_events(tool_id)"),
      db.prepare("CREATE TABLE IF NOT EXISTS tool_like_events (id INTEGER PRIMARY KEY AUTOINCREMENT, tool_id TEXT NOT NULL, delta INTEGER NOT NULL, created_at INTEGER NOT NULL)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_tle_created ON tool_like_events(created_at)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_tle_tool ON tool_like_events(tool_id)"),
      db.prepare("CREATE TABLE IF NOT EXISTS article_like_events (id INTEGER PRIMARY KEY AUTOINCREMENT, article_id TEXT NOT NULL, delta INTEGER NOT NULL, created_at INTEGER NOT NULL)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_ale_created ON article_like_events(created_at)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_ale_article ON article_like_events(article_id)")
    ]);
    eventTablesInit = true;
  } catch (e) { /* best-effort; retry on next request */ }
}

// v1.0.6: index on visits(visitor_id) speeds up the session-dedupe lookup.
// Idempotent — runs once per worker instance.
let visitsIndexInit = false;
async function ensureVisitsIndex(db) {
  if (visitsIndexInit) return;
  try {
    await db.prepare("CREATE INDEX IF NOT EXISTS idx_visits_visitor_page ON visits(visitor_id, article_id, created_at)").run();
    visitsIndexInit = true;
  } catch (e) { /* best-effort; retry on next request */ }
}

const ADMIN_LOGO_WEBP_BASE64 = "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";
const COMMENT_EDIT_WINDOW_MS = 15 * 60 * 1000;
let commentSchemaInit = false;
async function bestEffortRun(db, sql) { try { await db.prepare(sql).run(); } catch (e) {} }
async function ensureCommentSchema(db) {
  if (commentSchemaInit) return;
  await bestEffortRun(db, "ALTER TABLE comments ADD COLUMN owner_token_hash TEXT");
  await bestEffortRun(db, "ALTER TABLE comments ADD COLUMN edited_once INTEGER NOT NULL DEFAULT 0");
  await bestEffortRun(db, "ALTER TABLE comments ADD COLUMN edited_at INTEGER");
  await bestEffortRun(db, "ALTER TABLE comments ADD COLUMN edited_by_admin INTEGER NOT NULL DEFAULT 0");
  await bestEffortRun(db, "ALTER TABLE comments ADD COLUMN admin_edit_reason TEXT");
  await bestEffortRun(db, "ALTER TABLE comments ADD COLUMN original_comment TEXT");
  await bestEffortRun(db, "ALTER TABLE comments ADD COLUMN updated_at INTEGER");
  await bestEffortRun(db, "CREATE TABLE IF NOT EXISTS comment_reactions (id INTEGER PRIMARY KEY AUTOINCREMENT, comment_id INTEGER NOT NULL, visitor_id TEXT NOT NULL, reaction INTEGER NOT NULL CHECK(reaction IN (-1,1)), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(comment_id, visitor_id))");
  await bestEffortRun(db, "CREATE INDEX IF NOT EXISTS idx_cr_comment ON comment_reactions(comment_id)");
  await bestEffortRun(db, "CREATE TABLE IF NOT EXISTS comment_replies (id INTEGER PRIMARY KEY AUTOINCREMENT, comment_id INTEGER NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published', is_official INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)");
  await bestEffortRun(db, "CREATE INDEX IF NOT EXISTS idx_reply_comment ON comment_replies(comment_id)");
  await bestEffortRun(db, "CREATE TABLE IF NOT EXISTS reply_reactions (id INTEGER PRIMARY KEY AUTOINCREMENT, reply_id INTEGER NOT NULL, visitor_id TEXT NOT NULL, reaction INTEGER NOT NULL CHECK(reaction IN (-1,1)), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(reply_id, visitor_id))");
  await bestEffortRun(db, "CREATE INDEX IF NOT EXISTS idx_rr_reply ON reply_reactions(reply_id)");
  commentSchemaInit = true;
}
function randomOwnerToken() { const a = new Uint8Array(32); crypto.getRandomValues(a); return Array.from(a).map(b => b.toString(16).padStart(2, "0")).join(""); }
async function sha256Hex(text) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text))); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join(""); }
function createdMs(v) { if (typeof v === "number") return v > 9999999999 ? v : v * 1000; const n = Number(v); if (String(v).trim() && Number.isFinite(n)) return n > 9999999999 ? n : n * 1000; const t = Date.parse(v); return Number.isFinite(t) ? t : 0; }
function decodeBase64Bytes(s) { const bin = atob(s), out = new Uint8Array(bin.length); for (let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out; }

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
//
// v1.0.3: Strip query string (?m=1 from Blogger mobile, ?utm_*, etc.)
// and hash BEFORE regex sanitize.
function sanitizeVisitUrl(value) {
  let raw = String(value == null ? "" : value).trim();
  const qIdx = raw.indexOf("?");
  if (qIdx !== -1) raw = raw.slice(0, qIdx);
  const hIdx = raw.indexOf("#");
  if (hIdx !== -1) raw = raw.slice(0, hIdx);
  return raw.replace(/[^a-zA-Z0-9_\-\.:\/]/g, "_").slice(0, MAX_URL_LEN);
}

// v1.0.4: canonicalize article URLs at ingest time so buggy tracking
// variants (trailing -html, slug-as-path) never enter the DB.
function canonicalizeVisitUrl(sanitized) {
  if (!sanitized) return sanitized;
  const s = String(sanitized);
  const domainMatch = s.match(/^(https?:\/\/[^\/]+)(\/.*)?$/i);
  let prefix = "", path = s;
  if (domainMatch) {
    prefix = domainMatch[1];
    path = domainMatch[2] || "/";
  }
  const m = path.match(/^\/(\d{4})\/(\d{1,2})\/(.+)$/i);
  if (m) {
    let slug = m[3], prev = "";
    while (slug !== prev) {
      prev = slug;
      slug = slug.replace(/\.html?$/i, "").replace(/-html$/i, "");
    }
    if (slug) return prefix + "/" + m[1] + "/" + String(m[2]).padStart(2, "0") + "/" + slug + ".html";
  }
  const m2 = path.match(/^\/?www-fastwebtools-online-(\d{4})-(\d{1,2})-(.+)$/i);
  if (m2) {
    let slug2 = m2[3], prev2 = "";
    while (slug2 !== prev2) {
      prev2 = slug2;
      slug2 = slug2.replace(/\.html?$/i, "").replace(/-html$/i, "");
    }
    if (slug2) return prefix + "/" + m2[1] + "/" + String(m2[2]).padStart(2, "0") + "/" + slug2 + ".html";
  }
  return s;
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
  const visitorId = clean(url.searchParams.get("visitor_id"), MAX_VISITOR_ID_LEN);
  if (!isNonEmptyString(rawId, MAX_ID_LEN)) return errorResponse("Missing or invalid article_id", 400);
  const articleId = sanitizeKey(rawId);
  try {
    await ensureCommentSchema(db);
    const countRow = await db.prepare("SELECT COUNT(*) AS n FROM comments WHERE article_id=?1 AND (status='published' OR status IS NULL)").bind(articleId).first();
    const result = await db.prepare(
      `SELECT c.id,c.name,c.comment,c.created_at,c.edited_once,c.edited_at,c.edited_by_admin,c.admin_edit_reason,c.updated_at,
       COALESCE((SELECT SUM(CASE WHEN reaction=1 THEN 1 ELSE 0 END) FROM comment_reactions r WHERE r.comment_id=c.id),0) AS likes,
       COALESCE((SELECT SUM(CASE WHEN reaction=-1 THEN 1 ELSE 0 END) FROM comment_reactions r WHERE r.comment_id=c.id),0) AS dislikes,
       COALESCE((SELECT reaction FROM comment_reactions r WHERE r.comment_id=c.id AND r.visitor_id=?2),0) AS my_reaction
       FROM comments c WHERE c.article_id=?1 AND (c.status='published' OR c.status IS NULL)
       ORDER BY c.id DESC LIMIT 100`
    ).bind(articleId, visitorId || "-").all();
    const rows = result && result.results ? result.results : [];
    const ids = rows.map(r => Number(r.id)).filter(Boolean);
    let replies = [];
    if (ids.length) {
      const qs = ids.map(() => "?").join(",");
      const rr = await db.prepare(
        `SELECT p.id,p.comment_id,p.body,p.is_official,p.created_at,p.updated_at,
         COALESCE((SELECT SUM(CASE WHEN reaction=1 THEN 1 ELSE 0 END) FROM reply_reactions x WHERE x.reply_id=p.id),0) AS likes,
         COALESCE((SELECT SUM(CASE WHEN reaction=-1 THEN 1 ELSE 0 END) FROM reply_reactions x WHERE x.reply_id=p.id),0) AS dislikes,
         COALESCE((SELECT reaction FROM reply_reactions x WHERE x.reply_id=p.id AND x.visitor_id=?),0) AS my_reaction
         FROM comment_replies p WHERE p.status='published' AND p.comment_id IN (${qs}) ORDER BY p.id ASC`
      ).bind(visitorId || "-", ...ids).all();
      replies = rr && rr.results ? rr.results : [];
    }
    const byComment = {};
    for (const r of replies) {
      const key = String(r.comment_id); if (!byComment[key]) byComment[key] = [];
      byComment[key].push({ id:Number(r.id), text:r.body||"", date:toDisplayDate(r.created_at), created_at:r.created_at, official:!!r.is_official, likes:Number(r.likes||0), dislikes:Number(r.dislikes||0), my_reaction:Number(r.my_reaction||0) });
    }
    const now = Date.now();
    const comments = rows.map(row => {
      const ms = createdMs(row.created_at);
      return { id:Number(row.id), name:row.name||"Guest", text:row.comment||"", date:toDisplayDate(row.created_at), created_at:row.created_at, created_at_ms:ms, edited_once:!!row.edited_once, edited_at:row.edited_at||null, edited_by_admin:!!row.edited_by_admin, admin_edit_reason:row.admin_edit_reason||"", edit_deadline_ms:ms?ms+COMMENT_EDIT_WINDOW_MS:0, edit_window_open:!!ms && now < ms+COMMENT_EDIT_WINDOW_MS && !row.edited_once, likes:Number(row.likes||0), dislikes:Number(row.dislikes||0), my_reaction:Number(row.my_reaction||0), replies:byComment[String(row.id)]||[] };
    });
    return jsonResponse({ success:true, count:Number(countRow && countRow.n || 0), comments, server_time:now, poll_after_ms:10000 });
  } catch (e) { return errorResponse("Failed to load comments", 500); }
}

async function getCommentCount(url, db) {
  const rawId=url.searchParams.get("article_id"); if(!isNonEmptyString(rawId,MAX_ID_LEN)) return errorResponse("Missing or invalid article_id",400);
  const id=sanitizeKey(rawId); try { const r=await db.prepare("SELECT COUNT(*) AS n FROM comments WHERE article_id=?1 AND (status='published' OR status IS NULL)").bind(id).first(); return jsonResponse({success:true,count:Number(r&&r.n||0)}); } catch(e){ return errorResponse("Failed to load count",500); }
}

async function postComment(request, db) {
  const body = await readJson(request);
  if (body === null) return errorResponse("Invalid JSON body", 400);
  const rawArticleId=body.article_id, rawName=body.name, rawText=body.text;
  if (!isNonEmptyString(rawArticleId,MAX_ID_LEN)) return errorResponse("Missing or invalid article_id",400);
  if (!isNonEmptyString(rawText,MAX_TEXT_LEN)) return errorResponse("Comment text is required (max 400 characters)",400);
  const articleId=sanitizeKey(rawArticleId), name=clean(rawName,MAX_NAME_LEN)||"Guest", text=clean(rawText,MAX_TEXT_LEN), now=Date.now();
  const ownerToken=randomOwnerToken(), ownerHash=await sha256Hex(ownerToken);
  try {
    await ensureCommentSchema(db);
    const r=await db.prepare(`INSERT INTO comments (article_id,name,comment,status,created_at,owner_token_hash,edited_once,updated_at) VALUES (?1,?2,?3,'published',?4,?5,0,?4)`).bind(articleId,name,text,now,ownerHash).run();
    const id=Number(r && r.meta && r.meta.last_row_id || 0);
    return jsonResponse({success:true,comment:{id,name,text,date:formatDate(new Date(now)),created_at:now,created_at_ms:now,edit_deadline_ms:now+COMMENT_EDIT_WINDOW_MS,edited_once:false,likes:0,dislikes:0,replies:[]},owner_token:ownerToken});
  } catch(e){ return errorResponse("Failed to save comment",500); }
}

async function editOwnComment(request, db, id) {
  const body=await readJson(request); if(body===null) return errorResponse("Invalid JSON body",400);
  if(!isNonEmptyString(body.text,MAX_TEXT_LEN)||!isNonEmptyString(body.owner_token,100)) return errorResponse("Missing text or ownership token",400);
  try {
    await ensureCommentSchema(db); const row=await db.prepare("SELECT owner_token_hash,edited_once,created_at FROM comments WHERE id=?1").bind(id).first();
    if(!row) return errorResponse("Comment not found",404); if(row.edited_once) return errorResponse("This comment has already been edited",409);
    if(Date.now()-createdMs(row.created_at)>COMMENT_EDIT_WINDOW_MS) return errorResponse("The 15-minute edit window has expired",403);
    if(await sha256Hex(body.owner_token)!==row.owner_token_hash) return errorResponse("You do not own this comment",403);
    const now=Date.now(),text=clean(body.text,MAX_TEXT_LEN); const r=await db.prepare("UPDATE comments SET comment=?1,edited_once=1,edited_at=?2,updated_at=?2 WHERE id=?3 AND edited_once=0").bind(text,now,id).run();
    if(!r || !r.meta || !r.meta.changes) return errorResponse("Comment could not be edited",409);
    return jsonResponse({success:true,text,edited_once:true,edited_at:now});
  } catch(e){ return errorResponse("Failed to edit comment",500); }
}

async function deleteOwnComment(request, db, id) {
  const body=await readJson(request); if(body===null||!isNonEmptyString(body.owner_token,100)) return errorResponse("Missing ownership token",400);
  try {
    await ensureCommentSchema(db); const row=await db.prepare("SELECT owner_token_hash FROM comments WHERE id=?1").bind(id).first();
    if(!row) return errorResponse("Comment not found",404); if(await sha256Hex(body.owner_token)!==row.owner_token_hash) return errorResponse("You do not own this comment",403);
    await db.batch([db.prepare("DELETE FROM reply_reactions WHERE reply_id IN (SELECT id FROM comment_replies WHERE comment_id=?1)").bind(id),db.prepare("DELETE FROM comment_reactions WHERE comment_id=?1").bind(id),db.prepare("DELETE FROM comment_replies WHERE comment_id=?1").bind(id),db.prepare("DELETE FROM comments WHERE id=?1").bind(id)]);
    return jsonResponse({success:true,deleted:true});
  } catch(e){ return errorResponse("Failed to delete comment",500); }
}

async function reactToTarget(request, db, targetType, id) {
  const body=await readJson(request); if(body===null) return errorResponse("Invalid JSON body",400);
  const visitorId=clean(body.visitor_id,MAX_VISITOR_ID_LEN), action=body.reaction;
  if(!visitorId) return errorResponse("Missing visitor_id",400); if(!["like","dislike","none"].includes(action)) return errorResponse("Invalid reaction",400);
  const table=targetType==="reply"?"reply_reactions":"comment_reactions", col=targetType==="reply"?"reply_id":"comment_id", now=Date.now(),value=action==="like"?1:action==="dislike"?-1:0;
  try {
    await ensureCommentSchema(db);
    if(!value) await db.prepare(`DELETE FROM ${table} WHERE ${col}=?1 AND visitor_id=?2`).bind(id,visitorId).run();
    else await db.prepare(`INSERT INTO ${table} (${col},visitor_id,reaction,created_at,updated_at) VALUES (?1,?2,?3,?4,?4) ON CONFLICT(${col},visitor_id) DO UPDATE SET reaction=?3,updated_at=?4`).bind(id,visitorId,value,now).run();
    const r=await db.prepare(`SELECT COALESCE(SUM(CASE WHEN reaction=1 THEN 1 ELSE 0 END),0) AS likes,COALESCE(SUM(CASE WHEN reaction=-1 THEN 1 ELSE 0 END),0) AS dislikes FROM ${table} WHERE ${col}=?1`).bind(id).first();
    return jsonResponse({success:true,likes:Number(r&&r.likes||0),dislikes:Number(r&&r.dislikes||0),my_reaction:value});
  } catch(e){ return errorResponse("Failed to update reaction",500); }
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
    await ensureEventTables(db);
    const count = await adjustCounterRow(db, "article_likes", "article_id", "likes", id, delta);
    try {
      await db.prepare("INSERT INTO article_like_events (article_id, delta, created_at) VALUES (?1, ?2, ?3)").bind(id, delta, Date.now()).run();
    } catch (e) { /* event log is best-effort */ }
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

// v1.0.5: also inserts into tool_like_events for date-filtered analytics.
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
    await ensureEventTables(db);
    const count = await adjustCounterRow(db, "tool_likes", "tool_id", "likes", id, delta);
    try {
      await db.prepare("INSERT INTO tool_like_events (tool_id, delta, created_at) VALUES (?1, ?2, ?3)").bind(id, delta, Date.now()).run();
    } catch (e) { /* event log is best-effort */ }
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

// v1.0.5: also inserts into tool_usage_events for date-filtered analytics.
async function postToolUsage(request, db) {
  const body = await readJson(request);
  if (body === null) return errorResponse("Invalid JSON body", 400);
  const rawId = body.id;
  if (!isNonEmptyString(rawId, MAX_ID_LEN)) return errorResponse("Missing or invalid id", 400);
  const id = sanitizeKey(rawId);
  try {
    await ensureEventTables(db);
    const count = await adjustCounterRow(db, "tool_usage", "tool_id", "uses", id, 1);
    try {
      await db.prepare("INSERT INTO tool_usage_events (tool_id, created_at) VALUES (?1, ?2)").bind(id, Date.now()).run();
    } catch (e) { /* event log is best-effort */ }
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

// v1.0.4: applies canonicalizeVisitUrl() so buggy article URL variants
// (trailing -html, slug-as-path) get normalized before INSERT.
// v1.1.0: dedupe repeat loads of the SAME page for the same visitor within
// VISIT_SESSION_MS (30 min). Different pages are always recorded, so blog and
// tool navigation is not lost while refresh noise remains controlled.
async function postVisit(request, db) {
  const body = await readJson(request);
  const safeBody = body === null ? {} : body;
  const rawArticleId = safeBody.article_id;
  const articleId =
    typeof rawArticleId === "string" && rawArticleId.trim().length > 0 && rawArticleId.length <= MAX_URL_LEN
      ? canonicalizeVisitUrl(sanitizeVisitUrl(rawArticleId))
      : null;
  const visitorId = isNonEmptyString(safeBody.visitor_id, MAX_VISITOR_ID_LEN)
    ? clean(safeBody.visitor_id, MAX_VISITOR_ID_LEN)
    : null;
  const now = Date.now();
  try {
    await ensureVisitsIndex(db);
    // Page-aware dedupe: skip only when the same visitor loaded the same page
    // within 30 minutes. A different page must create a new visit row.
    if (visitorId) {
      try {
        const last = await db.prepare(
          `SELECT MAX(created_at) AS last_ts FROM visits
           WHERE visitor_id = ?1 AND COALESCE(article_id, '') = COALESCE(?2, '')`
        ).bind(visitorId, articleId).first();
        const lastTs = last && typeof last.last_ts === "number" ? last.last_ts : 0;
        if (lastTs && (now - lastTs) < VISIT_SESSION_MS) {
          return jsonResponse({ success: true, deduped: true });
        }
      } catch (e) { /* fall through and insert */ }
    }
    await db.prepare(
      `INSERT INTO visits (article_id, visitor_id, created_at) VALUES (?1, ?2, ?3)`
    ).bind(articleId, visitorId, now).run();
    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ success: false, error: "Failed to record visit" }, 500);
  }
}

async function postHeartbeat(request, db) {
  const body = await readJson(request);
  if (body === null) return errorResponse("Invalid JSON body", 400);
  const visitorId = isNonEmptyString(body.visitor_id, MAX_VISITOR_ID_LEN)
    ? clean(body.visitor_id, MAX_VISITOR_ID_LEN)
    : null;
  if (!visitorId) return errorResponse("Missing visitor_id", 400);
  try {
    await db.prepare(
      `INSERT INTO active_sessions (visitor_id, last_seen) VALUES (?1, ?2)
       ON CONFLICT(visitor_id) DO UPDATE SET last_seen = ?2`
    ).bind(visitorId, Date.now()).run();
    return jsonResponse({ success: true });
  } catch (e) { return errorResponse("Heartbeat failed", 500); }
}

async function postLeave(request, db) {
  const body = await readJson(request);
  if (body === null) return errorResponse("Invalid JSON body", 400);
  const visitorId = isNonEmptyString(body.visitor_id, MAX_VISITOR_ID_LEN)
    ? clean(body.visitor_id, MAX_VISITOR_ID_LEN)
    : null;
  if (!visitorId) return errorResponse("Missing visitor_id", 400);
  try {
    await db.prepare(
      `DELETE FROM active_sessions WHERE visitor_id = ?1`
    ).bind(visitorId).run();
    return jsonResponse({ success: true });
  } catch (e) { return errorResponse("Leave failed", 500); }
}

function getVersion() {
  return jsonResponse({
    success: true,
    worker: "fastwebtools-api",
    version: WORKER_VERSION,
    deployed_at: DEPLOYED_AT,
    source: "github.com/FastWebTools/fastwebtools-api-worker",
    server_time: new Date().toISOString(),
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return handleOptions();
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const method = request.method;

    if (path === "/version" && method === "GET") return getVersion();
    if (path === "/admin-logo.webp" && method === "GET") return new Response(decodeBase64Bytes(ADMIN_LOGO_WEBP_BASE64), { headers: { "Content-Type":"image/webp", "Cache-Control":"public,max-age=604800", ...CORS_HEADERS } });

    const db = env.DB;
    if (!db) return errorResponse("D1 binding 'DB' is not configured", 500);
    try {
      if (path === "/comments" && method === "GET") return await getComments(url, db);
      if (path === "/comments/count" && method === "GET") return await getCommentCount(url, db);
      if (path === "/comments" && method === "POST") return await postComment(request, db);
      const ownComment = path.match(/^\/comments\/(\d+)$/);
      if (ownComment && method === "PUT") return await editOwnComment(request, db, Number(ownComment[1]));
      if (ownComment && method === "DELETE") return await deleteOwnComment(request, db, Number(ownComment[1]));
      const commentReaction = path.match(/^\/comments\/(\d+)\/reaction$/);
      if (commentReaction && method === "POST") return await reactToTarget(request, db, "comment", Number(commentReaction[1]));
      const replyReaction = path.match(/^\/replies\/(\d+)\/reaction$/);
      if (replyReaction && method === "POST") return await reactToTarget(request, db, "reply", Number(replyReaction[1]));
      if (path === "/article-likes" && method === "GET") return await getArticleLikes(url, db);
      if (path === "/article-like" && method === "POST") return await postArticleLike(request, db);
      if (path === "/tool-likes" && method === "GET") return await getToolLikes(url, db);
      if (path === "/tool-like" && method === "POST") return await postToolLike(request, db);
      if (path === "/tool-usage" && method === "GET") return await getToolUsage(url, db);
      if (path === "/tool-usage" && method === "POST") return await postToolUsage(request, db);
      if (path === "/popular-tools" && method === "GET") return await getPopularTools(db);
      if (path === "/visit" && method === "POST") return await postVisit(request, db);
      if (path === "/heartbeat" && method === "POST") return await postHeartbeat(request, db);
      if (path === "/leave" && method === "POST") return await postLeave(request, db);
      return errorResponse("Not found", 404);
    } catch (e) { return errorResponse("Internal server error", 500); }
  }
};
