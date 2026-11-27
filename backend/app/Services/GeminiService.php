<?php

namespace App\Services;

use App\Models\Message;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Collection;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class GeminiService
{
    public function __construct(
        private readonly AiConfigService $aiConfig,
    ) {}

    public function generateReply(Collection $messages, ?string $systemInstruction = null): string
    {
        $apiKey = $this->aiConfig->geminiApiKey();
        $model = $this->aiConfig->geminiModel();

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
                ->post($url, $this->requestBody($contents, $systemInstruction));

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
     * @param  callable(string): void  $onTextChunk
     */
    public function streamGenerateReply(
        Collection $messages,
        callable $onTextChunk,
        ?string $systemInstruction = null,
    ): string {
        $apiKey = $this->aiConfig->geminiApiKey();
        $model = $this->aiConfig->geminiModel();

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
            'https://generativelanguage.googleapis.com/v1beta/models/%s:streamGenerateContent?alt=sse',
            $model
        );

        $client = new Client(['timeout' => 120]);

        try {
            $response = $client->post($url, [
                'headers' => [
                    'x-goog-api-key' => $apiKey,
                    'Content-Type' => 'application/json',
                ],
                'json' => $this->requestBody($contents, $systemInstruction),
                'stream' => true,
            ]);
        } catch (\Throwable $e) {
            throw new RuntimeException('Gemini stream error: '.$e->getMessage(), 0, $e);
        }

        $body = $response->getBody();
        $buffer = '';
        $full = '';

        while (! $body->eof()) {
            $buffer .= $body->read(8192);

            while (($newline = strpos($buffer, "\n")) !== false) {
                $line = trim(substr($buffer, 0, $newline));
                $buffer = substr($buffer, $newline + 1);

                if ($line === '' || ! str_starts_with($line, 'data:')) {
                    continue;
                }

                $payload = trim(substr($line, 5));
                if ($payload === '' || $payload === '[DONE]') {
                    continue;
                }

                $json = json_decode($payload, true);
                if (! is_array($json)) {
                    continue;
                }

                $chunk = data_get($json, 'candidates.0.content.parts.0.text');
                if (is_string($chunk) && $chunk !== '') {
                    $full .= $chunk;
                    $onTextChunk($chunk);
                }
            }
        }

        if (trim($full) === '') {
            throw new RuntimeException('Gemini returned an empty response.');
        }

        return trim($full);
    }

    /**
     * @return array{mime: string, data: string}
     */
    public function generateImage(
        string $prompt,
        ?string $referenceMime = null,
        ?string $referenceBase64 = null,
    ): array {
        $apiKey = $this->aiConfig->geminiApiKey();
        $model = $this->aiConfig->geminiImageModel();

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
     * @param  list<array<string, mixed>>  $contents
     * @return array<string, mixed>
     */
    private function requestBody(array $contents, ?string $systemInstruction): array
    {
        $body = ['contents' => $contents];

        if ($systemInstruction !== null && trim($systemInstruction) !== '') {
            $body['systemInstruction'] = [
                'parts' => [['text' => trim($systemInstruction)]],
            ];
        }

        return $body;
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