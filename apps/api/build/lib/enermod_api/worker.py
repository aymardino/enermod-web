"""`python -m enermod_api.worker`: runs queued jobs (discovery, metrics, survey sync)."""
import logging

from enermod_api.db import create_all
from enermod_api.services.jobs import worker_loop

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    create_all()
    worker_loop()
