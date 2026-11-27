<?php

namespace App\Services;

use App\Models\Message;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class OpenAiService
{
    public function __construct(
        private readonly AiConfigService $aiConfig,
    ) {}

    public function generateReply(Collection $messages): string
    {
        $apiKey = $this->aiConfig->openAiApiKey();
        $model = $this->aiConfig->openAiModel();

        if (empty($apiKey)) {
            throw new RuntimeException('OpenAI API key is not configured.');
        }

        $openAiMessages = $messages->map(function (Message $message) {
            $role = $message->role === 'assistant' ? 'assistant' : 'user';

            return [
                'role' => $role,
                'content' => $this->contentForMessage($message),
            ];
        })->values()->all();

        try {
            $response = Http::timeout(120)
                ->withToken($apiKey)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => $model,
                    'messages' => $openAiMessages,
                ]);

            $response->throw();

            $text = data_get($response->json(), 'choices.0.message.content');

            if (! is_string($text) || trim($text) === '') {
                throw new RuntimeException('OpenAI returned an empty response.');
            }

            return trim($text);
        } catch (RequestException $e) {
            $message = $e->response?->json('error.message') ?? $e->getMessage();
            throw new RuntimeException('OpenAI API error: '.$message, 0, $e);
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
        $apiKey = $this->aiConfig->openAiApiKey();
        $model = $this->aiConfig->openAiImageModel();

        if (empty($apiKey)) {
            throw new RuntimeException('OpenAI API key is not configured.');
        }

        $text = trim($prompt);
        if ($text === '') {
            $text = $referenceBase64
                ? 'Create a new image inspired by the attached reference.'
                : 'Generate a creative image.';
        }

        if ($referenceBase64 && $referenceMime && Str::startsWith($referenceMime, 'image/')) {
            $text .= ' (Use the user\'s reference image as visual guidance.)';
        }

        try {
            $response = Http::timeout(180)
                ->withToken($apiKey)
                ->post('https://api.openai.com/v1/images/generations', [
                    'model' => $model,
                    'prompt' => $text,
                    'n' => 1,
                    'size' => '1024x1024',
                    'response_format' => 'b64_json',
                ]);

            $response->throw();

            $b64 = data_get($response->json(), 'data.0.b64_json');
            if (! is_string($b64) || $b64 === '') {
                throw new RuntimeException('OpenAI did not return image data.');
            }

            return [
                'mime' => 'image/png',
                'data' => $b64,
            ];
        } catch (RequestException $e) {
            $message = $e->response?->json('error.message') ?? $e->getMessage();
            throw new RuntimeException('OpenAI image API error: '.$message, 0, $e);
        }
    }

    /**
     * @return string|list<array<string, mixed>>
     */
    private function contentForMessage(Message $message): string|array
    {
        $parts = [];
        $text = is_string($message->content) ? trim($message->content) : '';

        if ($text !== '') {
            $parts[] = [
                'type' => 'text',
                'text' => $text,
            ];
        }

        $imageUrl = $this->attachmentDataUrl($message);
        if ($imageUrl !== null) {
            $parts[] = [
                'type' => 'image_url',
                'image_url' => ['url' => $imageUrl],
            ];
        }

        if ($parts === []) {
            return ' ';
        }

        if (count($parts) === 1 && ($parts[0]['type'] ?? '') === 'text') {
            return (string) $parts[0]['text'];
        }

        return $parts;
    }

    private function attachmentDataUrl(Message $message): ?string
    {
        if (! $message->attachment_path || ! $message->attachment_mime) {
            return null;
        }

        if (! str_starts_with($message->attachment_mime, 'image/')) {
            return null;
        }

        $binary = Storage::disk('public')->get($message->attachment_path);
        if ($binary === null || $binary === '') {
            return null;
        }

        return 'data:'.$message->attachment_mime.';base64,'.base64_encode($binary);
    }
}