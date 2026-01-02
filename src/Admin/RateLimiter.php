<?php
namespace Phublish\Admin;

/**
 * Rate limiter for IP-based request throttling
 */
class RateLimiter {
    private string $rateLimitFile;
    private int $maxRequests;
    private int $timeWindow; // in seconds
    
    public function __construct(int $maxRequests = 3, int $timeWindow = 3600) {
        $this->maxRequests = $maxRequests;
        $this->timeWindow = $timeWindow;
        $this->rateLimitFile = dirname(__DIR__, 2) . '/data/rate_limits.json';
        
        // Ensure data directory exists
        if (!is_dir(dirname($this->rateLimitFile))) {
            mkdir(dirname($this->rateLimitFile), 0755, true);
        }
    }
    
    /**
     * Get the client IP address, considering proxy headers
     */
    public static function getClientIp(): string {
        // Check for IP in various headers (for proxies/load balancers)
        $headers = [
            'HTTP_CF_CONNECTING_IP',     // Cloudflare
            'HTTP_X_REAL_IP',            // Nginx proxy
            'HTTP_X_FORWARDED_FOR',      // Standard proxy header
            'REMOTE_ADDR'                // Direct connection
        ];
        
        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ip = $_SERVER[$header];
                // X-Forwarded-For can contain multiple IPs, take the first one
                if (strpos($ip, ',') !== false) {
                    $ip = trim(explode(',', $ip)[0]);
                }
                // Validate IP address
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }
        
        // Fallback to REMOTE_ADDR
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
    
    /**
     * Load rate limit data from file
     */
    private function loadRateLimits(): array {
        if (file_exists($this->rateLimitFile)) {
            $data = json_decode(file_get_contents($this->rateLimitFile), true);
            if (is_array($data)) {
                return $data;
            }
        }
        return [];
    }
    
    /**
     * Save rate limit data to file
     */
    private function saveRateLimits(array $data): void {
        file_put_contents($this->rateLimitFile, json_encode($data, JSON_PRETTY_PRINT));
    }
    
    /**
     * Clean up old entries (older than time window)
     */
    private function cleanupOldEntries(array $data): array {
        $currentTime = time();
        $cleaned = [];
        
        foreach ($data as $ip => $requests) {
            // Filter out requests older than the time window
            $recentRequests = array_filter($requests, function($timestamp) use ($currentTime) {
                return ($currentTime - $timestamp) < $this->timeWindow;
            });
            
            // Only keep IPs with recent requests
            if (!empty($recentRequests)) {
                $cleaned[$ip] = array_values($recentRequests);
            }
        }
        
        return $cleaned;
    }
    
    /**
     * Check if the IP has exceeded the rate limit
     * 
     * @param string|null $ip IP address (if null, will get from request)
     * @return array ['allowed' => bool, 'remaining' => int, 'resetAt' => int]
     */
    public function checkLimit(?string $ip = null): array {
        if ($ip === null) {
            $ip = self::getClientIp();
        }
        
        $data = $this->loadRateLimits();
        $data = $this->cleanupOldEntries($data);
        
        $requests = $data[$ip] ?? [];
        $currentTime = time();
        
        // Count requests within the time window
        $recentRequests = array_filter($requests, function($timestamp) use ($currentTime) {
            return ($currentTime - $timestamp) < $this->timeWindow;
        });
        
        $requestCount = count($recentRequests);
        $allowed = $requestCount < $this->maxRequests;
        
        // Calculate when the oldest request will expire (reset time)
        $resetAt = $currentTime + $this->timeWindow;
        if (!empty($recentRequests)) {
            $oldestRequest = min($recentRequests);
            $resetAt = $oldestRequest + $this->timeWindow;
        }
        
        return [
            'allowed' => $allowed,
            'remaining' => max(0, $this->maxRequests - $requestCount),
            'resetAt' => $resetAt,
            'count' => $requestCount
        ];
    }
    
    /**
     * Record a request for the given IP
     * 
     * @param string|null $ip IP address (if null, will get from request)
     */
    public function recordRequest(?string $ip = null): void {
        if ($ip === null) {
            $ip = self::getClientIp();
        }
        
        $data = $this->loadRateLimits();
        $data = $this->cleanupOldEntries($data);
        
        // Add current timestamp
        if (!isset($data[$ip])) {
            $data[$ip] = [];
        }
        $data[$ip][] = time();
        
        // Sort timestamps (oldest first) and keep only recent ones
        sort($data[$ip]);
        $data[$ip] = array_slice($data[$ip], -$this->maxRequests);
        
        $this->saveRateLimits($data);
    }
    
    /**
     * Get remaining time until rate limit resets (in seconds)
     */
    public function getTimeUntilReset(?string $ip = null): int {
        $limitInfo = $this->checkLimit($ip);
        $currentTime = time();
        return max(0, $limitInfo['resetAt'] - $currentTime);
    }
}

