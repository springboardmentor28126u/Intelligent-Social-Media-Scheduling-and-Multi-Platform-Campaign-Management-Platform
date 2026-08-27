from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "Content Creator"

class UserLogin(BaseModel):
    email: EmailStr
    password: str
        
class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True

class SocialAccountCreate(BaseModel):
    platform: str
    account_name: str

class SocialAccountOut(BaseModel):
    id: int
    platform: str
    account_name: str
    status: str

    class Config:
        from_attributes = True
