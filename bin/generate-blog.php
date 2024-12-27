#!/usr/bin/env php
<?php

require __DIR__ . '/../vendor/autoload.php';

$generator = new Phublish\BlogGenerator();
$generator->generate();

// Debug: List only generated files
echo "\nGenerated files:\n";
function listGeneratedFiles($dir) {
    // Only look in web/posts and web/index.html
    if (is_dir($dir . '/posts')) {
        $posts = glob($dir . '/posts/*.html');
        foreach ($posts as $post) {
            echo "FILE: " . $post . "\n";
        }
    }
    
    $index = $dir . '/index.html';
    if (file_exists($index)) {
        echo "FILE: " . $index . "\n";
    }
}
listGeneratedFiles(__DIR__ . '/../web');

echo "\nBlog generated successfully!\n"; 