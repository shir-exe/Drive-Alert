from datetime import datetime
import re

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError
from app.db.database import get_database
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.deps import get_current_user
from app.models.user import UserCreate, UserLogin, UserResponse, Token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db=Depends(get_database)):
    normalized_email = str(user_in.email).strip().casefold()
    existing_user = await db["users"].find_one({
        "$or": [
            {"email": {"$regex": f"^{re.escape(normalized_email)}$", "$options": "i"}},
            {"username": user_in.username},
        ]
    })
    if existing_user:
        if existing_user.get("email", "").casefold() == normalized_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email is already registered"
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already taken"
        )

    # Hash password & insert
    hashed_pwd = get_password_hash(user_in.password)
    new_user_doc = {
        "email": normalized_email,
        "username": user_in.username,
        "full_name": user_in.full_name,
        "preferred_profile": user_in.preferred_profile,
        "hashed_password": hashed_pwd,
        "created_at": datetime.utcnow(),
        "is_active": True,
        "legacy_content_migrated": True,
    }
    try:
        result = await db["users"].insert_one(new_user_doc)
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or username is already registered"
        ) from exc
    user_id = str(result.inserted_id)

    access_token = create_access_token(subject=user_id)
    user_response = UserResponse(
        id=user_id,
        email=normalized_email,
        username=user_in.username,
        full_name=user_in.full_name,
        preferred_profile=user_in.preferred_profile,
        created_at=new_user_doc["created_at"],
        is_active=True
    )
    return Token(access_token=access_token, token_type="bearer", user=user_response)


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db=Depends(get_database)):
    identity = credentials.username_or_email.strip()
    email_pattern = f"^{re.escape(identity.casefold())}$"
    user_doc = await db["users"].find_one({
        "$or": [
            {"email": {"$regex": email_pattern, "$options": "i"}},
            {"username": identity}
        ]
    })
    if not user_doc or not verify_password(credentials.password, user_doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user_doc.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    user_id = str(user_doc["_id"])
    access_token = create_access_token(subject=user_id)
    user_response = UserResponse(
        id=user_id,
        email=user_doc["email"],
        username=user_doc["username"],
        full_name=user_doc.get("full_name"),
        preferred_profile=user_doc.get("preferred_profile", "standard"),
        created_at=user_doc.get("created_at"),
        is_active=user_doc.get("is_active", True)
    )
    return Token(access_token=access_token, token_type="bearer", user=user_response)


@router.post("/logout")
async def logout(current_user: UserResponse = Depends(get_current_user)):
    """Logout endpoint - client discards bearer token."""
    return {"message": "Logged out successfully", "status": "ok"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: UserResponse = Depends(get_current_user)):
    return current_user
