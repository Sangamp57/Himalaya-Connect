from __future__ import annotations

from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.core.exceptions import ValidationError
from django.utils.text import slugify

from .models import Category, Comment, ContactMessage, Destination, Post, Profile

User = get_user_model()


class StyledFormMixin:
    def _style_fields(self):
        for name, field in self.fields.items():
            widget = field.widget
            if isinstance(widget, forms.CheckboxInput):
                widget.attrs.setdefault("class", "field-check")
                continue
            existing = widget.attrs.get("class", "")
            if "field-input" not in existing and not isinstance(
                widget, (forms.HiddenInput, forms.FileInput)
            ):
                widget.attrs["class"] = f"{existing} field-input".strip()
            if isinstance(widget, forms.Textarea):
                classes = widget.attrs.get("class", "").split()
                if "field-textarea" not in classes:
                    widget.attrs["class"] = (
                        f"{widget.attrs.get('class', '')} field-textarea"
                    ).strip()
            if isinstance(widget, forms.Select):
                classes = widget.attrs.get("class", "").split()
                if "field-select" not in classes:
                    widget.attrs["class"] = (
                        f"{widget.attrs.get('class', '')} field-select"
                    ).strip()
            if isinstance(widget, forms.FileInput):
                widget.attrs.setdefault("class", "field-file")


class SignUpForm(StyledFormMixin, UserCreationForm):
    display_name = forms.CharField(
        label="Your name",
        max_length=80,
        widget=forms.TextInput(
            attrs={
                "placeholder": "How should we introduce you?",
                "autocomplete": "name",
            }
        ),
    )
    email = forms.EmailField(
        label="Email address",
        widget=forms.EmailInput(
            attrs={"placeholder": "you@example.com", "autocomplete": "email"}
        ),
    )
    terms = forms.BooleanField(
        label="I agree to the journal's approach and community guidelines",
        required=True,
        error_messages={
            "required": "Please accept the community guidelines to create an account."
        },
        widget=forms.CheckboxInput(attrs={"class": "field-check"}),
    )

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("display_name", "username", "email")
        widgets = {
            "username": forms.TextInput(
                attrs={
                    "placeholder": "Choose a username",
                    "autocomplete": "username",
                }
            )
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].help_text = (
            "Letters, digits and @/./+/-/_ only. This is your public handle."
        )
        self._style_fields()

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise ValidationError("An account with this email already exists.")
        return email

    def clean_username(self):
        username = self.cleaned_data["username"].strip()
        if User.objects.filter(username__iexact=username).exists():
            raise ValidationError("That username is already taken.")
        return username

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data["email"]
        full_name = self.cleaned_data["display_name"].strip()
        user.first_name = full_name[:150]
        if commit:
            user.save()
            profile = user.profile
            profile.display_name = full_name
            profile.save(update_fields=["display_name"])
        return user


class SignInForm(StyledFormMixin, AuthenticationForm):
    username = forms.CharField(
        label="Email or username",
        widget=forms.TextInput(
            attrs={
                "placeholder": "Email or username",
                "autocomplete": "username",
                "autofocus": True,
            }
        ),
    )
    password = forms.CharField(
        label="Password",
        strip=False,
        widget=forms.PasswordInput(
            attrs={"placeholder": "Your password", "autocomplete": "current-password"}
        ),
    )

    error_messages = {
        "invalid_login": "That email/username and password did not match. Please try again.",
        "inactive": "This account has been disabled.",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._style_fields()


class ProfileForm(StyledFormMixin, forms.ModelForm):
    class Meta:
        model = Profile
        fields = ("display_name", "bio", "location", "website", "avatar")
        widgets = {
            "bio": forms.Textarea(
                attrs={
                    "rows": 5,
                    "placeholder": "A few lines about the places, people and details you notice.",
                }
            ),
            "display_name": forms.TextInput(attrs={"placeholder": "Your display name"}),
            "location": forms.TextInput(attrs={"placeholder": "Kathmandu, Nepal"}),
            "website": forms.URLInput(attrs={"placeholder": "https://your-site.com"}),
            "avatar": forms.ClearableFileInput(attrs={"accept": "image/*"}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._style_fields()
        self.fields["avatar"].help_text = "Square images work best. JPG, PNG or WebP."

    def clean_avatar(self):
        avatar = self.cleaned_data.get("avatar")
        if avatar and getattr(avatar, "size", 0) > 4 * 1024 * 1024:
            raise ValidationError("Please choose an image smaller than 4 MB.")
        return avatar


class PostForm(StyledFormMixin, forms.ModelForm):
    class Meta:
        model = Post
        fields = (
            "title",
            "category",
            "destination",
            "excerpt",
            "content",
            "cover_image",
            "cover_alt",
            "cover_credit",
            "cover_credit_url",
            "tags",
            "status",
            "allow_comments",
        )
        widgets = {
            "title": forms.TextInput(
                attrs={"placeholder": "A title that earns its place"}
            ),
            "excerpt": forms.Textarea(
                attrs={
                    "rows": 3,
                    "placeholder": "One or two sentences that invite the reader in.",
                }
            ),
            "content": forms.Textarea(
                attrs={
                    "rows": 18,
                    "placeholder": (
                        "Tell the story...\n\n"
                        "Blank lines start new paragraphs. Use ## for a heading, "
                        "> for a quote, - for a list, and **bold** for emphasis."
                    ),
                    "data-story-editor": "",
                }
            ),
            "cover_image": forms.ClearableFileInput(attrs={"accept": "image/*"}),
            "cover_alt": forms.TextInput(
                attrs={"placeholder": "Describe the photo for screen readers"}
            ),
            "cover_credit": forms.TextInput(
                attrs={"placeholder": "Photographer / source (optional)"}
            ),
            "cover_credit_url": forms.URLInput(
                attrs={"placeholder": "https://source-page.example"}
            ),
            "tags": forms.TextInput(
                attrs={"placeholder": "food, walking, nepal"}
            ),
            "status": forms.Select(attrs={"class": "field-input field-select"}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._style_fields()
        self.fields["category"].queryset = Category.objects.all()
        self.fields["destination"].queryset = Destination.objects.all()
        self.fields["category"].empty_label = "Choose a category"
        self.fields["destination"].empty_label = "No single destination"
        self.fields["cover_image"].help_text = (
            "Optional if you use the default editorial artwork. JPG, PNG or WebP, up to 8 MB."
        )
        self.fields["excerpt"].help_text = (
            "Leave blank and we will use the opening of your story."
        )

    def clean_cover_image(self):
        image = self.cleaned_data.get("cover_image")
        if image and getattr(image, "size", 0) > 8 * 1024 * 1024:
            raise ValidationError("Please choose an image smaller than 8 MB.")
        return image

    def clean_tags(self):
        raw = self.cleaned_data.get("tags", "")
        tags = [slugify(tag) for tag in raw.split(",") if tag.strip()]
        return ", ".join(dict.fromkeys(tags))[:220]

    def clean_title(self):
        title = self.cleaned_data["title"].strip()
        if len(title) < 6:
            raise ValidationError("Give the story a slightly longer title.")
        return title


class CommentForm(StyledFormMixin, forms.ModelForm):
    class Meta:
        model = Comment
        fields = ("body",)
        widgets = {
            "body": forms.Textarea(
                attrs={
                    "rows": 4,
                    "placeholder": "Add a thoughtful note…",
                    "maxlength": 1500,
                }
            )
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._style_fields()

    def clean_body(self):
        body = self.cleaned_data["body"].strip()
        if len(body) < 3:
            raise ValidationError("Your comment is a little too short.")
        return body


class ContactForm(StyledFormMixin, forms.ModelForm):
    # A simple honeypot. Real visitors never fill this hidden field.
    company = forms.CharField(required=False, widget=forms.HiddenInput)

    class Meta:
        model = ContactMessage
        fields = ("name", "email", "subject", "message")
        widgets = {
            "name": forms.TextInput(
                attrs={"placeholder": "Your name", "autocomplete": "name"}
            ),
            "email": forms.EmailInput(
                attrs={"placeholder": "you@example.com", "autocomplete": "email"}
            ),
            "subject": forms.TextInput(
                attrs={"placeholder": "What would you like to talk about?"}
            ),
            "message": forms.Textarea(
                attrs={"rows": 6, "placeholder": "Write your message here…"}
            ),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._style_fields()

    def clean_company(self):
        if self.cleaned_data.get("company"):
            raise ValidationError("Spam protection triggered.")
        return ""


class NewsletterForm(StyledFormMixin, forms.Form):
    email = forms.EmailField(
        label="Email address",
        widget=forms.EmailInput(
            attrs={
                "placeholder": "Your email address",
                "autocomplete": "email",
                "aria-label": "Email address",
            }
        ),
    )
    company = forms.CharField(required=False, widget=forms.HiddenInput)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._style_fields()

    def clean_company(self):
        if self.cleaned_data.get("company"):
            raise ValidationError("Spam protection triggered.")
        return ""


class PhoneLoginForm(StyledFormMixin, forms.Form):
    phone = forms.CharField(
        label="Phone number",
        max_length=32,
        widget=forms.TextInput(
            attrs={
                "placeholder": "+977 98XXXXXXXX",
                "autocomplete": "tel",
                "inputmode": "tel",
            }
        ),
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._style_fields()


class PhoneVerifyForm(StyledFormMixin, forms.Form):
    code = forms.CharField(
        label="Six-digit code",
        max_length=6,
        min_length=6,
        widget=forms.TextInput(
            attrs={
                "placeholder": "123456",
                "autocomplete": "one-time-code",
                "inputmode": "numeric",
                "pattern": "[0-9]{6}",
            }
        ),
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._style_fields()


class SearchForm(forms.Form):
    q = forms.CharField(
        required=False,
        label="Search stories",
        widget=forms.TextInput(
            attrs={
                "class": "field-input search-input",
                "placeholder": "Search stories, places, tags…",
                "aria-label": "Search stories",
            }
        ),
    )
