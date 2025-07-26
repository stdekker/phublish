<?php
require_once '../../vendor/autoload.php';

use Phublish\Admin\Auth;
use Phublish\Admin\Security;
use Phublish\Admin\AdminController;
use Symfony\Component\Yaml\Yaml;

// Perform security checks first - this is an API endpoint
// The 'verify' and 'checkSession' operations don't require authentication
$operation = $_GET['op'] ?? '';
$requireAuth = !in_array($operation, ['verify', 'checkSession']);
Security::securityCheck($requireAuth, true);

// Load blog configuration for use in operations
$configPath = dirname(__DIR__, 2) . '/config/blog.yaml';
$config = Yaml::parseFile($configPath);

// Check origin for all requests
$allowedOrigin = $config['blog']['allowed_domain'] ?? '';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (!$allowedOrigin) {
    throw new Exception('Admin domain not configured', 500);
}

// Only check origin if it's present (cross-origin requests)
if ($origin) {
    // Create alternate versions of allowed origin (http and https)
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
    
    // Set CORS headers only for cross-origin requests
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, X-Admin-Token, X-Requested-With");
}

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$controller = new AdminController();

// Log the request
error_log("Admin operation requested: " . $operation);

try {
    switch ($operation) {
        case 'verify':
            header('Content-Type: application/json');
            $data = json_decode(file_get_contents('php://input'), true);
            error_log("Verifying token: " . ($data['token'] ?? 'no token'));
            
            if (!isset($data['token'])) {
                echo json_encode(['success' => false, 'error' => 'No token provided']);
                exit;
            }
            
            $sessionToken = $controller->verifyToken($data['token'] ?? '');
            if ($sessionToken) {
                echo json_encode([
                    'success' => true,
                    'sessionToken' => $sessionToken
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Invalid or expired token'
                ]);
            }
            break;
            
        case 'list':
            error_log("Listing files");
            header('Content-Type: application/json');
            echo json_encode($controller->listFiles());
            break;
            
        case 'read':
            $filename = $_GET['file'] ?? '';
            error_log("Reading file: " . $filename);
            $content = $controller->readFile($filename);
            if ($content !== null) {
                header('Content-Type: text/plain');
                echo $content;
            } else {
                header('Content-Type: application/json');
                throw new Exception('File not found: ' . $filename, 404);
            }
            break;
            
        case 'write':
            $data = json_decode(file_get_contents('php://input'), true);
            error_log("Writing file: " . ($data['file'] ?? 'no file specified'));
            header('Content-Type: application/json');
            $result = $controller->writeFile($data['file'], $data['content']);
            if ($result['success']) {
                echo json_encode($result);
            } else {
                throw new Exception('Failed to save file', 500);
            }
            break;
            
        case 'create':
            $data = json_decode(file_get_contents('php://input'), true);
            error_log("Creating file: " . ($data['file'] ?? 'no file specified'));
            header('Content-Type: application/json');
            if ($controller->createFile($data['file'])) {
                echo json_encode(['success' => true]);
            } else {
                throw new Exception('Failed to create file', 400);
            }
            break;
            
        case 'rename':
            $data = json_decode(file_get_contents('php://input'), true);
            error_log("Renaming file from " . ($data['oldFile'] ?? 'none') . " to " . ($data['newFile'] ?? 'none'));
            header('Content-Type: application/json');
            if ($controller->renameFile($data['oldFile'], $data['newFile'])) {
                echo json_encode(['success' => true]);
            } else {
                throw new Exception('Failed to rename file', 400);
            }
            break;
            
        case 'logout':
            error_log("Processing logout request");
            session_start();
            session_destroy();
            header('Content-Type: application/json');
            echo json_encode(['success' => true]);
            break;
            
        case 'checkSession':
            error_log("Checking session status");
            header('Content-Type: application/json');
            // Manually check auth since this operation bypasses security check
            $sessionValid = Auth::checkAuth();
            echo json_encode(['success' => true, 'sessionValid' => $sessionValid]);
            break;
            
        case 'delete':
            $data = json_decode(file_get_contents('php://input'), true);
            error_log("Deleting file: " . ($data['file'] ?? 'no file specified'));
            header('Content-Type: application/json');
            $result = $controller->deleteFile($data['file']);
            echo json_encode($result);
            break;
            
        default:
            header('Content-Type: application/json');
            throw new Exception('Invalid operation: ' . $operation, 400);
    }
    
} catch (Exception $e) {
    error_log("Admin error: " . $e->getMessage());
    http_response_code($e->getCode() ?: 500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => $e->getMessage(),
        'code' => $e->getCode()
    ]);
} 