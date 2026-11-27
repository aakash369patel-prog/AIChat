<?php

namespace App\Http\Controllers;

use App\Http\Support\StreamsAssistantReply;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\GeminiService;
use App\Services\PersonaService;
use App\Services\UsageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class MessageActionController extends Controller
{
    use StreamsAssistantReply;
    public function update(
        Request $request,
        Conversation $conversation,
        Message $message,
        GeminiService $gemini,
        UsageService $usage,
        PersonaService $personas,
    ): JsonResponse|StreamedResponse {
        if ($conversation->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized.');
        }

        if ($message->conversation_id !== $conversation->id) {
            abort(404);
        }

        $systemInstruction = $personas->systemInstructionForConversation($conversation);

        if ($message->role !== 'user' || $message->content_type !== 'text') {
            return response()->json(['message' => 'Only text user messages can be edited.'], 422);
        }

        if ($message->attachment_path) {
            return response()->json(['message' => 'Messages with attachments cannot be edited.'], 422);
        }

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:10000'],
            'stream' => ['sometimes', 'boolean'],
        ]);

        $content = trim($validated['content']);
        if ($content === '') {
            return response()->json(['message' => 'Message cannot be empty.'], 422);
        }

        $message->update(['content' => $content]);

        $conversation->messages()
            ->where('created_at', '>', $message->created_at)
            ->delete();

        $conversation->touch();

        $history = $conversation->messages()
            ->where('content_type', 'text')
            ->orderBy('created_at')
            ->get();

        $stream = $request->boolean('stream');

        if ($stream) {
            return $this->streamAssistantReply($request, $conversation, $gemini, $usage, $history, $message);
        }

        try {
            $assistantText = $gemini->generateReply($history, $systemInstruction);
            $assistantMessage = $conversation->messages()->create([
                'role' => 'assistant',
                'content' => $assistantText,
                'content_type' => 'text',
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'message' => 'Failed to get a response from Gemini.',
                'error' => $e->getMessage(),
                'user_message' => $message->fresh(),
            ], 502);
        }

        return response()->json([
            'user_message' => $message->fresh(),
            'assistant_message' => $assistantMessage,
            'conversation' => $conversation->fresh(),
            'usage' => $usage->summary($request->user()),
        ]);
    }

    public function regenerate(
        Request $request,
        Conversation $conversation,
        Message $message,
        GeminiService $gemini,
        UsageService $usage,
        PersonaService $personas,
    ): JsonResponse|StreamedResponse {
        if ($conversation->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized.');
        }

        if ($message->conversation_id !== $conversation->id) {
            abort(404);
        }

        if ($message->role !== 'assistant' || $message->content_type !== 'text') {
            return response()->json(['message' => 'Only text assistant replies can be regenerated.'], 422);
        }

        $systemInstruction = $personas->systemInstructionForConversation($conversation);

        $lastAssistant = $conversation->messages()
            ->where('role', 'assistant')
            ->latest('created_at')
            ->first();

        if (! $lastAssistant || $lastAssistant->id !== $message->id) {
            return response()->json(['message' => 'You can only regenerate the latest assistant reply.'], 422);
        }

        $validated = $request->validate([
            'stream' => ['sometimes', 'boolean'],
        ]);

        $message->delete();
        $conversation->touch();

        $history = $conversation->messages()
            ->where('content_type', 'text')
            ->orderBy('created_at')
            ->get();

        $stream = $request->boolean('stream');

        if ($stream) {
            return $this->streamAssistantReply($request, $conversation, $gemini, $usage, $history);
        }

        try {
            $assistantText = $gemini->generateReply($history, $systemInstruction);
            $assistantMessage = $conversation->messages()->create([
                'role' => 'assistant',
                'content' => $assistantText,
                'content_type' => 'text',
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'message' => 'Failed to get a response from Gemini.',
                'error' => $e->getMessage(),
            ], 502);
        }

        return response()->json([
            'assistant_message' => $assistantMessage,
            'conversation' => $conversation->fresh(),
            'usage' => $usage->summary($request->user()),
        ]);
    }
}