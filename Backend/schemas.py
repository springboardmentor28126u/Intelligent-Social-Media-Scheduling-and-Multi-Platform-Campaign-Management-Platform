from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    
class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str

    model_config = ConfigDict(from_attributes=True)
class SocialAccountCreate(BaseModel):
    platform: str
    account_name: str


class SocialAccountResponse(BaseModel):
    id: int
    platform: str
    account_name: str
    connected: bool

    model_config = ConfigDict(from_attributes=True)