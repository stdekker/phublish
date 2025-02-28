# Phublish
An open source static site generator for publishing blogs.

## Features

- **No database**: No need to setup a database
- **Static Site Generation**: Converts Markdown files to static HTML blog posts
- **Public admin interface**: Token-based authentication with email login links
- **Markdown editor**: Built-in editor with live preview using SimpleMDE
- **Draft support**: Mark posts as drafts while working on them
- **SMTP integration**: Email notifications and login links
- **DDEV support**: Ready to run with DDEV for local development
- **Simple file structure**: Easy to understand and modify

## Quick Start

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/phublish/phublish.git
cd phublish
composer install
```

2. Copy the configuration template and customize it:
```bash
cp config/blog.yaml.dist config/blog.yaml
```

3. Edit the configuration file with your blog settings in `config/blog.yaml`.

## Project Structure

```
├── bin/                  # Command-line utilities
│   ├── generate-blog.php # Generate the static blog
│   ├── generate-login.php # Generate login tokens
│   └── test-smtp.php     # Test SMTP configuration
├── config/               # Configuration files
│   └── blog.yaml         # Main configuration
├── content/              # Source markdown content
│   └── posts/            # Blog posts in markdown format
├── data/                 # Data storage (tokens, etc.)
├── src/                  # PHP source code
│   └── BlogGenerator.php # Main generation logic
├── templates/            # Twig templates for the blog
│   ├── layout.html.twig  # Base template
│   ├── index.html.twig   # Homepage template
│   ├── post.html.twig    # Single post template
│   └── archive.html.twig # Archive page template
├── web/                  # Generated website (public directory)
│   ├── admin/            # Admin interface
│   ├── css/              # Stylesheets
│   ├── posts/            # Generated blog posts
│   └── uploads/          # Uploaded media files
└── vendor/               # Composer dependencies
```

## Usage

### Generating the Blog

After adding or editing posts in the `content/posts/` directory, generate the static site:

```bash
php bin/generate-blog.php
```

### Admin Interface

The admin interface is available at `/admin/` and provides:
- A markdown editor for creating and editing posts
- File upload management
- Draft handling

### DDEV Integration

For local development with DDEV:

```bash
ddev start
ddev launch
```

## Configuration

Customize your blog by editing `config/blog.yaml`:
- Set blog title, description, and author
- Configure SMTP settings for email functionality
- Set admin access credentials
- Customize permalink structure