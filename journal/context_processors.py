from __future__ import annotations

from django.db.utils import OperationalError, ProgrammingError
from django.utils import timezone

from .models import Category, Destination


def site_context(request):
    """Navigation and footer data, resilient before the first migration."""
    try:
        categories = Category.objects.all()[:8]
        destinations = Destination.objects.all()[:4]
    except (OperationalError, ProgrammingError):
        categories = []
        destinations = []

    bookmarks = 0
    if request.user.is_authenticated:
        try:
            bookmarks = request.user.bookmarked_posts.count()
        except (OperationalError, ProgrammingError):
            bookmarks = 0

    return {
        "nav_categories": categories,
        "nav_destinations": destinations,
        "bookmark_count": bookmarks,
        "current_year": timezone.localdate().year,
    }
