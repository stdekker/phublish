<?php
namespace Sdkkr\Blog\Admin;

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
        
        return array_values(array_diff($files, array('.', '..')));
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
            error_log("File already exists: " . $file);
            return false;
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