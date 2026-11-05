from __future__ import annotations

import math
import re
from datetime import date

from django.conf import settings
from django.db import models
from django.urls import reverse
from django.utils import timezone
from django.utils.text import slugify


class Category(models.Model):
    name = models.CharField(max_length=60, unique=True)
    slug = models.SlugField(max_length=80, unique=True, blank=True)
    description = models.CharField(max_length=180, blank=True)
    icon = models.CharField(max_length=8, default="✦")
    accent = models.CharField(max_length=20, default="#c76b4f")
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "name"]
        verbose_name_plural = "categories"

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def get_absolute_url(self) -> str:
        return f"{reverse('story_list')}?category={self.slug}"


class Destination(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    country = models.CharField(max_length=80)
    flag = models.CharField(max_length=8, default="🏔️")
    tagline = models.CharField(max_length=160)
    summary = models.TextField(help_text="Short introduction used on cards.")
    description = models.TextField(help_text="Longer introduction for the destination page.")
    best_season = models.CharField(max_length=80, blank=True)
    altitude = models.CharField(max_length=60, blank=True)
    image = models.CharField(
        max_length=255,
        help_text="Static image path, for example images/hunza-valley.webp.",
    )
    accent = models.CharField(max_length=20, default="#c76b4f")
    highlights = models.TextField(
        blank=True,
        help_text="One highlight per line.",
    )
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def get_absolute_url(self) -> str:
        return reverse("destination_detail", args=[self.slug])

    @property
    def highlight_list(self) -> list[str]:
        return [line.strip() for line in self.highlights.splitlines() if line.strip()]

    @property
    def image_url(self) -> str:
        if self.image.startswith(("http://", "https://", "/")):
            return self.image
        return f"{settings.STATIC_URL}{self.image}"


class PostQuerySet(models.QuerySet):
    def published(self):
        return self.filter(
            status=Post.Status.PUBLISHED, published_at__lte=timezone.now()
        )


class Post(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    title = models.CharField(max_length=180)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="posts"
    )
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, related_name="posts"
    )
    destination = models.ForeignKey(
        Destination, on_delete=models.SET_NULL, null=True, blank=True, related_name="posts"
    )
    excerpt = models.TextField(
        max_length=320,
        blank=True,
        help_text="A short summary shown on cards and in search results.",
    )
    content = models.TextField(
        help_text="Plain text. Blank lines start new paragraphs; # headings, > quotes, - lists and **bold** are supported."
    )
    cover_image = models.ImageField(upload_to="covers/%Y/%m/", blank=True)
    cover_photo = models.CharField(
        max_length=255,
        blank=True,
        help_text="A static image path used by editorial content.",
    )
    cover_alt = models.CharField(max_length=180, blank=True)
    cover_credit = models.CharField(max_length=220, blank=True)
    cover_credit_url = models.URLField(blank=True)
    tags = models.CharField(
        max_length=220,
        blank=True,
        help_text="Comma-separated tags, for example food, craft, walking.",
    )
    read_minutes = models.PositiveSmallIntegerField(default=4)
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.DRAFT
    )
    featured = models.BooleanField(default=False)
    allow_comments = models.BooleanField(default=True)
    views = models.PositiveIntegerField(default=0)
    likes = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name="liked_posts"
    )
    bookmarks = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name="bookmarked_posts"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(default=timezone.now)

    objects = PostQuerySet.as_manager()

    class Meta:
        ordering = ["-published_at", "-created_at"]
        indexes = [
            models.Index(fields=["status", "-published_at"]),
            models.Index(fields=["slug"]),
        ]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)[:190] or "story"
            candidate = base
            index = 2
            while Post.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                candidate = f"{base}-{index}"
                index += 1
            self.slug = candidate
        if not self.excerpt:
            self.excerpt = self.plain_text[:260].rsplit(" ", 1)[0] + "…"
        if not self.cover_alt:
            self.cover_alt = self.title
        words = len(re.findall(r"\w+", self.content))
        self.read_minutes = max(1, math.ceil(words / 220))
        if self.status == self.Status.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    def get_absolute_url(self) -> str:
        return reverse("story_detail", args=[self.slug])

    @property
    def is_published(self) -> bool:
        return self.status == self.Status.PUBLISHED and self.published_at <= timezone.now()

    @property
    def cover_src(self) -> str:
        if self.cover_image:
            return self.cover_image.url
        if self.cover_photo:
            if self.cover_photo.startswith(("http://", "https://", "/")):
                return self.cover_photo
            return f"{settings.STATIC_URL}{self.cover_photo}"
        return f"{settings.STATIC_URL}images/fallback-cover.webp"

    @property
    def plain_text(self) -> str:
        text = re.sub(r"^[#>\-\s]+", "", self.content, flags=re.MULTILINE)
        text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
        text = re.sub(r"\*(.+?)\*", r"\1", text)
        return re.sub(r"\s+", " ", text).strip()

    @property
    def tag_list(self) -> list[str]:
        return [tag.strip() for tag in self.tags.split(",") if tag.strip()]

    @property
    def like_count(self) -> int:
        prefetched = getattr(self, "_prefetched_objects_cache", {})
        if "likes" in prefetched:
            return len(prefetched["likes"])
        return self.likes.count()

    @property
    def comment_count(self) -> int:
        prefetched = getattr(self, "_prefetched_objects_cache", {})
        if "comments" in prefetched:
            return sum(1 for comment in prefetched["comments"] if comment.is_active)
        return self.comments.filter(is_active=True).count()

    @property
    def bookmark_count(self) -> int:
        prefetched = getattr(self, "_prefetched_objects_cache", {})
        if "bookmarks" in prefetched:
            return len(prefetched["bookmarks"])
        return self.bookmarks.count()


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comments"
    )
    body = models.TextField(max_length=1500)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"Comment by {self.author} on {self.post}"

    @property
    def can_delete(self) -> bool:
        return True


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    display_name = models.CharField(max_length=80, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    location = models.CharField(max_length=100, blank=True)
    website = models.URLField(blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True)
    following = models.ManyToManyField(
        "self", symmetrical=False, blank=True, related_name="followers"
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.name

    @property
    def name(self) -> str:
        return self.display_name or self.user.get_full_name() or self.user.username

    @property
    def initial(self) -> str:
        return (self.name or "H")[0].upper()

    @property
    def story_count(self) -> int:
        return self.user.posts.published().count()

    @property
    def follower_count(self) -> int:
        return self.followers.count()

    @property
    def following_count(self) -> int:
        return self.following.count()

    @property
    def avatar_url(self) -> str | None:
        return self.avatar.url if self.avatar else None

    def get_absolute_url(self) -> str:
        return reverse("author_profile", args=[self.user.username])


class SocialIdentity(models.Model):
    class Provider(models.TextChoices):
        GOOGLE = "google", "Google"
        WECHAT = "wechat", "WeChat"
        PHONE = "phone", "Phone"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="social_identities",
    )
    provider = models.CharField(max_length=20, choices=Provider.choices)
    provider_user_id = models.CharField(max_length=191)
    email = models.EmailField(blank=True)
    display_name = models.CharField(max_length=150, blank=True)
    avatar_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_login_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "provider_user_id"],
                name="unique_social_provider_user",
            )
        ]
        ordering = ["provider", "provider_user_id"]

    def __str__(self) -> str:
        return f"{self.get_provider_display()} · {self.provider_user_id}"


class PhoneVerification(models.Model):
    phone = models.CharField(max_length=32, db_index=True)
    code_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Code for {self.phone}"

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    @property
    def is_usable(self) -> bool:
        return self.used_at is None and not self.is_expired and self.attempts < 5


class NewsletterSubscriber(models.Model):
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.email


class ContactMessage(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    subject = models.CharField(max_length=160)
    message = models.TextField(max_length=3000)
    created_at = models.DateTimeField(auto_now_add=True)
    handled = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.subject} — {self.name}"


def ensure_profile(user) -> Profile:
    """Return a profile, creating one for accounts made before signals existed."""
    profile, _ = Profile.objects.get_or_create(
        user=user,
        defaults={"display_name": user.get_full_name() or user.username},
    )
    return profile


def today() -> date:
    return timezone.localdate()
