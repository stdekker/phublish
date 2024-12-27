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
        })
        .then(response => {
            if (response.status === 401) {
                window.location.replace('login.php');
                throw new Error('Unauthorized');
            }
            return response;
        });
    },

    async listFiles() {
        const response = await this.fetchWithAuth('admin.php?op=list');
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
    }
};

export default API; 