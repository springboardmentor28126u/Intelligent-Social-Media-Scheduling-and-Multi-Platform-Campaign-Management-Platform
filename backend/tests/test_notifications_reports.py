import pytest


def test_get_notifications(client, test_user):
    resp = client.get("/notifications")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "title" in data[0]


def test_mark_all_notifications_read(client, test_user):
    resp = client.post("/notifications/mark-all-read")
    assert resp.status_code == 200
    assert resp.json().get("success") is True


def test_get_reports_data(client, test_user):
    resp = client.get("/reports/data?report_type=engagement&date_range=30d")
    assert resp.status_code == 200
    data = resp.json()
    assert "platforms" in data
    assert "totals" in data
    assert "facebook" in data["platforms"]
    assert "instagram" in data["platforms"]


def test_export_reports_csv(client, test_user):
    resp = client.get("/reports/export/csv?report_type=engagement")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers.get("content-type", "")
    assert "Platform,Metric,Value,DateRange" in resp.text
