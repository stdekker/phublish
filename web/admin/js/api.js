// API endpoints handler
const API = {
    fetchWithAuth(url, options = {}) {
        const headers = {
            ...options.headers,
            'X-Admin-Token': sessionStorage.getItem('adminToken'),
            'X-Requested-With': 'XMLHttpRequest'
        };
        return fetch(url, { 
            ...options, 
            headers,
            credentials: 'same-origin',
            mode: 'same-origin'
        });
        // Removed automatic redirect on 401 - let calling code handle session expiry
    },

    async listFiles() {
        const response = await this.fetchWithAuth('admin.php?op=list');
        if (response.status === 401) {
            throw new Error('Session expired');
        }
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `HTTP error! status: ${response.status}`);
        }
        return response.json();
    },

    async readFile(fileName) {
        const response = await fetch(`admin.php?op=read&file=${encodeURIComponent(fileName)}`, {
            credentials: 'same-origin',
            mode: 'same-origin',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            const text = await response.text();
            try {
                const err = JSON.parse(text);
                throw new Error(err.error);
            } catch (e) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        }
        return response.text();
    },

    async writeFile(fileName, content) {
        const response = await this.fetchWithAuth('admin.php?op=write', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ file: fileName, content })
        });
        if (response.status === 401) {
            throw new Error('Session expired');
        }
        return response.json();
    },

    async createFile(fileName) {
        const response = await this.fetchWithAuth('admin.php?op=create', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ file: fileName })
        });
        return response.ok;
    },

    async deleteFile(fileName) {
        const response = await this.fetchWithAuth('admin.php?op=delete', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ file: fileName })
        });
        if (response.status === 401) {
            throw new Error('Session expired');
        }
        return response.json();
    },

    async renameFile(oldFileName, newFileName) {
        const response = await this.fetchWithAuth('admin.php?op=rename', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                oldFile: oldFileName,
                newFile: newFileName
            })
        });
        return response.json();
    },

    async logout() {
        const response = await this.fetchWithAuth('admin.php?op=logout');
        if (response.ok) {
            sessionStorage.removeItem('adminToken');
            window.location.replace('login.php');
        }
        return response.ok;
    },

    async checkSession() {
        try {
            const response = await this.fetchWithAuth('admin.php?op=checkSession');
            if (response.status === 401) {
                // Session is expired/invalid
                return false;
            }
            if (response.ok) {
                const result = await response.json();
                return result.sessionValid;
            }
            return false;
        } catch (error) {
            return false;
        }
    }
};

export default API; 