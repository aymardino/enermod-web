from fastapi.testclient import TestClient

from enermod_api.main import app


def test_register_login_me_logout():
    with TestClient(app) as c:
        r = c.post("/auth/register", json={"email": "someone@example.org", "password": "long-enough-pw", "name": "S"})
        assert r.status_code == 201 and r.json()["role"] == "contributor"
        assert c.get("/auth/me").json()["email"] == "someone@example.org"
        assert c.post("/auth/register", json={"email": "someone@example.org", "password": "long-enough-pw"}).status_code == 409
        assert c.get("/auth/session").json()["user"]["email"] == "someone@example.org"
        c.post("/auth/logout")
        assert c.get("/auth/me").status_code == 401
        assert c.get("/auth/session").json() == {"user": None}
        assert c.post("/auth/login", json={"email": "someone@example.org", "password": "wrong-password"}).status_code == 401
        r = c.post("/auth/login", json={"email": "someone@example.org", "password": "long-enough-pw"})
        assert r.status_code == 200
        r = c.patch("/auth/me", json={"name": "Renamed", "locale": "fr"})
        assert r.json()["name"] == "Renamed" and r.json()["locale"] == "fr"


def test_magic_link_dev_flow():
    with TestClient(app) as c:
        r = c.post("/auth/magic-link", json={"email": "magic@example.org", "locale": "fr"})
        assert r.status_code == 200 and "dev_link" in r.json()
        token = r.json()["dev_link"].split("token=")[1]
        r = c.post("/auth/magic-link/verify", json={"token": token})
        assert r.status_code == 200 and r.json()["email"] == "magic@example.org" and r.json()["email_verified"]
        assert c.post("/auth/magic-link/verify", json={"token": token}).status_code == 400   # single use


def test_admin_area_requires_curator(client, member, admin):
    assert client.get("/admin/overview").status_code == 401
    assert member.get("/admin/overview").status_code == 403
    r = admin.get("/admin/overview")
    assert r.status_code == 200 and "pending_contributions" in r.json()
    assert member.get("/admin/users").status_code == 403
    users = admin.get("/admin/users").json()
    assert any(u["email"] == "member@example.org" for u in users)
    uid = next(u["id"] for u in users if u["email"] == "member@example.org")
    assert admin.patch(f"/admin/users/{uid}/role", json={"role": "curator"}).json()["role"] == "curator"
    assert member.get("/admin/overview").status_code == 200
    admin.patch(f"/admin/users/{uid}/role", json={"role": "contributor"})


def test_password_forgot_sends_a_link_that_lands_on_the_password_page():
    with TestClient(app) as c:
        c.post("/auth/register", json={"email": "lost@example.org", "password": "first-password", "name": "L"})
        c.post("/auth/logout")
        # unknown address: same answer, no link (no account probing)
        r = c.post("/auth/password/forgot", json={"email": "nobody@example.org", "locale": "fr"})
        assert r.status_code == 200 and r.json() == {"ok": True}
        r = c.post("/auth/password/forgot", json={"email": "Lost@example.org", "locale": "fr"})
        assert r.status_code == 200 and "dev_link" in r.json()
        link = r.json()["dev_link"]
        assert "/fr/auth/magic?" in link and "next=%2Faccount%2Fpassword" in link
        token = link.split("token=")[1].split("&")[0]
        r = c.post("/auth/magic-link/verify", json={"token": token})
        assert r.status_code == 200 and r.json()["email"] == "lost@example.org"
        r = c.patch("/auth/me", json={"password": "second-password"})
        assert r.status_code == 200
        c.post("/auth/logout")
        assert c.post("/auth/login", json={"email": "lost@example.org", "password": "first-password"}).status_code == 401
        assert c.post("/auth/login", json={"email": "lost@example.org", "password": "second-password"}).status_code == 200


def test_new_password_signs_other_browsers_out():
    with TestClient(app) as a, TestClient(app) as b:
        a.post("/auth/register", json={"email": "two@example.org", "password": "first-password"})
        assert b.post("/auth/login", json={"email": "two@example.org", "password": "first-password"}).status_code == 200
        assert a.patch("/auth/me", json={"password": "second-password"}).status_code == 200
        assert a.get("/auth/me").status_code == 200
        assert b.get("/auth/me").status_code == 401


def _google_on(monkeypatch):
    from enermod_api.config import get_settings
    s = get_settings()
    monkeypatch.setattr(s, "google_client_id", "client-id")
    monkeypatch.setattr(s, "google_client_secret", "client-secret")


def test_google_sign_in_round_trip(monkeypatch):
    from urllib.parse import parse_qs, urlparse

    from enermod_api.services import google_oauth

    with TestClient(app) as c:
        assert c.get("/auth/google/start").status_code == 404          # not configured
        _google_on(monkeypatch)
        assert c.get("/auth/providers").json()["google"] is True
        r = c.get("/auth/google/start", params={"next": "/observatory/map", "locale": "fr"}, follow_redirects=False)
        assert r.status_code == 302
        to = urlparse(r.headers["location"])
        q = parse_qs(to.query)
        assert to.netloc == "accounts.google.com"
        assert q["redirect_uri"] == ["http://localhost:3000/api/auth/google/callback"]
        assert q["scope"] == ["openid email profile"] and q["client_id"] == ["client-id"]
        state = q["state"][0]
        assert "enermod_oauth" in r.cookies

        calls = {}

        def exchange(code, redirect_uri):
            calls["code"], calls["redirect_uri"] = code, redirect_uri
            return {"access_token": "at-1"}

        monkeypatch.setattr(google_oauth, "exchange_code", exchange)
        monkeypatch.setattr(google_oauth, "fetch_userinfo",
                            lambda token: {"sub": "1", "email": "G.User@example.org", "email_verified": True, "name": "G User"})
        # a tampered state, or one from another browser, is refused and ends that round trip
        r = c.get("/auth/google/callback", params={"code": "abc", "state": state + "x"}, follow_redirects=False)
        assert r.status_code == 302 and r.headers["location"].endswith("/sign-in?error=google")
        assert c.get("/auth/me").status_code == 401
        r = c.get("/auth/google/callback", params={"code": "abc", "state": state}, follow_redirects=False)
        assert r.headers["location"].endswith("/sign-in?error=google")       # the nonce cookie is gone
        # a fresh round trip
        r = c.get("/auth/google/start", params={"next": "/observatory/map", "locale": "fr"}, follow_redirects=False)
        state = parse_qs(urlparse(r.headers["location"]).query)["state"][0]
        r = c.get("/auth/google/callback", params={"code": "abc", "state": state}, follow_redirects=False)
        assert r.status_code == 302 and r.headers["location"] == "http://localhost:3000/fr/observatory/map"
        assert calls == {"code": "abc", "redirect_uri": "http://localhost:3000/api/auth/google/callback"}
        me = c.get("/auth/me").json()
        assert me["email"] == "g.user@example.org" and me["name"] == "G User" and me["email_verified"] and me["role"] == "contributor"


def test_google_refuses_unverified_email_and_bad_next(monkeypatch):
    from urllib.parse import parse_qs, urlparse

    from enermod_api.services import google_oauth

    _google_on(monkeypatch)
    with TestClient(app) as c:
        r = c.get("/auth/google/start", params={"next": "https://evil.example/phish"}, follow_redirects=False)
        state = parse_qs(urlparse(r.headers["location"]).query)["state"][0]
        monkeypatch.setattr(google_oauth, "exchange_code", lambda code, redirect_uri: {"access_token": "at"})
        monkeypatch.setattr(google_oauth, "fetch_userinfo", lambda token: {"email": "x@example.org", "email_verified": False})
        r = c.get("/auth/google/callback", params={"code": "abc", "state": state}, follow_redirects=False)
        assert r.headers["location"].endswith("/sign-in?error=google") and c.get("/auth/me").status_code == 401
        # verified: the foreign "next" falls back to the contribute page
        r = c.get("/auth/google/start", params={"next": "https://evil.example/phish"}, follow_redirects=False)
        state = parse_qs(urlparse(r.headers["location"]).query)["state"][0]
        monkeypatch.setattr(google_oauth, "fetch_userinfo", lambda token: {"email": "x@example.org", "email_verified": True})
        r = c.get("/auth/google/callback", params={"code": "abc", "state": state}, follow_redirects=False)
        assert r.headers["location"] == "http://localhost:3000/contribute"
