/**
 * Radio Neon - UI & Interaction Controller
 * Modals, Toasts, Track Rendering, Search, Localization (AR/EN), Keyboard Shortcuts
 */

const UI = {
  currentLang: 'ar',
  activeCommentTrackId: null,

  translations: {
    ar: {
      navTracks: "الأغاني الفردية",
      navLive: "البث المباشر",
      navPlaylists: "قوائم التشغيل",
      syncTooltip: "مزامنة القناة",
      login: "تسجيل الدخول",
      register: "إنشاء حساب جديد",
      featuredTrack: "المقطوعة المميزة اليوم",
      playNow: "استمع الآن",
      share: "مشاركة",
      chipAll: "الكل",
      chipAmbient: "هادئة (Ambient)",
      chipSynth: "سينث ويف (Synth)",
      chipLofi: "لو فاي (Lo-Fi)",
      chipOriental: "شرقي نيون (Oriental)",
      chipBeat: "إيقاع وحماس (Beats)",
      sortNewest: "الأحدث",
      sortPopular: "الأكثر إعجاباً",
      sortViews: "الأكثر استماعاً",
      sortDuration: "الأطول مدة",
      loadingTracks: "جاري تحميل المقطوعات الموسيقية...",
      liveOnAir: "بث مباشر 24/7 ON AIR",
      listenersNow: "مستمع الآن",
      shareStream: "مشاركة البث",
      visualizer: "المؤثرات",
      sendReaction: "تفاعل مباشر:",
      upNext: "التالي في البث",
      smartLoop: "تكرار ذكي 24/7",
      liveChat: "شات المستمعين",
      myPlaylists: "قوائم التشغيل الخاصة بي",
      playlistsSub: "أنشئ ونظّم قوائمك الموسيقية المفضلة واستمع إليها في أي وقت",
      createNewPlaylist: "إنشاء قائمة جديدة",
      backToPlaylists: "العودة للقوائم",
      playAll: "تشغيل الكل",
      nowPlaying: "جاري التشغيل من",
      currentQueue: "قائمة التشغيل الحالية",
      commentsTitle: "تعليقات الأغنية",
      shareTitle: "مشاركة المقطوعة",
      copy: "نسخ",
      newPlaylist: "إنشاء قائمة تشغيل",
      playlistNameLabel: "اسم القائمة:",
      playlistDescLabel: "الوصف (اختياري):",
      playlistColorLabel: "لون السمة:",
      cancel: "إلغاء",
      create: "إنشاء القائمة",
      addToPlaylistTitle: "إضافة إلى قائمة تشغيل",
      authTitle: "حساب راديو نيون",
      googleSignIn: "المتابعة باستخدام Google / Gmail",
      orWithEmail: "أو عبر البريد الإلكتروني",
      nameLabel: "الاسم:",
      emailLabel: "البريد الإلكتروني:",
      passwordLabel: "كلمة المرور:",
      likedTracks: "المعجب بها",
      playlists: "قوائم",
      logout: "تسجيل الخروج",
      syncTitle: "مزامنة قناة Radio Neon",
      syncingDesc: "جاري فحص القناة @RadioNeonAi واستخراج المقطوعات والأغاني الجديدة بصيغة MP3 عالية الجودة..."
    },
    en: {
      navTracks: "Single Tracks",
      navLive: "Live Radio",
      navPlaylists: "Playlists",
      syncTooltip: "Sync Channel",
      login: "Sign In",
      register: "Create Account",
      featuredTrack: "Featured Track Today",
      playNow: "Play Now",
      share: "Share",
      chipAll: "All",
      chipAmbient: "Ambient",
      chipSynth: "Synthwave",
      chipLofi: "Lo-Fi",
      chipOriental: "Oriental Neon",
      chipBeat: "Beats & Energy",
      sortNewest: "Newest",
      sortPopular: "Most Liked",
      sortViews: "Most Played",
      sortDuration: "Longest",
      loadingTracks: "Loading music tracks...",
      liveOnAir: "24/7 LIVE ON AIR",
      listenersNow: "listeners right now",
      shareStream: "Share Stream",
      visualizer: "Visualizer",
      sendReaction: "Live Reactions:",
      upNext: "Up Next in Stream",
      smartLoop: "Smart Loop 24/7",
      liveChat: "Live Chat",
      myPlaylists: "My Playlists",
      playlistsSub: "Create and organize your favorite neon tracks anytime",
      createNewPlaylist: "Create New Playlist",
      backToPlaylists: "Back to Playlists",
      playAll: "Play All",
      nowPlaying: "Now Playing From",
      currentQueue: "Current Playback Queue",
      commentsTitle: "Track Comments",
      shareTitle: "Share Track",
      copy: "Copy",
      newPlaylist: "Create Playlist",
      playlistNameLabel: "Playlist Name:",
      playlistDescLabel: "Description (Optional):",
      playlistColorLabel: "Theme Color:",
      cancel: "Cancel",
      create: "Create",
      addToPlaylistTitle: "Add to Playlist",
      authTitle: "Radio Neon Account",
      googleSignIn: "Continue with Google / Gmail",
      orWithEmail: "Or with email address",
      nameLabel: "Name:",
      emailLabel: "Email:",
      passwordLabel: "Password:",
      likedTracks: "Liked Tracks",
      playlists: "Playlists",
      logout: "Log Out",
      syncTitle: "Sync Radio Neon Channel",
      syncingDesc: "Scanning @RadioNeonAi channel & extracting high quality MP3 tracks..."
    }
  },

  init() {
    this.bindEvents();
    this.bindKeyboardShortcuts();
  },

  bindEvents() {
    // Language Toggle
    const btnLangToggle = document.getElementById('btnLangToggle');
    if (btnLangToggle) {
      btnLangToggle.addEventListener('click', () => this.toggleLanguage());
    }

    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });

    // View Grid / List Toggle
    const btnViewGrid = document.getElementById('btnViewGrid');
    const btnViewList = document.getElementById('btnViewList');
    const tracksContainer = document.getElementById('tracksContainer');

    if (btnViewGrid && btnViewList && tracksContainer) {
      btnViewGrid.addEventListener('click', () => {
        btnViewGrid.classList.add('active');
        btnViewList.classList.remove('active');
        tracksContainer.classList.remove('list-view');
      });

      btnViewList.addEventListener('click', () => {
        btnViewList.classList.add('active');
        btnViewGrid.classList.remove('active');
        tracksContainer.classList.add('list-view');
      });
    }

    // Search & Filter Events
    const searchInput = document.getElementById('trackSearchInput');
    const btnSearchClear = document.getElementById('btnSearchClear');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (btnSearchClear) btnSearchClear.style.display = val ? 'block' : 'none';
        this.filterTracks();
      });
    }

    if (btnSearchClear) {
      btnSearchClear.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        btnSearchClear.style.display = 'none';
        this.filterTracks();
      });
    }

    // Category Chips
    document.querySelectorAll('#categoryChips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#categoryChips .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.filterTracks();
      });
    });

    // Sort Dropdown
    const sortSelect = document.getElementById('trackSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => this.filterTracks());
    }

    // Queue Drawer Toggle
    const btnToggleQueue = document.getElementById('btnToggleQueue');
    const queueDrawer = document.getElementById('queueDrawer');
    const btnCloseQueue = document.getElementById('btnCloseQueue');

    if (btnToggleQueue && queueDrawer) {
      btnToggleQueue.addEventListener('click', () => queueDrawer.classList.toggle('open'));
    }
    if (btnCloseQueue && queueDrawer) {
      btnCloseQueue.addEventListener('click', () => queueDrawer.classList.remove('open'));
    }

    // Fullscreen Player Open/Close
    const btnExpandPlayer = document.getElementById('btnExpandPlayer');
    const btnOpenFs = document.getElementById('btnOpenFullscreenPlayer');
    const fullscreenModal = document.getElementById('fullscreenModal');
    const btnCloseFs = document.getElementById('btnCloseFullscreen');

    if (btnExpandPlayer && fullscreenModal) {
      btnExpandPlayer.addEventListener('click', () => fullscreenModal.classList.add('open'));
    }
    if (btnOpenFs && fullscreenModal) {
      btnOpenFs.addEventListener('click', () => fullscreenModal.classList.add('open'));
    }
    if (btnCloseFs && fullscreenModal) {
      btnCloseFs.addEventListener('click', () => fullscreenModal.classList.remove('open'));
    }

    // Hero Actions
    const btnPlayFeatured = document.getElementById('btnPlayFeatured');
    if (btnPlayFeatured) {
      btnPlayFeatured.addEventListener('click', () => {
        if (AppState.tracks && AppState.tracks.length > 0) {
          AudioPlayer.playTrack(AppState.tracks[0], AppState.tracks, 0);
        }
      });
    }

    const btnHeroLike = document.getElementById('btnHeroLike');
    if (btnHeroLike) {
      btnHeroLike.addEventListener('click', () => {
        if (AppState.tracks && AppState.tracks.length > 0) {
          this.toggleTrackLike(AppState.tracks[0].id);
        }
      });
    }

    const btnHeroShare = document.getElementById('btnHeroShare');
    if (btnHeroShare) {
      btnHeroShare.addEventListener('click', () => {
        if (AppState.tracks && AppState.tracks.length > 0) {
          this.openShareModal(AppState.tracks[0]);
        }
      });
    }

    // Close Comments Modal
    const btnCloseComments = document.getElementById('btnCloseComments');
    if (btnCloseComments) {
      btnCloseComments.addEventListener('click', () => this.closeCommentsModal());
    }

    // Comment Form Submission
    const commentForm = document.getElementById('commentForm');
    if (commentForm) {
      commentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitComment();
      });
    }

    // Share Modal Close & Copy
    const btnCloseShare = document.getElementById('btnCloseShare');
    if (btnCloseShare) {
      btnCloseShare.addEventListener('click', () => this.closeShareModal());
    }

    const btnCopyShareUrl = document.getElementById('btnCopyShareUrl');
    if (btnCopyShareUrl) {
      btnCopyShareUrl.addEventListener('click', () => this.copyShareUrl());
    }

    // Channel Sync Button
    const btnSync = document.getElementById('btnSyncChannel');
    if (btnSync) {
      btnSync.addEventListener('click', () => this.triggerChannelSync());
    }

    const btnCloseSyncModal = document.getElementById('btnCloseSyncModal');
    if (btnCloseSyncModal) {
      btnCloseSyncModal.addEventListener('click', () => {
        document.getElementById('syncModalOverlay').classList.remove('open');
      });
    }
  },

  // Switch Tab
  switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === tabId;
      btn.classList.toggle('active', isTarget);
      btn.setAttribute('aria-selected', isTarget);
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // Render Track Grid
  renderTracks(tracks) {
    const container = document.getElementById('tracksContainer');
    if (!container) return;

    if (!tracks || tracks.length === 0) {
      container.innerHTML = `
        <div class="empty-state-wrapper">
          <i class="fa-solid fa-music" style="font-size:3rem;color:var(--color-neon-purple);margin-bottom:12px;"></i>
          <h3>لم يتم العثور على مقطوعات تطابق بحثك</h3>
          <p>جرّب البحث بكلمات أخرى أو اختر تصنيفاً مختلفاً</p>
        </div>
      `;
      return;
    }

    container.innerHTML = tracks.map(t => {
      const isPlaying = AudioPlayer.currentTrack && (AudioPlayer.currentTrack.id === t.id) && AudioPlayer.isPlaying;
      const title = t.title || `${t.titleAr || ''} - ${t.titleEn || ''}`;
      return `
        <div class="track-card ${isPlaying ? 'is-playing' : ''}" data-id="${t.id}">
          <div class="track-thumb-container">
            <img src="${t.thumbnailUrl || 'assets/PNG-LOGO.png'}" alt="${title}" class="track-thumb-img" loading="lazy">
            <span class="track-duration-pill">${t.durationString || AudioPlayer.formatTime(t.duration)}</span>
            
            <div class="playing-equalizer-overlay">
              <span class="eq-bar"></span>
              <span class="eq-bar"></span>
              <span class="eq-bar"></span>
              <span class="eq-bar"></span>
            </div>

            <div class="card-play-overlay">
              <button class="card-play-btn" onclick="UI.handleCardPlay('${t.id}')">
                <i class="${isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play'}"></i>
              </button>
            </div>
          </div>

          <div class="track-card-content">
            <h3 class="track-card-title" title="${title}">${title}</h3>
            <span class="track-card-artist">
              <i class="fa-solid fa-circle-check" style="font-size:0.75rem;color:var(--color-sky-blue);"></i> Radio Neon AI
            </span>
            <div class="track-tags-row">
              ${(t.tags || ['Radio Neon']).map(tag => `<span class="tag-badge">${tag}</span>`).join('')}
            </div>
          </div>

          <div class="track-card-actions">
            <button class="action-btn-sm ${t.isLiked ? 'liked' : ''}" onclick="UI.toggleTrackLike('${t.id}')" title="إعجاب">
              <i class="${t.isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}"></i>
              <span>${t.likesCount || 0}</span>
            </button>

            <button class="action-btn-sm" onclick="UI.openCommentsModal('${t.id}')" title="التعليقات">
              <i class="fa-regular fa-comment"></i>
              <span>${t.commentsCount || 0}</span>
            </button>

            <button class="action-btn-sm" onclick="Playlists.openAddToPlaylistPicker('${t.id}')" title="إضافة لقائمة">
              <i class="fa-solid fa-plus"></i>
            </button>

            <button class="action-btn-sm" onclick="UI.openShareModalById('${t.id}')" title="مشاركة">
              <i class="fa-solid fa-share-nodes"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  handleCardPlay(trackId) {
    const track = AppState.tracks.find(t => t.id === trackId || t.videoId === trackId);
    if (!track) return;

    if (AudioPlayer.currentTrack && AudioPlayer.currentTrack.id === track.id) {
      AudioPlayer.togglePlay();
    } else {
      AudioPlayer.playTrack(track, AppState.tracks);
    }
  },

  async toggleTrackLike(trackId) {
    try {
      const res = await API.toggleLike(trackId);
      if (res && res.success) {
        // Update local state
        const track = AppState.tracks.find(t => t.id === trackId || t.videoId === trackId);
        if (track) {
          track.isLiked = res.liked;
          track.likesCount = res.likesCount;
        }

        // Re-render UI
        this.renderTracks(AppState.filteredTracks || AppState.tracks);
        if (AudioPlayer.currentTrack && AudioPlayer.currentTrack.id === trackId) {
          AudioPlayer.updateTrackInfoUI(AudioPlayer.currentTrack);
        }

        this.showToast(res.liked ? 'تمت الإضافة إلى المعجب بها ❤️' : 'تمت الإزالة من المعجب بها');
      }
    } catch (err) {
      this.showToast('يرجى تسجيل الدخول للإعجاب', 'error');
    }
  },

  // Search & Filter Trigger
  filterTracks() {
    const searchInput = document.getElementById('trackSearchInput');
    const sortSelect = document.getElementById('trackSortSelect');
    const activeChip = document.querySelector('#categoryChips .chip.active');

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const tag = activeChip ? activeChip.getAttribute('data-tag') : 'all';
    const sort = sortSelect ? sortSelect.value : 'newest';

    let filtered = [...AppState.tracks];

    if (query) {
      filtered = filtered.filter(t => 
        (t.title && t.title.toLowerCase().includes(query)) ||
        (t.titleAr && t.titleAr.toLowerCase().includes(query)) ||
        (t.titleEn && t.titleEn.toLowerCase().includes(query)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    if (tag && tag !== 'all') {
      filtered = filtered.filter(t => t.tags && t.tags.some(tg => tg.toLowerCase() === tag.toLowerCase()));
    }

    if (sort === 'popular') {
      filtered.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    } else if (sort === 'views') {
      filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sort === 'duration') {
      filtered.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    } else {
      filtered.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
    }

    AppState.filteredTracks = filtered;
    this.renderTracks(filtered);
  },

  // Comments Modal
  async openCommentsModal(trackId) {
    this.activeCommentTrackId = trackId;
    const track = AppState.tracks.find(t => t.id === trackId);
    const overlay = document.getElementById('commentsModalOverlay');
    const cmtPreviewThumb = document.getElementById('cmtPreviewThumb');
    const cmtPreviewTitle = document.getElementById('cmtPreviewTitle');
    const cmtPreviewCount = document.getElementById('cmtPreviewCount');
    const commentsList = document.getElementById('commentsList');

    if (!track || !overlay) return;

    if (cmtPreviewThumb) cmtPreviewThumb.src = track.thumbnailUrl || 'assets/PNG-LOGO.png';
    if (cmtPreviewTitle) cmtPreviewTitle.textContent = track.title;

    overlay.classList.add('open');
    if (commentsList) commentsList.innerHTML = '<p class="text-muted text-center p-3">جاري تحميل التعليقات...</p>';

    try {
      const data = await API.getComments(trackId);
      const comments = data.comments || [];
      if (cmtPreviewCount) cmtPreviewCount.textContent = `${comments.length} تعليق`;

      if (comments.length === 0) {
        commentsList.innerHTML = '<p class="text-muted text-center p-4">لا توجد تعليقات بعد. كن أول من يترك تعليقاً لطيفاً!</p>';
      } else {
        commentsList.innerHTML = comments.map(c => `
          <div class="comment-item">
            <img src="${c.userAvatar || 'assets/PNG-LOGO.png'}" alt="Avatar" class="cmt-avatar">
            <div class="cmt-body">
              <div class="cmt-author">${this.escapeHtml(c.userName)}</div>
              <div class="cmt-text">${this.escapeHtml(c.content)}</div>
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      if (commentsList) commentsList.innerHTML = '<p class="text-danger text-center p-3">تعذر تحميل التعليقات</p>';
    }
  },

  closeCommentsModal() {
    const overlay = document.getElementById('commentsModalOverlay');
    if (overlay) overlay.classList.remove('open');
    this.activeCommentTrackId = null;
  },

  async submitComment() {
    const input = document.getElementById('commentInput');
    if (!input || !input.value.trim() || !this.activeCommentTrackId) return;

    const content = input.value.trim();
    input.value = '';

    try {
      await API.addComment(this.activeCommentTrackId, content);
      this.showToast('تمت إضافة تعليقك بنجاح! 💬');
      this.openCommentsModal(this.activeCommentTrackId);
    } catch (err) {
      this.showToast('تعذر إرسال التعليق', 'error');
    }
  },

  // Share Modal
  openShareModalById(trackId) {
    const track = AppState.tracks.find(t => t.id === trackId);
    if (track) this.openShareModal(track);
  },

  openShareModal(track) {
    const overlay = document.getElementById('shareModalOverlay');
    const trackName = document.getElementById('shareTrackName');
    const shareInput = document.getElementById('shareUrlInput');

    if (!overlay || !track) return;

    const shareUrl = `${window.location.origin}/#track-${track.id}`;
    if (trackName) trackName.textContent = track.title || 'Radio Neon Track';
    if (shareInput) shareInput.value = shareUrl;

    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(`استمع إلى ${track.title || 'موسيقى راديو نيون'} على Radio Neon AI 📻✨\n`);

    // Setup Social Share Links
    document.getElementById('shareWhatsapp').onclick = () => {
      window.open(`https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`, '_blank');
    };
    document.getElementById('shareTwitter').onclick = () => {
      window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank');
    };
    document.getElementById('shareTelegram').onclick = () => {
      window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank');
    };
    document.getElementById('shareFacebook').onclick = () => {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
    };

    overlay.classList.add('open');
  },

  closeShareModal() {
    const overlay = document.getElementById('shareModalOverlay');
    if (overlay) overlay.classList.remove('open');
  },

  copyShareUrl() {
    const shareInput = document.getElementById('shareUrlInput');
    if (!shareInput) return;

    navigator.clipboard.writeText(shareInput.value).then(() => {
      this.showToast('تم نسخ الرابط إلى الحافظة! 📋');
    }).catch(() => {
      shareInput.select();
      document.execCommand('copy');
      this.showToast('تم نسخ الرابط! 📋');
    });
  },

  // Trigger Channel Sync
  async triggerChannelSync() {
    const modal = document.getElementById('syncModalOverlay');
    const logBox = document.getElementById('syncLogBox');

    if (modal) modal.classList.add('open');
    if (logBox) logBox.innerHTML = '<div class="log-line">بدء الاتصال بخادم القناة @RadioNeonAi...</div>';

    try {
      const res = await API.syncYouTube(false);
      if (logBox) {
        logBox.innerHTML += `<div class="log-line">تمت المزامنة بنجاح! تم العثور على ${res.count || 15} مقطوعة.</div>`;
      }
      this.showToast('تمت مزامنة القناة بنجاح! 🔄');
      await AppState.loadTracks();
    } catch (err) {
      if (logBox) {
        logBox.innerHTML += `<div class="log-line text-danger">خطأ: ${err.message}</div>`;
      }
      this.showToast('تعذر إكمال المزامنة', 'error');
    }
  },

  // Toast Notifications
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="${type === 'error' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check'}" style="color:${type === 'error' ? '#FF2E93' : '#00F5A0'};"></i>
      <span>${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  },

  // Language Localization (AR / EN)
  toggleLanguage() {
    this.currentLang = this.currentLang === 'ar' ? 'en' : 'ar';
    document.documentElement.lang = this.currentLang;
    document.documentElement.dir = this.currentLang === 'ar' ? 'rtl' : 'ltr';

    const langLabel = document.getElementById('currentLangLabel');
    if (langLabel) langLabel.textContent = this.currentLang === 'ar' ? 'EN' : 'عربي';

    this.applyTranslations();
  },

  applyTranslations() {
    const dict = this.translations[this.currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    const searchInput = document.getElementById('trackSearchInput');
    if (searchInput) {
      searchInput.placeholder = this.currentLang === 'ar' 
        ? "ابحث عن أغنية، اسم، أو تصنيف..." 
        : "Search songs, titles, or tags...";
    }
  },

  getTranslation(key) {
    return (this.translations[this.currentLang] && this.translations[this.currentLang][key]) || key;
  },

  // Keyboard Shortcuts
  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        AudioPlayer.togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        AudioPlayer.audio.currentTime = Math.min(AudioPlayer.audio.duration, AudioPlayer.audio.currentTime + 5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        AudioPlayer.audio.currentTime = Math.max(0, AudioPlayer.audio.currentTime - 5);
      } else if (e.key.toLowerCase() === 'm') {
        AudioPlayer.toggleMute();
      } else if (e.key.toLowerCase() === 'l') {
        if (AudioPlayer.currentTrack) UI.toggleTrackLike(AudioPlayer.currentTrack.id);
      } else if (e.code === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
        const fs = document.getElementById('fullscreenModal');
        if (fs) fs.classList.remove('open');
        const qd = document.getElementById('queueDrawer');
        if (qd) qd.classList.remove('open');
      }
    });
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
