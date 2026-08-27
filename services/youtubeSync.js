const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const CHANNEL_URL = 'https://www.youtube.com/@RadioNeonAi/videos';
const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio');

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Find yt-dlp & ffmpeg binaries in known system locations
function getBinaryPaths() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const ytdlpPaths = [
    path.join(localAppData, 'Programs', 'yt-dlp.exe'),
    'yt-dlp.exe',
    'yt-dlp'
  ];

  const ffmpegPaths = [
    'C:\\Program Files (x86)\\Nickvision Parabolic\\Release\\ffmpeg.exe',
    path.join(localAppData, 'Programs', 'ffmpeg.exe'),
    'ffmpeg.exe',
    'ffmpeg'
  ];

  let ytdlpBin = 'yt-dlp';
  for (const p of ytdlpPaths) {
    if (fs.existsSync(p)) {
      ytdlpBin = p;
      break;
    }
  }

  let ffmpegBin = 'ffmpeg';
  for (const p of ffmpegPaths) {
    if (fs.existsSync(p)) {
      ffmpegBin = p;
      break;
    }
  }

  return { ytdlpBin, ffmpegBin };
}

// Initial catalog fallback of official @RadioNeonAi tracks
const INITIAL_SEED_TRACKS = [
  {
    id: "UClRR3rJf7c",
    videoId: "UClRR3rJf7c",
    title: "نظرة - Glance",
    titleAr: "نظرة",
    titleEn: "Glance",
    duration: 344,
    durationString: "5:44",
    views: 84,
    thumbnailUrl: "https://i.ytimg.com/vi/UClRR3rJf7c/hqdefault.jpg",
    audioUrl: "/api/audio/UClRR3rJf7c.mp3",
    likesCount: 18,
    tags: ["Ambient", "Neon Wave", "Oriental"],
    publishedAt: "2026-08-20T12:00:00Z"
  },
  {
    id: "9XypKXKnwmc",
    videoId: "9XypKXKnwmc",
    title: "شجاني - SaddenedMe",
    titleAr: "شجاني",
    titleEn: "SaddenedMe",
    duration: 294,
    durationString: "4:54",
    views: 33,
    thumbnailUrl: "https://i.ytimg.com/vi/9XypKXKnwmc/hqdefault.jpg",
    audioUrl: "/api/audio/9XypKXKnwmc.mp3",
    likesCount: 14,
    tags: ["Lofi", "Emotional", "Synth"],
    publishedAt: "2026-08-19T14:00:00Z"
  },
  {
    id: "PtPYtNl4umY",
    videoId: "PtPYtNl4umY",
    title: "خطوة - Step",
    titleAr: "خطوة",
    titleEn: "Step",
    duration: 219,
    durationString: "3:39",
    views: 181,
    thumbnailUrl: "https://i.ytimg.com/vi/PtPYtNl4umY/hqdefault.jpg",
    audioUrl: "/api/audio/PtPYtNl4umY.mp3",
    likesCount: 39,
    tags: ["Beat", "Energy", "Cyberpunk"],
    publishedAt: "2026-08-18T10:00:00Z"
  },
  {
    id: "xmn4J8jYXIQ",
    videoId: "xmn4J8jYXIQ",
    title: "بوح - Whisper",
    titleAr: "بوح",
    titleEn: "Whisper",
    duration: 230,
    durationString: "3:50",
    views: 27,
    thumbnailUrl: "https://i.ytimg.com/vi/xmn4J8jYXIQ/hqdefault.jpg",
    audioUrl: "/api/audio/xmn4J8jYXIQ.mp3",
    likesCount: 12,
    tags: ["Chill", "Ambient", "Midnight"],
    publishedAt: "2026-08-17T18:00:00Z"
  },
  {
    id: "KaaEGJGmkdY",
    videoId: "KaaEGJGmkdY",
    title: "راكد - Stagnant",
    titleAr: "راكد",
    titleEn: "Stagnant",
    duration: 154,
    durationString: "2:34",
    views: 20,
    thumbnailUrl: "https://i.ytimg.com/vi/KaaEGJGmkdY/hqdefault.jpg",
    audioUrl: "/api/audio/KaaEGJGmkdY.mp3",
    likesCount: 9,
    tags: ["Deep", "Atmospheric"],
    publishedAt: "2026-08-16T12:00:00Z"
  },
  {
    id: "BlxP9SfWLiM",
    videoId: "BlxP9SfWLiM",
    title: "سلطنة - Trance",
    titleAr: "سلطنة",
    titleEn: "Trance",
    duration: 440,
    durationString: "7:20",
    views: 45,
    thumbnailUrl: "https://i.ytimg.com/vi/BlxP9SfWLiM/hqdefault.jpg",
    audioUrl: "/api/audio/BlxP9SfWLiM.mp3",
    likesCount: 22,
    tags: ["Hypnotic", "Oriental Electronic"],
    publishedAt: "2026-08-15T09:00:00Z"
  },
  {
    id: "lJWj5TtyXTA",
    videoId: "lJWj5TtyXTA",
    title: "لقاء - Meeting",
    titleAr: "لقاء",
    titleEn: "Meeting",
    duration: 358,
    durationString: "5:58",
    views: 52,
    thumbnailUrl: "https://i.ytimg.com/vi/lJWj5TtyXTA/hqdefault.jpg",
    audioUrl: "/api/audio/lJWj5TtyXTA.mp3",
    likesCount: 16,
    tags: ["Dreamy", "Synthwave"],
    publishedAt: "2026-08-14T11:00:00Z"
  },
  {
    id: "r07_hBEx58c",
    videoId: "r07_hBEx58c",
    title: "فل - Jasmine",
    titleAr: "فل",
    titleEn: "Jasmine",
    duration: 215,
    durationString: "3:35",
    views: 38,
    thumbnailUrl: "https://i.ytimg.com/vi/r07_hBEx58c/hqdefault.jpg",
    audioUrl: "/api/audio/r07_hBEx58c.mp3",
    likesCount: 19,
    tags: ["Acoustic & Synth", "Jasmine Bloom"],
    publishedAt: "2026-08-13T16:00:00Z"
  },
  {
    id: "LMxtfxLfkUw",
    videoId: "LMxtfxLfkUw",
    title: "طعوس - Dunes",
    titleAr: "طعوس",
    titleEn: "Dunes",
    duration: 357,
    durationString: "5:57",
    views: 61,
    thumbnailUrl: "https://i.ytimg.com/vi/LMxtfxLfkUw/hqdefault.jpg",
    audioUrl: "/api/audio/LMxtfxLfkUw.mp3",
    likesCount: 27,
    tags: ["Desert Cyber", "Dunes"],
    publishedAt: "2026-08-12T13:00:00Z"
  },
  {
    id: "LvqZiOlrrY8",
    videoId: "LvqZiOlrrY8",
    title: "مضرب - Mudhrab",
    titleAr: "مضرب",
    titleEn: "Mudhrab",
    duration: 369,
    durationString: "6:09",
    views: 29,
    thumbnailUrl: "https://i.ytimg.com/vi/LvqZiOlrrY8/hqdefault.jpg",
    audioUrl: "/api/audio/LvqZiOlrrY8.mp3",
    likesCount: 11,
    tags: ["Rhythm", "Percussion"],
    publishedAt: "2026-08-11T15:00:00Z"
  },
  {
    id: "fSwRCrcJl-w",
    videoId: "fSwRCrcJl-w",
    title: "رقمي - Digital",
    titleAr: "رقمي",
    titleEn: "Digital",
    duration: 268,
    durationString: "4:28",
    views: 40,
    thumbnailUrl: "https://i.ytimg.com/vi/fSwRCrcJl-w/hqdefault.jpg",
    audioUrl: "/api/audio/fSwRCrcJl-w.mp3",
    likesCount: 17,
    tags: ["Future Beats", "Digital"],
    publishedAt: "2026-08-10T14:00:00Z"
  },
  {
    id: "TrYwl0JpitA",
    videoId: "TrYwl0JpitA",
    title: "تفكر - Reflection",
    titleAr: "تفكر",
    titleEn: "Reflection",
    duration: 389,
    durationString: "6:29",
    views: 31,
    thumbnailUrl: "https://i.ytimg.com/vi/TrYwl0JpitA/hqdefault.jpg",
    audioUrl: "/api/audio/TrYwl0JpitA.mp3",
    likesCount: 15,
    tags: ["Meditation", "Mindful", "Chill"],
    publishedAt: "2026-08-09T10:00:00Z"
  },
  {
    id: "cJIPzAzFuzE",
    videoId: "cJIPzAzFuzE",
    title: "إيقاع - Rhythm",
    titleAr: "إيقاع",
    titleEn: "Rhythm",
    duration: 233,
    durationString: "3:53",
    views: 34,
    thumbnailUrl: "https://i.ytimg.com/vi/cJIPzAzFuzE/hqdefault.jpg",
    audioUrl: "/api/audio/cJIPzAzFuzE.mp3",
    likesCount: 21,
    tags: ["Pulse", "Drum & Bass", "Arabic Flow"],
    publishedAt: "2026-08-08T12:00:00Z"
  },
  {
    id: "KzZJKIiiRhI",
    videoId: "KzZJKIiiRhI",
    title: "ربابة - Rababa",
    titleAr: "ربابة",
    titleEn: "Rababa",
    duration: 422,
    durationString: "7:02",
    views: 14,
    thumbnailUrl: "https://i.ytimg.com/vi/KzZJKIiiRhI/hqdefault.jpg",
    audioUrl: "/api/audio/KzZJKIiiRhI.mp3",
    likesCount: 13,
    tags: ["Traditional Modern", "Rababa", "Neon"],
    publishedAt: "2026-08-07T11:00:00Z"
  },
  {
    id: "bt5r0xjekzI",
    videoId: "bt5r0xjekzI",
    title: "صدى - Echo",
    titleAr: "صدى",
    titleEn: "Echo",
    duration: 244,
    durationString: "4:04",
    views: 25,
    thumbnailUrl: "https://i.ytimg.com/vi/bt5r0xjekzI/hqdefault.jpg",
    audioUrl: "/api/audio/bt5r0xjekzI.mp3",
    likesCount: 18,
    tags: ["Reverb", "Echoes", "Night"],
    publishedAt: "2026-08-06T15:00:00Z"
  }
];

class YouTubeSyncService {
  constructor() {
    this.isSyncing = false;
    this.initCatalog();
  }

  initCatalog() {
    const existing = db.getTracks();
    if (!existing || existing.length === 0) {
      console.log('Initializing database with official Radio Neon tracks catalog...');
      db.saveTracks(INITIAL_SEED_TRACKS);
    }
  }

  // Parse title into Arabic & English parts
  parseTitle(rawTitle) {
    let clean = (rawTitle || '').trim();
    let titleAr = clean;
    let titleEn = '';

    if (clean.includes('-')) {
      const parts = clean.split('-').map(s => s.trim());
      titleAr = parts[0] || clean;
      titleEn = parts[1] || '';
    } else if (clean.includes('|')) {
      const parts = clean.split('|').map(s => s.trim());
      titleAr = parts[0] || clean;
      titleEn = parts[1] || '';
    }

    return { title: clean, titleAr, titleEn };
  }

  // Format seconds to mm:ss
  formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // Fetch channel video list via yt-dlp
  async fetchChannelVideos() {
    const { ytdlpBin } = getBinaryPaths();
    return new Promise((resolve, reject) => {
      const cmd = `"${ytdlpBin}" --flat-playlist --dump-json "${CHANNEL_URL}"`;
      exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          console.warn('yt-dlp channel fetch error:', err.message);
          return resolve(INITIAL_SEED_TRACKS);
        }

        const lines = stdout.trim().split('\n').filter(Boolean);
        const videos = [];

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.id) {
              const { title, titleAr, titleEn } = this.parseTitle(data.title || '');
              const duration = data.duration || 200;
              videos.push({
                id: data.id,
                videoId: data.id,
                title: data.title || title,
                titleAr: titleAr || data.title,
                titleEn: titleEn || '',
                duration: duration,
                durationString: data.duration_string || this.formatDuration(duration),
                views: data.view_count || 0,
                thumbnailUrl: `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg`,
                audioUrl: `/api/audio/${data.id}.mp3`,
                likesCount: Math.floor(Math.random() * 25) + 5,
                tags: ['Radio Neon', 'AI Wave', 'Music'],
                publishedAt: new Date(data.epoch ? data.epoch * 1000 : Date.now()).toISOString()
              });
            }
          } catch (e) {
            // Ignore single line parse error
          }
        }

        if (videos.length > 0) {
          resolve(videos);
        } else {
          resolve(INITIAL_SEED_TRACKS);
        }
      });
    });
  }

  // Download & convert a specific video to MP3
  async downloadTrackAudio(videoId) {
    const { ytdlpBin, ffmpegBin } = getBinaryPaths();
    const outputFile = path.join(AUDIO_DIR, `${videoId}.mp3`);

    if (fs.existsSync(outputFile)) {
      const stats = fs.statSync(outputFile);
      if (stats.size > 10000) {
        return outputFile; // Already cached
      }
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const ffmpegDir = path.dirname(ffmpegBin);

    return new Promise((resolve, reject) => {
      console.log(`[Audio Pipeline] Downloading audio for ${videoId}...`);
      const cmd = `"${ytdlpBin}" --ffmpeg-location "${ffmpegDir}" -x --audio-format mp3 --audio-quality 192K -o "${path.join(AUDIO_DIR, `${videoId}.%(ext)s`)}" "${videoUrl}"`;

      exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          console.error(`Error downloading audio for ${videoId}:`, err.message);
          return reject(err);
        }
        console.log(`[Audio Pipeline] Successfully converted ${videoId} to MP3.`);
        resolve(outputFile);
      });
    });
  }

  // Full Channel Sync Execution
  async syncChannel(downloadAudio = false) {
    if (this.isSyncing) {
      return { status: 'already_syncing', message: 'Sync is currently in progress.' };
    }

    this.isSyncing = true;
    console.log('[Sync Engine] Starting YouTube sync for @RadioNeonAi...');

    try {
      const fetchedVideos = await this.fetchChannelVideos();
      const existingTracks = db.getTracks();
      const existingMap = new Map(existingTracks.map(t => [t.videoId, t]));

      const mergedTracks = fetchedVideos.map(video => {
        const existing = existingMap.get(video.videoId);
        return {
          ...video,
          likesCount: existing ? existing.likesCount : video.likesCount,
          tags: existing && existing.tags ? existing.tags : video.tags
        };
      });

      db.saveTracks(mergedTracks);
      console.log(`[Sync Engine] Successfully synced ${mergedTracks.length} tracks.`);

      if (downloadAudio) {
        // Download in background queue
        this.downloadAllTracksQueue(mergedTracks);
      }

      this.isSyncing = false;
      return {
        status: 'success',
        count: mergedTracks.length,
        syncedAt: new Date().toISOString(),
        tracks: mergedTracks
      };
    } catch (err) {
      this.isSyncing = false;
      console.error('[Sync Engine] Sync failed:', err);
      return { status: 'error', message: err.message };
    }
  }

  // Background queue for downloading audio files sequentially
  async downloadAllTracksQueue(tracks) {
    for (const track of tracks) {
      try {
        await this.downloadTrackAudio(track.videoId);
      } catch (err) {
        console.warn(`Could not pre-download ${track.videoId}:`, err.message);
      }
    }
  }
}

module.exports = new YouTubeSyncService();
