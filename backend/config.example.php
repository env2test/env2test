<?php
/**
 * Copie ce fichier en config.php sur le serveur OVH et remplis les valeurs.
 * config.php ne doit JAMAIS être commit (voir .gitignore) — il contient des secrets.
 */

// Clé secrète Stripe (dashboard Stripe → Développeurs → Clés API). Commence par
// sk_test_ en mode test, sk_live_ en production. Ne jamais utiliser côté navigateur.
define('STRIPE_SECRET_KEY', '[VOTRE_CLE_SECRETE_STRIPE]');

// Secret de signature du webhook Stripe (créé à l'étape "Ajouter un endpoint" du
// dashboard Stripe → Développeurs → Webhooks). Commence par whsec_.
define('STRIPE_WEBHOOK_SECRET', '[VOTRE_WEBHOOK_SECRET_STRIPE]');

// Secret partagé avec le CRM (voir API-Reservation-Studio.md) — à demander à la
// personne qui gère le CRM Vercel, ou à définir avec elle si ce n'est pas encore fait.
define('STUDIO_CONFIRM_SECRET', '[SECRET_PARTAGE_AVEC_LE_CRM]');

// URL de base de l'API du CRM (déjà en ligne, cf. API-Reservation-Studio.md).
define('CRM_API_URL', 'https://crm-global-five.vercel.app/api/studio-booking');

// Origine autorisée pour les appels CORS depuis le site (adapter si besoin).
define('SITE_ORIGIN', 'https://www.capartenlivestudios.fr');
