<?php
namespace Phublish\Admin;

use Phublish\BlogGenerator;
use Phublish\Admin\Mailer;
use Symfony\Component\Yaml\Yaml;

class AdminController {
    public function verifyToken(string $token): array {
        session_start();
        $response = ['success' => false];
        
        if ($sessionToken = Auth::verifyToken($token)) {
            $_SESSION['admin'] = true;
            $_SESSION['token'] = $sessionToken;
            $response = [
                'success' => true,
                'sessionToken' => $sessionToken
            ];
        }
        
        return $response;
    }
    
    public function listFiles(): array {
        return FileManager::listFiles();
    }
    
    public function readFile(string $filename): ?string {
        return FileManager::readFile($filename);
    }
    
    public function writeFile(string $filename, string $content): array {
        // Validate required metadata fields
        $lines = explode("\n", $content);
        $metadata = [];
        $inMetadata = false;
        
        foreach ($lines as $line) {
            if (trim($line) === '---') {
                $inMetadata = !$inMetadata;
                continue;
            }
            if ($inMetadata && preg_match('/^([^:]+):\s*(.*)$/', $line, $matches)) {
                $metadata[trim($matches[1])] = trim($matches[2]);
            }
        }

        // Check required fields
        if (empty($metadata['title'])) {
            return ['success' => false, 'error' => 'Title is required'];
        }
        if (empty($metadata['date'])) {
            return ['success' => false, 'error' => 'Date is required'];
        }

        if (FileManager::writeFile($filename, $content)) {
            // Regenerate the blog
            try {
                $blogGenerator = new BlogGenerator();
                $blogGenerator->generate();
            } catch (\Exception $e) {
                // Log the error but don't fail the save operation
                error_log('Failed to regenerate blog after saving ' . $filename . ': ' . $e->getMessage());
                // Still return success since the file was saved
            }
            
            // Get slug from filename (remove .md extension)
            $slug = preg_replace('/\.md$/', '', $filename);
            
            // Check if it's a draft
            $isDraft = false;
            $inMetadata = false;
            foreach ($lines as $line) {
                if (trim($line) === '---') {
                    $inMetadata = !$inMetadata;
                    continue;
                }
                if ($inMetadata && preg_match('/^status:\s*draft\s*$/', $line)) {
                    $isDraft = true;
                    break;
                }
            }
            
            return [
                'success' => true,
                'postUrl' => !$isDraft ? '/' . $slug : null
            ];
        }
        return ['success' => false];
    }
    
    public function createFile(string $filename): bool {
        return FileManager::createFile($filename);
    }
    
    public function renameFile(string $oldName, string $newName): bool {
        return FileManager::renameFile($oldName, $newName);
    }

    public function deleteFile(string $filename): array {
        if (FileManager::deleteFile($filename)) {
            // Regenerate the blog after successful deletion
            try {
                $blogGenerator = new BlogGenerator();
                $blogGenerator->generate();
            } catch (\Exception $e) {
                // Log the error but don't fail the delete operation
                error_log('Failed to regenerate blog after deleting ' . $filename . ': ' . $e->getMessage());
                // Still return success since the file was deleted
            }
            
            return ['success' => true];
        }
        return ['success' => false, 'error' => 'Failed to delete file'];
    }

    public function sendLoginLink(string $adminEmail): bool {
        // Check rate limit before processing
        $rateLimiter = new RateLimiter(3, 3600); // 3 requests per hour
        $limitCheck = $rateLimiter->checkLimit();
        
        if (!$limitCheck['allowed']) {
            $timeUntilReset = $rateLimiter->getTimeUntilReset();
            $minutesUntilReset = ceil($timeUntilReset / 60);
            throw new \Exception("Too many login requests. Please try again in {$minutesUntilReset} minute(s).");
        }
        
        // Generate a secure random token
        $token = bin2hex(random_bytes(32));
        
        // Token will expire in 1 hour
        $expires = time() + 3600;
        
        // Load existing tokens
        $tokensFile = dirname(__DIR__, 2) . '/data/tokens.json';
        $tokens = [];
        if (file_exists($tokensFile)) {
            $tokens = json_decode(file_get_contents($tokensFile), true) ?? [];
        }
        
        // Add new token
        $tokens[$token] = [
            'created' => time(),
            'expires' => $expires
        ];
        
        // Ensure data directory exists
        if (!is_dir(dirname($tokensFile))) {
            mkdir(dirname($tokensFile), 0755, true);
        }
        
        // Save tokens
        file_put_contents($tokensFile, json_encode($tokens));
        
        // Get base URL from configuration
        $configPath = dirname(__DIR__, 2) . '/config/blog.yaml';
        $config = Yaml::parseFile($configPath);
        $baseUrl = ($config['blog']['base_url'] ?? 'http://localhost') . '/admin/login.php';
        
        $loginUrl = $baseUrl . '?token=' . $token;
        
        // Send email using Mailer service
        try {
            $mailer = new Mailer();
            $mailer->sendLoginLink($adminEmail, $loginUrl);
            
            // Record the request only after successful email send
            $rateLimiter->recordRequest();
            
            return true;
        } catch (\Exception $e) {
            error_log('Failed to send login email: ' . $e->getMessage());
            throw new \Exception('Failed to send login email');
        }
    }
} 