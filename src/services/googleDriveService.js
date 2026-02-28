// ================================================
// Google Drive Service — REST API v3 with OAuth Sign-In
// ================================================

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const TOKEN_KEY = 'ai_story_gdrive_token';
const TOKEN_EXPIRY_KEY = 'ai_story_gdrive_token_expiry';
const USER_INFO_KEY = 'ai_story_gdrive_user';
const FOLDER_NAME = 'AI-Story-Writer';
const FILE_NAME = 'stories.json';

// Google OAuth 2.0 config (public client ID — safe to expose in frontend)
const GOOGLE_CLIENT_ID = '169266809896-pbqghr785glseutndai6jovoucf7n71q.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

export const GoogleDriveService = {

    // ── Token Management ──────────────────────────────
    setToken(token, expiresIn = 3600) {
        localStorage.setItem(TOKEN_KEY, token.trim());
        const expiresAt = Date.now() + expiresIn * 1000;
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());
    },

    getToken() {
        const token = localStorage.getItem(TOKEN_KEY) || '';
        // Check expiry
        const expiry = parseInt(localStorage.getItem(TOKEN_EXPIRY_KEY) || '0');
        if (token && expiry && Date.now() > expiry) {
            // Token expired
            this.clearToken();
            return '';
        }
        return token;
    },

    clearToken() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        localStorage.removeItem(USER_INFO_KEY);
    },

    isConnected() {
        return !!this.getToken();
    },

    // ── Saved User Info ───────────────────────────────
    getSavedUser() {
        try {
            const data = localStorage.getItem(USER_INFO_KEY);
            return data ? JSON.parse(data) : null;
        } catch { return null; }
    },

    saveUser(info) {
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(info));
    },

    // ── Google OAuth Sign-In (popup flow) ─────────────
    async signIn() {
        return new Promise((resolve, reject) => {
            const redirectUri = window.location.origin + '/oauth-callback.html';
            const state = crypto.randomUUID?.() || Math.random().toString(36).substr(2);

            const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
            authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
            authUrl.searchParams.set('redirect_uri', redirectUri);
            authUrl.searchParams.set('response_type', 'token');
            authUrl.searchParams.set('scope', SCOPES);
            authUrl.searchParams.set('state', state);
            authUrl.searchParams.set('prompt', 'select_account');

            const width = 500, height = 600;
            const left = (screen.width - width) / 2;
            const top = (screen.height - height) / 2;

            const popup = window.open(
                authUrl.toString(),
                'GoogleSignIn',
                `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
            );

            if (!popup) {
                reject(new Error('Popup bị chặn. Vui lòng cho phép popup cho trang này.'));
                return;
            }

            // Listen for message from callback page
            const handleMessage = (event) => {
                if (event.origin !== window.location.origin) return;
                if (event.data?.type !== 'GOOGLE_OAUTH_CALLBACK') return;

                window.removeEventListener('message', handleMessage);
                clearInterval(pollTimer);

                if (event.data.error) {
                    reject(new Error(event.data.error));
                    return;
                }

                const { access_token, expires_in } = event.data;
                if (access_token) {
                    this.setToken(access_token, parseInt(expires_in) || 3600);
                    resolve({ access_token, expires_in });
                } else {
                    reject(new Error('Không nhận được token từ Google.'));
                }
            };

            window.addEventListener('message', handleMessage);

            // Poll for popup close (user cancelled)
            const pollTimer = setInterval(() => {
                if (popup.closed) {
                    clearInterval(pollTimer);
                    window.removeEventListener('message', handleMessage);
                    reject(new Error('Đăng nhập bị hủy.'));
                }
            }, 500);
        });
    },

    signOut() {
        const token = this.getToken();
        if (token) {
            // Revoke token (best-effort, don't wait)
            fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }).catch(() => { });
        }
        this.clearToken();
    },

    // ── Helpers ───────────────────────────────────────
    _headers() {
        return {
            'Authorization': `Bearer ${this.getToken()}`,
            'Content-Type': 'application/json'
        };
    },

    async _request(url, options = {}) {
        const res = await fetch(url, {
            ...options,
            headers: { ...this._headers(), ...options.headers }
        });
        if (res.status === 401) {
            // Token expired during request
            this.clearToken();
            throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
            throw new Error(err.error?.message || `Drive API error: ${res.status}`);
        }
        return res;
    },

    // ── Get User Profile ──────────────────────────────
    async getUserProfile() {
        const res = await this._request(`${DRIVE_API}/about?fields=user`);
        const data = await res.json();
        const userInfo = {
            email: data.user?.emailAddress || '',
            name: data.user?.displayName || '',
            photo: data.user?.photoLink || ''
        };
        this.saveUser(userInfo);
        return userInfo;
    },

    // ── Connection Test ───────────────────────────────
    async testConnection() {
        const userInfo = await this.getUserProfile();
        return {
            success: true,
            ...userInfo
        };
    },

    // ── Folder Operations ─────────────────────────────
    async findOrCreateFolder() {
        const query = `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        const searchRes = await this._request(
            `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`
        );
        const searchData = await searchRes.json();

        if (searchData.files?.length > 0) {
            return searchData.files[0].id;
        }

        const createRes = await this._request(`${DRIVE_API}/files`, {
            method: 'POST',
            body: JSON.stringify({
                name: FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder'
            })
        });
        const folder = await createRes.json();
        return folder.id;
    },

    // ── Find existing stories.json ────────────────────
    async _findFile(folderId) {
        const query = `name='${FILE_NAME}' and '${folderId}' in parents and trashed=false`;
        const res = await this._request(
            `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime,size)&spaces=drive`
        );
        const data = await res.json();
        return data.files?.[0] || null;
    },

    // ── Upload Stories ────────────────────────────────
    async uploadStories(stories) {
        const folderId = await this.findOrCreateFolder();
        const existing = await this._findFile(folderId);
        const content = JSON.stringify(stories, null, 2);

        if (existing) {
            const res = await fetch(
                `${UPLOAD_API}/files/${existing.id}?uploadType=media`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${this.getToken()}`,
                        'Content-Type': 'application/json'
                    },
                    body: content
                }
            );
            if (!res.ok) {
                if (res.status === 401) {
                    this.clearToken();
                    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                }
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error?.message || 'Upload failed');
            }
            return { updated: true, fileId: existing.id };
        } else {
            const metadata = {
                name: FILE_NAME,
                parents: [folderId],
                mimeType: 'application/json'
            };

            const boundary = '===BOUNDARY===';
            const body = [
                `--${boundary}`,
                'Content-Type: application/json; charset=UTF-8',
                '',
                JSON.stringify(metadata),
                `--${boundary}`,
                'Content-Type: application/json',
                '',
                content,
                `--${boundary}--`
            ].join('\r\n');

            const res = await fetch(
                `${UPLOAD_API}/files?uploadType=multipart`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.getToken()}`,
                        'Content-Type': `multipart/related; boundary=${boundary}`
                    },
                    body
                }
            );
            if (!res.ok) {
                if (res.status === 401) {
                    this.clearToken();
                    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                }
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error?.message || 'Upload failed');
            }
            const file = await res.json();
            return { updated: false, fileId: file.id };
        }
    },

    // ── Download Stories ──────────────────────────────
    async downloadStories() {
        const folderId = await this.findOrCreateFolder();
        const existing = await this._findFile(folderId);

        if (!existing) {
            return { found: false, stories: [] };
        }

        const res = await fetch(
            `${DRIVE_API}/files/${existing.id}?alt=media`,
            {
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            }
        );
        if (!res.ok) {
            if (res.status === 401) {
                this.clearToken();
                throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            }
            throw new Error('Download failed');
        }
        const stories = await res.json();
        return {
            found: true,
            stories,
            modifiedTime: existing.modifiedTime,
            size: existing.size
        };
    },

    // ── Get backup info ──────────────────────────────
    async getBackupInfo() {
        const folderId = await this.findOrCreateFolder();
        const existing = await this._findFile(folderId);
        if (!existing) return null;
        return {
            id: existing.id,
            name: existing.name,
            modifiedTime: existing.modifiedTime,
            size: existing.size
        };
    }
};
