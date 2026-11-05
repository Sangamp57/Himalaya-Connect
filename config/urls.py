from django.conf import settings
from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import include, path, re_path, reverse_lazy

urlpatterns = [
    path("admin/", admin.site.urls),
    path(
        "accounts/password-reset/",
        auth_views.PasswordResetView.as_view(
            template_name="accounts/password_reset_form.html",
            email_template_name="accounts/password_reset_email.txt",
            subject_template_name="accounts/password_reset_subject.txt",
            success_url=reverse_lazy("password_reset_done"),
        ),
        name="password_reset",
    ),
    path(
        "accounts/password-reset/done/",
        auth_views.PasswordResetDoneView.as_view(
            template_name="accounts/password_reset_done.html"
        ),
        name="password_reset_done",
    ),
    path(
        "accounts/reset/<uidb64>/<token>/",
        auth_views.PasswordResetConfirmView.as_view(
            template_name="accounts/password_reset_confirm.html",
            success_url=reverse_lazy("password_reset_complete"),
        ),
        name="password_reset_confirm",
    ),
    path(
        "accounts/reset/done/",
        auth_views.PasswordResetCompleteView.as_view(
            template_name="accounts/password_reset_complete.html"
        ),
        name="password_reset_complete",
    ),
    path(
        "accounts/password-change/",
        auth_views.PasswordChangeView.as_view(
            template_name="accounts/password_change_form.html",
            success_url=reverse_lazy("password_change_done"),
        ),
        name="password_change",
    ),
    path(
        "accounts/password-change/done/",
        auth_views.PasswordChangeDoneView.as_view(
            template_name="accounts/password_change_done.html"
        ),
        name="password_change_done",
    ),
    path("", include("journal.urls")),
]

handler404 = "journal.views.not_found"
handler500 = "journal.views.server_error"

if settings.DEBUG:
    # Serve static/media with no-cache headers so the explorer always reflects
    # the files on disk. Run the dev server with `--nostatic` for this to take
    # effect (otherwise runserver serves static before these URL patterns).
    from config.dev_views import media_serve_no_cache, static_serve_no_cache

    urlpatterns += [
        re_path(r"^static/(?P<path>.*)$", static_serve_no_cache, {"insecure": True}),
        re_path(
            r"^media/(?P<path>.*)$",
            media_serve_no_cache,
            {"document_root": settings.MEDIA_ROOT},
        ),
    ]
