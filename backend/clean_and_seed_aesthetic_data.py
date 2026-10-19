import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from database import SessionLocal
from models import User, SocialAccount, Post, PostStatus, Campaign

load_dotenv()

def run_cleanup_and_seed():
    db = SessionLocal()
    try:
        dimple = db.query(User).filter(User.email == 'dimplethatireddy@gmail.com').first()
        if not dimple:
            print("User dimplethatireddy@gmail.com not found!")
            return

        dimple_id = dimple.id
        print(f"Purging old/duplicate test data for user {dimple.email} (ID: {dimple_id})...")

        # 1. Clean out junk posts
        deleted_count = 0
        all_posts = db.query(Post).all()
        for p in all_posts:
            # Delete junk / test posts
            c = (p.content or "").strip().lower()
            if not c or c in ["hii", "hello", "trail 1", "test", "string"] or "milestone 4" in c or "verification post" in c or "trail" in c:
                db.delete(p)
                deleted_count += 1
        
        db.commit()
        print(f"Deleted {deleted_count} junk/duplicate test posts.")

        # 2. Clean up campaigns
        existing_campaigns = db.query(Campaign).all()
        for camp in existing_campaigns:
            if camp.name.lower() in ["instagram", "test campaign", "diwali social media campaign"]:
                db.delete(camp)
        db.commit()

        # Seed 3 aesthetic campaigns for Dimple if not already present
        campaign_defs = [
            {
                "name": "Autumn Brand Showcase 2026",
                "platform": "Instagram, Pinterest",
                "status": "active",
                "budget": 28000.0,
                "spent": 12400.0,
                "description": "Visual storytelling, editorial photo spreads, and aesthetic autumnal design inspirations.",
            },
            {
                "name": "Product Studio V3 Launch",
                "platform": "LinkedIn, Twitter, YouTube",
                "status": "active",
                "budget": 45000.0,
                "spent": 24800.0,
                "description": "Enterprise omni-channel platform launch featuring interactive walk-throughs and design masterclasses.",
            },
            {
                "name": "Creator Community Spotlight",
                "platform": "Instagram, Facebook, YouTube",
                "status": "active",
                "budget": 16000.0,
                "spent": 8500.0,
                "description": "Highlighting high-growth creators, founder interviews, and community engagement initiatives.",
            },
        ]

        created_campaigns = []
        for cdef in campaign_defs:
            existing = db.query(Campaign).filter(Campaign.name == cdef["name"], Campaign.user_id == dimple_id).first()
            if not existing:
                camp = Campaign(
                    user_id=dimple_id,
                    name=cdef["name"],
                    platform=cdef["platform"],
                    status=cdef["status"],
                    budget=cdef["budget"],
                    spent=cdef["spent"],
                    description=cdef["description"],
                    start_date=datetime.utcnow() - timedelta(days=14),
                    end_date=datetime.utcnow() + timedelta(days=30),
                )
                db.add(camp)
                db.commit()
                db.refresh(camp)
                created_campaigns.append(camp)
            else:
                created_campaigns.append(existing)

        camp_autumn = created_campaigns[0].id if created_campaigns else None
        camp_studio = created_campaigns[1].id if len(created_campaigns) > 1 else None
        camp_community = created_campaigns[2].id if len(created_campaigns) > 2 else None

        # 3. Seed 8 Curated, High-Aesthetic Posts
        # Wipe remaining posts for Dimple to guarantee a pristine, zero-duplicate feed
        db.query(Post).filter(Post.user_id == dimple_id).delete()
        db.commit()

        now = datetime.utcnow()
        aesthetic_posts = [
            {
                "content": "Minimalism isn't about having less—it's about making room for what truly matters. Introducing our 2026 editorial identity: clean typography, tactile negative space, and tonal calm. ✨ #MinimalistDesign #BrandIdentity #CreativeDirection",
                "platforms": ["instagram", "pinterest"],
                "content_type": "carousel",
                "media_url": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80",
                "status": PostStatus.PUBLISHED,
                "scheduled_at": now - timedelta(days=2, hours=4),
                "campaign_id": camp_autumn,
            },
            {
                "content": "The best digital experiences feel invisible. 5 foundational UX tenets we implemented in SocialPilot Studio V3 to turn complex scheduling into effortless daily flow. 💡 #ProductDesign #UXStrategy #SaaSSystems",
                "platforms": ["linkedin", "twitter"],
                "content_type": "image",
                "media_url": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
                "status": PostStatus.PUBLISHED,
                "scheduled_at": now - timedelta(days=1, hours=6),
                "campaign_id": camp_studio,
            },
            {
                "content": "Masterclass 04: Architecting Omni-Channel Content Velocity. How high-impact teams publish across 6 networks without sacrificing bespoke craft. 🎬 Full session streaming on YouTube now!",
                "platforms": ["youtube", "linkedin"],
                "content_type": "video",
                "media_url": "https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=1200&q=80",
                "status": PostStatus.PUBLISHED,
                "scheduled_at": now - timedelta(hours=18),
                "campaign_id": camp_studio,
            },
            {
                "content": "Autumn palette explorations from the studio desk. Golden light, linen textures, and architectural silhouettes. Which frame speaks to your vision? 📸🍂 #StudioDiaries #VisualAesthetics #ColorPalette",
                "platforms": ["instagram", "pinterest"],
                "content_type": "reels",
                "media_url": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80",
                "status": PostStatus.PUBLISHED,
                "scheduled_at": now - timedelta(hours=4),
                "campaign_id": camp_autumn,
            },
            {
                "content": "A milestone worth celebrating: Over 300,000 creators, brand founders, and agencies are now orchestrating their visual presence through SocialPilot. Deep gratitude to this community! 🥂🤍 #Milestone #CommunityGrowth",
                "platforms": ["facebook", "linkedin", "twitter"],
                "content_type": "image",
                "media_url": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
                "status": PostStatus.SCHEDULED,
                "scheduled_at": now + timedelta(hours=5),
                "campaign_id": camp_community,
            },
            {
                "content": "Inside the Design Sprint: Rapid prototyping for real-time campaign attribution. What metrics does your leadership team prioritize most when evaluating social ROI? 📊 #GrowthMarketing #BrandMetrics",
                "platforms": ["twitter", "linkedin"],
                "content_type": "text",
                "media_url": None,
                "status": PostStatus.SCHEDULED,
                "scheduled_at": now + timedelta(days=1, hours=3),
                "campaign_id": camp_studio,
            },
            {
                "content": "Behind the lens: Curating sensory editorial campaigns. A preview of our upcoming capsule collaboration dropping this Friday. Set your reminders! ⏳✨ #Editorial #CampaignPreview",
                "platforms": ["instagram", "facebook"],
                "content_type": "story",
                "media_url": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
                "status": PostStatus.SCHEDULED,
                "scheduled_at": now + timedelta(days=2, hours=1),
                "campaign_id": camp_autumn,
            },
            {
                "content": "Curated Nordics Moodboard: Warm oak, organic forms, and functional studio acoustics. Perfect creative spaces inspire extraordinary work. Save to your moodboard. 🏡🤍 #NordicDesign #SpatialAesthetics",
                "platforms": ["pinterest", "instagram"],
                "content_type": "image",
                "media_url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
                "status": PostStatus.SCHEDULED,
                "scheduled_at": now + timedelta(days=3, hours=4),
                "campaign_id": camp_autumn,
            },
        ]

        for pdata in aesthetic_posts:
            post_obj = Post(
                user_id=dimple_id,
                content=pdata["content"],
                platforms=pdata["platforms"],
                content_type=pdata["content_type"],
                media_url=pdata["media_url"],
                status=pdata["status"],
                scheduled_at=pdata["scheduled_at"],
                campaign_id=pdata["campaign_id"],
            )
            db.add(post_obj)

        db.commit()
        print(f"Successfully seeded {len(aesthetic_posts)} pristine aesthetic posts for Dimple Thatireddy!")

    except Exception as e:
        db.rollback()
        print(f"Error during cleanup: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_cleanup_and_seed()
