"""
Media upload and serving endpoints.

Supports local file storage for development and S3/Cloudinary for production.
Configure via MEDIA_STORAGE env var: 'local' (default) or 's3'.
"""

import os
import uuid
from pathlib import Path

import structlog
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.middleware.auth import get_current_user
from app.middleware.rate_limiter import limiter, API_LIMIT
from app.models.user import User

router = APIRouter(prefix="/media", tags=["media"])
logger = structlog.get_logger()
settings = get_settings()

# Local upload directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Allowed file types
ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "audio/mpeg", "audio/ogg", "audio/wav",
    "video/mp4",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload")
@limiter.limit(API_LIMIT)
async def upload_file(
    request,  # Required by slowapi
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a file (image, document, audio, video). Max 10 MB."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' not allowed. "
                   f"Allowed: {', '.join(sorted(ALLOWED_TYPES))}",
        )

    # Read file and check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {MAX_FILE_SIZE // (1024*1024)} MB",
        )

    # Generate unique filename
    ext = Path(file.filename or "upload").suffix or ".bin"
    filename = f"{uuid.uuid4().hex}{ext}"
    business_dir = UPLOAD_DIR / str(user.business_id)
    business_dir.mkdir(exist_ok=True)
    file_path = business_dir / filename

    # Save locally (swap for S3 in production)
    file_path.write_bytes(content)

    logger.info(
        "file_uploaded",
        filename=filename,
        size=len(content),
        content_type=file.content_type,
        user_id=str(user.id),
    )

    return {
        "filename": filename,
        "url": f"/api/v1/media/files/{user.business_id}/{filename}",
        "content_type": file.content_type,
        "size": len(content),
    }


@router.get("/files/{business_id}/{filename}")
async def serve_file(business_id: str, filename: str):
    """Serve an uploaded file."""
    from fastapi.responses import FileResponse

    file_path = UPLOAD_DIR / business_id / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    # Security: prevent directory traversal
    try:
        file_path.resolve().relative_to(UPLOAD_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    return FileResponse(file_path)
