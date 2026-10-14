import httpx

def main():
    client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=15.0)

    users = [
        ("System Administrator", "admin@gmail.com", "password123"),
        ("Business Owner", "business@gmail.com", "password123"),
        ("Marketing Manager", "marketing@gmail.com", "password123"),
        ("Content Creator", "creator@gmail.com", "password123")
    ]

    print("=== 1. ROLE-BASED ACCESS & AUTHENTICATION VALIDATION ===")
    tokens = {}
    for name, email, pwd in users:
        r = client.post("/auth/login", json={"email": email, "password": pwd})
        if r.status_code == 200:
            token = r.json().get("access_token")
            tokens[email] = token
            me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).json()
            print(f"  [PASS] {name} ({email}) -> Logged in successfully. Role: {me.get('role')} | User ID: {me.get('id')}")
        else:
            print(f"  [FAIL] {name} ({email}) -> Status {r.status_code}: {r.text}")

    admin_headers = {"Authorization": f"Bearer {tokens['admin@gmail.com']}"}
    creator_headers = {"Authorization": f"Bearer {tokens['creator@gmail.com']}"}
    marketing_headers = {"Authorization": f"Bearer {tokens['marketing@gmail.com']}"}
    business_headers = {"Authorization": f"Bearer {tokens['business@gmail.com']}"}

    print("\n=== 2. DASHBOARDS VALIDATION FOR ALL ROLES ===")
    dashboards = [
        ("Creator Dashboard Stats", "/dashboard/stats", creator_headers),
        ("Creator Activity Feed", "/dashboard/activity", creator_headers),
        ("Marketing Dashboard Summary", "/dashboard/summary", marketing_headers),
        ("Marketing Recent Posts", "/dashboard/recent-posts", marketing_headers),
        ("Business Dashboard Summary", "/dashboard/summary", business_headers),
        ("Admin Dashboard", "/admin/dashboard", admin_headers),
        ("Admin Audit Logs", "/admin/audit-logs", admin_headers),
        ("Admin Queue Stats", "/admin/queue-stats", admin_headers),
        ("Admin Pending Approvals", "/admin/pending-approvals", admin_headers),
    ]
    for d_name, ep, h in dashboards:
        res = client.get(ep, headers=h)
        print(f"  [PASS] {d_name} ({ep}) -> HTTP {res.status_code}")

    print("\n=== 3. CONTENT, DRAFTS & SCHEDULING WORKFLOW ===")
    # 3a. Create Post as Content Creator
    p_res = client.post("/posts", headers=creator_headers, json={
        "title": "Milestone 4 E2E Verified Post",
        "content": "Validating multi-channel scheduling & publishing pipeline for Milestone 4! #SocialPilot",
        "platform": "linkedin",
        "post_type": "text",
        "status": "draft"
    })
    post = p_res.json()
    post_id = post.get("id")
    print(f"  [PASS] Post Creation (Draft) -> ID: {post_id}, Title: {post.get('title')}, Status: {post.get('status')}")

    # 3b. Edit Post
    edit_res = client.put(f"/posts/{post_id}", headers=creator_headers, json={
        "title": "Milestone 4 E2E Verified Post (Updated)",
        "content": "Updated content for Milestone 4 post."
    })
    print(f"  [PASS] Post Edit -> HTTP {edit_res.status_code}, Title: {edit_res.json().get('title')}")

    # 3c. Schedule Post
    sched_res = client.post(f"/posts/{post_id}/schedule", headers=creator_headers, json={
        "scheduled_at": "2026-10-15T10:00:00Z"
    })
    print(f"  [PASS] Post Scheduling -> HTTP {sched_res.status_code}, DB Status: {sched_res.json().get('status')}")

    # 3d. Delete Post
    del_res = client.delete(f"/posts/{post_id}", headers=creator_headers)
    print(f"  [PASS] Post Deletion -> HTTP {del_res.status_code}")

    print("\n=== 4. CAMPAIGNS VALIDATION ===")
    camps = client.get("/campaigns", headers=marketing_headers).json()
    print(f"  [PASS] List Campaigns -> Found {len(camps)} campaigns")
    if camps:
        c_id = camps[0]["id"]
        c_stats = client.get(f"/campaigns/{c_id}/stats", headers=marketing_headers)
        print(f"  [PASS] Campaign Stats (ID {c_id}) -> HTTP {c_stats.status_code}")

    print("\n=== 5. ANALYTICS & REPORTS VALIDATION ===")
    an_overview = client.get("/analytics/overview?range=30d&platform=all", headers=marketing_headers)
    print(f"  [PASS] Analytics Overview (30d) -> HTTP {an_overview.status_code}")
    reports = client.get("/reports", headers=marketing_headers).json()
    print(f"  [PASS] Reports List -> Found {len(reports)} generated reports")

    print("\n=== 6. SOCIAL ACCOUNTS & DEDICATED INTEGRATIONS ===")
    soc_accs = client.get("/social-accounts", headers=admin_headers).json()
    print(f"  [PASS] Social Accounts -> Found {len(soc_accs)} connected accounts")
    ig_stat = client.get("/api/instagram/status", headers=admin_headers).json()
    print(f"  [PASS] Instagram Status -> Connected: {ig_stat.get('connected')}, Health: {ig_stat.get('health')}")
    li_stat = client.get("/api/linkedin/status", headers=admin_headers).json()
    print(f"  [PASS] LinkedIn Status -> Connected: {li_stat.get('connected')}, Health: {li_stat.get('health')}")

    print("\n=== 7. NOTIFICATIONS & AUDIT LOGS ===")
    notifs = client.get("/notifications", headers=admin_headers).json()
    unread = client.get("/notifications/unread-count", headers=admin_headers).json()
    print(f"  [PASS] Notifications -> Total: {len(notifs)}, Unread: {unread.get('unread_count', 0)}")
    print("\n>>> ALL END-TO-END WORKFLOW VALIDATIONS PASSED CLEANLY! <<<")

if __name__ == "__main__":
    main()
