"""Job queue: a queued job is claimed once; a second loop polling after the claim gets nothing."""
from enermod_api import models
from enermod_api.db import session_factory
from enermod_api.services.jobs import claim_next


def test_claim_next_is_atomic(client):
    db = session_factory()()
    try:
        db.query(models.Job).filter(models.Job.status == "queued").delete()
        job = models.Job(kind="metrics")
        db.add(job)
        db.commit()
        other = session_factory()()
        try:
            assert claim_next(db) == job.id
            assert claim_next(other) is None          # already claimed
        finally:
            other.close()
        db.refresh(job)
        assert job.status == "running"
        db.delete(job)
        db.commit()
    finally:
        db.close()
