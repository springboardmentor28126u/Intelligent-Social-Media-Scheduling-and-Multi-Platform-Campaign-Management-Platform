# Backend roles and administration

Administrators manage users in the **Users** and **Roles & Permissions** screens. The same APIs are available in `/docs`.

| Role | Own social accounts | List users / assign roles |
| --- | --- | --- |
| content_creator | Read, connect, disconnect | No |
| marketing_manager | Read, connect, disconnect | No |
| business_user | Read only | No |
| administrator | Read, connect, disconnect | Yes |

Creators, marketing managers and administrators also have posts:read/posts:write
for their own posts. Business users have posts:read only.

Scheduling and publishing use posts:write; calendar, queue and logs use posts:read.
Team permissions remain future work. Marketing Manager is the existing UI's
role name for the specification's marketing team role. Roles do not grant access to
another user's social accounts. Unknown roles are rejected.

Existing `user` and `admin` database values map to `content_creator` and `administrator`
for authorization. Public signup still creates `user` accounts and never grants a role
supplied in a signup request. No schema migration is needed.

## Initial administrator

Register your own account normally. From the Backend directory, explicitly run:

```powershell
.\venv\Scripts\python.exe bootstrap_admin.py your-email@example.com
```

This local command grants privileges to that existing account. It has not been run
automatically. Sign in again after role changes to refresh the frontend's
cached role. Backend permissions update on the next request, even with an old JWT.

## API workflow

1. `POST /login` and copy `access_token`.
2. In `/docs`, choose Authorize and enter the token.
3. `GET /me/permissions` shows your effective role and permissions.
4. Administrators can use `GET /admin/roles` and paginated `GET /admin/users`.
5. `PATCH /admin/users/{user_id}/role` accepts, for example,
   `{"role": "marketing_manager"}`. Invalid roles are rejected. Self-demotion is blocked.

User responses omit password hashes. Every user can change their name and password under
Profile & account settings (`PATCH /me`, `POST /me/password`). Emails are case-insensitive.

## Regression tests

```powershell
.\venv\Scripts\python.exe -m unittest discover -s tests -v
```

Tests use isolated SQLite databases, not the application's PostgreSQL records.
