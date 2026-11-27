<?php

namespace App\Http\Support;

use App\Models\Conversation;
use App\Models\Message;
use App\Services\GeminiService;
use App\Services\PersonaService;
use App\Services\UsageService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

trait StreamsAssistantReply
{
    /**
     * @param  Collection<int, Message>  $history
     */
    protected function streamAssistantReply(
        Request $request,
        Conversation $conversation,
        GeminiService $gemini,
        UsageService $usage,
        Collection $history,
        ?Message $userMessage = null,
    ): StreamedResponse {
        $systemInstruction = app(PersonaService::class)->systemInstructionForConversation($conversation);

        return response()->stream(function () use ($request, $conversation, $gemini, $usage, $history, $userMessage, $systemInstruction) {
            $send = static function (string $event, array $payload): void {
                echo 'event: '.$event."\n";
                echo 'data: '.json_encode($payload, JSON_UNESCAPED_UNICODE)."\n\n";
                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
            };

            try {
                $assistantText = $gemini->streamGenerateReply(
                    $history,
                    function (string $chunk) use ($send) {
                        $send('chunk', ['text' => $chunk]);
                    },
                    $systemInstruction,
                );

                $assistantMessage = $conversation->messages()->create([
                    'role' => 'assistant',
                    'content' => $assistantText,
                    'content_type' => 'text',
                ]);

                $conversation->touch();

                $done = [
                    'assistant_message' => $assistantMessage,
                    'conversation' => $conversation->fresh(),
                    'usage' => $usage->summary($request->user()->fresh()),
                ];

                if ($userMessage !== null) {
                    $done['user_message'] = $userMessage;
                }

                $send('done', $done);
            } catch (Throwable $e) {
                $send('error', [
                    'message' => 'Failed to get a response from Gemini.',
                    'error' => $e->getMessage(),
                ]);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}