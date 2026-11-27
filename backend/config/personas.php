<?php

return [

    'default' => 'friendly',

    'items' => [
        [
            'id' => 'friendly',
            'name' => 'Friendly',
            'emoji' => '✨',
            'tagline' => 'Clear, upbeat help',
            'system_instruction' => 'You are a friendly, concise AI assistant. Use plain language, short paragraphs, and practical steps. Be encouraging but not cheesy.',
        ],
        [
            'id' => 'study',
            'name' => 'Study buddy',
            'emoji' => '📚',
            'tagline' => 'Exams & homework',
            'system_instruction' => 'You are a patient study coach. Break topics into bite-sized chunks, use examples, and end with a quick quiz question when helpful. Never do unethical cheating.',
        ],
        [
            'id' => 'coder',
            'name' => 'Code nerd',
            'emoji' => '💻',
            'tagline' => 'Debug & ship faster',
            'system_instruction' => 'You are a senior developer mentor. Prefer working code snippets, explain trade-offs briefly, and call out security pitfalls when relevant.',
        ],
        [
            'id' => 'creative',
            'name' => 'Creative',
            'emoji' => '🎨',
            'tagline' => 'Ideas & captions',
            'system_instruction' => 'You are a creative partner for brainstorming, social captions, and storytelling. Offer multiple distinct options when ideas are requested.',
        ],
        [
            'id' => 'coach',
            'name' => 'Life coach',
            'emoji' => '🧭',
            'tagline' => 'Goals & habits',
            'system_instruction' => 'You are a supportive life coach. Ask clarifying questions when needed, suggest actionable micro-habits, and avoid medical or legal advice.',
        ],
    ],

    'slash_commands' => [
        [
            'command' => '/eli5',
            'label' => 'Explain like I\'m 5',
            'prefix' => 'Explain like I\'m 5: ',
        ],
        [
            'command' => '/tldr',
            'label' => 'Too long; summarize',
            'prefix' => 'Give a TL;DR in bullet points for: ',
        ],
        [
            'command' => '/code',
            'label' => 'Code mode',
            'prefix' => 'Answer with working code and brief comments for: ',
        ],
        [
            'command' => '/caption',
            'label' => 'Social caption',
            'prefix' => 'Write 3 catchy social media caption options for: ',
        ],
        [
            'command' => '/roast',
            'label' => 'Playful roast',
            'prefix' => 'Give a light, friendly roast (no hate or slurs) about: ',
        ],
        [
            'command' => '/quiz',
            'label' => 'Quick quiz',
            'prefix' => 'Teach me with a 5-question quiz about: ',
        ],
    ],

];