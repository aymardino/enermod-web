"""Test configuration: SQLite database seeded from the bundled data/enermod.db, inline jobs,
console e-mail, one admin e-mail allowed."""
from __future__ import annotations

import os
import tempfile

import pytest

_TMP = tempfile.mkdtemp(prefix="enermod-tests-")
os.environ.update({
    "ENERMOD_ENV": "test",
    # TEST_DATABASE_URL=postgresql://... runs the suite against an empty PostgreSQL database.
    "DATABASE_URL": os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{_TMP}/test.db",
    "SECRET_KEY": "test-secret",
    "ADMIN_EMAILS": "admin@example.org",
    "INLINE_JOBS": "1",
    "EMAIL_PROVIDER": "console",
    "AI_PROVIDER": "auto",
})

from fastapi.testclient import TestClient  # noqa: E402

from enermod_api.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def admin(client):
    """A second client signed in as an admin (its e-mail is in ADMIN_EMAILS)."""
    with TestClient(app) as c:
        r = c.post("/auth/register", json={"email": "admin@example.org", "password": "secret-pass-1", "name": "Ada"})
        assert r.status_code == 201, r.text
        assert r.json()["role"] == "admin"
        yield c


@pytest.fixture(scope="session")
def member(client):
    with TestClient(app) as c:
        r = c.post("/auth/register", json={"email": "member@example.org", "password": "secret-pass-2", "name": "Mo"})
        assert r.status_code == 201, r.text
        assert r.json()["role"] == "contributor"
        yield c
