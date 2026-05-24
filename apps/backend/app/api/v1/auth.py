"""
Backend-owned authentication endpoints.
"""

from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Query, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_session
from app.core.config import settings
from app.schemas.auth import (
    AuthProfileUpdateInput,
    AuthUserResponse,
    MobileAuthResponse,
    OperatorLoginInput,
    SupabaseAccessTokenInput,
)
from app.services.auth_service import AuthService

router = APIRouter()


def get_service(db: AsyncSession = Depends(get_session)) -> AuthService:
    return AuthService(db)


def set_session_cookie(response: Response, session_token: str) -> None:
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite="lax",
        path="/",
        domain=settings.SESSION_COOKIE_DOMAIN or None,
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",
        domain=settings.SESSION_COOKIE_DOMAIN or None,
    )


def web_login_error_url(code: str) -> str:
    login_url = urljoin(settings.WEB_APP_URL.rstrip("/") + "/", "login")
    parts = urlsplit(login_url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode({"error": code}), ""))


@router.get("/google/login", tags=["Auth"])
async def google_login(
    email: str = Query(...),
    next_path: str = Query(default="/dashboard", alias="next"),
    service: AuthService = Depends(get_service),
) -> RedirectResponse:
    return RedirectResponse(
        service.build_google_login_url(email=email, next_path=next_path),
        status_code=status.HTTP_303_SEE_OTHER,
    )


@router.get("/google/callback", tags=["Auth"])
async def google_callback(
    code: str = Query(...),
    oauth_state: str = Query(...),
    service: AuthService = Depends(get_service),
) -> RedirectResponse:
    try:
        _user, session_token, next_path = await service.complete_google_callback(
            code,
            oauth_state,
        )
    except HTTPException:
        return RedirectResponse(
            web_login_error_url("oauth_exchange_failed"),
            status_code=status.HTTP_303_SEE_OTHER,
        )

    redirect_url = urljoin(settings.WEB_APP_URL.rstrip("/") + "/", next_path.lstrip("/"))
    parts = urlsplit(redirect_url)
    query = dict(parse_qsl(parts.query))
    query["auth"] = "ok"
    redirect_url = urlunsplit(
        (parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment)
    )
    response = RedirectResponse(redirect_url, status_code=status.HTTP_303_SEE_OTHER)
    set_session_cookie(response, session_token)
    return response


@router.get("/me", response_model=AuthUserResponse, tags=["Auth"])
async def me(
    session_token: str | None = Cookie(default=None, alias=settings.SESSION_COOKIE_NAME),
    authorization: str | None = Header(default=None),
    service: AuthService = Depends(get_service),
) -> AuthUserResponse:
    bearer_token: str | None = None
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() == "bearer" and token:
            bearer_token = token
    return await service.get_user_from_session_token(bearer_token or session_token)


@router.post("/mobile/operator/login", response_model=MobileAuthResponse, tags=["Auth"])
async def mobile_operator_login(
    body: OperatorLoginInput,
    service: AuthService = Depends(get_service),
) -> MobileAuthResponse:
    user, access_token = await service.login_operator_with_password(
        email=str(body.email),
        password=body.password,
    )
    return MobileAuthResponse(access_token=access_token, user=user)


@router.post("/mobile/supabase-session", response_model=MobileAuthResponse, tags=["Auth"])
async def mobile_supabase_session(
    body: SupabaseAccessTokenInput,
    service: AuthService = Depends(get_service),
) -> MobileAuthResponse:
    user, access_token = await service.login_mobile_with_supabase_access_token(
        body.access_token,
    )
    return MobileAuthResponse(access_token=access_token, user=user)


@router.patch("/me", response_model=AuthUserResponse, tags=["Auth"])
async def update_me(
    body: AuthProfileUpdateInput,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: AuthService = Depends(get_service),
) -> AuthUserResponse:
    return await service.update_current_user_profile(current_user.id, body)


@router.post("/logout", tags=["Auth"])
async def logout(response: Response) -> dict[str, bool]:
    clear_session_cookie(response)
    return {"ok": True}
