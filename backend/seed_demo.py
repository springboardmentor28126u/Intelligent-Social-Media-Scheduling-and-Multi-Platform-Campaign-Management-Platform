import argparse
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.database.postgres import SessionLocal
from app.models.campaign import Campaign
from app.models.post import Post
from app.models.publishing_log import PublishingLog
from app.models.social_account import SocialAccount
from app.models.user import User


INDIA_TIMEZONE = ZoneInfo("Asia/Kolkata")


def seed_demo_data(email):
    db = SessionLocal()
    created = {"accounts": 0, "campaigns": 0, "posts": 0, "logs": 0}

    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise ValueError(f"No user found with email {email!r}.")

        now = datetime.now(INDIA_TIMEZONE).replace(tzinfo=None, second=0, microsecond=0)

        account_specs = [
            ("facebook", "demo_dussehra_page", "DEMO-FB-PAGE-01", None),
            ("instagram", "demo_brand_instagram", None, None),
            ("linkedin", "demo_company_page", None, "DEMO-LI-CHANNEL-01"),
        ]
        accounts = {}
        for platform, username, page_id, channel_id in account_specs:
            account = (
                db.query(SocialAccount)
                .filter_by(user_id=user.id, platform=platform, username=username)
                .first()
            )
            if account is None:
                account = SocialAccount(
                    user_id=user.id,
                    platform=platform,
                    username=username,
                    page_id=page_id,
                    channel_id=channel_id,
                    access_token=None,
                    refresh_token=None,
                )
                db.add(account)
                db.flush()
                created["accounts"] += 1
            accounts[platform] = account

        campaign_specs = [
            {
                "name": "Demo | Dussehra 2026",
                "description": "A seasonal launch campaign for festival offers.",
                "objective": "Awareness and website traffic",
                "target_audience": "Existing customers and local shoppers",
                "budget": 2500,
                "accounts": ("facebook", "instagram"),
            },
            {
                "name": "Demo | October Product Tips",
                "description": "A short educational series introducing product features.",
                "objective": "Engagement and lead generation",
                "target_audience": "Small business owners and marketing teams",
                "budget": 1800,
                "accounts": ("linkedin", "instagram"),
            },
        ]
        campaigns = {}
        for spec in campaign_specs:
            campaign = (
                db.query(Campaign)
                .filter_by(user_id=user.id, name=spec["name"])
                .first()
            )
            if campaign is None:
                campaign = Campaign(
                    user_id=user.id,
                    name=spec["name"],
                    description=spec["description"],
                    objective=spec["objective"],
                    target_audience=spec["target_audience"],
                    status="Active",
                    start_date=now.date(),
                    end_date=(now + timedelta(days=21)).date(),
                    budget=spec["budget"],
                )
                db.add(campaign)
                db.flush()
                created["campaigns"] += 1
            for platform in spec["accounts"]:
                account = accounts[platform]
                if account not in campaign.social_accounts:
                    campaign.social_accounts.append(account)
            campaigns[spec["name"]] = campaign

        post_specs = [
            {
                "content": "Demo: Celebrate Dussehra with 20% off selected favorites. Offer ends this week!",
                "account": "facebook",
                "campaign": "Demo | Dussehra 2026",
                "status": "scheduled",
                "scheduled_at": (now + timedelta(days=1)).replace(hour=10, minute=30),
                "media_type": None,
            },
            {
                "content": "Demo: A little festive color for your feed. Which detail is your favorite?",
                "account": "instagram",
                "campaign": "Demo | Dussehra 2026",
                "status": "scheduled",
                "scheduled_at": (now + timedelta(days=1)).replace(hour=11, minute=0),
                "media_type": None,
            },
            {
                "content": "Demo: Three small workflow changes that give your team more time for customers.",
                "account": "linkedin",
                "campaign": "Demo | October Product Tips",
                "status": "scheduled",
                "scheduled_at": (now + timedelta(days=3)).replace(hour=9, minute=15),
                "media_type": None,
            },
            {
                "content": "Demo: Meet the people behind the product. Thanks for being part of our community.",
                "account": "instagram",
                "campaign": "Demo | October Product Tips",
                "status": "published",
                "scheduled_at": None,
                "published_at": now - timedelta(days=2),
                "platform_post_id": "demo-instagram-post-001",
                "media_type": None,
            },
            {
                "content": "Demo: Our weekly tips are back. Save this post for your next planning session.",
                "account": "linkedin",
                "campaign": "Demo | October Product Tips",
                "status": "failed",
                "scheduled_at": now - timedelta(hours=1),
                "error_message": "Demo publishing failure: reconnect the mock account to retry.",
                "media_type": None,
            },
            {
                "content": "Demo: Reminder for the upcoming seasonal collection.",
                "account": "facebook",
                "campaign": "Demo | Dussehra 2026",
                "status": "cancelled",
                "scheduled_at": None,
                "media_type": None,
            },
            {
                "content": "Demo draft: Add your final product details before scheduling this post.",
                "account": "instagram",
                "campaign": "Demo | October Product Tips",
                "status": "draft",
                "scheduled_at": None,
                "media_type": None,
            },
        ]

        for spec in post_specs:
            account = accounts[spec["account"]]
            post = (
                db.query(Post)
                .filter_by(
                    user_id=user.id,
                    social_account_id=account.id,
                    content=spec["content"],
                )
                .first()
            )
            if post is None:
                post = Post(
                    user_id=user.id,
                    social_account_id=account.id,
                    campaign_id=campaigns[spec["campaign"]].id,
                    content=spec["content"],
                    status=spec["status"],
                    scheduled_at=spec.get("scheduled_at"),
                    published_at=spec.get("published_at"),
                    platform_post_id=spec.get("platform_post_id"),
                    error_message=spec.get("error_message"),
                    media_type=spec["media_type"],
                )
                db.add(post)
                db.flush()
                created["posts"] += 1

            log_status = spec.get("status")
            if log_status in ("published", "failed"):
                log_message = spec.get("error_message") or "Demo post published successfully."
                existing_log = (
                    db.query(PublishingLog)
                    .filter_by(post_id=post.id, status=log_status, message=log_message)
                    .first()
                )
                if existing_log is None:
                    db.add(PublishingLog(
                        post_id=post.id,
                        user_id=user.id,
                        social_account_id=account.id,
                        platform=account.platform,
                        status=log_status,
                        message=log_message,
                        published_at=spec.get("published_at", now - timedelta(hours=1)),
                    ))
                    created["logs"] += 1

        db.commit()
        return created
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Add sample SocialPilot data for an existing user.")
    parser.add_argument("--email", required=True, help="Email of the existing SocialPilot user to seed")
    args = parser.parse_args()

    try:
        created = seed_demo_data(args.email)
    except ValueError as error:
        parser.error(str(error))

    print(f"Demo data ready for user {args.email}.")
    print("Created: " + ", ".join(f"{count} {name}" for name, count in created.items()))
    print("Demo social accounts have no access tokens and cannot publish to real platforms.")


if __name__ == "__main__":
    main()