"""Preserve the socket peer for application-level forwarded-header validation."""
from uvicorn_worker import UvicornWorker


class PeerPreservingWorker(UvicornWorker):
    CONFIG_KWARGS = {**UvicornWorker.CONFIG_KWARGS, 'proxy_headers': False}
