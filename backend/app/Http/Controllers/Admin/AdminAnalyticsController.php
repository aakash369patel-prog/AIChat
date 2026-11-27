<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminAnalyticsController extends Controller
{
    public function show(): JsonResponse
    {
        $today = now()->startOfDay();

        $planBreakdown = User::query()
            ->select('subscribed_plan', DB::raw('count(*) as total'))
            ->where('is_subscribed', true)
            ->groupBy('subscribed_plan')
            ->pluck('total', 'subscribed_plan');

        $messagesToday = Message::query()->where('created_at', '>=', $today)->count();
        $signupsWeek = User::query()->where('created_at', '>=', now()->subDays(7))->count();
        $conversationsTotal = Conversation::query()->count();
        $usersTotal = User::query()->count();
        $verifiedUsers = User::query()->whereNotNull('email_verified_at')->count();

        $imageMessages = Message::query()
            ->where('content_type', 'image')
            ->where('created_at', '>=', now()->subDays(30))
            ->count();

        return response()->json([
            'analytics' => [
                'users_total' => $usersTotal,
                'users_verified' => $verifiedUsers,
                'signups_last_7_days' => $signupsWeek,
                'conversations_total' => $conversationsTotal,
                'messages_today' => $messagesToday,
                'image_messages_last_30_days' => $imageMessages,
                'subscribers_by_plan' => $planBreakdown,
                'generated_at' => now()->toIso8601String(),
            ],
        ]);
    }
}