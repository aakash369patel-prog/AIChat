<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_subscribed')->default(false)->after('password');
            $table->string('subscribed_plan')->nullable()->after('is_subscribed');
            $table->timestamp('subscribed_at')->nullable()->after('subscribed_plan');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_subscribed', 'subscribed_plan', 'subscribed_at']);
        });
    }
};