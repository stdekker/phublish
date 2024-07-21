<?php
session_start();

// Check if user is logged in
if (!isset($_SESSION['logged_in']) || !$_SESSION['logged_in']) {
    header('Location: login.php'); // Redirect to login page
    exit;
}

$config = require_once '../../phublish/config.php';
$articlesDirectory = $config['source_directory'];
$linksDirectory = $config['links_directory'];

// List files
function listFiles($directory)
{
    $files = glob($directory . '*.txt');
    $fileList = [];
    foreach ($files as $file) {
        $fileList[] = basename($file);
    }
    return $fileList;
}

$articleFiles = listFiles($articlesDirectory);
$linkFiles = listFiles($linksDirectory);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Admin Interface</title>
    <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
    <style>
        #editor { height: 300px; }
    </style>
</head>
<body>
    <h1>Admin Interface</h1>

    <h2>Articles</h2>
    <ul>
        <?php foreach ($articleFiles as $file): ?>
            <li><a href="?file=<?= urlencode($articlesDirectory . $file) ?>"><?= htmlspecialchars($file) 
?></a></li>
        <?php endforeach; ?>
    </ul>

    <h2>Links</h2>
    <ul>
        <?php foreach ($linkFiles as $file): ?>
            <li><a href="?file=<?= urlencode($linksDirectory . $file) ?>"><?= htmlspecialchars($file) 
?></a></li>
        <?php endforeach; ?>
    </ul>

    <?php if (isset($_GET['file'])): ?>
        <?php
        $filePath = urldecode($_GET['file']);
        if (file_exists($filePath)) {
            $content = file_get_contents($filePath);
        } else {
            $content = '';
        }
        ?>
        <h2>Edit File: <?= htmlspecialchars(basename($filePath)) ?></h2>
        <form method="post" id="edit-form" action="save.php">
            <input type="hidden" name="file_path" value="<?= htmlspecialchars($filePath) ?>">
            <div id="editor"><?= htmlspecialchars($content) ?></div>
            <textarea name="content" id="content" style="display:none;"></textarea>
            <button type="submit">Save</button>
        </form>
    <?php endif; ?>

    <script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>
    <script>
        var quill = new Quill('#editor', {
            theme: 'snow'
        });

        // Sync editor content to textarea before submitting the form
        document.getElementById('edit-form').onsubmit = function() {
            document.getElementById('content').value = quill.root.innerHTML;
        };
    </script>
</body>
</html>

