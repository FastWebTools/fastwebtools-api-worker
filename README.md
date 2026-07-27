# fastwebtools-api-worker

Cloudflare Worker source for the **fastwebtools-api** public API.

## Bindings required

- **D1 Database:** binding name `DB` → database `fastwebtools-db`

## Auto-deploy

This repo is connected to Cloudflare Worker `fastwebtools-api`. Every push to `main` deploys automatically.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/comments?article_id=xxx` | Get comments for an article |
| POST | `/comments` | Post a new comment `{article_id, name, text}` |
| GET | `/article-likes?id=xxx` | Get like count for an article |
| POST | `/article-like` | Like/unlike article `{id, action}` |
| GET | `/tool-likes?id=xxx` | Get like count for a tool |
| POST | `/tool-like` | Like/unlike tool `{id, action}` |
| GET | `/tool-usage?id=xxx` | Get usage count for a tool |
| POST | `/tool-usage` | Increment tool usage `{id}` |
| GET | `/popular-tools` | Top 6 tools by usage |
| POST | `/visit` | Record a page visit `{article_id?, visitor_id?}` |
