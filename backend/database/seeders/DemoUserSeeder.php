<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DemoUserSeeder extends Seeder
{
    public const DEMO_PASSWORD = 'Demo@1234';

    public function run(): void
    {
        $password = self::DEMO_PASSWORD;

        User::query()->updateOrCreate(
            ['email' => 'admin@aichat.local'],
            [
                'name' => 'Admin',
                'password' => $password,
                'is_admin' => true,
                'is_subscribed' => true,
                'subscribed_plan' => 'gemini_pro',
                'subscribed_at' => now(),
            ],
        );

        User::query()->updateOrCreate(
            ['email' => 'demo@aichat.local'],
            [
                'name' => 'Demo Free User',
                'password' => $password,
                'is_admin' => false,
                'is_subscribed' => false,
                'subscribed_plan' => null,
                'subscribed_at' => null,
            ],
        );

        User::query()->updateOrCreate(
            ['email' => 'starter@aichat.local'],
            [
                'name' => 'Demo Starter',
                'password' => $password,
                'is_admin' => false,
                'is_subscribed' => true,
                'subscribed_plan' => 'gemini_starter',
                'subscribed_at' => now(),
            ],
        );

        User::query()->updateOrCreate(
            ['email' => 'pro@aichat.local'],
            [
                'name' => 'Demo Pro',
                'password' => $password,
                'is_admin' => false,
                'is_subscribed' => true,
                'subscribed_plan' => 'gemini_pro',
                'subscribed_at' => now(),
            ],
        );
    }
}