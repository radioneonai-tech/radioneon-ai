const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('./services/database');
const youtubeSync = require('./services/youtubeSync');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'radio_neon_super_secret_jwt_key_2026';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Helper for JWT Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً (Authentication required)' });
  }
  next();
}

app.use(authenticateToken);

// ==========================================
// 1. TRACKS & AUDIO APIS
// ==========================================

// Get all tracks with search, sorting and filtering
app.get('/api/tracks', (req, res) => {
  try {
    let tracks = db.getTracks();
    const { search, tag, sort } = req.query;

    if (search) {
      const q = search.toLowerCase().trim();
      tracks = tracks.filter(t => 
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.titleAr && t.titleAr.toLowerCase().includes(q)) ||
        (t.titleEn && t.titleEn.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
      );
    }

    if (tag && tag !== 'all') {
      const tq = tag.toLowerCase();
      tracks = tracks.filter(t => t.tags && t.tags.some(tItem => tItem.toLowerCase() === tq));
    }

    if (sort === 'popular' || sort === 'likes') {
      tracks.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    } else if (sort === 'views') {
      tracks.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sort === 'duration') {
      tracks.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    } else {
      // Default newest
      tracks.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
    }

    // Attach user like status if logged in
    const userLikes = req.user ? db.getUserLikes(req.user.id) : [];
    const responseTracks = tracks.map(t => ({
      ...t,
      isLiked: userLikes.includes(t.id) || userLikes.includes(t.videoId)
    }));

    res.json({
      success: true,
      total: responseTracks.length,
      tracks: responseTracks
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single track details
app.get('/api/tracks/:id', (req, res) => {
  try {
    const track = db.getTrackById(req.params.id);
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    const comments = db.getComments(track.id);
    const userLikes = req.user ? db.getUserLikes(req.user.id) : [];

    res.json({
      success: true,
      track: {
        ...track,
        isLiked: userLikes.includes(track.id),
        commentsCount: comments.length,
        comments
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle like for track
app.post('/api/tracks/:id/like', (req, res) => {
  try {
    const userId = req.user ? req.user.id : (req.body.userId || 'usr_guest_demo');
    const result = db.toggleLike(userId, req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get track comments
app.get('/api/tracks/:id/comments', (req, res) => {
  try {
    const comments = db.getComments(req.params.id);
    res.json({ success: true, comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add comment to track
app.post('/api/tracks/:id/comments', (req, res) => {
  try {
    const { content, userName, userAvatar } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    const comment = db.addComment({
      trackId: req.params.id,
      userId: req.user ? req.user.id : (req.body.userId || 'guest'),
      userName: req.user ? req.user.name : (userName || 'مستمع نيون'),
      userAvatar: req.user ? req.user.avatar : (userAvatar || 'assets/PNG-LOGO.png'),
      content: content.trim()
    });

    res.json({ success: true, comment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. AUDIO STREAMING (HTTP 206 Partial Content)
// ==========================================
app.get('/api/audio/:id.mp3', async (req, res) => {
  try {
    const videoId = req.params.id.replace('.mp3', '');
    const audioPath = path.join(__dirname, 'public', 'audio', `${videoId}.mp3`);

    // Check if MP3 file exists locally
    if (!fs.existsSync(audioPath)) {
      try {
        console.log(`[Audio Stream] MP3 not found locally for ${videoId}, triggering on-demand extraction...`);
        await youtubeSync.downloadTrackAudio(videoId);
      } catch (err) {
        console.warn(`[Audio Stream] On-demand download error for ${videoId}:`, err.message);
      }
    }

    if (fs.existsSync(audioPath)) {
      const stat = fs.statSync(audioPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        // HTTP 206 Partial Content streaming for smooth seeking
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(audioPath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=31536000'
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'audio/mpeg',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000'
        };
        res.writeHead(200, head);
        fs.createReadStream(audioPath).pipe(res);
      }
    } else {
      // Fallback: If not downloaded yet, return 404 or stream proxy
      res.status(404).json({ error: 'Audio file is currently being prepared, please retry in a moment.' });
    }
  } catch (err) {
    console.error('Audio streaming error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. YOUTUBE AUTOMATED SYNC
// ==========================================
app.post('/api/sync', async (req, res) => {
  try {
    const downloadAudio = req.body.downloadAudio === true;
    const result = await youtubeSync.syncChannel(downloadAudio);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. LIVE RADIO STREAM STATUS & CHAT
// ==========================================
app.get('/api/live/status', (req, res) => {
  try {
    const tracks = db.getTracks();
    if (!tracks || tracks.length === 0) {
      return res.json({ success: true, live: null });
    }

    // Calculate dynamic synchronized radio broadcast state
    const totalLoopDuration = tracks.reduce((sum, t) => sum + (t.duration || 180), 0);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const stationStartSeconds = 1780000000; // Fixed radio epoch
    const elapsedSinceStart = (nowSeconds - stationStartSeconds) % totalLoopDuration;

    let accumulatedTime = 0;
    let currentTrackIndex = 0;
    let trackElapsed = 0;

    for (let i = 0; i < tracks.length; i++) {
      const dur = tracks[i].duration || 180;
      if (accumulatedTime + dur > elapsedSinceStart) {
        currentTrackIndex = i;
        trackElapsed = elapsedSinceStart - accumulatedTime;
        break;
      }
      accumulatedTime += dur;
    }

    const currentTrack = tracks[currentTrackIndex];
    const nextTracks = [
      tracks[(currentTrackIndex + 1) % tracks.length],
      tracks[(currentTrackIndex + 2) % tracks.length],
      tracks[(currentTrackIndex + 3) % tracks.length]
    ];

    // Dynamic virtual listeners based on time
    const baseListeners = 1420;
    const fluctuation = Math.floor(Math.sin(nowSeconds / 60) * 80) + Math.floor(Math.random() * 15);
    const listenerCount = baseListeners + fluctuation;

    res.json({
      success: true,
      currentTrack,
      trackIndex: currentTrackIndex,
      elapsed: trackElapsed,
      remaining: Math.max(0, (currentTrack.duration || 180) - trackElapsed),
      nextTracks,
      listenerCount,
      stationName: 'Radio Neon Live - راديو نيون',
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Live Radio Chat
app.get('/api/live/chat', (req, res) => {
  try {
    const messages = db.getChatMessages(50);
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/live/chat', (req, res) => {
  try {
    const { content, userName, userAvatar } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const msg = db.addChatMessage({
      userId: req.user ? req.user.id : (req.body.userId || 'guest'),
      userName: req.user ? req.user.name : (userName || 'مستمع نيون'),
      userAvatar: req.user ? req.user.avatar : (userAvatar || 'assets/PNG-LOGO.png'),
      content: content.trim()
    });

    res.json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. CUSTOM PLAYLISTS (CRUD)
// ==========================================
app.get('/api/playlists', (req, res) => {
  try {
    const userId = req.user ? req.user.id : (req.query.userId || 'usr_guest_demo');
    const playlists = db.getUserPlaylists(userId);
    const allTracks = db.getTracks();
    const trackMap = new Map(allTracks.map(t => [t.id, t]));

    const populated = playlists.map(p => {
      const tracks = (p.tracks || []).map(id => trackMap.get(id)).filter(Boolean);
      const totalDuration = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
      return {
        ...p,
        trackCount: tracks.length,
        totalDuration,
        tracks
      };
    });

    res.json({ success: true, playlists: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/playlists', (req, res) => {
  try {
    const userId = req.user ? req.user.id : (req.body.userId || 'usr_guest_demo');
    const { name, description, color, tracks } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'اسم قائمة التشغيل مطلوب (Playlist name is required)' });
    }

    const playlist = db.createPlaylist(userId, {
      name: name.trim(),
      description: (description || '').trim(),
      color: color || '#8A05FF',
      tracks: tracks || []
    });

    res.json({ success: true, playlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/playlists/:id', (req, res) => {
  try {
    const playlist = db.getPlaylistById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const allTracks = db.getTracks();
    const trackMap = new Map(allTracks.map(t => [t.id, t]));
    const populatedTracks = (playlist.tracks || []).map(id => trackMap.get(id)).filter(Boolean);

    res.json({
      success: true,
      playlist: {
        ...playlist,
        trackCount: populatedTracks.length,
        tracks: populatedTracks
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/playlists/:id', (req, res) => {
  try {
    const userId = req.user ? req.user.id : (req.body.userId || 'usr_guest_demo');
    const { name, description, color, tracks } = req.body;

    const updated = db.updatePlaylist(req.params.id, userId, {
      name,
      description,
      color,
      tracks
    });

    if (!updated) {
      return res.status(404).json({ error: 'Playlist not found or unauthorized' });
    }

    res.json({ success: true, playlist: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/playlists/:id', (req, res) => {
  try {
    const userId = req.user ? req.user.id : (req.body.userId || 'usr_guest_demo');
    const deleted = db.deletePlaylist(req.params.id, userId);
    res.json({ success: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/playlists/:id/tracks', (req, res) => {
  try {
    const userId = req.user ? req.user.id : (req.body.userId || 'usr_guest_demo');
    const { trackId } = req.body;

    if (!trackId) {
      return res.status(400).json({ error: 'trackId is required' });
    }

    const playlist = db.addTrackToPlaylist(req.params.id, userId, trackId);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json({ success: true, playlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/playlists/:id/tracks/:trackId', (req, res) => {
  try {
    const userId = req.user ? req.user.id : (req.body.userId || 'usr_guest_demo');
    const playlist = db.removeTrackFromPlaylist(req.params.id, userId, req.params.trackId);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json({ success: true, playlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. USER AUTHENTICATION & PROFILES
// ==========================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = db.createUser({
      email,
      name: name || email.split('@')[0],
      passwordHash,
      avatar: 'assets/PNG-LOGO.png'
    });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' });
    }

    const user = db.getUserByEmail(email);
    if (!user || !user.passwordHash) {
      return res.status(400).json({ error: 'بيانات الاعتماد غير صحيحة' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(400).json({ error: 'بيانات الاعتماد غير صحيحة' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Google / Gmail Sign-In Endpoint
app.post('/api/auth/google', (req, res) => {
  try {
    const { email, name, avatar, googleId } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Google email is required' });
    }

    let user = db.getUserByEmail(email);
    if (!user) {
      user = db.createUser({
        email,
        name: name || email.split('@')[0],
        avatar: avatar || 'assets/PNG-LOGO.png',
        googleId: googleId || 'g_' + Date.now()
      });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    return res.json({ success: true, user: null, likes: [] });
  }

  const user = db.getUserById(req.user.id);
  const likes = db.getUserLikes(req.user.id);

  res.json({
    success: true,
    user: user ? { id: user.id, email: user.email, name: user.name, avatar: user.avatar } : null,
    likes
  });
});

app.put('/api/auth/profile', requireAuth, (req, res) => {
  try {
    const { name, avatar } = req.body;
    const updated = db.updateUser(req.user.id, { name, avatar });
    res.json({
      success: true,
      user: { id: updated.id, email: updated.email, name: updated.name, avatar: updated.avatar }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`   📻 RADIO NEON - Official Web Application Running    `);
  console.log(`   🌐 Server URL: http://localhost:${PORT}             `);
  console.log(`   🎵 Ready to stream high quality AI music 24/7       `);
  console.log(`=======================================================`);
});
