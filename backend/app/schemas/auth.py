from pydantic import BaseModel, EmailStr


# =====================================================
# REGISTER
# =====================================================

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


# =====================================================
# USER RESPONSE
# =====================================================

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True


# =====================================================
# LOGIN
# =====================================================

class UserLogin(BaseModel):
    email: EmailStr
    password: str


# =====================================================
# LOGIN TOKEN RESPONSE
# =====================================================

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str