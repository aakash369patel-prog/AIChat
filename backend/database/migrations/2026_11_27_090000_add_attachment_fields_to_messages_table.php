<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->string('attachment_path', 500)->nullable()->after('image_url');
            $table->string('attachment_url', 500)->nullable()->after('attachment_path');
            $table->string('attachment_mime', 100)->nullable()->after('attachment_url');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['attachment_path', 'attachment_url', 'attachment_mime']);
        });
    }
};