/* ============================================================
   Damera Community Initiative — app.js
   ------------------------------------------------------------
   This ONE file powers two things:

   1) The public "Latest Updates" feed + "Social" section
      on index.html
   2) Everything on admin.html (login, posting, managing)

   Until the free Supabase backend is connected (two values in
   js/config.js), the live website shows a friendly "coming soon"
   state. Sample posts appear ONLY when the site is opened on
   this computer — visitors never see them, and nothing on the
   public website ever links to admin.html or mentions the admin.

   You should NOT need to edit anything in this file.
   ============================================================ */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Config                                                              */
  /* ------------------------------------------------------------------ */
  var cfg = window.DAMERA_CONFIG || {};
  var CONFIGURED = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  // Sample posts are only ever shown on this computer (localhost /
  // opening the file directly) — never on the live website.
  var IS_LOCAL = ['localhost', '127.0.0.1', ''].indexOf(location.hostname) !== -1;
  var TABLE = 'posts';
  var BUCKET = 'post-photos';

  /* ------------------------------------------------------------------ */
  /* Tiny helpers                                                        */
  /* ------------------------------------------------------------------ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch (e) { return ''; }
  }
  function snippet(text, max) {
    var t = String(text || '').replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    return t.slice(0, max).replace(/[\s,.;:]+\S*$/, '') + '…';
  }
  function normalizeImages(raw) {
    if (!raw) return [];
    if (!Array.isArray(raw)) raw = [raw];
    return raw.filter(function (x) { return typeof x === 'string' && x.length > 0; });
  }
  function normalizeLinks(raw) {
    if (!raw) return [];
    if (!Array.isArray(raw)) raw = [raw];
    return raw.map(function (x) {
      if (typeof x === 'string') return x;
      if (x && typeof x.url === 'string') return x.url;
      return '';
    }).filter(Boolean);
  }
  function daysAgo(n) {
    return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
  }
  function sanitizeFilename(name) {
    return String(name || 'photo').toLowerCase().replace(/[^a-z0-9._-]/g, '-');
  }

  /* ------------------------------------------------------------------ */
  /* Look & feel maps                                                    */
  /* ------------------------------------------------------------------ */
  var TAG_STYLES = {
    'Journey': 'bg-teal-100 text-teal-800',
    'Program': 'bg-sky-100 text-sky-800',
    'Event':   'bg-amber-100 text-amber-800',
    'Story':   'bg-rose-100 text-rose-800',
    'Update':  'bg-blue-100 text-blue-800'
  };
  function tagClass(tag) {
    return TAG_STYLES[tag] || 'bg-blue-100 text-blue-800';
  }

  function detectPlatform(url) {
    var u = String(url || '').toLowerCase();
    if (u.indexOf('instagram.com') !== -1) return 'instagram';
    if (u.indexOf('tiktok.com') !== -1) return 'tiktok';
    if (u.indexOf('facebook.com') !== -1 || u.indexOf('fb.watch') !== -1) return 'facebook';
    if (u.indexOf('youtube.com') !== -1 || u.indexOf('youtu.be') !== -1) return 'youtube';
    if (u.indexOf('x.com') !== -1 || u.indexOf('twitter.com') !== -1) return 'x';
    return 'link';
  }
  var PLATFORMS = {
    instagram: { label: 'Instagram', cls: 'bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500' },
    tiktok:    { label: 'TikTok',    cls: 'bg-neutral-900' },
    facebook:  { label: 'Facebook',  cls: 'bg-blue-600' },
    youtube:   { label: 'YouTube',   cls: 'bg-red-600' },
    x:         { label: 'X',         cls: 'bg-neutral-800' },
    link:      { label: 'Link',      cls: 'bg-damera-blue' }
  };
  var ICONS = {
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true"><path d="M16.6 3c.4 2.1 1.8 3.7 4.1 3.9v3.1c-1.5 0-2.9-.5-4.1-1.3v6.1a6.1 6.1 0 1 1-6.1-6.1c.3 0 .7 0 1 .1v3.2a2.9 2.9 0 1 0 2 2.8V3h3.1z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true"><path d="M13.5 21v-7h2.4l.4-2.8h-2.8V9.3c0-.8.2-1.4 1.4-1.4h1.5V5.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.1H8v2.8h2.5v7h3z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3L10 15z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true"><path d="M17.8 3h3l-6.6 7.5L22 21h-6.1l-4.8-6.2L5.6 21h-3l7.1-8.1L2 3h6.3l4.3 5.7L17.8 3zm-1 16.2h1.6L7.3 4.7H5.6l11.2 14.5z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="w-4 h-4" aria-hidden="true"><path d="M10.6 13.4a4 4 0 0 0 5.6 0l3.5-3.5a4 4 0 1 0-5.6-5.6L12.4 6"/><path d="M13.4 10.6a4 4 0 0 0-5.6 0l-3.5 3.5a4 4 0 1 0 5.6 5.6L11.6 18"/></svg>'
  };
  function platformButton(url) {
    var p = detectPlatform(url);
    var meta = PLATFORMS[p];
    return '<a href="' + esc(url) + '" target="_blank" rel="noopener" ' +
      'class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs sm:text-sm font-semibold ' +
      meta.cls + ' hover:opacity-90 transition duration-200">' +
      ICONS[p] + '<span>View on ' + meta.label + '</span></a>';
  }

  /* ------------------------------------------------------------------ */
  /* Load Supabase JS from CDN (only when configured)                    */
  /* ------------------------------------------------------------------ */
  var supabaseJsPromise = null;
  function loadSupabaseJs() {
    if (window.supabase && window.supabase.createClient) {
      return Promise.resolve();
    }
    if (!supabaseJsPromise) {
      supabaseJsPromise = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        s.onload = function () { resolve(); };
        s.onerror = function () {
          supabaseJsPromise = null;
          reject(new Error('Could not load the Supabase library. Check your internet connection.'));
        };
        document.head.appendChild(s);
      });
    }
    return supabaseJsPromise;
  }
  function getClient() {
    return window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }

  /* ------------------------------------------------------------------ */
  /* Demo posts (local preview only — visitors never see these)          */
  /* ------------------------------------------------------------------ */
  var DEMO_POSTS = [
    {
      created_at: daysAgo(4),
      title: 'Coffee ceremony brings neighbours together',
      body: 'Our weekly coffee ceremony was full of laughter, stories and new friendships. This is what community looks like.\n\nSwipe through the photos and come join us next week — everyone is welcome.',
      tag: 'Story',
      images: ['images/coffee-ceremony.jpg'],
      social_links: ['https://www.tiktok.com/@dameracommunity']
    },
    {
      created_at: daysAgo(11),
      title: 'Mental health consultation with community partners',
      body: 'We sat down with local partners to plan the next phase of our mental health programme — more counselling sessions, more school visits, and a bigger support network for refugee and host families.',
      tag: 'Program',
      images: ['images/consultation-audience.jpg', 'images/consultation-partners.jpg', 'images/speaking-1.jpg'],
      social_links: []
    }
  ];

  /* ------------------------------------------------------------------ */
  /* Scroll-reveal support for dynamically added cards                   */
  /* (the site's original observer only watches elements that existed    */
  /*  on page load — this one covers cards we inject later)              */
  /* ------------------------------------------------------------------ */
  var revealObserver = null;
  function observeReveals(root) {
    var els = $all('.reveal:not(.active)', root || document);
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('active'); });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08 });
    }
    els.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ------------------------------------------------------------------ */
  /* Card renderers                                                      */
  /* ------------------------------------------------------------------ */
  function imagesHTML(imgs) {
    if (!imgs.length) return '';
    var cols = imgs.length === 1 ? '' : (imgs.length === 2 ? 'grid-cols-2' : 'grid-cols-3');
    return '<div class="grid gap-2 ' + cols + ' mt-4">' +
      imgs.slice(0, 9).map(function (src) {
        return '<a href="' + esc(src) + '" target="_blank" rel="noopener" class="block rounded-xl overflow-hidden bg-damera-warm">' +
          '<img src="' + esc(src) + '" alt="Update photo" loading="lazy" ' +
          'class="w-full h-44 sm:h-48 object-cover hover:scale-[1.04] transition duration-300">' +
          '</a>';
      }).join('') +
      '</div>';
  }
  function linksHTML(links) {
    if (!links.length) return '';
    return '<div class="flex flex-wrap gap-2 mt-4">' + links.map(platformButton).join('') + '</div>';
  }
  function postCardHTML(p) {
    var imgs = normalizeImages(p.images);
    var links = normalizeLinks(p.social_links);
    return '' +
      '<article class="reveal bg-white rounded-2xl shadow-sm border border-damera-warm overflow-hidden flex flex-col">' +
      '  <div class="p-5 sm:p-6 flex flex-col flex-1">' +
      '    <div class="flex items-center gap-3 mb-3">' +
      '      <span class="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ' + tagClass(p.tag) + '">' + esc(p.tag || 'Update') + '</span>' +
      '      <time class="text-xs text-gray-500">' + esc(fmtDate(p.created_at)) + '</time>' +
      '    </div>' +
      '    <h3 class="font-serif text-lg sm:text-xl font-bold text-damera-dark mb-2">' + esc(p.title) + '</h3>' +
      (p.body ? '<p class="text-gray-600 text-sm leading-relaxed whitespace-pre-line mb-1">' + esc(p.body) + '</p>' : '') +
      imagesHTML(imgs) +
      linksHTML(links) +
      '  </div>' +
      '</article>';
  }
  function socialCardHTML(p) {
    var imgs = normalizeImages(p.images);
    var links = normalizeLinks(p.social_links);
    var first = links[0] || '';
    var platform = detectPlatform(first);
    var cover = imgs.length
      ? '<img src="' + esc(imgs[0]) + '" alt="Post preview" loading="lazy" class="w-full h-40 object-cover">'
      : '<div class="w-full h-40 flex items-center justify-center bg-gradient-to-br from-damera-blue to-damera-dark text-white">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-10 h-10 opacity-80"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M3 15l5-4 4 3 4-5 5 6"/></svg></div>';
    return '' +
      '<article class="reveal bg-white rounded-2xl shadow-sm border border-damera-warm overflow-hidden flex flex-col hover:shadow-md transition duration-300">' +
      '  <a href="' + esc(first) + '" target="_blank" rel="noopener" class="block">' + cover + '</a>' +
      '  <div class="p-5 flex flex-col flex-1">' +
      '    <div class="flex items-center gap-2 mb-2">' +
      '      <span class="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-600">' +
      ICONS[platform] + esc(PLATFORMS[platform].label) + '</span>' +
      '      <span class="text-xs text-gray-400">·</span>' +
      '      <span class="text-xs text-gray-400">' + esc(fmtDate(p.created_at)) + '</span>' +
      '    </div>' +
      '    <h4 class="font-serif font-bold text-damera-dark mb-1">' + esc(snippet(p.title, 70)) + '</h4>' +
      (p.body ? '<p class="text-sm text-gray-600 leading-relaxed mb-3">' + esc(snippet(p.body, 110)) + '</p>' : '') +
      '    <div class="mt-auto pt-2 flex flex-wrap gap-2">' + links.slice(0, 3).map(platformButton).join('') + '</div>' +
      '  </div>' +
      '</article>';
  }

  /* ------------------------------------------------------------------ */
  /* Shared fetch of published posts                                     */
  /* ------------------------------------------------------------------ */
  var postsPromise = null;
  function getPublishedPosts() {
    if (!postsPromise) {
      postsPromise = (function () {
        if (!CONFIGURED) {
          return Promise.resolve({ posts: DEMO_POSTS.slice(), demo: true });
        }
        return loadSupabaseJs().then(function () {
          var client = getClient();
          return client.from(TABLE)
            .select('*')
            .eq('published', true)
            .order('created_at', { ascending: false })
            .limit(50);
        }).then(function (res) {
          if (res.error) throw res.error;
          return { posts: res.data || [], demo: false };
        });
      })();
      postsPromise.catch(function () { postsPromise = null; });
    }
    return postsPromise;
  }

  /* ------------------------------------------------------------------ */
  /* PUBLIC: Updates feed (index.html #updates-feed)                     */
  /* ------------------------------------------------------------------ */
  function mountFeed() {
    var feed = $('#updates-feed');
    if (!feed) return Promise.resolve();

    feed.innerHTML =
      '<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">' +
      [1, 2, 3].map(function () {
        return '<div class="rounded-2xl border border-damera-warm bg-white p-5 animate-pulse">' +
          '<div class="h-4 w-24 rounded bg-gray-200 mb-3"></div>' +
          '<div class="h-5 w-3/4 rounded bg-gray-200 mb-2"></div>' +
          '<div class="h-3 w-full rounded bg-gray-100 mb-1"></div>' +
          '<div class="h-3 w-5/6 rounded bg-gray-100 mb-4"></div>' +
          '<div class="h-40 rounded-xl bg-gray-100"></div>' +
          '</div>';
      }).join('') +
      '</div>';

    return getPublishedPosts().then(function (result) {
      var demoVisible = result.demo && IS_LOCAL;
      var posts = (result.demo && !IS_LOCAL) ? [] : result.posts;
      var html = '';
      if (demoVisible) {
        html += '' +
          '<div class="mb-6 text-center">' +
          '<span class="inline-block text-xs text-gray-500 bg-white border border-dashed border-damera-warm rounded-full px-4 py-1.5">' +
          'Sample posts — local preview only, visitors never see this' +
          '</span></div>';
      }
      if (!posts.length) {
        html += '' +
          '<div class="text-center py-14 bg-white rounded-2xl border border-dashed border-damera-warm">' +
          '<p class="font-serif text-xl font-bold text-damera-dark mb-1">The first update is coming soon</p>' +
          '<p class="text-sm text-gray-500">Our team is preparing the next story — check back shortly.</p>' +
          '</div>';
      } else {
        html += '<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">' +
          posts.map(postCardHTML).join('') +
          '</div>';
      }
      feed.innerHTML = html;
      observeReveals(feed);
    }).catch(function (err) {
      console.error('[Damera] Updates feed failed to load:', err);
      feed.innerHTML = '' +
        '<div class="text-center py-14 bg-white rounded-2xl border border-dashed border-red-200">' +
        '<p class="font-serif text-lg font-bold text-damera-dark mb-1">Updates could not load</p>' +
        '<p class="text-sm text-gray-500 mb-4">Please check your internet connection and try again.</p>' +
        '<button id="feed-retry" class="px-5 py-2.5 rounded-full bg-damera-blue text-white text-sm font-semibold hover:bg-damera-dark transition">Try again</button>' +
        '</div>';
      var retry = $('#feed-retry');
      if (retry) retry.addEventListener('click', function () { mountFeed(); });
    });
  }

  /* ------------------------------------------------------------------ */
  /* PUBLIC: Social section (index.html #social-posts)                   */
  /* ------------------------------------------------------------------ */
  function mountSocial() {
    var grid = $('#social-posts');
    if (!grid) return Promise.resolve();

    return getPublishedPosts().then(function (result) {
      var source = (result.demo && !IS_LOCAL) ? [] : result.posts;
      var withLinks = source.filter(function (p) {
        return normalizeLinks(p.social_links).length > 0;
      }).slice(0, 6);

      if (!withLinks.length) {
        // Nothing to show — hide the whole social block so the page stays clean.
        grid.innerHTML = '';
        grid.classList.add('hidden');
        var heading = $('#social-heading');
        if (heading) heading.classList.add('hidden');
        return;
      }
      grid.classList.remove('hidden');
      grid.innerHTML = withLinks.map(socialCardHTML).join('');
      observeReveals(grid);
    }).catch(function (err) {
      console.error('[Damera] Social section failed to load:', err);
      grid.innerHTML = '';
    });
  }

  /* ==================================================================== */
  /* ADMIN PAGE (admin.html)                                              */
  /* ==================================================================== */
  var db = null;          // Supabase client (admin context)
  var currentPosts = [];  // last loaded list of all posts
  var pendingFiles = [];  // photos picked but not yet uploaded

  function showView(name) {
    ['#admin-loading', '#view-setup', '#view-login', '#view-panel'].forEach(function (id) {
      var el = $(id);
      if (el) el.classList.add('hidden');
    });
    var target = $(name);
    if (target) target.classList.remove('hidden');
  }

  function setMsg(el, text, kind) {
    if (!el) return;
    el.classList.remove('hidden', 'bg-green-50', 'text-green-800', 'border-green-200',
      'bg-red-50', 'text-red-700', 'border-red-200', 'bg-blue-50', 'text-blue-800', 'border-blue-200');
    if (!text) { el.classList.add('hidden'); return; }
    if (kind === 'ok') el.classList.add('bg-green-50', 'text-green-800', 'border-green-200');
    else if (kind === 'info') el.classList.add('bg-blue-50', 'text-blue-800', 'border-blue-200');
    else el.classList.add('bg-red-50', 'text-red-700', 'border-red-200');
    el.textContent = text;
  }

  /* ---------- admin: login view ---------- */
  function initLogin(client) {
    var form = $('#login-form');
    if (!form || form.dataset.bound) return;
    form.dataset.bound = '1';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('#l-email').value.trim();
      var password = $('#l-password').value;
      var err = $('#login-error');
      var btn = $('#login-btn');
      setMsg(err, '');
      btn.disabled = true;
      btn.textContent = 'Signing in…';
      client.auth.signInWithPassword({ email: email, password: password })
        .then(function (res) {
          if (res.error) throw res.error;
          // onAuthStateChange handles switching to the panel
        })
        .catch(function (error) {
          setMsg(err, error.message || 'Login failed. Check your email and password.', 'err');
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = 'Sign in';
        });
    });
  }

  /* ---------- admin: photo previews ---------- */
  function renderPhotoPreviews() {
    var box = $('#photo-previews');
    if (!box) return;
    if (!pendingFiles.length) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = pendingFiles.map(function (file, i) {
      return '<div class="relative group">' +
        '<img src="' + URL.createObjectURL(file) + '" alt="Selected photo ' + (i + 1) + '" ' +
        'class="w-20 h-20 object-cover rounded-lg border border-damera-warm">' +
        '<button type="button" data-remove-photo="' + i + '" ' +
        'class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold shadow hover:bg-red-600" ' +
        'title="Remove photo">✕</button>' +
        '</div>';
    }).join('');
  }

  function initComposer(client) {
    var form = $('#post-form');
    if (!form || form.dataset.bound) return;
    form.dataset.bound = '1';

    /* file picker */
    var fileInput = $('#f-photos');
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        Array.prototype.forEach.call(fileInput.files || [], function (f) {
          if (f.type.indexOf('image/') === 0) pendingFiles.push(f);
        });
        fileInput.value = '';
        renderPhotoPreviews();
      });
    }
    var previewBox = $('#photo-previews');
    if (previewBox) {
      previewBox.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-remove-photo]');
        if (!btn) return;
        pendingFiles.splice(Number(btn.getAttribute('data-remove-photo')), 1);
        renderPhotoPreviews();
      });
    }

    /* social links */
    var linksBox = $('#social-links');
    function addLinkRow(value) {
      var row = document.createElement('div');
      row.className = 'flex gap-2';
      row.innerHTML =
        '<input type="url" placeholder="https://www.instagram.com/p/… or https://www.tiktok.com/@…"' +
        ' class="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-damera-blue focus:ring-2 focus:ring-damera-blue/20 focus:outline-none"' +
        (value ? ' value="' + esc(value) + '"' : '') + '>' +
        '<button type="button" data-remove-link class="px-3 rounded-lg border border-gray-300 text-gray-400 hover:text-red-500 hover:border-red-300 transition" title="Remove link">✕</button>';
      linksBox.appendChild(row);
    }
    if (linksBox) {
      addLinkRow('');
      var addBtn = $('#add-link');
      if (addBtn) {
        addBtn.addEventListener('click', function () { addLinkRow(''); });
      }
      linksBox.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-remove-link]');
        if (!btn) return;
        var rows = $all('div', linksBox);
        if (rows.length > 1) btn.parentNode.remove();
        else { var inp = btn.parentNode.querySelector('input'); if (inp) inp.value = ''; }
      });
    }

    /* submit */
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('#composer-msg');
      var btn = $('#post-btn');
      var title = $('#f-title').value.trim();
      var body = $('#f-body').value.trim();
      var tag = $('#f-tag').value;
      var published = $('#f-published').checked;
      var links = $all('input', linksBox).map(function (i) { return i.value.trim(); }).filter(Boolean);

      if (!title) { setMsg(msg, 'Please give the update a short title.', 'err'); return; }
      if (!body && !pendingFiles.length && !links.length) {
        setMsg(msg, 'Write something, add a photo, or paste a social link.', 'err');
        return;
      }

      var originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = pendingFiles.length ? 'Uploading photos…' : 'Posting…';

      var uploadUrls = [];
      var uploadPromise = Promise.resolve();

      if (pendingFiles.length) {
        uploadPromise = pendingFiles.reduce(function (chain, file, i) {
          return chain.then(function () {
            var path = 'posts/' + Date.now() + '-' + i + '-' + sanitizeFilename(file.name);
            return client.storage.from(BUCKET).upload(path, file, {
              cacheControl: '3600', upsert: false
            }).then(function (up) {
              if (up.error) throw up.error;
              var pub = client.storage.from(BUCKET).getPublicUrl(path);
              uploadUrls.push(pub.data.publicUrl);
            });
          });
        }, Promise.resolve());
      }

      uploadPromise
        .then(function () {
          return client.from(TABLE).insert({
            title: title,
            body: body,
            tag: tag,
            images: uploadUrls,
            social_links: links,
            published: published
          }).select().single();
        })
        .then(function (res) {
          if (res.error) throw res.error;
          setMsg(msg, published
            ? 'Posted! Your update is now live on the website. 🎉'
            : 'Saved as hidden — press "Publish" in the list below when you are ready.', 'ok');
          $('#f-title').value = '';
          $('#f-body').value = '';
          pendingFiles = [];
          renderPhotoPreviews();
          $all('input', linksBox).forEach(function (i, idx) { i.value = ''; if (idx > 0) i.closest('div').remove(); });
          form.scrollIntoView({ behavior: 'smooth', block: 'start' });
          loadPosts(client);
        })
        .catch(function (error) {
          console.error('[Damera] Post failed:', error);
          setMsg(msg, (error && error.message) ? error.message : 'Something went wrong while posting.', 'err');
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = originalLabel;
        });
    });
  }

  /* ---------- admin: posts list ---------- */
  function postRowHTML(p) {
    var imgs = normalizeImages(p.images);
    var links = normalizeLinks(p.social_links);
    var live = Boolean(p.published);
    return '' +
      '<div class="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white border rounded-xl ' +
      (live ? 'border-damera-warm' : 'border-gray-200 opacity-75') + '">' +
      (imgs.length
        ? '<img src="' + esc(imgs[0]) + '" alt="" class="w-12 h-12 rounded-lg object-cover border border-damera-warm shrink-0">'
        : '<div class="w-12 h-12 rounded-lg bg-damera-warm flex items-center justify-center text-damera-blue shrink-0">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-6 h-6"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M3 15l5-4 4 3 4-4 5 5"/></svg></div>') +
      '<div class="flex-1 min-w-0">' +
      '  <div class="flex flex-wrap items-center gap-2 mb-0.5">' +
      '    <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ' + tagClass(p.tag) + '">' + esc(p.tag || 'Update') + '</span>' +
      '    <span class="text-xs text-gray-400">' + esc(fmtDate(p.created_at)) + '</span>' +
      '    <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ' +
      (live ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500') + '">' +
      (live ? '● Live' : 'Hidden') + '</span>' +
      '  </div>' +
      '  <p class="font-semibold text-damera-dark text-sm truncate">' + esc(p.title) + '</p>' +
      '  <p class="text-xs text-gray-400">' + imgs.length + ' photo' + (imgs.length === 1 ? '' : 's') +
      ' · ' + links.length + ' link' + (links.length === 1 ? '' : 's') + '</p>' +
      '</div>' +
      '<div class="flex gap-2 shrink-0">' +
      '  <button data-action="toggle" data-id="' + esc(p.id) + '" ' +
      'class="px-3 py-1.5 rounded-full border text-xs font-semibold transition ' +
      (live ? 'border-gray-300 text-gray-600 hover:border-damera-blue hover:text-damera-blue' : 'border-green-300 text-green-700 hover:bg-green-50') + '">' +
      (live ? 'Unpublish' : 'Publish') + '</button>' +
      '  <button data-action="delete" data-id="' + esc(p.id) + '" ' +
      'class="px-3 py-1.5 rounded-full border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition">Delete</button>' +
      '</div>' +
      '</div>';
  }

  function loadPosts(client) {
    var list = $('#posts-list');
    var count = $('#post-count');
    if (!list) return Promise.resolve();
    list.innerHTML = '<p class="text-sm text-gray-400 py-6 text-center">Loading your updates…</p>';
    return client.from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(function (res) {
        if (res.error) throw res.error;
        currentPosts = res.data || [];
        if (count) count.textContent = '(' + currentPosts.length + ')';
        if (!currentPosts.length) {
          list.innerHTML = '<p class="text-sm text-gray-400 py-6 text-center">No posts yet — write your first one on the left! ✍️</p>';
          return;
        }
        list.innerHTML = currentPosts.map(postRowHTML).join('');
      })
      .catch(function (error) {
        console.error('[Damera] Could not load posts:', error);
        list.innerHTML = '<p class="text-sm text-red-600 py-6 text-center">Could not load posts: ' +
          esc(error.message || 'unknown error') + '</p>';
      });
  }

  function initList(client) {
    var list = $('#posts-list');
    if (!list || list.dataset.bound) return;
    list.dataset.bound = '1';
    list.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var id = btn.getAttribute('data-id');
      var action = btn.getAttribute('data-action');
      var post = null;
      for (var i = 0; i < currentPosts.length; i++) {
        if (currentPosts[i].id === id) { post = currentPosts[i]; break; }
      }
      if (!post) return;

      if (action === 'toggle') {
        btn.disabled = true;
        client.from(TABLE).update({ published: !post.published }).eq('id', id)
          .then(function (res) {
            if (res.error) throw res.error;
            loadPosts(client);
          })
          .catch(function (error) {
            console.error(error);
            alert('Could not change the post: ' + (error.message || 'unknown error'));
            btn.disabled = false;
          });
      }
      if (action === 'delete') {
        if (!confirm('Delete "' + post.title + '" permanently?\n\nThis cannot be undone.')) return;
        btn.disabled = true;
        client.from(TABLE).delete().eq('id', id)
          .then(function (res) {
            if (res.error) throw res.error;
            loadPosts(client);
          })
          .catch(function (error) {
            console.error(error);
            alert('Could not delete the post: ' + (error.message || 'unknown error'));
            btn.disabled = false;
          });
      }
    });
  }

  /* ---------- admin: enter the panel ---------- */
  function enterPanel(client) {
    showView('#view-panel');
    var logout = $('#logout-btn');
    if (logout) logout.classList.remove('hidden');
    initComposer(client);
    initList(client);
    loadPosts(client);
  }

  function initAdmin() {
    if (!$('#admin-app')) return; // not the admin page

    /* No Supabase yet → show the setup wall */
    if (!CONFIGURED) {
      showView('#view-setup');
      return;
    }

    showView('#admin-loading');
    loadSupabaseJs().then(function () {
      var client = getClient();
      db = client;

      client.auth.getSession().then(function (res) {
        if (res && res.data && res.data.session) {
          enterPanel(client);
        } else {
          showView('#view-login');
        }
      }).catch(function () {
        showView('#view-login');
      });

      client.auth.onAuthStateChange(function (event) {
        if (event === 'SIGNED_IN') enterPanel(client);
        if (event === 'SIGNED_OUT') {
          var logout = $('#logout-btn');
          if (logout) logout.classList.add('hidden');
          showView('#view-login');
        }
      });

      var form = $('#login-form');
      if (form && !form.dataset.bound) {
        initLogin(client);
      }
      var logoutBtn = $('#logout-btn');
      if (logoutBtn && !logoutBtn.dataset.bound) {
        logoutBtn.dataset.bound = '1';
        logoutBtn.addEventListener('click', function () {
          client.auth.signOut();
        });
      }
    }).catch(function (error) {
      console.error('[Damera] Supabase failed to load:', error);
      showView('#view-setup');
      var note = $('#setup-extra-error');
      if (note) {
        note.textContent = error.message || 'Could not load the Supabase library.';
        note.classList.remove('hidden');
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    mountFeed();
    mountSocial();
    initAdmin();
  });
})();
