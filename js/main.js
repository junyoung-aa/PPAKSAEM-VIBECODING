const DATA_URL    = '/_data/programs.json';
const TRACKER_URL = 'https://ppaksaem-click-tracker.jykwak1213.workers.dev';

// ── DOM refs ──────────────────────────────────────────────────
const completedGrid  = document.getElementById('completed-grid');
const inDevGrid      = document.getElementById('in-development-grid');
const featureFormDiv = document.getElementById('feature-request-form');
const modalOverlay   = document.getElementById('modal-overlay');
const modalClose     = document.getElementById('modal-close');
const modalTitle     = document.getElementById('modal-title');
const modalIframe    = document.getElementById('modal-iframe');

// ── Page switching ─────────────────────────────────────────────
const pages      = document.querySelectorAll('.page-view');
const navBtns    = document.querySelectorAll('.nav-page-btn');
const mobileBtns = document.querySelectorAll('.mobile-nav-btn');

function switchPage(targetId) {
  pages.forEach(p => p.classList.remove('is-active'));
  navBtns.forEach(b => b.classList.remove('is-active'));
  mobileBtns.forEach(b => b.classList.remove('is-active'));

  const target = document.getElementById(targetId);
  if (target) {
    target.classList.add('is-active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navBtns.forEach(b => { if (b.dataset.page === targetId) b.classList.add('is-active'); });
  mobileBtns.forEach(b => { if (b.dataset.page === targetId) b.classList.add('is-active'); });

  history.replaceState(null, '', `#${targetId}`);

  setTimeout(() => {
    observeAnimateIn();
    if (targetId === 'page-programs') observeCards();
  }, 50);
}

navBtns.forEach(btn => btn.addEventListener('click', () => switchPage(btn.dataset.page)));
mobileBtns.forEach(btn => btn.addEventListener('click', () => switchPage(btn.dataset.page)));

// ── Click tracking ─────────────────────────────────────────────
function trackClick(programId, buttonType) {
  fetch(`${TRACKER_URL}/track?id=${encodeURIComponent(programId)}&button=${encodeURIComponent(buttonType)}`, {
    method: 'POST'
  }).catch(() => {});
}

// ── Load & render ──────────────────────────────────────────────
async function loadPrograms() {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error('데이터를 불러올 수 없습니다.');
    const data = await res.json();

    const sorted    = [...data.programs].sort((a, b) => a.order - b.order);
    const completed = sorted.filter(p => p.status === 'completed');
    const inDev     = sorted.filter(p => p.status === 'in_development');

    const completedCount = document.getElementById('completed-count');
    const inDevCount     = document.getElementById('in-dev-count');
    if (completedCount) completedCount.textContent = completed.length;
    if (inDevCount)     inDevCount.textContent     = inDev.length;

    renderCards(completed, completedGrid, 'completed');
    renderCards(inDev, inDevGrid, 'in_development');
    renderFeatureRequestForm(data.feature_request_form_url);

    const inDevSection = document.getElementById('in-development');
    if (inDev.length === 0 && inDevSection) inDevSection.style.display = 'none';

  } catch (err) {
    if (completedGrid)
      completedGrid.innerHTML = '<p class="empty-msg">프로그램 목록을 불러오는 데 실패했습니다.</p>';
    console.error(err);
  }
}

function getIcon(tags) {
  const t = tags || [];
  if (t.includes('PDF'))     return '📄';
  if (t.includes('배경화면')) return '🖥️';
  if (t.includes('계획서'))   return '📋';
  if (t.includes('AI'))      return '🤖';
  return '✨';
}

function renderCards(programs, container, type) {
  if (!container) return;
  if (programs.length === 0) {
    container.innerHTML = '<p class="empty-msg">등록된 프로그램이 없습니다.</p>';
    return;
  }

  container.innerHTML = programs.map(p => `
    <article class="program-card">
      <div class="card-thumbnail ${p.thumbnail ? '' : 'card-thumbnail--placeholder'}">
        ${p.thumbnail
          ? `<img src="${p.thumbnail}" alt="${p.title} 썸네일" loading="lazy" />`
          : `<span class="placeholder-icon">${getIcon(p.tags)}</span>`
        }
      </div>
      <div class="card-body">
        <div class="card-header">
          <h3 class="card-title">${p.title}</h3>
          <span class="status-badge status-badge--${p.status}">
            ${p.status === 'completed' ? '배포중' : '개발 중'}
          </span>
        </div>
        <p class="card-description">${p.description}</p>
        ${(p.version || p.release_date) ? `
        <div class="card-meta">
          ${p.version      ? `<span class="card-meta-version">v${p.version}</span>` : ''}
          ${p.release_date ? `<span class="card-meta-date">${p.release_date.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1년 $2월 $3일')} 배포</span>` : ''}
        </div>` : ''}
        <div class="card-tags">
          ${(p.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
        ${type === 'completed'
          ? `<div class="card-actions">
               ${(p.demo_url || p.guide_url || p.download_url) ? `
               <div class="btn-row">
                 ${p.demo_url     ? `<a class="btn-demo"     href="${p.demo_url}"     target="_blank" rel="noopener" onclick="trackClick('${p.id}','demo')">▶ 체험해보기</a>` : ''}
                 ${p.guide_url    ? `<a class="btn-guide"    href="${p.guide_url}"    target="_blank" rel="noopener" onclick="trackClick('${p.id}','guide')">📖 가이드</a>` : ''}
                 ${p.download_url ? `<a class="btn-download${p.download_url_note ? ' has-note' : ''}" href="${p.download_url}" download target="_blank" rel="noopener"
                   data-note="${p.download_url_note || ''}" data-track-id="${p.id}" data-track-type="download">⬇ 다운로드</a>` : ''}
               </div>` : ''}
               ${p.site_url
                 ? `<a class="btn-site${p.site_url_note ? ' has-note' : ''}" href="${p.site_url}" target="_blank" rel="noopener"
                      data-note="${p.site_url_note || ''}" data-track-id="${p.id}" data-track-type="site">
                      🔗 바로가기
                    </a>`
                 : ''}
               ${(!p.download_url && !p.site_url)
                 ? `<button class="btn-request" data-form-url="${p.google_form_url}" data-title="${p.title}">신청하기</button>`
                 : ''}
             </div>`
          : `<div class="coming-soon-bar">
               <span class="coming-soon-dot"></span>
               개발 중 · 완성 시 안내드립니다
             </div>`
        }
      </div>
    </article>
  `).join('');

  container.querySelectorAll('.btn-request').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.formUrl, btn.dataset.title));
  });
}

function renderFeatureRequestForm(url) {
  if (!featureFormDiv) return;
  if (!url || url === 'FEATURE_REQUEST_FORM_URL_HERE') {
    featureFormDiv.innerHTML = `<div class="form-placeholder"><p>피드백 폼을 준비 중입니다. 곧 공개됩니다!</p></div>`;
    return;
  }
  featureFormDiv.innerHTML = `
    <iframe src="${url}" width="100%" height="600" frameborder="0"
      marginheight="0" marginwidth="0" title="피드백 폼" loading="lazy">
      로딩 중...
    </iframe>`;
}

// ── Modal ──────────────────────────────────────────────────────
function openModal(formUrl, title) {
  if (!formUrl || formUrl === 'GOOGLE_FORM_URL_HERE') {
    alert('신청 폼이 아직 준비 중입니다. 잠시 후 다시 시도해 주세요.');
    return;
  }
  modalTitle.textContent = title + ' 신청';
  modalIframe.src = formUrl;
  modalOverlay.classList.add('is-open');
  modalOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  modalClose.focus();
}

function closeModal() {
  modalOverlay.classList.remove('is-open');
  modalOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  modalIframe.src = '';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Info Popup ─────────────────────────────────────────────────
function openInfoPopup(note, href, isDownload, trackId, trackType) {
  const existing = document.getElementById('info-popup-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'info-popup-overlay';
  overlay.innerHTML = `
    <div class="info-popup">
      <p class="info-popup-msg">${note.replace(/\n/g, '<br>')}</p>
      <div class="info-popup-btns">
        <button class="info-popup-cancel">취소</button>
        <a class="info-popup-confirm" href="${href}" ${isDownload ? 'download' : ''} target="_blank" rel="noopener">계속하기</a>
      </div>
    </div>
  `;

  overlay.querySelector('.info-popup-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('.info-popup-confirm').addEventListener('click', () => {
    trackClick(trackId, trackType);
    setTimeout(() => overlay.remove(), 200);
  });

  document.body.appendChild(overlay);
}

document.addEventListener('click', e => {
  const btn = e.target.closest('.has-note');
  if (!btn) return;
  const note = btn.dataset.note;
  if (!note) return;
  e.preventDefault();
  const isDownload = btn.hasAttribute('download');
  openInfoPopup(note, btn.href, isDownload, btn.dataset.trackId, btn.dataset.trackType);
});

// ── Ripple ─────────────────────────────────────────────────────
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn-request');
  if (!btn) return;
  const ripple = document.createElement('span');
  const rect   = btn.getBoundingClientRect();
  const size   = Math.max(rect.width, rect.height);
  ripple.className = 'ripple';
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px;`;
  btn.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
});

// ── Section jump links ─────────────────────────────────────────
function initSectionNav() {
  document.querySelectorAll('.section-nav a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      document.querySelectorAll('.section-nav a').forEach(a => a.classList.remove('is-active'));
      link.classList.add('is-active');
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ── Card scroll fade-in ────────────────────────────────────────
let cardObserver = null;
function observeCards() {
  if (cardObserver) cardObserver.disconnect();
  cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('is-visible'), i * 80);
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.program-card:not(.is-visible)').forEach(c => cardObserver.observe(c));
}

// ── Generic animate-in ─────────────────────────────────────────
let animateObserver = null;
function observeAnimateIn() {
  if (animateObserver) animateObserver.disconnect();
  animateObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        animateObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.animate-in:not(.is-visible)').forEach(el => animateObserver.observe(el));
}

// ── Hash routing ───────────────────────────────────────────────
function initFromHash() {
  const hash = window.location.hash.replace('#', '');
  const valid = ['page-programs', 'page-about', 'page-feedback'];
  switchPage(valid.includes(hash) ? hash : 'page-programs');
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSectionNav();
  initFromHash();
  observeAnimateIn();
});

loadPrograms().then(() => {
  if (document.getElementById('page-programs')?.classList.contains('is-active')) {
    observeCards();
  }
});
