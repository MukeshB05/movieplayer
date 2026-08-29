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
    let autoplayAttempted = false;

    // ================================================================
    //  GET TMDB ID FROM URL (supports both formats)
    //  Format 1: /movie/351421
    //  Format 2: /movie/?id=351421
    // ================================================================
    function getTmdbIdFromUrl() {
        // 1. Check for query parameter first (?id=xxx)
        const urlParams = new URLSearchParams(window.location.search);
        const idParam = urlParams.get('id');
        if (idParam && idParam.match(/^(tt\d+|\d+)$/)) {
            console.log(`📌 Found ID from query parameter: ${idParam}`);
            return idParam;
        }

        // 2. Check path (movie/351421)
        const path = window.location.pathname;
        const parts = path.split('/').filter(p => p.length > 0);
        
        // Check if last part is a movie ID
        const lastPart = parts[parts.length - 1] || '';
        if (lastPart.match(/^(tt\d+|\d+)$/)) {
            console.log(`📌 Found ID from path: ${lastPart}`);
            return lastPart;
        }
        
        // 3. If the URL is like /movie/350787
        if (parts.length >= 2 && parts[parts.length - 2] === 'movie') {
            const id = parts[parts.length - 1];
            if (id.match(/^(tt\d+|\d+)$/)) {
                console.log(`📌 Found ID from movie path: ${id}`);
                return id;
            }
        }
        
        // 4. Fallback to default
        console.log('📌 No ID found, using default: tt0111161');
        return 'tt0111161';
    }

    const tmdbId = getTmdbIdFromUrl();
    console.log(`🎬 Final Movie ID: ${tmdbId}`);

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
            console.log('✅ Video data loaded successfully');
            return data;
        } catch (error) {
            console.error('❌ Error loading video data:', error);
            return null;
        }
    }

    function getVideoById(data, id) {
        if (!data || !data.videos) return null;
        return data.videos[id] || null;
    }

    // ================================================================
    //  ATTEMPT AUTOPLAY
    // ================================================================
    function attemptAutoplay() {
        if (autoplayAttempted || !playerInstance) return;
        autoplayAttempted = true;
        
        try {
            const playPromise = playerInstance.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log('⚠️ Autoplay was prevented:', error);
                    const overlay = document.querySelector('.plyr__control--overlaid');
                    if (overlay) {
                        overlay.classList.add('pulse-animation');
                    }
                });
            }
        } catch (error) {
            console.log('⚠️ Autoplay error:', error);
        }
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
                            Try: tt0111161, tt0068646, tt0468569, 350787, 351421
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

            // Clear loading
            loadingEl.style.display = 'none';

            // Create YouTube embed with Plyr
            playerContainer.innerHTML = `
                <div id="youtube-player" data-plyr-provider="youtube" data-plyr-embed-id="${video.youtube_id}"></div>
            `;

            const youtubeDiv = document.getElementById('youtube-player');
            if (!youtubeDiv) {
                throw new Error('YouTube container missing');
            }

            // Initialize Plyr with autoplay
            playerInstance = new Plyr(youtubeDiv, {
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
                storage: { enabled: true, key: 'plyr_movie' },
                youtube: {
                    autoplay: 1,
                    rel: 0,
                    modestbranding: 1,
                    showinfo: 0,
                    iv_load_policy: 3,
                    playsinline: 1,
                    enablejsapi: 1
                }
            });

            // Event handlers
            playerInstance.on('ready', () => {
                console.log(`✅ Player ready: ${video.title}`);
                setTimeout(attemptAutoplay, 500);
            });

            playerInstance.on('play', () => {
                console.log('▶️ Video playing');
                autoplayAttempted = true;
                const overlay = document.querySelector('.plyr__control--overlaid');
                if (overlay) {
                    overlay.classList.remove('pulse-animation');
                }
            });

            playerInstance.on('error', (error) => {
                console.warn('⚠️ Plyr error:', error);
                if (!autoplayAttempted) {
                    const overlay = document.querySelector('.plyr__control--overlaid');
                    if (overlay) {
                        overlay.style.display = 'flex';
                        overlay.classList.add('pulse-animation');
                    }
                }
            });

            // Try autoplay when user interacts with the page
            document.addEventListener('click', () => {
                if (!autoplayAttempted) {
                    attemptAutoplay();
                }
            }, { once: true });

            document.addEventListener('touchstart', () => {
                if (!autoplayAttempted) {
                    attemptAutoplay();
                }
            }, { once: true });

        } catch (error) {
            console.error('❌ Error initializing player:', error);
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
