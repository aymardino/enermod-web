"""EnerMod Africa Hub API application."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from enermod_api import __version__
from enermod_api.config import get_settings
from enermod_api.db import create_all
from enermod_api.routers import admin, auth, chat, contributions, events, public, recommend
from enermod_api.seed import seed_if_empty
from enermod_api.services import screening

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_all()           # idempotent, adds missing columns; migrations can take over once the schema stabilises
    seed_if_empty()        # loads data/enermod.db the first time an empty database is used
    try:
        from enermod_api.db import session_factory
        with session_factory()() as db:
            screening.backfill(db)   # scores the candidates found before the screening aid existed
    except Exception:                # noqa: BLE001
        logging.getLogger("enermod").exception("screening backfill failed")
    yield


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(title="EnerMod Africa Hub API", version=__version__, lifespan=lifespan,
                  docs_url="/docs" if s.debug else None, redoc_url=None, openapi_url="/openapi.json" if s.debug else None)
    app.add_middleware(CORSMiddleware, allow_origins=s.cors_origins, allow_credentials=True, allow_methods=["*"],
                       allow_headers=["*"])
    for r in (public.router, recommend.router, chat.router, contributions.router, events.router, auth.router, admin.router):
        app.include_router(r)

    @app.get("/health")
    def health():
        return {"ok": True, "version": __version__}

    return app


app = create_app()
