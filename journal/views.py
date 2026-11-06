from __future__ import annotations

import json
import os
from datetime import timedelta
from urllib import error as urllib_error
from urllib import request as urllib_request

from django.conf import settings
from django.contrib import messages
from django.contrib.auth import get_user_model, login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.hashers import check_password, make_password
from django.core.paginator import Paginator
from django.db.models import Count, F, Q, Sum
from django.http import Http404, HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_GET, require_POST

from .forms import (
    CommentForm,
    ContactForm,
    NewsletterForm,
    PhoneLoginForm,
    PhoneVerifyForm,
    PostForm,
    ProfileForm,
    SignInForm,
    SignUpForm,
)
from .models import (
    Category,
    Comment,
    Destination,
    ExplorerProgress,
    ExplorerAchievement,
    ExplorerHunt,
    ExplorerQuiz,
    ExplorerWorld,
    DiscoveryItem,
    NewsletterSubscriber,
    PhoneVerification,
    Post,
    Profile,
    ensure_profile,
)
from .ratelimit import is_rate_limited
from .social_auth import (
    exchange_facebook,
    exchange_google,
    exchange_wechat,
    facebook_configured,
    facebook_login_url,
    facebook_redirect_uri,
    generate_code,
    get_or_create_phone_user,
    get_or_create_social_user,
    google_configured,
    google_login_url,
    google_redirect_uri,
    normalize_phone,
    send_sms,
    wechat_configured,
    wechat_login_url,
    wechat_redirect_uri,
)

User = get_user_model()


def _is_ajax(request: HttpRequest) -> bool:
    return (
        request.headers.get("x-requested-with") == "XMLHttpRequest"
        or "application/json" in request.headers.get("accept", "")
    )


def _safe_next(request: HttpRequest, fallback: str) -> str:
    candidate = request.POST.get("next") or request.GET.get("next")
    if candidate and url_has_allowed_host_and_scheme(
        candidate,
        allowed_hosts={request.get_host()},
        require_https=request.is_secure(),
    ):
        return candidate
    return fallback


def _published_posts():
    return (
        Post.objects.published()
        .select_related("author", "author__profile", "category", "destination")
        .prefetch_related("likes", "bookmarks")
    )


# ---------------------------------------------------------------------------
# Public pages
# ---------------------------------------------------------------------------


@require_GET
def home(request):
    published = _published_posts()
    featured = list(published.filter(featured=True)[:3])
    if len(featured) < 3:
        seen = {post.pk for post in featured}
        for post in published.exclude(pk__in=seen)[: 3 - len(featured)]:
            featured.append(post)

    latest = list(published[:6])
    destinations = list(Destination.objects.all())
    categories = list(Category.objects.all())
    contributors = (
        User.objects.filter(posts__status=Post.Status.PUBLISHED)
        .annotate(story_total=Count("posts", filter=Q(posts__status=Post.Status.PUBLISHED)))
        .order_by("-story_total", "username")[:4]
    )

    context = {
        "featured": featured,
        "latest": latest,
        "destinations": destinations,
        "categories": categories,
        "contributors": contributors,
        "stats": {
            "stories": published.count(),
            "destinations": len(destinations),
            "contributors": User.objects.filter(
                posts__status=Post.Status.PUBLISHED
            ).distinct().count(),
        },
    }
    return render(request, "pages/home.html", context)


@require_GET
def explore(request):
    """The interactive 3D cultural explorer.

    The page is deliberately self-contained: the cultural dataset and the local
    progress model live on the client, so the experience works without an
    account. Optional server-side language-model credentials are detected here, never
    exposed to the browser.
    """
    return render(
        request,
        "explore/app.html",
        {
            "guide_live": bool(os.environ.get("OPENAI_API_KEY", "").strip()),
            "explorer_authenticated": request.user.is_authenticated,
        },
    )


@require_GET
def explorer_catalogue(request):
    worlds = list(ExplorerWorld.objects.filter(is_active=True).values(
        "slug", "name", "region", "description", "order", "destination_id"
    ))
    items = []
    for item in DiscoveryItem.objects.filter(is_active=True).select_related("world").prefetch_related("quizzes"):
        quiz = item.quizzes.filter(is_active=True).first()
        items.append({
            "key": item.key,
            "world": item.world.slug,
            "name": item.name,
            "description": item.description,
            "card_id": item.card_id,
            "quiz": ({
                "key": quiz.key,
                "question": quiz.question,
                "choices": quiz.choices,
                "correct_choice": quiz.correct_choice,
            } if quiz else None),
        })
    hunts = []
    for hunt in ExplorerHunt.objects.filter(is_active=True).prefetch_related("target_items"):
        hunts.append({
            "key": hunt.key,
            "title": hunt.title,
            "reward_card_id": hunt.reward_card_id,
            "xp_reward": hunt.xp_reward,
            "targets": list(hunt.target_items.values_list("key", flat=True)),
        })
    achievements = list(ExplorerAchievement.objects.filter(is_active=True).values(
        "key", "title", "description", "xp_reward"
    ))
    return JsonResponse({"worlds": worlds, "items": items, "hunts": hunts, "achievements": achievements})


@login_required
@require_GET
def explorer_progress(request):
    progress = ExplorerProgress.objects.filter(user=request.user).first()
    return JsonResponse({"progress": progress.state if progress else None})


@login_required
@require_POST
def save_explorer_progress(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
        state = payload.get("progress")
        if not isinstance(state, dict):
            raise ValueError
    except (ValueError, TypeError, json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid progress payload."}, status=400)
    progress, _ = ExplorerProgress.objects.update_or_create(
        user=request.user, defaults={"state": state}
    )
    return JsonResponse({"saved": True, "updated_at": progress.updated_at.isoformat()})


@require_POST
def cultural_guide(request):
    """Secure proxy for the optional live cultural-guide model.

    Without a server-side key the endpoint reports curated mode; the browser then
    uses its curated knowledge base. With a key, the request is proxied here so
    the credential never reaches frontend code.
    """
    if is_rate_limited(request, "cultural_guide", limit=30, window_seconds=600):
        return JsonResponse({"error": "Too many guide requests. Please take a short pause."}, status=429)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid request."}, status=400)

    message = str(payload.get("message", "")).strip()
    if not message:
        return JsonResponse({"error": "Please ask a question."}, status=400)
    message = message[:1200]

    language = str(payload.get("language", "en")).lower()
    language = language if language in {"en", "zh", "ne", "ur"} else "en"
    context = str(payload.get("context", "")).strip()[:900]
    history = payload.get("history")
    history_messages = []
    if isinstance(history, list):
        for item in history[-6:]:
            if not isinstance(item, dict):
                continue
            role = item.get("role")
            content = str(item.get("content", "")).strip()[:1000]
            if role in {"user", "assistant"} and content:
                history_messages.append({"role": role, "content": content})

    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        return JsonResponse(
            {
                "mode": "curated",
                "reply": None,
                "detail": "No live model is configured. The browser is using the curated knowledge base.",
            }
        )

    language_name = {
        "en": "English",
        "zh": "Simplified Chinese",
        "ne": "Nepali",
        "ur": "Urdu",
    }[language]
    system_prompt = (
        "You are the Himalaya Connect cultural guide, an educational assistant for Nepal, "
        "Pakistan and China. Answer in " + language_name + ". Be accurate, specific and "
        "respectful. Treat every country as culturally, linguistically and religiously diverse; "
        "do not generalise from one region or community to a whole country. Distinguish "
        "historical information from local custom and from the stylised 3D scene. Do not invent "
        "origins, quotations, dates or shared histories. If something is uncertain or varies, "
        "say so. Offer practical etiquette carefully and encourage asking local people. Avoid "
        "stereotypes and political speculation. Keep answers under 220 words and mention a "
        "related object or tradition when useful. The user's current explorer context is: "
        + (context or "No specific object selected.")
    )
    body = json.dumps(
        {
            "model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            "messages": [
                {"role": "system", "content": system_prompt},
                *history_messages,
                {"role": "user", "content": message},
            ],
            "temperature": 0.4,
            "max_tokens": 480,
        }
    ).encode("utf-8")
    endpoint = os.environ.get(
        "OPENAI_BASE_URL", "https://api.openai.com/v1/chat/completions"
    )
    model_request = urllib_request.Request(
        endpoint,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib_request.urlopen(model_request, timeout=25) as response:
            data = json.loads(response.read().decode("utf-8"))
        reply = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )
        if not reply:
            raise ValueError("The model returned an empty answer.")
    except (urllib_error.URLError, TimeoutError, ValueError, KeyError, json.JSONDecodeError):
        return JsonResponse(
            {
                "mode": "live",
                "error": "The live guide is unavailable right now.",
                "detail": "The browser can continue with the curated knowledge base.",
            },
            status=502,
        )

    return JsonResponse({"mode": "live", "reply": reply})


@require_GET
def story_list(request):
    posts = _published_posts()
    query = request.GET.get("q", "").strip()
    category_slug = request.GET.get("category", "").strip()
    destination_slug = request.GET.get("destination", "").strip()
    tag = request.GET.get("tag", "").strip()
    sort = request.GET.get("sort", "newest")
    saved = request.GET.get("saved") == "1"

    active_category = None
    active_destination = None

    if query:
        posts = posts.filter(
            Q(title__icontains=query)
            | Q(excerpt__icontains=query)
            | Q(content__icontains=query)
            | Q(tags__icontains=query)
            | Q(author__username__icontains=query)
            | Q(destination__name__icontains=query)
            | Q(category__name__icontains=query)
        )
    if category_slug:
        active_category = get_object_or_404(Category, slug=category_slug)
        posts = posts.filter(category=active_category)
    if destination_slug:
        active_destination = get_object_or_404(Destination, slug=destination_slug)
        posts = posts.filter(destination=active_destination)
    if tag:
        posts = posts.filter(tags__icontains=tag)
    if saved:
        if not request.user.is_authenticated:
            return redirect(f"{reverse('login')}?next={request.get_full_path()}")
        posts = posts.filter(bookmarks=request.user)

    if sort == "popular":
        posts = posts.annotate(popularity=Count("likes", distinct=True)).order_by(
            "-popularity", "-published_at"
        )
    elif sort == "oldest":
        posts = posts.order_by("published_at")
    else:
        sort = "newest"
        posts = posts.order_by("-published_at")

    paginator = Paginator(posts, settings.PAGINATE_BY)
    page_obj = paginator.get_page(request.GET.get("page"))

    context = {
        "page_obj": page_obj,
        "posts": page_obj.object_list,
        "query": query,
        "tag": tag,
        "sort": sort,
        "saved": saved,
        "active_category": active_category,
        "active_destination": active_destination,
        "categories": Category.objects.all(),
        "destinations": Destination.objects.all(),
        "result_count": paginator.count,
    }
    return render(request, "journal/story_list.html", context)


@require_GET
def story_detail(request, slug):
    post = get_object_or_404(
        Post.objects.select_related(
            "author", "author__profile", "category", "destination"
        ).prefetch_related("likes", "bookmarks", "comments__author__profile"),
        slug=slug,
    )
    if not post.is_published and not (
        request.user.is_authenticated
        and (request.user == post.author or request.user.is_staff)
    ):
        raise Http404("This story is not published yet.")

    session_key = f"viewed_story_{post.pk}"
    if not request.session.get(session_key):
        Post.objects.filter(pk=post.pk).update(views=F("views") + 1)
        post.views += 1
        request.session[session_key] = True

    liked = (
        request.user.is_authenticated
        and post.likes.filter(pk=request.user.pk).exists()
    )
    bookmarked = (
        request.user.is_authenticated
        and post.bookmarks.filter(pk=request.user.pk).exists()
    )

    related = (
        _published_posts()
        .filter(
            Q(category=post.category) | Q(destination=post.destination)
        )
        .exclude(pk=post.pk)
        .order_by("-published_at")[:3]
    )
    comments = post.comments.filter(is_active=True).select_related(
        "author", "author__profile"
    )

    return render(
        request,
        "journal/story_detail.html",
        {
            "post": post,
            "liked": liked,
            "bookmarked": bookmarked,
            "related": related,
            "comments": comments,
            "comment_form": CommentForm(),
        },
    )


@require_GET
def destination_list(request):
    destinations = Destination.objects.annotate(
        story_total=Count(
            "posts",
            filter=Q(posts__status=Post.Status.PUBLISHED),
            distinct=True,
        )
    ).all()
    return render(
        request, "journal/destination_list.html", {"destinations": destinations}
    )


@require_GET
def destination_detail(request, slug):
    destination = get_object_or_404(Destination, slug=slug)
    posts = _published_posts().filter(destination=destination)
    others = Destination.objects.exclude(pk=destination.pk)[:3]
    return render(
        request,
        "journal/destination_detail.html",
        {"destination": destination, "posts": posts, "others": others},
    )


@require_GET
def category_detail(request, slug):
    return redirect(f"{reverse('story_list')}?category={slug}")


@require_GET
def about(request):
    contributors = (
        User.objects.filter(posts__status=Post.Status.PUBLISHED)
        .select_related("profile")
        .annotate(story_total=Count("posts", filter=Q(posts__status=Post.Status.PUBLISHED)))
        .order_by("-story_total", "username")[:4]
    )
    return render(request, "pages/about.html", {"contributors": contributors})


def contact(request):
    if request.method == "POST":
        if is_rate_limited(request, "contact", limit=5, window_seconds=3600):
            messages.error(request, "Too many messages from this connection. Please try again later.")
            return redirect("contact")
        form = ContactForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(
                request,
                "Your note has reached the journal. We usually reply within two working days.",
            )
            return redirect("contact")
    else:
        form = ContactForm()
    return render(request, "pages/contact.html", {"form": form})


@require_POST
def newsletter_subscribe(request):
    if is_rate_limited(request, "newsletter", limit=10, window_seconds=3600):
        messages.error(request, "Please try again later.")
        return redirect(_safe_next(request, reverse("home")))

    form = NewsletterForm(request.POST)
    if form.is_valid():
        email = form.cleaned_data["email"].strip().lower()
        subscriber, created = NewsletterSubscriber.objects.get_or_create(email=email)
        if subscriber.is_active:
            message = (
                "You are on the list. A new field note will find you soon."
                if created
                else "You are already on the list — thank you."
            )
            messages.success(request, message)
        else:
            subscriber.is_active = True
            subscriber.save(update_fields=["is_active"])
            messages.success(request, "Welcome back. Your subscription is active again.")
    else:
        messages.error(request, "Please enter a valid email address.")
    return redirect(_safe_next(request, reverse("home")))


# ---------------------------------------------------------------------------
# Accounts
# ---------------------------------------------------------------------------


def signup(request):
    if request.user.is_authenticated:
        return redirect("dashboard")
    if request.method == "POST":
        if is_rate_limited(request, "signup", limit=10, window_seconds=900):
            messages.error(request, "Too many sign-up attempts. Please wait a few minutes.")
            return redirect("signup")
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()
            ensure_profile(user)
            auth_login(
                request,
                user,
                backend="journal.backends.EmailOrUsernameBackend",
            )
            messages.success(
                request,
                f"Welcome to the journal, {user.profile.name}. Your first field note is waiting to be written.",
            )
            return redirect("dashboard")
    else:
        form = SignUpForm()
    return render(request, "accounts/signup.html", {"form": form})


def signin(request):
    if request.user.is_authenticated:
        return redirect("dashboard")
    if request.method == "POST":
        if is_rate_limited(request, "login", limit=20, window_seconds=300):
            messages.error(request, "Too many attempts. Please wait a few minutes.")
            return redirect("login")
        form = SignInForm(request, data=request.POST)
        if form.is_valid():
            auth_login(request, form.get_user())
            ensure_profile(form.get_user())
            messages.success(request, f"Good to see you again, {form.get_user().profile.name}.")
            return redirect(_safe_next(request, reverse("dashboard")))
    else:
        form = SignInForm(request)
    return render(
        request,
        "accounts/login.html",
        {"form": form, "next": request.GET.get("next", "")},
    )


def social_login(request, provider):
    if request.user.is_authenticated:
        return redirect("dashboard")
    if provider == "google":
        if not google_configured():
            messages.error(request, "Google sign-in is not configured on this installation yet.")
            return redirect("login")
        return redirect(google_login_url(request))
    if provider == "wechat":
        if not wechat_configured():
            messages.error(request, "WeChat sign-in is not configured on this installation yet.")
            return redirect("login")
        return redirect(wechat_login_url(request))
    if provider == "facebook":
        if not facebook_configured():
            messages.error(request, "Facebook sign-in is not configured on this installation yet.")
            return redirect("login")
        return redirect(facebook_login_url(request))
    messages.error(request, "That sign-in provider is not available.")
    return redirect("login")


def social_callback(request, provider):
    if request.user.is_authenticated:
        return redirect("dashboard")
    state = request.GET.get("state", "")
    expected = request.session.pop(f"{provider}_oauth_state", "")
    if not state or not expected or state != expected:
        messages.error(request, "The sign-in request expired. Please try again.")
        return redirect("login")
    code = request.GET.get("code", "")
    if not code:
        messages.error(request, "The sign-in provider did not return a code.")
        return redirect("login")
    try:
        if provider == "google":
            profile = exchange_google(code, google_redirect_uri(request))
        elif provider == "wechat":
            profile = exchange_wechat(code)
        elif provider == "facebook":
            profile = exchange_facebook(code, facebook_redirect_uri(request))
        else:
            raise ValueError("Unknown provider.")
        user = get_or_create_social_user(
            provider,
            profile["provider_user_id"],
            email=profile.get("email", ""),
            display_name=profile.get("display_name", ""),
            avatar_url=profile.get("avatar_url", ""),
        )
    except Exception:
        messages.error(
            request,
            "We could not complete that sign-in. Please try again or use email and password.",
        )
        return redirect("login")
    auth_login(request, user, backend="journal.backends.EmailOrUsernameBackend")
    ensure_profile(user)
    messages.success(request, f"Welcome, {user.profile.name}. You are signed in.")
    return redirect("dashboard")


def phone_login(request):
    if request.user.is_authenticated:
        return redirect("dashboard")
    if request.method == "POST":
        if is_rate_limited(request, "phone_login", limit=8, window_seconds=3600):
            messages.error(request, "Too many code requests. Please wait a little before trying again.")
            return redirect("phone_login")
        form = PhoneLoginForm(request.POST)
        if form.is_valid():
            try:
                phone = normalize_phone(form.cleaned_data["phone"])
                code = generate_code()
                PhoneVerification.objects.filter(phone=phone, used_at__isnull=True).delete()
                PhoneVerification.objects.create(
                    phone=phone,
                    code_hash=make_password(code),
                    expires_at=timezone.now()
                    + timedelta(seconds=settings.PHONE_CODE_TTL_SECONDS),
                )
                send_sms(
                    phone,
                    f"{code} is your Himalaya Connect sign-in code. It expires in 10 minutes.",
                )
            except Exception:
                messages.error(
                    request,
                    "We could not send a code to that number. Check the number and try again.",
                )
            else:
                request.session["phone_auth_phone"] = phone
                if settings.DEBUG:
                    messages.info(request, f"Development mode: your code is {code}.")
                messages.success(request, "A six-digit code has been sent. Enter it on the next screen.")
                return redirect("phone_verify")
    else:
        form = PhoneLoginForm()
    return render(request, "accounts/phone_login.html", {"form": form})


def phone_verify(request):
    if request.user.is_authenticated:
        return redirect("dashboard")
    phone = request.session.get("phone_auth_phone")
    if not phone:
        messages.info(request, "Enter your phone number first.")
        return redirect("phone_login")
    if request.method == "POST":
        if is_rate_limited(request, "phone_verify", limit=30, window_seconds=600):
            messages.error(request, "Too many attempts. Please request a new code.")
            return redirect("phone_login")
        form = PhoneVerifyForm(request.POST)
        if form.is_valid():
            verification = (
                PhoneVerification.objects.filter(phone=phone, used_at__isnull=True)
                .order_by("-created_at")
                .first()
            )
            code = form.cleaned_data["code"]
            if not verification or not verification.is_usable:
                messages.error(request, "That code has expired. Request a new one.")
                return redirect("phone_login")
            if not check_password(code, verification.code_hash):
                verification.attempts += 1
                verification.save(update_fields=["attempts"])
                messages.error(request, "That code did not match. Please check it and try again.")
            else:
                verification.used_at = timezone.now()
                verification.save(update_fields=["used_at"])
                user = get_or_create_phone_user(phone)
                request.session.pop("phone_auth_phone", None)
                auth_login(request, user, backend="journal.backends.EmailOrUsernameBackend")
                ensure_profile(user)
                messages.success(request, "You are signed in with your phone number.")
                return redirect("dashboard")
    else:
        form = PhoneVerifyForm()
    return render(request, "accounts/phone_verify.html", {"form": form, "phone": phone})


@require_POST
def signout(request):
    auth_logout(request)
    messages.success(request, "You are signed out. The journal will keep your place.")
    return redirect("home")


@login_required
def profile_edit(request):
    profile = ensure_profile(request.user)
    if request.method == "POST":
        form = ProfileForm(request.POST, request.FILES, instance=profile)
        if form.is_valid():
            form.save()
            messages.success(request, "Your profile has been updated.")
            return redirect("author_profile", username=request.user.username)
    else:
        form = ProfileForm(instance=profile)
    return render(
        request,
        "accounts/profile_edit.html",
        {"form": form, "profile": profile},
    )


@login_required
def account_settings(request):
    return render(request, "accounts/settings.html")


@login_required
def account_delete(request):
    if request.method == "POST":
        password = request.POST.get("password", "")
        confirmation = request.POST.get("confirmation", "")
        if confirmation != request.user.username:
            messages.error(request, "Type your username exactly to confirm account deletion.")
        elif not request.user.check_password(password):
            messages.error(request, "That password is not correct.")
        else:
            user = request.user
            auth_logout(request)
            user.delete()
            messages.success(request, "Your account and stories have been deleted.")
            return redirect("home")
    return render(request, "accounts/delete_account.html")


# ---------------------------------------------------------------------------
# Author workspace
# ---------------------------------------------------------------------------


@login_required
@require_GET
def dashboard(request):
    posts = (
        request.user.posts.select_related("category", "destination")
        .prefetch_related("likes")
        .order_by("-updated_at")
    )
    published_count = posts.filter(status=Post.Status.PUBLISHED).count()
    draft_count = posts.filter(status=Post.Status.DRAFT).count()
    total_views = posts.aggregate(total=Sum("views"))["total"] or 0
    total_likes = sum(post.like_count for post in posts)
    bookmarks = request.user.bookmarked_posts.published().select_related(
        "author", "category", "destination"
    )[:6]
    recent_comments = (
        Comment.objects.filter(post__author=request.user, is_active=True)
        .select_related("author", "author__profile", "post")
        .order_by("-created_at")[:5]
    )
    profile = ensure_profile(request.user)
    return render(
        request,
        "accounts/dashboard.html",
        {
            "posts": posts,
            "published_count": published_count,
            "draft_count": draft_count,
            "total_views": total_views,
            "total_likes": total_likes,
            "bookmarks": bookmarks,
            "recent_comments": recent_comments,
            "profile": profile,
        },
    )


@login_required
def post_create(request):
    if request.method == "POST":
        form = PostForm(request.POST, request.FILES)
        if form.is_valid():
            post = form.save(commit=False)
            post.author = request.user
            if post.status == Post.Status.PUBLISHED and not post.published_at:
                post.published_at = timezone.now()
            post.save()
            messages.success(
                request,
                "Your story is published."
                if post.status == Post.Status.PUBLISHED
                else "Draft saved. You can keep working whenever you are ready.",
            )
            return redirect(post.get_absolute_url())
    else:
        form = PostForm()
    return render(request, "journal/story_form.html", {"form": form, "post": None})


@login_required
def post_edit(request, slug):
    post = get_object_or_404(Post, slug=slug)
    if post.author != request.user and not request.user.is_staff:
        return HttpResponse("You do not have permission to edit this story.", status=403)
    if request.method == "POST":
        was_published = post.status == Post.Status.PUBLISHED
        form = PostForm(request.POST, request.FILES, instance=post)
        if form.is_valid():
            post = form.save(commit=False)
            if post.status == Post.Status.PUBLISHED and not was_published:
                post.published_at = timezone.now()
            post.save()
            messages.success(request, "Your story has been updated.")
            return redirect(post.get_absolute_url())
    else:
        form = PostForm(instance=post)
    return render(request, "journal/story_form.html", {"form": form, "post": post})


@login_required
def post_delete(request, slug):
    post = get_object_or_404(Post, slug=slug)
    if post.author != request.user and not request.user.is_staff:
        return HttpResponse("You do not have permission to delete this story.", status=403)
    if request.method == "POST":
        title = post.title
        post.delete()
        messages.success(request, f"“{title}” has been deleted.")
        return redirect("dashboard")
    return render(request, "journal/story_confirm_delete.html", {"post": post})


# ---------------------------------------------------------------------------
# Social actions
# ---------------------------------------------------------------------------


@login_required
@require_POST
def toggle_like(request, slug):
    post = get_object_or_404(Post, slug=slug)
    if not post.is_published:
        raise Http404
    liked = post.likes.filter(pk=request.user.pk).exists()
    if liked:
        post.likes.remove(request.user)
    else:
        post.likes.add(request.user)
    if _is_ajax(request):
        return JsonResponse({"liked": not liked, "count": post.like_count})
    return redirect(post.get_absolute_url())


@login_required
@require_POST
def toggle_bookmark(request, slug):
    post = get_object_or_404(Post, slug=slug)
    if not post.is_published:
        raise Http404
    bookmarked = post.bookmarks.filter(pk=request.user.pk).exists()
    if bookmarked:
        post.bookmarks.remove(request.user)
    else:
        post.bookmarks.add(request.user)
    if _is_ajax(request):
        return JsonResponse({"bookmarked": not bookmarked, "count": post.bookmark_count})
    messages.success(
        request,
        "Removed from your reading list." if bookmarked else "Saved to your reading list.",
    )
    return redirect(post.get_absolute_url())


@login_required
@require_POST
def add_comment(request, slug):
    post = get_object_or_404(Post, slug=slug)
    if not post.is_published:
        raise Http404
    if not post.allow_comments:
        messages.error(request, "Comments are closed on this story.")
        return redirect(post.get_absolute_url())
    if is_rate_limited(request, "comment", limit=15, window_seconds=600):
        messages.error(request, "You are commenting very quickly. Please take a breath and try again.")
        return redirect(post.get_absolute_url())
    form = CommentForm(request.POST)
    if form.is_valid():
        comment = form.save(commit=False)
        comment.author = request.user
        comment.post = post
        comment.save()
        messages.success(request, "Your note is now part of the conversation.")
    else:
        messages.error(request, "Please write a slightly longer comment.")
    return redirect(f"{post.get_absolute_url()}#comments")


@login_required
@require_POST
def delete_comment(request, pk):
    comment = get_object_or_404(Comment, pk=pk)
    if (
        comment.author != request.user
        and comment.post.author != request.user
        and not request.user.is_staff
    ):
        return HttpResponse("You do not have permission to remove this comment.", status=403)
    post_url = comment.post.get_absolute_url()
    comment.delete()
    messages.success(request, "Comment removed.")
    return redirect(f"{post_url}#comments")


@login_required
@require_POST
def toggle_follow(request, username):
    profile = get_object_or_404(Profile, user__username=username)
    if profile.user == request.user:
        messages.info(request, "You are already following your own journey.")
        return redirect(profile.get_absolute_url())

    own_profile = ensure_profile(request.user)
    following = own_profile.following.filter(pk=profile.pk).exists()
    if following:
        own_profile.following.remove(profile)
        messages.success(request, f"You are no longer following {profile.name}.")
    else:
        own_profile.following.add(profile)
        messages.success(request, f"You are now following {profile.name}.")
    if _is_ajax(request):
        return JsonResponse(
            {
                "following": not following,
                "followers": profile.follower_count,
            }
        )
    return redirect(profile.get_absolute_url())


@require_GET
def author_profile(request, username):
    profile = get_object_or_404(
        Profile.objects.select_related("user").prefetch_related("following", "followers"),
        user__username=username,
    )
    posts = _published_posts().filter(author=profile.user)
    is_following = False
    if request.user.is_authenticated and request.user != profile.user:
        own_profile = ensure_profile(request.user)
        is_following = own_profile.following.filter(pk=profile.pk).exists()
    return render(
        request,
        "accounts/author_profile.html",
        {
            "profile": profile,
            "posts": posts,
            "is_following": is_following,
            "is_own_profile": request.user == profile.user,
        },
    )


# ---------------------------------------------------------------------------
# Errors and small utilities
# ---------------------------------------------------------------------------


@require_GET
def health(request):
    """Small unauthenticated health check for hosting platforms."""
    from django.db import connection
    from django.db.utils import OperationalError

    try:
        connection.ensure_connection()
    except OperationalError:
        return JsonResponse({"status": "error", "database": "unavailable"}, status=503)
    return JsonResponse(
        {"status": "ok", "service": "Himalaya Connect", "database": "ok"}
    )


@require_GET
def robots_txt(request):
    lines = [
        "User-agent: *",
        "Disallow: /admin/",
        "Disallow: /accounts/",
        "Disallow: /dashboard/",
        f"Sitemap: {request.build_absolute_uri('/sitemap.xml')}",
    ]
    return HttpResponse("\n".join(lines), content_type="text/plain")


@require_GET
def sitemap_xml(request):
    body = ['<?xml version="1.0" encoding="UTF-8"?>']
    body.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')

    static_urls = [
        reverse("home"),
        reverse("explore"),
        reverse("story_list"),
        reverse("destination_list"),
        reverse("about"),
        reverse("contact"),
    ]
    for path in static_urls:
        body.append(f"<url><loc>{request.build_absolute_uri(path)}</loc></url>")

    for destination in Destination.objects.all():
        body.append(
            f"<url><loc>{request.build_absolute_uri(destination.get_absolute_url())}</loc></url>"
        )
    for post in Post.objects.published().only("slug", "updated_at"):
        body.append(
            f"<url><loc>{request.build_absolute_uri(post.get_absolute_url())}</loc>"
            f"<lastmod>{post.updated_at.date().isoformat()}</lastmod></url>"
        )
    body.append("</urlset>")
    return HttpResponse("\n".join(body), content_type="application/xml")


def not_found(request, exception=None):
    return render(request, "404.html", status=404)


def server_error(request):
    return render(request, "500.html", status=500)
