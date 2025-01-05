<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '../../vendor/autoload.php';

use Phublish\Admin\Auth;
use Symfony\Component\Yaml\Yaml;

// Check authentication
if (!Auth::checkAuth()) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Unauthorized', 'code' => 401]);
    exit;
}

$uploadDir = dirname(__DIR__, 2) . '/web/uploads/';

// Ensure the upload directory exists
if (!is_dir($uploadDir)) {
    error_log("Upload directory does not exist: $uploadDir");
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Upload directory does not exist']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
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
    $targetFile = $uploadDir . basename($fileName);

    if (file_exists($targetFile) && unlink($targetFile)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to delete file']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']); 