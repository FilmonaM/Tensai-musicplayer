import './storage.js';
import './player.js';
import './ui.js';

// Global application state - holds all data
const state = {
    library: [],           // All music files
    playlists: [],         // User-created playlists
    recentlyPlayed: [],    // Recently played tracks
    queue: [],            // Current playback queue
    currentIndex: 0,      // Currently playing track index
    shuffle: false,       // Shuffle mode
    repeat: false,        // Repeat mode
    currentView: 'home',  // Current UI view
    contextItem: null,    // Item for context menu
    deleteItem: null,     // Item to be deleted
    renameItem: null,     // Item to be renamed
    editImageItem: null,  // Item for image editing
    shuffleOrder: [],     // Shuffled queue order
    settings: {
        fileMode: 'direct',
        watchFolder: '',
        libraryPath: '~/Music/Tensai',
        copyOnImport: true,
        autoPlayNext: true,
        gaplessPlayback: false
    }
};

// Audio player object - handles playback
const player = {
    audio: null,
    currentTrack: null,
    paused: true,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    
    init() {
        this.audio = document.getElementById('audio-player');
        this.audio.volume = this.volume;
    }
};

window.state = state;

init();

// Initialize the application
async function init() {
    await loadState();
    await loadLibraryFromBackend();
    setupEventListeners();
    renderAll();
    UI.updateLibraryStats(state.library);
    
    // Setup cache clearing functionality
    const clearCacheBtn = document.getElementById('clear-cache');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', () => {
            UI.showModal('clear-cache-modal');
        });
    }
    
    document.getElementById('clear-cache-cancel').addEventListener('click', () => {
        UI.hideModal('clear-cache-modal');
    });
    
    document.getElementById('clear-cache-confirm').addEventListener('click', async () => {
        await Storage.clearAll();
        state.library = [];
        state.playlists = [];
        state.recentlyPlayed = [];
        state.queue = [];
        state.currentIndex = 0;
        state.settings = {
            fileMode: 'direct',
            watchFolder: '',
            libraryPath: '~/Music/Tensai',
            copyOnImport: true,
            autoPlayNext: true,
            gaplessPlayback: false
        };
        
        renderAll();
        UI.updateLibraryStats(state.library);
        UI.hideModal('clear-cache-modal');
        showSuccessMessage('All data cleared successfully');
    });
}

// Load music library from Rust backend (currently disabled)
async function loadLibraryFromBackend() {
    try {
        if (window.__TAURI__) {
            const library = await window.__TAURI__.invoke('get_library');
            state.library = library.map(item => ({
                ...item,
                url: item.path, // Use file path as URL
                type: getFileType(item.path),
                addedDate: item.added_date * 1000 // Convert to milliseconds
            }));
            
            const playlists = await window.__TAURI__.invoke('get_playlists');
            state.playlists = playlists.map(playlist => ({
                ...playlist,
                created: playlist.created_date * 1000,
                songs: playlist.songs.map(songId => 
                    state.library.find(item => item.id === songId)
                ).filter(Boolean)
            }));
            
            const recentlyPlayed = await window.__TAURI__.invoke('get_recently_played', { limit: 10 });
            state.recentlyPlayed = recentlyPlayed.map(item => ({
                ...item,
                url: item.path,
                type: getFileType(item.path),
                addedDate: item.added_date * 1000
            }));
        }
    } catch (error) {
        console.error('Failed to load library from backend:', error);
    }
}

// Determine file type from extension
function getFileType(path) {
    const ext = path.split('.').pop()?.toLowerCase();
    if (['mp3', 'm4a', 'wav', 'flac', 'ogg'].includes(ext)) {
        return 'audio';
    } else if (ext === 'mp4') {
        return 'video';
    }
    return 'audio';
}

// Scan directory for music files (backend integration)
async function scanDirectoryForMusic() {
    try {
        if (window.__TAURI__) {
            const { open } = window.__TAURI__.dialog;
            const selected = await open({
                multiple: false,
                directory: true,
                title: 'Select Music Folder'
            });
            
            if (selected) {
                UI.showLoadingMessage('Scanning directory for music files...');
                
                // Listen for scan progress
                const unlisten = await window.__TAURI__.event.listen('scan-progress', (event) => {
                    UI.updateLoadingMessage(event.payload);
                });
                
                const musicFiles = await window.__TAURI__.invoke('scan_directory', { 
                    path: selected 
                });
                
                unlisten();
                UI.hideLoadingMessage();
                
                // Update state with new files
                const newFiles = musicFiles.map(item => ({
                    ...item,
                    url: item.path,
                    type: getFileType(item.path),
                    addedDate: item.added_date * 1000
                }));
                
                state.library = [...state.library, ...newFiles];
                renderAll();
                UI.updateLibraryStats(state.library);
                
                showSuccessMessage(`Added ${newFiles.length} music files to library`);
            }
        }
    } catch (error) {
        console.error('Failed to scan directory:', error);
        UI.hideLoadingMessage();
        showError('Failed to scan directory');
    }
}

async function loadState() {
    const stored = await Storage.loadFromLocalStorage();
    if (stored) {
        state.settings = stored.settings || state.settings;
        
        if (state.settings.fileMode) {
            document.querySelector(`input[name="file-mode"][value="${state.settings.fileMode}"]`).checked = true;
            UI.updateFileManagementUI(state.settings.fileMode);
        }
        
        if (state.settings.autoPlayNext !== undefined) {
            document.getElementById('auto-play-next').checked = state.settings.autoPlayNext;
        }
        
        if (state.settings.gaplessPlayback !== undefined) {
            document.getElementById('gapless-playback').checked = state.settings.gaplessPlayback;
        }
    }
    
    const volumeSlider = document.getElementById('volume-slider');
    if (volumeSlider) {
        volumeSlider.value = player.volume * 100;
    }
}

function setupEventListeners() {
    player.init();
    setupAudioEventListeners();
    setupDynamicEventListeners();
    setupModalEvents();
    setupSettingsListeners();
    setupPlaylistPopup();
    setupImageEditListeners();
    setupWatchFolderSelection();
    
    // Replace file input with directory scanning
    document.getElementById('add-files-btn').addEventListener('click', () => {
        scanDirectoryForMusic();
    });
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            if (view) switchView(view);
        });
    });
    
    document.querySelectorAll('.settings-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            UI.showModal('settings-modal');
        });
    });
    
    document.getElementById('create-playlist-btn').addEventListener('click', () => {
        UI.showPopup('create-playlist-popup');
    });
    
    document.getElementById('cancel-playlist-btn').addEventListener('click', () => {
        UI.hidePopup('create-playlist-popup');
    });
    
    document.getElementById('confirm-playlist-btn').addEventListener('click', confirmCreatePlaylist);
    document.getElementById('playlist-name-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') confirmCreatePlaylist();
    });
    
    document.getElementById('play-btn').addEventListener('click', handlePlayPause);
    document.getElementById('prev-btn').addEventListener('click', playPrevious);
    document.getElementById('next-btn').addEventListener('click', playNext);
    
    document.getElementById('progress-bar').addEventListener('click', handleSeek);
    
    document.getElementById('shuffle-btn').addEventListener('click', toggleShuffle);
    document.getElementById('queue-toggle').addEventListener('click', toggleQueue);
    document.getElementById('repeat-btn').addEventListener('click', toggleRepeat);
    
    document.getElementById('queue-clear').addEventListener('click', clearQueue);
    
    document.getElementById('volume-slider').addEventListener('input', (e) => {
        player.volume = e.target.value / 100;
        player.audio.volume = player.volume;
    });
    
    document.addEventListener('keydown', handleKeyboard);
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu') && !e.target.closest('.add-playlist-popup')) {
            hideContextMenu();
        }
    });
}

function setupWatchFolderSelection() {
    const selectFolderBtn = document.getElementById('select-watch-folder');
    if (selectFolderBtn) {
        selectFolderBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.webkitdirectory = true;
            input.directory = true;
            input.style.display = 'none';
            
            input.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    let folderName = 'Selected folder';
                    if (files[0].webkitRelativePath) {
                        const pathParts = files[0].webkitRelativePath.split('/');
                        folderName = pathParts[0];
                    }
                    
                    const musicFiles = files.filter(file => 
                        file.type.startsWith('audio/') || 
                        file.type === 'video/mp4' ||
                        /\.(mp3|m4a|wav|flac|ogg|mp4)$/i.test(file.name)
                    );
                    
                    if (musicFiles.length > 0) {
                        showFolderConfirmation(folderName, musicFiles);
                    } else {
                        document.getElementById('current-watch-folder').textContent = 'No music files found';
                    }
                }
                
                document.body.removeChild(input);
            });
            
            document.body.appendChild(input);
            input.click();
        });
    }
}

function showFolderConfirmation(folderName, musicFiles) {
    const confirmModal = document.createElement('div');
    confirmModal.className = 'modal active';
    confirmModal.style.zIndex = '3000';
    
    confirmModal.innerHTML = `
        <div class="modal-content small">
            <div class="modal-header">
                <h2>CONFIRM FOLDER IMPORT</h2>
            </div>
            <div class="modal-body">
                <p style="margin-bottom: 15px;">Import ${musicFiles.length} music files from:</p>
                <p style="font-weight: bold; margin-bottom: 20px; color: #ffffff;">${folderName}</p>
                <div class="modal-btn-group">
                    <button class="modal-btn secondary" id="folder-cancel">CANCEL</button>
                    <button class="modal-btn" id="folder-import">IMPORT</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmModal);
    
    document.getElementById('folder-cancel').addEventListener('click', () => {
        document.body.removeChild(confirmModal);
    });
    
    document.getElementById('folder-import').addEventListener('click', async () => {
        document.body.removeChild(confirmModal);
        
        state.settings.watchFolder = folderName;
        document.getElementById('current-watch-folder').textContent = `Importing from ${folderName}...`;
        
        let addedCount = 0;
        for (const file of musicFiles) {
            const added = await addFileToLibrary(file);
            if (added) addedCount++;
        }
        
        if (addedCount > 0) {
            renderAll();
            UI.updateLibraryStats(state.library);
            document.getElementById('current-watch-folder').textContent = `${folderName} (${addedCount} files)`;
            showSuccessMessage(`Added ${addedCount} music files from "${folderName}"`);
        }
        
        saveSettings();
    });
}

function setupAudioEventListeners() {
    const audio = document.getElementById('audio-player');
    
    audio.addEventListener('timeupdate', () => {
        UI.updateProgress(audio.currentTime, audio.duration);
    });
    
    audio.addEventListener('play', () => {
        UI.updatePlayButton(true);
    });
    
    audio.addEventListener('pause', () => {
        UI.updatePlayButton(false);
    });
    
    audio.addEventListener('ended', handleSongEnd);
    
    audio.addEventListener('loadedmetadata', () => {
        UI.updateProgress(audio.currentTime, audio.duration);
    });
    
    audio.addEventListener('loadeddata', () => {
        if (!audio.paused) {
            UI.updatePlayButton(true);
        }
    });
    
    document.addEventListener('playerError', (e) => {
        console.error('Player error:', e.detail);
        showError('Failed to play track');
    });
}

function setupDynamicEventListeners() {
    document.addEventListener('click', (e) => {
        if (e.target.closest('.media-item') && !e.target.closest('.add-queue-btn') && !e.target.closest('.edit-thumb-btn')) {
            const item = e.target.closest('.media-item');
            const id = item.dataset.id;
            const mediaItem = state.library.find(i => i.id == id);
            if (mediaItem) {
                playItem(mediaItem);
            }
        }
        
        if (e.target.closest('.playlist-action-btn')) {
            e.stopPropagation();
            const btn = e.target.closest('.playlist-action-btn');
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            const playlist = state.playlists.find(p => p.id == id);
            
            if (playlist) {
                if (action === 'queue') {
                    playlist.songs.forEach(song => addToQueue(song));
                } else if (action === 'expand') {
                    showFullPlaylist(playlist);
                }
            }
        }
        
        if (e.target.closest('.playlist-song-item') && !e.target.closest('.add-queue-btn')) {
            const songItem = e.target.closest('.playlist-song-item');
            const songId = songItem.dataset.id;
            const song = state.library.find(i => i.id == songId);
            if (song) playItem(song);
        }
        
        if (e.target.closest('.add-queue-btn')) {
            e.stopPropagation();
            const btn = e.target.closest('.add-queue-btn');
            const id = btn.dataset.id;
            const item = state.library.find(i => i.id == id);
            if (item) addToQueue(item);
        }
        
        if (e.target.closest('.edit-thumb-btn')) {
            e.stopPropagation();
            const btn = e.target.closest('.edit-thumb-btn');
            const id = btn.dataset.id;
            const item = state.library.find(i => i.id == id);
            if (item) showEditImageModal(item);
        }
        
        if (e.target.closest('.queue-item') && !e.target.closest('.queue-item-remove')) {
            const index = parseInt(e.target.closest('.queue-item').dataset.index);
            playQueueIndex(index);
        }
        
        if (e.target.classList.contains('queue-item-remove')) {
            const index = parseInt(e.target.dataset.index);
            removeFromQueue(index);
        }
    });
    
    document.addEventListener('contextmenu', (e) => {
        const mediaItem = e.target.closest('.media-item');
        const playlistItem = e.target.closest('.playlist-item');
        const playlistSong = e.target.closest('.playlist-song-item');
        
        if (mediaItem) {
            e.preventDefault();
            const id = mediaItem.dataset.id;
            const item = state.library.find(i => i.id == id);
            if (item) showContextMenu(e, item, 'media');
        } else if (playlistItem && !playlistSong) {
            e.preventDefault();
            const id = playlistItem.dataset.id;
            const playlist = state.playlists.find(p => p.id == id);
            if (playlist) showContextMenu(e, playlist, 'playlist');
        } else if (playlistSong) {
            e.preventDefault();
            const id = playlistSong.dataset.id;
            const song = state.library.find(i => i.id == id);
            if (song) showContextMenu(e, song, 'media');
        }
    });
}

function setupModalEvents() {
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    document.getElementById('delete-cancel').addEventListener('click', () => {
        UI.hideModal('delete-modal');
    });
    
    document.getElementById('delete-confirm').addEventListener('click', confirmDelete);

    document.getElementById('rename-confirm').addEventListener('click', confirmRename);
    document.getElementById('rename-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') confirmRename();
    });
}

function setupSettingsListeners() {
    document.querySelectorAll('input[name="file-mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.settings.fileMode = e.target.value;
            UI.updateFileManagementUI(e.target.value);
            saveSettings();
        });
    });
    
    document.getElementById('auto-play-next').addEventListener('change', (e) => {
        state.settings.autoPlayNext = e.target.checked;
        saveSettings();
    });
    
    document.getElementById('gapless-playback').addEventListener('change', (e) => {
        state.settings.gaplessPlayback = e.target.checked;
        saveSettings();
    });
}

function setupPlaylistPopup() {
    const quickInput = document.getElementById('playlist-popup-quick-input');
    if (quickInput) {
        quickInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const name = quickInput.value.trim();
                if (name && state.contextItem) {
                    const playlist = {
                        id: Date.now(),
                        name: name,
                        songs: [state.contextItem],
                        created: Date.now()
                    };
                    state.playlists.push(playlist);
                    await Storage.savePlaylist(playlist);
                    quickInput.value = '';
                    updatePlaylistPopup();
                    showSuccessMessage(`Added "${state.contextItem.name}" to new playlist "${name}"`);
                }
            }
        });
    }
    
    document.addEventListener('click', (e) => {
        const popup = document.getElementById('add-playlist-popup');
        if (!e.target.closest('.add-playlist-popup') && !e.target.closest('.menu-item[data-action="add-playlist"]')) {
            popup.classList.remove('active');
        }
    });
}

function showAddToPlaylistPopup(item, event) {
    state.contextItem = item;
    updatePlaylistPopup();
    
    const popup = document.getElementById('add-playlist-popup');
    const menu = document.getElementById('context-menu');
    const menuRect = menu.getBoundingClientRect();
    
    if (window.innerWidth - menuRect.right > 270) {
        popup.style.left = (menuRect.right + 5) + 'px';
    } else {
        popup.style.left = (menuRect.left - 270) + 'px';
    }
    popup.style.top = menuRect.top + 'px';
    
    popup.classList.add('active');
}

function updatePlaylistPopup() {
    const list = document.getElementById('playlist-popup-list');
    list.innerHTML = '';
    
    if (!state.contextItem) return;
    
    state.playlists.forEach(playlist => {
        const div = document.createElement('div');
        div.className = 'menu-item';
        div.style.padding = '8px 12px';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.gap = '10px';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `playlist-popup-check-${playlist.id}`;
        checkbox.checked = playlist.songs.some(s => s.id === state.contextItem.id);
        checkbox.style.cursor = 'pointer';
        
        checkbox.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (checkbox.checked) {
                await addToPlaylist(playlist, state.contextItem);
                showSuccessMessage(`Added to "${playlist.name}"`);
            } else {
                await removeFromPlaylist(playlist, state.contextItem);
                showSuccessMessage(`Removed from "${playlist.name}"`);
            }
        });
        
        const label = document.createElement('label');
        label.setAttribute('for', `playlist-popup-check-${playlist.id}`);
        label.textContent = playlist.name;
        label.style.flex = '1';
        label.style.cursor = 'pointer';
        label.style.color = '#cccccc';
        label.style.userSelect = 'none';
        
        label.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        div.appendChild(checkbox);
        div.appendChild(label);
        list.appendChild(div);
    });
    
    if (state.playlists.length === 0) {
        list.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No playlists yet. Create one above!</div>';
    }
}

function showSuccessMessage(message) {
    console.log(message);
}

async function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    
    for (const file of files) {
        await addFileToLibrary(file);
    }

    renderAll();
    UI.updateLibraryStats(state.library);
}

async function addFileToLibrary(file) {
    if (file.type.startsWith('audio/') || file.type === 'video/mp4') {
        const url = URL.createObjectURL(file);
        
        const mediaItem = {
            id: Date.now() + Math.random(),
            name: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
            fileName: file.name,
            file: file,
            url: url,
            type: file.type.startsWith('audio/') ? 'audio' : 'video',
            addedDate: Date.now()
        };

        if (mediaItem.type === 'video') {
            mediaItem.thumbnail = await extractVideoThumbnail(file);
        }

        state.library.push(mediaItem);
        
        const itemToSave = { ...mediaItem };
        delete itemToSave.file;
        await Storage.saveLibraryItem(itemToSave);
        
        console.log('Added file to library:', mediaItem.name, 'URL:', mediaItem.url);
        return true;
    }
    return false;
}

async function extractVideoThumbnail(file) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.currentTime = 5;
        
        video.addEventListener('loadeddata', () => {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');
            
            const size = Math.min(video.videoWidth, video.videoHeight);
            const x = (video.videoWidth - size) / 2;
            const y = (video.videoHeight - size) / 2;
            
            ctx.drawImage(video, x, y, size, size, 0, 0, 400, 400);
            resolve(canvas.toDataURL());
            URL.revokeObjectURL(video.src);
        });
        
        video.addEventListener('error', () => {
            resolve(null);
        });
    });
}

async function playItem(item) {
    console.log('Playing item:', item.name, 'URL:', item.url, 'Has file:', !!item.file);
    
    state.recentlyPlayed = state.recentlyPlayed.filter(i => i.id !== item.id);
    state.recentlyPlayed.unshift(item);
    if (state.recentlyPlayed.length > 10) state.recentlyPlayed.pop();
    
    const index = state.library.findIndex(i => i.id === item.id);
    state.queue = [...state.library.slice(index), ...state.library.slice(0, index)];
    state.currentIndex = 0;
    
    if (state.shuffle) {
        generateShuffleOrder();
    }
    
    await loadAndPlay();
    Storage.saveToLocalStorage(state);
}

function generateShuffleOrder() {
    state.shuffleOrder = [];
    for (let i = 0; i < state.queue.length; i++) {
        state.shuffleOrder.push(i);
    }
    
    const currentSongIndex = 0;
    state.shuffleOrder.splice(currentSongIndex, 1);
    
    for (let i = state.shuffleOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.shuffleOrder[i], state.shuffleOrder[j]] = [state.shuffleOrder[j], state.shuffleOrder[i]];
    }
    
    state.shuffleOrder.unshift(currentSongIndex);
}

async function loadAndPlay() {
    if (state.currentIndex < 0 || state.currentIndex >= state.queue.length) return;
    
    let actualIndex = state.currentIndex;
    
    if (state.shuffle && state.shuffleOrder.length === state.queue.length) {
        actualIndex = state.shuffleOrder[state.currentIndex];
    }
    
    const item = state.queue[actualIndex];
    const loaded = await player.loadTrack(item);
    
    if (loaded) {
        const success = await player.play();
        if (success) {
            UI.updatePlayButton(true);
        }
        updateQueueDisplay();
        renderAll();
    }
}

async function handlePlayPause() {
    if (!player.currentTrack && state.queue.length > 0) {
        await loadAndPlay();
    } else if (player.currentTrack) {
        if (player.paused) {
            const success = await player.play();
            if (success) {
                UI.updatePlayButton(true);
            }
        } else {
            player.pause();
            UI.updatePlayButton(false);
        }
    }
}

function playNext() {
    if (state.currentIndex < state.queue.length - 1) {
        state.currentIndex++;
        loadAndPlay();
    } else if (state.repeat) {
        state.currentIndex = 0;
        if (state.shuffle) {
            generateShuffleOrder();
        }
        loadAndPlay();
    }
}

function playPrevious() {
    if (player.currentTime > 3) {
        player.seek(0);
    } else if (state.currentIndex > 0) {
        state.currentIndex--;
        loadAndPlay();
    }
}

function playQueueIndex(index) {
    if (state.shuffle && state.shuffleOrder.length > 0) {
        const shufflePos = state.shuffleOrder.indexOf(index);
        if (shufflePos > -1) {
            state.currentIndex = shufflePos;
        }
    } else {
        state.currentIndex = index;
    }
    loadAndPlay();
}

function handleSeek(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    player.seekPercent(percent);
}

function handleSongEnd() {
    if (state.repeat && !state.shuffle && state.queue.length === 1) {
        player.seek(0);
        player.play();
    } else if (state.settings.autoPlayNext) {
        playNext();
    }
}

function addToQueue(item) {
    state.queue.push(item);
    if (state.shuffle && state.shuffleOrder.length > 0) {
        state.shuffleOrder.push(state.queue.length - 1);
    }
    updateQueueDisplay();
}

function removeFromQueue(index) {
    if (index === state.currentIndex) return;
    
    state.queue.splice(index, 1);
    
    if (state.shuffle && state.shuffleOrder.length > 0) {
        const shuffleIndex = state.shuffleOrder.indexOf(index);
        if (shuffleIndex > -1) {
            state.shuffleOrder.splice(shuffleIndex, 1);
        }
        
        for (let i = 0; i < state.shuffleOrder.length; i++) {
            if (state.shuffleOrder[i] > index) {
                state.shuffleOrder[i]--;
            }
        }
        
        if (shuffleIndex < state.currentIndex) {
            state.currentIndex--;
        }
    } else {
        if (state.currentIndex > index) {
            state.currentIndex--;
        }
    }
    
    updateQueueDisplay();
}

function clearQueue() {
    const current = state.queue[state.currentIndex];
    state.queue = current ? [current] : [];
    state.currentIndex = 0;
    state.shuffleOrder = [0];
    updateQueueDisplay();
}

function updateQueueDisplay() {
    const list = document.getElementById('queue-list');
    const count = document.getElementById('queue-count');
    
    list.innerHTML = '';
    count.textContent = state.queue.length;
    
    let actualPlayingIndex = state.currentIndex;
    if (state.shuffle && state.shuffleOrder.length === state.queue.length) {
        actualPlayingIndex = state.shuffleOrder[state.currentIndex];
    }
    
    state.queue.forEach((item, index) => {
        const element = UI.createQueueItem(item, index, index === actualPlayingIndex);
        list.appendChild(element);
    });
}

function switchView(viewName) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    document.getElementById(`${viewName}-view`).classList.add('active');
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
    
    document.getElementById('playlist-full-view').classList.remove('active');
    
    state.currentView = viewName;
}

function toggleQueue() {
    const panel = document.getElementById('queue-panel');
    panel.classList.toggle('active');
    document.getElementById('queue-toggle').classList.toggle('active');
}

function toggleRepeat() {
    state.repeat = !state.repeat;
    document.getElementById('repeat-btn').classList.toggle('active', state.repeat);
}

function toggleShuffle() {
    state.shuffle = !state.shuffle;
    document.getElementById('shuffle-btn').classList.toggle('active', state.shuffle);
    
    if (state.shuffle && state.queue.length > 0) {
        generateShuffleOrder();
    }
}

function showContextMenu(event, item, type = 'media') {
    state.contextItem = item;
    state.contextEvent = event;
    
    const menu = document.getElementById('context-menu');
    
    const playlistMenuItem = menu.querySelector('[data-action="add-playlist"]');
    const editImageMenuItem = menu.querySelector('[data-action="edit-image"]');
    
    if (type === 'playlist') {
        playlistMenuItem.style.display = 'none';
        state.contextItem.type = 'playlist';
    } else {
        playlistMenuItem.style.display = 'block';
        if (state.contextItem.type === 'playlist') {
            delete state.contextItem.type;
        }
    }
    
    const x = Math.min(event.pageX, window.innerWidth - 200);
    const y = Math.min(event.pageY, window.innerHeight - 200);
    
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.add('active');
    
    menu.querySelectorAll('.menu-item').forEach(menuItem => {
        menuItem.onclick = (e) => {
            e.stopPropagation();
            const action = menuItem.dataset.action;
            
            if (action === 'add-playlist') {
                handleContextAction(action, item, type);
            } else {
                handleContextAction(action, item, type);
                hideContextMenu();
            }
        };
    });
}

function hideContextMenu() {
    document.getElementById('context-menu').classList.remove('active');
    document.getElementById('add-playlist-popup').classList.remove('active');
}

function handleContextAction(action, item, type) {
    switch (action) {
        case 'play':
            if (type === 'playlist') {
                playPlaylist(item);
            } else {
                playItem(item);
            }
            break;
        case 'add-queue':
            if (type === 'media') {
                addToQueue(item);
            }
            break;
        case 'add-playlist':
            if (type === 'media') {
                showAddToPlaylistPopup(item, state.contextEvent);
            }
            break;
        case 'edit-image':
            if (type === 'playlist') {
                showEditPlaylistImageModal(item);
            } else {
                showEditImageModal(item);
            }
            break;
        case 'rename':
            showRenameModal(item);
            break;
        case 'delete':
            showDeleteModal(item);
            break;
    }
}

function showDeleteModal(item) {
    state.deleteItem = item;
    const text = item.type === 'playlist' 
        ? `Are you sure you want to delete the playlist "${item.name}"?`
        : `Are you sure you want to delete "${item.name}"?`;
    document.getElementById('delete-modal-text').textContent = text;
    UI.showModal('delete-modal');
}

async function confirmDelete() {
    if (!state.deleteItem) return;
    
    const item = state.deleteItem;
    
    if (item.type === 'playlist') {
        const index = state.playlists.findIndex(p => p.id === item.id);
        if (index > -1) {
            state.playlists.splice(index, 1);
            await Storage.deletePlaylist(item.id);
            renderPlaylists();
        }
    } else {
        const index = state.library.findIndex(i => i.id === item.id);
        
        if (index > -1) {
            state.library.splice(index, 1);
            await Storage.deleteLibraryItem(item.id);
            
            const queueIndex = state.queue.findIndex(i => i.id === item.id);
            if (queueIndex > -1) {
                if (queueIndex === state.currentIndex) {
                    player.pause();
                }
                removeFromQueue(queueIndex);
            }
            
            state.playlists.forEach(async playlist => {
                const songIndex = playlist.songs.findIndex(s => s.id === item.id);
                if (songIndex > -1) {
                    playlist.songs.splice(songIndex, 1);
                    await Storage.savePlaylist(playlist);
                }
            });
            
            renderAll();
            UI.updateLibraryStats(state.library);
        }
    }
    
    UI.hideModal('delete-modal');
    state.deleteItem = null;
}

function showRenameModal(item) {
    state.renameItem = item;
    const input = document.getElementById('rename-input');
    input.value = item.name;
    UI.showModal('rename-modal');
    setTimeout(() => input.select(), 100);
}

async function confirmRename() {
    const newName = document.getElementById('rename-input').value.trim();
    if (newName && state.renameItem) {
        state.renameItem.name = newName;
        
        if (state.renameItem.type === 'playlist') {
            await Storage.savePlaylist(state.renameItem);
            renderPlaylists();
        } else {
            await Storage.saveLibraryItem(state.renameItem);
            renderAll();
        }
        
        UI.hideModal('rename-modal');
    }
}

function showEditImageModal(item) {
    state.editImageItem = item;
    
    const preview = document.getElementById('current-image-preview');
    preview.innerHTML = '';
    
    if (item.thumbnail) {
        const img = document.createElement('img');
        img.src = item.thumbnail;
        img.style.width = '100%';
        img.style.maxHeight = '200px';
        img.style.objectFit = 'contain';
        preview.appendChild(img);
    } else {
        preview.innerHTML = '<div style="padding: 40px; text-align: center; color: #666;">No image</div>';
    }
    
    UI.showModal('edit-image-modal');
}

function showEditPlaylistImageModal(playlist) {
    state.editImageItem = playlist;
    
    const preview = document.getElementById('current-image-preview');
    preview.innerHTML = '';
    
    if (playlist.cover) {
        const img = document.createElement('img');
        img.src = playlist.cover;
        img.style.width = '100%';
        img.style.maxHeight = '200px';
        img.style.objectFit = 'contain';
        preview.appendChild(img);
    } else {
        preview.innerHTML = '<div style="padding: 40px; text-align: center; color: #666;">No cover image</div>';
    }
    
    const fileInput = document.getElementById('image-file-input');
    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);
    
    newFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                playlist.cover = event.target.result;
                await Storage.savePlaylist(playlist);
                renderPlaylists();
                UI.hideModal('edit-image-modal');
            };
            reader.readAsDataURL(file);
        }
    });
    
    const removeBtn = document.getElementById('remove-image-btn');
    const newRemoveBtn = removeBtn.cloneNode(true);
    removeBtn.parentNode.replaceChild(newRemoveBtn, removeBtn);
    
    newRemoveBtn.addEventListener('click', async () => {
        playlist.cover = null;
        await Storage.savePlaylist(playlist);
        renderPlaylists();
        UI.hideModal('edit-image-modal');
    });
    
    UI.showModal('edit-image-modal');
}

function confirmCreatePlaylist() {
    const name = document.getElementById('playlist-name-input').value.trim();
    if (name) {
        createPlaylist(name);
        document.getElementById('playlist-name-input').value = '';
        UI.hidePopup('create-playlist-popup');
    }
}

async function createPlaylist(name) {
    const playlist = {
        id: Date.now(),
        name: name,
        songs: [],
        created: Date.now()
    };
    state.playlists.push(playlist);
    await Storage.savePlaylist(playlist);
    renderPlaylists();
}

async function addToPlaylist(playlist, item) {
    if (!playlist.songs.find(s => s.id === item.id)) {
        playlist.songs.push(item);
        await Storage.savePlaylist(playlist);
        renderPlaylists();
    }
}

async function removeFromPlaylist(playlist, item) {
    const index = playlist.songs.findIndex(s => s.id === item.id);
    if (index > -1) {
        playlist.songs.splice(index, 1);
        await Storage.savePlaylist(playlist);
        renderPlaylists();
    }
}

function playPlaylist(playlist) {
    if (playlist.songs.length > 0) {
        state.queue = [...playlist.songs];
        state.currentIndex = 0;
        if (state.shuffle) {
            generateShuffleOrder();
        }
        loadAndPlay();
    }
}

function showFullPlaylist(playlist) {
    const fullView = document.getElementById('playlist-full-view');
    const header = document.getElementById('playlist-full-header');
    const songsList = document.getElementById('playlist-full-songs');
    
    header.innerHTML = `
        <div class="playlist-full-cover ${!playlist.cover ? 'empty' : ''}">
            ${playlist.cover 
                ? `<img src="${playlist.cover}" alt="${playlist.name}">`
                : generatePlaylistCoverHTML(playlist)
            }
        </div>
        <div class="playlist-full-info">
            <div class="playlist-full-title">${playlist.name}</div>
            <div class="playlist-full-meta">${playlist.songs.length} songs</div>
        </div>
    `;
    
    songsList.innerHTML = '';
    let actualPlayingIndex = state.currentIndex;
    if (state.shuffle && state.shuffleOrder.length === state.queue.length) {
        actualPlayingIndex = state.shuffleOrder[state.currentIndex];
    }
    const currentId = state.queue[actualPlayingIndex]?.id;
    
    playlist.songs.forEach((song, index) => {
        const row = document.createElement('div');
        row.className = 'playlist-song-row';
        if (song.id === currentId) {
            row.classList.add('playing');
        }
        
        row.innerHTML = `
            <div class="playlist-song-number">${index + 1}</div>
            <div class="playlist-song-row-thumb">
                ${song.thumbnail ? `<img src="${song.thumbnail}" alt="${song.name}">` : ''}
            </div>
            <div class="playlist-song-row-info">
                <div class="playlist-song-row-title">${song.name}</div>
                <div class="playlist-song-row-artist">${song.artist || song.type?.toUpperCase() || 'UNKNOWN'}</div>
            </div>
            <div class="playlist-song-row-actions">
                <button class="playlist-song-row-btn" data-action="queue" data-id="${song.id}">+</button>
                <button class="playlist-song-row-btn" data-action="remove" data-id="${song.id}">×</button>
            </div>
        `;
        
        row.addEventListener('click', (e) => {
            if (!e.target.closest('.playlist-song-row-btn')) {
                playItem(song);
            }
        });
        
        const queueBtn = row.querySelector('[data-action="queue"]');
        queueBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addToQueue(song);
        });
        
        const removeBtn = row.querySelector('[data-action="remove"]');
        removeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await removeFromPlaylist(playlist, song);
            showFullPlaylist(playlist);
        });
        
        songsList.appendChild(row);
    });
    
    fullView.classList.add('active');
    
    const closeBtn = document.getElementById('playlist-close-btn');
    if (closeBtn) {
        closeBtn.onclick = () => {
            fullView.classList.remove('active');
        };
    }
}

function generatePlaylistCoverHTML(playlist) {
    const songsWithThumbs = playlist.songs.filter(s => s.thumbnail).slice(0, 4);
    let html = '';
    for (let i = 0; i < 4; i++) {
        html += `<div class="mini-thumb">`;
        if (songsWithThumbs[i]) {
            html += `<img src="${songsWithThumbs[i].thumbnail}">`;
        }
        html += `</div>`;
    }
    return html;
}

function handleKeyboard(event) {
    if (event.target.tagName === 'INPUT') return;
    
    switch (event.code) {
        case 'Space':
            event.preventDefault();
            handlePlayPause();
            break;
        case 'ArrowRight':
            if (event.ctrlKey) playNext();
            break;
        case 'ArrowLeft':
            if (event.ctrlKey) playPrevious();
            break;
    }
}

function renderAll() {
    renderLibrary();
    renderRecentlyAdded();
    renderRecentlyPlayed();
    renderPlaylists();
    updateQueueDisplay();
}

function renderLibrary() {
    const grid = document.getElementById('library-grid');
    grid.innerHTML = '';
    
    let actualPlayingIndex = state.currentIndex;
    if (state.shuffle && state.shuffleOrder.length === state.queue.length && state.currentIndex < state.shuffleOrder.length) {
        actualPlayingIndex = state.shuffleOrder[state.currentIndex];
    }
    const currentId = state.queue[actualPlayingIndex]?.id;
    
    state.library.forEach(item => {
        const element = UI.createMediaItem(item, item.id === currentId);
        grid.appendChild(element);
    });
}

function renderRecentlyAdded() {
    const grid = document.getElementById('recently-added-grid');
    grid.innerHTML = '';
    
    let actualPlayingIndex = state.currentIndex;
    if (state.shuffle && state.shuffleOrder.length === state.queue.length && state.currentIndex < state.shuffleOrder.length) {
        actualPlayingIndex = state.shuffleOrder[state.currentIndex];
    }
    const currentId = state.queue[actualPlayingIndex]?.id;
    
    const recent = [...state.library]
        .sort((a, b) => b.addedDate - a.addedDate)
        .slice(0, 5);
    
    recent.forEach(item => {
        const element = UI.createMediaItem(item, item.id === currentId);
        grid.appendChild(element);
    });
}

function renderRecentlyPlayed() {
    const grid = document.getElementById('recently-played-grid');
    grid.innerHTML = '';
    
    let actualPlayingIndex = state.currentIndex;
    if (state.shuffle && state.shuffleOrder.length === state.queue.length && state.currentIndex < state.shuffleOrder.length) {
        actualPlayingIndex = state.shuffleOrder[state.currentIndex];
    }
    const currentId = state.queue[actualPlayingIndex]?.id;
    
    state.recentlyPlayed.slice(0, 5).forEach(item => {
        const element = UI.createMediaItem(item, item.id === currentId);
        grid.appendChild(element);
    });
}

function renderPlaylists() {
    const container = document.getElementById('playlists-container');
    container.innerHTML = '';
    container.className = 'playlists-container';
    
    if (state.playlists.length > 0) {
        state.playlists.forEach(playlist => {
            const element = UI.createPlaylistItem(playlist);
            container.appendChild(element);
        });
    } else {
        container.innerHTML = '<div style="text-align: center; color: #666; padding: 40px;">No playlists yet. Click CREATE to make one!</div>';
    }
}

async function saveSettings() {
    await Storage.saveSetting('settings', state.settings);
}

function showError(message) {
    console.error(message);
}

function setupImageEditListeners() {
    document.getElementById('select-image-btn').addEventListener('click', () => {
        document.getElementById('image-file-input').click();
    });
    
    document.getElementById('image-file-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (state.editImageItem) {
                    state.editImageItem.thumbnail = event.target.result;
                    await Storage.saveLibraryItem(state.editImageItem);
                    renderAll();
                    UI.hideModal('edit-image-modal');
                }
            };
            reader.readAsDataURL(file);
        }
    });
    
    document.getElementById('remove-image-btn').addEventListener('click', async () => {
        if (state.editImageItem) {
            state.editImageItem.thumbnail = null;
            await Storage.saveLibraryItem(state.editImageItem);
            renderAll();
            UI.hideModal('edit-image-modal');
        }
    });
    
    const closeBtn = document.getElementById('playlist-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('playlist-full-view').classList.remove('active');
        });
    }
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const fullView = document.getElementById('playlist-full-view');
            if (fullView.classList.contains('active')) {
                fullView.classList.remove('active');
            }
        }
    });
} 