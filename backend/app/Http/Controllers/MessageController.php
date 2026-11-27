<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Services\AiChatService;
use App\Services\UsageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class MessageController extends Controller
{
    public function store(
        Request $request,
        Conversation $conversation,
        AiChatService $aiChat,
        UsageService $usage,
    ): JsonResponse {
        if ($conversation->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized.');
        }

        $validated = $request->validate([
            'content' => ['nullable', 'string', 'max:10000'],
            'mode' => ['sometimes', 'string', 'in:chat,image'],
            'attachment' => [
                'nullable',
                'file',
                'max:10240',
                'mimes:jpeg,jpg,png,gif,webp,pdf',
            ],
        ]);

        $content = trim($validated['content'] ?? '');
        $mode = $validated['mode'] ?? 'chat';
        $hasAttachment = $request->hasFile('attachment');

        if ($content === '' && ! $hasAttachment) {
            return response()->json([
                'message' => 'Enter a message or attach a file.',
            ], 422);
        }

        if ($mode === 'image' && ! $usage->canUseImage($request->user())) {
            return response()->json([
                'message' => 'Image generation is not included in the Starter plan. Upgrade to Pro or Team.',
                'code' => 'image_not_allowed',
                'usage' => $usage->summary($request->user()),
            ], 403);
        }

        if (! $usage->canSendPrompt($request->user())) {
            return response()->json([
                'message' => 'You have reached your prompt limit for this plan.',
                'code' => 'credit_limit_reached',
                'usage' => $usage->summary($request->user()),
            ], 402);
        }

        $attachmentPath = null;
        $attachmentUrl = null;
        $attachmentMime = null;
        $attachmentBase64 = null;

        if ($hasAttachment) {
            $file = $request->file('attachment');
            $attachmentMime = $file->getMimeType() ?: 'application/octet-stream';
            $extension = $file->getClientOriginalExtension() ?: 'bin';
            $attachmentPath = 'attachments/'.Str::uuid().'.'.$extension;
            Storage::disk('public')->put($attachmentPath, file_get_contents($file->getRealPath()));
            $attachmentUrl = asset(Storage::url($attachmentPath));
            $attachmentBase64 = base64_encode(Storage::disk('public')->get($attachmentPath));
        }

        $userMessage = $conversation->messages()->create([
            'role' => 'user',
            'content' => $content !== '' ? $content : '[Attachment]',
            'content_type' => 'text',
            'attachment_path' => $attachmentPath,
            'attachment_url' => $attachmentUrl,
            'attachment_mime' => $attachmentMime,
        ]);

        if ($conversation->title === 'New Chat') {
            $prefix = $mode === 'image' ? 'Image: ' : '';
            $titleSource = $content !== '' ? $content : 'Attachment';
            $conversation->update([
                'title' => mb_substr($prefix.$titleSource, 0, 50),
            ]);
        }

        $conversation->touch();

        try {
            if ($mode === 'image') {
                if ($attachmentMime && ! Str::startsWith($attachmentMime, 'image/')) {
                    throw new RuntimeException('Create image mode accepts image attachments only.');
                }

                $image = $aiChat->generateImage(
                    $content,
                    $attachmentBase64 ? $attachmentMime : null,
                    $attachmentBase64,
                );
                $extension = Str::contains($image['mime'], 'jpeg') ? 'jpg' : 'png';
                $filename = 'chat-images/'.Str::uuid().'.'.$extension;
                Storage::disk('public')->put($filename, base64_decode($image['data']));
                $imageUrl = asset(Storage::url($filename));

                $assistantMessage = $conversation->messages()->create([
                    'role' => 'assistant',
                    'content' => 'Generated image',
                    'content_type' => 'image',
                    'image_url' => $imageUrl,
                ]);
            } else {
                $history = $conversation->messages()
                    ->where('content_type', 'text')
                    ->orderBy('created_at')
                    ->get();
                $assistantText = $aiChat->generateReply($history);

                $assistantMessage = $conversation->messages()->create([
                    'role' => 'assistant',
                    'content' => $assistantText,
                    'content_type' => 'text',
                ]);
            }
        } catch (Throwable $e) {
            return response()->json([
                'message' => $mode === 'image'
                    ? 'Failed to generate an image.'
                    : 'Failed to get a response from the AI provider.',
                'error' => $e->getMessage(),
                'user_message' => $userMessage,
            ], 502);
        }

        return response()->json([
            'user_message' => $userMessage,
            'assistant_message' => $assistantMessage,
            'conversation' => $conversation->fresh(),
            'usage' => $usage->summary($request->user()),
        ]);
    }
}