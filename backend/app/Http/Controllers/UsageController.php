<?php

namespace App\Http\Controllers;

use App\Services\UsageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsageController extends Controller
{
    public function show(Request $request, UsageService $usage): JsonResponse
    {
        return response()->json(['usage' => $usage->summary($request->user())]);
    }
}