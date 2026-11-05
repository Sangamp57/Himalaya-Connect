from __future__ import annotations

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse

from .models import PhoneVerification, SocialIdentity

User = get_user_model()


class PhoneAuthTests(TestCase):
    def test_phone_signup_and_verification(self):
        with patch("journal.views.generate_code", return_value="123456"), patch(
            "journal.views.send_sms"
        ) as sms:
            response = self.client.post(
                reverse("phone_login"), {"phone": "+977 9800000000"}
            )
        self.assertRedirects(response, reverse("phone_verify"))
        sms.assert_called_once()
        self.assertTrue(
            PhoneVerification.objects.filter(phone="+9779800000000").exists()
        )

        response = self.client.post(reverse("phone_verify"), {"code": "123456"})
        self.assertRedirects(response, reverse("dashboard"))
        identity = SocialIdentity.objects.get(provider=SocialIdentity.Provider.PHONE)
        self.assertEqual(identity.provider_user_id, "+9779800000000")
        self.assertEqual(self.client.session["_auth_user_id"], str(identity.user_id))

    def test_wrong_phone_code_is_rejected(self):
        with patch("journal.views.generate_code", return_value="123456"), patch(
            "journal.views.send_sms"
        ):
            self.client.post(reverse("phone_login"), {"phone": "+9779800000001"})
        response = self.client.post(reverse("phone_verify"), {"code": "000000"})
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("_auth_user_id", self.client.session)

    @override_settings(
        GOOGLE_OAUTH_CLIENT_ID="",
        GOOGLE_OAUTH_CLIENT_SECRET="",
        WECHAT_APP_ID="",
        WECHAT_APP_SECRET="",
        FACEBOOK_APP_ID="",
        FACEBOOK_APP_SECRET="",
    )
    def test_unconfigured_social_providers_redirect_to_login(self):
        for name in ("google_login", "wechat_login", "facebook_login"):
            response = self.client.get(reverse(name))
            self.assertRedirects(response, reverse("login"))
