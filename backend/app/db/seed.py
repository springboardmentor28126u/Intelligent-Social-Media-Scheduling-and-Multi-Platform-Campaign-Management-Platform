import random
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, Base, engine
from app.db.models import (
    Role, Permission, RolePermission, User, Team, TeamMember,
    SocialPlatform, SocialAccount, Post, PostMedia, Campaign,
    Notification, Report, AuditLog
)
from app.core.security import hash_password, ROLE_DEFAULT_PERMISSIONS


def seed_database(db: Session = None, force: bool = False):
    is_internal = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        is_internal = True

    try:
        if force:
            for tbl in reversed(Base.metadata.sorted_tables):
                db.execute(tbl.delete())
            db.commit()
        else:
            # Check if admin user already exists
            existing_admin = db.query(User).filter(User.email == "admin@socialpilot.io").first()
            if existing_admin:
                print("Demo accounts already present in database.")
                return

        print("Seeding SocialPilot database with production-grade demo data...")

        # 1. Seed Roles
        roles_data = [
            ("administrator", "System Administrator", "Full control over users, security, system settings and audit logs."),
            ("business_user", "Business Owner", "Brand management, ROI tracking, campaign approvals and team overview."),
            ("marketing_team", "Marketing Manager", "Campaign execution, content scheduling, publishing queue and analytics."),
            ("content_creator", "Content Creator", "Content creation, media uploads, draft writing and approval requests.")
        ]
        
        roles_map = {}
        for r_name, d_name, desc in roles_data:
            role = db.query(Role).filter(Role.name == r_name).first()
            if not role:
                role = Role(name=r_name, display_name=d_name, description=desc)
                db.add(role)
                db.commit()
                db.refresh(role)
            roles_map[r_name] = role

        # 2. Seed Permissions
        permissions_list = [
            ("users.create", "Create Users", "users"),
            ("users.read", "Read Users", "users"),
            ("users.update", "Update Users", "users"),
            ("users.delete", "Delete Users", "users"),
            ("teams.create", "Create Teams", "teams"),
            ("teams.read", "View Teams", "teams"),
            ("teams.update", "Update Teams", "teams"),
            ("teams.delete", "Delete Teams", "teams"),
            ("teams.manage", "Manage Team Members", "teams"),
            ("roles.read", "Read Roles", "roles"),
            ("roles.manage", "Manage Roles & Permissions", "roles"),
            ("posts.create", "Create Posts", "posts"),
            ("posts.read", "View Posts", "posts"),
            ("posts.update", "Edit Posts", "posts"),
            ("posts.delete", "Delete Posts", "posts"),
            ("posts.publish", "Publish Posts Immediately", "posts"),
            ("posts.schedule", "Schedule Posts", "posts"),
            ("posts.approve", "Approve or Reject Posts", "posts"),
            ("posts.submit_approval", "Submit Posts for Approval", "posts"),
            ("campaigns.create", "Create Campaigns", "campaigns"),
            ("campaigns.read", "View Campaigns", "campaigns"),
            ("campaigns.manage", "Manage & Edit Campaigns", "campaigns"),
            ("campaigns.delete", "Delete Campaigns", "campaigns"),
            ("social_accounts.connect", "Connect Social Accounts", "social_accounts"),
            ("social_accounts.read", "View Social Accounts", "social_accounts"),
            ("social_accounts.manage", "Manage Connected Accounts", "social_accounts"),
            ("analytics.read", "View Analytics & Metrics", "analytics"),
            ("reports.generate", "Generate Reports", "reports"),
            ("reports.export", "Export PDF and Excel", "reports"),
            ("settings.manage", "Manage System Settings", "settings"),
            ("audit.read", "View Audit Logs", "audit"),
            ("system.monitor", "System Monitoring", "system"),
            ("media.upload", "Upload Media Assets", "media"),
            ("queue.manage", "Manage Publishing Queue", "queue"),
            ("calendar.read", "View Content Calendar", "calendar")
        ]

        perms_map = {}
        for p_code, p_name, p_module in permissions_list:
            perm = db.query(Permission).filter(Permission.code == p_code).first()
            if not perm:
                perm = Permission(code=p_code, name=p_name, module=p_module)
                db.add(perm)
                db.commit()
                db.refresh(perm)
            perms_map[p_code] = perm

        # Link Role Permissions
        for r_name, p_codes in ROLE_DEFAULT_PERMISSIONS.items():
            r_obj = roles_map.get(r_name)
            if r_obj:
                for p_code in p_codes:
                    if p_code in perms_map:
                        existing_rp = db.query(RolePermission).filter(
                            RolePermission.role_id == r_obj.id,
                            RolePermission.permission_id == perms_map[p_code].id
                        ).first()
                        if not existing_rp:
                            rp = RolePermission(role_id=r_obj.id, permission_id=perms_map[p_code].id)
                            db.add(rp)
        db.commit()

        # 3. Seed Professional Generic Demo Users
        password_hash = hash_password("password123")
        
        users_seed = [
            {
                "name": "Admin User",
                "email": "admin@socialpilot.io",
                "role": "administrator",
                "role_id": roles_map["administrator"].id,
                "job_title": "System Administrator",
                "company": "SocialPilot Technologies",
                "bio": "Lead System Administrator & Architect (Jenee).",
                "avatar_url": None
            },
            {
                "name": "Business User",
                "email": "business@socialpilot.io",
                "role": "business_user",
                "role_id": roles_map["business_user"].id,
                "job_title": "Business & Brand Director",
                "company": "Acme Global",
                "bio": "Managing multi-channel marketing campaigns and ROI.",
                "avatar_url": None
            },
            {
                "name": "Marketing User",
                "email": "marketing@socialpilot.io",
                "role": "marketing_team",
                "role_id": roles_map["marketing_team"].id,
                "job_title": "Marketing Campaign Lead",
                "company": "Acme Global",
                "bio": "Directing social content schedules, publishing pipelines and reports.",
                "avatar_url": None
            },
            {
                "name": "Content Creator",
                "email": "creator@socialpilot.io",
                "role": "content_creator",
                "role_id": roles_map["content_creator"].id,
                "job_title": "Content Creator (Jenee)",
                "company": "Acme Global",
                "bio": "Designing engaging visual stories, reels, carousels, and copy.",
                "avatar_url": None
            }
        ]

        created_users = {}
        for u_data in users_seed:
            user = User(
                name=u_data["name"],
                email=u_data["email"],
                password_hash=password_hash,
                role=u_data["role"],
                role_id=u_data["role_id"],
                job_title=u_data["job_title"],
                company=u_data["company"],
                bio=u_data["bio"],
                avatar_url=u_data["avatar_url"],
                is_active=True,
                is_verified=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            created_users[u_data["role"]] = user

        admin_user = created_users["administrator"]
        biz_user = created_users["business_user"]
        mkt_user = created_users["marketing_team"]
        creator_user = created_users["content_creator"]

        # 4. Seed Team
        team = Team(
            name="Acme Global Marketing Team",
            slug="acme-global-marketing",
            description="Global brand marketing and content distribution team.",
            owner_id=biz_user.id,
            avatar_url=None
        )
        db.add(team)
        db.commit()
        db.refresh(team)

        # Team Members
        members_seed = [
            (biz_user.id, "owner", True, True),
            (mkt_user.id, "manager", True, True),
            (creator_user.id, "member", False, False)
        ]
        for uid, r, cp, ca in members_seed:
            tm = TeamMember(team_id=team.id, user_id=uid, role=r, can_publish=cp, can_approve=ca)
            db.add(tm)
        db.commit()

        # 5. Seed Social Platforms
        platforms = [
            ("facebook", "Facebook", "facebook", 63206, True, True, True),
            ("instagram", "Instagram", "instagram", 2200, True, True, True),
            ("linkedin", "LinkedIn", "linkedin", 3000, True, True, False),
            ("twitter", "X / Twitter", "twitter", 280, True, True, False),
            ("youtube", "YouTube", "youtube", 5000, True, True, False),
            ("pinterest", "Pinterest", "pinterest", 500, True, False, False)
        ]
        for code, name, icon, lim, sm, sv, sc in platforms:
            sp = db.query(SocialPlatform).filter(SocialPlatform.code == code).first()
            if not sp:
                sp = SocialPlatform(code=code, name=name, icon=icon, character_limit=lim, supports_media=sm, supports_video=sv, supports_carousel=sc, is_active=True)
                db.add(sp)
        db.commit()

        # 6. Seed Social Accounts
        accounts_seed = [
            ("instagram", "Acme Official HQ", "@acme_official", None, 42800, 320, 185),
            ("facebook", "Acme Brand Global", "@acmebrand", None, 28400, 150, 240),
            ("linkedin", "Acme Enterprise", "@acme-enterprise", None, 19500, 480, 120),
            ("twitter", "Acme Updates", "@AcmeHQ", None, 35600, 890, 410),
            ("youtube", "Acme Channel", "@AcmeChannel", None, 12400, 45, 62),
            ("pinterest", "Acme Design", "@acmedesign", None, 8900, 210, 94)
        ]
        
        created_accounts = []
        for idx, (p_code, acc_name, handle, av, f_count, folling, p_count) in enumerate(accounts_seed):
            sa = SocialAccount(
                user_id=biz_user.id,
                team_id=team.id,
                platform=p_code,
                account_name=acc_name,
                account_handle=handle,
                account_id=f"{p_code}_id_{10000 + idx}",
                avatar_url=av,
                access_token=f"mock_token_{p_code}_seed",
                followers_count=0,
                following_count=0,
                posts_count=0,
                is_active=True,
                is_demo=True
            )
            db.add(sa)
            created_accounts.append(sa)
        db.commit()

        # 7. Seed Campaigns
        now = datetime.now(timezone.utc)
        camps_seed = [
            ("Summer Product Launch 2026", "Global multi-platform launch of Acme 2.0 with video previews, feature carousels and influencer partnerships.", "Instagram + Facebook", "active", now - timedelta(days=10), now + timedelta(days=20), 5000.0, 3200.0, 75000, 52400, 5.8, 3.4),
            ("Q3 Brand Awareness Drive", "Thought leadership series, executive interviews, and industry trend reports targeting enterprise clients.", "LinkedIn", "active", now - timedelta(days=5), now + timedelta(days=25), 8000.0, 4400.0, 90000, 48200, 8.2, 2.9),
            ("Flash Weekend Promotion", "48-hour promotional coupon campaign offering 30% discount on annual subscriptions.", "Instagram + Twitter", "completed", now - timedelta(days=20), now - timedelta(days=5), 2500.0, 2480.0, 40000, 42100, 14.6, 4.8),
            ("Developer Platform Launch", "Announcing new REST APIs, webhooks and SDK integrations for enterprise developers.", "Twitter + LinkedIn", "active", now - timedelta(days=2), now + timedelta(days=30), 4000.0, 1200.0, 35000, 18500, 6.4, 2.5)
        ]

        created_camps = []
        for name, desc, plat, st, s_d, e_d, budg, spent, t_reach, a_reach, eng, roi in camps_seed:
            camp = Campaign(
                user_id=biz_user.id,
                team_id=team.id,
                name=name,
                description=desc,
                platform=plat,
                status=st,
                start_date=s_d,
                end_date=e_d,
                budget=budg,
                spent=spent,
                currency="USD",
                target_reach=t_reach,
                actual_reach=a_reach,
                actual_engagement=eng,
                roi=roi,
                color="#2563eb" if "Summer" in name else "#10b981" if "Brand" in name else "#8b5cf6"
            )
            db.add(camp)
            created_camps.append(camp)
        db.commit()

        # 8. Seed Posts
        posts_seed = [
            {
                "title": "Summer Product Launch - Keynote Teaser",
                "content": "✨ Big things are arriving this summer! Get ready for next-generation collaboration tools built for high-velocity teams. #ProductLaunch #Innovation #SaaS",
                "platform": "instagram",
                "post_type": "image",
                "status": "published",
                "scheduled_at": now - timedelta(days=2),
                "published_at": now - timedelta(days=2),
                "user_id": creator_user.id,
                "campaign_id": created_camps[0].id,
                "social_account_id": created_accounts[0].id,
                "likes": 2450,
                "comments": 184,
                "shares": 92,
                "reach": 38400,
                "impressions": 58200,
                "media_url": None
            },
            {
                "title": "Scaling Cloud Infrastructure in 2026",
                "content": "How our engineering team scaled microservices to process over 100M events per day with sub-50ms latency. Read our complete architecture deep dive: https://socialpilot.io/blog/scaling #DevOps #Engineering #TechLeadership",
                "platform": "linkedin",
                "post_type": "text",
                "status": "published",
                "scheduled_at": now - timedelta(days=1),
                "published_at": now - timedelta(days=1),
                "user_id": mkt_user.id,
                "campaign_id": created_camps[1].id,
                "social_account_id": created_accounts[2].id,
                "likes": 840,
                "comments": 92,
                "shares": 140,
                "reach": 18200,
                "impressions": 34100,
                "media_url": None
            },
            {
                "title": "Customer Spotlight & Success Story",
                "content": "'SocialPilot reduced our content scheduling overhead by 70% in the first 30 days.' - VP of Marketing at HyperGrowth Inc. 🚀 #CustomerLove #MarketingAutomation",
                "platform": "facebook",
                "post_type": "image",
                "status": "published",
                "scheduled_at": now - timedelta(hours=14),
                "published_at": now - timedelta(hours=14),
                "user_id": creator_user.id,
                "campaign_id": created_camps[0].id,
                "social_account_id": created_accounts[1].id,
                "likes": 420,
                "comments": 38,
                "shares": 25,
                "reach": 12400,
                "impressions": 21800,
                "media_url": None
            },
            {
                "title": "Weekend Feature Spotlight: AI Auto-Captioning",
                "content": "Never write social captions from scratch again. Generate tailored captions for 6 platforms in seconds with our integrated AI assistant! ⚡️ #AI #Productivity #ContentCreation",
                "platform": "twitter",
                "post_type": "text",
                "status": "scheduled",
                "scheduled_at": now + timedelta(days=1, hours=3),
                "user_id": mkt_user.id,
                "campaign_id": created_camps[0].id,
                "social_account_id": created_accounts[3].id,
                "media_url": None
            },
            {
                "title": "Weekly Strategy & Analytics Review",
                "content": "Join our live webinar this Thursday covering top organic reach algorithms in 2026. Register free today at socialpilot.io/webinars 📅 #SocialMediaTips #Growth",
                "platform": "linkedin",
                "post_type": "image",
                "status": "scheduled",
                "scheduled_at": now + timedelta(days=3, hours=5),
                "user_id": creator_user.id,
                "campaign_id": created_camps[1].id,
                "social_account_id": created_accounts[2].id,
                "media_url": None
            },
            {
                "title": "Brand Redesign Moodboard & Palette",
                "content": "Exploring minimalist aesthetics and vibrant indigo hues for our upcoming digital assets. 🎨 #DesignSystem #UI #CreativeDirection",
                "platform": "pinterest",
                "post_type": "image",
                "status": "pending_approval",
                "scheduled_at": now + timedelta(days=2),
                "user_id": creator_user.id,
                "campaign_id": None,
                "social_account_id": created_accounts[5].id,
                "media_url": None
            },
            {
                "title": "Deep Dive Video Demo - Multi-Account Scheduling",
                "content": "Master your publishing calendar with SocialPilot's unified queue, drag-and-drop calendar and instant live social preview. 📺 #Tutorial #SocialPilot",
                "platform": "youtube",
                "post_type": "video",
                "status": "draft",
                "scheduled_at": None,
                "user_id": creator_user.id,
                "campaign_id": created_camps[3].id,
                "social_account_id": created_accounts[4].id,
                "media_url": None
            }
        ]

        for p_info in posts_seed:
            post = Post(
                user_id=p_info["user_id"],
                team_id=team.id,
                campaign_id=p_info.get("campaign_id"),
                social_account_id=p_info.get("social_account_id"),
                title=p_info.get("title"),
                content=p_info["content"],
                platform=p_info["platform"],
                post_type=p_info.get("post_type", "text"),
                status=p_info["status"],
                scheduled_at=p_info.get("scheduled_at"),
                published_at=p_info.get("published_at"),
                likes_count=p_info.get("likes", 0),
                comments_count=p_info.get("comments", 0),
                shares_count=p_info.get("shares", 0),
                reach_count=p_info.get("reach", 0),
                impressions_count=p_info.get("impressions", 0)
            )
            db.add(post)
            db.commit()
            db.refresh(post)

        # 9. Seed Notifications
        notifications_seed = [
            (admin_user.id, "System Running Smoothly 🚀", "All publishing workers, scheduler and Redis queues are operational.", "system_alert", "/admin/users"),
            (biz_user.id, "Summer Campaign 70% Goal Reached 🎯", "Your campaign 'Summer Product Launch' exceeded 50,000 target reach.", "campaign_alert", "/campaigns"),
            (mkt_user.id, "Post Published Successfully! 🎉", "Your LinkedIn post 'Scaling Cloud Infrastructure' is live and receiving high engagement.", "publish_success", "/posts"),
            (creator_user.id, "Review Requested for Draft 📝", "Content Creator (Jenee) submitted 'Brand Redesign Moodboard' for manager approval.", "team_invite", "/posts")
        ]
        for uid, title, msg, n_type, link in notifications_seed:
            notif = Notification(user_id=uid, title=title, message=msg, type=n_type, link=link, is_read=False)
            db.add(notif)
        db.commit()

        # 10. Seed Audit Logs
        logs_seed = [
            (admin_user.id, admin_user.email, "system.init", "system", "Initialized system core, RBAC permissions and default roles."),
            (biz_user.id, biz_user.email, "team.created", "teams", "Created team 'Acme Global Marketing'"),
            (biz_user.id, biz_user.email, "social_account.connected", "social_accounts", "Connected Instagram, Facebook, LinkedIn and Twitter accounts."),
            (mkt_user.id, mkt_user.email, "campaign.created", "campaigns", "Launched 'Summer Product Launch 2026' campaign."),
            (creator_user.id, creator_user.email, "post.published", "posts", "Published launch announcement post to Instagram by Jenee."),
            (admin_user.id, admin_user.email, "auth.login", "auth", "Admin User logged into dashboard.")
        ]
        for uid, uemail, act, mod, desc in logs_seed:
            al = AuditLog(user_id=uid, user_email=uemail, action=act, module=mod, description=desc, status="success")
            db.add(al)
        db.commit()

        print("Database seed completed successfully! All 4 standard demo accounts are ready.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        if is_internal:
            db.close()


if __name__ == "__main__":
    seed_database()
