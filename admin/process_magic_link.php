<?php
session_start();
$config = require('config.php');

if (!isset($_GET['token'])) {
    exit('Invalid request');
}

$token = $_GET['token'];

// Validate token (process_magic_link.php)
$tokens = json_decode(file_get_contents($config['token_file']), true);
$valid = false;
foreach ($tokens as $stored_token => $timestamp) {
    if (password_verify($token, $stored_token) && (time() - $timestamp < $config['token_expiration'])) {
        $valid = true;
        unset($tokens[$stored_token]);
        file_put_contents($config['token_file'], json_encode($tokens));
        break;
    }
}

if ($valid) {
    $_SESSION['logged_in'] = true;
    header('Location: protected.php');
    exit;
} else {
    echo "Invalid or expired token.";
}

?>

