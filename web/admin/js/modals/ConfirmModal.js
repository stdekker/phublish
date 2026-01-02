/**
 * ConfirmModal.js - Confirmation modal implementation
 * 
 * Creates confirmation modals for user actions, including danger confirmations.
 */

import { ModalTemplate } from './ModalTemplate.js';

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
export function createConfirmModal(title, message, onConfirm, onCancel = null, confirmText = 'Confirm', cancelText = 'Cancel') {
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
export function createDangerConfirmModal(title, message, onConfirm, onCancel = null) {
    return createConfirmModal(
        title,
        message,
        onConfirm,
        onCancel,
        'Delete',
        'Cancel'
    );
}

