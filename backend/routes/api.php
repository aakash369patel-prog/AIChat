<?php

use App\Http\Controllers\Admin\AdminAccountController;
use App\Http\Controllers\Admin\AdminAiSettingsController;
use App\Http\Controllers\Admin\AdminUserActivityController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\AuthenticationController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\UsageController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthenticationController::class, 'register']);
Route::post('/login', [AuthenticationController::class, 'login']);

Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::post('/logout', [AuthenticationController::class, 'logout']);
    Route::get('/me', [AuthenticationController::class, 'me']);
    Route::get('/usage', [UsageController::class, 'show']);
    Route::get('/billing/plans', [BillingController::class, 'plans']);
    Route::post('/billing/subscribe', [BillingController::class, 'subscribe']);

    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::post('/conversations', [ConversationController::class, 'store']);
    Route::get('/conversations/{conversation}', [ConversationController::class, 'show']);
    Route::patch('/conversations/{conversation}', [ConversationController::class, 'update']);
    Route::delete('/conversations/{conversation}', [ConversationController::class, 'destroy']);

    Route::post('/conversations/{conversation}/messages', [MessageController::class, 'store']);

    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/account', [AdminAccountController::class, 'show']);
        Route::patch('/account', [AdminAccountController::class, 'update']);

        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users', [AdminUserController::class, 'store']);
        Route::patch('/users/{user}', [AdminUserController::class, 'update']);
        Route::delete('/users/{user}', [AdminUserController::class, 'destroy']);

        Route::get('/settings/ai', [AdminAiSettingsController::class, 'show']);
        Route::put('/settings/ai', [AdminAiSettingsController::class, 'update']);

        Route::get('/user-activity', [AdminUserActivityController::class, 'index']);
    });
});