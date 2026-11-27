<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    public function plans(): JsonResponse
    {
        $markup = config('billing.markup_percent', 20);
        $currency = config('billing.currency', 'INR');

        $plans = collect(config('billing.plans', []))->map(function (array $plan) use ($markup) {
            $base = (float) $plan['base_price_inr'];
            $markupAmount = round($base * ($markup / 100));
            $total = round($base + $markupAmount);

            return [
                ...$plan,
                'markup_percent' => $markup,
                'markup_amount_inr' => (int) $markupAmount,
                'price_inr' => (int) $total,
            ];
        })->values();

        return response()->json([
            'currency' => $currency,
            'markup_percent' => $markup,
            'plans' => $plans,
        ]);
    }

    public function subscribe(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan_id' => ['required', 'string'],
        ]);

        $planIds = collect(config('billing.plans', []))->pluck('id')->all();

        if (! in_array($validated['plan_id'], $planIds, true)) {
            return response()->json(['message' => 'Invalid plan selected.'], 422);
        }

        $user = $request->user();
        $user->forceFill([
            'is_subscribed' => true,
            'subscribed_plan' => $validated['plan_id'],
            'subscribed_at' => now(),
        ])->save();

        return response()->json([
            'message' => 'Subscription activated. You can continue chatting.',
            'user' => $user->fresh(),
        ]);
    }
}