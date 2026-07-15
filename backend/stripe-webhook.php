<?php
/**
 * Webhook Stripe : appelé par Stripe (pas par le navigateur) quand un paiement
 * Checkout est finalisé. Confirme la réservation auprès du CRM en server-to-server
 * avec le secret partagé, comme décrit dans API-Reservation-Studio.md (option A).
 *
 * À configurer dans le dashboard Stripe → Développeurs → Webhooks :
 *   URL de l'endpoint : https://[ton-domaine-ovh]/backend/stripe-webhook.php
 *   Événement à écouter : checkout.session.completed
 */

require __DIR__ . '/config.php';

$payload = file_get_contents('php://input');
$sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

if (!verifyStripeSignature($payload, $sigHeader, STRIPE_WEBHOOK_SECRET)) {
    http_response_code(400);
    echo json_encode(['error' => 'Signature invalide']);
    exit;
}

$event = json_decode($payload, true) ?: [];

if (($event['type'] ?? '') === 'checkout.session.completed') {
    $session = $event['data']['object'] ?? [];
    $bookingId = $session['metadata']['bookingId'] ?? null;
    $stripeRef = $session['payment_intent'] ?? ($session['id'] ?? null);

    if ($bookingId && $stripeRef) {
        $ch = curl_init(CRM_API_URL);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode([
                'action' => 'confirm',
                'bookingId' => $bookingId,
                'stripeRef' => $stripeRef,
                'secret' => STUDIO_CONFIRM_SECRET,
            ]),
        ]);
        curl_exec($ch);
        curl_close($ch);
    }
}

http_response_code(200);
echo json_encode(['received' => true]);

/**
 * Vérification minimale de la signature Stripe, sans dépendance au SDK.
 * Référence : https://stripe.com/docs/webhooks/signatures
 */
function verifyStripeSignature($payload, $sigHeader, $secret) {
    $parts = [];
    foreach (explode(',', $sigHeader) as $part) {
        $kv = array_pad(explode('=', $part, 2), 2, null);
        $parts[$kv[0]] = $kv[1];
    }
    if (empty($parts['t']) || empty($parts['v1'])) {
        return false;
    }
    $signedPayload = $parts['t'] . '.' . $payload;
    $expected = hash_hmac('sha256', $signedPayload, $secret);
    return hash_equals($expected, $parts['v1']);
}
