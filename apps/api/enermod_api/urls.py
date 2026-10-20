"""Public URL of the web app (links in e-mails). Browsers reach the API through the web
app's /api proxy, so the API often does not know its public address: an explicit BASE_URL
wins; otherwise the proxy tells us the origin it was reached on (X-Enermod-Origin), trusted
only when the request carries the shared secret (X-Enermod-Proxy-Key)."""
from __future__ import annotations

import hmac

from fastapi import Request

from enermod_api.config import get_settings

ORIGIN_HEADER = "x-enermod-origin"
KEY_HEADER = "x-enermod-proxy-key"


def proxied_origin(request: Request | None) -> str | None:
    if request is None:
        return None
    origin = request.headers.get(ORIGIN_HEADER, "").strip().rstrip("/")
    key = request.headers.get(KEY_HEADER, "")
    if not origin.startswith(("http://", "https://")) or "/" in origin[8:] or not key:
        return None
    if not hmac.compare_digest(key.encode(), get_settings().secret_key.encode()):
        return None
    return origin


def public_base_url(request: Request | None = None) -> str:
    s = get_settings()
    if s.base_url_explicit:
        return s.base_url
    return proxied_origin(request) or s.base_url


def client_ip(request: Request) -> str:
    """The connecting client, for rate limits. The edge (Cloudflare in front of Render) sets its
    own single-valued header; failing that, the right-most X-Forwarded-For entry is the one the
    last proxy appended. The left-most entry is whatever the client sent and is never used."""
    h = request.headers
    edge = h.get("cf-connecting-ip") or h.get("true-client-ip")
    if edge:
        return edge.strip()
    fwd = h.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[-1].strip()
    return request.client.host if request.client else "0.0.0.0"
