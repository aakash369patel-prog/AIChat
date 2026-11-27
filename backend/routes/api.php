<?php

use App\Http\Controllers\Admin\AdminAccountController;
use App\Http\Controllers\Admin\AdminAiSettingsController;
use App\Http\Controllers\Admin\AdminAnalyticsController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\AuthenticationController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\ExperienceController;
use App\Http\Controllers\MessageActionController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\UsageController;
use Illuminate\Support\Facades\Route;

Route::get('/experience', [ExperienceController::class, 'show']);

Route::post('/register', [AuthenticationController::class, 'register']);
Route::post('/login', [AuthenticationController::class, 'login']);
Route::post('/forgot-password', [AuthenticationController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthenticationController::class, 'resetPassword']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthenticationController::class, 'logout']);
    Route::get('/me', [AuthenticationController::class, 'me']);
    Route::post('/email/verification-notification', [AuthenticationController::class, 'resendVerification']);

    Route::get('/usage', [UsageController::class, 'show']);
    Route::get('/billing/plans', [BillingController::class, 'plans']);
    Route::post('/billing/subscribe', [BillingController::class, 'subscribe']);
    Route::post('/billing/razorpay/order', [BillingController::class, 'checkout']);
    Route::post('/billing/razorpay/verify', [BillingController::class, 'verifyPayment']);

    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::post('/conversations', [ConversationController::class, 'store']);
    Route::get('/conversations/{conversation}', [ConversationController::class, 'show']);
    Route::patch('/conversations/{conversation}', [ConversationController::class, 'update']);
    Route::delete('/conversations/{conversation}', [ConversationController::class, 'destroy']);

    Route::middleware(['verified.email', 'throttle:messages'])->group(function () {
        Route::post('/conversations/{conversation}/messages', [MessageController::class, 'store']);
        Route::patch('/conversations/{conversation}/messages/{message}', [MessageActionController::class, 'update']);
        Route::post('/conversations/{conversation}/messages/{message}/regenerate', [MessageActionController::class, 'regenerate']);
    });

    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/analytics', [AdminAnalyticsController::class, 'show']);
        Route::get('/account', [AdminAccountController::class, 'show']);
        Route::patch('/account', [AdminAccountController::class, 'update']);

        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users', [AdminUserController::class, 'store']);
        Route::patch('/users/{user}', [AdminUserController::class, 'update']);
        Route::delete('/users/{user}', [AdminUserController::class, 'destroy']);

        Route::get('/settings/ai', [AdminAiSettingsController::class, 'show']);
        Route::put('/settings/ai', [AdminAiSettingsController::class, 'update']);
    });
});