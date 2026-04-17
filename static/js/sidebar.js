/**
 * sidebar.js — 折り畳みサイドバー (F-B01)
 * 依存: なし（標準 API のみ）
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // サイドバー カテゴリ折り畳み
  // --------------------------------------------------------------------------
  function initCategoryToggle() {
    const buttons = document.querySelectorAll('.sidebar__cat-btn');
    if (!buttons.length) return;

    // 現在のページの URL からカテゴリを判定
    const currentPath = window.location.pathname;

    buttons.forEach(function (btn) {
      const category = btn.dataset.category;
      const targetId = 'sidebar-cat-' + category;
      const target   = document.getElementById(targetId);
      if (!target) return;

      // sessionStorage から状態復元 (F-B01)
      const storageKey = 'sidebar-cat-' + category;
      const stored     = sessionStorage.getItem(storageKey);

      // デフォルト: 現在のカテゴリのみ展開
      const isCurrentCat = currentPath.includes('/' + category + '/');
      let shouldOpen = stored !== null ? stored === 'open' : isCurrentCat;

      applyOpen(btn, target, shouldOpen, /* animate= */ false);

      btn.addEventListener('click', function () {
        const nowOpen = btn.getAttribute('aria-expanded') === 'true';
        applyOpen(btn, target, !nowOpen, true);
        sessionStorage.setItem(storageKey, !nowOpen ? 'open' : 'closed');
      });
    });
  }

  function applyOpen(btn, target, open, animate) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      target.classList.add('is-open');
    } else {
      target.classList.remove('is-open');
    }
  }

  // --------------------------------------------------------------------------
  // ハンバーガー（モバイルドロワー）
  // --------------------------------------------------------------------------
  function initHamburger() {
    const toggle  = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!toggle || !sidebar) return;

    function openSidebar() {
      sidebar.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
      sidebar.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    toggle.addEventListener('click', function () {
      const isOpen = sidebar.classList.contains('is-open');
      isOpen ? closeSidebar() : openSidebar();
    });

    // オーバーレイクリックで閉じる
    if (overlay) {
      overlay.addEventListener('click', closeSidebar);
    }

    // ESC キーで閉じる
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('is-open')) {
        closeSidebar();
        toggle.focus();
      }
    });
  }

  // --------------------------------------------------------------------------
  // コードブロック: コピーボタン付与 (7.5)
  // --------------------------------------------------------------------------
  function initCodeCopy() {
    document.querySelectorAll('.prose pre').forEach(function (pre) {
      // wrapper div
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      const btn = document.createElement('button');
      btn.className = 'code-copy-btn';
      btn.textContent = 'コピー';
      btn.setAttribute('aria-label', 'コードをコピー');
      wrapper.appendChild(btn);

      btn.addEventListener('click', function () {
        const code = pre.querySelector('code');
        const text = code ? code.innerText : pre.innerText;
        navigator.clipboard.writeText(text).then(function () {
          btn.textContent = '✓ コピー済み';
          setTimeout(function () { btn.textContent = 'コピー'; }, 2000);
        }).catch(function () {
          btn.textContent = '失敗';
          setTimeout(function () { btn.textContent = 'コピー'; }, 2000);
        });
      });
    });
  }

  // --------------------------------------------------------------------------
  // 見出しパーマリンク (7.5)
  // --------------------------------------------------------------------------
  function initHeadingAnchors() {
    document.querySelectorAll('.prose h2, .prose h3, .prose h4').forEach(function (h) {
      if (!h.id) return;
      const a = document.createElement('a');
      a.className = 'anchor';
      a.href = '#' + h.id;
      a.setAttribute('aria-label', 'このセクションへのリンクをコピー');
      a.textContent = '¶';
      a.addEventListener('click', function (e) {
        e.preventDefault();
        const url = window.location.origin + window.location.pathname + '#' + h.id;
        navigator.clipboard.writeText(url).catch(function () {});
        window.location.hash = '#' + h.id;
      });
      h.appendChild(a);
    });
  }

  // --------------------------------------------------------------------------
  // 初期化
  // --------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    initCategoryToggle();
    initHamburger();
    initCodeCopy();
    initHeadingAnchors();
  }

})();
