<?php
namespace Phublish\Admin;

use Symfony\Component\Mailer\Transport;
use Symfony\Component\Mailer\Mailer as SymfonyMailer;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\Address;
use Symfony\Component\Yaml\Yaml;

class Mailer {
    private SymfonyMailer $mailer;
    private array $config;
    private string $fromAddress;
    private ?string $fromName;

    public function __construct() {
        $configPath = dirname(__DIR__, 2) . '/config/blog.yaml';
        $this->config = Yaml::parseFile($configPath);
        
        // Build DSN from SMTP configuration
        $dsn = $this->buildDsn();
        
        // Create transport and mailer
        $transport = Transport::fromDsn($dsn);
        $this->mailer = new SymfonyMailer($transport);
        
        // Set up from address
        $this->fromAddress = 'noreply@' . parse_url($this->config['blog']['base_url'], PHP_URL_HOST);
        $this->fromName = $this->config['blog']['smtp']['from_name'] ?? null;
    }

    private function buildDsn(): string {
        $smtp = $this->config['blog']['smtp'] ?? [];
        
        // Default values
        $host = $smtp['host'] ?? 'localhost';
        $port = $smtp['port'] ?? 25;
        $encryption = $smtp['encryption'] ?? null;
        $username = $smtp['username'] ?? null;
        $password = $smtp['password'] ?? null;

        // Build DSN
        $dsn = 'smtp://';
        
        // Add authentication if provided
        if ($username && $password) {
            $dsn .= urlencode($username) . ':' . urlencode($password) . '@';
        }
        
        // Add host and port
        $dsn .= $host . ':' . $port;
        
        // Add encryption if specified
        if ($encryption) {
            $dsn .= '?encryption=' . $encryption;
        }

        return $dsn;
    }

    public function sendLoginLink(string $email, string $loginUrl): void {
        $email = (new Email())
            ->from(new Address($this->fromAddress, $this->fromName))
            ->to($email)
            ->subject('Blog Admin Login Link')
            ->text("Here is your login link (valid for 1 hour):\n\n{$loginUrl}\n\n");

        $this->mailer->send($email);
    }

    public function getMailer(): SymfonyMailer {
        return $this->mailer;
    }
} 