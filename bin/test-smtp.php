#!/usr/bin/env php
<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Symfony\Component\Mailer\Transport;
use Symfony\Component\Mime\Email;
use Symfony\Component\Yaml\Yaml;

function testSmtpConnection() {
    try {
        echo "Testing SMTP connection...\n";
        
        // Load configuration
        $configPath = dirname(__DIR__) . '/config/blog.yaml';
        $config = Yaml::parseFile($configPath);
        
        // Display SMTP configuration
        $smtp = $config['blog']['smtp'] ?? [];
        echo "\nSMTP Configuration:\n";
        echo "Host: " . ($smtp['host'] ?? 'localhost') . "\n";
        echo "Port: " . ($smtp['port'] ?? 25) . "\n";
        echo "Encryption: " . ($smtp['encryption'] ?? 'none') . "\n";
        echo "Username: " . ($smtp['username'] ? 'set' : 'not set') . "\n";
        echo "From Name: " . ($smtp['from_name'] ?? 'not set') . "\n";
        
        // Build DSN from SMTP configuration
        $dsn = 'smtp://';
        if (!empty($smtp['username']) && !empty($smtp['password'])) {
            $dsn .= urlencode($smtp['username']) . ':' . urlencode($smtp['password']) . '@';
        }
        $dsn .= ($smtp['host'] ?? 'localhost') . ':' . ($smtp['port'] ?? 25);
        if (!empty($smtp['encryption'])) {
            $dsn .= '?encryption=' . $smtp['encryption'];
        }
        
        // Create transport and mailer
        $transport = Transport::fromDsn($dsn);
        $mailer = new \Symfony\Component\Mailer\Mailer($transport);
        
        // Create test email
        $adminEmail = $config['blog']['admin_email'];
        echo "\nSending test email to: $adminEmail\n";
        
        $fromAddress = 'noreply@' . parse_url($config['blog']['base_url'] ?? 'localhost', PHP_URL_HOST);
        $fromName = $smtp['from_name'] ?? 'Blog Test';
        
        $email = (new Email())
            ->from(new \Symfony\Component\Mime\Address($fromAddress, $fromName))
            ->to($adminEmail)
            ->subject('SMTP Test Email')
            ->text("This is a test email sent at " . date('Y-m-d H:i:s') . "\n\n" .
                  "If you received this email, your SMTP configuration is working correctly!");
        
        $mailer->send($email);
        
        echo "\n✅ Success! SMTP connection and email sending worked.\n";
        
    } catch (\Throwable $e) {
        echo "\n❌ Error: " . get_class($e) . "\n";
        echo "Message: " . $e->getMessage() . "\n";
        echo "File: " . $e->getFile() . " (Line: " . $e->getLine() . ")\n";
        exit(1);
    }
}

// Only run if we're in CLI
if (PHP_SAPI !== 'cli') {
    die("This script must be run from the command line\n");
}

testSmtpConnection(); 