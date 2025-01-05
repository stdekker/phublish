// UI Components and Handlers
export class Modal {
    constructor(elementId) {
        this.modal = document.getElementById(elementId);
        this.setupCloseHandlers();
    }

    setupCloseHandlers() {
        // Close button handler
        const closeBtn = this.modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.onclick = () => this.close();
        }

        // Cancel button handler
        const cancelBtn = this.modal.querySelector('.cancel-button');
        if (cancelBtn) {
            cancelBtn.onclick = () => this.close();
        }

        // Click outside handler
        window.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.close();
            }
        });
    }

    show() {
        this.modal.style.display = 'block';
    }

    close() {
        this.modal.style.display = 'none';
    }
}

export class MessageModal extends Modal {
    constructor() {
        super('messageModal');
        this.setupOkButton();
    }

    setupOkButton() {
        const okButton = this.modal.querySelector('.action-button');
        if (okButton) {
            okButton.onclick = () => this.close();
        }
    }

    show(title, message, type = 'info') {
        const modalContent = this.modal.querySelector('.modal-content');
        modalContent.classList.remove('success-modal', 'error-modal');
        
        if (type === 'success') {
            modalContent.classList.add('success-modal');
        } else if (type === 'error') {
            modalContent.classList.add('error-modal');
        }
        
        this.modal.querySelector('#messageModalTitle').textContent = title;
        this.modal.querySelector('#messageModalContent').textContent = message;
        super.show();
    }
}

export class FileModal extends Modal {
    constructor() {
        super('fileModal');
        this.fileSelector = this.modal.querySelector('#fileSelector');
        this.deleteButton = this.modal.querySelector('#modalDeleteButton');
        this.setupSelectionHandler();
    }

    setupSelectionHandler() {
        this.fileSelector.addEventListener('change', () => {
            this.deleteButton.disabled = !this.fileSelector.value;
        });
    }

    updateFiles(files) {
        this.fileSelector.innerHTML = '';
        files.forEach(file => {
            const option = document.createElement('option');
            option.value = file;
            option.textContent = file;
            this.fileSelector.appendChild(option);
        });
        this.deleteButton.disabled = !this.fileSelector.value;
    }

    getSelectedFile() {
        return this.fileSelector.value;
    }
}

export class DeleteModal extends Modal {
    constructor() {
        super('deleteModal');
    }

    show(fileName) {
        if (!fileName) {
            throw new Error('No file selected to delete');
        }
        this.modal.querySelector('.filename-display').textContent = fileName;
        super.show();
    }
}

export class RenameModal extends Modal {
    constructor() {
        super('renameModal');
        this.input = this.modal.querySelector('#newFileName');
        this.setupInputHandler();
    }

    setupInputHandler() {
        this.input.addEventListener('blur', () => {
            this.formatFileName();
        });
    }

    formatFileName() {
        let value = this.input.value;
        
        // Remove .md extension for formatting
        if (value.toLowerCase().endsWith('.md')) {
            value = value.slice(0, -3);
        }
        
        // Format the filename (lowercase, replace spaces with hyphens)
        value = value.toLowerCase()
            .replace(/\s+/g, '-')        // Replace spaces with hyphens
            .replace(/[^\w\-]+/g, '')    // Remove all non-word chars (except hyphens)
            .replace(/\-\-+/g, '-')      // Replace multiple hyphens with single hyphen
            .replace(/^-+/, '')          // Trim hyphens from start
            .replace(/-+$/, '');         // Trim hyphens from end
        
        // Add back .md extension
        if (!value.toLowerCase().endsWith('.md')) {
            value += '.md';
        }
        
        this.input.value = value;
    }

    show(fileName) {
        // Remove .md extension for initial display
        const baseName = fileName.toLowerCase().endsWith('.md') 
            ? fileName.slice(0, -3) 
            : fileName;
            
        this.input.value = baseName;
        super.show();
        this.input.focus();
        this.input.select();
    }

    getNewFileName() {
        this.formatFileName(); // Ensure filename is formatted before returning
        return this.input.value.trim();
    }
}

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

export class UploadsManagerModal extends Modal {
    constructor(editor) {
        super('uploadsManagerModal');
        this.editor = editor;
        this.fileInput = this.modal.querySelector('#fileUploadInput');
        this.uploadButton = this.modal.querySelector('#uploadFileButton');
        this.fileList = this.modal.querySelector('#fileList');
        this.addToEditorButton = this.modal.querySelector('#addToEditorButton');
        this.selectedFile = null;
        
        this.setupUploadHandler();
        this.setupSelectionHandler();
        this.setupAddToEditorHandler();
    }

    setupUploadHandler() {
        this.uploadButton.addEventListener('click', () => this.uploadFile());
    }

    async uploadFile() {
        const file = this.fileInput.files[0];
        if (!file) {
            alert('Please select a file to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('uploads_manager.php', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                alert('File uploaded successfully');
                this.loadFiles();
            } else {
                alert('Failed to upload file: ' + result.error);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
        }
    }

    setupSelectionHandler() {
        this.fileList.addEventListener('click', (e) => {
            // Clear previous selections
            this.fileList.querySelectorAll('.file-item').forEach(item => {
                item.classList.remove('selected');
            });

            const fileItem = e.target.closest('.file-item');
            if (fileItem) {
                fileItem.classList.add('selected');
                this.selectedFile = fileItem.dataset.filename;
                this.addToEditorButton.disabled = false;
            }
        });
    }

    setupAddToEditorHandler() {
        this.addToEditorButton.addEventListener('click', () => {
            if (this.selectedFile) {
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(this.selectedFile);
                const baseUrl = window.location.origin;
                const filePath = `${baseUrl}/uploads/${this.selectedFile}`;
                
                if (isImage) {
                    this.editor.exec('addImage', {
                        altText: this.selectedFile,
                        imageUrl: filePath
                    });
                } else {
                    this.editor.exec('addLink', {
                        linkText: this.selectedFile,
                        linkUrl: filePath
                    });
                }
                
                this.close();
            }
        });
    }

    async loadFiles() {
        try {
            const response = await fetch('uploads_manager.php');
            const result = await response.json();
            
            if (result.success && Array.isArray(result.files)) {
                this.fileList.innerHTML = '';
                result.files.forEach(file => {
                    const li = document.createElement('li');
                    li.className = 'file-item';
                    li.dataset.filename = file.name;
                    
                    const fileInfo = document.createElement('span');
                    fileInfo.className = 'file-info';
                    fileInfo.textContent = `${file.name} (Uploaded: ${file.date})`;
                    
                    li.appendChild(fileInfo);
                    li.appendChild(this.createDeleteButton(file.name));
                    this.fileList.appendChild(li);
                });
            } else {
                alert('Failed to load files: ' + (result.error || 'Unexpected response format'));
            }
        } catch (error) {
            console.error('Error loading files:', error);
        }
    }

    createDeleteButton(fileName) {
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'delete-button';
        deleteButton.onclick = () => this.confirmDelete(fileName);
        return deleteButton;
    }

    confirmDelete(fileName) {
        if (confirm(`Are you sure you want to delete ${fileName}?`)) {
            this.deleteFile(fileName);
        }
    }

    async deleteFile(fileName) {
        try {
            const response = await fetch('uploads_manager.php', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `file=${encodeURIComponent(fileName)}`
            });
            const result = await response.json();
            if (result.success) {
                alert('File deleted successfully');
                this.loadFiles();
            } else {
                alert('Failed to delete file: ' + result.error);
            }
        } catch (error) {
            console.error('Error deleting file:', error);
        }
    }
} 