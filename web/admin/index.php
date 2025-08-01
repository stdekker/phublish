<?php
require_once '../../vendor/autoload.php';

use Phublish\Admin\Security;
use Symfony\Component\Yaml\Yaml;

// Perform security checks - regular page that requires authentication
Security::securityCheck(true, false);

// Load blog configuration for template variables
$configPath = dirname(__DIR__, 2) . '/config/blog.yaml';
$config = Yaml::parseFile($configPath);

// Check origin for all requests
$allowedOrigin = $config['blog']['allowed_domain'] ?? '';
if (!$allowedOrigin) {
    throw new Exception('Admin domain not configured', 500);
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// For non-AJAX requests, check the referer
if (empty($origin)) {
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    if ($referer) {
        $allowedOriginHttp = preg_replace('#^https?://#', 'http://', $allowedOrigin);
        $allowedOriginHttps = preg_replace('#^https?://#', 'https://', $allowedOrigin);
        
        if (!str_starts_with($referer, $allowedOriginHttp) && !str_starts_with($referer, $allowedOriginHttps)) {
            http_response_code(403);
            echo "Access denied";
            exit;
        }
    }
}
// For AJAX requests, check the origin
else {
    $allowedOriginHttp = preg_replace('#^https?://#', 'http://', $allowedOrigin);
    $allowedOriginHttps = preg_replace('#^https?://#', 'https://', $allowedOrigin);
    
    if ($origin !== $allowedOriginHttp && $origin !== $allowedOriginHttps) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => 'Invalid origin',
            'code' => 403
        ]);
        exit;
    }
    
    // Set CORS headers for AJAX requests
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, X-Admin-Token, X-Requested-With");
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Editor</title>
    <link rel="stylesheet" href="https://uicdn.toast.com/editor/latest/toastui-editor.min.css" />
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header class="main-header">
        <h1>Edit Markdown Files</h1>
        <button id="logoutButton" class="danger-button">
            <span class="logout-text">Logout</span>
            <span class="logout-icon"></span>
        </button>
    </header>
    <div class="container">
        <div class="field-group">
            <label for="title">Title:</label>
            <input type="text" id="title" />
            <span class="error-message" id="title-error"></span>
        </div>
        <div class="fields-container">
            <div class="field-group">
                <label for="date">Date:</label>
                <input type="date" id="date" />
                <span class="error-message" id="date-error"></span>
            </div>
            <div class="field-group draft-group">
                <label for="draft">Draft:</label>
                <input type="checkbox" id="draft" />
            </div>
        </div>
        <div class="field-group">
            <label for="currentFileName">Filename:</label>
            <input type="text" id="currentFileName" />
            <span class="error-message" id="filename-error"></span>
        </div>
        <div id="editor"></div>
        <div class="button-group">
            <button id="saveButton">Save post</button>
            <button id="openFileButton">Open post</button>
            <button id="newFileButton">New post</button>
            <button id="deleteButton" class="danger-button" disabled>Delete post</button>
            <button id="manageFilesButton">Manage Uploads</button>
            <span class="error-message" id="save-error"></span>
        </div>
    </div>

    <!-- Post file selection modal -->
    <div id="fileModal" class="modal">
        <div class="modal-content modal-type-default">
            <div class="modal-header">
                <h2>Select post md file</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <div class="file-list-container">
                    <div class="file-table-header">
                        <div class="file-name-col">Filename</div>
                        <div class="file-title-col">Title</div>
                        <div class="file-date-col">Created Date</div>
                    </div>
                    <ul id="fileList" class="file-table">
                        <!-- Post files will be populated dynamically -->
                    </ul>
                </div>
            </div>
            <div class="modal-footer">
                <button id="selectFileButton" class="action-button">Open</button>
                <button id="modalDeleteButton" class="danger-button">Delete</button>
                <button class="cancel-button">Cancel</button>
            </div>
        </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div id="deleteModal" class="modal">
        <div class="modal-content modal-type-confirm">
            <div class="modal-header">
                <h2>Confirm Delete</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to delete this file? This action cannot be undone.</p>
                <p class="filename-display"></p>
            </div>
            <div class="modal-footer">
                <button id="confirmDeleteButton" class="danger-button">Delete</button>
                <button class="cancel-button">Cancel</button>
            </div>
        </div>
    </div>

    <!-- Message Modal -->
    <div id="messageModal" class="modal">
        <div class="modal-content modal-type-info">
            <div class="modal-header">
                <h2 id="messageModalTitle">Message</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <p id="messageModalContent"></p>
            </div>
            <div class="modal-footer">
                <button class="action-button">OK</button>
            </div>
        </div>
    </div>

    <!-- Add this modal for file management -->
    <div id="uploadsManagerModal" class="modal">
        <div class="modal-content modal-type-default">
            <div class="modal-header">
                <h2>Manage Uploads</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <input type="file" id="fileUploadInput" />
                <button id="uploadFileButton" class="action-button">Upload</button>
                <div class="file-list-container">
                    <ul id="fileList"></ul>
                </div>
            </div>
            <div class="modal-footer">
                <button id="addToEditorButton" class="action-button" disabled>Add to Editor</button>
                <button class="cancel-button">Close</button>
            </div>
        </div>
    </div>

    <script src="https://uicdn.toast.com/editor/latest/toastui-editor-all.min.js"></script>
    <script type="module" src="js/editor.js"></script>
</body>
</html> 