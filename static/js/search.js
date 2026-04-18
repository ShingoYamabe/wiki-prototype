/**
 * search.js — クライアントサイド全文検索 (F-B02)
 *
 * Zola が elasticlunr_json 形式で生成する search_index.en.json は
 * ドキュメント配列ではなく「シリアライズ済み elasticlunr インデックス」です。
 * elasticlunr.Index.load(data) で読み込む必要があります。
 *
 * 参考: https://github.com/getzola/zola/blob/master/docs/static/search.js
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 設定
  // --------------------------------------------------------------------------

  // base.html で Zola の get_url により絶対 URL が埋め込まれる。
  // .pathname だけ取り出すことで origin が変わっても動作する。
  const SEARCH_INDEX_URL = (function () {
    var raw = window.SEARCH_INDEX_URL;
    if (!raw) return '/search_index.en.json';
    try { return new URL(raw).pathname; } catch (e) { return raw; }
  })();

  const ELASTICLUNR_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/elasticlunr/0.9.6/elasticlunr.min.js';

  const OPTIONS = {
    bool: 'OR',
    expand: true,
    fields: {
      title:       { boost: 3 },
      description: { boost: 2 },
      body:        { boost: 1 },
    },
  };

  // --------------------------------------------------------------------------
  // 状態
  // --------------------------------------------------------------------------

  let searchIndex  = null;   // elasticlunr.Index インスタンス
  let searchLoaded = false;
  let loadPromise  = null;

  const input   = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  if (!input || !results) return;

  // --------------------------------------------------------------------------
  // インデックス読み込み（初回フォーカス時に一度だけ）
  // --------------------------------------------------------------------------

  function loadIndex() {
    if (loadPromise) return loadPromise;

    loadPromise = new Promise(function (resolve, reject) {
      var script   = document.createElement('script');
      script.src   = ELASTICLUNR_CDN;
      script.async = true;
      script.onload = function () {
        fetch(SEARCH_INDEX_URL)
          .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          })
          .then(function (data) {
            // Zola のシリアライズ済みインデックスを elasticlunr.Index.load() で読み込む
            searchIndex  = window.elasticlunr.Index.load(data);
            searchLoaded = true;
            resolve();
          })
          .catch(function (err) {
            console.warn('[search.js] Failed to load search index:', err);
            reject(err);
          });
      };
      script.onerror = function () {
        reject(new Error('[search.js] Failed to load elasticlunr from CDN'));
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
    if (!searchIndex) return;
    var hits = searchIndex.search(query, OPTIONS);
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

    hits.slice(0, 10).forEach(function (hit) {
      // elasticlunr の documentStore からドキュメント情報を取得
      var doc = searchIndex.documentStore.getDoc(hit.ref);
      if (!doc) return;

      var a       = document.createElement('a');
      a.href      = hit.ref;
      a.className = 'search-result-item';
      a.setAttribute('role', 'option');

      var snippet = extractSnippet(doc.body || '', query, 120);
      var cat     = (doc.extra && doc.extra.category) ? doc.extra.category : '';

      a.innerHTML = [
        '<span class="search-result-item__title">' + escapeHtml(doc.title || hit.ref) + '</span>',
        cat
          ? '<span class="search-result-item__meta">' +
            '<span class="badge badge--' + escapeHtml(cat) + '">' + escapeHtml(cat) + '</span>' +
            '</span>'
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
      if (!searchLoaded || !searchIndex) { setTimeout(tryRender, 500); return; }

      var currentUrl = window.location.pathname;
      var docs       = Object.values(searchIndex.documentStore.docs);

      var matched = docs.filter(function (doc) {
        if (!doc) return false;
        if ((doc.id || '') === currentUrl) return false;
        var docTags = (doc.taxonomies && doc.taxonomies.tags) || [];
        return tags.some(function (t) { return docTags.includes(t); });
      }).slice(0, 3);

      matched.forEach(function (doc) {
        var a = document.createElement('a');
        a.href = doc.id || '#';
        a.className = 'related-card';
        var cat = (doc.extra && doc.extra.category) || 'knowledge';
        a.innerHTML =
          '<span class="related-card__cat badge badge--' + escapeHtml(cat) + '">' + escapeHtml(cat) + '</span>' +
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
    var lower = text.toLowerCase();
    var q     = query.toLowerCase().split(/\s+/)[0];
    var idx   = lower.indexOf(q);
    if (idx === -1) return text.slice(0, maxLen);
    var start = Math.max(0, idx - 40);
    var end   = Math.min(text.length, idx + maxLen);
    return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  }

})();
