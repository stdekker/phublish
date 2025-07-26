<?php
namespace Phublish\Admin;

class FileManager {
    public static function listFiles(): array {
        $path = Config::getContentPath();
        if (!is_dir($path)) {
            error_log("Content directory not found: " . $path);
            throw new \Exception("Content directory not found");
        }
        
        $files = scandir($path);
        if ($files === false) {
            error_log("Failed to scan directory: " . $path);
            throw new \Exception("Failed to scan directory");
        }
        
        $fileList = array_diff($files, array('.', '..'));
        $result = [];
        
        foreach ($fileList as $filename) {
            $filePath = $path . $filename;
            
            // Skip directories
            if (is_dir($filePath)) {
                continue;
            }
            
            // Get file creation time
            $creationTime = filectime($filePath);
            
            // Get file content to extract metadata
            $content = file_get_contents($filePath);
            $title = '';
            
            // Extract title from markdown frontmatter
            if ($content !== false) {
                if (preg_match('/---[\s\S]*?title:\s*(.*?)[\r\n][\s\S]*?---/i', $content, $matches)) {
                    $title = trim($matches[1]);
                }
            }
            
            $result[] = [
                'filename' => $filename,
                'title' => $title,
                'created' => $creationTime,
                'createdDate' => date('Y-m-d H:i:s', $creationTime)
            ];
        }
        
        // Sort by creation date (newest first)
        usort($result, function($a, $b) {
            return $b['created'] - $a['created'];
        });
        
        return $result;
    }
    
    public static function readFile(string $filename): ?string {
        $file = Config::getContentPath() . basename($filename);
        if (!file_exists($file)) {
            error_log("File not found: " . $file);
            return null;
        }
        
        $content = file_get_contents($file);
        if ($content === false) {
            error_log("Failed to read file: " . $file);
            return null;
        }
        
        return $content;
    }
    
    public static function writeFile(string $filename, string $content): bool {
        $file = Config::getContentPath() . basename($filename);
        $result = file_put_contents($file, $content);
        if ($result === false) {
            error_log("Failed to write file: " . $file);
            return false;
        }
        return true;
    }
    
    public static function createFile(string $filename): bool {
        $file = Config::getContentPath() . basename($filename);
        if (file_exists($file)) {
            error_log("File already exists: " . $file . " - returning true for idempotent operation");
            return true; // Return true for idempotent operation - file exists is success
        }
        
        $result = file_put_contents($file, '');
        if ($result === false) {
            error_log("Failed to create file: " . $file);
            return false;
        }
        return true;
    }
    
    public static function deleteFile(string $filename): bool {
        $file = Config::getContentPath() . basename($filename);
        
        if (!file_exists($file)) {
            error_log("File not found: " . $file);
            return false;
        }

        $result = unlink($file);
        if (!$result) {
            error_log("Failed to delete file: " . $file);
        }
        return $result;
    }
} 