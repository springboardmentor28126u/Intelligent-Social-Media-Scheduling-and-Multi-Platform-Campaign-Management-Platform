from types import SimpleNamespace

from app.services import publisher


def test_facebook_video_uses_page_videos_endpoint(tmp_path, monkeypatch):
    video_path = tmp_path / "uploads" / "videos" / "clip.mp4"
    video_path.parent.mkdir(parents=True)
    video_path.write_bytes(b"video content")
    monkeypatch.setattr(
        publisher.Path,
        "resolve",
        lambda _path: tmp_path / "app" / "services" / "publisher.py",
    )

    captured = {}

    class DummyResponse:
        ok = True

        @staticmethod
        def json():
            return {"id": "video-123"}

    def fake_post(url, **kwargs):
        captured["url"] = url
        captured["data"] = kwargs["data"]
        captured["filename"] = kwargs["files"]["source"][0]
        captured["mime_type"] = kwargs["files"]["source"][2]
        captured["timeout"] = kwargs["timeout"]
        return DummyResponse()

    monkeypatch.setattr(publisher.requests, "post", fake_post)

    result = publisher.publish_to_facebook(
        content="A new video",
        access_token="page-token",
        media_url="/uploads/videos/clip.mp4",
        media_type="video",
        social_account=SimpleNamespace(page_id="page-456"),
    )

    assert result["success"] is True
    assert result["post_id"] == "video-123"
    assert result["message"] == "Facebook video published successfully"
    assert captured["url"] == "https://graph.facebook.com/v23.0/page-456/videos"
    assert captured["data"] == {
        "access_token": "page-token",
        "description": "A new video",
    }
    assert captured["filename"] == "clip.mp4"
    assert captured["mime_type"] == "video/mp4"
    assert captured["timeout"] == (15, 300)


def test_facebook_rejects_video_with_unsupported_extension(tmp_path, monkeypatch):
    video_path = tmp_path / "uploads" / "videos" / "clip.unknown"
    video_path.parent.mkdir(parents=True)
    video_path.write_bytes(b"video content")
    monkeypatch.setattr(
        publisher.Path,
        "resolve",
        lambda _path: tmp_path / "app" / "services" / "publisher.py",
    )
    monkeypatch.setattr(
        publisher.requests,
        "post",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(
            AssertionError("Facebook should not be called for unsupported media")
        ),
    )

    result = publisher.publish_to_facebook(
        content="A video",
        access_token="page-token",
        media_url="/uploads/videos/clip.unknown",
        media_type="video",
        social_account=SimpleNamespace(page_id="page-456"),
    )

    assert result["success"] is False
    assert "MP4, MOV, AVI, MKV, and WebM" in result["message"]
