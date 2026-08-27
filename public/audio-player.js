/**
 * Radio Neon - Core Audio Player Engine
 * HTML5 Audio, Web Audio API Analyzer, Media Session API for background play
 */

const AudioPlayer = {
  audio: null,
  audioCtx: null,
  analyser: null,
  audioSource: null,
  isAudioCtxInit: false,

  // Playback State
  queue: [],
  currentIndex: -1,
  currentTrack: null,
  isPlaying: false,
  isLiveRadioMode: false,
  isShuffle: false,
  repeatMode: 'off', // 'off' | 'one' | 'all'
  volume: 0.85,
  isMuted: false,
  visualizerMode: 'bars', // 'bars' | 'waves' | 'circle'

  // Visualizer Animation Handles
  animFrameId: null,
  fsAnimFrameId: null,

  init() {
    this.audio = document.getElementById('globalAudioPlayer');
    if (!this.audio) return;

    // Restore volume from localStorage
    const savedVol = localStorage.getItem('radio_neon_volume');
    if (savedVol !== null) {
      this.volume = parseFloat(savedVol);
    }
    this.audio.volume = this.volume;

    // Restore repeat / shuffle settings
    this.isShuffle = localStorage.getItem('radio_neon_shuffle') === 'true';
    this.repeatMode = localStorage.getItem('radio_neon_repeat') || 'off';

    this.bindAudioEvents();
    this.bindUIEvents();
    this.updateControlsUI();
    this.startVisualizer();
  },

  // Setup Web Audio API Analyzer Node
  initAudioContext() {
    if (this.isAudioCtxInit) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioCtx = new AudioContextClass();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.audioSource = this.audioCtx.createMediaElementSource(this.audio);
      this.audioSource.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);

      this.isAudioCtxInit = true;
    } catch (e) {
      console.warn('Web Audio API context init fallback:', e);
    }
  },

  bindAudioEvents() {
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.updatePlayStateUI();
      this.updateMediaSessionState('playing');
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updatePlayStateUI();
      this.updateMediaSessionState('paused');
    });

    this.audio.addEventListener('timeupdate', () => {
      this.updateProgressUI();
    });

    this.audio.addEventListener('progress', () => {
      this.updateBufferUI();
    });

    this.audio.addEventListener('ended', () => {
      this.handleTrackEnded();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Audio playback error:', e);
      UI.showToast('تعذر تشغيل المقطع، جاري التحضير أو الانتقال للتالي...', 'error');
      // Auto skip to next after brief pause
      setTimeout(() => {
        if (this.queue.length > 1) this.next();
      }, 2000);
    });
  },

  bindUIEvents() {
    // Mini Player Main Play/Pause
    const btnPlayPause = document.getElementById('btnPlayPause');
    if (btnPlayPause) {
      btnPlayPause.addEventListener('click', () => this.togglePlay());
    }

    // Prev / Next
    const btnPrev = document.getElementById('btnPrev');
    if (btnPrev) btnPrev.addEventListener('click', () => this.prev());

    const btnNext = document.getElementById('btnNext');
    if (btnNext) btnNext.addEventListener('click', () => this.next());

    // Shuffle & Repeat
    const btnShuffle = document.getElementById('btnShuffle');
    if (btnShuffle) {
      btnShuffle.addEventListener('click', () => this.toggleShuffle());
    }

    const btnRepeat = document.getElementById('btnRepeat');
    if (btnRepeat) {
      btnRepeat.addEventListener('click', () => this.toggleRepeat());
    }

    // Progress Bar Slider (Scrubbing)
    const progressSlider = document.getElementById('progressSlider');
    if (progressSlider) {
      progressSlider.addEventListener('input', (e) => {
        if (this.audio.duration) {
          const seekTime = (e.target.value / 100) * this.audio.duration;
          this.audio.currentTime = seekTime;
        }
      });
    }

    // Fullscreen Progress Slider
    const fsProgressSlider = document.getElementById('fsProgressSlider');
    if (fsProgressSlider) {
      fsProgressSlider.addEventListener('input', (e) => {
        if (this.audio.duration) {
          const seekTime = (e.target.value / 100) * this.audio.duration;
          this.audio.currentTime = seekTime;
        }
      });
    }

    // Volume Slider & Mute Toggle
    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) {
      volumeSlider.value = this.volume;
      volumeSlider.addEventListener('input', (e) => {
        this.setVolume(parseFloat(e.target.value));
      });
    }

    const btnVolumeToggle = document.getElementById('btnVolumeToggle');
    if (btnVolumeToggle) {
      btnVolumeToggle.addEventListener('click', () => this.toggleMute());
    }

    // Fullscreen Play/Pause & Controls
    const btnFsPlayPause = document.getElementById('btnFsPlayPause');
    if (btnFsPlayPause) btnFsPlayPause.addEventListener('click', () => this.togglePlay());

    const btnFsPrev = document.getElementById('btnFsPrev');
    if (btnFsPrev) btnFsPrev.addEventListener('click', () => this.prev());

    const btnFsNext = document.getElementById('btnFsNext');
    if (btnFsNext) btnFsNext.addEventListener('click', () => this.next());

    const btnFsShuffle = document.getElementById('btnFsShuffle');
    if (btnFsShuffle) btnFsShuffle.addEventListener('click', () => this.toggleShuffle());

    const btnFsRepeat = document.getElementById('btnFsRepeat');
    if (btnFsRepeat) btnFsRepeat.addEventListener('click', () => this.toggleRepeat());

    // Mini player like button
    const playerBtnLike = document.getElementById('playerBtnLike');
    if (playerBtnLike) {
      playerBtnLike.addEventListener('click', () => {
        if (this.currentTrack) {
          UI.toggleTrackLike(this.currentTrack.id);
        }
      });
    }
  },

  // Play a specific track
  async playTrack(track, queue = null, index = -1, startTime = 0) {
    if (!track) return;

    // Initialize AudioContext upon user action
    this.initAudioContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    if (queue) {
      this.queue = [...queue];
      this.currentIndex = index >= 0 ? index : this.queue.findIndex(t => t.id === track.id);
    } else if (this.queue.length === 0) {
      this.queue = [track];
      this.currentIndex = 0;
    }

    this.currentTrack = track;
    this.isLiveRadioMode = false;

    // Set Audio Source
    const audioUrl = track.audioUrl || `/api/audio/${track.id}.mp3`;
    if (this.audio.src !== window.location.origin + audioUrl && this.audio.src !== audioUrl) {
      this.audio.src = audioUrl;
      this.audio.load();
    }

    if (startTime > 0) {
      this.audio.currentTime = startTime;
    }

    try {
      await this.audio.play();
      this.isPlaying = true;
    } catch (err) {
      console.warn('Playback initiation note:', err);
    }

    this.updateTrackInfoUI(track);
    this.updatePlayStateUI();
    this.setupMediaSession(track);
    this.renderQueueDrawer();
  },

  // Toggle Play / Pause
  togglePlay() {
    this.initAudioContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    if (!this.currentTrack) {
      // Pick first track in list if available
      const tracks = AppState.tracks;
      if (tracks && tracks.length > 0) {
        this.playTrack(tracks[0], tracks, 0);
      }
      return;
    }

    if (this.audio.paused) {
      this.audio.play();
    } else {
      this.audio.pause();
    }
  },

  // Next Track
  next() {
    if (this.queue.length === 0) return;

    if (this.isShuffle) {
      this.currentIndex = Math.floor(Math.random() * this.queue.length);
    } else {
      this.currentIndex = (this.currentIndex + 1) % this.queue.length;
    }

    this.playTrack(this.queue[this.currentIndex]);
  },

  // Previous Track
  prev() {
    if (this.queue.length === 0) return;

    // If played more than 3 seconds, replay current
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }

    this.currentIndex = (this.currentIndex - 1 + this.queue.length) % this.queue.length;
    this.playTrack(this.queue[this.currentIndex]);
  },

  // Handle Track End (Loop / Next)
  handleTrackEnded() {
    if (this.repeatMode === 'one') {
      this.audio.currentTime = 0;
      this.audio.play();
    } else if (this.repeatMode === 'all' || this.isLiveRadioMode) {
      this.next();
    } else if (this.currentIndex < this.queue.length - 1) {
      this.next();
    } else {
      this.isPlaying = false;
      this.updatePlayStateUI();
    }
  },

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    localStorage.setItem('radio_neon_shuffle', this.isShuffle);
    this.updateControlsUI();
    UI.showToast(this.isShuffle ? 'تم تفعيل التشغيل العشوائي' : 'تم إيقاف التشغيل العشوائي');
  },

  toggleRepeat() {
    if (this.repeatMode === 'off') {
      this.repeatMode = 'all';
      UI.showToast('تم تفعيل تكرار الكل');
    } else if (this.repeatMode === 'all') {
      this.repeatMode = 'one';
      UI.showToast('تم تفعيل تكرار المقطع الحالي');
    } else {
      this.repeatMode = 'off';
      UI.showToast('تم إيقاف التكرار');
    }
    localStorage.setItem('radio_neon_repeat', this.repeatMode);
    this.updateControlsUI();
  },

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    this.audio.volume = this.volume;
    this.isMuted = this.volume === 0;
    localStorage.setItem('radio_neon_volume', this.volume);
    this.updateVolumeUI();
  },

  toggleMute() {
    if (this.isMuted) {
      this.setVolume(this.volume > 0 ? this.volume : 0.85);
      this.isMuted = false;
    } else {
      this.audio.volume = 0;
      this.isMuted = true;
    }
    this.updateVolumeUI();
  },

  // Media Session API for Lock Screen & Background playback
  setupMediaSession(track) {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || `${track.titleAr || ''} - ${track.titleEn || ''}`,
      artist: 'Radio Neon AI',
      album: 'Radio Neon Official',
      artwork: [
        { src: track.thumbnailUrl || 'assets/PNG-LOGO.png', sizes: '96x96', type: 'image/png' },
        { src: track.thumbnailUrl || 'assets/PNG-LOGO.png', sizes: '128x128', type: 'image/png' },
        { src: track.thumbnailUrl || 'assets/PNG-LOGO.png', sizes: '256x256', type: 'image/png' },
        { src: track.thumbnailUrl || 'assets/PNG-LOGO.png', sizes: '512x512', type: 'image/png' }
      ]
    });

    navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
    navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
    navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime) this.audio.currentTime = details.seekTime;
    });
  },

  updateMediaSessionState(state) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = state;
    }
  },

  // Update UI Elements with Track Info
  updateTrackInfoUI(track) {
    const title = track.title || `${track.titleAr || ''} - ${track.titleEn || ''}`;
    
    // Mini Player Info
    const playerTitle = document.getElementById('playerTitle');
    const playerArtist = document.getElementById('playerArtist');
    const playerThumb = document.getElementById('playerThumb');
    const playerLikeIcon = document.getElementById('playerLikeIcon');

    if (playerTitle) playerTitle.textContent = title;
    if (playerArtist) playerArtist.textContent = 'Radio Neon AI';
    if (playerThumb) playerThumb.src = track.thumbnailUrl || 'assets/PNG-LOGO.png';
    if (playerLikeIcon) {
      playerLikeIcon.className = track.isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
      playerLikeIcon.parentElement.classList.toggle('liked', !!track.isLiked);
    }

    // Fullscreen Player Info
    const fsTrackTitle = document.getElementById('fsTrackTitle');
    const fsTrackArtist = document.getElementById('fsTrackArtist');
    const fsArtImg = document.getElementById('fsArtImg');
    const fsTrackTags = document.getElementById('fsTrackTags');

    if (fsTrackTitle) fsTrackTitle.textContent = title;
    if (fsTrackArtist) fsTrackArtist.textContent = 'Radio Neon AI';
    if (fsArtImg) fsArtImg.src = track.thumbnailUrl || 'assets/PNG-LOGO.png';
    if (fsTrackTags) {
      fsTrackTags.innerHTML = (track.tags || ['Radio Neon', 'AI Music'])
        .map(t => `<span class="tag-badge">${t}</span>`).join('');
    }

    // Active Card in Grid
    document.querySelectorAll('.track-card').forEach(card => {
      const cardId = card.getAttribute('data-id');
      card.classList.toggle('is-playing', cardId === track.id || cardId === track.videoId);
    });
  },

  updatePlayStateUI() {
    const mainPlayIcon = document.getElementById('mainPlayIcon');
    const fsMainPlayIcon = document.getElementById('fsMainPlayIcon');
    const heroVinyl = document.getElementById('heroVinyl');

    if (mainPlayIcon) {
      mainPlayIcon.className = this.isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
    }
    if (fsMainPlayIcon) {
      fsMainPlayIcon.className = this.isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
    }
    if (heroVinyl) {
      heroVinyl.classList.toggle('playing', this.isPlaying);
    }

    // Update active track card play button
    document.querySelectorAll('.track-card').forEach(card => {
      const cardId = card.getAttribute('data-id');
      const isThisTrack = this.currentTrack && (cardId === this.currentTrack.id || cardId === this.currentTrack.videoId);
      const icon = card.querySelector('.card-play-btn i');
      if (icon) {
        icon.className = (isThisTrack && this.isPlaying) ? 'fa-solid fa-pause' : 'fa-solid fa-play';
      }
    });
  },

  updateProgressUI() {
    const curTime = this.audio.currentTime || 0;
    const duration = this.audio.duration || (this.currentTrack ? this.currentTrack.duration : 0) || 1;
    const percent = Math.min(100, (curTime / duration) * 100);

    // Mini player
    const currentTimeLabel = document.getElementById('currentTimeLabel');
    const totalDurationLabel = document.getElementById('totalDurationLabel');
    const progressFillBar = document.getElementById('progressFillBar');
    const progressSlider = document.getElementById('progressSlider');

    if (currentTimeLabel) currentTimeLabel.textContent = this.formatTime(curTime);
    if (totalDurationLabel) totalDurationLabel.textContent = this.formatTime(duration);
    if (progressFillBar) progressFillBar.style.width = `${percent}%`;
    if (progressSlider) progressSlider.value = percent;

    // Fullscreen player
    const fsCurrentTime = document.getElementById('fsCurrentTime');
    const fsTotalDuration = document.getElementById('fsTotalDuration');
    const fsProgressFill = document.getElementById('fsProgressFill');
    const fsProgressSlider = document.getElementById('fsProgressSlider');

    if (fsCurrentTime) fsCurrentTime.textContent = this.formatTime(curTime);
    if (fsTotalDuration) fsTotalDuration.textContent = this.formatTime(duration);
    if (fsProgressFill) fsProgressFill.style.width = `${percent}%`;
    if (fsProgressSlider) fsProgressSlider.value = percent;
  },

  updateBufferUI() {
    if (this.audio.buffered.length > 0 && this.audio.duration) {
      const bufferedEnd = this.audio.buffered.end(this.audio.buffered.length - 1);
      const percent = (bufferedEnd / this.audio.duration) * 100;
      const progressBufferBar = document.getElementById('progressBufferBar');
      if (progressBufferBar) progressBufferBar.style.width = `${percent}%`;
    }
  },

  updateControlsUI() {
    const btnShuffle = document.getElementById('btnShuffle');
    const btnRepeat = document.getElementById('btnRepeat');
    const btnFsShuffle = document.getElementById('btnFsShuffle');
    const btnFsRepeat = document.getElementById('btnFsRepeat');

    if (btnShuffle) btnShuffle.classList.toggle('active', this.isShuffle);
    if (btnFsShuffle) btnFsShuffle.classList.toggle('active', this.isShuffle);

    const repeatIcons = { off: 'fa-solid fa-repeat', all: 'fa-solid fa-repeat', one: 'fa-solid fa-arrow-rotate-right' };
    if (btnRepeat) {
      btnRepeat.classList.toggle('active', this.repeatMode !== 'off');
      btnRepeat.innerHTML = `<i class="${repeatIcons[this.repeatMode]}"></i>`;
    }
    if (btnFsRepeat) {
      btnFsRepeat.classList.toggle('active', this.repeatMode !== 'off');
      btnFsRepeat.innerHTML = `<i class="${repeatIcons[this.repeatMode]}"></i>`;
    }
  },

  updateVolumeUI() {
    const volumeIcon = document.getElementById('volumeIcon');
    const volumeSlider = document.getElementById('volumeSlider');

    if (volumeSlider) volumeSlider.value = this.isMuted ? 0 : this.volume;

    if (volumeIcon) {
      if (this.isMuted || this.volume === 0) {
        volumeIcon.className = 'fa-solid fa-volume-xmark';
      } else if (this.volume < 0.5) {
        volumeIcon.className = 'fa-solid fa-volume-low';
      } else {
        volumeIcon.className = 'fa-solid fa-volume-high';
      }
    }
  },

  renderQueueDrawer() {
    const queueListContainer = document.getElementById('queueListContainer');
    if (!queueListContainer) return;

    if (this.queue.length === 0) {
      queueListContainer.innerHTML = '<p class="text-muted text-center p-3">القائمة فارغة</p>';
      return;
    }

    queueListContainer.innerHTML = this.queue.map((t, idx) => `
      <div class="up-next-item ${idx === this.currentIndex ? 'active' : ''}" onclick="AudioPlayer.playTrack(AudioPlayer.queue[${idx}], null, ${idx})">
        <img src="${t.thumbnailUrl || 'assets/PNG-LOGO.png'}" alt="Cover" class="up-next-thumb">
        <div class="up-next-text">
          <h4 class="up-next-title">${t.title || (t.titleAr + ' - ' + t.titleEn)}</h4>
          <span class="up-next-duration">${t.durationString || '3:30'}</span>
        </div>
        ${idx === this.currentIndex ? '<i class="fa-solid fa-volume-high" style="color:var(--color-mint-green);"></i>' : ''}
      </div>
    `).join('');
  },

  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  },

  // Dynamic Neon Canvas Spectrum Visualizer
  startVisualizer() {
    const liveCanvas = document.getElementById('liveVisualizerCanvas');
    const fsCanvas = document.getElementById('fsVisualizerCanvas');
    if (!liveCanvas) return;

    const liveCtx = liveCanvas.getContext('2d');
    const fsCtx = fsCanvas ? fsCanvas.getContext('2d') : null;

    const bufferLength = this.analyser ? this.analyser.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    let phase = 0;

    const render = () => {
      this.animFrameId = requestAnimationFrame(render);

      if (this.analyser && this.isPlaying) {
        this.analyser.getByteFrequencyData(dataArray);
      } else {
        // Simulated glowing wave when idle or fallback
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = this.isPlaying 
            ? Math.abs(Math.sin(phase + i * 0.2)) * 140 + 40
            : Math.abs(Math.sin(phase + i * 0.1)) * 25 + 5;
        }
        phase += 0.04;
      }

      this.drawCanvas(liveCtx, liveCanvas.width, liveCanvas.height, dataArray, bufferLength);
      if (fsCtx && fsCanvas) {
        this.drawCanvas(fsCtx, fsCanvas.width, fsCanvas.height, dataArray, bufferLength);
      }
    };

    render();
  },

  drawCanvas(ctx, width, height, dataArray, bufferLength) {
    ctx.clearRect(0, 0, width, height);

    const barWidth = (width / bufferLength) * 2.2;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * height * 0.85;

      // Dynamic Neon Gradient
      const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
      gradient.addColorStop(0, '#8A05FF');
      gradient.addColorStop(0.5, '#60A5FA');
      gradient.addColorStop(1, '#00F5A0');

      ctx.fillStyle = gradient;
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(138, 5, 255, 0.6)';

      ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);

      // Mirror wave at top for neon depth
      ctx.fillStyle = 'rgba(255, 46, 147, 0.15)';
      ctx.fillRect(x, 0, barWidth - 2, barHeight * 0.3);

      x += barWidth;
    }
  }
};
