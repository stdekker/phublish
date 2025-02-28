/**
 * UploadsManager.js - File uploads manager using the unified modal system
 * 
 * This module provides functionality for managing file uploads in the admin interface.
 * It uses the ModalManager system for consistent UI.
 */

import ModalManager from './ModalManager.js';

class UploadsManager {
    /**
     * Create a new UploadsManager instance
     * @param {Object} editor - The editor instance to integrate with
     */
    constructor(editor) {
        this.editor = editor;
        this.files = [];
        this.selectedFile = null;
        this.modal = null;
    }

    /**
     * Show the uploads manager modal
     */
    show() {
        // Create content for the modal
        const content = `
            <div class="upload-form">
                <input type="file" id="fileUploadInput" />
                <button id="uploadFileButton" class="action-button">Upload</button>
            </div>
            <div class="file-list-container">
                <div class="file-table-header">
                    <div class="file-name-col">Filename</div>
                    <div class="file-date-col">Upload Date</div>
                    <div class="file-actions-col">Actions</div>
                </div>
                <ul id="uploadsList" class="file-table">
                    <!-- Files will be loaded here -->
                </ul>
            </div>
        `;

        // Create the modal
        this.modal = ModalManager.custom({
            title: 'Manage Uploads',
            content: content,
            width: '800px',
            type: 'default',
            buttons: [
                {
                    text: 'Add to Editor',
                    id: 'addToEditorButton',
                    class: 'action-button',
                    disabled: true,
                    action: () => this.addSelectedFileToEditor()
                },
                {
                    text: 'Close',
                    class: 'cancel-button'
                }
            ],
            onShow: () => {
                // Wait for the modal to be rendered before setting up event handlers
                setTimeout(() => {
                    this.setupEventHandlers();
                    this.loadFiles();
                }, 0);
            }
        });
        
        return this.modal;
    }

    /**
     * Set up event handlers for the modal
     */
    setupEventHandlers() {
        if (!this.modal) return;

        // Set up upload button
        const uploadButton = this.modal.getElement('#uploadFileButton');
        const fileInput = this.modal.getElement('#fileUploadInput');
        
        if (uploadButton && fileInput) {
            uploadButton.addEventListener('click', () => this.uploadFile());
        }
        
        // Set up file list event delegation
        const fileList = this.modal.getElement('#uploadsList');
        if (fileList) {
            fileList.addEventListener('click', (e) => {
                // Handle file selection
                const fileItem = e.target.closest('.file-item');
                if (fileItem && !e.target.matches('.delete-button')) {
                    this.selectFile(fileItem);
                }
                
                // Handle delete button clicks
                const deleteButton = e.target.closest('.delete-button');
                if (deleteButton) {
                    e.preventDefault();
                    e.stopPropagation();
                    const fileName = deleteButton.dataset.filename;
                    if (fileName) {
                        this.confirmDeleteFile(fileName);
                    }
                }
            });
        }
    }

    /**
     * Select a file in the list
     * @param {HTMLElement} fileItem - The file item element to select
     */
    selectFile(fileItem) {
        // Clear previous selection
        const fileItems = this.modal.getElement('#uploadsList').querySelectorAll('.file-item');
        fileItems.forEach(item => item.classList.remove('selected'));
        
        // Set the new selection
        fileItem.classList.add('selected');
        this.selectedFile = fileItem.dataset.filename;
        
        // Enable the "Add to Editor" button
        this.modal.setButtonState(0, false);
    }

    /**
     * Add the selected file to the editor
     */
    addSelectedFileToEditor() {
        if (!this.selectedFile) return;
        
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
        
        this.modal.close();
    }

    /**
     * Upload a file
     */
    async uploadFile() {
        const fileInput = this.modal.getElement('#fileUploadInput');
        const file = fileInput.files[0];
        
        if (!file) {
            ModalManager.alert('Error', 'Please select a file to upload.', 'error');
            return;
        }

        // Show loading state
        const uploadButton = this.modal.getElement('#uploadFileButton');
        const originalText = uploadButton.textContent;
        uploadButton.disabled = true;
        uploadButton.innerHTML = '<span class="modal-loader"></span> Uploading...';

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('uploads_manager.php', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Admin-Token': sessionStorage.getItem('adminToken'),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                ModalManager.alert('Success', 'File uploaded successfully', 'success');
                fileInput.value = ''; // Clear the file input
                this.loadFiles();
            } else {
                throw new Error(result.error || 'Failed to upload file');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            ModalManager.alert('Error', 'Failed to upload file: ' + (error.message || 'Unknown error'), 'error');
        } finally {
            // Restore button state
            uploadButton.disabled = false;
            uploadButton.textContent = originalText;
        }
    }

    /**
     * Load the list of uploaded files
     */
    async loadFiles() {
        const fileList = this.modal.getElement('#uploadsList');
        
        // Show loading state
        fileList.innerHTML = '<li class="loading-item">Loading files...</li>';
        
        try {
            const response = await fetch('uploads_manager.php', {
                method: 'GET',
                headers: {
                    'X-Admin-Token': sessionStorage.getItem('adminToken'),
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && Array.isArray(result.files)) {
                this.files = result.files;
                this.renderFileList();
            } else {
                throw new Error(result.error || 'Failed to load files');
            }
        } catch (error) {
            console.error('Error loading files:', error);
            fileList.innerHTML = `<li class="error-item">Error loading files: ${error.message || 'Unknown error'}</li>`;
        }
    }

    /**
     * Render the file list in the modal
     */
    renderFileList() {
        const fileList = this.modal.getElement('#uploadsList');
        fileList.innerHTML = '';
        
        if (this.files.length === 0) {
            fileList.innerHTML = '<li class="empty-item">No files uploaded yet</li>';
            return;
        }
        
        this.files.forEach(file => {
            const li = document.createElement('li');
            li.className = 'file-item';
            li.dataset.filename = file.name;
            
            // Create file name column
            const nameCol = document.createElement('div');
            nameCol.className = 'file-name-col';
            nameCol.textContent = file.name;
            
            // Create date column
            const dateCol = document.createElement('div');
            dateCol.className = 'file-date-col';
            dateCol.textContent = file.date;
            
            // Create actions column with delete button
            const actionsCol = document.createElement('div');
            actionsCol.className = 'file-actions-col';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'delete-button';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.dataset.filename = file.name;
            deleteBtn.title = 'Delete file';
            
            actionsCol.appendChild(deleteBtn);
            
            // Assemble the list item
            li.appendChild(nameCol);
            li.appendChild(dateCol);
            li.appendChild(actionsCol);
            fileList.appendChild(li);
        });
    }

    /**
     * Show confirmation before deleting a file
     * @param {string} fileName - The name of the file to delete
     */
    confirmDeleteFile(fileName) {
        ModalManager.dangerConfirm(
            'Delete File',
            `Are you sure you want to delete the file "${fileName}"? This action cannot be undone.`,
            () => this.deleteFile(fileName)
        );
    }

    /**
     * Delete a file
     * @param {string} fileName - The name of the file to delete
     */
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
                ModalManager.alert('Success', 'File deleted successfully', 'success');
                
                // Reset selection if the deleted file was selected
                if (this.selectedFile === fileName) {
                    this.selectedFile = null;
                    this.modal.setButtonState(0, true); // Disable "Add to Editor" button
                }
                
                await this.loadFiles();
            } else {
                throw new Error(result.error || 'Failed to delete file');
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            ModalManager.alert('Error', 'Error deleting file: ' + (error.message || 'Unknown error'), 'error');
        }
    }
}

export default UploadsManager; 