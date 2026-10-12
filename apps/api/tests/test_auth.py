from fastapi.testclient import TestClient

from enermod_api.main import app


def test_register_login_me_logout():
    with TestClient(app) as c:
        r = c.post("/auth/register", json={"email": "someone@example.org", "password": "long-enough-pw", "name": "S"})
        assert r.status_code == 201 and r.json()["role"] == "contributor"
        assert c.get("/auth/me").json()["email"] == "someone@example.org"
        assert c.post("/auth/register", json={"email": "someone@example.org", "password": "long-enough-pw"}).status_code == 409
        c.post("/auth/logout")
        assert c.get("/auth/me").status_code == 401
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
