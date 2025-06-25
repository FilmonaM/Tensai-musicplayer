// Storage management module
export const Storage = {
    STORAGE_KEY: 'tensai-music-state',
    DB_NAME: 'TensaiMusicDB',
    DB_VERSION: 1,
    
    // Initialize IndexedDB for better storage
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('library')) {
                    const libraryStore = db.createObjectStore('library', { keyPath: 'id' });
                    libraryStore.createIndex('name', 'name', { unique: false });
                    libraryStore.createIndex('addedDate', 'addedDate', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('playlists')) {
                    const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
                    playlistStore.createIndex('name', 'name', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    },
    
    // Save library item
    async saveLibraryItem(item) {
        const db = await this.initDB();
        const transaction = db.transaction(['library'], 'readwrite');
        const store = transaction.objectStore('library');
        
        const itemToSave = {
            id: item.id,
            name: item.name,
            fileName: item.fileName,
            filePath: item.filePath,
            url: item.url,
            type: item.type,
            thumbnail: item.thumbnail,
            addedDate: item.addedDate,
            duration: item.duration,
            artist: item.artist,
            album: item.album
        };
        
        console.log('Saving item to storage:', itemToSave.name, 'URL:', itemToSave.url);
        return store.put(itemToSave);
    },
    
    // Get all library items
    async getLibrary() {
        const db = await this.initDB();
        const transaction = db.transaction(['library'], 'readonly');
        const store = transaction.objectStore('library');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    // Delete library item
    async deleteLibraryItem(id) {
        const db = await this.initDB();
        const transaction = db.transaction(['library'], 'readwrite');
        const store = transaction.objectStore('library');
        return store.delete(id);
    },
    
    // Save playlist
    async savePlaylist(playlist) {
        const db = await this.initDB();
        const transaction = db.transaction(['playlists'], 'readwrite');
        const store = transaction.objectStore('playlists');
        return store.put(playlist);
    },
    
    // Get all playlists
    async getPlaylists() {
        const db = await this.initDB();
        const transaction = db.transaction(['playlists'], 'readonly');
        const store = transaction.objectStore('playlists');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    // Save settings
    async saveSetting(key, value) {
        const db = await this.initDB();
        const transaction = db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        return store.put({ key, value });
    },
    
    // Get setting
    async getSetting(key) {
        const db = await this.initDB();
        const transaction = db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result?.value);
            request.onerror = () => reject(request.error);
        });
    },
    
    // Legacy localStorage methods for backward compatibility
    saveToLocalStorage(state) {
        const toSave = {
            library: state.library.map(item => ({
                id: item.id,
                name: item.name,
                fileName: item.fileName,
                type: item.type,
                thumbnail: item.thumbnail,
                addedDate: item.addedDate
            })),
            playlists: state.playlists,
            recentlyPlayed: state.recentlyPlayed.slice(0, 10),
            settings: state.settings
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toSave));
    },
    
    loadFromLocalStorage() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
        return null;
    },
    
    async deletePlaylist(id) {
        const db = await this.initDB();
        const transaction = db.transaction(['playlists'], 'readwrite');
        const store = transaction.objectStore('playlists');
        return store.delete(id);
    },
    
    async clearAllData() {
        const db = await this.initDB();
        
        // Clear all object stores
        const transaction = db.transaction(['library', 'playlists', 'settings'], 'readwrite');
        
        await transaction.objectStore('library').clear();
        await transaction.objectStore('playlists').clear();
        await transaction.objectStore('settings').clear();
        
        return transaction.complete;
    }
}; 