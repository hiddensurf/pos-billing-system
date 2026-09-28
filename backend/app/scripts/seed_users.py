from sqlmodel import Session, select

from app.db import engine
from app.auth.security import hash_password
from app.models.models import User


users = [
    {
        "username": "admin",
        "password": "admin123",
        "full_name": "System Administrator",
        "role": "admin",
    },
    {
        "username": "staff1",
        "password": "staff123",
        "full_name": "Staff User 1",
        "role": "staff",
    },
    {
        "username": "staff2",
        "password": "staff123",
        "full_name": "Staff User 2",
        "role": "staff",
    },
]


with Session(engine) as session:
    for user_data in users:
        existing_user = session.exec(
            select(User).where(
                User.username == user_data["username"]
            )
        ).first()

        if existing_user:
            print(
                f"User '{user_data['username']}' already exists. Skipping."
            )
            continue

        user = User(
            username=user_data["username"],
            password_hash=hash_password(user_data["password"]),
            full_name=user_data["full_name"],
            role=user_data["role"],
            is_active=True,
        )

        session.add(user)
        print(f"Created user: {user_data['username']}")

    session.commit()

print("User seeding complete.")