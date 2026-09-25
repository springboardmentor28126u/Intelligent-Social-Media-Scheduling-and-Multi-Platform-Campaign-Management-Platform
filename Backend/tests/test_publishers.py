import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch, Mock
from urllib.error import HTTPError, URLError
from cryptography.fernet import Fernet
import publishers


class PublisherTests(unittest.TestCase):
    def setUp(self):
        self.config = patch.dict(os.environ, {"META_GRAPH_VERSION": "v25.0", "SOCIAL_TOKEN_KEY": Fernet.generate_key().decode()})
        self.config.start()
        self.db = Mock()
        self.credential = SimpleNamespace(external_id="account", expires_at=None,
            encrypted_token=publishers.cipher().encrypt(json.dumps({"access_token": "secret"}).encode()).decode())

    def tearDown(self):
        self.config.stop()

    def job(self, provider, **extra):
        return SimpleNamespace(provider=provider, content="Hello", image_url=extra.get("image_url"), container_id=None)

    def test_facebook_linkedin_x_payloads(self):
        for provider, response in [("facebook", {"id": "fb-post"}), ("linkedin", {}), ("x", {"data": {"id": "x-post"}})]:
            with patch("publishers.request", return_value=(response, {"X-RestLi-Id": "li-post"})) as request:
                result = publishers.publish(self.db, self.job(provider), self.credential)
                self.assertTrue(result)
                self.assertTrue(request.call_args.kwargs["publishing"])
                if provider == "linkedin":
                    self.assertEqual(request.call_args.args[2]["author"], "urn:li:person:account")

    def test_instagram_container_then_publish(self):
        with patch("publishers.request", side_effect=[({"id": "container"}, {}), ({"status_code": "FINISHED"}, {}), ({"id": "ig-post"}, {})]) as request:
            job = self.job("instagram", image_url="https://example.com/a.jpg")
            self.assertEqual(publishers.publish(self.db, job, self.credential), "ig-post")
            self.assertEqual(job.container_id, "container")
            self.assertEqual(request.call_count, 3)

    def test_instagram_processing_is_retryable(self):
        job = self.job("instagram", image_url="https://example.com/a.jpg")
        job.container_id = "existing"
        with patch("publishers.request", return_value=({"status_code": "IN_PROGRESS"}, {})):
            with self.assertRaises(publishers.PublishError) as error:
                publishers.publish(self.db, job, self.credential)
            self.assertTrue(error.exception.retryable)

    def test_transport_error_classification_and_redaction(self):
        for failure, retry, uncertain in [
            (HTTPError("https://provider", 429, "secret", {}, None), True, False),
            (HTTPError("https://provider", 403, "secret", {}, None), False, False),
            (HTTPError("https://provider", 500, "secret", {}, None), False, True),
            (URLError("secret"), False, True),
        ]:
            opener = Mock()
            opener.open.side_effect = failure
            with patch("publishers.build_opener", return_value=opener):
                with self.assertRaises(publishers.PublishError) as error:
                    publishers.request("https://provider", "secret", {"text": "hi"}, publishing=True)
                self.assertEqual(error.exception.retryable, retry)
                self.assertEqual(error.exception.uncertain, uncertain)
                self.assertNotIn("secret", str(error.exception))

    def test_expired_token_fails_without_publish(self):
        self.credential.expires_at = 1
        self.credential.provider = "linkedin"
        with self.assertRaises(publishers.PublishError):
            publishers.publish(self.db, self.job("linkedin"), self.credential)
