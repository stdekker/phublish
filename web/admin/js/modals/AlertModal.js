/**
 * AlertModal.js - Alert modal implementation
 * 
 * Creates a simple alert modal for displaying messages to the user.
 */

import { ModalTemplate } from './ModalTemplate.js';

/**
 * Creates an alert modal
 * @param {string} title - Modal title
 * @param {string} message - Alert message
 * @param {string} type - Alert type: 'info', 'success', 'error', 'warning'
 * @param {Function} onClose - Callback when modal is closed
 * @returns {ModalTemplate} The created modal instance
 */
export function createAlertModal(title, message, type = 'info', onClose = null) {
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

