#!/usr/bin/env php
<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Symfony\Component\Yaml\Yaml;

function generateLoginToken($adminEmail = null) {
    // Generate a secure random token
    $token = bin2hex(random_bytes(48));
    
    // Token will expire in 1 hour
    $expires = time() + 3600;
    
    // Load existing tokens
    $tokensFile = getTokensFile();
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
    
    // Get base URL from configuration if available
    $configPath = __DIR__ . '/../config/blog.yaml';
    $baseUrl = 'http://localhost/admin/login.php'; // Default fallback
    
    if (file_exists($configPath)) {
        $config = Yaml::parseFile($configPath);
        $baseUrl = ($config['blog']['base_url'] ?? '') . '/admin/login.php';
    }
    
    $loginUrl = $baseUrl . '?token=' . $token;
    
    // If called from CLI, output to console
    if (php_sapi_name() === 'cli') {
        echo "Login URL generated (valid for 1 hour):\n";
        echo $loginUrl . "\n";
    }
    
    // If admin email is provided, send the email
    if ($adminEmail) {
        $subject = 'Blog Admin Login Link';
        $message = "Here is your login link (valid for 1 hour):\n\n$loginUrl\n\n";
        $headers = 'From: noreply@' . parse_url($baseUrl, PHP_URL_HOST);
        
        if (!mail($adminEmail, $subject, $message, $headers)) {
            throw new Exception('Failed to send login email');
        }
    }
    
    return $loginUrl;
}

function getTokensFile() {
    return __DIR__ . '/../data/tokens.json';
}

// If script is called directly from CLI
if (php_sapi_name() === 'cli' && isset($argv[0]) && realpath($argv[0]) === realpath(__FILE__)) {
    generateLoginToken();
} 