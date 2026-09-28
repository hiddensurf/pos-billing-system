from sqlmodel import Session, select

from app.db import engine
from app.models.models import Category


categories = [
    {
        "name": "Shirts",
        "description": "Men's and women's shirts",
    },
    {
        "name": "Pants",
        "description": "Trousers and pants",
    },
    {
        "name": "Dresses",
        "description": "Dresses and related garments",
    },
    {
        "name": "Fabrics",
        "description": "Cloth and textile materials",
    },
]


with Session(engine) as session:
    for category_data in categories:
        existing_category = session.exec(
            select(Category).where(
                Category.name == category_data["name"]
            )
        ).first()

        if existing_category:
            print(
                f"Category '{category_data['name']}' already exists. Skipping."
            )
            continue

        category = Category(**category_data)

        session.add(category)
        print(f"Created category: {category_data['name']}")

    session.commit()

print("Category seeding complete.")
