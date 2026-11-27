<?php

return [

    'free_prompt_limit' => (int) env('FREE_PROMPT_LIMIT', 3),

    'markup_percent' => (int) env('BILLING_MARKUP_PERCENT', 20),

    'currency' => 'INR',

    'plans' => [
        [
            'id' => 'gemini_starter',
            'name' => 'Starter',
            'description' => 'Paid chat access with a monthly prompt allowance. No image generation.',
            'base_price_inr' => 1699,
            'billing_period' => 'month',
            'prompts_included' => 'Chat only — limited prompts/month (no images)',
            'chat_prompt_limit' => (int) env('STARTER_CHAT_LIMIT', 100),
            'allows_image' => false,
        ],
        [
            'id' => 'gemini_pro',
            'name' => 'Pro',
            'description' => 'Advanced models with extended context for power users.',
            'base_price_inr' => 4199,
            'billing_period' => 'month',
            'prompts_included' => 'Unlimited chat, images + priority models',
            'chat_prompt_limit' => null,
            'allows_image' => true,
        ],
        [
            'id' => 'gemini_team',
            'name' => 'Team',
            'description' => 'Team workspace with shared quotas and collaboration features.',
            'base_price_inr' => 8399,
            'billing_period' => 'month',
            'prompts_included' => 'Unlimited team chat, images (up to 5 seats)',
            'chat_prompt_limit' => null,
            'allows_image' => true,
        ],
    ],

];