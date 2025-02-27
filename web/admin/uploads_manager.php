<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '../../vendor/autoload.php';

use Phublish\Admin\Security;

// Perform security checks - this is an API endpoint that requires authentication
Security::securityCheck(true, true);

$uploadDir = dirname(__DIR__, 2) . '/web/uploads/';

// Ensure the upload directory exists
if (!is_dir($uploadDir)) {
    error_log("Upload directory does not exist: $uploadDir");
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Upload directory does not exist']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Check if this is a delete action
    if (isset($_POST['action']) && $_POST['action'] === 'delete') {
        error_log("Delete action received: " . print_r($_POST, true));
        $fileName = $_POST['file'] ?? '';
        
        if (empty($fileName)) {
            error_log("No filename provided for deletion");
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'error' => 'No filename provided']);
            exit;
        }
        
        $targetFile = $uploadDir . basename($fileName);
        error_log("Attempting to delete file: $targetFile");
        
        if (!file_exists($targetFile)) {
            error_log("File does not exist: $targetFile");
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'error' => 'File does not exist']);
            exit;
        }
        
        if (unlink($targetFile)) {
            error_log("File deleted successfully: $targetFile");
            header('Content-Type: application/json');
            echo json_encode(['success' => true]);
        } else {
            error_log("Failed to delete file: $targetFile - " . error_get_last()['message']);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'error' => 'Failed to delete file: ' . error_get_last()['message']]);
        }
        exit;
    }
    
    // Handle file upload
    if (!isset($_FILES['file'])) {
        echo json_encode(['success' => false, 'error' => 'No file uploaded']);
        exit;
    }

    $file = $_FILES['file'];
    $targetFile = $uploadDir . basename($file['name']);

    if (move_uploaded_file($file['tmp_name'], $targetFile)) {
        echo json_encode(['success' => true, 'file' => basename($file['name'])]);
    } else {
        error_log("Failed to move uploaded file to $targetFile");
        echo json_encode(['success' => false, 'error' => 'Failed to upload file']);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    error_log("Handling GET request for file list");
    $files = array_diff(scandir($uploadDir), array('.', '..'));

    // Get file modification times and sort by newest first
    $fileData = [];
    foreach ($files as $file) {
        $filePath = $uploadDir . $file;
        $fileData[$file] = filemtime($filePath);
    }
    arsort($fileData); // Sort by modification time, newest first

    $sortedFiles = [];
    foreach ($fileData as $file => $timestamp) {
        $sortedFiles[] = [
            'name' => $file,
            'date' => date('Y-m-d H:i:s', $timestamp)
        ];
    }

    error_log("Files found: " . implode(", ", array_column($sortedFiles, 'name')));
    echo json_encode(['success' => true, 'files' => $sortedFiles]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    parse_str(file_get_contents("php://input"), $data);
    $fileName = $data['file'] ?? '';
    
    if (empty($fileName)) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'No filename provided']);
        exit;
    }
    
    $targetFile = $uploadDir . basename($fileName);
    error_log("Attempting to delete file: $targetFile");
    
    if (file_exists($targetFile) && unlink($targetFile)) {
        header('Content-Type: application/json');
        echo json_encode(['success' => true]);
    } else {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Failed to delete file']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']); 