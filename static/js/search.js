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

  console.log('[search.js] Script initialized');

  const SEARCH_INDEX_URL = (function () {
    var raw = window.SEARCH_INDEX_URL;
    console.log('[search.js] Raw SEARCH_INDEX_URL from window:', raw);
    if (!raw) return '/search_index.en.json';
    try { return new URL(raw).pathname; } catch (e) { return raw; }
  })();

  const ELASTICLUNR_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/elasticlunr/0.9.6/elasticlunr.min.js';

  const OPTIONS = {
    bool: 'OR',
    expand: true,
    fields: {
      title: { boost: 3 },
      body:  { boost: 1 },
      // description は Zola の Front Matter で設定していないとエラーになるため、一旦外すか重みを下げる
    },
  };

  let searchIndex  = null;
  let searchLoaded = false;
  let loadPromise  = null;

  const input   = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  
  if (!input || !results) {
    console.error('[search.js] Required DOM elements not found: #search-input or #search-results');
    return;
  }

  function loadIndex() {
    if (loadPromise) return loadPromise;

    console.log('[search.js] Starting to load index...');
    loadPromise = new Promise(function (resolve, reject) {
      var script   = document.createElement('script');
      script.src   = ELASTICLUNR_CDN;
      script.async = true;
      script.onload = function () {
        console.log('[search.js] Elasticlunr library loaded from CDN');
        fetch(SEARCH_INDEX_URL)
          .then(function (r) {
            console.log('[search.js] Fetching index JSON, status:', r.status);
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          })
          .then(function (data) {
            console.log('[search.js] Index JSON received. Raw data preview:', data);
            
            // Zolaのインデックス展開
            searchIndex  = window.elasticlunr.Index.load(data);
            console.log('[search.js] Elasticlunr index loaded successfully.');
            console.dir(searchIndex); // インデックスの内部構造（ドキュメント数等）をダンプ
            
            searchLoaded = true;
            resolve();
          })
          .catch(function (err) {
            console.error('[search.js] Failed to load or parse search index:', err);
            reject(err);
          });
      };
      script.onerror = function () {
        console.error('[search.js] Failed to load elasticlunr script from CDN');
        reject(new Error('[search.js] Failed to load elasticlunr from CDN'));
      };
      document.head.appendChild(script);
    });

    return loadPromise;
  }

  input.addEventListener('focus', function () {
    console.log('[search.js] Input focused. Initializing index load...');
    loadIndex().catch(function () {});
  }, { once: true });

  var debounceTimer;

  input.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    var query = input.value.trim();

    if (!query) {
      console.log('[search.js] Query is empty, hiding results');
      hideResults();
      return;
    }

    debounceTimer = setTimeout(function () {
      console.log('[search.js] Executing search for query:', query);
      if (searchLoaded) {
        doSearch(query);
      } else {
        console.log('[search.js] Index not yet loaded, waiting for loadIndex...');
        loadIndex().then(function () { doSearch(query); }).catch(function () {});
      }
    }, 150);
  });

  function doSearch(query) {
    if (!searchIndex) {
      console.warn('[search.js] doSearch called but searchIndex is null');
      return;
    }
    var hits = searchIndex.search(query, OPTIONS);
    console.log('[search.js] Search hits for "' + query + '":', hits);
    renderResults(query, hits);
  }

  function renderResults(query, hits) {
    results.innerHTML = '';
    results.hidden    = false;
    input.setAttribute('aria-expanded', 'true');

    if (!hits || !hits.length) {
      console.log('[search.js] No hits found for query:', query);
      results.innerHTML =
        '<p class="search-no-results">「' + escapeHtml(query) + '」に一致するページが見つかりませんでした。</p>';
      return;
    }

    hits.slice(0, 10).forEach(function (hit, i) {
      // ログから判明：Zola のインデックスでは hit.ref に URL が入っている
      var doc = searchIndex.documentStore.getDoc(hit.ref);
      
      // デバッグ用に doc の中身を再度確認
      console.log('[search.js] Rendering Hit ' + i, doc);

      if (!doc) {
          // doc が取れない場合は、インデックスの中身を直接参照するフォールバック
          doc = searchIndex.documentStore.docs[hit.ref];
      }
      
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
      console.log('[search.js] Attempting related pages auto-render. Current URL:', currentUrl, 'Tags:', tags);

      var matched = docs.filter(function (doc) {
        if (!doc) return false;
        if ((doc.id || '') === currentUrl) return false;
        var docTags = (doc.taxonomies && doc.taxonomies.tags) || [];
        return tags.some(function (t) { return docTags.includes(t); });
      }).slice(0, 3);

      console.log('[search.js] Related pages matched:', matched);

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
