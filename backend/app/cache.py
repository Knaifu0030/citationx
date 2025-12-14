import time
from typing import Any, Dict, Optional, Tuple


class InMemoryCache:
    def __init__(self) -> None:
        self._store: Dict[str, Tuple[float, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if not entry:
            return None
        expires_at, value = entry
        if expires_at < time.time():
            self._store.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        expires_at = time.time() + ttl_seconds
        self._store[key] = (expires_at, value)


cache = InMemoryCache()


def cache_get(key: str) -> Optional[Any]:
    return cache.get(key)


def cache_set(key: str, value: Any, ttl_seconds: int) -> None:
    cache.set(key, value, ttl_seconds)
