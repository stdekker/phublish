<?php
namespace Sdkkr\Blog\Admin;

use Sdkkr\Blog\BlogGenerator;

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
        if (empty($metadata['slug'])) {
            return ['success' => false, 'error' => 'Slug is required'];
        }

        if (FileManager::writeFile($filename, $content)) {
            // Regenerate the blog
            $blogGenerator = new BlogGenerator();
            $blogGenerator->generate();
            
            // Extract the slug from the content to build the URL
            $lines = explode("\n", $content);
            $slug = '';
            $inMetadata = false;
            
            foreach ($lines as $line) {
                if (trim($line) === '---') {
                    $inMetadata = !$inMetadata;
                    continue;
                }
                if ($inMetadata && preg_match('/^slug:\s*(.*)$/', $line, $matches)) {
                    $slug = trim($matches[1]);
                    break;
                }
            }
            
            // Only return the URL for published posts
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
                'postUrl' => !$isDraft && $slug ? '/' . $slug : null
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
            return ['success' => true];
        }
        return ['success' => false, 'error' => 'Failed to delete file'];
    }
} 