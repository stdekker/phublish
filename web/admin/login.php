<?php
require_once '../../vendor/autoload.php';
use Phublish\Admin\Auth;
use Phublish\Admin\Security;
use Phublish\Admin\AdminController;
use Symfony\Component\Yaml\Yaml;

// Perform security checks - login page doesn't require authentication
Security::securityCheck(false, false);

// Load blog configuration
$configPath = dirname(__DIR__, 2) . '/config/blog.yaml';
$config = Yaml::parseFile($configPath);

// Check if user is already authenticated
if (Auth::checkAuth()) {
    header('Location: index.php');
    exit;
}

// Initialize admin controller
$adminController = new AdminController();

// Handle login link request
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['request_login'])) {
    try {
        $adminEmail = $config['blog']['admin_email'] ?? null;
        if (!$adminEmail) {
            throw new Exception('Admin email not configured');
        }
        
        $result = $adminController->sendLoginLink($adminEmail);
        
        echo json_encode(['success' => true, 'message' => 'Login link has been sent to your email']);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// Check origin for all requests
$allowedOrigin = $config['blog']['allowed_domain'] ?? '';
if (!$allowedOrigin) {
    throw new Exception('Allowed domain not configured', 500);
}

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

// Get session lifetime for display
$sessionLifetime = $config['blog']['session_lifetime'] ?? 3600;
$sessionLifetimeMinutes = round($sessionLifetime / 60);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header class="main-header">
        <h1>Blog Admin Login</h1>
    </header>
    <div class="container">
        <div id="message"></div>
        <p>Click the button below to receive a login link via email.</p>
        <button id="requestLogin" class="button">Request Login Link</button>
        <p class="info">Sessions last for <?php echo $sessionLifetimeMinutes; ?> minutes.</p>
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

    <script type="module">
        import { LoginHandler } from './js/ui.js';
        
        // Initialize the login handler
        document.addEventListener('DOMContentLoaded', () => {
            new LoginHandler();
        });
    </script>
</body>
</html> 