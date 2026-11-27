<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AiConfigService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAiSettingsController extends Controller
{
    public function show(AiConfigService $aiConfig): JsonResponse
    {
        return response()->json([
            'settings' => $aiConfig->adminSnapshot(),
        ]);
    }

    public function update(Request $request, AiConfigService $aiConfig): JsonResponse
    {
        $validated = $request->validate([
            'gemini_api_key' => ['sometimes', 'nullable', 'string', 'max:500'],
            'clear_gemini_api_key' => ['sometimes', 'boolean'],
            'gemini_model' => ['sometimes', 'nullable', 'string', 'max:120'],
            'gemini_image_model' => ['sometimes', 'nullable', 'string', 'max:120'],
            'openai_api_key' => ['sometimes', 'nullable', 'string', 'max:500'],
            'clear_openai_api_key' => ['sometimes', 'boolean'],
            'openai_model' => ['sometimes', 'nullable', 'string', 'max:120'],
            'openai_image_model' => ['sometimes', 'nullable', 'string', 'max:120'],
        ]);

        $aiConfig->persistAdminSettings($validated);

        return response()->json([
            'message' => 'AI settings updated.',
            'settings' => $aiConfig->adminSnapshot(),
        ]);
    }
}