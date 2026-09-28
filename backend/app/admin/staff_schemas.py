from pydantic import BaseModel, ConfigDict, Field


class StaffCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=1, max_length=100)


class StaffUpdate(BaseModel):
    username: str | None = Field(
        default=None,
        min_length=3,
        max_length=50,
    )
    full_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )


class StaffPasswordReset(BaseModel):
    new_password: str = Field(min_length=6)


class StaffRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    role: str
    is_active: bool
    created_at: object
    updated_at: object