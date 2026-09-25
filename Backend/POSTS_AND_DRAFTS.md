# Posts and drafts (backend only)

Start the backend and open http://127.0.0.1:8000/docs. Use POST /login,
then Authorize with the returned access_token. No frontend files were changed;
browser-local campaigns are not automatically imported into these posts.

## Endpoints

| Method | Route | Purpose |
| --- | --- | --- |
| POST | /posts | Create a draft |
| GET | /posts | List your posts; optional platform, status=draft, offset, limit |
| GET | /posts/{id} | Read your post |
| PATCH | /posts/{id} | Edit selected fields of your draft |
| DELETE | /posts/{id} | Permanently delete your draft |

Example create body:

```json
{"title": "Launch announcement", "content": "Our new product is coming soon!", "platform": "linkedin"}
```

Only title is required. Draft content can be empty. Supported platform values are
facebook, instagram, linkedin and x. Optional account_id must belong to you and
match the platform; omitting platform with an account infers it. A draft may use
an unverified account because saving a draft does not publish. Verified tokens
and platform-specific content rules are checked when scheduling and publishing.

PATCH leaves omitted fields unchanged. title/content cannot be null. To remove
the target entirely send `{"account_id": null, "platform": null}`. Disconnecting
a social account removes the draft's account reference but preserves its text.

Creators, marketing managers and administrators can manage their own drafts.
Business users can read their own posts only. Administrators cannot access other
users' drafts through these APIs. Ownership, status and timestamps are server-set;
clients cannot turn a draft into a published or scheduled post by editing status.

The database persists posts independently of the browser. Scheduling, recurrence,
image URLs and publishing are now described in
[SCHEDULING_AND_PUBLISHING.md](SCHEDULING_AND_PUBLISHING.md).
File uploads and new frontend controls are not included.
