import API from './api.js';
import { formatSlug, extractMetadata, formatMetadata, validatePost } from './utils.js';
import { 
    showError,
    clearErrors,
    showSuccessMessage,
    updateCurrentFileName,
    showContextMenu
} from './ui.js';
import ModalManager from './ModalManager.js';
import UploadsManager from './UploadsManager.js';

class Editor {
    constructor() {
        this.editor = new toastui.Editor({
            el: document.getElementById('editor'),
            height: '500px',
            initialEditType: 'wysiwyg',
            previewStyle: 'vertical',
            toolbarItems: [
                ['heading', 'bold', 'italic', 'strike'],
                ['hr', 'quote'],
                ['ul', 'ol', 'task', 'indent', 'outdent'],
                ['table', 'link'],
                ['code', 'codeblock'],
                ['scrollSync']
            ]
        });
        
        // Use ModalManager instead of directly instantiating modals
        this.selectedFile = null;
        this.uploadsManager = new UploadsManager(this.editor);
        
        this.setupEventListeners();
        this.initialize();
    }

    setupEventListeners() {
        // Field validation
        ['title', 'date'].forEach(fieldId => {
            const input = document.getElementById(fieldId);
            input.addEventListener('blur', () => this.validateField(fieldId, input.value));
            input.addEventListener('input', () => this.clearFieldError(fieldId));
        });

        // Filename handling
        const filenameInput = document.getElementById('currentFileName');
        filenameInput.addEventListener('focus', (e) => {
            // Remove .md extension when user starts editing
            let value = e.target.value;
            if (value.toLowerCase().endsWith('.md')) {
                e.target.value = value.slice(0, -3);
            }
        });

        filenameInput.addEventListener('blur', (e) => {
            // Format the filename and ensure it has .md extension when user finishes editing
            let value = formatSlug(e.target.value);
            if (!value.toLowerCase().endsWith('.md')) {
                value += '.md';
            }
            e.target.value = value;
            this.validateField('filename', value);
        });

        filenameInput.addEventListener('input', () => this.clearFieldError('filename'));

        // Button handlers
        const buttonHandlers = {
            'saveButton': 'handleSave',
            'openFileButton': 'handleOpenFile', 
            'newFileButton': 'handleNewFile',
            'deleteButton': 'handleDeleteCurrentFile',
            'logoutButton': 'handleLogout',
            'modalDeleteButton': 'handleDelete',
            'selectFileButton': 'handleFileSelect'
        };

        Object.entries(buttonHandlers).forEach(([buttonId, handler]) => {
            document.getElementById(buttonId).addEventListener('click', () => this[handler]());
        });

        // Add event listener for the manage files button
        document.getElementById('manageFilesButton').addEventListener('click', () => {
            this.handleManageFiles();
        });
    }

    initialize() {
        this.loadFiles();
        updateCurrentFileName('new-post.md');
        this.updateDeleteButtonState(); // Initially disable delete button since no file is loaded
    }

    async loadFiles() {
        try {
            const files = await API.listFiles();
            // Store files for later use instead of updating a FileModal instance
            this.files = files || [];
        } catch (error) {
            console.error('Error loading files:', error);
            showError('save', error.message || 'Failed to load files');
        }
    }

    validateField(fieldId, value) {
        let error = null;
        const errorElement = document.getElementById(`${fieldId}-error`);
        const inputElement = document.getElementById(fieldId);
        
        if (!errorElement || !inputElement) {
            return;
        }
        
        if (fieldId === 'filename') {
            if (!value) {
                error = 'Filename is required';
            } else if (!value.toLowerCase().endsWith('.md')) {
                error = 'Filename must end with .md';
            } else if (!/^[a-z0-9-]+\.md$/.test(value)) {
                error = 'Filename can only contain lowercase letters, numbers, and hyphens';
            }
        } else {
            const errors = validatePost({ [fieldId]: value });
            if (errors && errors[fieldId]) {
                error = errors[fieldId];
            }
        }

        if (error) {
            showError(fieldId, error);
        } else {
            this.clearFieldError(fieldId);
        }
    }

    clearFieldError(fieldId) {
        const errorElement = document.getElementById(`${fieldId}-error`);
        const inputElement = document.getElementById(fieldId);
        
        if (errorElement) {
            errorElement.textContent = '';
        }
        if (inputElement) {
            inputElement.classList.remove('input-error');
        }
    }

    getMetadata() {
        const title = document.getElementById('title')?.value || '';
        const date = document.getElementById('date')?.value || '';
        const isDraft = document.getElementById('draft')?.checked || false;
        
        return {
            title,
            date,
            status: isDraft ? 'draft' : 'published'
        };
    }

    async handleSave() {
        const metadata = this.getMetadata();
        
        // Only validate title and date
        const errors = validatePost({
            title: metadata.title,
            date: metadata.date
        });
        
        if (errors) {
            Object.entries(errors).forEach(([field, message]) => showError(field, message));
            return;
        }

        const newFileName = document.getElementById('currentFileName').value;
        if (!newFileName) {
            showError('filename', 'Filename is required');
            return;
        }

        // Check session before attempting to save to prevent data loss
        const sessionValid = await API.checkSession();
        if (!sessionValid) {
            const content = this.editor.getMarkdown();
            const fullContent = formatMetadata(metadata, content);
            
            ModalManager.confirm(
                'Session Expired',
                'Your session has expired. Would you like to copy your content to the clipboard before redirecting to login?',
                () => {
                    // Copy content to clipboard
                    navigator.clipboard.writeText(fullContent).then(() => {
                        ModalManager.alert('Content Copied', 'Your content has been copied to the clipboard. You can paste it after logging in again.', 'info', () => {
                            window.location.replace('login.php');
                        });
                    }).catch(() => {
                        ModalManager.alert('Session Expired', 'Your session has expired. Please save your content manually and then log in again.', 'warning', () => {
                            window.location.replace('login.php');
                        });
                    });
                },
                () => {
                    window.location.replace('login.php');
                }
            );
            return;
        }

        const content = this.editor.getMarkdown();
        const fullContent = formatMetadata(metadata, content);
        
        try {
            const currentFile = this.selectedFile;
            
            // Try to write the file directly - writeFile can handle both new and existing files
            const result = await API.writeFile(newFileName, fullContent);
            if (result.success) {
                // If we're renaming an existing file, delete the old one after successful save
                if (currentFile && currentFile !== newFileName) {
                    await API.deleteFile(currentFile);
                }
                
                showSuccessMessage('File saved successfully!', result.postUrl);
                
                // Update selectedFile to track the current file being worked on
                this.selectedFile = newFileName;
                this.updateDeleteButtonState();
                
                // Reload the files list to update with the new file
                if (!currentFile || currentFile !== newFileName) {
                    await this.loadFiles();
                }
            } else {
                throw new Error(result.error || 'Failed to save file');
            }
        } catch (error) {
            console.error('Error saving file:', error);
            showError('save', error.message || 'Failed to save file');
        }
    }

    handleOpenFile() {
        this.loadFiles().then(() => {
            // Use ModalManager.fileSelect without delete functionality
            ModalManager.fileSelect(
                'Select Post', 
                this.files,
                // onSelect callback
                (filename) => {
                    this.selectedFile = filename;
                    this.loadFileContent(filename);
                    this.updateDeleteButtonState();
                }
                // No onDelete callback - delete functionality moved to main edit window
            );
        });
    }

    async loadFileContent(fileName) {
        if (!fileName) return;
        
        try {
            const content = await API.readFile(fileName);
            const metadata = extractMetadata(content);
            document.getElementById('title').value = metadata.title || '';
            document.getElementById('date').value = metadata.date || '';
            document.getElementById('draft').checked = metadata.status === 'draft';
            this.editor.setMarkdown(metadata.content || '');
            
            // Set the filename in the input field
            document.getElementById('currentFileName').value = fileName;
            this.selectedFile = fileName;
            this.updateDeleteButtonState();
        } catch (error) {
            console.error('Error loading file:', error);
            showError('save', error.message || 'Failed to load file');
        }
    }

    confirmDeleteFile(fileName) {
        if (!fileName) {
            ModalManager.alert('Error', 'No file selected to delete', 'error');
            return;
        }

        ModalManager.dangerConfirm(
            'Confirm Delete',
            `Are you sure you want to delete "${fileName}"? This action cannot be undone.`,
            async () => {
                try {
                    const result = await API.deleteFile(fileName);
                    if (result.success) {
                        showSuccessMessage('File deleted successfully');
                        this.handleNewFile();
                        await this.loadFiles();
                    } else {
                        throw new Error(result.error || 'Failed to delete file');
                    }
                } catch (error) {
                    console.error('Error deleting file:', error);
                    showError('save', error.message || 'Failed to delete file');
                }
            }
        );
    }

    handleDeleteCurrentFile() {
        if (!this.selectedFile) {
            ModalManager.alert('Error', 'No post is currently being edited', 'error');
            return;
        }
        this.confirmDeleteFile(this.selectedFile);
    }

    updateDeleteButtonState() {
        const deleteButton = document.getElementById('deleteButton');
        if (deleteButton) {
            deleteButton.disabled = !this.selectedFile;
        }
    }

    handleNewFile() {
        document.getElementById('title').value = '';
        document.getElementById('date').value = '';
        document.getElementById('draft').checked = false;
        this.editor.setMarkdown('');
        document.getElementById('currentFileName').value = 'new-post.md';
        this.selectedFile = null; // Store selected file in the Editor instance instead
        this.updateDeleteButtonState();
    }

    async handleFileSelect() {
        const fileName = this.fileModal.getSelectedFile();
        if (!fileName) return;
        
        try {
            const content = await API.readFile(fileName);
            const metadata = extractMetadata(content);
            document.getElementById('title').value = metadata.title || '';
            document.getElementById('date').value = metadata.date || '';
            document.getElementById('draft').checked = metadata.status === 'draft';
            this.editor.setMarkdown(metadata.content || '');
            
            // Set the filename in the input field
            document.getElementById('currentFileName').value = fileName;
            
            this.fileModal.close();
        } catch (error) {
            console.error('Error loading file:', error);
            showError('save', error.message || 'Failed to load file');
        }
    }

    async handleLogout() {
        // Confirm before logging out
        ModalManager.confirm(
            'Confirm Logout',
            'Are you sure you want to log out? Any unsaved changes will be lost.',
            async () => {
                try {
                    const success = await API.logout();
                    if (!success) {
                        ModalManager.alert('Error', 'Logout failed', 'error');
                    }
                } catch (error) {
                    console.error('Error during logout:', error);
                    ModalManager.alert('Error', 'Logout failed: ' + error.message, 'error');
                }
            }
        );
    }

    handleManageFiles() {
        this.uploadsManager.show();
    }
}

// Initialize the editor when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Editor();
}); 