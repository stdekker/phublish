// Utility functions
export function formatSlug(text) {
    return text
        .toLowerCase()
        .replace(/\s+/g, '-')        // Replace spaces with hyphens
        .replace(/[^\w\-]+/g, '')    // Remove all non-word chars (except hyphens)
        .replace(/\-\-+/g, '-')      // Replace multiple hyphens with single hyphen
        .replace(/^-+/, '')          // Trim hyphens from start
        .replace(/-+$/, '');         // Trim hyphens from end
}

export function extractMetadata(content) {
    const metadata = {};
    const lines = content.split('\n');
    let inMetadata = false;
    let contentStart = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '---') {
            if (inMetadata) {
                contentStart = i + 1;
                break;
            } else {
                inMetadata = true;
            }
        } else if (inMetadata) {
            const [key, ...value] = line.split(':');
            metadata[key.trim()] = value.join(':').trim();
        }
    }

    metadata.content = lines.slice(contentStart).join('\n');
    return metadata;
}

export function formatMetadata(metadata, content) {
    return `---
title: ${metadata.title}
date: ${metadata.date}${metadata.status === 'draft' ? '\nstatus: draft' : ''}
---
${content.startsWith('\n') ? '' : '\n'}${content}`;
}

export function generateFilename(slug, existingFiles) {
    let baseFilename = `${slug}.md`;
    
    if (!existingFiles.includes(baseFilename)) {
        return baseFilename;
    }
    
    let counter = 1;
    while (existingFiles.includes(`${slug}-${counter}.md`)) {
        counter++;
    }
    return `${slug}-${counter}.md`;
}

export function validateField(fieldId, value) {
    const errors = [];
    switch (fieldId) {
        case 'title':
            if (!value || value.trim() === '') {
                errors.push('Title is required');
            }
            break;
        case 'date':
            if (!value || value.trim() === '') {
                errors.push('Date is required');
            }
            break;
        case 'slug':
            if (!value || value.trim() === '') {
                errors.push('Slug is required');
            }
            break;
    }
    return errors;
}

export function validatePost(metadata) {
    const errors = {};
    
    if (!metadata.title) {
        errors.title = 'Title is required';
    }
    
    if (!metadata.date) {
        errors.date = 'Date is required';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(metadata.date)) {
        errors.date = 'Date must be in YYYY-MM-DD format';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
} 