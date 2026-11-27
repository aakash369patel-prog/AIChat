<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Razorpay\Api\Api;
use RuntimeException;

class RazorpayService
{
    public function isConfigured(): bool
    {
        return filled(config('services.razorpay.key_id'))
            && filled(config('services.razorpay.key_secret'));
    }

    public function keyId(): ?string
    {
        $key = config('services.razorpay.key_id');

        return is_string($key) && $key !== '' ? $key : null;
    }

    /**
     * @return array{order_id: string, amount: int, currency: string, key_id: string, plan_id: string}
     */
    public function createOrder(int $userId, string $planId, int $amountInr): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Razorpay is not configured.');
        }

        $api = new Api(
            config('services.razorpay.key_id'),
            config('services.razorpay.key_secret'),
        );

        $amountPaise = $amountInr * 100;

        $order = $api->order->create([
            'receipt' => 'plan_'.$planId.'_user_'.$userId.'_'.time(),
            'amount' => $amountPaise,
            'currency' => 'INR',
            'notes' => [
                'user_id' => (string) $userId,
                'plan_id' => $planId,
            ],
        ]);

        $orderId = $order['id'] ?? null;
        if (! is_string($orderId) || $orderId === '') {
            throw new RuntimeException('Razorpay did not return an order id.');
        }

        Cache::put($this->cacheKey($orderId), [
            'user_id' => $userId,
            'plan_id' => $planId,
            'amount_paise' => $amountPaise,
        ], now()->addHours(2));

        return [
            'order_id' => $orderId,
            'amount' => $amountPaise,
            'currency' => 'INR',
            'key_id' => $this->keyId(),
            'plan_id' => $planId,
        ];
    }

    /**
     * @return array{user_id: int, plan_id: string, amount_paise: int}
     */
    public function verifyAndConsume(string $orderId, string $paymentId, string $signature): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Razorpay is not configured.');
        }

        $meta = Cache::get($this->cacheKey($orderId));
        if (! is_array($meta)) {
            throw new RuntimeException('Order expired or not found. Create a new checkout.');
        }

        $api = new Api(
            config('services.razorpay.key_id'),
            config('services.razorpay.key_secret'),
        );

        $api->utility->verifyPaymentSignature([
            'razorpay_order_id' => $orderId,
            'razorpay_payment_id' => $paymentId,
            'razorpay_signature' => $signature,
        ]);

        Cache::forget($this->cacheKey($orderId));

        return [
            'user_id' => (int) $meta['user_id'],
            'plan_id' => (string) $meta['plan_id'],
            'amount_paise' => (int) $meta['amount_paise'],
        ];
    }

    private function cacheKey(string $orderId): string
    {
        return 'razorpay_order:'.$orderId;
    }
}