from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Nexora Backend")


# =========================
# DATA MODELS
# =========================

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


# Temporary user database
users = {}


# =========================
# HOME
# =========================

@app.get("/")
def home():
    return {
        "message": "Nexora Backend is running"
    }


# =========================
# HEALTH CHECK
# =========================

@app.get("/health")
def health():
    return {
        "status": "OK"
    }


# =========================
# REGISTER
# =========================

@app.post("/register")
def register(user: RegisterRequest):

    if user.email in users:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    users[user.email] = {
        "name": user.name,
        "email": user.email,
        "password": user.password
    }

    return {
        "success": True,
        "message": "Registration successful",
        "name": user.name,
        "email": user.email
    }


# =========================
# LOGIN
# =========================

@app.post("/login")
def login(user: LoginRequest):

    if user.email not in users:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    if users[user.email]["password"] != user.password:
        raise HTTPException(
            status_code=401,
            detail="Invalid password"
        )

    return {
        "success": True,
        "message": "Login successful",
        "name": users[user.email]["name"],
        "email": users[user.email]["email"]
    }