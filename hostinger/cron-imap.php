<?php
/**
 * PixelReach AI — Hostinger IMAP Poller
 * Schedule this file to run every 5 minutes in Hostinger cron manager.
 * Requires PHP IMAP extension (pre-installed on most Hostinger plans).
 * Command: /usr/bin/php /home/yourusername/public_html/cron/cron-imap.php
 */

$APP_URL         = 'https://your-app.vercel.app';  // ← Change to your Vercel URL
$CRON_SECRET     = getenv('CRON_SECRET') ?: 'your_cron_secret_token';
$SUPABASE_URL    = getenv('SUPABASE_URL') ?: 'https://xxxx.supabase.co';
$SUPABASE_KEY    = getenv('SUPABASE_SERVICE_ROLE_KEY') ?: 'your_service_role_key';
$ENCRYPTION_KEY  = getenv('ENCRYPTION_KEY') ?: 'your_32_char_encryption_key_here';

function supabase_get(string $path): array {
    global $SUPABASE_URL, $SUPABASE_KEY;
    $ch = curl_init("$SUPABASE_URL/rest/v1/$path");
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER     => [
            'apikey: ' . $SUPABASE_KEY,
            'Authorization: Bearer ' . $SUPABASE_KEY,
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
    ]);
    $data = curl_exec($ch);
    curl_close($ch);
    return json_decode($data, true) ?? [];
}

function decrypt_value(string $payload): string {
    global $ENCRYPTION_KEY;
    [$ivHex, $encHex] = explode(':', $payload);
    $iv  = hex2bin($ivHex);
    $enc = hex2bin($encHex);
    return openssl_decrypt($enc, 'aes-256-cbc', substr($ENCRYPTION_KEY, 0, 32), OPENSSL_RAW_DATA, $iv);
}

function post_to_vercel(string $url, array $data): void {
    global $CRON_SECRET;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $CRON_SECRET,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS     => json_encode($data),
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_RETURNTRANSFER => true,
    ]);
    curl_exec($ch);
    curl_close($ch);
}

// Fetch active IMAP-enabled accounts
$accounts = supabase_get('email_accounts?status=eq.active&imap_enabled=eq.true&is_active=eq.true');

foreach ($accounts as $acc) {
    if (empty($acc['imap_host']) || empty($acc['imap_pass_encrypted'])) continue;

    try {
        $imapPass = decrypt_value($acc['imap_pass_encrypted']);
        $mailbox  = sprintf(
            '{%s:%d/imap/ssl}INBOX',
            $acc['imap_host'],
            $acc['imap_port'] ?? 993
        );

        $mbox = @imap_open($mailbox, $acc['imap_user'], $imapPass);
        if (!$mbox) {
            error_log("[PixelReach IMAP] Failed to connect: {$acc['from_email']} — " . imap_last_error());
            continue;
        }

        $since    = date('d-M-Y', strtotime('-10 min'));
        $messages = imap_search($mbox, 'UNSEEN SINCE "' . $since . '"');

        if ($messages) {
            foreach ($messages as $msgId) {
                $header   = imap_headerinfo($mbox, $msgId);
                $body     = imap_fetchbody($mbox, $msgId, 1);
                $fromAddr = ($header->from[0]->mailbox ?? '') . '@' . ($header->from[0]->host ?? '');

                post_to_vercel($APP_URL . '/api/imap/ingest', [
                    'account_id'  => $acc['id'],
                    'from_address'=> $fromAddr,
                    'subject'     => $header->subject ?? '',
                    'in_reply_to' => $header->in_reply_to ?? null,
                    'references'  => $header->references ?? null,
                    'body'        => mb_substr($body, 0, 2000),
                    'received_at' => date('c', $header->udate ?? time()),
                ]);
            }
        }

        imap_close($mbox);
    } catch (Throwable $e) {
        error_log("[PixelReach IMAP] Error for {$acc['from_email']}: " . $e->getMessage());
    }
}

// Also trigger follow-up scheduling
post_to_vercel($APP_URL . '/api/jobs/process-followups', []);

error_log('[PixelReach IMAP] Cron run complete at ' . date('Y-m-d H:i:s'));
