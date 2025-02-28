// UI Components and Handlers
import ModalManager from './ModalManager.js';

// Export utility functions related to UI
export function showError(fieldId, message) {
    const errorEl = document.getElementById(`${fieldId}-error`);
    const inputEl = document.getElementById(fieldId);
    if (errorEl) {
        errorEl.textContent = message;
    }
    if (inputEl) {
        inputEl.classList.add('input-error');
    }
}

export function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    document.querySelectorAll('input').forEach(input => input.classList.remove('input-error'));
}

export function showSuccessMessage(message, postUrl = null) {
    const container = document.createElement('div');
    container.className = 'message';
    
    const messageText = document.createElement('span');
    messageText.textContent = message;
    container.appendChild(messageText);
    
    if (postUrl) {
        container.appendChild(document.createElement('br'));
        const link = document.createElement('a');
        link.href = postUrl;
        link.textContent = 'View Post';
        link.target = '_blank';
        link.className = 'view-post-link';
        container.appendChild(link);
    }
    
    // Remove any existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Add the new message above the editor
    const editor = document.getElementById('editor');
    editor.parentNode.insertBefore(container, editor);
    
    // Auto-hide after 10 seconds
    setTimeout(() => container.remove(), 10000);
}

export function updateCurrentFileName(fileName) {
    document.getElementById('currentFileName').textContent = fileName || 'New file';
}

export function showContextMenu(event, fileName, onRename, onDelete) {
    event.preventDefault();
    
    // Remove any existing context menu
    const existingMenu = document.getElementById('contextMenu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // Create context menu
    const menu = document.createElement('div');
    menu.id = 'contextMenu';
    menu.className = 'context-menu';
    menu.style.position = 'absolute';
    menu.style.left = `${event.pageX}px`;
    menu.style.top = `${event.pageY}px`;
    
    // Add rename option
    const renameOption = document.createElement('div');
    renameOption.className = 'context-menu-item';
    renameOption.textContent = 'Rename';
    renameOption.onclick = () => {
        menu.remove();
        onRename(fileName);
    };
    menu.appendChild(renameOption);
    
    // Add delete option
    const deleteOption = document.createElement('div');
    deleteOption.className = 'context-menu-item';
    deleteOption.textContent = 'Delete';
    deleteOption.onclick = () => {
        menu.remove();
        onDelete(fileName);
    };
    menu.appendChild(deleteOption);
    
    document.body.appendChild(menu);
    
    // Close menu when clicking outside
    document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    });
}

// Login handler class
export class LoginHandler {
    constructor() {
        this.setupEventListeners();
        this.checkForLoginToken();
    }

    setupEventListeners() {
        const requestLoginButton = document.getElementById('requestLogin');
        if (requestLoginButton) {
            requestLoginButton.addEventListener('click', async () => {
                await this.requestLoginLink();
            });
        }
    }

    async requestLoginLink() {
        try {
            const response = await fetch('login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: 'request_login=1',
                credentials: 'same-origin'
            });
            
            const data = await response.json();
            
            if (data.success) {
                ModalManager.alert('Success', data.message, 'success');
            } else {
                ModalManager.alert('Error', data.error, 'error');
            }
        } catch (error) {
            console.error('Request failed:', error);
            ModalManager.alert('Error', 'Failed to request login link. Please try again.', 'error');
        }
    }

    checkForLoginToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
            this.verifyLoginToken(token);
        }
    }

    async verifyLoginToken(token) {
        try {
            const response = await fetch('admin.php?op=verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ token }),
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const data = await response.json();
            
            if (data.success && data.sessionToken) {
                sessionStorage.setItem('adminToken', data.sessionToken);
                window.location.replace('index.php');
            } else {
                throw new Error(data.error || 'Invalid or expired login link');
            }
        } catch (error) {
            console.error('Login error:', error);
            ModalManager.alert('Error', error.message || 'Login failed. Please request a new login link.', 'error');
        }
    }
} 