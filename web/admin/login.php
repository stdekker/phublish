<?php
require_once '../../vendor/autoload.php';
use Phublish\Admin\Auth;
use Phublish\Admin\AdminController;
use Symfony\Component\Yaml\Yaml;

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
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="messageModalTitle">Message</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <p id="messageModalContent"></p>
            </div>
            <div class="modal-footer">
                <button class="action-button" onclick="closeMessageModal()">OK</button>
            </div>
        </div>
    </div>

    <script>
        function showMessageModal(title, message, type = 'info') {
            const modal = document.getElementById('messageModal');
            const modalContent = modal.querySelector('.modal-content');
            
            modalContent.classList.remove('success-modal', 'error-modal');
            if (type === 'success') {
                modalContent.classList.add('success-modal');
            } else if (type === 'error') {
                modalContent.classList.add('error-modal');
            }
            
            document.getElementById('messageModalTitle').textContent = title;
            document.getElementById('messageModalContent').textContent = message;
            modal.style.display = 'block';
            
            const closeBtn = modal.querySelector('.close');
            closeBtn.onclick = () => closeMessageModal();
            
            window.onclick = (event) => {
                if (event.target === modal) {
                    closeMessageModal();
                }
            };
        }

        function closeMessageModal() {
            document.getElementById('messageModal').style.display = 'none';
        }

        // Add event listener for the request login button
        document.getElementById('requestLogin').addEventListener('click', async () => {
            try {
                const response = await fetch('login.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: 'request_login=1',
                    credentials: 'same-origin'
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showMessageModal('Success', data.message, 'success');
                } else {
                    showMessageModal('Error', data.error, 'error');
                }
            } catch (error) {
                console.error('Request failed:', error);
                showMessageModal('Error', 'Failed to request login link. Please try again.', 'error');
            }
        });

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
                showMessageModal('Error', error.message || 'Login failed. Please request a new login link.', 'error');
            });
        }
    </script>
</body>
</html> 