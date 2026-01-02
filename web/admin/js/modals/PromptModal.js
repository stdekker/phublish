/**
 * PromptModal.js - Prompt modal implementation
 * 
 * Creates a modal with an input field for user text input.
 */

import { ModalTemplate } from './ModalTemplate.js';

/**
 * Creates a prompt modal with an input field
 * @param {string} title - Modal title
 * @param {string} message - Prompt message
 * @param {Function} onSubmit - Callback when submitted with input value
 * @param {string} defaultValue - Default value for input
 * @param {string} placeholder - Placeholder text for input
 * @returns {ModalTemplate} The created modal instance
 */
export function createPromptModal(title, message, onSubmit, defaultValue = '', placeholder = '') {
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

