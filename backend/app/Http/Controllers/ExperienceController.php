<?php

namespace App\Http\Controllers;

use App\Services\PersonaService;
use Illuminate\Http\JsonResponse;

class ExperienceController extends Controller
{
    public function show(PersonaService $personas): JsonResponse
    {
        return response()->json([
            'personas' => $personas->personas(),
            'slash_commands' => $personas->slashCommands(),
            'default_persona_id' => config('personas.default', 'friendly'),
        ]);
    }
}