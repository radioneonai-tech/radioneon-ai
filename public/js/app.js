/**
 * Radio Neon - Main Application Bootstrap
 * State Management and Lifecycle Coordinator
 */

const AppState = {
  tracks: [],
  filteredTracks: [],
  isLoading: true,

  async init() {
    console.log('📻 Radio Neon Web Application Initializing...');

    // Initialize Modules
    UI.init();
    Auth.init();
    AudioPlayer.init();
    RadioStream.init();
    Playlists.init();

    // Load Initial Tracks Catalog
    await this.loadTracks();

    // Handle Hash Route
    this.handleInitialRoute();
  },

  async loadTracks() {
    this.isLoading = true;
    try {
      const data = await API.getTracks();
      if (data && data.tracks) {
        this.tracks = data.tracks;
        this.filteredTracks = data.tracks;

        // Populate Hero Featured Section
        if (this.tracks.length > 0) {
          const featured = this.tracks[0];
          const heroTitle = document.getElementById('heroTrackTitle');
          const heroCover = document.getElementById('heroCoverImg');
          const heroLikeCount = document.getElementById('heroLikeCount');

          if (heroTitle) heroTitle.textContent = featured.title || `${featured.titleAr} - ${featured.titleEn}`;
          if (heroCover) heroCover.src = featured.thumbnailUrl || 'assets/PNG-LOGO.png';
          if (heroLikeCount) heroLikeCount.textContent = featured.likesCount || 14;
        }

        // Render Track Cards
        UI.renderTracks(this.tracks);
      }
    } catch (err) {
      console.error('Failed to load tracks:', err);
      const container = document.getElementById('tracksContainer');
      if (container) {
        container.innerHTML = `
          <div class="empty-state-wrapper">
            <p class="text-danger">تعذر تحميل المقطوعات الموسيقية، يرجى المحاولة لاحقاً</p>
          </div>
        `;
      }
    } finally {
      this.isLoading = false;
    }
  },

  handleInitialRoute() {
    const hash = window.location.hash;
    if (!hash) return;

    if (hash === '#live') {
      UI.switchTab('tab-live');
    } else if (hash === '#playlists') {
      UI.switchTab('tab-playlists');
    } else if (hash.startsWith('#track-')) {
      const trackId = hash.replace('#track-', '');
      const track = this.tracks.find(t => t.id === trackId || t.videoId === trackId);
      if (track) {
        AudioPlayer.playTrack(track, this.tracks);
      }
    }
  }
};

// Start application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  AppState.init();
});
