<?php
session_start();

// Check if user is logged in
if (!isset($_SESSION['logged_in']) || !$_SESSION['logged_in']) {
    echo "Unauthorized access.";
    exit;
}

$config = require_once '../private/config.php';
$articlesDirectory = $config['source_directory'];
$linksDirectory = $config['links_directory'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $filePath = $_POST['file_path'];
    $content = $_POST['content'];

    // Validate and sanitize input
    $realArticlesPath = realpath($articlesDirectory);
    $realLinksPath = realpath($linksDirectory);
    $realFilePath = realpath($filePath);

    if ($realFilePath && (strpos($realFilePath, $realArticlesPath) === 0 || strpos($realFilePath, 
$realLinksPath) === 0)) {
        if (file_exists($realFilePath)) {
            file_put_contents($realFilePath, $content);
            echo "File saved successfully.";
        } else {
            echo "File does not exist.";
        }
    } else {
        echo "Invalid file path.";
    }
    exit;
}
?>

