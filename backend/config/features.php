<?php

return [

    'require_email_verification' => filter_var(
        env('REQUIRE_EMAIL_VERIFICATION', false),
        FILTER_VALIDATE_BOOL
    ),

];