/**
 * search.js — クライアントサイド全文検索 (F-B02)
 *
 * Zola の fuse_json 形式 (search_index.en.json) を Fuse.js で検索する。
 * fuse_json はドキュメント配列を出力するため、日本語を含む任意の言語で動作する。
 *
 * Fuse.js: https://fusejs.io/
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 設定
  // --------------------------------------------------------------------------

  const SEARCH_INDEX_URL = (function () {
    var raw = window.SEARCH_INDEX_URL;
    if (!raw) return '/search_index.en.json';
    try { return new URL(raw).pathname; } catch (e) { return raw; }
  })();

  const FUSE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/fuse.js/7.0.0/fuse.min.js';

  // Fuse.js 検索オプション
  // threshold: 0 = 完全一致のみ, 1 = 何でもマッチ。0.3 前後が実用的
  const FUSE_OPTIONS = {
    keys: [
      { name: 'title',       weight: 3 },
      { name: 'description', weight: 2 },
      { name: 'body',        weight: 1 },
    ],
    threshold:      0.3,   // ファジーマッチの許容度
    ignoreLocation: true,  // 文字列内のどこに出現しても検索対象
    minMatchCharLength: 1,
    includeScore:   true,
    includeMatches: false,
  };

  // --------------------------------------------------------------------------
  // 状態
  // --------------------------------------------------------------------------

  let fuse        = null;
  let searchDocs  = null;  // 元のドキュメント配列（スニペット取得用）
  let searchLoaded = false;
  let loadPromise  = null;

  const input   = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  if (!input || !results) return;

  // --------------------------------------------------------------------------
  // インデックス読み込み
  // --------------------------------------------------------------------------

  function loadIndex() {
    if (loadPromise) return loadPromise;

    loadPromise = new Promise(function (resolve, reject) {
      var script   = document.createElement('script');
      script.src   = FUSE_CDN;
      script.async = true;
      script.onload = function () {
        fetch(SEARCH_INDEX_URL)
          .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          })
          .then(function (data) {
            // Zola の fuse_json は配列形式: [{title, body, description, url}, ...]
            searchDocs   = data;
            fuse         = new window.Fuse(data, FUSE_OPTIONS);
            searchLoaded = true;
            resolve();
          })
          .catch(function (err) {
            console.warn('[search.js] Failed to load search index:', err);
            reject(err);
          });
      };
      script.onerror = function () {
        reject(new Error('[search.js] Failed to load Fuse.js from CDN'));
      };
      document.head.appendChild(script);
    });

    return loadPromise;
  }

  input.addEventListener('focus', function () {
    loadIndex().catch(function () {});
  }, { once: true });

  // --------------------------------------------------------------------------
  // インクリメンタルサーチ
  // --------------------------------------------------------------------------

  var debounceTimer;

  input.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    var query = input.value.trim();

    if (!query) {
      hideResults();
      return;
    }

    debounceTimer = setTimeout(function () {
      if (searchLoaded) {
        doSearch(query);
      } else {
        loadIndex().then(function () { doSearch(query); }).catch(function () {});
      }
    }, 150);
  });

  function doSearch(query) {
    if (!fuse) return;
    var hits = fuse.search(query, { limit: 10 });
    renderResults(query, hits);
  }

  // --------------------------------------------------------------------------
  // 結果レンダリング
  // --------------------------------------------------------------------------

  function renderResults(query, hits) {
    results.innerHTML = '';
    results.hidden    = false;
    input.setAttribute('aria-expanded', 'true');

    if (!hits || !hits.length) {
      results.innerHTML =
        '<p class="search-no-results">「' + escapeHtml(query) + '」に一致するページが見つかりませんでした。</p>';
      return;
    }

    hits.forEach(function (hit) {
      // Fuse.js の結果: { item: {title, body, description, url}, score, ... }
      var doc = hit.item;
      if (!doc) return;

      var a       = document.createElement('a');
      a.href      = doc.url || '#';
      a.className = 'search-result-item';
      a.setAttribute('role', 'option');

      var snippet = extractSnippet(doc.body || '', query, 120);
      // Zola の fuse_json には category が直接入らないため省略
      // （必要なら config.toml の [search] で include_path = true を指定する）

      a.innerHTML = [
        '<span class="search-result-item__title">' + escapeHtml(doc.title || doc.url) + '</span>',
        doc.description
          ? '<span class="search-result-item__meta">' + escapeHtml(doc.description.slice(0, 60)) + '</span>'
          : '',
        snippet
          ? '<span class="search-result-item__snippet">' + escapeHtml(snippet) + '</span>'
          : '',
      ].join('');

      results.appendChild(a);
    });
  }

  function hideResults() {
    results.hidden = true;
    results.innerHTML = '';
    input.setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('click', function (e) {
    if (!input.contains(e.target) && !results.contains(e.target)) {
      hideResults();
    }
  });

  // --------------------------------------------------------------------------
  // キーボードナビゲーション (NF-A03)
  // --------------------------------------------------------------------------

  input.addEventListener('keydown', function (e) {
    var items   = results.querySelectorAll('.search-result-item');
    var focused = results.querySelector('.is-focused');
    var idx     = Array.from(items).indexOf(focused);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (focused) focused.classList.remove('is-focused');
      var next = items[idx + 1] || items[0];
      if (next) next.classList.add('is-focused');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (focused) focused.classList.remove('is-focused');
      var prev = items[idx - 1] || items[items.length - 1];
      if (prev) prev.classList.add('is-focused');
    } else if (e.key === 'Enter') {
      var active = results.querySelector('.is-focused') || items[0];
      if (active) { e.preventDefault(); active.click(); }
    }
  });

  // --------------------------------------------------------------------------
  // 関連ページ自動補完 (F-B03 タグベース)
  // --------------------------------------------------------------------------

  function initRelatedAuto() {
    var placeholder = document.getElementById('js-related-auto');
    if (!placeholder) return;

    var tags = (placeholder.dataset.tags || '')
      .split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    if (!tags.length) return;

    function tryRender() {
      if (!searchLoaded || !searchDocs) { setTimeout(tryRender, 500); return; }

      var currentUrl = window.location.pathname;
      var matched = searchDocs.filter(function (doc) {
        if (!doc) return false;
        // URL のパス部分で現在ページを除外
        try {
          if (new URL(doc.url || '').pathname === currentUrl) return false;
        } catch (e) {}
        var docTags = (doc.taxonomies && doc.taxonomies.tags) || [];
        return tags.some(function (t) { return docTags.includes(t); });
      }).slice(0, 3);

      matched.forEach(function (doc) {
        var a = document.createElement('a');
        a.href = doc.url || '#';
        a.className = 'related-card';
        a.innerHTML =
          '<span class="related-card__title">' + escapeHtml(doc.title || '') + '</span>' +
          (doc.description ? '<span class="related-card__desc">' + escapeHtml(doc.description) + '</span>' : '');
        placeholder.appendChild(a);
      });
    }

    window.addEventListener('load', function () {
      loadIndex().then(tryRender).catch(function () {});
    });
  }

  initRelatedAuto();

  // --------------------------------------------------------------------------
  // ユーティリティ
  // --------------------------------------------------------------------------

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function extractSnippet(text, query, maxLen) {
    if (!text) return '';
    var lower = text.toLowerCase();
    var q     = query.toLowerCase().split(/\s+/)[0];
    var idx   = lower.indexOf(q);
    if (idx === -1) return text.slice(0, maxLen);
    var start = Math.max(0, idx - 40);
    var end   = Math.min(text.length, idx + maxLen);
    return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  }

})();
