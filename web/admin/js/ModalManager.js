/**
 * ModalManager.js - Unified modal system for admin backend
 * 
 * This module provides a flexible, reusable modal dialog system that can be
 * used throughout the admin interface. It allows for easy creation of
 * different types of modals with customizable content and actions.
 */

class ModalTemplate {
    /**
     * Base modal template class that handles the modal functionality
     * @param {Object} options - Configuration options for the modal
     */
    constructor(options = {}) {
        this.id = options.id || `modal-${Date.now()}`;
        this.title = options.title || 'Modal';
        this.content = options.content || '';
        this.type = options.type || 'default';
        this.width = options.width || '600px';
        this.buttons = options.buttons || [];
        this.closeOnClickOutside = options.closeOnClickOutside !== false;
        this.closeOnEsc = options.closeOnEsc !== false;
        this.destroyOnClose = options.destroyOnClose !== false;
        this.onClose = options.onClose || null;
        this.onShow = options.onShow || null;
        this.customClass = options.customClass || '';
        
        // Create modal element in memory (not attached to DOM yet)
        this.element = this.createModalElement();
        
        // Setup event handlers
        this.setupEventHandlers();
    }
    
    /**
     * Creates the modal DOM structure
     * @returns {HTMLElement} The modal element
     */
    createModalElement() {
        // Create the main modal element
        const modal = document.createElement('div');
        modal.id = this.id;
        modal.className = `modal ${this.customClass}`;
        
        // Create the modal content container
        const modalContent = document.createElement('div');
        modalContent.className = `modal-content modal-type-${this.type}`;
        if (this.width) {
            modalContent.style.maxWidth = this.width;
        }
        
        // Create modal header
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        
        const modalTitle = document.createElement('h2');
        modalTitle.textContent = this.title;
        modalTitle.className = 'modal-title';
        
        const closeButton = document.createElement('span');
        closeButton.className = 'close';
        closeButton.innerHTML = '&times;';
        closeButton.setAttribute('title', 'Close');
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeButton);
        
        // Create modal body
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        if (typeof this.content === 'string') {
            modalBody.innerHTML = this.content;
        } else if (this.content instanceof HTMLElement) {
            modalBody.appendChild(this.content);
        }
        
        // Create modal footer with buttons
        const modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        
        this.buttons.forEach(button => {
            const buttonElement = document.createElement('button');
            buttonElement.textContent = button.text || 'Button';
            buttonElement.className = button.class || 'action-button';
            if (button.id) {
                buttonElement.id = button.id;
            }
            if (button.disabled) {
                buttonElement.disabled = true;
            }
            modalFooter.appendChild(buttonElement);
        });
        
        // Assemble the modal
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modalContent.appendChild(modalFooter);
        modal.appendChild(modalContent);
        
        return modal;
    }
    
    /**
     * Set up all event handlers for the modal
     */
    setupEventHandlers() {
        // Close button click handler
        const closeBtn = this.element.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // Button click handlers
        this.buttons.forEach((button, index) => {
            if (button.action || button.close !== false) {
                const buttonElement = this.element.querySelectorAll('.modal-footer button')[index];
                if (buttonElement) {
                    buttonElement.addEventListener('click', (e) => {
                        if (button.action) {
                            button.action(e, this);
                        }
                        if (button.close !== false) {
                            this.close();
                        }
                    });
                }
            }
        });
        
        // Click outside handler
        if (this.closeOnClickOutside) {
            this.element.addEventListener('click', (event) => {
                if (event.target === this.element) {
                    this.close();
                }
            });
        }
        
        // ESC key handler
        if (this.closeOnEsc) {
            const escHandler = (event) => {
                if (event.key === 'Escape') {
                    this.close();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        }
    }
    
    /**
     * Shows the modal by adding it to the document body
     */
    show() {
        // Add to DOM if not already present
        if (!document.body.contains(this.element)) {
            document.body.appendChild(this.element);
        }
        
        // Display the modal
        this.element.style.display = 'block';
        
        // Apply animation
        setTimeout(() => {
            this.element.querySelector('.modal-content').style.transform = 'translateY(0)';
            this.element.querySelector('.modal-content').style.opacity = '1';
        }, 10);
        
        // Run onShow callback if provided
        if (typeof this.onShow === 'function') {
            this.onShow(this);
        }
    }
    
    /**
     * Closes the modal and optionally removes it from the DOM
     */
    close() {
        // Hide the modal first
        this.element.style.display = 'none';
        
        // Run onClose callback if provided
        if (typeof this.onClose === 'function') {
            this.onClose(this);
        }
        
        // Remove from DOM if destroyOnClose is true
        if (this.destroyOnClose && document.body.contains(this.element)) {
            document.body.removeChild(this.element);
        }
    }
    
    /**
     * Updates the modal content
     * @param {string|HTMLElement} content - New content for the modal body
     */
    updateContent(content) {
        const modalBody = this.element.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = '';
            if (typeof content === 'string') {
                modalBody.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                modalBody.appendChild(content);
            }
        }
    }
    
    /**
     * Updates the modal title
     * @param {string} title - New title for the modal
     */
    updateTitle(title) {
        const modalTitle = this.element.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.textContent = title;
        }
    }
    
    /**
     * Get an element within the modal by selector
     * @param {string} selector - CSS selector for the element
     * @returns {HTMLElement} The found element or null
     */
    getElement(selector) {
        return this.element.querySelector(selector);
    }
    
    /**
     * Enable or disable a button in the modal by index
     * @param {number} index - Button index (0-based)
     * @param {boolean} isDisabled - Whether to disable the button
     */
    setButtonState(index, isDisabled) {
        const buttons = this.element.querySelectorAll('.modal-footer button');
        if (buttons[index]) {
            buttons[index].disabled = isDisabled;
        }
    }
}

/**
 * Main Modal Manager class that provides easy ways to create different types of modals
 */
class ModalManager {
    /**
     * Creates a custom modal with the provided options
     * @param {Object} options - Modal configuration options
     * @returns {ModalTemplate} The created modal instance
     */
    static custom(options) {
        const modal = new ModalTemplate(options);
        modal.show();
        return modal;
    }
    
    /**
     * Creates an alert modal
     * @param {string} title - Modal title
     * @param {string} message - Alert message
     * @param {string} type - Alert type: 'info', 'success', 'error', 'warning'
     * @param {Function} onClose - Callback when modal is closed
     * @returns {ModalTemplate} The created modal instance
     */
    static alert(title, message, type = 'info', onClose = null) {
        const modal = new ModalTemplate({
            title,
            content: `<p class="modal-message">${message}</p>`,
            type,
            customClass: `${type}-modal`,
            buttons: [
                {
                    text: 'OK',
                    class: 'action-button',
                    action: null
                }
            ],
            onClose
        });
        modal.show();
        return modal;
    }
    
    /**
     * Creates a confirmation modal
     * @param {string} title - Modal title
     * @param {string} message - Confirmation message
     * @param {Function} onConfirm - Callback when confirmed
     * @param {Function} onCancel - Callback when canceled
     * @param {string} confirmText - Text for the confirm button
     * @param {string} cancelText - Text for the cancel button
     * @returns {ModalTemplate} The created modal instance
     */
    static confirm(title, message, onConfirm, onCancel = null, confirmText = 'Confirm', cancelText = 'Cancel') {
        const modal = new ModalTemplate({
            title,
            content: `<p class="modal-message">${message}</p>`,
            type: 'confirm',
            buttons: [
                {
                    text: confirmText,
                    class: 'action-button',
                    action: (_, modal) => {
                        if (typeof onConfirm === 'function') {
                            onConfirm(modal);
                        }
                    }
                },
                {
                    text: cancelText,
                    class: 'cancel-button',
                    action: (_, modal) => {
                        if (typeof onCancel === 'function') {
                            onCancel(modal);
                        }
                    }
                }
            ]
        });
        modal.show();
        return modal;
    }
    
    /**
     * Creates a danger confirmation modal (for destructive actions)
     * @param {string} title - Modal title
     * @param {string} message - Confirmation message
     * @param {Function} onConfirm - Callback when confirmed
     * @param {Function} onCancel - Callback when canceled
     * @returns {ModalTemplate} The created modal instance
     */
    static dangerConfirm(title, message, onConfirm, onCancel = null) {
        return this.confirm(
            title,
            message,
            onConfirm,
            onCancel,
            'Delete',
            'Cancel'
        );
    }
    
    /**
     * Creates a prompt modal with an input field
     * @param {string} title - Modal title
     * @param {string} message - Prompt message
     * @param {Function} onSubmit - Callback when submitted with input value
     * @param {string} defaultValue - Default value for input
     * @param {string} placeholder - Placeholder text for input
     * @returns {ModalTemplate} The created modal instance
     */
    static prompt(title, message, onSubmit, defaultValue = '', placeholder = '') {
        const inputId = `prompt-input-${Date.now()}`;
        
        const modal = new ModalTemplate({
            title,
            content: `
                <p class="modal-message">${message}</p>
                <div class="modal-input-container">
                    <input type="text" id="${inputId}" class="modal-input" 
                           value="${defaultValue}" placeholder="${placeholder}">
                    <div class="modal-input-error" style="display: none;"></div>
                </div>
            `,
            type: 'prompt',
            buttons: [
                {
                    text: 'Submit',
                    class: 'action-button',
                    action: (_, modal) => {
                        const input = modal.getElement(`#${inputId}`);
                        const value = input.value.trim();
                        
                        if (typeof onSubmit === 'function') {
                            const errorElement = modal.getElement('.modal-input-error');
                            
                            // Allow validation via return value
                            const result = onSubmit(value, modal);
                            
                            // If returning false or an error string, prevent closing
                            if (result === false) {
                                return false;
                            } else if (typeof result === 'string') {
                                errorElement.textContent = result;
                                errorElement.style.display = 'block';
                                return false;
                            }
                        }
                    },
                    close: false // We'll handle closing based on validation
                },
                {
                    text: 'Cancel',
                    class: 'cancel-button'
                }
            ],
            onShow: (modal) => {
                // Focus the input when shown
                setTimeout(() => {
                    const input = modal.getElement(`#${inputId}`);
                    if (input) {
                        input.focus();
                        input.select();
                    }
                }, 100);
                
                // Submit on Enter key
                const handleEnter = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const submitBtn = modal.getElement('.action-button');
                        if (submitBtn) submitBtn.click();
                    }
                };
                
                modal.getElement(`#${inputId}`).addEventListener('keydown', handleEnter);
            }
        });
        
        modal.show();
        return modal;
    }
    
    /**
     * Creates a file selection modal
     * @param {string} title - Modal title
     * @param {Array} files - Array of file objects to display
     * @param {Function} onSelect - Callback when a file is selected
     * @param {Function} onDelete - Callback when delete is requested (optional)
     * @returns {ModalTemplate} The created modal instance
     */
    static fileSelect(title, files, onSelect, onDelete = null) {
        // Create the file list HTML
        let filesHTML = `
            <div class="file-list-container">
                <div class="file-table-header">
                    <div class="file-name-col">Filename</div>
                    <div class="file-title-col">Title</div>
                    <div class="file-date-col">Created Date</div>
                </div>
                <ul class="file-table">
        `;
        
        files.forEach(file => {
            filesHTML += `
                <li data-filename="${file.filename}" class="file-item">
                    <div class="file-name-col">${file.filename}</div>
                    <div class="file-title-col">${file.title || '(No title)'}</div>
                    <div class="file-date-col">${file.createdDate}</div>
                </li>
            `;
        });
        
        filesHTML += `
                </ul>
            </div>
        `;
        
        // Create modal with the file list
        const modal = new ModalTemplate({
            title,
            content: filesHTML,
            width: '800px',
            type: 'file-select',
            buttons: [
                {
                    text: 'Select',
                    class: 'action-button',
                    id: 'selectFileButton',
                    disabled: true,
                    action: (_, modal) => {
                        const selectedItem = modal.getElement('.file-item.selected');
                        if (selectedItem) {
                            const filename = selectedItem.dataset.filename;
                            if (typeof onSelect === 'function') {
                                onSelect(filename, modal);
                            }
                        }
                    }
                },
                ...(onDelete ? [{
                    text: 'Delete',
                    class: 'danger-button',
                    id: 'modalDeleteButton',
                    disabled: true,
                    action: (_, modal) => {
                        const selectedItem = modal.getElement('.file-item.selected');
                        if (selectedItem) {
                            const filename = selectedItem.dataset.filename;
                            if (typeof onDelete === 'function') {
                                onDelete(filename, modal);
                            }
                        }
                    },
                    close: false // Don't close on delete, let the callback handle it
                }] : []),
                {
                    text: 'Cancel',
                    class: 'cancel-button'
                }
            ],
            onShow: (modal) => {
                // Add click handler for list items
                const fileItems = modal.element.querySelectorAll('.file-item');
                fileItems.forEach(item => {
                    item.addEventListener('click', () => {
                        // Clear previous selection
                        fileItems.forEach(i => i.classList.remove('selected'));
                        // Select the clicked item
                        item.classList.add('selected');
                        // Enable buttons
                        modal.setButtonState(0, false); // Enable select button
                        if (onDelete) modal.setButtonState(1, false); // Enable delete button if it exists
                    });
                    
                    // Double-click to select and close
                    item.addEventListener('dblclick', () => {
                        item.classList.add('selected');
                        const filename = item.dataset.filename;
                        if (typeof onSelect === 'function') {
                            onSelect(filename, modal);
                            modal.close();
                        }
                    });
                });
            }
        });
        
        modal.show();
        return modal;
    }
}

// Export the ModalManager for use in other modules
export default ModalManager; 