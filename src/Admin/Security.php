<?php
namespace Phublish\Admin;

use Symfony\Component\Yaml\Yaml;
use Exception;

/**
 * Security class for consistent authentication and security checks across admin pages
 */
class Security {
    /**
     * Perform all security checks for admin pages
     * 
     * @param bool $requireAuth Whether authentication is required (false for login page)
     * @param bool $isApiEndpoint Whether the current page is an API endpoint
     * @return void
     * @throws Exception If security checks fail
     */
    public static function securityCheck(bool $requireAuth = true, bool $isApiEndpoint = false): void {
        // Load blog configuration
        $configPath = dirname(__DIR__, 2) . '/config/blog.yaml';
        $config = Yaml::parseFile($configPath);
        
        // Check allowed domain configuration
        $allowedOrigin = $config['blog']['allowed_domain'] ?? '';
        if (!$allowedOrigin) {
            if ($isApiEndpoint) {
                http_response_code(500);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Admin domain not configured', 'code' => 500]);
                exit;
            } else {
                throw new Exception('Admin domain not configured', 500);
            }
        }
        
        // CORS and origin validation
        self::validateOrigin($allowedOrigin, $isApiEndpoint);
        
        // Handle preflight requests for API endpoints
        if ($isApiEndpoint && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            exit(0);
        }
        
        // Authentication check if required
        if ($requireAuth && !Auth::checkAuth()) {
            if ($isApiEndpoint) {
                http_response_code(401);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Unauthorized', 'code' => 401]);
                exit;
            } else {
                // For regular pages, redirect to login
                header('Location: login.php');
                exit;
            }
        }
    }
    
    /**
     * Validate the request origin against allowed domains
     * 
     * @param string $allowedOrigin The configured allowed origin
     * @param bool $isApiEndpoint Whether the current page is an API endpoint
     * @return void
     */
    private static function validateOrigin(string $allowedOrigin, bool $isApiEndpoint): void {
        // Create alternate versions of allowed origin (http and https)
        $allowedOriginHttp = preg_replace('#^https?://#', 'http://', $allowedOrigin);
        $allowedOriginHttps = preg_replace('#^https?://#', 'https://', $allowedOrigin);
        
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        
        // Only check origin if it's present (cross-origin requests)
        if ($origin) {
            if ($origin !== $allowedOriginHttp && $origin !== $allowedOriginHttps) {
                if ($isApiEndpoint) {
                    http_response_code(403);
                    header('Content-Type: application/json');
                    echo json_encode(['error' => 'Invalid origin', 'code' => 403]);
                    exit;
                } else {
                    http_response_code(403);
                    echo "Access denied";
                    exit;
                }
            }
            
            // Set CORS headers only for cross-origin requests
            header("Access-Control-Allow-Origin: $origin");
            header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
            header("Access-Control-Allow-Headers: Content-Type, X-Admin-Token, X-Requested-With");
        }
        // For non-AJAX requests, check the referer
        else {
            $referer = $_SERVER['HTTP_REFERER'] ?? '';
            if ($referer) {
                if (!str_starts_with($referer, $allowedOriginHttp) && 
                    !str_starts_with($referer, $allowedOriginHttps)) {
                    http_response_code(403);
                    echo "Access denied";
                    exit;
                }
            }
        }
    }
} 