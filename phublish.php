<?php
// Load the configuration file
$config = require_once 'config.php';

// Get the source directory from the configuration or use the default value
$sourceDirectory = __DIR__ . '/articles/';

// Get the links directory from the configuration or use the default value
$linksDirectory = __DIR__ . '/links/';

// Get the destination directory from the configuration
$destinationDirectory = $config['destination_directory'];

// Get the base URL from the configuration
$baseUrl = $config['base_url'];

// Get the path to the HTML template
$templatePath = __DIR__ . '/structure/html.html';

// Get the current date and time
$currentDateTime = date('Y-m-d H:i:s');

// Get all .txt files in the source directory
$files = glob($sourceDirectory . '*.txt');

// Get all .txt files in the links directory
$linkFiles = glob($linksDirectory . '*.txt');

// Check if any .txt files were found in the source directory
if (empty($files)) {
    echo "No .txt files found in $sourceDirectory";
    exit;
}

// Initialize the list of articles
$articles = [];
$template = file_get_contents($templatePath);
$sitemapEntries = '';

// Loop through each .txt file in the source directory
foreach ($files as $file) {
    // Read the contents of the .txt file
    $markdown = file_get_contents($file);

    // Extract data attributes from HTML comments in the Markdown
    $dataAttributes = extractDataAttributes($markdown);

    // Remove HTML comments containing "#key: value"
    $markdown = removeDataAttributeComments($markdown);

    // Encode special characters in the markdown content
    $markdown = htmlspecialchars($markdown, ENT_QUOTES, 'UTF-8');

    // Convert markdown to HTML
    $html = MarkdownToHtml($markdown);
    $html = "<article" . buildDataAttributesString($dataAttributes) . ">" . $html . "</article>";

    // Get the title of the article
    $articleTitle = getArticleTitle($html, $file);

    // Create a new HTML file in the destination directory with the same name as the .txt file
    $fileName = basename(str_replace('.txt', '.html', $file));
    $htmlFile = $destinationDirectory . $fileName;

    // Create a copy of the articles array to remove the current article
    $currentArticleKey = array_search($fileName, array_column($articles, 'link'), true);
    $otherArticles = array_values(array_diff_key($articles, [$currentArticleKey => '']));

    $html = str_replace('<!-- #CONTENT# -->', $html, $template);

    // Add the "generator" and "last-updated" meta tags
    $html = addMetaTags($html, 'generator', 'publish');
    $html = addMetaTags($html, 'last-updated', $currentDateTime);

    // Add the navigation links to other articles
    $navigationLinks = '<aside><ul>';
    $navigationLinks .= "<li><a href=\"{$baseUrl}\">Return to Homepage</a></li>";
    foreach ($otherArticles as $otherArticle) {
        $navigationLinks .= "<li><a href=\"{$otherArticle['link']}\">{$otherArticle['title']}</a></li>";
    }
    $navigationLinks .= '</ul></aside>';

    $html = str_replace('<!-- #NAVIGATION# -->', $navigationLinks, $html);

    // Write the HTML content to the new file
    file_put_contents($htmlFile, $html);

    // Store the article information for sorting
    $articles[] = [
        'title' => $articleTitle,
        'link' => "{$baseUrl}{$fileName}",
        'order' => isset($dataAttributes['order']) ? intval($dataAttributes['order']) : PHP_INT_MAX,
    ];

    // Append the article to the sitemap entries
    $sitemapEntries .= "<url><loc>{$baseUrl}{$fileName}</loc></url>\n";

    // Output the conversion status
    echo "Converted $file to $htmlFile\n";
}

// Loop through each .txt file in the links directory
foreach ($linkFiles as $linkFile) {
    // Read the contents of the .txt file
    $content = file_get_contents($linkFile);
    $lines = explode("\n", $content);
    $title = trim($lines[0], "# \t\n\r\0\x0B"); // Extract the title by trimming "#" and whitespace
    $url = trim($lines[1]); // Extract the URL

    // Store the link information for sorting
    $articles[] = [
        'title' => $title,
        'link' => $url,
        'order' => PHP_INT_MAX, // Links can have a default high order to appear last if no specific order is provided
    ];

    // Append the link to the sitemap entries if it's a valid URL
    if (filter_var($url, FILTER_VALIDATE_URL)) {
        $sitemapEntries .= "<url><loc>{$url}</loc></url>\n";
    }

    // Output the creation status
    echo "Processed link from $linkFile with title '$title' and URL '$url'\n";
}

// Sort the articles list based on the 'order' key in ascending order and then alphabetically
usort($articles, function ($a, $b) {
    if ($a['order'] === $b['order']) {
        return strcmp($a['title'], $b['title']);
    }
    return $a['order'] - $b['order'];
});

// Generate the index.html file with the list of articles
$articlesListContent = "<article><ul>\n";
foreach ($articles as $article) {
    $articlesListContent .= "<li><a href=\"{$article['link']}\">{$article['title']}</a></li>\n";
}
$articlesListContent .= "</ul></article>\n";

// Write the modified template to the destination directory
file_put_contents($destinationDirectory . 'index.html', str_replace('<!-- #CONTENT# -->', $articlesListContent, $template));

// Generate the sitemap.xml file
$sitemapContent = <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
$sitemapEntries
</urlset>
XML;

file_put_contents($destinationDirectory . 'sitemap.xml', $sitemapContent);

/**
 * Converts markdown formatted text to HTML using Parsedown library.
 * Make sure to require Parsedown library before using this function.
 */
function MarkdownToHtml($markdown)
{
    require_once 'vendor/autoload.php';

    $parsedown = new Parsedown();
    return $parsedown->text($markdown);
}

/**
 * Retrieves the title of the article based on the first occurrence of an <h1> tag.
 * If no <h1> tag is found, uses the filename as the title.
 */
function getArticleTitle($html, $file)
{
    $dom = new DOMDocument;
    libxml_use_internal_errors(true);
    $dom->loadHTML($html);
    libxml_clear_errors();

    $title = '';
    $h1Tags = $dom->getElementsByTagName('h1');
    if ($h1Tags->length > 0) {
        $title = trim($h1Tags->item(0)->nodeValue);
    } else {
        $title = pathinfo($file, PATHINFO_FILENAME);
    }

    return $title;
}

/**
 * Adds the specified meta tag with the given name and content to the HTML.
 */
function addMetaTags($html, $name, $content)
{
    $dom = new DOMDocument;
    libxml_use_internal_errors(true);
    $dom->loadHTML($html);
    libxml_clear_errors();

    $head = $dom->getElementsByTagName('head')->item(0);
    $meta = $dom->createElement('meta');
    $meta->setAttribute('name', $name);
    $meta->setAttribute('content', $content);
    $head->appendChild($meta);

    return $dom->saveHTML();
}

/**
 * Extracts the data attributes from HTML comments in the Markdown text.
 */
function extractDataAttributes($markdown)
{
    $dataAttributes = [];
    preg_match_all('/<!--\s*#([^:]+):\s*([^->]+)\s*-->/', $markdown, $matches, PREG_SET_ORDER);

    foreach ($matches as $match) {
        $key = trim($match[1]);
        $value = trim($match[2]);
        $dataAttributes[$key] = $value;
    }

    return $dataAttributes;
}

/**
 * Builds a string of data attributes based on the given associative array.
 */
function buildDataAttributesString($dataAttributes)
{
    $attributesString = '';

    foreach ($dataAttributes as $key => $value) {
        $key = htmlspecialchars($key, ENT_QUOTES, 'UTF-8');
        $value = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
        $attributesString .= " data-$key=\"$value\"";
    }

    return $attributesString;
}

/**
 * Removes HTML comments containing data attribute declarations.
 */
function removeDataAttributeComments($markdown)
{
    return preg_replace('/<!--\s*#([^:]+):\s*([^->]+)\s*-->/m', '', $markdown);
}
?>
