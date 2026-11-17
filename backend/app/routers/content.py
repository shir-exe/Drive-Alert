from datetime import datetime
from typing import List, Optional
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Response, status, Query
from pymongo.errors import DuplicateKeyError
from app.db.database import get_database
from app.core.deps import get_current_user
from app.models.user import UserResponse
from app.models.route import RouteCreate, RouteResponse

router = APIRouter(prefix="/content", tags=["Content & Driving Routes"])


async def migrate_legacy_content(user_id: str, db) -> None:
    user_oid = ObjectId(user_id)
    user_doc = await db["users"].find_one(
        {"_id": user_oid},
        {"legacy_content_migrated": 1}
    )
    if user_doc is None or user_doc.get("legacy_content_migrated", False):
        return

    legacy_items = await db["content"].find({
        "owner_id": {"$exists": False},
        "legacy_content_id": {"$exists": False}
    }).to_list(length=None)

    for item in legacy_items:
        legacy_id = str(item["_id"])
        existing_copy = await db["content"].find_one({
            "owner_id": user_id,
            "legacy_content_id": legacy_id
        })
        if existing_copy is None:
            copied_item = {
                key: value
                for key, value in item.items()
                if key != "_id"
            }
            copied_item["owner_id"] = user_id
            copied_item["legacy_content_id"] = legacy_id
            try:
                result = await db["content"].insert_one(copied_item)
                copied_id = result.inserted_id
            except DuplicateKeyError:
                existing_copy = await db["content"].find_one({
                    "owner_id": user_id,
                    "legacy_content_id": legacy_id
                })
                if existing_copy is None:
                    raise
                copied_id = existing_copy["_id"]
        else:
            copied_id = existing_copy["_id"]

        await db["sessions"].update_many(
            {"user_id": user_id, "content_id": legacy_id},
            {"$set": {"content_id": str(copied_id)}}
        )

    await db["users"].update_one(
        {"_id": user_oid, "legacy_content_migrated": {"$ne": True}},
        {"$set": {"legacy_content_migrated": True}}
    )


def to_route_response(item: dict) -> RouteResponse:
    return RouteResponse(
        id=str(item["_id"]),
        title=item["title"],
        description=item["description"],
        video_url=item["video_url"],
        duration_seconds=item["duration_seconds"],
        category=item.get("category", "Highway"),
        difficulty=item.get("difficulty", "Normal"),
        thumbnail_url=item.get("thumbnail_url"),
        tags=item.get("tags", []),
        created_at=item.get("created_at", datetime.utcnow())
    )


@router.get("", response_model=List[RouteResponse])
async def list_routes(
    category: Optional[str] = Query(None),
    current_user: UserResponse = Depends(get_current_user),
    db=Depends(get_database)
):
    """Retrieve only the authenticated user's driving routes."""
    await migrate_legacy_content(current_user.id, db)
    query = {"owner_id": current_user.id}
    if category and category != "הכל":
        query["category"] = category

    cursor = db["content"].find(query)
    items = await cursor.to_list(length=100)
    return [to_route_response(item) for item in items]


@router.get("/{content_id}", response_model=RouteResponse)
async def get_route(
    content_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db=Depends(get_database)
):
    """Retrieve a driving route only if it belongs to the authenticated user."""
    try:
        oid = ObjectId(content_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driving route not found")

    doc = await db["content"].find_one({"_id": oid, "owner_id": current_user.id})
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driving route not found")

    return to_route_response(doc)


@router.post("", response_model=RouteResponse, status_code=status.HTTP_201_CREATED)
async def create_route(
    route_in: RouteCreate,
    current_user: UserResponse = Depends(get_current_user),
    db=Depends(get_database)
):
    """Add a driving video route to the authenticated user's library."""
    doc = route_in.model_dump()
    doc["created_at"] = datetime.utcnow()
    doc["owner_id"] = current_user.id
    result = await db["content"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return to_route_response(doc)


@router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_route(
    content_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db=Depends(get_database)
):
    try:
        oid = ObjectId(content_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driving route not found")

    result = await db["content"].delete_one({"_id": oid, "owner_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driving route not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
