/**
 * Radio Neon - API Client Module
 * Communicates with the Express backend REST endpoints
 */

const API = {
  baseUrl: '',

  // Helper for fetch with Authorization header
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('radio_neon_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }
      return data;
    } catch (err) {
      console.warn(`API Request Error [${endpoint}]:`, err.message);
      throw err;
    }
  },

  // 1. Tracks API
  async getTracks(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.tag && params.tag !== 'all') query.append('tag', params.tag);
    if (params.sort) query.append('sort', params.sort);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/api/tracks${qs}`);
  },

  async getTrackById(id) {
    return this.request(`/api/tracks/${id}`);
  },

  async toggleLike(trackId) {
    const user = Auth.getUser();
    return this.request(`/api/tracks/${trackId}/like`, {
      method: 'POST',
      body: JSON.stringify({ userId: user ? user.id : 'usr_guest_demo' })
    });
  },

  async getComments(trackId) {
    return this.request(`/api/tracks/${trackId}/comments`);
  },

  async addComment(trackId, content) {
    const user = Auth.getUser();
    return this.request(`/api/tracks/${trackId}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        userId: user ? user.id : 'guest',
        userName: user ? user.name : 'مستمع نيون',
        userAvatar: user ? user.avatar : 'assets/PNG-LOGO.png'
      })
    });
  },

  // 2. YouTube Channel Sync API
  async syncYouTube(downloadAudio = false) {
    return this.request('/api/sync', {
      method: 'POST',
      body: JSON.stringify({ downloadAudio })
    });
  },

  // 3. Live Radio Stream API
  async getLiveStatus() {
    return this.request('/api/live/status');
  },

  async getLiveChat() {
    return this.request('/api/live/chat');
  },

  async sendLiveChatMessage(content) {
    const user = Auth.getUser();
    return this.request('/api/live/chat', {
      method: 'POST',
      body: JSON.stringify({
        content,
        userId: user ? user.id : 'guest',
        userName: user ? user.name : 'مستمع نيون',
        userAvatar: user ? user.avatar : 'assets/PNG-LOGO.png'
      })
    });
  },

  // 4. Playlists API
  async getPlaylists() {
    const user = Auth.getUser();
    const qs = user ? `?userId=${user.id}` : '?userId=usr_guest_demo';
    return this.request(`/api/playlists${qs}`);
  },

  async getPlaylistById(id) {
    return this.request(`/api/playlists/${id}`);
  },

  async createPlaylist(playlistData) {
    const user = Auth.getUser();
    return this.request('/api/playlists', {
      method: 'POST',
      body: JSON.stringify({
        ...playlistData,
        userId: user ? user.id : 'usr_guest_demo'
      })
    });
  },

  async updatePlaylist(id, updates) {
    const user = Auth.getUser();
    return this.request(`/api/playlists/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...updates,
        userId: user ? user.id : 'usr_guest_demo'
      })
    });
  },

  async deletePlaylist(id) {
    const user = Auth.getUser();
    return this.request(`/api/playlists/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId: user ? user.id : 'usr_guest_demo' })
    });
  },

  async addTrackToPlaylist(playlistId, trackId) {
    const user = Auth.getUser();
    return this.request(`/api/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        trackId,
        userId: user ? user.id : 'usr_guest_demo'
      })
    });
  },

  async removeTrackFromPlaylist(playlistId, trackId) {
    const user = Auth.getUser();
    return this.request(`/api/playlists/${playlistId}/tracks/${trackId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId: user ? user.id : 'usr_guest_demo' })
    });
  },

  // 5. Auth API
  async register(email, password, name) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    });
  },

  async login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async googleAuth(googleData) {
    return this.request('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(googleData)
    });
  },

  async getMe() {
    return this.request('/api/auth/me');
  }
};
