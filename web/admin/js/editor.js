import API from './api.js';
import { formatSlug, extractMetadata, formatMetadata, validatePost } from './utils.js';
import { 
    MessageModal, 
    FileModal, 
    DeleteModal, 
    showError,
    clearErrors,
    showSuccessMessage,
    updateCurrentFileName,
    showContextMenu
} from './ui.js';

class Editor {
    constructor() {
        this.simplemde = new SimpleMDE({ element: document.getElementById("editor") });
        this.messageModal = new MessageModal();
        this.fileModal = new FileModal();
        this.deleteModal = new DeleteModal();
        
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
        filenameInput.addEventListener('blur', (e) => {
            let value = formatSlug(e.target.value);
            if (!value.endsWith('.md')) {
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
            'logoutButton': 'handleLogout',
            'modalDeleteButton': 'handleDelete',
            'selectFileButton': 'handleFileSelect'
        };

        Object.entries(buttonHandlers).forEach(([buttonId, handler]) => {
            document.getElementById(buttonId).addEventListener('click', () => this[handler]());
        });
    }

    initialize() {
        this.loadFiles();
        updateCurrentFileName('new-post.md');
    }

    async loadFiles() {
        try {
            const files = await API.listFiles();
            if (files) {
                this.fileModal.updateFiles(files);
            }
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
            } else if (!value.endsWith('.md')) {
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

        const content = this.simplemde.value();
        const fullContent = formatMetadata(metadata, content);
        
        try {
            const currentFile = this.fileModal.getSelectedFile();
            
            // If it's a new file or filename has changed
            if (!currentFile || currentFile !== newFileName) {
                const created = await API.createFile(newFileName);
                if (!created) {
                    throw new Error('Failed to create new file');
                }
                
                // If we're renaming an existing file, delete the old one after successful save
                if (currentFile && currentFile !== newFileName) {
                    await API.deleteFile(currentFile);
                }
            }

            const result = await API.writeFile(newFileName, fullContent);
            if (result.success) {
                showSuccessMessage('File saved successfully!', result.postUrl);
                if (!currentFile || currentFile !== newFileName) {
                    await this.loadFiles();
                    // Select the new file in the file selector
                    Array.from(this.fileModal.fileSelector.options).forEach((option, index) => {
                        if (option.value === newFileName) {
                            this.fileModal.fileSelector.selectedIndex = index;
                        }
                    });
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
        this.loadFiles();
        this.fileModal.show();
    }

    handleNewFile() {
        document.getElementById('title').value = '';
        document.getElementById('date').value = '';
        document.getElementById('draft').checked = false;
        this.simplemde.value('');
        document.getElementById('currentFileName').value = 'new-post.md';
        this.fileModal.fileSelector.value = '';
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
            this.simplemde.value(metadata.content || '');
            document.getElementById('currentFileName').value = fileName;
            this.fileModal.close();
        } catch (error) {
            console.error('Error loading file:', error);
            showError('save', error.message || 'Failed to load file');
        }
    }

    async handleDelete() {
        const fileName = this.fileModal.getSelectedFile();
        if (!fileName) {
            this.messageModal.show('Error', 'No file selected to delete', 'error');
            return;
        }

        this.deleteModal.show(fileName);
        const confirmButton = document.getElementById('confirmDeleteButton');
        const handleConfirm = async () => {
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
            this.deleteModal.close();
            this.fileModal.close();
            confirmButton.removeEventListener('click', handleConfirm);
        };
        confirmButton.addEventListener('click', handleConfirm);
    }

    async handleLogout() {
        try {
            const success = await API.logout();
            if (!success) {
                this.messageModal.show('Error', 'Logout failed', 'error');
            }
        } catch (error) {
            console.error('Error during logout:', error);
            this.messageModal.show('Error', 'Logout failed: ' + error.message, 'error');
        }
    }
}

// Initialize the editor when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Editor();
}); 