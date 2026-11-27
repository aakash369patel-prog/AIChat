<?php

namespace App\Services;

use App\Models\Message;
use App\Models\User;

class UsageService
{
    public function promptCount(User $user): int
    {
        return Message::query()
            ->where('role', 'user')
            ->whereHas('conversation', fn ($q) => $q->where('user_id', $user->id))
            ->count();
    }

    public function freeLimit(): int
    {
        return config('billing.free_prompt_limit', 3);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function planForUser(User $user): ?array
    {
        if (! $user->is_subscribed || ! $user->subscribed_plan) {
            return null;
        }

        $plan = collect(config('billing.plans', []))
            ->firstWhere('id', $user->subscribed_plan);

        return is_array($plan) ? $plan : null;
    }

    public function chatPromptLimit(User $user): ?int
    {
        if (! $user->is_subscribed) {
            return $this->freeLimit();
        }

        $plan = $this->planForUser($user);
        if ($plan === null) {
            return null;
        }

        $limit = $plan['chat_prompt_limit'] ?? null;

        return $limit !== null ? (int) $limit : null;
    }

    public function canUseImage(User $user): bool
    {
        if (! $user->is_subscribed) {
            return true;
        }

        $plan = $this->planForUser($user);
        if ($plan === null) {
            return true;
        }

        return (bool) ($plan['allows_image'] ?? true);
    }

    public function canSendPrompt(User $user): bool
    {
        $limit = $this->chatPromptLimit($user);

        if ($limit === null) {
            return true;
        }

        return $this->promptCount($user) < $limit;
    }

    public function remaining(User $user): int
    {
        $limit = $this->chatPromptLimit($user);

        if ($limit === null) {
            return -1;
        }

        return max(0, $limit - $this->promptCount($user));
    }

    /**
     * @return array<string, mixed>
     */
    public function summary(User $user): array
    {
        $used = $this->promptCount($user);
        $limit = $this->chatPromptLimit($user);
        $plan = $this->planForUser($user);

        return [
            'is_subscribed' => (bool) $user->is_subscribed,
            'subscribed_plan' => $user->subscribed_plan,
            'plan_name' => $plan['name'] ?? null,
            'prompts_used' => $used,
            'prompts_limit' => $limit,
            'prompts_remaining' => $this->remaining($user),
            'allows_image' => $this->canUseImage($user),
            'is_unlimited' => $user->is_subscribed && $limit === null,
            'credit_limit_reached' => ! $this->canSendPrompt($user),
        ];
    }
}