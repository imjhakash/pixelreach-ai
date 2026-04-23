<?php
/**
 * PixelReach AI — Hostinger Cron Trigger
 * Schedule this file to run every 1 minute in Hostinger cron manager.
 * Command: /usr/bin/php /home/yourusername/public_html/cron/cron-trigger.php
 */

$APP_URL    = 'https://your-app.vercel.app';  // ← Change to your Vercel URL
$CRON_SECRET = getenv('CRON_SECRET') ?: 'your_cron_secret_token';  // ← Set in Hostinger env or hardcode

$endpoints = [
    $APP_URL . '/api/jobs/generate-emails',
    $APP_URL . '/api/jobs/process-send-queue',
];

foreach ($endpoints as $url) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $CRON_SECRET,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS     => '{}',
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    error_log("[PixelReach Cron] $url → HTTP $httpCode: $response");
}
