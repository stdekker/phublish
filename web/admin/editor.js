// Initialize editor
const simplemde = new SimpleMDE({ element: document.getElementById("editor") });

function fetchWithAuth(url, options = {}) {
    const headers = {
        ...options.headers,
        'X-Admin-Token': sessionStorage.getItem('adminToken'),
        'X-Requested-With': 'XMLHttpRequest'
    };
    return fetch(url, { 
        ...options, 
        headers,
        credentials: 'same-origin',
        mode: 'same-origin'
    })
    .then(response => {
        if (response.status === 401) {
            // If unauthorized, redirect to login
            window.location.replace('login.php');
            throw new Error('Unauthorized');
        }
        return response;
    });
}

function loadFiles() {
    console.log('Loading files...');
    return fetchWithAuth('admin.php?op=list')
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || `HTTP error! status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(files => {
            console.log('Files loaded:', files);
            if (!files) return;
            const fileSelector = document.getElementById('fileSelector');
            fileSelector.innerHTML = '';
            files.forEach(file => {
                const option = document.createElement('option');
                option.value = file;
                option.textContent = file;
                fileSelector.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading files:', error);
            showError('save', error.message || 'Failed to load files');
        });
}

function extractMetadata(content) {
    const metadata = {};
    const lines = content.split('\n');
    let inMetadata = false;
    let contentStart = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '---') {
            if (inMetadata) {
                contentStart = i + 1;
                break;
            } else {
                inMetadata = true;
            }
        } else if (inMetadata) {
            const [key, ...value] = line.split(':');
            metadata[key.trim()] = value.join(':').trim();
        }
    }

    metadata.content = lines.slice(contentStart).join('\n');
    return metadata;
}

function formatMetadata(metadata) {
    return `---
title: ${metadata.title}
date: ${metadata.date}
slug: ${metadata.slug}${metadata.status === 'draft' ? '\nstatus: draft' : ''}
---
${simplemde.value().startsWith('\n') ? '' : '\n'}`;
}

function openModal() {
    document.getElementById('fileModal').style.display = 'block';
    
    // Enable/disable delete button based on selection
    const updateDeleteButton = () => {
        const fileSelector = document.getElementById('fileSelector');
        const deleteButton = document.getElementById('modalDeleteButton');
        deleteButton.disabled = !fileSelector.value;
    };
    
    // Initial state
    updateDeleteButton();
    
    // Update on selection change
    document.getElementById('fileSelector').addEventListener('change', updateDeleteButton);
}

function closeModal() {
    document.getElementById('fileModal').style.display = 'none';
}

// Event Listeners
document.getElementById('openFileButton').addEventListener('click', function() {
    loadFiles();
    openModal();
});

document.querySelector('.close').addEventListener('click', closeModal);
document.querySelector('.cancel-button').addEventListener('click', closeModal);

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('fileModal');
    if (event.target === modal) {
        closeModal();
    }
});

// Function to update the current filename display
function updateCurrentFileName(fileName) {
    document.getElementById('currentFileName').textContent = fileName || 'New file';
}

// Update the file selection handler
document.getElementById('selectFileButton').addEventListener('click', function() {
    const fileName = document.getElementById('fileSelector').value;
    if (!fileName) return;
    
    console.log('Loading file:', fileName);
    fetch(`admin.php?op=read&file=${encodeURIComponent(fileName)}`, {
        credentials: 'same-origin',
        mode: 'same-origin',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                try {
                    const err = JSON.parse(text);
                    throw new Error(err.error);
                } catch (e) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            });
        }
        return response.text();
    })
    .then(content => {
        console.log('File loaded successfully');
        const metadata = extractMetadata(content);
        document.getElementById('title').value = metadata.title || '';
        document.getElementById('date').value = metadata.date || '';
        document.getElementById('slug').value = metadata.slug || '';
        document.getElementById('draft').checked = metadata.status === 'draft';
        simplemde.value(metadata.content || '');
        updateCurrentFileName(fileName);
        closeModal();
    })
    .catch(error => {
        console.error('Error loading file:', error);
        showError('save', error.message || 'Failed to load file');
    });
});

// Add this function to show the success message with link
function showSuccessMessage(message, postUrl = null) {
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
    
    // Add the new message before the editor
    const editor = document.querySelector('.CodeMirror');
    editor.parentNode.insertBefore(container, editor);
    
    // Auto-hide after 10 seconds
    setTimeout(() => container.remove(), 10000);
}

function clearErrors() {
    // Clear all error messages
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    document.querySelectorAll('input').forEach(input => input.classList.remove('input-error'));
}

function showError(fieldId, message) {
    const errorEl = document.getElementById(`${fieldId}-error`);
    const inputEl = document.getElementById(fieldId);
    if (errorEl) {
        errorEl.textContent = message;
    }
    if (inputEl) {
        inputEl.classList.add('input-error');
    }
}

function validateField(fieldId, value) {
    const errors = [];
    switch (fieldId) {
        case 'title':
            if (!value || value.trim() === '') {
                errors.push('Title is required');
            }
            break;
        case 'date':
            if (!value || value.trim() === '') {
                errors.push('Date is required');
            }
            break;
        case 'slug':
            if (!value || value.trim() === '') {
                errors.push('Slug is required');
            }
            break;
    }
    return errors;
}

// Add real-time validation
['title', 'date', 'slug'].forEach(fieldId => {
    const input = document.getElementById(fieldId);
    input.addEventListener('blur', () => {
        const errors = validateField(fieldId, input.value);
        if (errors.length > 0) {
            showError(fieldId, errors[0]);
        } else {
            clearErrors();
        }
    });
    
    input.addEventListener('input', () => {
        document.getElementById(`${fieldId}-error`).textContent = '';
        input.classList.remove('input-error');
    });
});

// Update the validatePost function
function validatePost(metadata) {
    clearErrors();
    let hasErrors = false;
    
    ['title', 'date', 'slug'].forEach(field => {
        const errors = validateField(field, metadata[field]);
        if (errors.length > 0) {
            showError(field, errors[0]);
            hasErrors = true;
        }
    });
    
    return hasErrors;
}

function generateFilename(slug) {
    // Base filename from slug
    let baseFilename = `${slug}.md`;
    
    // Get all current files from the selector
    const fileSelector = document.getElementById('fileSelector');
    const existingFiles = Array.from(fileSelector.options).map(opt => opt.value);
    
    // If base filename doesn't exist, use it
    if (!existingFiles.includes(baseFilename)) {
        return baseFilename;
    }
    
    // Otherwise, find the next available number
    let counter = 1;
    while (existingFiles.includes(`${slug}-${counter}.md`)) {
        counter++;
    }
    return `${slug}-${counter}.md`;
}

// Update the save button event listener
document.getElementById('saveButton').addEventListener('click', function() {
    const metadata = {
        title: document.getElementById('title').value,
        date: document.getElementById('date').value,
        slug: document.getElementById('slug').value,
        status: document.getElementById('draft').checked ? 'draft' : 'published'
    };

    // Validate before saving
    if (validatePost(metadata)) {
        return; // Stop if there are validation errors
    }

    let fileName = document.getElementById('fileSelector').value;
    
    // If no file is selected, generate filename from slug
    if (!fileName) {
        fileName = generateFilename(metadata.slug);
    }

    const content = simplemde.value();
    const fullContent = formatMetadata(metadata) + content;
    
    // If this is a new file, create it first
    const isNewFile = !document.getElementById('fileSelector').value;
    
    const saveContent = () => {
        fetch('admin.php?op=write', {
            method: 'POST',
            credentials: 'same-origin',
            mode: 'same-origin',
            headers: { 
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ file: fileName, content: fullContent })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccessMessage('File saved successfully!', data.postUrl);
                updateCurrentFileName(fileName);
                if (isNewFile) {
                    // Refresh the file list and select the new file
                    loadFiles().then(() => {
                        const fileSelector = document.getElementById('fileSelector');
                        for (let i = 0; i < fileSelector.options.length; i++) {
                            if (fileSelector.options[i].value === fileName) {
                                fileSelector.selectedIndex = i;
                                break;
                            }
                        }
                    });
                }
            } else {
                showError('save', data.error || 'Failed to save file');
            }
        })
        .catch(error => {
            console.error('Error saving file:', error);
            showError('save', error.message || 'Failed to save file');
        });
    };

    if (isNewFile) {
        // Create the file first
        fetch('admin.php?op=create', {
            method: 'POST',
            credentials: 'same-origin',
            mode: 'same-origin',
            headers: { 
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ file: fileName })
        })
        .then(response => {
            if (response.ok) {
                saveContent();
            } else {
                showError('save', 'Failed to create new file');
            }
        })
        .catch(error => {
            console.error('Error creating file:', error);
            showError('save', error.message || 'Failed to create new file');
        });
    } else {
        saveContent();
    }
});

document.getElementById('newFileButton').addEventListener('click', function() {
    // Clear the editor and metadata
    document.getElementById('title').value = '';
    document.getElementById('date').value = '';
    document.getElementById('slug').value = '';
    document.getElementById('draft').checked = false;
    simplemde.value('');
    updateCurrentFileName(null);
    document.getElementById('fileSelector').value = '';
});

document.getElementById('renameFileButton').addEventListener('click', function() {
    const oldFileName = document.getElementById('fileSelector').value;
    const newFileName = prompt('Enter new file name:', oldFileName);
    if (newFileName && newFileName !== oldFileName) {
        fetch('admin.php?op=rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldFile: oldFileName, newFile: newFileName })
        }).then(response => {
            if (response.ok) {
                alert('File renamed successfully!');
                loadFiles();
            } else {
                alert('Failed to rename file.');
            }
        });
    }
});

document.getElementById('logoutButton').addEventListener('click', function() {
    fetchWithAuth('admin.php?op=logout')
        .then(response => {
            if (response.ok) {
                sessionStorage.removeItem('adminToken');
                window.location.replace('login.php');
            } else {
                alert('Logout failed');
            }
        })
        .catch(error => {
            console.error('Error during logout:', error);
            alert('Logout failed: ' + error.message);
        });
});

// Delete functionality
function openDeleteModal() {
    const fileName = document.getElementById('fileSelector').value;
    if (!fileName) {
        showError('save', 'No file selected to delete');
        return;
    }
    
    const modal = document.getElementById('deleteModal');
    // Display the filename in the confirmation modal
    modal.querySelector('.filename-display').textContent = fileName;
    modal.style.display = 'block';
    
    // Add event listeners for this specific modal instance
    const closeButton = modal.querySelector('.close');
    const cancelButton = modal.querySelector('.cancel-button');
    const confirmButton = modal.querySelector('#confirmDeleteButton');
    
    const closeModal = () => {
        modal.style.display = 'none';
        // Clean up event listeners
        closeButton.removeEventListener('click', closeModal);
        cancelButton.removeEventListener('click', closeModal);
        confirmButton.removeEventListener('click', handleDelete);
        window.removeEventListener('click', handleOutsideClick);
    };
    
    const handleDelete = () => {
        deleteFile(fileName);
        closeModal();
        // Also close the file modal
        document.getElementById('fileModal').style.display = 'none';
    };
    
    const handleOutsideClick = (event) => {
        if (event.target === modal) {
            closeModal();
        }
    };
    
    closeButton.addEventListener('click', closeModal);
    cancelButton.addEventListener('click', closeModal);
    confirmButton.addEventListener('click', handleDelete);
    window.addEventListener('click', handleOutsideClick);
}

function deleteFile(fileName) {
    fetchWithAuth('admin.php?op=delete', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file: fileName })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessMessage('File deleted successfully');
            // Clear the editor and metadata
            document.getElementById('title').value = '';
            document.getElementById('date').value = '';
            document.getElementById('slug').value = '';
            document.getElementById('draft').checked = false;
            simplemde.value('');
            updateCurrentFileName(null);
            // Refresh the file list
            loadFiles();
        } else {
            showError('save', data.error || 'Failed to delete file');
        }
    })
    .catch(error => {
        console.error('Error deleting file:', error);
        showError('save', error.message || 'Failed to delete file');
    });
}

// Update delete button event listener
document.getElementById('modalDeleteButton').addEventListener('click', openDeleteModal);

// Initialize
console.log('Initializing editor...');
loadFiles();

// Initialize with "New file"
updateCurrentFileName(null); 