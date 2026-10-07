"""
Mocked audience analytics. Seeded by user_id + platform so numbers stay
stable between refreshes (no jumping values in the UI).
Replace with real follower APIs per platform later.
"""
import random
from datetime import date, timedelta


def _split(rng: random.Random, labels: list[str]) -> list[dict]:
    # Random shares that add up to exactly 100
    weights = [rng.uniform(0.5, 3.0) for _ in labels]
    total = sum(weights)
    pcts = [round(w / total * 100, 1) for w in weights]
    pcts[-1] = round(100 - sum(pcts[:-1]), 1)
    return [{"label": l, "percent": p} for l, p in zip(labels, pcts)]


def generate_audience(user_id: str, platforms: list[str]) -> dict:
    per_platform = []
    for p in platforms:
        rng = random.Random(f"{user_id}:{p}")
        followers = rng.randint(100, 200)  # small, beginner-account audience
        growth, cur = [], followers - rng.randint(3, 10)
        for i in range(6, -1, -1):  # last 7 days, oldest first
            cur += rng.randint(0, 3)       # 0-3 new followers per day
            growth.append({"date": (date.today() - timedelta(days=i)).isoformat(), "followers": cur})
        per_platform.append({
            "platform": p,
            "followers": growth[-1]["followers"],
            "growth_last_7_days": growth,
            "new_this_week": growth[-1]["followers"] - growth[0]["followers"],
        })

    rng = random.Random(f"{user_id}:demographics")
    return {
        "total_followers": sum(x["followers"] for x in per_platform),
        "by_platform": per_platform,
        "age_groups": _split(rng, ["13-17", "18-24", "25-34", "35-44", "45+"]),
        "gender": _split(rng, ["Female", "Male", "Other"]),
        "top_locations": _split(rng, ["Hyderabad", "Bengaluru", "Mumbai", "Delhi", "Chennai"]),
        "best_posting_hours": sorted(rng.sample(range(8, 23), 3)),  # hour of day, 24h
        "is_mocked": True,
    }