from __future__ import annotations

import json

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from .models import ExplorerProgress

User = get_user_model()


class ExplorerProgressTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="explorer",
            email="explorer@example.com",
            password="A-strong-pass-2026",
        )
        cls.other = User.objects.create_user(
            username="other-explorer",
            email="other@example.com",
            password="A-strong-pass-2026",
        )

    def test_anonymous_progress_api_redirects_to_login(self):
        for name, method in (
            ("explorer_progress", self.client.get),
            ("save_explorer_progress", self.client.post),
        ):
            response = method(reverse(name))
            self.assertEqual(response.status_code, 302)
            self.assertIn(reverse("login"), response.url)

    def test_empty_progress_is_null(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse("explorer_progress"))
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["progress"])

    def test_save_and_reload_progress(self):
        self.client.force_login(self.user)
        state = {
            "version": 1,
            "xp": 42,
            "discoveredObjects": ["ne-window"],
            "collection": {"ne-window": "2026-11-06T00:00:00Z"},
            "settings": {"sound": True},
        }
        response = self.client.post(
            reverse("save_explorer_progress"),
            data=json.dumps({"progress": state}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["saved"])
        self.assertEqual(ExplorerProgress.objects.get(user=self.user).state, state)

        response = self.client.get(reverse("explorer_progress"))
        self.assertEqual(response.json()["progress"], state)
        self.assertIn("no-cache", response.headers.get("Cache-Control", ""))

    def test_invalid_payloads_are_rejected(self):
        self.client.force_login(self.user)
        invalid_payloads = [
            "{not-json",
            "[]",
            "null",
            json.dumps({}),
            json.dumps({"progress": []}),
            json.dumps({"progress": "not-an-object"}),
        ]
        for payload in invalid_payloads:
            response = self.client.post(
                reverse("save_explorer_progress"),
                data=payload,
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 400, payload)
        self.assertFalse(ExplorerProgress.objects.filter(user=self.user).exists())

    def test_oversized_payload_is_rejected(self):
        self.client.force_login(self.user)
        payload = json.dumps({"progress": {"blob": "x" * (300 * 1024)}})
        response = self.client.post(
            reverse("save_explorer_progress"),
            data=payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 413)
        self.assertFalse(ExplorerProgress.objects.filter(user=self.user).exists())

    def test_progress_is_isolated_per_user(self):
        self.client.force_login(self.user)
        self.client.post(
            reverse("save_explorer_progress"),
            data=json.dumps({"progress": {"xp": 7}}),
            content_type="application/json",
        )
        self.client.force_login(self.other)
        response = self.client.get(reverse("explorer_progress"))
        self.assertIsNone(response.json()["progress"])

    def test_explore_page_exposes_auth_and_api_urls(self):
        response = self.client.get(reverse("explore"))
        self.assertContains(response, 'data-authenticated="false"')
        self.assertContains(response, reverse("explorer_progress"))
        self.assertContains(response, reverse("save_explorer_progress"))

        self.client.force_login(self.user)
        response = self.client.get(reverse("explore"))
        self.assertContains(response, 'data-authenticated="true"')
