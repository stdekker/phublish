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
        // Store reference to editor instance for button callback
        let editorInstance = null;
        
        // Create "Read More" button
        const createReadMoreButton = () => {
            const button = document.createElement('button');
            button.className = 'toastui-editor-toolbar-icons';
            button.style.backgroundImage = 'none';
            button.style.margin = '0';
            button.style.padding = '4px 8px';
            button.innerHTML = `<span style="font-size: 11px; font-weight: bold;">Read More</span>`;
            button.title = 'Insert Read More separator';
            button.addEventListener('click', () => {
                if (!editorInstance) return;
                
                // Get current markdown and cursor position
                const markdown = editorInstance.getMarkdown();
                const selection = editorInstance.getSelection();
                
                if (selection && selection.startOffset !== undefined) {
                    // Find the line where cursor is positioned
                    const lines = markdown.split('\n');
                    let charCount = 0;
                    let lineIndex = 0;
                    
                    for (let i = 0; i < lines.length; i++) {
                        const lineLength = lines[i].length;
                        if (charCount + lineLength >= selection.startOffset) {
                            lineIndex = i;
                            break;
                        }
                        charCount += lineLength + 1; // +1 for newline
                    }
                    
                    // Insert <!--more--> after the current line
                    lines.splice(lineIndex + 1, 0, '<!--more-->');
                    editorInstance.setMarkdown(lines.join('\n'));
                } else {
                    // If no selection info, append at the end
                    editorInstance.setMarkdown(markdown + '\n\n<!--more-->\n');
                }
            });
            return button;
        };

        // Detect dark mode preference
        const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const editorTheme = prefersDarkMode ? 'dark' : 'light';
        
        console.log('Editor theme:', editorTheme, 'Dark mode detected:', prefersDarkMode);
        
        this.editor = new toastui.Editor({
            el: document.getElementById('editor'),
            height: '500px',
            initialEditType: 'wysiwyg',
            previewStyle: 'vertical',
            theme: editorTheme,
            toolbarItems: [
                ['heading', 'bold', 'italic', 'strike'],
                ['hr', 'quote'],
                ['ul', 'ol', 'task', 'indent', 'outdent'],
                ['table', 'link'],
                ['code', 'codeblock'],
                ['scrollSync'],
                [{
                    el: createReadMoreButton(),
                    tooltip: 'Insert Read More separator'
                }]
            ]
        });
        
        // Listen for theme changes and update editor theme
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleThemeChange = (e) => {
                // Check if changeTheme method exists (available in ToastUI Editor 3.0+)
                if (this.editor && typeof this.editor.changeTheme === 'function') {
                    this.editor.changeTheme(e.matches ? 'dark' : 'light');
                }
                // If changeTheme doesn't exist, the theme is set on initialization only
            };
            mediaQuery.addEventListener('change', handleThemeChange);
        }
        
        // Set the editor instance reference after creation
        editorInstance = this.editor;
        
        // Use ModalManager instead of directly instantiating modals
        this.selectedFile = null;
        this.uploadsManager = new UploadsManager(this.editor);
        
        this.setupEventListeners();
        this.initialize();
    }

    setupEventListeners() {
        // Field validation
        ['date'].forEach(fieldId => {
            const input = document.getElementById(fieldId);
            input.addEventListener('blur', () => this.validateField(fieldId, input.value));
            input.addEventListener('input', () => this.clearFieldError(fieldId));
        });

        // Title field - validation and filename generation
        const titleInput = document.getElementById('title');
        titleInput.addEventListener('blur', () => {
            this.validateField('title', titleInput.value);
            this.generateFilenameFromTitle();
        });
        titleInput.addEventListener('input', () => this.clearFieldError('title'));

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
            let value = e.target.value;
            // Strip .md extension if user added it (to avoid double .md.md)
            if (value.toLowerCase().endsWith('.md')) {
                value = value.slice(0, -3);
            }
            value = formatSlug(value) + '.md';
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
        // Set default values for new posts
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        document.getElementById('draft').checked = true;
        this.updateDeleteButtonState(); // Initially disable delete button since no file is loaded
    }

    async loadFiles() {
        try {
            const files = await API.listFiles();
            // Store files for later use instead of updating a FileModal instance
            this.files = files || [];
        } catch (error) {
            console.error('Error loading files:', error);
            if (error.message === 'Session expired') {
                // Don't show error for session expiry during file loading
                // The user will find out when they try to save
                this.files = [];
            } else {
                showError('save', error.message || 'Failed to load files');
            }
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

    generateFilenameFromTitle() {
        const filenameInput = document.getElementById('currentFileName');
        const currentFilename = filenameInput.value.trim();
        const title = document.getElementById('title').value.trim();
        
        // Only generate filename if:
        // 1. Filename is empty or default "new-post.md"
        // 2. Title has a value
        if ((!currentFilename || currentFilename === 'new-post.md') && title) {
            const slug = formatSlug(title);
            if (slug) {
                filenameInput.value = `${slug}.md`;
            }
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
        // Check session first before any other validation
        const sessionValid = await API.checkSession();
        if (!sessionValid) {
            showError('save', 'Your session has expired. Please copy your content manually and log in again.');
            this.disableSaveButton();
            return;
        }

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
            if (error.message === 'Session expired') {
                showError('save', 'Your session has expired. Please copy your content manually and log in again.');
                this.disableSaveButton();
            } else {
                showError('save', error.message || 'Failed to save file');
            }
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
                    if (error.message === 'Session expired') {
                        showError('save', 'Your session has expired. Please refresh the page and log in again.');
                    } else {
                        showError('save', error.message || 'Failed to delete file');
                    }
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

    disableSaveButton() {
        const saveButton = document.getElementById('saveButton');
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'Session Expired';
        }
    }

    handleNewFile() {
        document.getElementById('title').value = '';
        // Set today's date as default
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        document.getElementById('draft').checked = true;
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