<?php

namespace App\Models;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class AppSetting extends Model
{
    /** @var list<string> */
    public const SECRET_KEYS = [
        'gemini_api_key',
    ];

    protected $fillable = [
        'key',
        'value',
    ];

    public static function getValue(string $key, ?string $default = null): ?string
    {
        $row = static::query()->where('key', $key)->first();

        if (! $row || $row->value === null || $row->value === '') {
            return $default;
        }

        if (in_array($key, self::SECRET_KEYS, true)) {
            try {
                return Crypt::decryptString($row->value);
            } catch (DecryptException) {
                return $default;
            }
        }

        return $row->value;
    }

    public static function setValue(string $key, ?string $value): void
    {
        if ($value === null || trim($value) === '') {
            static::query()->where('key', $key)->delete();

            return;
        }

        $stored = in_array($key, self::SECRET_KEYS, true)
            ? Crypt::encryptString(trim($value))
            : trim($value);

        static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => $stored],
        );
    }
}