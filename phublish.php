<?php
// Load the configuration file
$config = require_once 'config.php';

// Define directories
$sourceDirectory = __DIR__ . '/articles/';
$linksDirectory = __DIR__ . '/links/';
$destinationDirectory = $config['destination_directory'];
$baseUrl = $config['base_url'];
$templatePath = __DIR__ . '/theme/main.html';
$templateDefaultPath = __DIR__ . '/theme/main-html.default';
$currentDateTime = date('Y-m-d H:i:s');
$currentYear = date('Y');
$siteLanguage = $config['siteLanguage'] ?? 'en'; // Default to 'en' if not set
$siteName = $config['siteName'] ?? 'PHublish';

// Check for the "update all" parameter
$updateAll = in_array('update-all', $argv);

// Ensure the main.html template exists by copying from main-html.default if necessary
if (!file_exists($templatePath)) {
    if (file_exists($templateDefaultPath)) {
        if (!copy($templateDefaultPath, $templatePath)) {
            error_log("Error: Could not create main.html from main-html.default\n");
            exit;
        }
        echo "main.html did not exist, created it from main-html.default\n";
    } else {
        error_log("Error: main-html.default does not exist.\n");
        exit;
    }
}

// Check if the autoload file exists
$autoloadPath = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoloadPath)) {
    error_log("Warning: vendor/autoload.php does not exist. Please run 'composer install'.\n");
    exit;
}

// Include the autoload file
require_once $autoloadPath;

// Initialize variables
$template = file_get_contents($templatePath);
$template = str_replace('<!-- #YEAR# -->', htmlspecialchars($currentYear, ENT_QUOTES, 'UTF-8'), $template);
$sitemapEntries = '';
$articles = [];

// Get and process files
$files = glob($sourceDirectory . '*.txt');
$linkFiles = glob($linksDirectory . '*.txt');

if (empty($files) && empty($linkFiles)) {
    echo "No .txt files found in $sourceDirectory or $linksDirectory";
    exit;
}

processFiles($files, $articles, $template, $destinationDirectory, $baseUrl, $currentDateTime, $sitemapEntries, $siteLanguage, $siteName, $updateAll);
processLinkFiles($linkFiles, $articles, $baseUrl, $sitemapEntries, $destinationDirectory, $updateAll);

// Sort and generate output
usort($articles, 'compareArticles');
generateIndex($articles, $template, $destinationDirectory, $siteName, $siteLanguage, $baseUrl);
generateSitemap($sitemapEntries, $destinationDirectory);

/**
 * Process content files and generate HTML only for updated or new files.
 */
function processFiles($files, &$articles, $template, $destinationDirectory, $baseUrl, $currentDateTime, &$sitemapEntries, $siteLanguage, $siteName, $updateAll) {
    foreach ($files as $file) {
        $fileModTime = filemtime($file);
        $articleTitle = ''; // Initialize the variable

        // Extract order from filename if present
        $filenameParts = explode('--', basename($file));
        if (count($filenameParts) > 1 && is_numeric($filenameParts[0])) {
            $order = intval($filenameParts[0]);
            $fileName = implode('--', array_slice($filenameParts, 1));
        } else {
            $order = PHP_INT_MAX;
            $fileName = basename($file);
        }

        $fileName = basename(str_replace('.txt', '.html', $fileName));
        $htmlFile = $destinationDirectory . $fileName;

        // Check if the HTML file needs to be regenerated
        if ($updateAll || !file_exists($htmlFile) || filemtime($htmlFile) < $fileModTime) {
            $markdown = file_get_contents($file);
            $markdown = removeDataAttributeComments($markdown);
            $markdown = htmlspecialchars($markdown, ENT_QUOTES, 'UTF-8');
            $html = MarkdownToHtml($markdown);
            $html = "<article>" . $html . "</article>";
            $articleTitle = getArticleTitle($html, $file);

            $pageTemplate = processTemplate($template, $articleTitle, $siteName, $baseUrl, $siteLanguage);
            $html = str_replace('<!-- #CONTENT# -->', $html, $pageTemplate);
            $html = addMetaTags($html, 'generator', 'publish');
            $html = addMetaTags($html, 'last-updated', $currentDateTime);

            $returnLink = "<nav><ul><li><a href=\"{$baseUrl}\">Return to Homepage</a></li></ul></nav>";
            $html = str_replace('<!-- #NAVIGATION# -->', $returnLink, $html);

            if (file_put_contents($htmlFile, $html) === false) {
                error_log("Error: Could not write to $htmlFile\n");
                continue;
            }

            echo "Article: $fileName - has been generated.\n";
        } else {
            echo "Article: $fileName - has not been modified since last time.\n";
        }

        $articles[] = [
            'title' => htmlspecialchars($articleTitle, ENT_QUOTES, 'UTF-8'),
            'link' => htmlspecialchars("{$baseUrl}{$fileName}", ENT_QUOTES, 'UTF-8'),
            'order' => $order,
        ];

        $sitemapEntries .= "<url><loc>{$baseUrl}{$fileName}</loc></url>\n";
    }
}

/**
 * Process link files and include them in the articles list.
 */
function processLinkFiles($linkFiles, &$articles, $baseUrl, &$sitemapEntries, $destinationDirectory, $updateAll) {
    foreach ($linkFiles as $linkFile) {
        $fileModTime = filemtime($linkFile);
        
        $content = file_get_contents($linkFile);
        $lines = explode("\n", $content);
        $title = trim($lines[0], "# \t\n\r\0\x0B");
        $url = trim($lines[1]);

        // Validate URL
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            error_log("Invalid URL in $linkFile: $url\n");
            continue;
        }

        // Extract order from filename if present
        $filenameParts = explode('--', basename($linkFile));
        if (count($filenameParts) > 1 && is_numeric($filenameParts[0])) {
            $order = intval($filenameParts[0]);
            $fileName = implode('--', array_slice($filenameParts, 1));
        } else {
            $order = PHP_INT_MAX;
            $fileName = basename($linkFile);
        }

        $fileName = basename(str_replace('.txt', '.html', $fileName));
        $htmlFile = $destinationDirectory . $fileName;

        // Check if the HTML file needs to be regenerated
        if ($updateAll || !file_exists($htmlFile) || filemtime($htmlFile) < $fileModTime) {
            $articles[] = [
                'title' => htmlspecialchars($title, ENT_QUOTES, 'UTF-8'),
                'link' => htmlspecialchars($url, ENT_QUOTES, 'UTF-8'),
                'order' => $order,
                'class' => 'links'  // Add a class to distinguish link items
            ];

            if (file_put_contents($htmlFile, "<html><head><meta http-equiv='refresh' content='0; url=$url'></head><body><p>If you are not redirected, <a href='$url'>click here</a>.</p></body></html>") === false) {
                error_log("Error: Could not write to $htmlFile\n");
                continue;
            }

            $sitemapEntries .= "<url><loc>{$url}</loc></url>\n";
            echo "Link: $fileName - has been generated with title '$title' and URL '$url'.\n";
        } else {
            echo "Link: $fileName - has not been modified since last time.\n";
        }
    }
}

/**
 * Compare articles for sorting.
 */
function compareArticles($a, $b) {
    if ($a['order'] === $b['order']) {
        return strcmp($a['title'], $b['title']);
    }
    return $a['order'] - $b['order'];
}

/**
 * Generate index.html file.
 */
function generateIndex($articles, $template, $destinationDirectory, $siteName, $siteLanguage, $baseUrl) {
    $articlesListContent = "<article><ul>\n";
    foreach ($articles as $article) {
        $class = isset($article['class']) ? $article['class'] : '';
        $articlesListContent .= "<li class=\"{$class}\"><a href=\"{$article['link']}\">{$article['title']}</a></li>\n";
    }
    $articlesListContent .= "</ul></article>\n";
    $indexTemplate = processTemplate($template, $siteName, $siteName, $baseUrl, $siteLanguage);
    if (file_put_contents($destinationDirectory . 'index.html', str_replace('<!-- #CONTENT# -->', $articlesListContent, $indexTemplate)) === false) {
        error_log("Error: Could not write to {$destinationDirectory}index.html\n");
    }
}

/**
 * Generate sitemap.xml file.
 */
function generateSitemap($sitemapEntries, $destinationDirectory) {
    $sitemapContent = <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
$sitemapEntries
</urlset>
XML;
    if (file_put_contents($destinationDirectory . 'sitemap.xml', $sitemapContent) === false) {
        error_log("Error: Could not write to {$destinationDirectory}sitemap.xml\n");
    }
}

/**
 * Convert markdown formatted text to HTML using Parsedown library.
 */
function MarkdownToHtml($markdown) {
    $parsedown = new Parsedown();
    return $parsedown->text($markdown);
}

/**
 * Retrieve the title of the article based on the first occurrence of an <h1> tag.
 */
function getArticleTitle($html, $file) {
    $dom = new DOMDocument;
    libxml_use_internal_errors(true);
    $dom->loadHTML($html);
    libxml_clear_errors();
    $h1Tags = $dom->getElementsByTagName('h1');
    return ($h1Tags->length > 0) ? trim($h1Tags->item(0)->nodeValue) : pathinfo($file, PATHINFO_FILENAME);
}

/**
 * Add the specified meta tag with the given name and content to the HTML.
 */
function addMetaTags($html, $name, $content) {
    $dom = new DOMDocument;
    libxml_use_internal_errors(true);
    $dom->loadHTML($html);
    libxml_clear_errors();
    $head = $dom->getElementsByTagName('head')->item(0);
    $meta = $dom->createElement('meta');
    $meta->setAttribute('name', $name);
    $meta->setAttribute('content', htmlspecialchars($content, ENT_QUOTES, 'UTF-8'));
    $head->appendChild($meta);
    return $dom->saveHTML();
}

/**
 * Remove HTML comments containing data attribute declarations.
 */
function removeDataAttributeComments($markdown) {
    return preg_replace('/<!--\s*#([^:]+):\s*([^->]+)\s*-->/m', '', $markdown);
}

/**
 * Add the language attribute to the HTML template.
 */
function addLanguageAttribute($html, $language) {
    return preg_replace('/<html(.*?)>/', '<html$1 lang="' . htmlspecialchars($language, ENT_QUOTES, 'UTF-8') . '">', $html);
}

/**
 * Process the template with common replacements.
 */
function processTemplate($template, $title, $siteName, $baseUrl, $siteLanguage) {
    $template = str_replace('<!-- #TITLE# -->', htmlspecialchars($title, ENT_QUOTES, 'UTF-8'), $template);
    $template = str_replace('<!-- #SITE_NAME# -->', htmlspecialchars($siteName, ENT_QUOTES, 'UTF-8'), $template);
    $template = str_replace('<!-- #BASE_URL# -->', htmlspecialchars($baseUrl, ENT_QUOTES, 'UTF-8'), $template);
    $template = addLanguageAttribute($template, $siteLanguage);
    return $template;
}
?>
