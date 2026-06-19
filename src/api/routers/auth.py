from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..auth import create_access_token, get_current_user, hash_password, verify_password
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": body.email.lower()},
    ).fetchone()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    password_hash = hash_password(body.password)
    row = db.execute(
        text("""
            INSERT INTO users (name, email, password_hash)
            VALUES (:name, :email, :hash)
            RETURNING id, name, email, created_at
        """),
        {"name": body.name.strip(), "email": body.email.lower(), "hash": password_hash},
    ).fetchone()
    db.commit()

    token = create_access_token(row.id, row.email)
    return {
        "message": "Registration successful",
        "token": token,
        "user": {
            "id": row.id,
            "name": row.name,
            "email": row.email,
            "created_at": row.created_at.isoformat(),
        },
    }


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT id, name, email, password_hash, created_at FROM users WHERE email = :email"),
        {"email": body.email.lower()},
    ).fetchone()
    if not row or not verify_password(body.password, row.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(row.id, row.email)
    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": row.id,
            "name": row.name,
            "email": row.email,
            "created_at": row.created_at.isoformat(),
        },
    }


@router.get("/me")
def me(current_user=Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "created_at": current_user["created_at"].isoformat(),
    }
