<?php

namespace App\Services;

use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class StreakService
{
    public function recordChatDay(User $user): User
    {
        $today = now()->toDateString();
        $last = $user->last_chat_date?->toDateString();

        if ($last === $today) {
            return $user;
        }

        $yesterday = now()->subDay()->toDateString();
        $streak = $last === $yesterday ? ((int) $user->chat_streak_days + 1) : 1;
        $longest = max($streak, (int) $user->longest_chat_streak);

        $user->forceFill([
            'last_chat_date' => $today,
            'chat_streak_days' => $streak,
            'longest_chat_streak' => $longest,
        ])->save();

        return $user->fresh();
    }

    /**
     * @return array<string, mixed>
     */
    public function summary(User $user): array
    {
        return [
            'current_streak_days' => (int) $user->chat_streak_days,
            'longest_streak_days' => (int) $user->longest_chat_streak,
            'last_chat_date' => $user->last_chat_date?->toDateString(),
            'weekly_recap' => $this->weeklyRecap($user),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function weeklyRecap(User $user): array
    {
        $weekStart = now()->startOfWeek();

        $promptsThisWeek = Message::query()
            ->where('role', 'user')
            ->where('created_at', '>=', $weekStart)
            ->whereHas('conversation', fn ($q) => $q->where('user_id', $user->id))
            ->count();

        $activeDays = (int) Message::query()
            ->where('role', 'user')
            ->where('created_at', '>=', $weekStart)
            ->whereHas('conversation', fn ($q) => $q->where('user_id', $user->id))
            ->selectRaw('DATE(created_at) as chat_day')
            ->distinct()
            ->get()
            ->count();

        return [
            'week_start' => $weekStart->toDateString(),
            'prompts_this_week' => $promptsThisWeek,
            'active_days_this_week' => $activeDays,
        ];
    }
}