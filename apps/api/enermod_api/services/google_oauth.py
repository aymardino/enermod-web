"""Sign in with Google: OpenID Connect, authorization-code flow, server side.

The browser is sent to Google with a signed `state`; Google sends it back to the web app's
`/api/auth/google/callback`, which the proxy forwards here. The code is exchanged for tokens
and the verified e-mail identifies (or creates) the account. Tests monkeypatch `exchange_code`
and `fetch_userinfo`."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import httpx

from enermod_api.config import get_settings

AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
STATE_MAX_AGE = 600          # seconds between leaving for Google and coming back


class OAuthError(Exception):
    pass


def configured() -> bool:
    s = get_settings()
    return bool(s.google_client_id and s.google_client_secret)


def authorize_url(redirect_uri: str, state: str) -> str:
    q = {
        "client_id": get_settings().google_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    return f"{AUTHORIZE_URL}?{urlencode(q)}"


def exchange_code(code: str, redirect_uri: str) -> dict:
    s = get_settings()
    try:
        r = httpx.post(TOKEN_URL, timeout=15, data={
            "code": code, "client_id": s.google_client_id, "client_secret": s.google_client_secret,
            "redirect_uri": redirect_uri, "grant_type": "authorization_code",
        })
        r.raise_for_status()
        return r.json()
    except (httpx.HTTPError, ValueError) as e:
        raise OAuthError("Google did not accept the sign-in code") from e


def fetch_userinfo(access_token: str) -> dict:
    try:
        r = httpx.get(USERINFO_URL, timeout=15, headers={"Authorization": f"Bearer {access_token}"})
        r.raise_for_status()
        return r.json()
    except (httpx.HTTPError, ValueError) as e:
        raise OAuthError("Google did not return the account details") from e


# ── state: self-contained and signed, so nothing is stored while the visitor is at Google ──
def _sign(payload: bytes) -> str:
    return hmac.new(get_settings().secret_key.encode(), payload, hashlib.sha256).hexdigest()


def make_state(next_path: str, nonce: str, locale: str) -> str:
    payload = base64.urlsafe_b64encode(json.dumps({"n": next_path, "c": nonce, "l": locale, "t": int(time.time())}).encode()).decode().rstrip("=")
    return f"{payload}.{_sign(payload.encode())}"


def read_state(state: str) -> dict | None:
    """The decoded state, or None when it is malformed, tampered with or older than STATE_MAX_AGE."""
    if not state or "." not in state:
        return None
    payload, sig = state.rsplit(".", 1)
    if not hmac.compare_digest(sig, _sign(payload.encode())):
        return None
    try:
        data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    except (ValueError, UnicodeDecodeError):
        return None
    if not isinstance(data, dict) or time.time() - int(data.get("t", 0)) > STATE_MAX_AGE:
        return None
    return data
