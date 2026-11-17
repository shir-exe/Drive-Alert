from datetime import datetime
from typing import Optional, List
from urllib.parse import urlsplit

from pydantic import BaseModel, Field
from pydantic import field_validator


class RouteBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=150, description="Name of the driving route")
    description: str = Field(..., min_length=1, max_length=2000, description="Details and driving conditions")
    video_url: str = Field(..., min_length=1, max_length=2048, description="HTTPS link to a driving video")
    duration_seconds: int = Field(..., gt=0, description="Video duration in seconds")
    category: str = Field(default="Highway", description="Highway, Urban, Mountain, Night Drive")
    difficulty: str = Field(default="Normal", description="Easy, Normal, Challenging, Extreme")
    thumbnail_url: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

    @field_validator("video_url")
    @classmethod
    def validate_video_url(cls, value: str) -> str:
        parsed = urlsplit(value)
        if parsed.scheme != "https" or not parsed.hostname:
            raise ValueError("Video URL must be a valid HTTPS URL")
        return value


class RouteCreate(RouteBase):
    pass


class RouteResponse(RouteBase):
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


# Aliases for backward compatibility with Content naming
RouteItem = RouteResponse
ContentBase = RouteBase
ContentCreate = RouteCreate
ContentResponse = RouteResponse
ContentItem = RouteResponse
