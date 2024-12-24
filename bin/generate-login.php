#!/usr/bin/env php
<?php

function getTokensFile() {
    return __DIR__ . '/../data/tokens.json';
}

// Generate a secure random token
$token = bin2hex(random_bytes(32));

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

// Output the login URL
$baseUrl = 'http://localhost/admin/login.php'; // Changed from login.html to login.php
$loginUrl = $baseUrl . '?token=' . $token;

echo "Login URL generated (valid for 1 hour):\n";
echo $loginUrl . "\n"; 