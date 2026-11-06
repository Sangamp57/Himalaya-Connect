from __future__ import annotations

import re
import secrets
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone

from .models import SocialIdentity, ensure_profile

User = get_user_model()


def google_configured() -> bool:
    return bool(settings.GOOGLE_OAUTH_CLIENT_ID and settings.GOOGLE_OAUTH_CLIENT_SECRET)


def wechat_configured() -> bool:
    return bool(settings.WECHAT_APP_ID and settings.WECHAT_APP_SECRET)


def facebook_configured() -> bool:
    return bool(settings.FACEBOOK_APP_ID and settings.FACEBOOK_APP_SECRET)


def google_redirect_uri(request) -> str:
    return settings.GOOGLE_OAUTH_REDIRECT_URI or request.build_absolute_uri(
        reverse("google_callback")
    )


def wechat_redirect_uri(request) -> str:
    return settings.WECHAT_REDIRECT_URI or request.build_absolute_uri(
        reverse("wechat_callback")
    )


def facebook_redirect_uri(request) -> str:
    return settings.FACEBOOK_REDIRECT_URI or request.build_absolute_uri(
        reverse("facebook_callback")
    )


def google_login_url(request) -> str:
    state = secrets.token_urlsafe(24)
    request.session["google_oauth_state"] = state
    params = {
        "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
        "redirect_uri": google_redirect_uri(request),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    return "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)


def wechat_login_url(request) -> str:
    state = secrets.token_urlsafe(24)
    request.session["wechat_oauth_state"] = state
    params = {
        "appid": settings.WECHAT_APP_ID,
        "redirect_uri": wechat_redirect_uri(request),
        "response_type": "code",
        "scope": "snsapi_login",
        "state": state,
    }
    return "https://open.weixin.qq.com/connect/qrconnect?" + urlencode(params) + "#wechat_redirect"


def facebook_login_url(request) -> str:
    state = secrets.token_urlsafe(24)
    request.session["facebook_oauth_state"] = state
    params = {
        "client_id": settings.FACEBOOK_APP_ID,
        "redirect_uri": facebook_redirect_uri(request),
        "response_type": "code",
        "scope": "email,public_profile",
        "state": state,
    }
    return "https://www.facebook.com/v19.0/dialog/oauth?" + urlencode(params)


def exchange_google(code: str, redirect_uri: str) -> dict:
    response = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        },
        timeout=20,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("error"):
        raise ValueError(payload.get("error_description") or payload["error"])
    access_token = payload.get("access_token")
    if not access_token:
        raise ValueError("Google did not return an access token.")
    profile_response = requests.get(
        "https://openidconnect.googleapis.com/v1/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=20,
    )
    profile_response.raise_for_status()
    profile = profile_response.json()
    if not profile.get("sub"):
        raise ValueError("Google did not return an account identifier.")
    return {
        "provider_user_id": str(profile["sub"]),
        "email": profile.get("email", ""),
        "display_name": profile.get("name", ""),
        "avatar_url": profile.get("picture", ""),
    }


def exchange_wechat(code: str) -> dict:
    response = requests.get(
        "https://api.weixin.qq.com/sns/oauth2/access_token",
        params={
            "appid": settings.WECHAT_APP_ID,
            "secret": settings.WECHAT_APP_SECRET,
            "code": code,
            "grant_type": "authorization_code",
        },
        timeout=20,
    )
    response.raise_for_status()
    token = response.json()
    if token.get("errcode"):
        raise ValueError(token.get("errmsg") or "WeChat rejected the sign-in code.")
    access_token = token.get("access_token")
    openid = token.get("openid")
    if not access_token or not openid:
        raise ValueError("WeChat did not return an access token.")
    profile_response = requests.get(
        "https://api.weixin.qq.com/sns/userinfo",
        params={"access_token": access_token, "openid": openid, "lang": "en"},
        timeout=20,
    )
    profile_response.raise_for_status()
    profile = profile_response.json()
    if profile.get("errcode"):
        raise ValueError(profile.get("errmsg") or "WeChat did not return a profile.")
    return {
        "provider_user_id": str(profile.get("unionid") or openid),
        "email": "",
        "display_name": profile.get("nickname", ""),
        "avatar_url": profile.get("headimgurl", ""),
    }


def exchange_facebook(code: str, redirect_uri: str) -> dict:
    response = requests.get(
        "https://graph.facebook.com/v19.0/oauth/access_token",
        params={
            "client_id": settings.FACEBOOK_APP_ID,
            "client_secret": settings.FACEBOOK_APP_SECRET,
            "redirect_uri": redirect_uri,
            "code": code,
        },
        timeout=20,
    )
    response.raise_for_status()
    token = response.json()
    if token.get("error"):
        raise ValueError(token["error"].get("message") or "Facebook rejected the sign-in code.")
    access_token = token.get("access_token")
    if not access_token:
        raise ValueError("Facebook did not return an access token.")
    profile_response = requests.get(
        "https://graph.facebook.com/me",
        params={
            "fields": "id,name,email,picture.type(large)",
            "access_token": access_token,
        },
        timeout=20,
    )
    profile_response.raise_for_status()
    profile = profile_response.json()
    if profile.get("error") or not profile.get("id"):
        raise ValueError("Facebook did not return an account identifier.")
    picture = profile.get("picture") or {}
    return {
        "provider_user_id": str(profile["id"]),
        "email": profile.get("email", ""),
        "display_name": profile.get("name", ""),
        "avatar_url": (picture.get("data") or {}).get("url", ""),
    }


def normalize_phone(value: str) -> str:
    raw = re.sub(r"[^\d+]", "", str(value or ""))
    if raw.startswith("00"):
        raw = "+" + raw[2:]
    if not raw.startswith("+"):
        raw = "+" + raw
    digits = re.sub(r"\D", "", raw)
    if len(digits) < 8 or len(digits) > 15:
        raise ValueError("Enter a phone number with 8 to 15 digits.")
    return "+" + digits


def generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def send_sms(phone: str, message: str) -> None:
    backend = (settings.SMS_BACKEND or "console").lower()
    if backend == "console":
        print(f"[SMS to {phone}] {message}")
        return
    if backend == "twilio":
        if not (
            settings.TWILIO_ACCOUNT_SID
            and settings.TWILIO_AUTH_TOKEN
            and settings.TWILIO_FROM_NUMBER
        ):
            raise RuntimeError("Twilio SMS is selected but its credentials are incomplete.")
        response = requests.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json",
            auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            data={
                "From": settings.TWILIO_FROM_NUMBER,
                "To": phone,
                "Body": message,
            },
            timeout=20,
        )
        response.raise_for_status()
        return
    if backend == "webhook":
        if not settings.SMS_WEBHOOK_URL:
            raise RuntimeError("SMS webhook is selected but SMS_WEBHOOK_URL is empty.")
        headers = {"Content-Type": "application/json"}
        if settings.SMS_WEBHOOK_TOKEN:
            headers["Authorization"] = f"Bearer {settings.SMS_WEBHOOK_TOKEN}"
        response = requests.post(
            settings.SMS_WEBHOOK_URL,
            json={"to": phone, "message": message, "sender": settings.SMS_SENDER},
            headers=headers,
            timeout=20,
        )
        response.raise_for_status()
        return
    raise RuntimeError(f"Unknown SMS_BACKEND: {settings.SMS_BACKEND}")


def _unique_username(base: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9_.-]", "", base)[:120] or "traveller"
    candidate = base
    index = 2
    while User.objects.filter(username__iexact=candidate).exists():
        candidate = f"{base}-{index}"
        index += 1
    return candidate


def get_or_create_social_user(
    provider: str,
    provider_user_id: str,
    *,
    email: str = "",
    display_name: str = "",
    avatar_url: str = "",
):
    identity = (
        SocialIdentity.objects.select_related("user")
        .filter(provider=provider, provider_user_id=str(provider_user_id))
        .first()
    )
    if identity:
        identity.last_login_at = timezone.now()
        identity.display_name = display_name or identity.display_name
        identity.avatar_url = avatar_url or identity.avatar_url
        identity.email = email or identity.email
        identity.save(update_fields=["last_login_at", "display_name", "avatar_url", "email"])
        ensure_profile(identity.user)
        return identity.user

    user = None
    if email:
        user = User.objects.filter(email__iexact=email).order_by("id").first()
    if user is None:
        username = _unique_username(f"{provider}_{provider_user_id}")
        user = User.objects.create_user(username=username, email=email or "", password=None)
        user.set_unusable_password()
        user.first_name = (display_name or "")[:150]
        user.save(update_fields=["password", "first_name", "email"])
    profile = ensure_profile(user)
    if display_name and not profile.display_name:
        profile.display_name = display_name[:80]
        profile.save(update_fields=["display_name"])
    SocialIdentity.objects.create(
        user=user,
        provider=provider,
        provider_user_id=str(provider_user_id),
        email=email or "",
        display_name=display_name[:150],
        avatar_url=avatar_url,
        last_login_at=timezone.now(),
    )
    return user


def get_or_create_phone_user(phone: str):
    identity = (
        SocialIdentity.objects.select_related("user")
        .filter(provider=SocialIdentity.Provider.PHONE, provider_user_id=phone)
        .first()
    )
    if identity:
        identity.last_login_at = timezone.now()
        identity.save(update_fields=["last_login_at"])
        ensure_profile(identity.user)
        return identity.user
    digits = re.sub(r"\D", "", phone)
    username = _unique_username(f"phone_{digits[-10:]}")
    user = User.objects.create_user(username=username, email="", password=None)
    user.set_unusable_password()
    user.save(update_fields=["password"])
    profile = ensure_profile(user)
    profile.display_name = f"Phone guest · {digits[-4:]}"
    profile.save(update_fields=["display_name"])
    SocialIdentity.objects.create(
        user=user,
        provider=SocialIdentity.Provider.PHONE,
        provider_user_id=phone,
        display_name=profile.display_name,
        last_login_at=timezone.now(),
    )
    return user
