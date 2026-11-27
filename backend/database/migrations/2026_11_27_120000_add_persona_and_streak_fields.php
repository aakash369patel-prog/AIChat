<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->string('persona_id', 64)->nullable()->after('title');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unsignedSmallInteger('chat_streak_days')->default(0)->after('subscribed_at');
            $table->unsignedSmallInteger('longest_chat_streak')->default(0)->after('chat_streak_days');
            $table->date('last_chat_date')->nullable()->after('longest_chat_streak');
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn('persona_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['chat_streak_days', 'longest_chat_streak', 'last_chat_date']);
        });
    }
};