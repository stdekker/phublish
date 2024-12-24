<?php
require_once '../../vendor/autoload.php';
use Sdkkr\Blog\Admin\Auth;
use Symfony\Component\Yaml\Yaml;

// Load blog configuration
$configPath = dirname(__DIR__, 2) . '/config/blog.yaml';
$config = Yaml::parseFile($configPath);

// Check if user is already authenticated
if (Auth::checkAuth()) {
    header('Location: index.php');
    exit;
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
        <p>Please use the login link.</p>
        <p class="info">Sessions last for <?php echo $sessionLifetimeMinutes; ?> minutes.</p>
    </div>
    <script>
        // Check if there's a token in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
            fetch('admin.php?op=verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ token }),
                credentials: 'same-origin'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success && data.sessionToken) {
                    sessionStorage.setItem('adminToken', data.sessionToken);
                    window.location.replace('index.php');
                } else {
                    throw new Error(data.error || 'Invalid or expired login link');
                }
            })
            .catch(error => {
                console.error('Login error:', error);
                document.getElementById('message').innerHTML = 
                    `<div class="error">${error.message || 'Login failed. Please request a new login link.'}</div>`;
            });
        }
    </script>
</body>
</html> 