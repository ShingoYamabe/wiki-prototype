/**
 * search.js — クライアントサイド全文検索 (F-B02)
 * 依存: Elasticlunr.js (CDN から動的ロード)
 *
 * Zola の search_index.en.js を読み込み、インクリメンタルサーチを実装する。
 */

(function () {
  'use strict';

  // Elasticlunr CDN URL
  const ELASTICLUNR_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/elasticlunr/0.9.6/elasticlunr.min.js';

  // base.html の get_url で解決した絶対 URL からパス部分だけ取り出す。
  // これにより origin が local/production で異なっても正しく動作する。
  const SEARCH_INDEX_URL = (function () {
    var raw = window.SEARCH_INDEX_URL;
    if (!raw) return '/search_index.en.json';
    try { return new URL(raw).pathname; } catch (e) { return raw; }
  })();

  let searchIndex  = null;
  let searchData   = null; // { doc_id -> {title, url, body, category, tags} }
  let elasticlunr  = null;
  let searchLoaded = false;

  const input   = document.getElementById('search-input');
  const results = document.getElementById('search-results');

  if (!input || !results) return;

  // --------------------------------------------------------------------------
  // Elasticlunr を動的ロード（検索バーフォーカス時に初回ロード）
  // --------------------------------------------------------------------------
  input.addEventListener('focus', function loadOnce() {
    input.removeEventListener('focus', loadOnce);
    loadElasticlunr();
  }, { once: true });

  function loadElasticlunr() {
    const script  = document.createElement('script');
    script.src    = ELASTICLUNR_CDN;
    script.async  = true;
    script.onload = function () {
      elasticlunr = window.elasticlunr;
      fetchSearchIndex();
    };
    script.onerror = function () {
      console.warn('[search.js] Failed to load Elasticlunr from CDN');
    };
    document.head.appendChild(script);
  }

  function fetchSearchIndex() {
    fetch(SEARCH_INDEX_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        buildIndex(data);
        searchLoaded = true;
        // フォーカス中に入力があった場合は直ちに検索
        if (input.value.trim()) doSearch(input.value.trim());
      })
      .catch(function (err) {
        console.warn('[search.js] Failed to load search index:', err);
      });
  }

  function buildIndex(data) {
    // Zola の検索インデックス形式に合わせてパース
    searchData = {};
    searchIndex = elasticlunr(function () {
      this.addField('title');
      this.addField('body');
      this.addField('description');
      this.setRef('id');
      this.saveDocument(false);
    });

    (data.docs || []).forEach(function (doc) {
      searchData[doc.id] = doc;
      searchIndex.addDoc({
        id:          doc.id,
        title:       doc.title       || '',
        body:        doc.body        || '',
        description: doc.description || '',
      });
    });
  }

  // --------------------------------------------------------------------------
  // インクリメンタルサーチ
  // --------------------------------------------------------------------------
  let debounceTimer;
  input.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    const query = input.value.trim();
    if (!query) {
      hideResults();
      return;
    }
    debounceTimer = setTimeout(function () {
      if (searchLoaded) {
        doSearch(query);
      }
    }, 150);
  });

  function doSearch(query) {
    if (!searchIndex || !searchData) return;

    const hits = searchIndex.search(query, {
      fields: { title: { boost: 3 }, description: { boost: 2 }, body: { boost: 1 } },
      expand: true,
    }).slice(0, 10);

    renderResults(query, hits);
  }

  function renderResults(query, hits) {
    results.innerHTML = '';
    results.hidden    = false;
    input.setAttribute('aria-expanded', 'true');

    if (!hits.length) {
      results.innerHTML = '<p class="search-no-results">「' + escapeHtml(query) + '」に一致するページが見つかりませんでした。</p>';
      return;
    }

    hits.forEach(function (hit) {
      const doc  = searchData[hit.ref];
      if (!doc) return;

      const a = document.createElement('a');
      a.href      = doc.url || '#';
      a.className = 'search-result-item';
      a.setAttribute('role', 'option');

      const snippet = extractSnippet(doc.body || '', query, 120);
      const cat     = doc.extra && doc.extra.category ? doc.extra.category : '';

      a.innerHTML = [
        '<span class="search-result-item__title">' + escapeHtml(doc.title) + '</span>',
        cat ? '<span class="search-result-item__meta">' +
              '<span class="badge badge--' + escapeHtml(cat) + '">' + escapeHtml(cat) + '</span>' +
              '</span>' : '',
        snippet ? '<span class="search-result-item__snippet">' + escapeHtml(snippet) + '</span>' : '',
      ].join('');

      results.appendChild(a);
    });
  }

  function hideResults() {
    results.hidden = true;
    results.innerHTML = '';
    input.setAttribute('aria-expanded', 'false');
  }

  // 入力外クリックで閉じる
  document.addEventListener('click', function (e) {
    if (!input.contains(e.target) && !results.contains(e.target)) {
      hideResults();
    }
  });

  // --------------------------------------------------------------------------
  // キーボードナビゲーション (NF-A03)
  // --------------------------------------------------------------------------
  input.addEventListener('keydown', function (e) {
    const items = results.querySelectorAll('.search-result-item');
    const focused = results.querySelector('.is-focused');
    let idx = Array.from(items).indexOf(focused);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (focused) focused.classList.remove('is-focused');
      const next = items[idx + 1] || items[0];
      if (next) next.classList.add('is-focused');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (focused) focused.classList.remove('is-focused');
      const prev = items[idx - 1] || items[items.length - 1];
      if (prev) prev.classList.add('is-focused');
    } else if (e.key === 'Enter') {
      const active = results.querySelector('.is-focused') || items[0];
      if (active) { e.preventDefault(); active.click(); }
    }
  });

  // --------------------------------------------------------------------------
  // 関連ページ自動補完 (F-B03 タグベース)
  // --------------------------------------------------------------------------
  function initRelatedAuto() {
    const placeholder = document.getElementById('js-related-auto');
    if (!placeholder) return;

    const tags = (placeholder.dataset.tags || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    if (!tags.length) return;

    function tryRender() {
      if (!searchLoaded) {
        setTimeout(tryRender, 500);
        return;
      }

      const currentUrl = window.location.pathname;
      const docs = Object.values(searchData);
      const matched = docs.filter(function (doc) {
        if (doc.url === currentUrl) return false;
        const docTags = (doc.taxonomies && doc.taxonomies.tags) || [];
        return tags.some(function (t) { return docTags.includes(t); });
      }).slice(0, 3);

      if (!matched.length) return;

      matched.forEach(function (doc) {
        const a = document.createElement('a');
        a.href      = doc.url;
        a.className = 'related-card';
        const cat   = (doc.extra && doc.extra.category) || 'knowledge';
        a.innerHTML =
          '<span class="related-card__cat badge badge--' + escapeHtml(cat) + '">' + escapeHtml(cat) + '</span>' +
          '<span class="related-card__title">' + escapeHtml(doc.title) + '</span>' +
          (doc.description ? '<span class="related-card__desc">' + escapeHtml(doc.description) + '</span>' : '');
        placeholder.appendChild(a);
      });
    }

    // 検索インデックスがロードされていない場合は遅延
    if (document.readyState === 'complete') {
      if (!searchLoaded) loadElasticlunr();
      tryRender();
    } else {
      window.addEventListener('load', function () {
        if (!searchLoaded) loadElasticlunr();
        tryRender();
      });
    }
  }

  initRelatedAuto();

  // --------------------------------------------------------------------------
  // ユーティリティ
  // --------------------------------------------------------------------------
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function extractSnippet(text, query, maxLen) {
    const lower = text.toLowerCase();
    const q     = query.toLowerCase();
    const idx   = lower.indexOf(q);
    if (idx === -1) return text.slice(0, maxLen);
    const start = Math.max(0, idx - 40);
    const end   = Math.min(text.length, idx + maxLen);
    return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  }

})();
