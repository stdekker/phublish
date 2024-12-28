# Phublish
An open source static site generator for publishing blogs.

## Features

- ** No database**: No need to setup a database
- **Static Site Generation**: Converts Markdown files to static HTML blog posts
- **Public admin interface**: Token-based authentication with email login links
- **Markdown editor**: Built-in editor with live preview using SimpleMDE
- **Draft support**: Mark posts as drafts while working on them
- **SMTP integration**: Email notifications and  login links
- **DDEV support**: Ready to run with DDEV for local development

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

3. Set up the public_html directory.
(instructions coming soon)