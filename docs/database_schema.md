# SocialPilot - Database Schema

## 1. Users

| Column | Type | Description |
|---|---|---|
| id | Integer | Primary key |
| name | String | User name |
| email | String | User email |
| password | String | Password credential |
| role | String | User role |
| created_at | DateTime | Account creation time |

## 2. Social Accounts

| Column | Type | Description |
|---|---|---|
| id | Integer | Primary key |
| user_id | Integer | Foreign key to Users |
| platform | String | Social-media platform |
| account_name | String | Connected account name |
| access_token | String | Platform access credential |
| status | String | Connection status |
| created_at | DateTime | Connection creation time |

## 3. Relationship

One User can have many Social Accounts.

Users
  |
  | 1 : Many
  |
Social Accounts