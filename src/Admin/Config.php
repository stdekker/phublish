<?php
namespace Sdkkr\Blog\Admin;

class Config {
    public static function getContentPath(): string {
        $path = dirname(__DIR__, 2) . '/content/posts/';
        // Log the actual path for debugging
        error_log("Content path: " . $path);
        return $path;
    }
    
    public static function getTokensPath(): string {
        return dirname(__DIR__, 2) . '/data/tokens.json';
    }
} 