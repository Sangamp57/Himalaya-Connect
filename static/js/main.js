/* Himalaya Connect — navigation, parallax and editorial interactions. */
(function () {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  /* ---------------------------------------------------------------------
     Toast helper
     --------------------------------------------------------------------- */

  function showToast(message, type = "success") {
    let stack = $(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.setAttribute("role", "status");
    toast.innerHTML =
      '<span class="toast-dot" aria-hidden="true"></span>' +
      `<p></p>` +
      '<button type="button" class="toast-close" aria-label="Dismiss message">×</button>';
    $("p", toast).textContent = message;
    stack.appendChild(toast);
    const dismiss = () => {
      toast.classList.add("is-leaving");
      window.setTimeout(() => toast.remove(), 260);
    };
    $(".toast-close", toast).addEventListener("click", dismiss);
    window.setTimeout(dismiss, 5200);
  }

  /* ---------------------------------------------------------------------
     Header, mobile menu and search overlay
     --------------------------------------------------------------------- */

  const header = $("[data-header]");
  if (header) {
    const updateHeader = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 32);
    };
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  }

  const drawer = $("[data-drawer]");
  const menuButton = $("[data-menu-open]");
  let lastFocused = null;

  function openDrawer() {
    if (!drawer) return;
    lastFocused = document.activeElement;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    if (menuButton) menuButton.setAttribute("aria-expanded", "true");
    const closeButton = $("[data-menu-close]", drawer);
    if (closeButton) window.setTimeout(() => closeButton.focus(), 80);
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    if (menuButton) menuButton.setAttribute("aria-expanded", "false");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  if (drawer) {
    $$("[data-menu-open]").forEach((button) => button.addEventListener("click", openDrawer));
    $$("[data-menu-close]", drawer).forEach((button) =>
      button.addEventListener("click", closeDrawer)
    );
    $$(".drawer-nav a, .drawer-account a", drawer).forEach((link) =>
      link.addEventListener("click", closeDrawer)
    );
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && drawer.classList.contains("is-open")) closeDrawer();
    });
  }

  const searchOverlay = $("[data-search-overlay]");
  let searchLastFocus = null;

  function openSearch() {
    if (!searchOverlay) return;
    searchLastFocus = document.activeElement;
    searchOverlay.classList.add("is-open");
    searchOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    const input = $("[data-search-input]", searchOverlay);
    if (input) window.setTimeout(() => input.focus(), 120);
  }

  function closeSearch() {
    if (!searchOverlay) return;
    searchOverlay.classList.remove("is-open");
    searchOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    if (searchLastFocus && typeof searchLastFocus.focus === "function") {
      searchLastFocus.focus();
    }
  }

  if (searchOverlay) {
    $$("[data-search-open]").forEach((button) =>
      button.addEventListener("click", openSearch)
    );
    $$("[data-search-close]", searchOverlay).forEach((button) =>
      button.addEventListener("click", closeSearch)
    );
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && searchOverlay.classList.contains("is-open")) {
        closeSearch();
      }
    });
  }

  // Close the account menu when clicking outside it.
  $$("[data-user-menu]").forEach((menu) => {
    document.addEventListener("click", (event) => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") menu.open = false;
    });
  });

  /* ---------------------------------------------------------------------
     Scroll reveal
     --------------------------------------------------------------------- */

  const revealItems = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  /* ---------------------------------------------------------------------
     Parallax
     --------------------------------------------------------------------- */

  const parallaxItems = $$("[data-parallax]");
  let ticking = false;

  function updateParallax() {
    const viewport = window.innerHeight;
    parallaxItems.forEach((item) => {
      const rect = item.getBoundingClientRect();
      if (rect.bottom < -250 || rect.top > viewport + 250) return;
      const speed = parseFloat(item.dataset.parallax) || 0;
      const centerOffset = rect.top + rect.height / 2 - viewport / 2;
      const shift = Math.max(-150, Math.min(150, centerOffset * speed * -1));
      item.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0)`;
    });
    ticking = false;
  }

  if (!reduceMotion && parallaxItems.length) {
    updateParallax();
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          window.requestAnimationFrame(updateParallax);
          ticking = true;
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", updateParallax, { passive: true });
  }

  if (!reduceMotion && finePointer) {
    const scenes = $$("[data-parallax-scene]");
    scenes.forEach((scene) => {
      scene.addEventListener("pointermove", (event) => {
        const rect = scene.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        $$("[data-mouse-depth]", scene).forEach((element) => {
          const depth = parseFloat(element.dataset.mouseDepth) || 0.015;
          element.style.transform = `translate3d(${(x * depth).toFixed(
            1
          )}px, ${(y * depth).toFixed(1)}px, 0)`;
        });
      });
      scene.addEventListener("pointerleave", () => {
        $$("[data-mouse-depth]", scene).forEach((element) => {
          element.style.transform = "translate3d(0, 0, 0)";
        });
      });
    });
  }

  /* ---------------------------------------------------------------------
     Reading progress and back-to-top
     --------------------------------------------------------------------- */

  const progressBar = $("[data-reading-progress] span");
  const article = $(".prose-journal");
  const backToTop = $("[data-back-to-top]");

  function onScrollProgress() {
    if (progressBar && article) {
      const rect = article.getBoundingClientRect();
      const start = rect.top + window.scrollY - window.innerHeight * 0.55;
      const height = article.offsetHeight;
      const progress = Math.max(
        0,
        Math.min(1, (window.scrollY - start) / Math.max(height, 1))
      );
      progressBar.style.width = `${(progress * 100).toFixed(2)}%`;
    }
    if (backToTop) {
      backToTop.classList.toggle("is-visible", window.scrollY > 700);
    }
  }

  onScrollProgress();
  window.addEventListener("scroll", onScrollProgress, { passive: true });
  if (backToTop) {
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------------------------------------------------------------------
     Share buttons
     --------------------------------------------------------------------- */

  async function shareUrl(url) {
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
        return;
      }
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        showToast("Link copied to your clipboard.", "success");
        return;
      }
      const input = document.createElement("input");
      input.value = url;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      showToast("Link copied to your clipboard.", "success");
    } catch (error) {
      if (error && error.name === "AbortError") return;
      showToast("Could not share this page. Please copy the address bar.", "error");
    }
  }

  $$("[data-share-url]").forEach((button) => {
    button.addEventListener("click", () => shareUrl(button.dataset.shareUrl));
  });

  /* ---------------------------------------------------------------------
     TOASTS — close server-rendered messages
     --------------------------------------------------------------------- */

  $$("[data-toast]").forEach((toast) => {
    const close = $("[data-toast-close]", toast);
    const dismiss = () => {
      toast.classList.add("is-leaving");
      window.setTimeout(() => toast.remove(), 280);
    };
    if (close) close.addEventListener("click", dismiss);
    window.setTimeout(dismiss, 6500);
  });

  /* ---------------------------------------------------------------------
     Password reveal
     --------------------------------------------------------------------- */

  $$("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const wrapper = button.closest(".password-wrap");
      const input = wrapper ? $("input", wrapper) : null;
      if (!input) return;
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      button.textContent = showing ? "Show" : "Hide";
      button.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    });
  });

  /* ---------------------------------------------------------------------
     AJAX likes, bookmarks and follows
     --------------------------------------------------------------------- */

  $$("form.js-toggle").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      if (!window.fetch) return;
      event.preventDefault();
      const button = $("[data-toggle-button]", form);
      if (!button || button.disabled) return;
      button.disabled = true;
      try {
        const response = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: {
            "X-Requested-With": "XMLHttpRequest",
            Accept: "application/json",
          },
          credentials: "same-origin",
        });
        if (response.status === 401 || response.status === 403) {
          window.location.href = "/accounts/login/?next=" + encodeURIComponent(location.pathname);
          return;
        }
        if (!response.ok) throw new Error("Request failed");
        const data = await response.json();
        const kind = form.dataset.kind;

        if (kind === "like" && typeof data.liked !== "undefined") {
          button.classList.toggle("is-active", data.liked);
          const label = $("[data-toggle-label]", button);
          const count = $("[data-toggle-count]", button);
          const icon = $("svg", button);
          if (label) label.textContent = data.liked ? "Loved" : "Love this";
          if (count) count.textContent = data.count;
          if (icon) icon.setAttribute("fill", data.liked ? "currentColor" : "none");
          showToast(data.liked ? "Saved with love." : "Love removed.", "success");
        } else if (kind === "bookmark" && typeof data.bookmarked !== "undefined") {
          button.classList.toggle("is-active", data.bookmarked);
          const label = $("[data-toggle-label]", button);
          const icon = $("svg", button);
          if (label) label.textContent = data.bookmarked ? "Saved" : "Save for later";
          if (icon) icon.setAttribute("fill", data.bookmarked ? "currentColor" : "none");
          showToast(
            data.bookmarked ? "Added to your reading list." : "Removed from your reading list.",
            "success"
          );
        } else if (kind === "follow" && typeof data.following !== "undefined") {
          button.classList.toggle("button-ghost", data.following);
          button.classList.toggle("button-sand", !data.following);
          const label = $("[data-toggle-label]", button);
          if (label) {
            label.textContent = data.following
              ? "Following"
              : `Follow ${label.dataset.name || "writer"}`;
          }
          showToast(data.following ? "You are following this writer." : "Follow removed.", "success");
        }
      } catch (error) {
        // Fall back to a normal form submission if the request cannot complete.
        form.submit();
      } finally {
        button.disabled = false;
      }
    });
  });

  /* ---------------------------------------------------------------------
     Story editor
     --------------------------------------------------------------------- */

  $$("[data-story-editor]").forEach((textarea) => {
    const form = textarea.closest("form");
    const wordTarget = form ? $("[data-word-count]", form) : null;
    const timeTarget = form ? $("[data-read-time]", form) : null;

    function updateStats() {
      const words = (textarea.value.trim().match(/\S+/g) || []).length;
      if (wordTarget) wordTarget.textContent = words;
      if (timeTarget) timeTarget.textContent = Math.max(1, Math.ceil(words / 220));
    }

    textarea.addEventListener("input", updateStats);
    updateStats();

    if (!form) return;
    $$("[data-format]", form).forEach((button) => {
      button.addEventListener("click", () => {
        const snippet = button.dataset.format || "";
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.slice(start, end);
        const before = textarea.value.slice(0, start);
        const after = textarea.value.slice(end);
        let insertion;
        if (snippet === "**bold**") insertion = `**${selected || "bold text"}**`;
        else if (snippet === "*italic*") insertion = `*${selected || "italic text"}*`;
        else if (snippet === "## ") insertion = "## ";
        else if (snippet === "> ") insertion = "> ";
        else if (snippet === "- ") insertion = "- ";
        else insertion = snippet;
        textarea.value = before + insertion + after;
        textarea.focus();
        const cursor = start + insertion.length;
        textarea.setSelectionRange(cursor, cursor);
        updateStats();
      });
    });
  });

  /* ---------------------------------------------------------------------
     Image previews
     --------------------------------------------------------------------- */

  const coverInput = $('input[type="file"][name="cover_image"]');
  const coverPreview = $("[data-cover-preview]");
  if (coverInput && coverPreview) {
    coverInput.addEventListener("change", () => {
      const file = coverInput.files && coverInput.files[0];
      if (!file || !file.type.startsWith("image/")) return;
      const image = document.createElement("img");
      image.src = URL.createObjectURL(file);
      image.alt = "Selected cover preview";
      image.onload = () => URL.revokeObjectURL(image.src);
      coverPreview.innerHTML = "";
      coverPreview.appendChild(image);
    });
  }

  const avatarInput = $('input[type="file"][name="avatar"]');
  const avatarPreview = $("[data-avatar-preview]");
  if (avatarInput && avatarPreview) {
    avatarInput.addEventListener("change", () => {
      const file = avatarInput.files && avatarInput.files[0];
      if (!file || !file.type.startsWith("image/")) return;
      const image = document.createElement("img");
      image.className = "avatar avatar-xl";
      image.src = URL.createObjectURL(file);
      image.alt = "Selected profile photo preview";
      image.onload = () => URL.revokeObjectURL(image.src);
      avatarPreview.replaceWith(image);
    });
  }

  /* ---------------------------------------------------------------------
     Small finishing touches
     --------------------------------------------------------------------- */

  // Keep long select menus from triggering a page jump on small screens.
  $$(".filter-select").forEach((select) => {
    select.addEventListener("change", () => {
      const form = select.closest("form");
      if (form) form.submit();
    });
  });

  // Add a gentle loading state to server-side write forms.
  $$("form.auth-form, form.write-form, form.comment-form, form[action*='newsletter']").forEach(
    (form) => {
      form.addEventListener("submit", () => {
        const submit = form.querySelector('button[type="submit"]');
        if (!submit || submit.dataset.loading === "true") return;
        submit.dataset.loading = "true";
        const label = submit.textContent;
        submit.dataset.originalLabel = label;
        submit.textContent = "Sending…";
        window.setTimeout(() => {
          submit.dataset.loading = "false";
          submit.textContent = submit.dataset.originalLabel || label;
        }, 12000);
      });
    }
  );

  // Animate the hero content into view on first paint.
  if (!reduceMotion) {
    root.classList.add("is-ready");
  }
})();
