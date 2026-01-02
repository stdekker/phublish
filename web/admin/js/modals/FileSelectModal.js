/**
 * FileSelectModal.js - File selection modal implementation
 * 
 * Creates a modal for selecting files from a list with search functionality.
 */

import { ModalTemplate } from './ModalTemplate.js';

/**
 * Creates a file selection modal
 * @param {string} title - Modal title
 * @param {Array} files - Array of file objects to display
 * @param {Function} onSelect - Callback when a file is selected
 * @param {Function} onDelete - Callback when delete is requested (optional)
 * @returns {ModalTemplate} The created modal instance
 */
export function createFileSelectModal(title, files, onSelect, onDelete = null) {
    // Create the file list HTML with search input
    let filesHTML = `
        <div class="file-search-container">
            <input type="text" id="fileSearchInput" class="file-search-input" placeholder="Search by filename or title..." autocomplete="off" />
        </div>
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
            <li data-filename="${file.filename}" class="file-item" data-title="${(file.title || '').toLowerCase()}" data-filename-lower="${file.filename.toLowerCase()}">
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
            const searchInput = modal.element.querySelector('#fileSearchInput');
            const fileTable = modal.element.querySelector('.file-table');
            const allFileItems = Array.from(modal.element.querySelectorAll('.file-item'));
            
            // Helper function to filter and update visible items
            const updateVisibleItems = (searchTerm = '') => {
                const term = searchTerm.toLowerCase().trim();
                const visibleItems = allFileItems.filter(item => {
                    if (!term) return true;
                    const filename = item.dataset.filenameLower || '';
                    const title = item.dataset.title || '';
                    return filename.includes(term) || title.includes(term);
                });
                
                // Hide/show items
                allFileItems.forEach(item => {
                    if (visibleItems.includes(item)) {
                        item.style.display = '';
                    } else {
                        item.style.display = 'none';
                        item.classList.remove('selected');
                    }
                });
                
                // Auto-select if only one item is visible
                if (visibleItems.length === 1) {
                    const singleItem = visibleItems[0];
                    allFileItems.forEach(i => i.classList.remove('selected'));
                    singleItem.classList.add('selected');
                    modal.setButtonState(0, false); // Enable select button
                    if (onDelete) modal.setButtonState(1, false); // Enable delete button if it exists
                } else {
                    // Clear selection if selected item is hidden
                    const selectedItem = modal.element.querySelector('.file-item.selected');
                    if (selectedItem && selectedItem.style.display === 'none') {
                        modal.setButtonState(0, true); // Disable select button
                        if (onDelete) modal.setButtonState(1, true); // Disable delete button
                    }
                }
                
                return visibleItems;
            };
            
            // Search functionality
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    updateVisibleItems(e.target.value);
                });
                
                // Enter key handler - open selected file
                searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const selectedItem = modal.element.querySelector('.file-item.selected');
                        if (selectedItem && selectedItem.style.display !== 'none') {
                            const filename = selectedItem.dataset.filename;
                            if (typeof onSelect === 'function') {
                                onSelect(filename, modal);
                                modal.close();
                            }
                        }
                    }
                });
                
                // Focus search input when modal opens
                setTimeout(() => searchInput.focus(), 100);
            }
            
            // Add click handler for list items
            const handleItemClick = (item) => {
                // Clear previous selection
                allFileItems.forEach(i => i.classList.remove('selected'));
                // Select the clicked item
                item.classList.add('selected');
                // Enable buttons
                modal.setButtonState(0, false); // Enable select button
                if (onDelete) modal.setButtonState(1, false); // Enable delete button if it exists
            };
            
            allFileItems.forEach(item => {
                item.addEventListener('click', () => {
                    if (item.style.display !== 'none') {
                        handleItemClick(item);
                    }
                });
                
                // Double-click to select and close
                item.addEventListener('dblclick', () => {
                    if (item.style.display !== 'none') {
                        handleItemClick(item);
                        const filename = item.dataset.filename;
                        if (typeof onSelect === 'function') {
                            onSelect(filename, modal);
                            modal.close();
                        }
                    }
                });
            });
        }
    });
    
    modal.show();
    return modal;
}

