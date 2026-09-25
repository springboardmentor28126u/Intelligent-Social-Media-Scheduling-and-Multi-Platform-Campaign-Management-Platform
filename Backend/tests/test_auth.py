"""Isolated authentication regression tests; never write to the project database."""
import unittest
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

import main
import models
import schemas
from database import Base


class AuthTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.user = main.register_user(
            schemas.UserCreate(name=" Test User ", email="test@example.com", password="test-password"),
            self.db,
        )

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def credentials(self, **claims):
        payload = {"sub": str(self.user.id), "exp": datetime.now(timezone.utc) + timedelta(minutes=5)}
        payload.update(claims)
        return HTTPAuthorizationCredentials(
            scheme="Bearer", credentials=jwt.encode(payload, main.JWT_SECRET_KEY, algorithm="HS256")
        )

    def test_registration_login_and_current_user(self):
        self.assertEqual(self.user.name, "Test User")
        self.assertNotEqual(self.user.password_hash, "test-password")
        result = main.login_user(schemas.UserLogin(email="test@example.com", password="test-password"), self.db)
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=result["access_token"])
        payload = main.verify_token(credentials, self.db)
        self.assertEqual(main.get_me(payload, self.db)["id"], self.user.id)

    def test_wrong_password_and_duplicate_email(self):
        with self.assertRaises(HTTPException) as error:
            main.login_user(schemas.UserLogin(email="test@example.com", password="wrong"), self.db)
        self.assertEqual(error.exception.status_code, 401)
        with self.assertRaises(HTTPException) as error:
            main.register_user(schemas.UserCreate(name="Other", email="test@example.com", password="password"), self.db)
        self.assertEqual(error.exception.status_code, 400)

    def test_invalid_expired_and_missing_credentials(self):
        for credentials in [None, self.credentials(sub="invalid"), self.credentials(sub="0"),
                            self.credentials(exp=datetime.now(timezone.utc) - timedelta(seconds=1)),
                            HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid")]:
            with self.subTest(credentials=credentials is None):
                with self.assertRaises(HTTPException) as error:
                    main.verify_token(credentials, self.db)
                self.assertEqual(error.exception.status_code, 401)

    def test_missing_expiration_rejected(self):
        token = jwt.encode({"sub": str(self.user.id)}, main.JWT_SECRET_KEY, algorithm="HS256")
        with self.assertRaises(HTTPException) as error:
            main.verify_token(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token), self.db)
        self.assertEqual(error.exception.status_code, 401)

    def test_database_role_overrides_stale_token(self):
        credentials = self.credentials(role="administrator")
        payload = main.verify_token(credentials, self.db)
        with self.assertRaises(HTTPException) as error:
            main.require_admin(payload)
        self.assertEqual(error.exception.status_code, 403)
        self.user.role = "administrator"
        self.db.commit()
        main.require_admin(main.verify_token(credentials, self.db))
        self.user.role = "user"
        self.db.commit()
        with self.assertRaises(HTTPException):
            main.require_admin(main.verify_token(credentials, self.db))

    def test_deleted_user_rejected(self):
        credentials = self.credentials()
        self.db.delete(self.user)
        self.db.commit()
        with self.assertRaises(HTTPException) as error:
            main.verify_token(credentials, self.db)
        self.assertEqual(error.exception.status_code, 401)

    def test_blank_name_rejected(self):
        with self.assertRaises(ValidationError):
            schemas.UserCreate(name="   ", email="test@example.com", password="password")

    def test_account_ownership(self):
        account = models.SocialAccount(user_id=self.user.id, platform="Facebook", account_name="Test")
        self.db.add(account)
        self.db.commit()
        self.assertEqual(main.get_social_accounts({"sub": str(self.user.id)}, self.db)[0].id, account.id)
        self.assertEqual(main.get_social_accounts({"sub": "999"}, self.db), [])
        with self.assertRaises(HTTPException) as error:
            main.disconnect_social_account(account.id, {"sub": "999"}, self.db)
        self.assertEqual(error.exception.status_code, 404)
        self.assertIsNotNone(self.db.get(models.SocialAccount, account.id))


if __name__ == "__main__":
    unittest.main()
