<?php
namespace Phublish\Admin;

use Symfony\Component\Yaml\Yaml;

class Config {
    public static function getConfig(): array {
        $configPath = dirname(__DIR__, 2) . '/config/blog.yaml';
        return Yaml::parseFile($configPath);
    }

    public static function getContentPath(): string {
        $config = self::getConfig();
        $contentPath = dirname(__DIR__, 2) . '/content/posts/';
        if (!empty($config['blog']['content_path'])) {
            $contentPath = $config['blog']['content_path'];
        }
        error_log("Content path: " . $contentPath);
        return $contentPath;
    }
    
    public static function getTokensPath(): string {
        return dirname(__DIR__, 2) . '/data/tokens.json';
    }
} 