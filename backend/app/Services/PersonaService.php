<?php

namespace App\Services;

use App\Models\Conversation;

class PersonaService
{
    /**
     * @return list<array<string, mixed>>
     */
    public function personas(): array
    {
        return collect(config('personas.items', []))
            ->map(fn (array $p) => [
                'id' => $p['id'],
                'name' => $p['name'],
                'emoji' => $p['emoji'] ?? '',
                'tagline' => $p['tagline'] ?? '',
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function slashCommands(): array
    {
        return config('personas.slash_commands', []);
    }

    public function isValidPersona(?string $personaId): bool
    {
        if ($personaId === null || $personaId === '') {
            return true;
        }

        return collect(config('personas.items', []))->contains(fn ($p) => $p['id'] === $personaId);
    }

    public function systemInstructionForConversation(Conversation $conversation): ?string
    {
        $personaId = $conversation->persona_id ?: config('personas.default', 'friendly');

        $persona = collect(config('personas.items', []))->firstWhere('id', $personaId);
        if (! is_array($persona)) {
            return null;
        }

        $instruction = $persona['system_instruction'] ?? null;

        return is_string($instruction) && trim($instruction) !== '' ? trim($instruction) : null;
    }
}