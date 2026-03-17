"""JWT verification for Supabase-issued tokens.

Supabase signs access tokens with either:
  - HS256 (older projects): symmetric signing using the project's JWT secret.
  - ES256 (newer projects): asymmetric signing via JWKS at
    {SUPABASE_URL}/auth/v1/.well-known/jwks.json

This module peeks at the unverified JWT header to determine the algorithm and
chooses the correct verification path automatically.  Set SUPABASE_URL in
the backend .env for ES256 projects (all new projects after ~2024).
"""

import json
import urllib.request
import uuid
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.algorithms import ECAlgorithm

from app.core.config import settings

_bearer = HTTPBearer(auto_error=False)

_UNAUTHORIZED = status.HTTP_401_UNAUTHORIZED
_WWW_AUTH = {"WWW-Authenticate": "Bearer"}


@lru_cache(maxsize=1)
def _fetch_jwks(supabase_url: str) -> list:
    """Fetch and cache the Supabase JWKS key list."""
    url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
    with urllib.request.urlopen(url, timeout=10) as resp:  # noqa: S310
        data = json.loads(resp.read())
    return data["keys"]


def _public_key_for_kid(supabase_url: str, kid: str | None):
    """Return the EC public key matching the given key ID from JWKS."""
    keys = _fetch_jwks(supabase_url)
    for key in keys:
        if kid is None or key.get("kid") == kid:
            kty = key.get("kty", "")
            if kty == "EC":
                return ECAlgorithm.from_jwk(json.dumps(key))
    raise ValueError(f"No EC key found in JWKS for kid={kid!r}")


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> uuid.UUID:
    """Verify the Supabase JWT and return the caller's user UUID.

    Raises 401 if the token is missing, malformed, expired, or the signature
    is invalid.  Raises 503 if required configuration is missing.
    """
    if credentials is None:
        raise HTTPException(
            status_code=_UNAUTHORIZED,
            detail=(
                "Authentication required. Include your Supabase access token as "
                "'Authorization: Bearer <token>'."
            ),
            headers=_WWW_AUTH,
        )

    # Peek at the header to determine the signing algorithm and key ID.
    try:
        unverified_header = jwt.get_unverified_header(credentials.credentials)
    except jwt.DecodeError as exc:
        raise HTTPException(
            status_code=_UNAUTHORIZED,
            detail=f"Malformed access token: {exc}",
            headers=_WWW_AUTH,
        )

    alg = unverified_header.get("alg", "HS256")
    kid = unverified_header.get("kid")

    try:
        if alg in ("ES256", "ES384", "ES512", "RS256", "RS384", "RS512"):
            # Asymmetric token — verify with the JWKS public key.
            if not settings.supabase_url:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=(
                        "Server is not configured for asymmetric JWT verification. "
                        "Set SUPABASE_URL in the backend environment."
                    ),
                )
            try:
                public_key = _public_key_for_kid(settings.supabase_url, kid)
            except Exception:
                # Key may have rotated; clear cache and retry once.
                _fetch_jwks.cache_clear()
                public_key = _public_key_for_kid(settings.supabase_url, kid)

            payload = jwt.decode(
                credentials.credentials,
                public_key,
                algorithms=[alg],
                options={"verify_aud": False},
            )
        else:
            # HS256 — verify with the shared secret.
            if not settings.supabase_jwt_secret:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=(
                        "Server authentication is not configured. "
                        "Set SUPABASE_JWT_SECRET in the backend environment."
                    ),
                )
            payload = jwt.decode(
                credentials.credentials,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=_UNAUTHORIZED,
            detail="Access token has expired. Please sign in again.",
            headers=_WWW_AUTH,
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=_UNAUTHORIZED,
            detail=f"Invalid access token: {exc}",
            headers=_WWW_AUTH,
        )

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=_UNAUTHORIZED,
            detail="Token is missing the 'sub' (user ID) claim.",
            headers=_WWW_AUTH,
        )

    try:
        return uuid.UUID(sub)
    except ValueError:
        raise HTTPException(
            status_code=_UNAUTHORIZED,
            detail="Token 'sub' claim is not a valid UUID.",
            headers=_WWW_AUTH,
        )
