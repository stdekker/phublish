<?php

namespace Phublish;

use League\CommonMark\CommonMarkConverter;
use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\FrontMatter\FrontMatterExtension;
use League\CommonMark\Extension\FrontMatter\Output\RenderedContentWithFrontMatter;
use Symfony\Component\Yaml\Yaml;
use Twig\Environment as TwigEnvironment;
use Twig\Loader\FilesystemLoader;

class BlogGenerator
{
    private CommonMarkConverter $converter;
    private TwigEnvironment $twig;
    private array $config;
    
    public function __construct()
    {
        // Load configuration
        $configPath = dirname(__DIR__) . '/config/blog.yaml';
        $this->config = Yaml::parseFile($configPath);
        
        // Set default public web directory if not specified
        if (empty($this->config['blog']['public_web_dir'])) {
            $this->config['blog']['public_web_dir'] = dirname(__DIR__) . '/web';
        }
        
        // Resolve the web directory path to remove any ../ references
        $this->config['blog']['public_web_dir'] = realpath($this->config['blog']['public_web_dir']) ?: $this->config['blog']['public_web_dir'];
        
        // Set up CommonMark
        $config = [
            'html_input' => 'strip',
            'allow_unsafe_links' => false,
            'max_nesting_level' => 100,
            'renderer' => [
                'soft_break' => "<br />\n"
            ]
        ];
        $environment = new Environment($config);
        $environment->addExtension(new \League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension());
        $this->converter = new CommonMarkConverter($config, $environment);
        
        // Set up Twig
        $loader = new FilesystemLoader(__DIR__ . '/../templates');
        $this->twig = new TwigEnvironment($loader);
        
        // Add global variables to Twig
        $this->twig->addGlobal('blog', $this->config['blog']);
    }
    
    public function generate(): void
    {
        $webDir = $this->config['blog']['public_web_dir'];
        
        // Create web directory if it doesn't exist
        if (!is_dir($webDir)) {
            mkdir($webDir, 0755, true);
        }
        
        // Clean up old posts directory if it exists
        $oldPostsDir = $webDir . '/posts';
        if (is_dir($oldPostsDir)) {
            $oldFiles = glob($oldPostsDir . '/*.html');
            foreach ($oldFiles as $file) {
                unlink($file);
            }
            rmdir($oldPostsDir);
        }
        
        // Get all markdown files from content/posts
        $postsPath = dirname(__DIR__) . '/content/posts';
        $posts = glob($postsPath . '/*.md');
        
        $allPosts = [];
        
        foreach ($posts as $post) {
            $content = file_get_contents($post);
            $lines = explode("\n", $content);
            
            // Extract metadata from the first lines
            $metadata = [];
            $contentLines = [];
            $inMetadata = false;
            
            foreach ($lines as $line) {
                if (trim($line) === '---') {
                    $inMetadata = !$inMetadata;
                    continue;
                }
                if ($inMetadata) {
                    if (preg_match('/^([^:]+):\s*(.*)$/', $line, $matches)) {
                        $metadata[trim($matches[1])] = trim($matches[2]);
                    }
                } else if (!$inMetadata) {
                    // Add all lines after metadata, including empty ones
                    $contentLines[] = $line;
                }
            }
            
            // Skip draft posts
            if (isset($metadata['status']) && $metadata['status'] === 'draft') {
                continue;
            }
            
            // Get slug from filename
            $slug = basename($post, '.md');
            
            $content = implode("\n", $contentLines);
            
            // Split content into teaser and full content
            $parts = explode('<!--more-->', $content);
            $teaser = trim($parts[0]);
            $fullContent = trim($content);
            
            // Convert markdown content to HTML
            $teaserHtml = $this->converter->convert($teaser)->getContent();
            $contentHtml = $this->converter->convert($fullContent)->getContent();
            
            // Store post data
            $postData = [
                'title' => $metadata['title'] ?? 'Untitled',
                'date' => $metadata['date'] ?? date('Y-m-d'),
                'formatted_date' => $this->formatDate($metadata['date'] ?? date('Y-m-d')),
                'content' => $contentHtml,
                'teaser' => $teaserHtml,
                'has_more' => count($parts) > 1,
                'slug' => $slug
            ];
            
            $allPosts[] = $postData;
            
            // Generate individual post page
            $this->generatePost($postData);
        }
        
        // Sort posts by date
        usort($allPosts, function($a, $b) {
            $dateA = $this->parseDate($a['date']);
            $dateB = $this->parseDate($b['date']);
            
            return $dateB - $dateA;
        });
        
        // Generate index page
        $this->generateIndex($allPosts);
    }
    
    private function generatePost(array $post): void
    {
        $html = $this->twig->render('post.html.twig', [
            'post' => $post
        ]);
        
        $webDir = $this->config['blog']['public_web_dir'];
        $postsDir = $webDir . '/posts';
        
        // Create posts directory if it doesn't exist
        if (!is_dir($postsDir)) {
            mkdir($postsDir, 0755, true);
        }
        
        // Generate the HTML file in the posts directory
        file_put_contents(
            $postsDir . '/' . $post['slug'] . '.html',
            $html
        );
    }
    
    private function generateIndex(array $posts): void
    {
        $html = $this->twig->render('index.html.twig', [
            'posts' => $posts
        ]);
        
        $webDir = $this->config['blog']['public_web_dir'];
        file_put_contents($webDir . '/index.html', $html);
    }
    
    private function createSlug(string $title): string
    {
        return strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $title)));
    }
    
    /**
     * Parse date string into timestamp
     */
    private function parseDate(string $date): int
    {
        $format = $this->config['blog']['date_format'] ?? 'Y-m-d';
        
        // First try to parse using the configured format
        $dateTime = \DateTime::createFromFormat($format, $date);
        
        if ($dateTime !== false) {
            return $dateTime->getTimestamp();
        }
        
        // Fallback to strtotime if the format doesn't match
        $timestamp = strtotime($date);
        return $timestamp !== false ? $timestamp : time();
    }
    
    /**
     * Format date according to config
     */
    private function formatDate(string $date): string
    {
        $format = $this->config['blog']['date_format'] ?? 'Y-m-d';
        $timestamp = $this->parseDate($date);
        return date($format, $timestamp);
    }
} 