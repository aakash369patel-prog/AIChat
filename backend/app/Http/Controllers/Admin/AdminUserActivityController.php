<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AdminUserActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = $request->string('search')->trim()->toString();

        $query = User::query()
            ->select('users.*')
            ->withCount('conversations')
            ->selectSub(function ($q) {
                $q->from('messages')
                    ->join('conversations', 'conversations.id', '=', 'messages.conversation_id')
                    ->whereColumn('conversations.user_id', 'users.id')
                    ->where('messages.role', 'user')
                    ->selectRaw('count(*)');
            }, 'prompts_sent')
            ->selectSub(function ($q) {
                $q->from('messages')
                    ->join('conversations', 'conversations.id', '=', 'messages.conversation_id')
                    ->whereColumn('conversations.user_id', 'users.id')
                    ->selectRaw('max(messages.created_at)');
            }, 'last_message_at')
            ->selectSub(function ($q) {
                $q->from('personal_access_tokens')
                    ->whereColumn('personal_access_tokens.tokenable_id', 'users.id')
                    ->where('personal_access_tokens.tokenable_type', User::class)
                    ->selectRaw('max(personal_access_tokens.last_used_at)');
            }, 'last_token_used_at')
            ->orderByRaw('COALESCE(last_message_at, last_token_used_at, users.updated_at) DESC');

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('name', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%');
            });
        }

        $users = $query->paginate(20)->through(function (User $user) {
            $lastActive = $this->latestTimestamp(
                $user->last_message_at,
                $user->last_token_used_at,
                $user->updated_at,
            );

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_active' => $user->is_active !== false,
                'is_subscribed' => (bool) $user->is_subscribed,
                'subscribed_plan' => $user->subscribed_plan,
                'conversations_count' => (int) $user->conversations_count,
                'prompts_sent' => (int) $user->prompts_sent,
                'last_active_at' => $lastActive?->toIso8601String(),
                'registered_at' => $user->created_at?->toIso8601String(),
            ];
        });

        $recent = Message::query()
            ->where('role', 'user')
            ->with([
                'conversation:id,user_id,title',
                'conversation.user:id,name,email',
            ])
            ->latest('created_at')
            ->limit(40)
            ->get(['id', 'conversation_id', 'content', 'content_type', 'created_at'])
            ->map(function (Message $message) {
                $user = $message->conversation?->user;

                return [
                    'id' => $message->id,
                    'content_type' => $message->content_type,
                    'preview' => $this->preview($message->content),
                    'created_at' => $message->created_at?->toIso8601String(),
                    'conversation' => [
                        'id' => $message->conversation_id,
                        'title' => $message->conversation?->title,
                    ],
                    'user' => $user ? [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                    ] : null,
                ];
            });

        return response()->json([
            'summary' => [
                'total_users' => User::query()->count(),
                'active_last_7_days' => User::query()
                    ->where(function ($builder) {
                        $builder
                            ->whereHas('conversations.messages', fn ($q) => $q->where('created_at', '>=', now()->subDays(7)))
                            ->orWhereHas('tokens', fn ($q) => $q->where('last_used_at', '>=', now()->subDays(7)));
                    })
                    ->count(),
                'prompts_today' => Message::query()
                    ->where('role', 'user')
                    ->whereDate('created_at', today())
                    ->count(),
                'total_prompts' => Message::query()->where('role', 'user')->count(),
            ],
            'users' => $users,
            'recent' => $recent,
        ]);
    }

    private function latestTimestamp(mixed ...$values): ?Carbon
    {
        $parsed = collect($values)
            ->filter()
            ->map(fn ($value) => $value instanceof Carbon ? $value : Carbon::parse($value))
            ->sortDesc();

        return $parsed->first();
    }

    private function preview(string $content, int $max = 120): string
    {
        $text = trim(preg_replace('/\s+/u', ' ', $content) ?? '');

        if ($text === '') {
            return '—';
        }

        if (mb_strlen($text) <= $max) {
            return $text;
        }

        return mb_substr($text, 0, $max - 1).'…';
    }
}