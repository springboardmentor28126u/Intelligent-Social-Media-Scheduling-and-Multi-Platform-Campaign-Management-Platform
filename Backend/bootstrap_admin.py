"""Explicit local setup: grant administrator access to an existing account."""
import argparse

from sqlalchemy import func

from database import SessionLocal
from models import User


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("email", help="Email of an existing registered user")
    args = parser.parse_args()
    with SessionLocal() as db:
        user = db.query(User).filter(func.lower(User.email) == args.email.strip().lower()).first()
        if user is None:
            parser.error("No registered user has that email")
        user.role = "administrator"
        db.commit()
        print("Administrator role assigned. Sign in again to refresh the frontend role.")


if __name__ == "__main__":
    main()
