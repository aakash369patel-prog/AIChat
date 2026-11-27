<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Services\PersonaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = $request->string('search')->trim()->toString();

        $query = $request->user()
            ->conversations()
            ->withCount('messages')
            ->latest('updated_at');

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('title', 'like', '%'.$search.'%')
                    ->orWhereHas('messages', function ($messages) use ($search) {
                        $messages->where('content', 'like', '%'.$search.'%');
                    });
            });
        }

        $conversations = $query->get();

        return response()->json([
            'conversations' => $conversations,
            'search' => $search !== '' ? $search : null,
        ]);
    }

    public function store(Request $request, PersonaService $personas): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'persona_id' => ['sometimes', 'nullable', 'string', 'max:64'],
        ]);

        $personaId = $validated['persona_id'] ?? config('personas.default', 'friendly');
        if (! $personas->isValidPersona($personaId)) {
            return response()->json(['message' => 'Invalid persona.'], 422);
        }

        $conversation = $request->user()->conversations()->create([
            'title' => $validated['title'] ?? 'New Chat',
            'persona_id' => $personaId,
        ]);

        return response()->json(['conversation' => $conversation], 201);
    }

    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorizeConversation($request, $conversation);

        $conversation->load('messages');

        return response()->json(['conversation' => $conversation]);
    }

    public function update(Request $request, Conversation $conversation, PersonaService $personas): JsonResponse
    {
        $this->authorizeConversation($request, $conversation);

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'persona_id' => ['sometimes', 'nullable', 'string', 'max:64'],
        ]);

        if (array_key_exists('persona_id', $validated) && ! $personas->isValidPersona($validated['persona_id'])) {
            return response()->json(['message' => 'Invalid persona.'], 422);
        }

        if ($validated === []) {
            return response()->json(['message' => 'Nothing to update.'], 422);
        }

        $conversation->update($validated);

        return response()->json(['conversation' => $conversation]);
    }

    public function destroy(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorizeConversation($request, $conversation);

        $conversation->delete();

        return response()->json(['message' => 'Conversation deleted.']);
    }

    private function authorizeConversation(Request $request, Conversation $conversation): void
    {
        if ($conversation->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized.');
        }
    }
}