<?php

namespace App\Services;

use App\Models\Message;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class GeminiService
{
    public function generateReply(Collection $messages): string
    {
        $apiKey = config('services.gemini.api_key');
        $model = config('services.gemini.model', 'gemini-2.0-flash');

        if (empty($apiKey)) {
            throw new RuntimeException('Gemini API key is not configured.');
        }

        $contents = $messages->map(function (Message $message) {
            $role = $message->role === 'assistant' ? 'model' : 'user';

            return [
                'role' => $role,
                'parts' => $this->partsForMessage($message),
            ];
        })->values()->all();

        $url = sprintf(
            'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent',
            $model
        );

        try {
            $response = Http::timeout(120)
                ->withHeaders(['x-goog-api-key' => $apiKey])
                ->post($url, ['contents' => $contents]);

            $response->throw();

            $text = data_get($response->json(), 'candidates.0.content.parts.0.text');

            if (! is_string($text) || trim($text) === '') {
                throw new RuntimeException('Gemini returned an empty response.');
            }

            return trim($text);
        } catch (RequestException $e) {
            $message = $e->response?->json('error.message') ?? $e->getMessage();
            throw new RuntimeException('Gemini API error: '.$message, 0, $e);
        }
    }

    /**
     * @return array{mime: string, data: string}
     */
    public function generateImage(
        string $prompt,
        ?string $referenceMime = null,
        ?string $referenceBase64 = null,
    ): array {
        $apiKey = config('services.gemini.api_key');
        $model = config('services.gemini.image_model', 'gemini-2.5-flash-image');

        if (empty($apiKey)) {
            throw new RuntimeException('Gemini API key is not configured.');
        }

        $parts = [];

        if ($referenceBase64 && $referenceMime) {
            $parts[] = [
                'inlineData' => [
                    'mimeType' => $referenceMime,
                    'data' => $referenceBase64,
                ],
            ];
        }

        $text = trim($prompt);
        if ($text === '') {
            $text = $referenceBase64
                ? 'Create a new image inspired by the attached reference.'
                : 'Generate a creative image.';
        }

        $parts[] = ['text' => $text];

        $url = sprintf(
            'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent',
            $model
        );

        try {
            $response = Http::timeout(180)
                ->withHeaders(['x-goog-api-key' => $apiKey])
                ->post($url, [
                    'contents' => [
                        [
                            'parts' => $parts,
                        ],
                    ],
                    'generationConfig' => [
                        'responseModalities' => ['IMAGE', 'TEXT'],
                    ],
                ]);

            $response->throw();

            $partsResponse = data_get($response->json(), 'candidates.0.content.parts', []);

            foreach ($partsResponse as $part) {
                $inline = $part['inlineData'] ?? $part['inline_data'] ?? null;
                if (! is_array($inline)) {
                    continue;
                }

                $data = $inline['data'] ?? null;
                if (! is_string($data) || $data === '') {
                    continue;
                }

                $mime = $inline['mimeType'] ?? $inline['mime_type'] ?? 'image/png';

                return [
                    'mime' => $mime,
                    'data' => $data,
                ];
            }

            throw new RuntimeException('Gemini did not return image data. Try another prompt or check GEMINI_IMAGE_MODEL.');
        } catch (RequestException $e) {
            $message = $e->response?->json('error.message') ?? $e->getMessage();
            throw new RuntimeException('Gemini image API error: '.$message, 0, $e);
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function partsForMessage(Message $message): array
    {
        $parts = [];

        if (is_string($message->content) && trim($message->content) !== '') {
            $parts[] = ['text' => $message->content];
        }

        $inline = $this->attachmentInlineData($message);
        if ($inline !== null) {
            $parts[] = ['inlineData' => $inline];
        }

        if ($parts === []) {
            $parts[] = ['text' => ' '];
        }

        return $parts;
    }

    /**
     * @return array{mimeType: string, data: string}|null
     */
    private function attachmentInlineData(Message $message): ?array
    {
        if (! $message->attachment_path || ! $message->attachment_mime) {
            return null;
        }

        $binary = Storage::disk('public')->get($message->attachment_path);
        if ($binary === null || $binary === '') {
            return null;
        }

        return [
            'mimeType' => $message->attachment_mime,
            'data' => base64_encode($binary),
        ];
    }
}