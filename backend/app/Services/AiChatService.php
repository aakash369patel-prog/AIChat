<?php

namespace App\Services;

use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Throwable;

class AiChatService
{
    public function __construct(
        private readonly GeminiService $gemini,
        private readonly OpenAiService $openAi,
        private readonly AiConfigService $aiConfig,
    ) {}

    public function generateReply(Collection $messages): string
    {
        return $this->withGeminiFallback(
            fn () => $this->gemini->generateReply($messages),
            fn () => $this->openAi->generateReply($messages),
            'chat',
        );
    }

    /**
     * @return array{mime: string, data: string}
     */
    public function generateImage(
        string $prompt,
        ?string $referenceMime = null,
        ?string $referenceBase64 = null,
    ): array {
        return $this->withGeminiFallback(
            fn () => $this->gemini->generateImage($prompt, $referenceMime, $referenceBase64),
            fn () => $this->openAi->generateImage($prompt, $referenceMime, $referenceBase64),
            'image',
        );
    }

    /**
     * @template T
     *
     * @param  callable(): T  $primary
     * @param  callable(): T  $fallback
     * @return T
     */
    private function withGeminiFallback(callable $primary, callable $fallback, string $mode): mixed
    {
        try {
            return $primary();
        } catch (Throwable $e) {
            if (! $this->shouldFallbackToOpenAi($e)) {
                throw $e;
            }

            if (! $this->aiConfig->openAiApiKey()) {
                throw $e;
            }

            Log::warning('Gemini unavailable; using OpenAI backup.', [
                'mode' => $mode,
                'error' => $e->getMessage(),
            ]);

            return $fallback();
        }
    }

    public function shouldFallbackToOpenAi(Throwable $e): bool
    {
        $previous = $e->getPrevious();
        if ($previous instanceof RequestException) {
            $status = $previous->response?->status();
            if (in_array($status, [401, 403, 429, 500, 502, 503, 504], true)) {
                return true;
            }
        }

        $haystack = strtolower($e->getMessage());

        $patterns = [
            'quota',
            'resource exhausted',
            'resource_exhausted',
            'exceeded',
            'billing',
            'expired',
            'invalid api key',
            'api key not valid',
            'permission denied',
            'rate limit',
            'too many requests',
            'not configured',
        ];

        foreach ($patterns as $pattern) {
            if (str_contains($haystack, $pattern)) {
                return true;
            }
        }

        return false;
    }
}