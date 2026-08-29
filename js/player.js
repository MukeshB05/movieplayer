(function() {
    "use strict";

    // ================================================================
    //  CONFIGURATION
    // ================================================================
    const JSON_PATH = 'data/videos.json';

    // DOM refs
    const loadingEl = document.getElementById('loading');
    const playerInfo = document.getElementById('playerInfo');
    const movieTitle = document.getElementById('movieTitle');
    const movieYear = document.getElementById('movieYear');
    const movieQuality = document.getElementById('movieQuality');
    const playerContainer = document.getElementById('player');

    let playerInstance = null;
    let videoData = null;

    // ================================================================
    //  GET TMDB ID FROM URL (movie/{tmdbId})
    // ================================================================
    function getTmdbIdFromUrl() {
        const path = window.location.pathname;
        let id = path.split('/').pop();
        if (id.includes('?')) id = id.split('?')[0];
        if (id.includes('#')) id = id.split('#')[0];
        if (!id || id === '' || id === 'movie' || id === 'embed') {
            id = '351421'; // fallback
        }
        return id;
    }

    const tmdbId = getTmdbIdFromUrl();
    console.log(`🎬 Movie ID from URL: ${tmdbId}`);

    // ================================================================
    //  FETCH VIDEO DATA FROM JSON
    // ================================================================
    async function loadVideoData() {
        try {
            const response = await fetch(JSON_PATH);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error loading video data:', error);
            return null;
        }
    }

    function getVideoById(data, id) {
        if (!data || !data.videos) return null;
        return data.videos[id] || null;
    }

    // ================================================================
    //  INIT PLAYER
    // ================================================================
    async function initPlayer() {
        try {
            // Load video data from JSON
            const data = await loadVideoData();
            if (!data) {
                throw new Error('Failed to load video data');
            }

            const video = getVideoById(data, tmdbId);
            if (!video) {
                loadingEl.innerHTML = `
                    <div class="error-message">
                        <span class="error-icon">🎬</span>
                        <strong>Movie not found</strong>
                        <p style="margin-top: 8px; font-size: 14px; opacity: 0.7;">
                            No video available for ID: <span style="color:#fff;">${tmdbId}</span>
                        </p>
                        <p style="margin-top: 12px; font-size: 13px; opacity: 0.5;">
                            Try: tt0111161, tt0068646, tt0468569
                        </p>
                    </div>
                `;
                loadingEl.style.display = 'flex';
                return;
            }

            // Store video data
            videoData = video;

            // Update movie info
            movieTitle.textContent = video.title || 'Untitled';
            movieYear.textContent = video.year || '';
            movieQuality.textContent = video.quality || 'HD';
            playerInfo.style.display = 'block';

            // Clear loading, create YouTube container
            loadingEl.style.display = 'none';
            playerContainer.innerHTML = `<div id="youtube-player"></div>`;

            const youtubeDiv = document.getElementById('youtube-player');
            if (!youtubeDiv) {
                throw new Error('YouTube container missing');
            }

            // Initialize Plyr
            playerInstance = new Plyr(youtubeDiv, {
                type: 'youtube',
                youtube: {
                    id: video.youtube_id,
                    autoplay: 1,
                    rel: 0,
                    modestbranding: 1,
                    showinfo: 0,
                    controls: 1,
                    iv_load_policy: 3,
                    playsinline: 1,
                    enablejsapi: 1,
                    origin: window.location.origin
                },
                controls: [
                    'play-large', 'play', 'progress', 'current-time',
                    'duration', 'mute', 'volume', 'captions',
                    'settings', 'pip', 'airplay', 'fullscreen'
                ],
                settings: ['quality', 'speed'],
                quality: {
                    default: 'hd720',
                    options: ['hd1080', 'hd720', 'auto']
                },
                speed: {
                    selected: 1,
                    options: [0.5, 0.75, 1, 1.25, 1.5, 2]
                },
                keyboard: { focused: true, global: true },
                tooltips: { controls: true, seek: true },
                captions: { active: true, language: 'en', update: true },
                fullscreen: { enabled: true, fallback: true, iosNative: true },
                storage: { enabled: true, key: 'plyr_movie' }
            });

            // Event handlers
            playerInstance.on('ready', () => {
                console.log(`✅ Player ready: ${video.title}`);
            });

            playerInstance.on('error', (error) => {
                console.warn('Plyr error:', error);
                showError('Playback error', 'Could not load the video. Please try again.');
            });

        } catch (error) {
            console.error('Error initializing player:', error);
            showError('Failed to load player', error.message || 'Unknown error');
        }
    }

    // ================================================================
    //  ERROR HANDLING
    // ================================================================
    function showError(title, message) {
        loadingEl.innerHTML = `
            <div class="error-message">
                <span class="error-icon">⚠️</span>
                <strong>${title}</strong>
                <p style="margin-top: 8px; font-size: 14px; opacity: 0.7;">
                    ${message}
                </p>
            </div>
        `;
        loadingEl.style.display = 'flex';
        playerInfo.style.display = 'none';
    }

    // ================================================================
    //  SAFE START
    // ================================================================
    function safeInit() {
        if (typeof Plyr !== 'undefined') {
            initPlayer();
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                let attempts = 0;
                const interval = setInterval(() => {
                    attempts++;
                    if (typeof Plyr !== 'undefined') {
                        clearInterval(interval);
                        initPlayer();
                    } else if (attempts > 30) {
                        clearInterval(interval);
                        showError('Library load timeout', 'Please check your connection.');
                    }
                }, 120);
            });
        }
    }

    safeInit();

    // ================================================================
    //  RESIZE HELPER
    // ================================================================
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (playerInstance && playerInstance.embed) {
                const iframe = document.querySelector('#youtube-player iframe');
                if (iframe) {
                    iframe.style.width = '100%';
                    iframe.style.height = '100%';
                }
            }
        }, 200);
    });

    // Global error fallback
    window.addEventListener('error', (e) => {
        if (loadingEl && loadingEl.style.display !== 'none') {
            showError('Something went wrong', 'Please refresh the page.');
        }
    });

})();
