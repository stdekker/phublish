# Admin Backend Modal System

This document explains how to use the unified modal system for the admin backend.

## Introduction

The modal system provides a flexible, reusable way to create different types of modal dialogs with consistent styling and behavior. It offers pre-defined modal types as well as the ability to create fully customized modals.

## Usage

### Basic Modal Types

The ModalManager provides several pre-defined modal types:

#### Alert Modal

Use this for simple messages that require acknowledgment.

```javascript
import ModalManager from './ModalManager.js';

// Show an alert modal
ModalManager.alert(
    'Title', 
    'This is a simple message', 
    'info' // Can be: 'info', 'success', 'error', 'warning'
);
```

#### Confirmation Modal

Use this when you need to ask the user to confirm an action.

```javascript
ModalManager.confirm(
    'Confirm Action',
    'Are you sure you want to proceed?',
    // onConfirm callback
    () => {
        // Code to execute if user confirms
        console.log('User confirmed');
    },
    // onCancel callback (optional)
    () => {
        console.log('User canceled');
    },
    'Yes, Proceed', // Custom confirm button text (optional)
    'No, Cancel'    // Custom cancel button text (optional)
);
```

#### Danger Confirmation

A special type of confirmation modal for destructive actions.

```javascript
ModalManager.dangerConfirm(
    'Delete Item',
    'Are you sure you want to delete this item? This action cannot be undone.',
    () => {
        // Delete action code
        console.log('User confirmed deletion');
    }
);
```

#### Prompt Modal

Use this to get text input from the user.

```javascript
ModalManager.prompt(
    'Enter Value',
    'Please enter your name:',
    // onSubmit callback with validation
    (value, modal) => {
        if (!value) {
            return 'Name is required'; // Return error message
        }
        if (value.length < 3) {
            return 'Name must be at least 3 characters'; // Return error message
        }
        
        // Success - process the value
        console.log(`User entered: ${value}`);
        modal.close();
    },
    'Default Value', // Default value (optional)
    'Placeholder text' // Placeholder text (optional)
);
```

#### File Selection Modal

Use this to let the user select a file from a list.

```javascript
const files = [
    { filename: 'document1.md', title: 'First Document', createdDate: '2023-05-10' },
    { filename: 'document2.md', title: 'Second Document', createdDate: '2023-05-15' }
];

ModalManager.fileSelect(
    'Select a File',
    files,
    // onSelect callback
    (filename, modal) => {
        console.log(`Selected file: ${filename}`);
        modal.close();
    },
    // onDelete callback (optional)
    (filename, modal) => {
        console.log(`Delete requested for: ${filename}`);
        // Show confirmation, etc.
    }
);
```

### Custom Modals

For more complex needs, you can create fully customized modals:

```javascript
const modal = ModalManager.custom({
    title: 'Custom Modal',
    content: `
        <div class="custom-content">
            <p>This is a custom modal with HTML content.</p>
            <div class="form-group">
                <label for="custom-input">Enter something:</label>
                <input type="text" id="custom-input" class="modal-input">
            </div>
        </div>
    `,
    width: '500px', // Custom width
    type: 'custom', // Affects the header color
    customClass: 'my-special-modal', // Additional CSS class
    buttons: [
        {
            text: 'Save',
            class: 'action-button primary',
            action: (e, modal) => {
                const input = modal.getElement('#custom-input');
                console.log('Input value:', input.value);
            }
        },
        {
            text: 'Cancel',
            class: 'cancel-button'
        }
    ],
    onShow: (modal) => {
        // Do something when the modal is shown
        console.log('Modal shown');
    },
    onClose: (modal) => {
        // Do something when the modal is closed
        console.log('Modal closed');
    }
});
```

### Managing Modal State

When creating custom modals, you get a reference to the modal instance that you can use to update content or manage state:

```javascript
// Update modal content
modal.updateContent('New content');

// Update modal title
modal.updateTitle('New Title');

// Get an element inside the modal
const inputElement = modal.getElement('#some-input');

// Enable/disable buttons
modal.setButtonState(0, true); // Disable the first button
modal.setButtonState(1, false); // Enable the second button

// Close the modal programmatically
modal.close();
```

## Styling

The modal system comes with built-in styling that matches the admin interface. You can customize the appearance using CSS variables or by adding your own CSS classes to the modals.

## Creating New Modal Types

To create a new reusable modal type, you can extend the ModalManager with your own functions:

```javascript
// Add a custom modal type to ModalManager
ModalManager.imagePreview = function(imageUrl, title = 'Image Preview') {
    return ModalManager.custom({
        title,
        content: `<img src="${imageUrl}" alt="Preview" style="max-width: 100%">`,
        width: 'auto',
        type: 'info',
        buttons: [
            {
                text: 'Close',
                class: 'cancel-button'
            }
        ]
    });
};

// Usage
ModalManager.imagePreview('https://example.com/image.jpg', 'My Image');
```

## Best Practices

1. Use the pre-defined modal types when possible for consistency
2. Keep modal content concise and focused
3. Provide clear action buttons with descriptive text
4. Use appropriate modal types for the action (e.g., dangerConfirm for destructive actions)
5. Handle errors gracefully within modals
6. Ensure all modals are accessible to keyboard and screen readers

## Example Implementation

See `modal-example.js` for a demonstration of all modal types and how to use them. 