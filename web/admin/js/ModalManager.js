/**
 * ModalManager.js - Unified modal system for admin backend
 * 
 * This module provides a flexible, reusable modal dialog system that can be
 * used throughout the admin interface. It acts as a facade for the various
 * modal implementations.
 */

import { ModalTemplate } from './modals/ModalTemplate.js';
import { createAlertModal } from './modals/AlertModal.js';
import { createConfirmModal, createDangerConfirmModal } from './modals/ConfirmModal.js';
import { createPromptModal } from './modals/PromptModal.js';
import { createFileSelectModal } from './modals/FileSelectModal.js';

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
        return createAlertModal(title, message, type, onClose);
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
        return createConfirmModal(title, message, onConfirm, onCancel, confirmText, cancelText);
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
        return createDangerConfirmModal(title, message, onConfirm, onCancel);
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
        return createPromptModal(title, message, onSubmit, defaultValue, placeholder);
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
        return createFileSelectModal(title, files, onSelect, onDelete);
    }
}

// Export the ModalManager for use in other modules
export default ModalManager;
