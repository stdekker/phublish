/**
 * modals/index.js - Central export for all modal types
 * 
 * This file provides a convenient way to import all modal types from a single location.
 */

export { ModalTemplate } from './ModalTemplate.js';
export { createAlertModal } from './AlertModal.js';
export { createConfirmModal, createDangerConfirmModal } from './ConfirmModal.js';
export { createPromptModal } from './PromptModal.js';
export { createFileSelectModal } from './FileSelectModal.js';

