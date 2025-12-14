import time
from typing import Dict, Tuple

LIMIT = 60  # requests
WINDOW_SECONDS = 60  # per IP per window


class RateLimiter:
    def __init__(self, limit: int = LIMIT, window_seconds: int = WINDOW_SECONDS) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._store: Dict[str, Tuple[int, int]] = {}

    def allow(self, key: str) -> Tuple[bool, int]:
        now = int(time.time())
        window = now // self.window_seconds
        count, active_window = self._store.get(key, (0, window))

        if active_window != window:
            count = 0
            active_window = window

        count += 1
        self._store[key] = (count, active_window)
        return count <= self.limit, self.limit - count


rate_limiter = RateLimiter()
