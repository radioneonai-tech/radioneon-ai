const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'database.json');

// Default database structure
const defaultData = {
  tracks: [],
  users: [
    {
      id: 'usr_guest_demo',
      email: 'demo@radioneon.ai',
      name: 'Radio Neon Fan',
      avatar: 'assets/PNG-LOGO.png',
      createdAt: new Date().toISOString()
    }
  ],
  playlists: [],
  comments: [],
  likes: [],
  chat: [],
  syncState: {
    lastSyncedAt: null,
    totalTracks: 0,
    status: 'idle'
  }
};

class Database {
  constructor() {
    this.ensureDbExists();
  }

  ensureDbExists() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), 'utf8');
    }
  }

  read() {
    try {
      this.ensureDbExists();
      const content = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(content);
    } catch (err) {
      console.error('Error reading database:', err);
      return defaultData;
    }
  }

  write(data) {
    try {
      this.ensureDbExists();
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Error writing database:', err);
      return false;
    }
  }

  // --- TRACKS ---
  getTracks() {
    const db = this.read();
    return db.tracks || [];
  }

  getTrackById(id) {
    const db = this.read();
    return (db.tracks || []).find(t => t.id === id || t.videoId === id);
  }

  saveTracks(tracks) {
    const db = this.read();
    db.tracks = tracks;
    db.syncState.totalTracks = tracks.length;
    db.syncState.lastSyncedAt = new Date().toISOString();
    this.write(db);
    return tracks;
  }

  upsertTrack(trackData) {
    const db = this.read();
    db.tracks = db.tracks || [];
    const index = db.tracks.findIndex(t => t.id === trackData.id || t.videoId === trackData.videoId);
    if (index >= 0) {
      db.tracks[index] = { ...db.tracks[index], ...trackData };
    } else {
      db.tracks.unshift(trackData);
    }
    db.syncState.totalTracks = db.tracks.length;
    this.write(db);
    return trackData;
  }

  // --- LIKES ---
  toggleLike(userId, trackId) {
    const db = this.read();
    db.likes = db.likes || [];
    db.tracks = db.tracks || [];

    const existingIndex = db.likes.findIndex(l => l.userId === userId && l.trackId === trackId);
    let liked = false;

    if (existingIndex >= 0) {
      db.likes.splice(existingIndex, 1);
      liked = false;
    } else {
      db.likes.push({
        userId,
        trackId,
        createdAt: new Date().toISOString()
      });
      liked = true;
    }

    // Update track likesCount
    const count = db.likes.filter(l => l.trackId === trackId).length;
    const track = db.tracks.find(t => t.id === trackId || t.videoId === trackId);
    if (track) {
      track.likesCount = count;
    }

    this.write(db);
    return { liked, likesCount: count };
  }

  getUserLikes(userId) {
    const db = this.read();
    db.likes = db.likes || [];
    return db.likes.filter(l => l.userId === userId).map(l => l.trackId);
  }

  // --- COMMENTS ---
  getComments(trackId) {
    const db = this.read();
    return (db.comments || []).filter(c => c.trackId === trackId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  addComment(commentData) {
    const db = this.read();
    db.comments = db.comments || [];
    const newComment = {
      id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      trackId: commentData.trackId,
      userId: commentData.userId || 'guest',
      userName: commentData.userName || 'مستمع نيون (Guest)',
      userAvatar: commentData.userAvatar || 'assets/PNG-LOGO.png',
      content: commentData.content,
      createdAt: new Date().toISOString(),
      likes: 0
    };
    db.comments.unshift(newComment);
    this.write(db);
    return newComment;
  }

  // --- PLAYLISTS ---
  getUserPlaylists(userId) {
    const db = this.read();
    return (db.playlists || []).filter(p => p.userId === userId);
  }

  getPlaylistById(id) {
    const db = this.read();
    return (db.playlists || []).find(p => p.id === id);
  }

  createPlaylist(userId, playlistData) {
    const db = this.read();
    db.playlists = db.playlists || [];
    const newPlaylist = {
      id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      userId,
      name: playlistData.name || 'قائمة جديدة',
      description: playlistData.description || '',
      color: playlistData.color || '#8A05FF',
      tracks: playlistData.tracks || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.playlists.push(newPlaylist);
    this.write(db);
    return newPlaylist;
  }

  updatePlaylist(id, userId, updates) {
    const db = this.read();
    db.playlists = db.playlists || [];
    const index = db.playlists.findIndex(p => p.id === id && p.userId === userId);
    if (index === -1) return null;

    db.playlists[index] = {
      ...db.playlists[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.write(db);
    return db.playlists[index];
  }

  deletePlaylist(id, userId) {
    const db = this.read();
    db.playlists = db.playlists || [];
    const initialLen = db.playlists.length;
    db.playlists = db.playlists.filter(p => !(p.id === id && p.userId === userId));
    const deleted = db.playlists.length < initialLen;
    if (deleted) this.write(db);
    return deleted;
  }

  addTrackToPlaylist(playlistId, userId, trackId) {
    const db = this.read();
    db.playlists = db.playlists || [];
    const playlist = db.playlists.find(p => p.id === playlistId && p.userId === userId);
    if (!playlist) return null;

    if (!playlist.tracks.includes(trackId)) {
      playlist.tracks.push(trackId);
      playlist.updatedAt = new Date().toISOString();
      this.write(db);
    }
    return playlist;
  }

  removeTrackFromPlaylist(playlistId, userId, trackId) {
    const db = this.read();
    db.playlists = db.playlists || [];
    const playlist = db.playlists.find(p => p.id === playlistId && p.userId === userId);
    if (!playlist) return null;

    playlist.tracks = playlist.tracks.filter(id => id !== trackId);
    playlist.updatedAt = new Date().toISOString();
    this.write(db);
    return playlist;
  }

  // --- USERS & AUTH ---
  getUserByEmail(email) {
    const db = this.read();
    return (db.users || []).find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id) {
    const db = this.read();
    return (db.users || []).find(u => u.id === id);
  }

  createUser(userData) {
    const db = this.read();
    db.users = db.users || [];
    const newUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      email: userData.email.toLowerCase(),
      name: userData.name || userData.email.split('@')[0],
      avatar: userData.avatar || 'assets/PNG-LOGO.png',
      passwordHash: userData.passwordHash || null,
      googleId: userData.googleId || null,
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    this.write(db);
    return newUser;
  }

  updateUser(id, updates) {
    const db = this.read();
    db.users = db.users || [];
    const index = db.users.findIndex(u => u.id === id);
    if (index === -1) return null;

    db.users[index] = { ...db.users[index], ...updates };
    this.write(db);
    return db.users[index];
  }

  // --- LIVE CHAT ---
  getChatMessages(limit = 50) {
    const db = this.read();
    return (db.chat || []).slice(-limit);
  }

  addChatMessage(msg) {
    const db = this.read();
    db.chat = db.chat || [];
    const message = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      userId: msg.userId || 'guest',
      userName: msg.userName || 'مستمع نيون',
      userAvatar: msg.userAvatar || 'assets/PNG-LOGO.png',
      content: msg.content,
      timestamp: new Date().toISOString()
    };
    db.chat.push(message);
    if (db.chat.length > 200) {
      db.chat = db.chat.slice(-200);
    }
    this.write(db);
    return message;
  }
}

module.exports = new Database();
