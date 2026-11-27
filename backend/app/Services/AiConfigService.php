<?php

namespace App\Services;

use App\Models\AppSetting;

class AiConfigService
{
    public function geminiApiKey(): ?string
    {
        $fromDb = AppSetting::getValue('gemini_api_key');

        if ($fromDb !== null && $fromDb !== '') {
            return $fromDb;
        }

        $fromEnv = config('services.gemini.api_key');

        return is_string($fromEnv) && $fromEnv !== '' ? $fromEnv : null;
    }

    public function geminiModel(): string
    {
        $fromDb = AppSetting::getValue('gemini_model');

        if ($fromDb !== null && $fromDb !== '') {
            return $fromDb;
        }

        return (string) config('services.gemini.model', 'gemini-2.0-flash');
    }

    public function geminiImageModel(): string
    {
        $fromDb = AppSetting::getValue('gemini_image_model');

        if ($fromDb !== null && $fromDb !== '') {
            return $fromDb;
        }

        return (string) config('services.gemini.image_model', 'gemini-2.5-flash-image');
    }

    public function apiKeySource(): string
    {
        $fromDb = AppSetting::getValue('gemini_api_key');

        return $fromDb !== null && $fromDb !== '' ? 'database' : 'env';
    }

    public function maskSecret(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $length = strlen($value);
        if ($length <= 4) {
            return str_repeat('•', 8);
        }

        return str_repeat('•', min(24, $length - 4)).substr($value, -4);
    }

    /**
     * @return array<string, mixed>
     */
    public function adminSnapshot(): array
    {
        $apiKey = $this->geminiApiKey();

        return [
            'gemini_api_key_masked' => $this->maskSecret($apiKey),
            'gemini_api_key_configured' => $apiKey !== null && $apiKey !== '',
            'gemini_api_key_source' => $this->apiKeySource(),
            'gemini_model' => $this->geminiModel(),
            'gemini_image_model' => $this->geminiImageModel(),
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function persistAdminSettings(array $validated): void
    {
        if (array_key_exists('gemini_api_key', $validated) && $validated['gemini_api_key'] !== null) {
            AppSetting::setValue('gemini_api_key', $validated['gemini_api_key']);
        }

        if (array_key_exists('clear_gemini_api_key', $validated) && $validated['clear_gemini_api_key']) {
            AppSetting::setValue('gemini_api_key', null);
        }

        if (array_key_exists('gemini_model', $validated) && $validated['gemini_model'] !== null) {
            AppSetting::setValue('gemini_model', $validated['gemini_model']);
        }

        if (array_key_exists('gemini_image_model', $validated) && $validated['gemini_image_model'] !== null) {
            AppSetting::setValue('gemini_image_model', $validated['gemini_image_model']);
        }
    }
}