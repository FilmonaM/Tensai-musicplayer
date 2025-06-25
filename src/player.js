// Audio player module
export class Player {
    constructor() {
        this.audio = document.getElementById('audio-player');
        this.currentTrack = null;
        this.isInitialized = false;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Fix for audio playback
        this.audio.addEventListener('loadeddata', () => {
            this.isInitialized = true;
        });
        
        this.audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            this.handleError(e);
        });
    }
    
    async loadTrack(item) {
        try {
            this.currentTrack = item;
            
            // Clean up previous URL if exists
            if (this.audio.src && this.audio.src.startsWith('blob:')) {
                URL.revokeObjectURL(this.audio.src);
            }
            
            // For file objects, create blob URL
            if (item.file) {
                this.audio.src = URL.createObjectURL(item.file);
            } else if (item.url) {
                this.audio.src = item.url;
            } else if (item.filePath) {
                // For file path, we'll need Tauri's convertFileSrc
                if (window.__TAURI__) {
                    const { convertFileSrc } = window.__TAURI__.core;
                    this.audio.src = convertFileSrc(item.filePath);
                } else {
                    this.audio.src = item.filePath;
                }
            }
            
            // Update UI
            this.updateNowPlaying(item);
            
            // Load the audio
            await this.audio.load();
            
            return true;
        } catch (error) {
            console.error('Error loading track:', error);
            return false;
        }
    }
    
    async play() {
        if (!this.audio.src) {
            console.error('No audio source set');
            return false;
        }
        
        try {
            console.log('Attempting to play:', this.audio.src);
            await this.audio.play();
            console.log('Playback started successfully');
            return true;
        } catch (error) {
            console.error('Play error:', error);
            // Handle autoplay policy
            if (error.name === 'NotAllowedError') {
                console.log('Autoplay blocked, waiting for user interaction');
            }
            return false;
        }
    }
    
    pause() {
        this.audio.pause();
    }
    
    async togglePlayPause() {
        if (this.audio.paused) {
            return await this.play();
        } else {
            this.pause();
            return true;
        }
    }
    
    seek(time) {
        if (this.audio.duration) {
            this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration));
        }
    }
    
    seekPercent(percent) {
        if (this.audio.duration) {
            this.seek(this.audio.duration * percent);
        }
    }
    
    setVolume(volume) {
        this.audio.volume = Math.max(0, Math.min(1, volume));
    }
    
    updateNowPlaying(item) {
        const titleEl = document.getElementById('now-playing-title');
        const artistEl = document.getElementById('now-playing-artist');
        const artContainer = document.getElementById('now-playing-art');
        const artImg = artContainer.querySelector('img');
        
        titleEl.textContent = item.name || 'Unknown';
        artistEl.textContent = item.artist || item.type?.toUpperCase() || 'UNKNOWN';
        
        if (item.thumbnail) {
            artImg.src = item.thumbnail;
            artImg.style.display = 'block';
            artContainer.style.backgroundColor = 'transparent';
        } else {
            artImg.src = '';
            artImg.style.display = 'none';
            artContainer.style.backgroundColor = '#2a2a2a';
        }
    }
    
    handleError(error) {
        const event = new CustomEvent('playerError', { 
            detail: { error, track: this.currentTrack } 
        });
        document.dispatchEvent(event);
    }
    
    get currentTime() {
        return this.audio.currentTime;
    }
    
    get duration() {
        return this.audio.duration;
    }
    
    get paused() {
        return this.audio.paused;
    }
    
    get volume() {
        return this.audio.volume;
    }
} 