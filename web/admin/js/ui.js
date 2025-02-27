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
        this.fileList = this.modal.querySelector('#fileList');
        this.deleteButton = this.modal.querySelector('#modalDeleteButton');
        this.selectButton = this.modal.querySelector('#selectFileButton');
        this.selectedFile = null;
        this.setupSelectionHandler();
    }

    setupSelectionHandler() {
        // File item click handler
        this.fileList.addEventListener('click', (e) => {
            const fileItem = e.target.closest('li');
            if (!fileItem) return;
            
            // Clear previous selections
            this.fileList.querySelectorAll('li').forEach(item => {
                item.classList.remove('selected');
            });
            
            // Select the clicked item
            fileItem.classList.add('selected');
            this.selectedFile = fileItem.dataset.filename;
            this.deleteButton.disabled = !this.selectedFile;
            this.selectButton.disabled = !this.selectedFile;
        });
    }

    updateFiles(files) {
        this.fileList.innerHTML = '';
        this.selectedFile = null;
        this.deleteButton.disabled = true;
        this.selectButton.disabled = true;
        
        files.forEach(file => {
            const li = document.createElement('li');
            li.dataset.filename = file.filename;
            
            // Create filename column
            const filenameCol = document.createElement('div');
            filenameCol.className = 'file-name-col';
            filenameCol.textContent = file.filename;
            
            // Create title column
            const titleCol = document.createElement('div');
            titleCol.className = 'file-title-col';
            titleCol.textContent = file.title || '(No title)';
            
            // Create date column
            const dateCol = document.createElement('div');
            dateCol.className = 'file-date-col';
            dateCol.textContent = file.createdDate;
            
            // Assemble the list item
            li.appendChild(filenameCol);
            li.appendChild(titleCol);
            li.appendChild(dateCol);
            
            this.fileList.appendChild(li);
        });
    }

    getSelectedFile() {
        return this.selectedFile;
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
            // If clicking a delete button or its wrapper, do nothing
            if (e.target.matches('.delete-button') || e.target.closest('.delete-button-wrapper')) {
                return;
            }

            // Get the file item that was clicked
            const fileItem = e.target.closest('.file-item');
            if (!fileItem) return;

            // Clear previous selections
            this.fileList.querySelectorAll('.file-item').forEach(item => {
                item.classList.remove('selected');
            });

            // Select the clicked item
            fileItem.classList.add('selected');
            this.selectedFile = fileItem.dataset.filename;
            this.addToEditorButton.disabled = false;
        });

        // Add a separate event listener for delete buttons
        this.fileList.addEventListener('click', (e) => {
            const deleteButton = e.target.closest('.delete-button');
            if (deleteButton) {
                e.preventDefault();
                e.stopPropagation();
                const fileName = deleteButton.dataset.filename;
                if (fileName) {
                    this.confirmDelete(fileName);
                }
            }
        }, true);
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
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success && Array.isArray(result.files)) {
                // Create header separately
                const header = document.createElement('li');
                header.className = 'file-item header';
                header.innerHTML = `
                    <div class="file-name-col">Filename</div>
                    <div class="file-date-col">Upload Date</div>
                    <div class="file-actions-col">Actions</div>
                `;
                
                // Clear the list and add the header
                this.fileList.innerHTML = '';
                this.fileList.appendChild(header);
                
                // Add file items
                result.files.forEach(file => {
                    const li = document.createElement('li');
                    li.className = 'file-item';
                    li.dataset.filename = file.name;
                    
                    // Filename column
                    const fileNameCol = document.createElement('div');
                    fileNameCol.className = 'file-name-col';
                    fileNameCol.textContent = file.name;
                    
                    // Date column
                    const fileDateCol = document.createElement('div');
                    fileDateCol.className = 'file-date-col';
                    fileDateCol.textContent = file.date;
                    
                    // Actions column
                    const fileActionsCol = document.createElement('div');
                    fileActionsCol.className = 'file-actions-col';
                    
                    // Create delete button
                    const deleteButton = document.createElement('button');
                    deleteButton.type = 'button';
                    deleteButton.className = 'delete-button';
                    deleteButton.innerHTML = '&times;';
                    deleteButton.title = 'Delete file';
                    deleteButton.dataset.filename = file.name;
                    
                    // Add click handler
                    deleteButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.confirmDelete(file.name);
                    }, true);
                    
                    fileActionsCol.appendChild(deleteButton);
                    
                    // Assemble the list item
                    li.appendChild(fileNameCol);
                    li.appendChild(fileDateCol);
                    li.appendChild(fileActionsCol);
                    this.fileList.appendChild(li);
                });
            } else {
                throw new Error(result.error || 'Failed to load files');
            }
        } catch (error) {
            console.error('Error loading files:', error);
            alert('Failed to load files: ' + (error.message || 'Unknown error'));
        }
    }

    confirmDelete(fileName) {
        // Use a more descriptive confirmation message
        if (confirm(`Are you sure you want to delete the file "${fileName}"? This action cannot be undone.`)) {
            this.deleteFile(fileName).catch(error => {
                console.error('Error deleting file:', error);
                alert('Error deleting file: ' + (error.message || 'Unknown error'));
            });
        }
    }

    async deleteFile(fileName) {
        try {
            const formData = new FormData();
            formData.append('action', 'delete');
            formData.append('file', fileName);
            
            const response = await fetch('uploads_manager.php', {
                method: 'POST',
                headers: {
                    'X-Admin-Token': sessionStorage.getItem('adminToken'),
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData,
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                alert('File deleted successfully');
                await this.loadFiles();
            } else {
                throw new Error(result.error || 'Failed to delete file');
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Error deleting file: ' + (error.message || 'Unknown error'));
            throw error; // Re-throw to be handled by caller
        }
    }
}

export class LoginHandler {
    constructor() {
        this.messageModal = new MessageModal();
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
                this.messageModal.show('Success', data.message, 'success');
            } else {
                this.messageModal.show('Error', data.error, 'error');
            }
        } catch (error) {
            console.error('Request failed:', error);
            this.messageModal.show('Error', 'Failed to request login link. Please try again.', 'error');
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
            this.messageModal.show('Error', error.message || 'Login failed. Please request a new login link.', 'error');
        }
    }
} 