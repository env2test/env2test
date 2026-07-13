# API Réservation Studio Podcast — contrat pour le web master

API publique hébergée sur le CRM (Vercel). Elle gère les **disponibilités** et les
**réservations** du studio de podcast. Le **design de la page** et le **paiement Stripe**
sont réalisés côté site CPL Studios ; cette API est la **source de vérité** de l'agenda.

- **Base URL** : `https://crm-global-five.vercel.app/api/studio-booking`
- **CORS** : autorisé pour `capartenlivestudios.fr` (+ `www`) et les previews `*.vercel.app`.
- **Format** : JSON. Content-Type `application/json`.
- ⚠️ **Le prix est TOUJOURS recalculé côté serveur** à partir des sélections. Ne jamais faire
  confiance à un montant calculé côté navigateur pour le paiement : utiliser le `amount_ttc`
  renvoyé par `hold`.

---

## Parcours

```
1. GET  ?action=catalog        → formules, options, prix (afficher le configurateur + panier)
2. GET  (dispos)               → créneaux libres/occupés (afficher le calendrier)
3. POST action=hold            → pré-réserve le créneau 20 min + renvoie le montant à payer
4. (web master) Stripe Checkout avec amount_ttc, metadata.bookingId
5. Paiement OK → POST action=confirm (serveur→serveur ou webhook Stripe)
                 → le CRM crée la fiche client + la facture payée
```

---

## 1. `GET ?action=catalog`
Renvoie le catalogue et les prix (TTC, TVA 20 %).
```json
{
  "tva_pct": 20,
  "formules": {
    "premontage":  { "label": "Pré-montage (livraison 48 h · 1080p)", "prix_ttc": 99 },
    "montage_pro": { "label": "Montage professionnel …",             "prix_ttc": 250 }
  },
  "options": {
    "pack_shorts":   { "label": "Pack de 4 Shorts …", "prix_ttc": 100, "max": null },
    "short_premium": { "label": "Short premium …",    "prix_ttc": 50,  "max": null },
    "intro":         { "label": "Création d'introduction …", "prix_ttc": 100, "max": 1 }
  },
  "participants": [1, 2, 3],
  "hours": { "min": 1, "max": 11 },
  "openHour": 9, "closeHour": 20, "slotMinutes": 60
}
```
Règle de prix : `montant_ttc = prix_formule × nb_heures + Σ(prix_option × qté)`.
Le **nombre de participants n'influe pas sur le prix**.

## 2. `GET` (disponibilités) — `?days=42` (optionnel, max 42)
```json
{
  "studio": "podcast", "openHour": 9, "closeHour": 20, "slotMinutes": 60,
  "days": [
    { "date": "2026-07-08",
      "slots": [ { "startAt": "2026-07-08T07:00:00.000Z", "label": "09:00", "free": true }, … ] }
  ]
}
```
Chaque `slot` = 1 h. Pour une durée de N h, tous les N créneaux consécutifs à partir du
départ doivent être `free`. N'expose aucune donnée client (juste libre/occupé).

## 3. `POST` (pré-réservation) — `{ "action": "hold", … }`
```json
{
  "action": "hold",
  "startAt": "2026-07-08T07:00:00.000Z",  // ISO du créneau de départ
  "hours": 2,                              // nombre d'heures
  "participants": 2,                       // 1..3
  "formule": "montage_pro",                // clé catalogue
  "options": [ { "key": "pack_shorts", "qty": 1 } ],
  "name": "Jean Dupont",
  "email": "jean@exemple.fr",
  "phone": "0612345678",
  "company_extra": ""                      // honeypot anti-bot : laisser vide
}
```
Réponse `200` :
```json
{
  "ok": true,
  "bookingId": "STB-2026-004",
  "amount_ttc": 600,                        // ← montant à passer à Stripe
  "breakdown": [ { "key": "montage_pro", "nom": "…", "quantite": 2, "prix_ttc": 250, "total_ttc": 500 },
                 { "key": "pack_shorts", "nom": "…", "quantite": 1, "prix_ttc": 100, "total_ttc": 100 } ],
  "holdExpiresAt": "2026-07-08T…Z"          // le créneau est tenu jusque-là (~20 min)
}
```
Erreurs : `400` (données/durée invalides), `409` (créneau déjà pris / trop proche).
→ Ouvrir ensuite Stripe Checkout avec `amount_ttc` et `metadata.bookingId = bookingId`.

## 4. `POST` (confirmation paiement) — `{ "action": "confirm", … }`
**Serveur→serveur uniquement** (jamais depuis le navigateur : contient un secret).
À appeler **après paiement Stripe réussi** — soit depuis un webhook Stripe (recommandé),
soit depuis le backend du site.
```json
{ "action": "confirm", "bookingId": "STB-2026-004", "stripeRef": "pi_3xxx", "secret": "<STUDIO_CONFIRM_SECRET>" }
```
Réponse `200` :
```json
{ "ok": true, "bookingId": "STB-2026-004", "clientId": "cli-058", "invoiceId": "FAC-2026-071" }
```
Effets côté CRM (idempotent — un 2ᵉ appel renvoie l'existant sans doublon) :
- réservation passée en `confirmed` ;
- **fiche client actif** créée (avec l'historique de la prestation) ;
- **facture payée** `FAC-…` générée (retrouvable dans l'écran Facturation, PDF à la demande) ;
- notification à l'équipe.
Erreurs : `403` (secret invalide), `404` (bookingId inconnu), `409` (non confirmable).

---

## Handshake Stripe — à décider ensemble
Deux options pour l'étape 5 ; **le webhook Stripe est recommandé** (fiable même si le
navigateur du client se ferme après paiement) :

- **A. Webhook Stripe** → le web master configure un webhook `checkout.session.completed`
  qui appelle `POST confirm` avec `bookingId` (récupéré dans `metadata`) + `stripeRef` +
  `secret`. *(Une vérification de signature Stripe pourra être ajoutée côté API si tu nous
  fournis le `STRIPE_WEBHOOK_SECRET`.)*
- **B. Backend du site** → après confirmation du paiement, ton serveur appelle `POST confirm`.

## Variable d'environnement à définir (Vercel du CRM)
- `STUDIO_CONFIRM_SECRET` : secret partagé entre le CRM et le mécanisme de confirmation
  (webhook ou backend). Sans lui, l'action `confirm` est refusée (`500`).

Une page de référence fonctionnelle est fournie : **`/studio.html`** (configurateur + panier +
appel `hold`). Elle est volontairement neutre : à re-designer côté site CPL Studios.
