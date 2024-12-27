<?php
namespace Phublish\Admin;

use Symfony\Component\Yaml\Yaml;

class Auth {
    private static function getSessionLifetime(): int {
        $configPath = dirname(__DIR__, 2) . '/config/blog.yaml';
        $config = Yaml::parseFile($configPath);
        return $config['blog']['session_lifetime'] ?? 3600; // Default 1 hour
    }
    
    public static function loadTokens(): array {
        $file = Config::getTokensPath();
        if (file_exists($file)) {
            return json_decode(file_get_contents($file), true) ?? [];
        }
        return [];
    }
    
    public static function saveTokens(array $tokens): void {
        file_put_contents(Config::getTokensPath(), json_encode($tokens));
    }
    
    public static function verifyToken(string $token): ?string {
        $tokens = self::loadTokens();
        
        if (isset($tokens[$token])) {
            $tokenData = $tokens[$token];
            if ($tokenData['expires'] > time()) {
                // Token is valid, create a session
                $sessionToken = bin2hex(random_bytes(32));
                
                // Remove the used token
                unset($tokens[$token]);
                self::saveTokens($tokens);
                
                // Set session expiration
                if (session_status() === PHP_SESSION_NONE) {
                    session_start();
                }
                $_SESSION['admin'] = true;
                $_SESSION['token'] = $sessionToken;
                $_SESSION['expires'] = time() + self::getSessionLifetime();
                session_write_close();
                
                return $sessionToken;
            }
        }
        return null;
    }
    
    public static function checkAuth(): bool {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        // Check if session exists and is not expired
        if (isset($_SESSION['admin']) && 
            $_SESSION['admin'] === true && 
            isset($_SESSION['expires'])) {
            
            if (time() < $_SESSION['expires']) {
                // Extend session lifetime on activity
                $_SESSION['expires'] = time() + self::getSessionLifetime();
                session_write_close();
                return true;
            }
            
            // Session expired, clean up
            session_destroy();
        }
        
        return false;
    }
} 