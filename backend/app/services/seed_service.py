from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.models.user import User
from app.models.team import Team, TeamMember
from app.models.social_account import SocialAccount
from app.models.post import Post
from app.models.campaign import Campaign
from app.models.notification import Notification
from app.models.report import Report

def seed_database(db: Session):
    # Preserve existing demo data while normalizing the advertised login email.
    existing_user = db.query(User).filter(
        (User.email == "admin@socialpilot.com") | (User.email == "admin@intellipost.com")
    ).first()
    if existing_user:
        if existing_user.email == "admin@socialpilot.com":
            existing_user.email = "admin@intellipost.com"
            db.query(TeamMember).filter(TeamMember.user_id == existing_user.id).update(
                {"email": "admin@intellipost.com"}
            )
            db.commit()
        return

    # 1. Create Admin User
    admin = User(
        name="Chandu",
        email="admin@intellipost.com",
        hashed_password=get_password_hash("password123"),
        role="Admin",
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    # 2. Create Team & Members
    team = Team(
        name="SocialPilot Growth Team",
        description="Core marketing, design, and content strategy workspace."
    )
    db.add(team)
    db.commit()
    db.refresh(team)

    members = [
        TeamMember(
            team_id=team.id,
            user_id=admin.id,
            name="Chandu",
            email="admin@intellipost.com",
            role="Admin",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            permissions="view,create,edit,delete,publish,analytics,manage_team",
            status="Active"
        ),
        TeamMember(
            team_id=team.id,
            name="Aarav Sharma",
            email="aarav@socialpilot.com",
            role="Content Creator",
            avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
            permissions="view,create,edit,publish",
            status="Active"
        ),
        TeamMember(
            team_id=team.id,
            name="Priya Patel",
            email="priya@socialpilot.com",
            role="Marketing Team",
            avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
            permissions="view,create,edit,publish,analytics",
            status="Active"
        ),
        TeamMember(
            team_id=team.id,
            name="Rahul Verma",
            email="rahul@socialpilot.com",
            role="Business User",
            avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
            permissions="view,analytics",
            status="Active"
        )
    ]
    db.add_all(members)

    # 3. Social accounts are deliberately initialized clean (0 connected) so the user connects their own accounts fresh!

    # 4. Create Campaigns
    now = datetime.now(timezone.utc)
    campaign1 = Campaign(
        user_id=admin.id,
        name="Product Launch 2.0",
        description="Comprehensive cross-platform launch campaign for SocialPilot AI features.",
        platforms="instagram,facebook,linkedin",
        start_date=now - timedelta(days=5),
        end_date=now + timedelta(days=10),
        budget=12500.0,
        objective="Increase Product Awareness",
        status="Active",
        progress_percent=78,
        target_reach=150000,
        actual_reach=125000,
        target_engagement=40000,
        actual_engagement=32000
    )
    campaign2 = Campaign(
        user_id=admin.id,
        name="Q3 Thought Leadership",
        description="Weekly executive insights and AI industry frameworks on LinkedIn and Twitter.",
        platforms="linkedin,twitter",
        start_date=now - timedelta(days=12),
        end_date=now + timedelta(days=18),
        budget=8000.0,
        objective="Drive B2B Lead Generation",
        status="Active",
        progress_percent=62,
        target_reach=100000,
        actual_reach=84000,
        target_engagement=25000,
        actual_engagement=19400
    )
    db.add_all([campaign1, campaign2])
    db.commit()
    db.refresh(campaign1)

    # 5. Create Sample Posts (Published & Scheduled)
    sample_posts = [
        Post(
            user_id=admin.id,
            campaign_id=campaign1.id,
            content="🚀 Excited to announce SocialPilot 2.0! Schedule across 6 platforms simultaneously with AI-powered captions, hashtag suggestions, and smart calendar workflows.",
            instagram_content="🚀 Excited to announce SocialPilot 2.0!\n\nSchedule across 6 platforms simultaneously with AI-powered captions, hashtag suggestions, and smart calendar workflows.\n\n✨ Drop a comment below!\n#SocialPilot #SocialGrowth #Creators #MarketingAutomation",
            linkedin_content="We are thrilled to unveil SocialPilot 2.0.\n\nModern growth marketing requires agile workflows and intelligent distribution. SocialPilot gives marketing teams the precision they need.\n\n#GrowthStrategy #SocialMedia #Innovation",
            twitter_content="🚀 SocialPilot 2.0 is LIVE! Smart multi-platform scheduling, AI captions & real-time analytics all in one workspace.\n\nCheck it out 👉 socialpilot.com #BuildInPublic",
            platforms="instagram,facebook,linkedin,twitter",
            media_url="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80",
            status="Published",
            published_at=now - timedelta(days=1),
            likes_count=184,
            comments_count=32,
            shares_count=28,
            clicks_count=412,
            reach_count=18400,
            is_ai_generated=True
        ),
        Post(
            user_id=admin.id,
            campaign_id=campaign1.id,
            content="🔥 Behind the scenes: How our marketing team plans 30 days of high-converting social media content in under 2 hours.",
            platforms="instagram,facebook,linkedin,twitter",
            media_url="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80",
            status="Scheduled",
            scheduled_at=now + timedelta(hours=4),
            is_ai_generated=True
        ),
        Post(
            user_id=admin.id,
            content="Draft: Upcoming feature announcement regarding automated PDF and Excel analytics exports.",
            platforms="twitter,linkedin",
            status="Draft",
            is_ai_generated=False
        )
    ]
    db.add_all(sample_posts)

    # 6. Create Notifications
    notifications = [
        Notification(
            user_id=admin.id,
            title="Welcome to SocialPilot 👋",
            message="Your workspace is initialized and ready. Connect your social channels to start scheduling.",
            category="System",
            type="info",
            action_url="/dashboard/social-accounts"
        ),
        Notification(
            user_id=admin.id,
            title="Post Scheduled Successfully ⏰",
            message="Scheduled 'Behind the scenes...' for today at peak engagement window.",
            category="Publishing",
            type="info",
            action_url="/dashboard/calendar"
        )
    ]
    db.add_all(notifications)

    db.commit()
