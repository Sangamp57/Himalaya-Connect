from __future__ import annotations

import json
import os
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .models import Category, Comment, Destination, NewsletterSubscriber, Post, Profile
from .templatetags.journal_extras import story_body

User = get_user_model()


class JournalTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.writer = User.objects.create_user(
            username="writer",
            email="writer@example.com",
            password="A-strong-pass-2026",
        )
        cls.writer.profile.display_name = "Test Writer"
        cls.writer.profile.bio = "Writes about mountains."
        cls.writer.profile.save()

        cls.other = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="A-strong-pass-2026",
        )

        cls.category = Category.objects.create(
            name="Field Notes", slug="field-notes", icon="✦", accent="#b85d3f"
        )
        cls.destination = Destination.objects.create(
            name="Test Valley",
            slug="test-valley",
            country="Nepal",
            tagline="A test valley",
            summary="A small valley for testing.",
            description="A place used to verify the journal.",
            image="images/hunza-valley.webp",
            best_season="Spring",
            altitude="2,000 m",
            highlights="One\nTwo",
        )
        cls.post = Post.objects.create(
            title="A careful walk through the test valley",
            author=cls.writer,
            category=cls.category,
            destination=cls.destination,
            content=(
                "The path begins at a stone wall.\n\n"
                "## A heading\n\n"
                "> A quoted line.\n\n"
                "- First detail\n- Second detail\n\n"
                "The end."
            ),
            status=Post.Status.PUBLISHED,
            published_at=timezone.now(),
            cover_photo="images/hunza-valley.webp",
            tags="walking,test,valley",
        )

    def test_public_pages_render(self):
        urls = [
            reverse("home"),
            reverse("story_list"),
            reverse("destination_list"),
            reverse("destination_detail", args=[self.destination.slug]),
            reverse("about"),
            reverse("contact"),
            reverse("story_detail", args=[self.post.slug]),
            reverse("author_profile", args=[self.writer.username]),
            reverse("login"),
            reverse("signup"),
            reverse("password_reset"),
        ]
        for url in urls:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 200)

    def test_story_body_renders_safe_markup(self):
        rendered = str(story_body("## Heading\n\n> A quote\n\n- One\n- Two\n\n**Bold** text"))
        self.assertIn("<h2>Heading</h2>", rendered)
        self.assertIn("<blockquote><p>A quote</p></blockquote>", rendered)
        self.assertIn("<li>One</li>", rendered)
        self.assertIn("<strong>Bold</strong>", rendered)
        self.assertNotIn("<script>", str(story_body("<script>alert(1)</script>")))

    def test_search_filters_published_posts(self):
        response = self.client.get(reverse("story_list"), {"q": "stone wall"})
        self.assertContains(response, self.post.title)
        response = self.client.get(reverse("story_list"), {"category": "field-notes"})
        self.assertContains(response, self.post.title)
        response = self.client.get(reverse("story_list"), {"q": "nothing-matches"})
        self.assertNotContains(response, self.post.title)

    def test_signup_creates_profile_and_signs_in(self):
        response = self.client.post(
            reverse("signup"),
            {
                "display_name": "New Reader",
                "username": "newreader",
                "email": "newreader@example.com",
                "password1": "Another-strong-pass-2026",
                "password2": "Another-strong-pass-2026",
                "terms": "on",
            },
        )
        self.assertRedirects(response, reverse("dashboard"))
        user = User.objects.get(username="newreader")
        self.assertEqual(user.profile.display_name, "New Reader")
        self.assertEqual(user.email, "newreader@example.com")
        self.assertEqual(int(self.client.session["_auth_user_id"]), user.pk)

    def test_email_or_username_login(self):
        self.assertTrue(
            self.client.login(username="writer", password="A-strong-pass-2026")
        )
        self.client.logout()
        response = self.client.post(
            reverse("login"),
            {"username": "writer@example.com", "password": "A-strong-pass-2026"},
        )
        self.assertEqual(response.status_code, 302)
        self.assertIn("_auth_user_id", self.client.session)

    def test_draft_is_private(self):
        draft = Post.objects.create(
            title="Not ready yet",
            author=self.writer,
            category=self.category,
            content="Still working on this one.",
            status=Post.Status.DRAFT,
        )
        response = self.client.get(draft.get_absolute_url())
        self.assertEqual(response.status_code, 404)
        self.client.force_login(self.writer)
        response = self.client.get(draft.get_absolute_url())
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Draft preview")

    def test_author_can_create_and_edit_story(self):
        self.client.force_login(self.writer)
        response = self.client.post(
            reverse("post_create"),
            {
                "title": "A new story about tea",
                "category": self.category.pk,
                "destination": self.destination.pk,
                "excerpt": "A short introduction to a cup of tea.",
                "content": "A first paragraph.\n\n## A small heading\n\nA second paragraph.",
                "tags": "Tea, Walking, tea",
                "status": Post.Status.PUBLISHED,
                "allow_comments": "on",
            },
        )
        created = Post.objects.get(title="A new story about tea")
        self.assertRedirects(response, created.get_absolute_url())
        self.assertEqual(created.tags, "tea, walking")
        self.assertEqual(created.author, self.writer)

        response = self.client.post(
            reverse("post_edit", args=[created.slug]),
            {
                "title": "A new story about tea, edited",
                "category": self.category.pk,
                "destination": self.destination.pk,
                "excerpt": created.excerpt,
                "content": created.content,
                "tags": created.tags,
                "status": Post.Status.DRAFT,
                "allow_comments": "on",
            },
        )
        self.assertRedirects(response, created.get_absolute_url())
        created.refresh_from_db()
        self.assertEqual(created.title, "A new story about tea, edited")
        self.assertEqual(created.status, Post.Status.DRAFT)

    def test_other_user_cannot_edit_story(self):
        self.client.force_login(self.other)
        response = self.client.get(reverse("post_edit", args=[self.post.slug]))
        self.assertEqual(response.status_code, 403)
        response = self.client.post(reverse("post_delete", args=[self.post.slug]))
        self.assertEqual(response.status_code, 403)

    def test_like_and_bookmark_toggle(self):
        self.client.force_login(self.other)
        response = self.client.post(
            reverse("toggle_like", args=[self.post.slug]),
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["liked"])
        self.assertTrue(self.post.likes.filter(pk=self.other.pk).exists())
        response = self.client.post(
            reverse("toggle_like", args=[self.post.slug]),
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertFalse(response.json()["liked"])

        response = self.client.post(
            reverse("toggle_bookmark", args=[self.post.slug]),
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertTrue(response.json()["bookmarked"])
        response = self.client.get(reverse("story_list"), {"saved": "1"})
        self.assertContains(response, self.post.title)

    def test_comment_create_and_delete(self):
        self.client.force_login(self.other)
        response = self.client.post(
            reverse("add_comment", args=[self.post.slug]),
            {"body": "A thoughtful response to the story."},
        )
        self.assertEqual(response.status_code, 302)
        comment = Comment.objects.get(post=self.post, author=self.other)
        self.assertTrue(comment.is_active)
        self.assertEqual(self.post.comment_count, 1)

        response = self.client.post(reverse("delete_comment", args=[comment.pk]))
        self.assertEqual(response.status_code, 302)
        self.assertFalse(Comment.objects.filter(pk=comment.pk).exists())

    def test_follow_and_unfollow(self):
        self.client.force_login(self.other)
        response = self.client.post(
            reverse("toggle_follow", args=[self.writer.username]),
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["following"])
        self.assertTrue(
            self.other.profile.following.filter(pk=self.writer.profile.pk).exists()
        )
        response = self.client.post(
            reverse("toggle_follow", args=[self.writer.username]),
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertFalse(response.json()["following"])

    def test_contact_and_newsletter(self):
        response = self.client.post(
            reverse("contact"),
            {
                "name": "A Reader",
                "email": "reader@example.com",
                "subject": "Hello",
                "message": "I enjoyed the story about the valley.",
                "company": "",
            },
        )
        self.assertRedirects(response, reverse("contact"))
        self.assertEqual(
            self.client.get(reverse("contact")).status_code,
            200,
        )

        response = self.client.post(
            reverse("newsletter_subscribe"),
            {"email": "reader@example.com"},
        )
        self.assertEqual(response.status_code, 302)
        self.assertTrue(
            NewsletterSubscriber.objects.filter(
                email="reader@example.com", is_active=True
            ).exists()
        )
        # Subscribing twice should not create a duplicate.
        self.client.post(
            reverse("newsletter_subscribe"), {"email": "reader@example.com"}
        )
        self.assertEqual(
            NewsletterSubscriber.objects.filter(email="reader@example.com").count(), 1
        )

    def test_profile_edit(self):
        self.client.force_login(self.writer)
        response = self.client.post(
            reverse("profile_edit"),
            {
                "display_name": "Updated Name",
                "bio": "A new bio.",
                "location": "Kathmandu",
                "website": "https://example.com",
            },
        )
        self.assertRedirects(
            response, reverse("author_profile", args=[self.writer.username])
        )
        self.writer.profile.refresh_from_db()
        self.assertEqual(self.writer.profile.display_name, "Updated Name")

    def test_dashboard_requires_login(self):
        response = self.client.get(reverse("dashboard"))
        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("login"), response.url)
        self.client.force_login(self.writer)
        response = self.client.get(reverse("dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.post.title)

    def test_sitemap_and_robots(self):
        sitemap = self.client.get(reverse("sitemap_xml"))
        self.assertEqual(sitemap.status_code, 200)
        self.assertContains(sitemap, self.post.get_absolute_url())
        self.assertContains(self.client.get(reverse("robots_txt")), "Sitemap:")

    def test_health_check(self):
        response = self.client.get(reverse("health"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")


class ExploreTests(TestCase):
    def test_explorer_page_renders_canvas_and_sections(self):
        response = self.client.get(reverse("explore"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="explore-canvas"')
        self.assertContains(response, "Himalaya Connect")
        self.assertContains(response, "Today's cultural encounter")
        self.assertContains(response, 'id="guide-title"')

    @patch.dict(os.environ, {"OPENAI_API_KEY": ""}, clear=False)
    def test_cultural_guide_reports_curated_mode_without_key(self):
        response = self.client.post(
            reverse("cultural_guide"),
            data=json.dumps({"message": "What is a momo?", "language": "en"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["mode"], "curated")
        self.assertIsNone(body["reply"])

    def test_cultural_guide_rejects_empty_message(self):
        response = self.client.post(
            reverse("cultural_guide"),
            data=json.dumps({"message": "   "}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_sitemap_includes_explorer(self):
        response = self.client.get(reverse("sitemap_xml"))
        self.assertContains(response, reverse("explore"))
