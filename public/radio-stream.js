/**
 * Radio Neon - Live Radio Stream Controller
 * 24/7 Smart Loop Engine, Dynamic Listener Simulation, Live Chat, and Floating Reactions
 */

const RadioStream = {
  currentLiveTrack: null,
  elapsedSeconds: 0,
  pollTimer: null,
  progressTimer: null,
  chatTimer: null,

  init() {
    this.bindEvents();
    this.fetchLiveStatus();
    this.startStatusPolling();
    this.fetchLiveChat();
    this.startChatPolling();
  },

  bindEvents() {
    // Live Play / Pause Toggle Button
    const btnLiveTogglePlay = document.getElementById('btnLiveTogglePlay');
    if (btnLiveTogglePlay) {
      btnLiveTogglePlay.addEventListener('click', () => this.toggleLiveStream());
    }

    // Live Like Button
    const btnLiveLike = document.getElementById('btnLiveLike');
    if (btnLiveLike) {
      btnLiveLike.addEventListener('click', () => {
        if (this.currentLiveTrack) {
          UI.toggleTrackLike(this.currentLiveTrack.id);
        }
      });
    }

    // Live Share Button
    const btnLiveShare = document.getElementById('btnLiveShare');
    if (btnLiveShare) {
      btnLiveShare.addEventListener('click', () => {
        UI.openShareModal(this.currentLiveTrack || {
          title: 'Radio Neon AI 24/7 Live Stream - البث المباشر',
          id: 'live'
        });
      });
    }

    // Emoji Reactions
    document.querySelectorAll('.reaction-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const emoji = btn.getAttribute('data-emoji');
        this.triggerFloatingReaction(emoji, e.clientX, e.clientY);
      });
    });

    // Live Chat Submission Form
    const liveChatForm = document.getElementById('liveChatForm');
    if (liveChatForm) {
      liveChatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitChatMessage();
      });
    }
  },

  async fetchLiveStatus() {
    try {
      const data = await API.getLiveStatus();
      if (!data || !data.currentTrack) return;

      this.currentLiveTrack = data.currentTrack;
      this.elapsedSeconds = data.elapsed || 0;

      // Update Live UI
      this.updateLiveUI(data);

      // If user is currently playing the live radio, keep timeline synced
      if (AudioPlayer.isLiveRadioMode && AudioPlayer.currentTrack && AudioPlayer.currentTrack.id === data.currentTrack.id) {
        // Sync position if drifting more than 4 seconds
        if (Math.abs(AudioPlayer.audio.currentTime - this.elapsedSeconds) > 4) {
          AudioPlayer.audio.currentTime = this.elapsedSeconds;
        }
      }
    } catch (err) {
      console.warn('Live status fetch warning:', err);
    }
  },

  startStatusPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.fetchLiveStatus(), 8000);

    // Local 1-second interval for smooth progress bar update
    if (this.progressTimer) clearInterval(this.progressTimer);
    this.progressTimer = setInterval(() => {
      if (this.currentLiveTrack) {
        this.elapsedSeconds++;
        const total = this.currentLiveTrack.duration || 200;
        if (this.elapsedSeconds >= total) {
          this.fetchLiveStatus();
        } else {
          this.updateLiveProgressBar(this.elapsedSeconds, total);
        }
      }
    }, 1000);
  },

  updateLiveUI(data) {
    const track = data.currentTrack;
    const title = track.title || `${track.titleAr || ''} - ${track.titleEn || ''}`;

    const liveCurrentTitle = document.getElementById('liveCurrentTitle');
    const liveTrackCover = document.getElementById('liveTrackCover');
    const liveListenerCount = document.getElementById('liveListenerCount');
    const liveLikeCount = document.getElementById('liveLikeCount');
    const liveLikeIcon = document.getElementById('liveLikeIcon');

    if (liveCurrentTitle) liveCurrentTitle.textContent = title;
    if (liveTrackCover) liveTrackCover.src = track.thumbnailUrl || 'assets/PNG-LOGO.png';
    if (liveListenerCount) liveListenerCount.textContent = Number(data.listenerCount || 1480).toLocaleString();
    if (liveLikeCount) liveLikeCount.textContent = track.likesCount || 24;
    if (liveLikeIcon) {
      liveLikeIcon.className = track.isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
      liveLikeIcon.parentElement.classList.toggle('liked', !!track.isLiked);
    }

    this.updateLiveProgressBar(data.elapsed || 0, track.duration || 200);
    this.renderUpNextList(data.nextTracks || []);
  },

  updateLiveProgressBar(elapsed, total) {
    const liveElapsed = document.getElementById('liveElapsed');
    const liveTotal = document.getElementById('liveTotal');
    const liveProgressFill = document.getElementById('liveProgressFill');

    if (liveElapsed) liveElapsed.textContent = AudioPlayer.formatTime(elapsed);
    if (liveTotal) liveTotal.textContent = AudioPlayer.formatTime(total);
    if (liveProgressFill) {
      const percent = Math.min(100, (elapsed / total) * 100);
      liveProgressFill.style.width = `${percent}%`;
    }
  },

  renderUpNextList(tracks) {
    const upNextList = document.getElementById('upNextList');
    if (!upNextList) return;

    if (tracks.length === 0) {
      upNextList.innerHTML = '<p class="text-muted text-center p-2">جاري تجهيز المقطوعات التالية...</p>';
      return;
    }

    upNextList.innerHTML = tracks.map(t => `
      <div class="up-next-item">
        <img src="${t.thumbnailUrl || 'assets/PNG-LOGO.png'}" alt="Cover" class="up-next-thumb">
        <div class="up-next-text">
          <h4 class="up-next-title">${t.title || (t.titleAr + ' - ' + t.titleEn)}</h4>
          <span class="up-next-duration">${t.durationString || AudioPlayer.formatTime(t.duration)}</span>
        </div>
        <span class="badge-live-tag" style="background:rgba(138,5,255,0.4);font-size:0.65rem;">قادم</span>
      </div>
    `).join('');
  },

  // Toggle Live Broadcast Playback
  toggleLiveStream() {
    if (!this.currentLiveTrack) return;

    const livePlayIcon = document.getElementById('livePlayIcon');

    if (AudioPlayer.isLiveRadioMode && AudioPlayer.isPlaying) {
      AudioPlayer.audio.pause();
      if (livePlayIcon) livePlayIcon.className = 'fa-solid fa-play';
    } else {
      AudioPlayer.isLiveRadioMode = true;
      AudioPlayer.playTrack(this.currentLiveTrack, AppState.tracks, -1, this.elapsedSeconds);
      if (livePlayIcon) livePlayIcon.className = 'fa-solid fa-pause';
      UI.showToast('أنت تستمع الآن للبث المباشر 24/7 🔴');
    }
  },

  // Floating Emoji Reaction Animation
  triggerFloatingReaction(emoji, startX = null, startY = null) {
    const reaction = document.createElement('div');
    reaction.className = 'floating-reaction';
    reaction.textContent = emoji;

    // Position near click or center screen
    const x = startX !== null ? startX : (window.innerWidth / 2) + (Math.random() * 100 - 50);
    const y = startY !== null ? startY : (window.innerHeight * 0.7);

    reaction.style.left = `${x}px`;
    reaction.style.top = `${y}px`;

    document.body.appendChild(reaction);

    setTimeout(() => {
      if (reaction.parentElement) reaction.remove();
    }, 2400);
  },

  // Live Community Chat
  async fetchLiveChat() {
    try {
      const data = await API.getLiveChat();
      if (data && data.messages) {
        this.renderChatMessages(data.messages);
      }
    } catch (err) {
      console.warn('Chat fetch note:', err);
    }
  },

  startChatPolling() {
    if (this.chatTimer) clearInterval(this.chatTimer);
    this.chatTimer = setInterval(() => this.fetchLiveChat(), 6000);
  },

  renderChatMessages(messages) {
    const liveChatBox = document.getElementById('liveChatBox');
    if (!liveChatBox) return;

    if (messages.length === 0) {
      liveChatBox.innerHTML = '<p class="text-muted text-center p-3" style="font-size:0.82rem;">كن أول من يكتب في شات البث المباشر!</p>';
      return;
    }

    liveChatBox.innerHTML = messages.map(m => `
      <div class="chat-message">
        <img src="${m.userAvatar || 'assets/PNG-LOGO.png'}" alt="Avatar" class="chat-avatar">
        <div class="chat-content-wrap">
          <div class="chat-user-name">${UI.escapeHtml(m.userName)}</div>
          <div class="chat-text">${UI.escapeHtml(m.content)}</div>
        </div>
      </div>
    `).join('');

    liveChatBox.scrollTop = liveChatBox.scrollHeight;
  },

  async submitChatMessage() {
    const input = document.getElementById('liveChatInput');
    if (!input || !input.value.trim()) return;

    const content = input.value.trim();
    input.value = '';

    try {
      await API.sendLiveChatMessage(content);
      await this.fetchLiveChat();
    } catch (err) {
      UI.showToast(err.message || 'تعذر إرسال الرسالة', 'error');
    }
  }
};
