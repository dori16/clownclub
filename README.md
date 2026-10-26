# Clown Club

PWA per dividere le spese tra amici: gruppi, saldi, rimborsi, presenze, assenze, alibi e bacheca degli sfottò. Interfaccia glass con temi chiaro, scuro e automatico.

Si entra con **una sola password del circo**, che apre sia il sito sia l'archivio cifrato. L'area Doriano (Google Sheets e notifiche) ha una password separata.

## Pubblicazione su Vercel

1. **Importa il repo** su [vercel.com/new](https://vercel.com/new). Preset: *Other*. Build, output e funzioni sono già in `vercel.json`.
2. **Aggiungi Redis**: nel progetto vai su *Storage → Create Database → Upstash (Redis)* e collegalo al progetto. Vercel aggiunge da solo `KV_REST_API_URL` e `KV_REST_API_TOKEN`.
3. **Variabili d'ambiente** (*Settings → Environment Variables*):

   | Variabile | Uso |
   |---|---|
   | `CLUB_PASSWORD` | Password del circo, per tutti gli amici |
   | `ADMIN_PASSWORD` | Password dell'area Doriano |
   | `SESSION_SECRET` | Firma dei cookie di accesso (`npm run secret:generate`) |
   | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_JWK` | Chiavi notifiche push (`npm run vapid:generate`) |
   | `VAPID_SUBJECT` | `mailto:` tuo o URL del sito |
   | `SHEETS_URL`, `SHEETS_TOKEN` | Facoltative: foglio Google fisso, al posto del pannello admin |

4. **Redeploy** dopo aver impostato le variabili.

Cambiare `CLUB_PASSWORD` o `SESSION_SECRET` fa uscire tutti i dispositivi dal sito (l'archivio resta). Se cambi la password del circo dentro l'app, aggiorna anche `CLUB_PASSWORD`, altrimenti nessuno riesce più a entrare. Non rigenerare le chiavi VAPID se ci sono dispositivi iscritti alle notifiche.

## Google Sheets

Il foglio è il database condiviso delle spese, salvato cifrato.

1. Crea un foglio Google privato → *Estensioni → Apps Script*.
2. Incolla `admin-assets/Google-Sheets.gs` (scaricabile anche dall'area Doriano). Nella funzione `setup` metti un token casuale di almeno 24 caratteri.
3. Esegui `setup` e autorizza: crea la scheda `ClownVault`.
4. *Distribuisci → Nuova distribuzione → App web*: esegui come **te**, accesso **Chiunque**.
5. Copia l'URL che finisce con `/exec` e inseriscilo con il token in *Impostazioni → Area Doriano*, oppure mettilo in `SHEETS_URL` / `SHEETS_TOKEN` su Vercel.

Gli amici non devono configurare niente: al primo accesso l'app carica il circo dal foglio.

## Avvio locale

Richiede **Node.js 24**. Non ci sono dipendenze npm.

```bash
cp .env.example .env
npm run secret:generate
npm run vapid:generate
```

Copia i valori generati in `.env` e scegli `CLUB_PASSWORD` e `ADMIN_PASSWORD`. Poi:

```bash
npm test
npm run build
npm run dev
```

Apri `http://127.0.0.1:4173`. Senza variabili Upstash in `.env`, il server locale usa una memoria che si azzera al riavvio. Dopo una modifica ai sorgenti ripeti la build e riavvia.

### Archivio iniziale (facoltativo)

Al primo accesso l'app usa, in ordine: il foglio Google se collegato, `public/seed.clown` se presente, altrimenti crea un circo vuoto cifrato con la password del circo. Per partire da un backup `.clown` copialo in `public/seed.clown`: la sua password deve essere uguale a `CLUB_PASSWORD`. I file `.clown` non vanno pubblicati su GitHub (sono in `.gitignore`).

## Notifiche e PWA

Ogni amico installa la PWA e preme **Attiva notifiche**. Su iPhone va fatto dall'app aperta dalla schermata Home. L'area Doriano mostra i dispositivi iscritti e invia titolo e messaggio a tutti; le iscrizioni scadute vengono rimosse.

Il service worker conserva i file dell'app per l'uso offline ed esclude le API.

## Struttura

```text
public/          Interfaccia, manifest e service worker (serviti come file statici)
api/handler.js   Funzione Vercel: riceve /api/* e la passa al server
worker/          API: login, area admin, sincronizzazione col foglio, Web Push, Redis
admin-assets/    Script e guida serviti solo dopo la password admin
scripts/         Build, sviluppo locale, generazione chiavi
tests.mjs        Contabilità, import CSV, assenze e cifratura
server-tests.mjs Login, sessioni, area admin, notifiche e protocollo Web Push
```
