/**
 * ModalTemplate.js - Base modal template class
 * 
 * This class provides the core functionality for creating and managing modal dialogs.
 * It handles DOM creation, event handling, and basic modal operations.
 */

export class ModalTemplate {
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

