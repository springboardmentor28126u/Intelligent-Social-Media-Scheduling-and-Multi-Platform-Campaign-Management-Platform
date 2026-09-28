import random
from typing import List, Dict
from app.schemas.ai import (
    AIGenerateCaptionRequest, AIGenerateCaptionResponse, PlatformAdaptations,
    AIAdaptContentRequest, AIAdaptContentResponse,
    AIHashtagSuggestionRequest, AIHashtagSuggestionResponse
)

class AIService:
    @staticmethod
    def generate_caption(req: AIGenerateCaptionRequest) -> AIGenerateCaptionResponse:
        topic = req.topic.strip()
        tone = req.tone or "Engaging"
        
        # Tone-specific prefixes and styles
        tone_starters = {
            "Professional": [
                f"In today's fast-evolving landscape, focusing on {topic} is more critical than ever.",
                f"Key strategic insights on {topic} for industry leaders and innovators:",
                f"Mastering {topic} requires consistency, precision, and continuous learning."
            ],
            "Engaging": [
                f"✨ Big things happening with {topic}! Here is what you need to know right now 👇",
                f"Are you ready to level up your {topic} game? Let's break it down step-by-step!",
                f"Ever wondered what makes {topic} truly stand out? Here is the secret sauce 🚀"
            ],
            "Inspiring": [
                f"Every great breakthrough starts with a single step. When it comes to {topic}, keep pushing the boundaries!",
                f"Dream big, stay focused, and never underestimate the power of mastering {topic}.",
                f"Success in {topic} is built on dedication, patience, and relentless execution."
            ],
            "Humorous": [
                f"Plot twist: Nobody actually has {topic} 100% figured out, but we are making it look effortlessly awesome anyway! 😄",
                f"Me: I'm going to take a break.\nAlso me: Stays up rethinking {topic} until 3 AM. Anyone else? 😂",
                f"Why overcomplicate {topic} when you can do it with style and a cup of coffee? ☕"
            ],
            "Urgent": [
                f"⚡ Don't miss out! Major updates on {topic} that you need to act on today.",
                f"Time is ticking! Here is the essential checklist for {topic} before it's too late ⏳",
                f"Urgent reminder: Take control of your {topic} strategy right now!"
            ],
            "Casual": [
                f"Quick thoughts on {topic} — here is what we've been noticing lately.",
                f"Just dropped a fresh update on {topic}! What do you all think about this?",
                f"Let's talk about {topic} for a minute. Drop your hot takes below!"
            ]
        }

        starter_options = tone_starters.get(tone, tone_starters["Engaging"])
        starter = random.choice(starter_options)

        # Call to actions
        ctas = [
            "👉 What are your thoughts on this? Comment below!",
            "🔥 Save this post for your next campaign planning session!",
            "💬 Drop a 'YES' in the comments if you agree!",
            "🔗 Click the link in bio to read our complete guide!",
            "🚀 Share this with someone who needs to hear this today!"
        ]
        selected_cta = random.choice(ctas) if req.include_cta else ""

        # Dynamic hashtags
        clean_words = [w.lower().replace('#', '').strip('.,!?') for w in topic.split() if len(w) > 3]
        base_tags = [f"#{w}" for w in clean_words[:3]]
        standard_tags = ["#GrowthMarketing", "#DigitalStrategy", "#SocialMediaTips", "#Innovation", "#IntelliPost", "#ContentCreator", "#TechTrends"]
        combined_tags = list(dict.fromkeys(base_tags + standard_tags))[:6]

        primary_caption = f"{starter}\n\nHere are 3 core principles we follow:\n1. Clarity over complexity\n2. Real engagement over vanity metrics\n3. Consistent, data-driven optimization\n\n{selected_cta}"

        # Platform specific adaptations
        instagram_adaptation = f"{starter}\n\n✨ 3 Quick Takeaways:\n🔹 Focus on high-value impact\n🔹 Connect genuinely with your audience\n🔹 Track your analytics weekly\n\n{selected_cta}\n\n" + " ".join(combined_tags + ["#InstaGrowth", "#CreatorEconomy", "#VisualStorytelling"])

        linkedin_adaptation = f"{starter}\n\nIn our latest analysis on {topic}, we observed three significant shifts:\n\n1. Strategic Alignment: Prioritizing long-term relationship building over one-off tactics.\n2. Agile Execution: Testing hypotheses rapidly and iterating based on quantitative feedback.\n3. Collaborative Growth: Empowering cross-functional teams to contribute authentic perspectives.\n\n{selected_cta}\n\n" + " ".join(combined_tags[:4] + ["#Leadership", "#ProfessionalGrowth", "#Strategy"])

        twitter_adaptation = f"🚀 Quick take on {topic}:\n\n1. Double down on what works\n2. Keep your messaging punchy\n3. Engage daily\n\n{selected_cta[:40]}...\n\n{' '.join(combined_tags[:3])}"
        if len(twitter_adaptation) > 270:
            twitter_adaptation = twitter_adaptation[:260] + "... " + combined_tags[0]

        facebook_adaptation = f"{starter}\n\nWe love seeing how our community tackles {topic}! What has been your biggest win or learning curve recently?\n\n{selected_cta}\n\n" + " ".join(combined_tags[:3])

        youtube_adaptation = f"In this video, we dive deep into {topic} and give you actionable step-by-step strategies.\n\n📌 Timestamps:\n0:00 - Introduction to {topic}\n01:45 - Key Frameworks\n04:30 - Real-World Examples\n08:15 - Action Plan\n\n🔔 Subscribe to IntelliPost for weekly growth tactics!\n\n" + " ".join(combined_tags[:4])

        pinterest_adaptation = f"Looking for the best guide on {topic}? Pin this visual roadmap to your board for instant inspiration and practical tips! ✨\n\n" + " ".join(combined_tags[:5])

        best_times_pool = [
            "Today at 10:30 AM (Peak Audience Active Window)",
            "Today at 3:15 PM (High Engagement Window)",
            "Tomorrow at 9:00 AM (Recommended for B2B / LinkedIn)",
            "Tomorrow at 6:45 PM (Recommended for B2C / Instagram)",
        ]

        return AIGenerateCaptionResponse(
            primary_caption=primary_caption,
            hashtags=combined_tags,
            call_to_action=selected_cta,
            best_time_to_post=random.choice(best_times_pool),
            recommended_days=["Tuesday", "Wednesday", "Thursday"],
            adaptations=PlatformAdaptations(
                instagram=instagram_adaptation,
                linkedin=linkedin_adaptation,
                twitter=twitter_adaptation,
                facebook=facebook_adaptation,
                youtube=youtube_adaptation,
                pinterest=pinterest_adaptation
            )
        )

    @staticmethod
    def adapt_content(req: AIAdaptContentRequest) -> AIAdaptContentResponse:
        platform = req.target_platform.lower()
        content = req.content.strip()

        if platform == "instagram":
            adapted = f"✨ {content}\n\n---\n💬 Save this post & share with your team!\n#IntelliPost #SocialGrowth #Creators"
            tags = ["#IntelliPost", "#SocialGrowth", "#Creators", "#InstagramTips"]
        elif platform == "linkedin":
            adapted = f"Insights on modern execution:\n\n{content}\n\nWhat are your key observations on this? Let's discuss in the comments.\n\n#BusinessStrategy #Leadership #Growth"
            tags = ["#BusinessStrategy", "#Leadership", "#Growth", "#Innovation"]
        elif platform in ["twitter", "x"]:
            # Trim to 270 chars
            base = content[:200]
            adapted = f"{base}\n\n👉 What's your take? #Thread #Growth"
            tags = ["#Thread", "#Growth", "#Tech"]
        elif platform == "facebook":
            adapted = f"{content}\n\nWe'd love to hear your thoughts! Drop a comment below 👇"
            tags = ["#Community", "#Discussion", "#SocialTips"]
        else:
            adapted = content
            tags = ["#SocialMedia", "#IntelliPost"]

        return AIAdaptContentResponse(
            platform=platform,
            adapted_content=adapted,
            hashtags=tags,
            character_count=len(adapted)
        )

    @staticmethod
    def suggest_hashtags(req: AIHashtagSuggestionRequest) -> AIHashtagSuggestionResponse:
        words = [w.lower().replace('#', '').strip('.,!?') for w in req.content.split() if len(w) > 3]
        tags = [f"#{w}" for w in words[:min(len(words), req.count)]]
        popular_pool = ["#SocialMediaMarketing", "#IntelliPost", "#BrandGrowth", "#ContentStrategy", "#EngagementBoost", "#MarketingDigital", "#Productivity"]
        for p in popular_pool:
            if len(tags) >= req.count:
                break
            if p not in tags:
                tags.append(p)

        return AIHashtagSuggestionResponse(
            hashtags=tags,
            trending_score="94.8% High Visibility"
        )
