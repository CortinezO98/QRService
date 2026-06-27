"""
Public QR Redirect Endpoint
Tracks scan and redirects to destination URL.
"""
from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.qr_service import QRService

router = APIRouter()


@router.get("/r/{short_code}", include_in_schema=False)
async def redirect_qr(
    short_code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    service = QRService(db)

    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"

    user_agent = request.headers.get("User-Agent", "")
    referer = request.headers.get("Referer", "")

    destination_url = await service.track_scan(
        short_code=short_code,
        ip=client_ip,
        user_agent=user_agent,
        referer=referer,
    )

    return RedirectResponse(
        url=destination_url,
        status_code=status.HTTP_302_FOUND,
    )