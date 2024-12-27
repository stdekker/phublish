<?php
namespace Phublish\Admin;

use Symfony\Component\Mailer\Transport;
use Symfony\Component\Mailer\Mailer as SymfonyMailer;
use Symfony\Component\Mime\Email;
use Symfony\Component\Yaml\Yaml;

class Mailer {
    private SymfonyMailer $mailer;
    private array $config;

    public function __construct() {
        $configPath = dirname(__DIR__, 2) . '/config/blog.yaml';
        $this->config = Yaml::parseFile($configPath);
        
        // Create transport from DSN in config
        $dsn = $this->config['blog']['mailer_dsn'] ?? 'smtp://localhost:25';
        $transport = Transport::fromDsn($dsn);
        $this->mailer = new SymfonyMailer($transport);
    }

    public function sendLoginLink(string $email, string $loginUrl): void {
        $email = (new Email())
            ->from('noreply@' . parse_url($this->config['blog']['base_url'], PHP_URL_HOST))
            ->to($email)
            ->subject('Blog Admin Login Link')
            ->text("Here is your login link (valid for 1 hour):\n\n{$loginUrl}\n\n");

        $this->mailer->send($email);
    }
} 