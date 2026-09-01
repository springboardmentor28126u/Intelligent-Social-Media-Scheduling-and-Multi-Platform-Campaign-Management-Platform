import pytest


def test_generate_pdf_report(client):
    login_res = client.post("/auth/login", json={
        "email": "business@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]

    gen_res = client.post("/reports/generate", json={
        "title": "Quarterly Social Performance Report",
        "report_type": "engagement",
        "format": "pdf",
        "platform": "all"
    }, headers={"Authorization": f"Bearer {token}"})

    assert gen_res.status_code == 201
    report = gen_res.json()
    assert report["format"] == "pdf"
    assert report["status"] == "completed"
    assert report["file_url"] is not None

    # Test PDF download endpoint
    report_id = report["id"]
    dl_res = client.get(f"/reports/{report_id}/pdf")
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/pdf"


def test_generate_excel_report(client):
    login_res = client.post("/auth/login", json={
        "email": "marketing@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]

    gen_res = client.post("/reports/generate", json={
        "title": "Campaign ROI & Posts Breakdown",
        "report_type": "campaign",
        "format": "excel",
        "platform": "all"
    }, headers={"Authorization": f"Bearer {token}"})

    assert gen_res.status_code == 201
    report = gen_res.json()
    assert report["format"] == "excel"

    report_id = report["id"]
    dl_res = client.get(f"/reports/{report_id}/excel")
    assert dl_res.status_code == 200
