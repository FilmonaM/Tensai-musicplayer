// UI management module
export class UI {
    static createMediaItem(item, isPlaying = false) {
        const div = document.createElement('div');
        div.className = 'media-item';
        div.dataset.id = item.id;
        
        if (isPlaying) {
            div.classList.add('playing');
        }
        
        const thumb = document.createElement('div');
        thumb.className = 'media-thumb';
        
        if (item.thumbnail) {
            thumb.classList.remove('no-art');
            const img = document.createElement('img');
            img.src = item.thumbnail;
            thumb.appendChild(img);
        } else if (item.type === 'video' && item.url) {
            thumb.classList.remove('no-art');
            const video = document.createElement('video');
            video.src = item.url;
            thumb.appendChild(video);
        } else {
            thumb.classList.add('no-art');
        }
        
        const addBtn = document.createElement('button');
        addBtn.className = 'add-queue-btn';
        addBtn.innerHTML = '+';
        addBtn.dataset.id = item.id;
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-thumb-btn';
        editBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
        editBtn.dataset.id = item.id;
        
        const title = document.createElement('div');
        title.className = 'media-title';
        title.textContent = item.name;
        
        div.appendChild(thumb);
        div.appendChild(addBtn);
        div.appendChild(editBtn);
        div.appendChild(title);
        
        return div;
    }
    
    static createQueueItem(item, index, isPlaying = false) {
        const div = document.createElement('div');
        div.className = 'queue-item';
        div.dataset.index = index;
        
        if (isPlaying) {
            div.classList.add('playing');
        }
        
        const thumb = document.createElement('div');
        thumb.className = 'queue-item-thumb';
        if (item.thumbnail) {
            const img = document.createElement('img');
            img.src = item.thumbnail;
            thumb.appendChild(img);
        }
        
        const info = document.createElement('div');
        info.className = 'queue-item-info';
        
        const title = document.createElement('div');
        title.className = 'queue-item-title';
        title.textContent = item.name;
        info.appendChild(title);
        
        const remove = document.createElement('div');
        remove.className = 'queue-item-remove';
        remove.textContent = '×';
        remove.dataset.index = index;
        
        div.appendChild(thumb);
        div.appendChild(info);
        div.appendChild(remove);
        
        return div;
    }
    
    static createPlaylistCarousel(playlists) {
        const container = document.createElement('div');
        container.className = 'playlists-carousel';
        
        const carousel = document.createElement('div');
        carousel.className = 'playlist-carousel-container';
        
        playlists.forEach(playlist => {
            const item = this.createPlaylistItem(playlist);
            carousel.appendChild(item);
        });
        
        container.appendChild(carousel);
        return container;
    }
    
    static createPlaylistItem(playlist) {
        const item = document.createElement('div');
        item.className = 'playlist-item';
        item.dataset.id = playlist.id;
        
        // Header section
        const header = document.createElement('div');
        header.className = 'playlist-header';
        
        // Cover
        const cover = document.createElement('div');
        cover.className = 'playlist-cover';
        
        if (playlist.cover) {
            const img = document.createElement('img');
            img.src = playlist.cover;
            cover.appendChild(img);
        } else if (playlist.songs.length > 0) {
            // Create 2x2 grid of song thumbnails
            cover.classList.add('empty');
            const songsWithThumbs = playlist.songs.filter(s => s.thumbnail).slice(0, 4);
            
            for (let i = 0; i < 4; i++) {
                const miniThumb = document.createElement('div');
                miniThumb.className = 'mini-thumb';
                if (songsWithThumbs[i]) {
                    const img = document.createElement('img');
                    img.src = songsWithThumbs[i].thumbnail;
                    miniThumb.appendChild(img);
                }
                cover.appendChild(miniThumb);
            }
        }
        
        // Info
        const info = document.createElement('div');
        info.className = 'playlist-item-info';
        
        const title = document.createElement('div');
        title.className = 'playlist-item-title';
        title.textContent = playlist.name;
        
        const count = document.createElement('div');
        count.className = 'playlist-item-count';
        count.textContent = `${playlist.songs.length} songs`;
        
        info.appendChild(title);
        info.appendChild(count);
        
        // Action buttons
        const actions = document.createElement('div');
        actions.className = 'playlist-actions';
        
        const queueBtn = document.createElement('button');
        queueBtn.className = 'playlist-action-btn';
        queueBtn.dataset.action = 'queue';
        queueBtn.dataset.id = playlist.id;
        queueBtn.innerHTML = '+';
        queueBtn.title = 'Add to Queue';
        
        const expandBtn = document.createElement('button');
        expandBtn.className = 'playlist-action-btn';
        expandBtn.dataset.action = 'expand';
        expandBtn.dataset.id = playlist.id;
        expandBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>';
        expandBtn.title = 'View Full Playlist';
        
        actions.appendChild(queueBtn);
        actions.appendChild(expandBtn);
        
        header.appendChild(cover);
        header.appendChild(info);
        header.appendChild(actions);
        
        // Songs horizontal scroll
        const songsContainer = document.createElement('div');
        songsContainer.className = 'playlist-songs-container';
        
        playlist.songs.forEach(song => {
            const songItem = document.createElement('div');
            songItem.className = 'playlist-song-item';
            songItem.dataset.id = song.id;
            songItem.dataset.playlistId = playlist.id;
            
            const songThumb = document.createElement('div');
            songThumb.className = 'playlist-song-thumb';
            if (song.thumbnail) {
                const img = document.createElement('img');
                img.src = song.thumbnail;
                songThumb.appendChild(img);
            }
            
            const addBtn = document.createElement('button');
            addBtn.className = 'add-queue-btn';
            addBtn.innerHTML = '+';
            addBtn.dataset.id = song.id;
            
            songThumb.appendChild(addBtn);
            
            const songTitle = document.createElement('div');
            songTitle.className = 'playlist-song-title';
            songTitle.textContent = song.name;
            
            songItem.appendChild(songThumb);
            songItem.appendChild(songTitle);
            songsContainer.appendChild(songItem);
        });
        
        item.appendChild(header);
        if (playlist.songs.length > 0) {
            item.appendChild(songsContainer);
        }
        
        return item;
    }
    
    static updatePlayButton(isPlaying) {
        const playIcon = document.getElementById('play-icon');
        if (playIcon) {
            if (isPlaying) {
                // Pause icon - two vertical bars
                playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
            } else {
                // Play icon - triangle
                playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
            }
        }
    }
    
    static updateProgress(current, duration) {
        const currentTimeEl = document.getElementById('current-time');
        const totalTimeEl = document.getElementById('total-time');
        const progressFill = document.getElementById('progress-fill');
        
        currentTimeEl.textContent = this.formatTime(current);
        totalTimeEl.textContent = this.formatTime(duration);
        
        const percent = duration ? (current / duration) * 100 : 0;
        progressFill.style.width = `${percent}%`;
    }
    
    static formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    static showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }
    
    static hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    static hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    static showPopup(popupId) {
        const popup = document.getElementById(popupId);
        const overlay = document.getElementById('popup-overlay');
        if (popup) {
            popup.classList.add('active');
            overlay.style.display = 'block';
        }
    }
    
    static hidePopup(popupId) {
        const popup = document.getElementById(popupId);
        const overlay = document.getElementById('popup-overlay');
        if (popup) {
            popup.classList.remove('active');
            overlay.style.display = 'none';
        }
    }
    
    static updateLibraryStats(library) {
        const sizeEl = document.getElementById('library-size');
        const storageEl = document.getElementById('storage-used');
        
        if (sizeEl) {
            sizeEl.textContent = `${library.length} items`;
        }
        
        if (storageEl) {
            // Calculate approximate storage
            const estimatedSize = library.reduce((total, item) => {
                return total + (item.thumbnail ? item.thumbnail.length : 0) + 1000;
            }, 0);
            const sizeMB = (estimatedSize / (1024 * 1024)).toFixed(1);
            storageEl.textContent = `${sizeMB} MB`;
        }
    }
    
    static updateFileManagementUI(mode) {
        const description = document.getElementById('file-mode-description');
        const watchSettings = document.getElementById('watch-folder-settings');
        const managedSettings = document.getElementById('managed-library-settings');
        
        // Hide all settings
        if (watchSettings) watchSettings.style.display = 'none';
        if (managedSettings) managedSettings.style.display = 'none';
        
        switch (mode) {
            case 'direct':
                if (description) {
                    description.textContent = 'Files are accessed directly from their original location.';
                }
                break;
                
            case 'watch':
                if (description) {
                    description.textContent = 'Automatically sync music from a watched folder.';
                }
                if (watchSettings) watchSettings.style.display = 'block';
                break;
                
            case 'managed':
                if (description) {
                    description.textContent = 'Copy files to a managed library folder.';
                }
                if (managedSettings) managedSettings.style.display = 'block';
                break;
        }
    }
} 