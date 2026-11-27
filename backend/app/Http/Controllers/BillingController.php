<?php

namespace App\Http\Controllers;

use App\Services\RazorpayService;
use App\Services\UsageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class BillingController extends Controller
{
    public function plans(RazorpayService $razorpay): JsonResponse
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
            'razorpay_enabled' => $razorpay->isConfigured(),
            'razorpay_key_id' => $razorpay->keyId(),
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
            'usage' => app(UsageService::class)->summary($user->fresh()),
        ]);
    }

    public function checkout(RazorpayService $razorpay, Request $request): JsonResponse
    {
        if (! $razorpay->isConfigured()) {
            return response()->json([
                'message' => 'Razorpay is not configured. Use demo subscribe or set RAZORPAY_KEY_ID in .env.',
                'razorpay_enabled' => false,
            ], 503);
        }

        $validated = $request->validate([
            'plan_id' => ['required', 'string'],
        ]);

        $plan = collect(config('billing.plans', []))->firstWhere('id', $validated['plan_id']);
        if (! is_array($plan)) {
            return response()->json(['message' => 'Invalid plan selected.'], 422);
        }

        $markup = config('billing.markup_percent', 20);
        $base = (float) $plan['base_price_inr'];
        $totalInr = (int) round($base + round($base * ($markup / 100)));

        try {
            $order = $razorpay->createOrder(
                $request->user()->id,
                $plan['id'],
                $totalInr,
            );
        } catch (Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }

        return response()->json([
            'razorpay_enabled' => true,
            'checkout' => array_merge($order, [
                'plan_name' => $plan['name'],
                'price_inr' => $totalInr,
            ]),
        ]);
    }

    public function verifyPayment(RazorpayService $razorpay, Request $request, UsageService $usage): JsonResponse
    {
        if (! $razorpay->isConfigured()) {
            return response()->json(['message' => 'Razorpay is not configured.'], 503);
        }

        $validated = $request->validate([
            'razorpay_order_id' => ['required', 'string'],
            'razorpay_payment_id' => ['required', 'string'],
            'razorpay_signature' => ['required', 'string'],
        ]);

        try {
            $meta = $razorpay->verifyAndConsume(
                $validated['razorpay_order_id'],
                $validated['razorpay_payment_id'],
                $validated['razorpay_signature'],
            );
        } catch (Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if ($meta['user_id'] !== $request->user()->id) {
            return response()->json(['message' => 'Payment does not belong to this account.'], 403);
        }

        $planIds = collect(config('billing.plans', []))->pluck('id')->all();
        if (! in_array($meta['plan_id'], $planIds, true)) {
            return response()->json(['message' => 'Invalid plan on payment.'], 422);
        }

        $user = $request->user();
        $user->forceFill([
            'is_subscribed' => true,
            'subscribed_plan' => $meta['plan_id'],
            'subscribed_at' => now(),
        ])->save();

        return response()->json([
            'message' => 'Payment verified. Subscription active.',
            'user' => $user->fresh(),
            'usage' => $usage->summary($user->fresh()),
        ]);
    }
}