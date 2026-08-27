/**
 * Radio Neon - Custom Playlists Controller
 * Full CRUD Operations, Add/Remove Tracks, Playlists Manager
 */

const Playlists = {
  playlists: [],
  activePlaylist: null,
  pendingTrackIdToAdd: null,

  init() {
    this.bindEvents();
    this.loadPlaylists();
  },

  bindEvents() {
    // Open Create Playlist Modal
    const btnOpenCreate = document.getElementById('btnOpenCreatePlaylist');
    if (btnOpenCreate) {
      btnOpenCreate.addEventListener('click', () => this.openCreateModal());
    }

    const btnCloseCreate = document.getElementById('btnCloseCreatePlaylist');
    if (btnCloseCreate) {
      btnCloseCreate.addEventListener('click', () => this.closeCreateModal());
    }

    const btnCancelCreate = document.getElementById('btnCancelCreatePlaylist');
    if (btnCancelCreate) {
      btnCancelCreate.addEventListener('click', () => this.closeCreateModal());
    }

    // Color dots selector
    document.querySelectorAll('#colorPickerRow .color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        document.querySelectorAll('#colorPickerRow .color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
      });
    });

    // Form Submission
    const form = document.getElementById('createPlaylistForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitCreatePlaylist();
      });
    }

    // Back to Playlists Button
    const btnBack = document.getElementById('btnBackToPlaylists');
    if (btnBack) {
      btnBack.addEventListener('click', () => this.showPlaylistsGrid());
    }

    // Play All Playlist Tracks
    const btnPlayAll = document.getElementById('btnPlayAllPlaylist');
    if (btnPlayAll) {
      btnPlayAll.addEventListener('click', () => this.playActivePlaylist());
    }

    // Delete Current Playlist
    const btnDelete = document.getElementById('btnDeleteCurrentPlaylist');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => this.deleteActivePlaylist());
    }

    // Close Add to Playlist Modal
    const btnCloseAdd = document.getElementById('btnCloseAddToPlaylist');
    if (btnCloseAdd) {
      btnCloseAdd.addEventListener('click', () => this.closeAddToPlaylistModal());
    }
  },

  async loadPlaylists() {
    try {
      const data = await API.getPlaylists();
      if (data && data.playlists) {
        this.playlists = data.playlists;
        this.renderPlaylistsGrid();
      }
    } catch (err) {
      console.warn('Playlists loading notice:', err);
    }
  },

  renderPlaylistsGrid() {
    const container = document.getElementById('playlistsContainer');
    if (!container) return;

    if (this.playlists.length === 0) {
      container.innerHTML = `
        <div class="empty-state-wrapper">
          <i class="fa-solid fa-compact-disc" style="font-size:3.5rem;color:var(--color-neon-purple);margin-bottom:14px;"></i>
          <h3>لا توجد قوائم تشغيل حتى الآن</h3>
          <p>قم بإنشاء قائمتك الأولى واجمع مقطوعاتك المفضلة في مكان واحد!</p>
          <button class="btn btn-primary btn-sm mt-3" onclick="Playlists.openCreateModal()" style="margin-top:14px;">
            <i class="fa-solid fa-plus"></i> إنشاء قائمة الآن
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = this.playlists.map(pl => {
      const color = pl.color || '#8A05FF';
      return `
        <div class="playlist-card" onclick="Playlists.viewPlaylist('${pl.id}')">
          <div class="playlist-cover-art" style="background:linear-gradient(135deg, ${color}, #1B064A);">
            <i class="fa-solid fa-music"></i>
          </div>
          <div class="playlist-card-info">
            <h3 class="playlist-name">${UI.escapeHtml(pl.name)}</h3>
            <span class="playlist-count">${pl.trackCount || (pl.tracks ? pl.tracks.length : 0)} مقاطع • ${AudioPlayer.formatTime(pl.totalDuration || 0)}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  openCreateModal() {
    const overlay = document.getElementById('createPlaylistModalOverlay');
    if (overlay) overlay.classList.add('open');
  },

  closeCreateModal() {
    const overlay = document.getElementById('createPlaylistModalOverlay');
    if (overlay) overlay.classList.remove('open');
    const form = document.getElementById('createPlaylistForm');
    if (form) form.reset();
  },

  async submitCreatePlaylist() {
    const nameInput = document.getElementById('playlistNameInput');
    const descInput = document.getElementById('playlistDescInput');
    const activeDot = document.querySelector('#colorPickerRow .color-dot.active');

    if (!nameInput || !nameInput.value.trim()) return;

    const name = nameInput.value.trim();
    const description = descInput ? descInput.value.trim() : '';
    const color = activeDot ? activeDot.getAttribute('data-color') : '#8A05FF';

    try {
      await API.createPlaylist({ name, description, color });
      this.closeCreateModal();
      UI.showToast(`تم إنشاء قائمة "${name}" بنجاح! 🎉`);
      await this.loadPlaylists();
    } catch (err) {
      UI.showToast(err.message || 'تعذر إنشاء القائمة', 'error');
    }
  },

  async viewPlaylist(id) {
    try {
      const data = await API.getPlaylistById(id);
      if (!data || !data.playlist) return;

      this.activePlaylist = data.playlist;

      const grid = document.getElementById('playlistsContainer');
      const header = document.querySelector('.playlists-header');
      const panel = document.getElementById('playlistDetailPanel');

      if (grid) grid.style.display = 'none';
      if (header) header.style.display = 'none';
      if (panel) panel.style.display = 'block';

      // Update Panel Details
      const detailTitle = document.getElementById('detailTitle');
      const detailDesc = document.getElementById('detailDesc');
      const detailStats = document.getElementById('detailStats');
      const detailCoverBox = document.getElementById('detailCoverBox');

      if (detailTitle) detailTitle.textContent = this.activePlaylist.name;
      if (detailDesc) detailDesc.textContent = this.activePlaylist.description || 'قائمة تشغيل خاصة في راديو نيون';
      if (detailStats) {
        const count = this.activePlaylist.tracks ? this.activePlaylist.tracks.length : 0;
        const totalDur = (this.activePlaylist.tracks || []).reduce((sum, t) => sum + (t.duration || 0), 0);
        detailStats.textContent = `${count} مقاطع • ${AudioPlayer.formatTime(totalDur)} دقيقة`;
      }
      if (detailCoverBox) {
        detailCoverBox.style.background = `linear-gradient(135deg, ${this.activePlaylist.color || '#8A05FF'}, #1B064A)`;
      }

      this.renderPlaylistTrackRows();
    } catch (err) {
      UI.showToast('تعذر فتح القائمة', 'error');
    }
  },

  renderPlaylistTrackRows() {
    const list = document.getElementById('detailTracksList');
    if (!list || !this.activePlaylist) return;

    const tracks = this.activePlaylist.tracks || [];
    if (tracks.length === 0) {
      list.innerHTML = '<p class="text-muted text-center p-4">لا توجد مقطوعات في هذه القائمة بعد. أضف مقطوعات من تبويب "الأغاني الفردية"!</p>';
      return;
    }

    list.innerHTML = tracks.map((t, idx) => `
      <div class="detail-track-row">
        <span class="detail-row-num">${idx + 1}</span>
        <img src="${t.thumbnailUrl || 'assets/PNG-LOGO.png'}" alt="Cover" class="detail-row-thumb">
        <div class="detail-row-info">
          <h4 class="detail-row-title">${t.title || (t.titleAr + ' - ' + t.titleEn)}</h4>
          <span class="detail-row-artist">Radio Neon AI • ${t.durationString || AudioPlayer.formatTime(t.duration)}</span>
        </div>
        <button class="action-btn-sm" onclick="AudioPlayer.playTrack(Playlists.activePlaylist.tracks[${idx}], Playlists.activePlaylist.tracks, ${idx})" title="تشغيل">
          <i class="fa-solid fa-play"></i>
        </button>
        <button class="action-btn-sm" onclick="Playlists.removeTrackFromActive('${t.id}')" title="حذف من القائمة">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    `).join('');
  },

  showPlaylistsGrid() {
    const grid = document.getElementById('playlistsContainer');
    const header = document.querySelector('.playlists-header');
    const panel = document.getElementById('playlistDetailPanel');

    if (grid) grid.style.display = 'grid';
    if (header) header.style.display = 'flex';
    if (panel) panel.style.display = 'none';
    this.activePlaylist = null;
  },

  playActivePlaylist() {
    if (!this.activePlaylist || !this.activePlaylist.tracks || this.activePlaylist.tracks.length === 0) {
      UI.showToast('القائمة فارغة، أضف مقاطع أولاً!', 'error');
      return;
    }

    AudioPlayer.playTrack(this.activePlaylist.tracks[0], this.activePlaylist.tracks, 0);
    UI.showToast(`جاري تشغيل قائمة "${this.activePlaylist.name}" 🎵`);
  },

  async deleteActivePlaylist() {
    if (!this.activePlaylist) return;

    if (!confirm(`هل أنت متأكد من رغبتك في حذف قائمة "${this.activePlaylist.name}"؟`)) {
      return;
    }

    try {
      await API.deletePlaylist(this.activePlaylist.id);
      UI.showToast('تم حذف القائمة بنجاح');
      this.showPlaylistsGrid();
      await this.loadPlaylists();
    } catch (err) {
      UI.showToast('تعذر حذف القائمة', 'error');
    }
  },

  async removeTrackFromActive(trackId) {
    if (!this.activePlaylist) return;

    try {
      await API.removeTrackFromPlaylist(this.activePlaylist.id, trackId);
      this.activePlaylist.tracks = this.activePlaylist.tracks.filter(t => t.id !== trackId);
      this.renderPlaylistTrackRows();
      UI.showToast('تمت إزالة المقطع من القائمة');
      this.loadPlaylists();
    } catch (err) {
      UI.showToast('تعذر حذف المقطع', 'error');
    }
  },

  // Add to Playlist Picker Modal (invoked from track card)
  openAddToPlaylistPicker(trackId) {
    this.pendingTrackIdToAdd = trackId;
    const overlay = document.getElementById('addToPlaylistModalOverlay');
    const container = document.getElementById('addToPlaylistList');
    if (!overlay || !container) return;

    if (this.playlists.length === 0) {
      container.innerHTML = `
        <div class="p-3 text-center">
          <p class="text-muted mb-3">ليس لديك أي قوائم بعد.</p>
          <button class="btn btn-primary btn-sm" onclick="Playlists.closeAddToPlaylistModal(); Playlists.openCreateModal();">
            إنشاء قائمة جديدة
          </button>
        </div>
      `;
    } else {
      container.innerHTML = this.playlists.map(pl => `
        <div class="up-next-item" style="cursor:pointer;" onclick="Playlists.addPendingTrackTo('${pl.id}')">
          <div style="width:36px;height:36px;border-radius:6px;background:${pl.color || '#8A05FF'};display:flex;align-items:center;justify-content:center;color:#fff;">
            <i class="fa-solid fa-music"></i>
          </div>
          <div class="up-next-text">
            <h4 class="up-next-title">${UI.escapeHtml(pl.name)}</h4>
            <span class="up-next-duration">${pl.trackCount || 0} مقاطع</span>
          </div>
          <i class="fa-solid fa-plus text-muted"></i>
        </div>
      `).join('');
    }

    overlay.classList.add('open');
  },

  closeAddToPlaylistModal() {
    const overlay = document.getElementById('addToPlaylistModalOverlay');
    if (overlay) overlay.classList.remove('open');
    this.pendingTrackIdToAdd = null;
  },

  async addPendingTrackTo(playlistId) {
    if (!this.pendingTrackIdToAdd) return;

    try {
      await API.addTrackToPlaylist(playlistId, this.pendingTrackIdToAdd);
      UI.showToast('تمت إضافة الأغنية إلى القائمة بنجاح! ✨');
      this.closeAddToPlaylistModal();
      this.loadPlaylists();
    } catch (err) {
      UI.showToast('تعذر إضافة المقطع للقائمة', 'error');
    }
  }
};
