"""Development-only views that serve static and media without browser caching."""

from __future__ import annotations

from django.contrib.staticfiles import views as static_views
from django.views.static import serve as django_static_serve


def _no_cache(response):
    response["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response["Pragma"] = "no-cache"
    response["Expires"] = "0"
    return response


def static_serve_no_cache(request, path, insecure=True, **kwargs):
    """Serve a static file and force the browser to revalidate every time."""
    return _no_cache(static_views.serve(request, path, insecure=insecure, **kwargs))


def media_serve_no_cache(request, path, document_root=None, **kwargs):
    """Serve an uploaded media file and force revalidation."""
    return _no_cache(
        django_static_serve(request, path, document_root=document_root, **kwargs)
    )
