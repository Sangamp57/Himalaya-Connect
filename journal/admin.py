from django.contrib import admin
from django.utils.html import format_html

from .models import (
    Category,
    Comment,
    ContactMessage,
    Destination,
    NewsletterSubscriber,
    PhoneVerification,
    Post,
    Profile,
    SocialIdentity,
)

admin.site.site_header = "Himalaya Connect"
admin.site.site_title = "Himalaya Connect admin"
admin.site.index_title = "Journal management"


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "icon", "accent", "order")
    list_editable = ("order",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Destination)
class DestinationAdmin(admin.ModelAdmin):
    list_display = ("name", "country", "flag", "best_season", "order")
    list_editable = ("order",)
    search_fields = ("name", "country", "summary")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "author",
        "category",
        "status",
        "featured",
        "published_at",
        "view_count",
        "like_total",
    )
    list_filter = ("status", "featured", "category", "destination", "allow_comments")
    search_fields = ("title", "excerpt", "content", "tags", "author__username")
    prepopulated_fields = {"slug": ("title",)}
    date_hierarchy = "published_at"
    autocomplete_fields = ("author",)
    list_editable = ("featured",)
    actions = ("publish", "unpublish", "feature", "unfeature")
    readonly_fields = ("views", "created_at", "updated_at", "cover_preview")

    fieldsets = (
        (
            "Story",
            {
                "fields": (
                    "title",
                    "slug",
                    "author",
                    "category",
                    "destination",
                    "excerpt",
                    "content",
                )
            },
        ),
        (
            "Photography",
            {
                "fields": (
                    "cover_image",
                    "cover_photo",
                    "cover_preview",
                    "cover_alt",
                    "cover_credit",
                    "cover_credit_url",
                )
            },
        ),
        (
            "Publishing",
            {
                "fields": (
                    "status",
                    "featured",
                    "allow_comments",
                    "published_at",
                    "tags",
                    "views",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    @admin.display(description="views")
    def view_count(self, obj):
        return obj.views

    @admin.display(description="likes")
    def like_total(self, obj):
        return obj.like_count

    @admin.display(description="current cover")
    def cover_preview(self, obj):
        if obj.pk:
            return format_html(
                '<img src="{}" alt="" style="max-width:260px;border-radius:12px" />',
                obj.cover_src,
            )
        return "Save the story to preview its cover."

    def save_model(self, request, obj, form, change):
        from django.utils import timezone

        if obj.status == Post.Status.PUBLISHED and (
            not obj.published_at or (change and "status" in form.changed_data)
        ):
            obj.published_at = timezone.now()
        super().save_model(request, obj, form, change)

    @admin.action(description="Publish selected stories")
    def publish(self, request, queryset):
        from django.utils import timezone

        updated = queryset.update(status=Post.Status.PUBLISHED, published_at=timezone.now())
        self.message_user(request, f"{updated} story(ies) published.")

    @admin.action(description="Move selected stories to drafts")
    def unpublish(self, request, queryset):
        updated = queryset.update(status=Post.Status.DRAFT)
        self.message_user(request, f"{updated} story(ies) moved to drafts.")

    @admin.action(description="Feature selected stories")
    def feature(self, request, queryset):
        updated = queryset.update(featured=True)
        self.message_user(request, f"{updated} story(ies) featured.")

    @admin.action(description="Remove selected stories from features")
    def unfeature(self, request, queryset):
        updated = queryset.update(featured=False)
        self.message_user(request, f"{updated} story(ies) unfeatured.")


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("author", "post", "short_body", "is_active", "created_at")
    list_filter = ("is_active", "created_at")
    search_fields = ("author__username", "post__title", "body")
    actions = ("hide_comments", "show_comments")

    @admin.display(description="comment")
    def short_body(self, obj):
        return obj.body if len(obj.body) < 80 else f"{obj.body[:77]}…"

    @admin.action(description="Hide selected comments")
    def hide_comments(self, request, queryset):
        queryset.update(is_active=False)

    @admin.action(description="Show selected comments")
    def show_comments(self, request, queryset):
        queryset.update(is_active=True)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "location", "joined_at")
    search_fields = ("display_name", "user__username", "user__email", "bio")
    autocomplete_fields = ("user", "following")


@admin.register(SocialIdentity)
class SocialIdentityAdmin(admin.ModelAdmin):
    list_display = ("provider", "provider_user_id", "user", "email", "last_login_at")
    list_filter = ("provider",)
    search_fields = ("provider_user_id", "email", "user__username", "user__email")
    autocomplete_fields = ("user",)


@admin.register(PhoneVerification)
class PhoneVerificationAdmin(admin.ModelAdmin):
    list_display = ("phone", "created_at", "expires_at", "attempts", "used_at")
    list_filter = ("used_at",)
    search_fields = ("phone",)
    readonly_fields = ("phone", "code_hash", "expires_at", "attempts", "used_at", "created_at")


@admin.register(NewsletterSubscriber)
class NewsletterAdmin(admin.ModelAdmin):
    list_display = ("email", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("email",)


@admin.register(ContactMessage)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("subject", "name", "email", "created_at", "handled")
    list_filter = ("handled", "created_at")
    search_fields = ("name", "email", "subject", "message")
    readonly_fields = ("name", "email", "subject", "message", "created_at")
