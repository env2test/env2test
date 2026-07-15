<?php
/**
 * Crée une session Stripe Checkout pour une réservation déjà "hold" par le CRM,
 * et renvoie son URL de paiement. La clé secrète Stripe ne quitte jamais ce fichier.
 *
 * Appelé par reservation.html avec :
 *   POST { bookingId, amount_ttc, email }
 * Réponse :
 *   { url: 'https://checkout.stripe.com/...' }
 */

require __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . SITE_ORIGIN);
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$bookingId = $input['bookingId'] ?? null;
$amountTtc = $input['amount_ttc'] ?? null;
$email = $input['email'] ?? null;

if (!$bookingId || !$amountTtc || !$email) {
    http_response_code(400);
    echo json_encode(['error' => 'Champs manquants (bookingId, amount_ttc, email)']);
    exit;
}

$amountCents = (int) round(((float) $amountTtc) * 100);

$params = [
    'mode' => 'payment',
    'success_url' => SITE_ORIGIN . '/reservation.html?checkout=success&booking=' . urlencode($bookingId),
    'cancel_url' => SITE_ORIGIN . '/reservation.html?checkout=cancelled&booking=' . urlencode($bookingId),
    'customer_email' => $email,
    'metadata' => ['bookingId' => $bookingId],
    'line_items' => [[
        'quantity' => 1,
        'price_data' => [
            'currency' => 'eur',
            'unit_amount' => $amountCents,
            'product_data' => ['name' => 'Réservation studio — ' . $bookingId],
        ],
    ]],
];

$ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . STRIPE_SECRET_KEY],
    CURLOPT_POSTFIELDS => http_build_query(flattenForStripe($params)),
]);
$response = curl_exec($ch);
$curlError = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => 'Connexion à Stripe impossible']);
    exit;
}

$data = json_decode($response, true) ?: [];

if ($httpCode >= 400 || empty($data['url'])) {
    http_response_code(502);
    echo json_encode(['error' => $data['error']['message'] ?? 'Erreur Stripe']);
    exit;
}

echo json_encode(['url' => $data['url']]);

/**
 * Stripe attend un encodage form-urlencoded avec des clés à crochets pour les
 * tableaux/objets imbriqués (ex: line_items[0][price_data][currency]=eur).
 * Pas de SDK Stripe nécessaire pour un besoin aussi simple — juste cet aplatissement.
 */
function flattenForStripe($data, $prefix = '') {
    $result = [];
    foreach ($data as $key => $value) {
        $fullKey = $prefix === '' ? $key : "{$prefix}[{$key}]";
        if (is_array($value)) {
            $result += flattenForStripe($value, $fullKey);
        } else {
            $result[$fullKey] = $value;
        }
    }
    return $result;
}
