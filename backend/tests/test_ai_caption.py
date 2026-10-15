import asyncio

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from app.core.security import get_current_user
from app.routers import captions
from app.services import ai_caption


def test_generate_caption_uses_groq_api_and_selected_options(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    monkeypatch.setenv("GROQ_MODEL", "test-model")
    captured = {}

    class StubAsyncClient:
        def __init__(self, timeout):
            captured["timeout"] = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return None

        async def post(self, url, headers, json):
            captured.update(url=url, headers=headers, payload=json)
            request = httpx.Request("POST", url)
            return httpx.Response(
                200,
                json={"choices": [{"message": {"content": "  A new caption!  "}}]},
                request=request,
            )

    monkeypatch.setattr(ai_caption.httpx, "AsyncClient", StubAsyncClient)

    result = asyncio.run(
        ai_caption.generate_caption(
            topic="A reusable water bottle",
            platform="Instagram",
            tone="Friendly",
        )
    )

    assert result == "A new caption!"
    assert captured["url"] == "https://api.groq.com/openai/v1/chat/completions"
    assert captured["headers"]["Authorization"] == "Bearer test-key"
    assert captured["payload"]["model"] == "test-model"
    prompt = captured["payload"]["messages"][1]["content"]
    assert "Instagram" in prompt
    assert "friendly" in prompt
    assert "A reusable water bottle" in prompt
    assert "5 to 8 relevant hashtags" in prompt
    assert "separate line" in prompt


def test_generate_caption_uses_active_default_model(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    monkeypatch.delenv("GROQ_MODEL", raising=False)
    captured = {}

    class StubAsyncClient:
        def __init__(self, timeout):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return None

        async def post(self, url, headers, json):
            captured["model"] = json["model"]
            return httpx.Response(
                200,
                json={"choices": [{"message": {"content": "A new caption."}}]},
                request=httpx.Request("POST", url),
            )

    monkeypatch.setattr(ai_caption.httpx, "AsyncClient", StubAsyncClient)

    result = asyncio.run(
        ai_caption.generate_caption(
            topic="A product",
            platform="Instagram",
            tone="Friendly",
        )
    )

    assert result == "A new caption."
    assert captured["model"] == "qwen/qwen3.8-27b"


def test_rewrite_post_sends_original_content_and_selected_style(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    captured = {}

    class StubAsyncClient:
        def __init__(self, timeout):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return None

        async def post(self, url, headers, json):
            captured["payload"] = json
            return httpx.Response(
                200,
                json={"choices": [{"message": {"content": "A polished version."}}]},
                request=httpx.Request("POST", url),
            )

    monkeypatch.setattr(ai_caption.httpx, "AsyncClient", StubAsyncClient)

    result = asyncio.run(
        ai_caption.rewrite_post(
            content="hey folks check this out",
            style="Professional",
        )
    )

    assert result == "A polished version."
    prompt = captured["payload"]["messages"][1]["content"]
    assert "polished, professional tone" in prompt
    assert "hey folks check this out" in prompt


def test_generate_caption_requires_groq_api_key(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    with pytest.raises(ai_caption.CaptionGenerationError) as error:
        asyncio.run(
            ai_caption.generate_caption(
                topic="A product",
                platform="Facebook",
                tone="Professional",
            )
        )

    assert error.value.status_code == 503


def test_groq_rate_limit_returns_actionable_error(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")

    class StubAsyncClient:
        def __init__(self, timeout):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return None

        async def post(self, url, headers, json):
            return httpx.Response(
                429,
                request=httpx.Request("POST", url),
            )

    monkeypatch.setattr(ai_caption.httpx, "AsyncClient", StubAsyncClient)

    with pytest.raises(ai_caption.CaptionGenerationError) as error:
        asyncio.run(
            ai_caption.generate_caption(
                topic="A product",
                platform="Facebook",
                tone="Professional",
            )
        )

    assert error.value.status_code == 503
    assert "Groq rate limit or API quota" in str(error.value)


def test_unknown_groq_model_returns_actionable_error(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    monkeypatch.setenv("GROQ_MODEL", "retired-model")

    class StubAsyncClient:
        def __init__(self, timeout):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return None

        async def post(self, url, headers, json):
            return httpx.Response(
                404,
                request=httpx.Request("POST", url),
            )

    monkeypatch.setattr(ai_caption.httpx, "AsyncClient", StubAsyncClient)

    with pytest.raises(ai_caption.CaptionGenerationError) as error:
        asyncio.run(
            ai_caption.generate_caption(
                topic="A product",
                platform="Facebook",
                tone="Professional",
            )
        )

    assert error.value.status_code == 502
    assert "Groq could not find model 'retired-model'" in str(error.value)
    assert "GROQ_MODEL" in str(error.value)


def test_caption_endpoint_requires_authentication():
    app = FastAPI()
    app.include_router(captions.router)

    with TestClient(app) as client:
        response = client.post(
            "/ai/captions/generate",
            json={
                "topic": "A product launch",
                "platform": "Facebook",
                "tone": "Promotional",
            },
        )

    assert response.status_code == 401


def test_caption_endpoint_returns_caption_for_authenticated_user(monkeypatch):
    app = FastAPI()
    app.include_router(captions.router)
    app.dependency_overrides[get_current_user] = lambda: 42
    received = {}

    async def fake_generate_caption(topic, platform, tone):
        received.update(topic=topic, platform=platform, tone=tone)
        return "Your product launch starts here.\n\n#ProductLaunch #Innovation"

    monkeypatch.setattr(captions, "generate_caption", fake_generate_caption)

    with TestClient(app) as client:
        response = client.post(
            "/ai/captions/generate",
            headers={"Authorization": "Bearer test-token"},
            json={
                "topic": "  A product launch  ",
                "platform": "Facebook",
                "tone": "Promotional",
            },
        )

    assert response.status_code == 200
    assert response.json() == {
        "caption": "Your product launch starts here.\n\n#ProductLaunch #Innovation"
    }
    assert received == {
        "topic": "A product launch",
        "platform": "Facebook",
        "tone": "Promotional",
    }


def test_rewrite_endpoint_requires_authentication():
    app = FastAPI()
    app.include_router(captions.router)

    with TestClient(app) as client:
        response = client.post(
            "/ai/captions/rewrite",
            json={"content": "Original post", "style": "Friendly"},
        )

    assert response.status_code == 401


def test_rewrite_endpoint_returns_rewritten_content(monkeypatch):
    app = FastAPI()
    app.include_router(captions.router)
    app.dependency_overrides[get_current_user] = lambda: 42
    received = {}

    async def fake_rewrite_post(content, style):
        received.update(content=content, style=style)
        return "Rewritten post"

    monkeypatch.setattr(captions, "rewrite_post", fake_rewrite_post)

    with TestClient(app) as client:
        response = client.post(
            "/ai/captions/rewrite",
            headers={"Authorization": "Bearer test-token"},
            json={"content": "  Original post  ", "style": "Friendly"},
        )

    assert response.status_code == 200
    assert response.json() == {"rewritten_content": "Rewritten post"}
    assert received == {"content": "Original post", "style": "Friendly"}
