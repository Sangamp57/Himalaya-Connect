from __future__ import annotations

from django.core.cache import cache


def client_ip(request) -> str:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def is_rate_limited(
    request, action: str, *, limit: int = 20, window_seconds: int = 300
) -> bool:
    """A small cache-backed throttle for public write endpoints.

    This is deliberately lightweight: it is a speed bump, not a substitute for
    an edge rate limiter in a production deployment.
    """
    key = f"rate:{action}:{client_ip(request)}"
    current = cache.get(key, 0)
    if current >= limit:
        return True
    if current == 0:
        cache.set(key, 1, window_seconds)
    else:
        cache.incr(key)
    return False
