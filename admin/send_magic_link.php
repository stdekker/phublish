<?php
session_start();
$config = require('config.php');

$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'];

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['message' => 'Invalid email address.']);
    exit;
}

if (!in_array($email, $config['allowed_emails'])) {
    echo json_encode(['message' => 'Email address not allowed.']);
    exit;
}

// Rate limiting
$rate_limit_file = '/path/to/secure/rate_limit.txt'; // Update this path
$rate_limit_data = file_exists($rate_limit_file) ? json_decode(file_get_contents($rate_limit_file), true) : [];
$rate_limit_key = $_SERVER['REMOTE_ADDR'];

if (!isset($rate_limit_data[$rate_limit_key])) {
    $rate_limit_data[$rate_limit_key] = ['count' => 0, 'timestamp' => time()];
}

if (time() - $rate_limit_data[$rate_limit_key]['timestamp'] > $config['rate_limit']['duration']) {
    $rate_limit_data[$rate_limit_key] = ['count' => 0, 'timestamp' => time()];
}

if ($rate_limit_data[$rate_limit_key]['count'] >= $config['rate_limit']['attempts']) {
    echo json_encode(['message' => 'Too many requests. Please try again later.']);
    exit;
}

$rate_limit_data[$rate_limit_key]['count'] += 1;
file_put_contents($rate_limit_file, json_encode($rate_limit_data));

// Generate token (send_magic_link.php)
$token = bin2hex(random_bytes($config['token_length'] / 2));
$encrypted_token = password_hash($token, PASSWORD_BCRYPT);
$tokens = file_exists($config['token_file']) ? json_decode(file_get_contents($config['token_file']), true) : [];
$tokens[$encrypted_token] = time();
file_put_contents($config['token_file'], json_encode($tokens));

// Send magic link via email (dummy example)
$link = $config['base_url'] . "process_magic_link.php?token=$token";
mail($email, "Your Magic Link", "Click on the following link to login: $link");

echo json_encode(['message' => 'Magic link sent to your email address.']);
?>
