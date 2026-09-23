import pytest


def test_create_and_list_campaigns(client):
    login_res = client.post("/auth/login", json={
        "email": "business@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create campaign
    create_res = client.post("/campaigns", json={
        "name": "Q4 Holiday Brand Push",
        "description": "Holiday promotional campaign across channels",
        "platform": "All Platforms",
        "budget": 10000.0,
        "target_reach": 100000,
        "status": "active"
    }, headers=headers)

    assert create_res.status_code == 201
    camp_id = create_res.json()["id"]

    # 2. List campaigns
    list_res = client.get("/campaigns", headers=headers)
    assert list_res.status_code == 200
    camps = list_res.json()
    assert any(c["id"] == camp_id for c in camps)


def test_update_and_status_campaign(client):
    login_res = client.post("/auth/login", json={
        "email": "marketing@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create campaign
    create_res = client.post("/campaigns", json={
        "name": "Spring Flash Sale",
        "description": "Short sprint flash sale",
        "platform": "Instagram + LinkedIn",
        "budget": 3000.0,
        "status": "draft"
    }, headers=headers)
    assert create_res.status_code == 201
    camp_id = create_res.json()["id"]
    assert create_res.json()["status"] == "draft"

    # Update metadata
    put_res = client.put(f"/campaigns/{camp_id}", json={
        "name": "Spring Flash Sale 2026",
        "budget": 4500.0,
        "spent": 1200.0
    }, headers=headers)
    assert put_res.status_code == 200
    assert put_res.json()["name"] == "Spring Flash Sale 2026"
    assert put_res.json()["budget"] == 4500.0
    assert put_res.json()["spent"] == 1200.0

    # Quick status patch
    patch_res = client.patch(f"/campaigns/{camp_id}/status", json={
        "status": "active"
    }, headers=headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "active"


def test_campaign_post_association_and_stats(client):
    login_res = client.post("/auth/login", json={
        "email": "marketing@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a campaign
    camp_res = client.post("/campaigns", json={
        "name": "Product Features Deep-Dive",
        "platform": "Instagram",
        "budget": 2000.0,
        "status": "active"
    }, headers=headers)
    assert camp_res.status_code == 201
    camp_id = camp_res.json()["id"]

    # 2. Create posts
    post1_res = client.post("/posts", json={
        "title": "Feature 1 Announcement",
        "content": "Discover new automated scheduling features in SocialPilot!",
        "platform": "instagram",
        "status": "draft"
    }, headers=headers)
    assert post1_res.status_code == 201
    post1_id = post1_res.json()["id"]

    post2_res = client.post("/posts", json={
        "title": "Feature 2 Announcement",
        "content": "Multi-channel campaign analytics released today!",
        "platform": "linkedin",
        "status": "draft"
    }, headers=headers)
    assert post2_res.status_code == 201
    post2_id = post2_res.json()["id"]

    # 3. Associate posts to campaign
    add_res = client.post(f"/campaigns/{camp_id}/posts", json={
        "post_ids": [post1_id, post2_id]
    }, headers=headers)
    assert add_res.status_code == 200
    assert add_res.json()["posts_count"] >= 2

    # 4. View campaign posts
    posts_res = client.get(f"/campaigns/{camp_id}/posts", headers=headers)
    assert posts_res.status_code == 200
    posts_list = posts_res.json()
    post_ids = [p["id"] for p in posts_list]
    assert post1_id in post_ids
    assert post2_id in post_ids

    # 5. Check campaign stats
    stats_res = client.get(f"/campaigns/{camp_id}/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_posts"] >= 2
    assert stats["draft_posts"] >= 2

    # 6. Remove post from campaign
    del_post_res = client.delete(f"/campaigns/{camp_id}/posts/{post1_id}", headers=headers)
    assert del_post_res.status_code == 200

    posts_after_res = client.get(f"/campaigns/{camp_id}/posts", headers=headers)
    assert post1_id not in [p["id"] for p in posts_after_res.json()]


def test_campaign_compare(client):
    login_res = client.post("/auth/login", json={
        "email": "marketing@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    c1 = client.post("/campaigns", json={
        "name": "Campaign Alpha",
        "platform": "Instagram",
        "budget": 5000.0,
        "status": "active"
    }, headers=headers).json()

    c2 = client.post("/campaigns", json={
        "name": "Campaign Beta",
        "platform": "LinkedIn",
        "budget": 8000.0,
        "status": "active"
    }, headers=headers).json()

    comp_res = client.get(f"/campaigns/compare?ids={c1['id']},{c2['id']}", headers=headers)
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert len(comp_data["campaigns"]) == 2
    assert len(comp_data["metrics"]) > 0
    metric_keys = [m["metric_key"] for m in comp_data["metrics"]]
    assert "total_posts" in metric_keys
    assert "actual_reach" in metric_keys
    assert "budget" in metric_keys


def test_campaign_access_control_and_isolation(client):
    # 1. Content creator cannot create campaigns (permission denied)
    login_creator = client.post("/auth/login", json={
        "email": "creator@socialpilot.io",
        "password": "password123"
    })
    token_creator = login_creator.json()["access_token"]
    headers_creator = {"Authorization": f"Bearer {token_creator}"}

    c_res_fail = client.post("/campaigns", json={
        "name": "Creator Campaign Attempt",
        "platform": "Instagram",
        "budget": 1000.0,
        "status": "active"
    }, headers=headers_creator)
    assert c_res_fail.status_code == 403

    # 2. Marketing user can create and view campaign
    login_mkt = client.post("/auth/login", json={
        "email": "marketing@socialpilot.io",
        "password": "password123"
    })
    token_mkt = login_mkt.json()["access_token"]
    headers_mkt = {"Authorization": f"Bearer {token_mkt}"}

    c_res = client.post("/campaigns", json={
        "name": "Marketing Team Campaign",
        "platform": "Instagram",
        "budget": 5000.0,
        "status": "active"
    }, headers=headers_mkt)
    assert c_res.status_code == 201
    c_id = c_res.json()["id"]

    # 3. Marketing user and Admin can access it
    get_res = client.get(f"/campaigns/{c_id}", headers=headers_mkt)
    assert get_res.status_code == 200

    login_admin = client.post("/auth/login", json={
        "email": "business@socialpilot.io",
        "password": "password123"
    })
    token_admin = login_admin.json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {token_admin}"}
    admin_get = client.get(f"/campaigns/{c_id}", headers=headers_admin)
    assert admin_get.status_code == 200


def test_campaign_analytics_and_empty_states(client):
    login_res = client.post("/auth/login", json={
        "email": "marketing@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create empty campaign
    camp = client.post("/campaigns", json={
        "name": "Zero Post Campaign",
        "platform": "All Platforms",
        "budget": 500.0,
        "status": "active"
    }, headers=headers).json()
    camp_id = camp["id"]

    # Test campaign analytics endpoint
    analytics_res = client.get(f"/campaigns/{camp_id}/analytics?range=30d", headers=headers)
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    assert analytics_data["campaign_id"] == camp_id
    assert analytics_data["total_posts"] == 0
    assert isinstance(analytics_data["timeline"], list)

    # Test global analytics endpoint filtered by this campaign
    ov_res = client.get(f"/analytics/overview?range=30d&campaign_id={camp_id}", headers=headers)
    assert ov_res.status_code == 200
    ov_data = ov_res.json()
    assert ov_data["total_posts"] == 0
    assert ov_data["total_reach"] == 0
    assert ov_data["total_engagement"] == 0


def test_campaign_delete_and_unlinking(client):
    login_res = client.post("/auth/login", json={
        "email": "marketing@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create campaign
    camp = client.post("/campaigns", json={
        "name": "Campaign To Delete",
        "platform": "LinkedIn",
        "status": "draft"
    }, headers=headers).json()
    camp_id = camp["id"]

    # 2. Create post linked to this campaign
    post = client.post("/posts", json={
        "title": "Post To Be Unlinked",
        "content": "Content linked to temporary campaign",
        "platform": "linkedin",
        "campaign_id": camp_id,
        "status": "draft"
    }, headers=headers).json()
    post_id = post["id"]

    # 3. Delete campaign
    del_res = client.delete(f"/campaigns/{camp_id}", headers=headers)
    assert del_res.status_code == 204

    # 4. Campaign is gone
    get_res = client.get(f"/campaigns/{camp_id}", headers=headers)
    assert get_res.status_code == 404

    # 5. Post still exists with campaign_id unlinked (None)
    post_get = client.get(f"/posts/{post_id}", headers=headers)
    assert post_get.status_code == 200
    assert post_get.json()["campaign_id"] is None


def test_create_media_post_inside_campaign(client):
    """Test creating a post with media upload directly associated with a campaign."""
    login_res = client.post("/auth/login", json={
        "email": "marketing@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a campaign
    camp = client.post("/campaigns", json={
        "name": "Summer Media Campaign",
        "platform": "Instagram + LinkedIn",
        "budget": 3000.0,
        "status": "active"
    }, headers=headers).json()
    camp_id = camp["id"]

    # 2. Upload media post targeted directly to this campaign via multipart form data
    dummy_file_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    files = {
        "media_file": ("campaign_hero.png", dummy_file_content, "image/png")
    }
    data = {
        "title": "Summer Campaign Hero Post",
        "content": "Check out our exciting summer launch! #summer #deals",
        "platform": "instagram",
        "post_type": "image",
        "status": "draft",
        "campaign_id": str(camp_id)
    }

    create_post_res = client.post("/posts", data=data, files=files, headers=headers)
    assert create_post_res.status_code == 201
    post = create_post_res.json()
    post_id = post["id"]
    assert post["campaign_id"] == camp_id
    assert post["media_url"] is not None
    assert "campaign_hero" in post["media_url"] or ".png" in post["media_url"]

    # 3. Verify post is returned in campaign posts endpoint
    camp_posts_res = client.get(f"/campaigns/{camp_id}/posts", headers=headers)
    assert camp_posts_res.status_code == 200
    camp_posts = camp_posts_res.json()
    assert any(p["id"] == post_id for p in camp_posts)

    # 4. Verify post also exists in general posts list
    all_posts_res = client.get("/posts", headers=headers)
    assert all_posts_res.status_code == 200
    all_posts = all_posts_res.json()
    assert any(p["id"] == post_id for p in all_posts)

    # 5. Verify campaign stats count reflects the new post
    stats_res = client.get(f"/campaigns/{camp_id}/stats", headers=headers)
    assert stats_res.status_code == 200
    assert stats_res.json()["total_posts"] >= 1
    assert stats_res.json()["draft_posts"] >= 1


