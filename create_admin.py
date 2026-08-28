from getpass import getpass

from app.database.session import SessionLocal
from app.models.user import User, SystemRole
from app.services.security import hash_password


def create_admin():
    db = SessionLocal()

    try:
        name = input("Admin name: ")
        email = input("Admin email: ")
        password = getpass("Admin password: ")

        existing_user = db.query(User).filter(
            User.email == email
        ).first()

        if existing_user:
            print("A user with this email already exists.")
            return

        admin = User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            system_role=SystemRole.ADMIN,
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("Admin created successfully!")
        print("Admin ID:", admin.id)
        print("Email:", admin.email)
        print("Role:", admin.system_role)

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()