"""
Backend-owned authentication endpoints.
"""

from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit

from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    Header,
    HTTPException,
    Query,
    Request,
    Response,
    status,
)
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_session
from app.core.config import settings
from app.schemas.auth import (
    AuthProfileUpdateInput,
    AuthUserResponse,
    CredentialsLoginInput,
    FrontendSessionExchangeInput,
    FrontendSessionExchangeResponse,
    MobileAuthResponse,
    SupabaseAccessTokenInput,
    WebSessionTokenResponse,
)
from app.services.auth_service import AuthService

router = APIRouter()
OAUTH_STATE_COOKIE_NAME = "safecampus_oauth_state"


def request_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip() or None
    return request.client.host if request.client else None


def request_device(request: Request) -> str | None:
    return request.headers.get("user-agent")


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


def set_oauth_state_cookie(response: Response, oauth_state: str) -> None:
    response.set_cookie(
        key=OAUTH_STATE_COOKIE_NAME,
        value=oauth_state,
        max_age=10 * 60,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite="lax",
        path=f"{settings.API_V1_PREFIX}/auth/google",
        domain=settings.SESSION_COOKIE_DOMAIN or None,
    )


def clear_oauth_state_cookie(response: Response) -> None:
    response.delete_cookie(
        key=OAUTH_STATE_COOKIE_NAME,
        path=f"{settings.API_V1_PREFIX}/auth/google",
        domain=settings.SESSION_COOKIE_DOMAIN or None,
    )


def web_login_error_url(code: str) -> str:
    login_url = urljoin(settings.web_app_url_effective.rstrip("/") + "/", "login")
    parts = urlsplit(login_url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode({"error": code}), ""))


def frontend_session_handoff_required(web_origin: str | None) -> bool:
    if settings.SESSION_COOKIE_DOMAIN:
        return False

    frontend_parts = urlsplit(web_origin or settings.web_app_url_effective)
    backend_parts = urlsplit(settings.backend_public_url_effective)
    return bool(
        frontend_parts.hostname
        and backend_parts.hostname
        and frontend_parts.hostname != backend_parts.hostname
    )


def frontend_session_handoff_url(
    *,
    handoff_token: str,
    next_path: str,
    web_origin: str | None,
) -> str:
    callback_url = urljoin(
        (web_origin or settings.web_app_url_effective).rstrip("/") + "/",
        "auth/callback/session",
    )
    parts = urlsplit(callback_url)
    return urlunsplit(
        (
            parts.scheme,
            parts.netloc,
            parts.path,
            urlencode({"handoff": handoff_token, "next": next_path}),
            "",
        )
    )


@router.get("/google/login", tags=["Auth"])
async def google_login(
    email: str | None = Query(default=None),
    next_path: str = Query(default="/dashboard", alias="next"),
    institutional: bool = Query(default=True),
    web_origin: str | None = Query(default=None),
    service: AuthService = Depends(get_service),
) -> RedirectResponse:
    # institutional=True  → SSO exclusivo @pucp.edu.pe (auto-provisiona comunidad).
    # institutional=False → cuentas externas (Gmail) ya provisionadas por el admin.
    login_url, oauth_state = service.build_google_login_url(
        email=email,
        next_path=next_path,
        institutional=institutional,
        web_origin=web_origin,
    )
    response = RedirectResponse(login_url, status_code=status.HTTP_303_SEE_OTHER)
    set_oauth_state_cookie(response, oauth_state)
    return response


@router.get("/google/callback", tags=["Auth"])
async def google_callback(
    request: Request,
    code: str = Query(...),
    oauth_state: str | None = Query(default=None),
    oauth_state_cookie: str | None = Cookie(default=None, alias=OAUTH_STATE_COOKIE_NAME),
    service: AuthService = Depends(get_service),
) -> RedirectResponse:
    effective_oauth_state = oauth_state or oauth_state_cookie
    if not effective_oauth_state:
        response = RedirectResponse(
            web_login_error_url("oauth_state_missing"),
            status_code=status.HTTP_303_SEE_OTHER,
        )
        clear_oauth_state_cookie(response)
        return response

    try:
        user, session_token, next_path, web_origin = await service.complete_google_callback(
            code,
            effective_oauth_state,
            ip_origen=request_ip(request),
            dispositivo=request_device(request),
        )
    except HTTPException as exc:
        detail = str(exc.detail or "").lower()
        if exc.status_code == status.HTTP_403_FORBIDDEN:
            # 403 cubre varios casos: cuenta externa no registrada, desajuste de
            # dominio (SSO vs credenciales) y cuenta válida sin rol de canal web.
            if "registrada" in detail:
                error_code = "cuenta_no_registrada"
            elif "institucional" in detail or "autorizado" in detail or "sso" in detail:
                error_code = "correo_no_autorizado"
            else:
                error_code = "acceso_denegado"
        else:
            error_code = "oauth_exchange_failed"
        response = RedirectResponse(
            web_login_error_url(error_code),
            status_code=status.HTTP_303_SEE_OTHER,
        )
        clear_oauth_state_cookie(response)
        return response

    if frontend_session_handoff_required(web_origin):
        redirect_url = frontend_session_handoff_url(
            handoff_token=service.create_frontend_session_handoff_token(user),
            next_path=next_path,
            web_origin=web_origin,
        )
        response = RedirectResponse(redirect_url, status_code=status.HTTP_303_SEE_OTHER)
        clear_oauth_state_cookie(response)
        return response

    redirect_url = urljoin(
        (web_origin or settings.web_app_url_effective).rstrip("/") + "/",
        next_path.lstrip("/"),
    )
    parts = urlsplit(redirect_url)
    query = dict(parse_qsl(parts.query))
    query["auth"] = "ok"
    redirect_url = urlunsplit(
        (parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment)
    )
    response = RedirectResponse(redirect_url, status_code=status.HTTP_303_SEE_OTHER)
    set_session_cookie(response, session_token)
    clear_oauth_state_cookie(response)
    return response


@router.post(
    "/web/session/exchange",
    response_model=FrontendSessionExchangeResponse,
    tags=["Auth"],
)
async def exchange_frontend_session(
    body: FrontendSessionExchangeInput,
    service: AuthService = Depends(get_service),
) -> FrontendSessionExchangeResponse:
    user, session_token = await service.exchange_frontend_session_handoff(body.handoff_token)
    return FrontendSessionExchangeResponse(session_token=session_token, user=user)


@router.post("/web/ws-token", response_model=WebSessionTokenResponse, tags=["Auth"])
async def web_ws_token(
    current_user: AuthUserResponse = Depends(get_current_user),
    service: AuthService = Depends(get_service),
) -> WebSessionTokenResponse:
    return WebSessionTokenResponse(
        access_token=service.create_websocket_session_token(current_user),
    )


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
    request: Request,
    body: CredentialsLoginInput,
    service: AuthService = Depends(get_service),
) -> MobileAuthResponse:
    user, access_token = await service.login_operator_with_password(
        email=str(body.email),
        password=body.password,
        ip_origen=request_ip(request),
        dispositivo=request_device(request),
    )
    return MobileAuthResponse(access_token=access_token, user=user)


@router.post("/web/credentials/login", response_model=AuthUserResponse, tags=["Auth"])
async def web_credentials_login(
    request: Request,
    body: CredentialsLoginInput,
    response: Response,
    service: AuthService = Depends(get_service),
) -> AuthUserResponse:
    user, session_token = await service.login_web_with_credentials(
        email=str(body.email),
        password=body.password,
        ip_origen=request_ip(request),
        dispositivo=request_device(request),
    )
    set_session_cookie(response, session_token)
    return user


@router.post("/mobile/supabase-session", response_model=MobileAuthResponse, tags=["Auth"])
async def mobile_supabase_session(
    request: Request,
    body: SupabaseAccessTokenInput,
    service: AuthService = Depends(get_service),
) -> MobileAuthResponse:
    user, access_token = await service.login_mobile_with_supabase_access_token(
        body.access_token,
        ip_origen=request_ip(request),
        dispositivo=request_device(request),
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
