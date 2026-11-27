<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = $request->string('search')->trim()->toString();

        $query = User::query()->orderByDesc('created_at');

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('name', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%');
            });
        }

        $users = $query->paginate(20);

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'is_admin' => ['sometimes', 'boolean'],
            'is_subscribed' => ['sometimes', 'boolean'],
            'subscribed_plan' => ['nullable', 'string', 'max:64'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'is_admin' => $validated['is_admin'] ?? false,
            'is_subscribed' => $validated['is_subscribed'] ?? false,
            'subscribed_plan' => $validated['subscribed_plan'] ?? null,
            'subscribed_at' => ($validated['is_subscribed'] ?? false) ? now() : null,
        ]);

        return response()->json(['user' => $user], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['sometimes', 'nullable', 'string', 'min:8'],
            'is_admin' => ['sometimes', 'boolean'],
            'is_subscribed' => ['sometimes', 'boolean'],
            'subscribed_plan' => ['nullable', 'string', 'max:64'],
        ]);

        if (array_key_exists('is_admin', $validated) && ! $validated['is_admin'] && $user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot remove your own admin role.'], 422);
        }

        if (array_key_exists('name', $validated)) {
            $user->name = $validated['name'];
        }

        if (array_key_exists('email', $validated)) {
            $user->email = $validated['email'];
        }

        if (! empty($validated['password'] ?? null)) {
            $user->password = $validated['password'];
        }

        if (array_key_exists('is_admin', $validated)) {
            $user->is_admin = $validated['is_admin'];
        }

        if (array_key_exists('is_subscribed', $validated)) {
            $user->is_subscribed = $validated['is_subscribed'];
            if ($validated['is_subscribed']) {
                $user->subscribed_at = $user->subscribed_at ?? now();
            } else {
                $user->subscribed_plan = null;
                $user->subscribed_at = null;
            }
        }

        if (array_key_exists('subscribed_plan', $validated)) {
            $user->subscribed_plan = $validated['subscribed_plan'];
        }

        $user->save();

        return response()->json(['user' => $user->fresh()]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account from the admin panel.'], 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }
}