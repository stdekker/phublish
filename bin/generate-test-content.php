<?php

if (php_sapi_name() !== 'cli') {
    die('This script can only be run from the command line');
}

// Configuration
$contentDir = dirname(__DIR__) . '/content/posts';
$numPosts = 10; // Default number of posts to generate
$clean = false;

// Parse command line arguments
$options = getopt('n:c', ['num:', 'clean']);
if (isset($options['n']) || isset($options['num'])) {
    $numPosts = (int) ($options['n'] ?? $options['num']);
}
if (isset($options['c']) || isset($options['clean'])) {
    $clean = true;
}

// Ensure content directory exists
if (!is_dir($contentDir)) {
    mkdir($contentDir, 0755, true);
}

// Sample titles and content for random generation
$sampleTitles = [
    'The Art of Programming',
    'A Journey Through Time',
    'Digital Dreams',
    'The Hidden Pattern',
    'Beyond the Screen',
    'Whispers of Code',
    'The Last Algorithm',
    'Silicon Stories',
    'Dancing with Data',
    'The Binary Bridge',
    'Echoes of Innovation',
    'The Quantum Quest',
    'Pixels and Poetry',
    'The Digital Dawn',
    'Circuits of Change'
];

$sampleContent = [
    "In the ever-evolving landscape of technology, we find ourselves at a crossroads where innovation meets tradition. The digital revolution has transformed every aspect of our lives, from the way we communicate to how we perceive the world around us. As we delve deeper into this technological renaissance, we must consider the implications of our creations and their impact on society. The convergence of artificial intelligence, quantum computing, and human creativity has opened up possibilities that were once confined to the realm of science fiction.\n\n<!--more-->\n\nYet, with these advancements come new challenges and responsibilities. We must navigate the delicate balance between progress and preservation, ensuring that our technological achievements serve to enhance rather than diminish our humanity. The code we write today will shape the world of tomorrow, creating ripples that extend far beyond our immediate understanding. As developers, we are not merely writing instructions for machines; we are architecting the future, one line of code at a time.\n\nIn this rapidly changing landscape, the importance of ethical considerations cannot be overstated. Every algorithm we develop, every system we design, carries within it our values and biases. It becomes crucial, therefore, to approach our craft with mindfulness and foresight, understanding that our work has the potential to influence countless lives. The true art of programming lies not just in solving technical problems, but in creating solutions that stand the test of time and serve the greater good.",

    "The morning sun casts long shadows across my desk as I contemplate the nature of digital creation. In this quiet moment, before the world fully awakens, I find myself reflecting on the journey that brought us here. The history of computing is a tapestry woven with countless threads of innovation, determination, and sometimes pure serendipity. From the earliest mechanical calculators to today's quantum computers, each advancement has built upon the foundations laid by those who came before.\n\n<!--more-->\n\nThe beauty of programming lies in its duality - it is both a precise science and a creative art form. Like a painter working with light and shadow, we craft elegant solutions from the raw materials of logic and mathematics. Each function we write, each algorithm we design, is a brushstroke on the canvas of possibility. The code we create today will become the legacy we leave for future generations of developers.\n\nAs we push the boundaries of what's possible, we must remember that our work exists not in isolation, but as part of a greater whole. The systems we build interact with real people, affecting their lives in ways both subtle and profound. This realization brings with it a responsibility to consider not just the technical elegance of our solutions, but their human impact as well. In the end, the measure of our success lies not in the complexity of our code, but in its ability to make the world a little bit better.",

    "Deep within the labyrinth of modern software development, patterns emerge like constellations in the night sky. These patterns tell stories of structure and chaos, of order imposed upon the seemingly random nature of digital existence. As developers, we are both observers and creators of these patterns, constantly seeking to understand and shape the digital landscape that surrounds us. The code we write is more than just a series of instructions; it is a reflection of our understanding of the world and our attempts to model its complexity.\n\n<!--more-->\n\nThe challenge lies not just in writing code that works, but in creating systems that can evolve and adapt to changing requirements. Like a living organism, good software must be able to grow and change without losing its essential structure. This requires a deep understanding of both the technical and philosophical aspects of our craft. We must think not only about the immediate problem at hand, but about the broader context in which our solutions will exist.\n\nIn this age of rapid technological advancement, the role of the developer has become increasingly complex. We are no longer just technical specialists, but architects of digital experiences that shape how people interact with the world. This responsibility requires us to think deeply about the implications of our choices, considering not just what we can build, but what we should build. The future of technology lies not in the tools themselves, but in how we choose to use them to create meaningful and lasting value.",

    "The boundaries between the physical and digital worlds continue to blur, creating new opportunities and challenges for those who work at this intersection. As we develop increasingly sophisticated systems, the line between human and machine intelligence becomes less distinct, raising profound questions about the nature of consciousness and creativity. These questions are not merely philosophical musings, but practical considerations that influence how we approach the design and implementation of modern software systems.\n\n<!--more-->\n\nIn our pursuit of technological advancement, we must not lose sight of the fundamentally human aspects of our work. The most elegant code is worthless if it doesn't serve a genuine human need. This understanding drives us to look beyond pure technical solutions, considering the broader context in which our work exists. The true challenge lies not in writing more code, but in writing code that matters - code that makes a real difference in people's lives.\n\nAs we stand on the threshold of new technological frontiers, from quantum computing to artificial general intelligence, we must approach our work with both excitement and caution. The power to create comes with the responsibility to consider the consequences of our creations. In this context, the role of the developer becomes not just technical but ethical, requiring us to balance innovation with responsibility, progress with preservation, and efficiency with humanity."
];

// Clean up existing test content
if ($clean) {
    echo "Cleaning up test content...\n";
    $files = glob($contentDir . '/test-*.md');
    foreach ($files as $file) {
        unlink($file);
        echo "Deleted: " . basename($file) . "\n";
    }
    if (!$numPosts) {
        exit(0);
    }
}

// Generate new test content
echo "Generating $numPosts test posts...\n";
for ($i = 1; $i <= $numPosts; $i++) {
    $title = $sampleTitles[array_rand($sampleTitles)];
    $content = $sampleContent[array_rand($sampleContent)];
    
    // Generate a random date between 5 years ago and today
    $startDate = strtotime('-5 years');
    $endDate = time();
    $randomTimestamp = rand($startDate, $endDate);
    $date = date('Y-m-d', $randomTimestamp);
    
    $post = <<<MD
---
title: $title
date: $date
---

$content
MD;
    
    $filename = sprintf('test-%03d-%s.md', $i, strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $title)));
    file_put_contents($contentDir . '/' . $filename, $post);
    echo "Created: $filename\n";
}

echo "\nDone!\n";
echo "Use --clean to remove test content\n";
echo "Use -n or --num to specify number of posts to generate\n"; 