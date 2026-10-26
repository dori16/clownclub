# Clown Club

PWA per dividere le spese tra amici: gruppi, saldi, rimborsi, presenze, assenze, alibi e bacheca degli sfottò. Interfaccia glass con temi chiaro, scuro e automatico.

## Avvio locale

Richiede **Node.js 24 o successivo**. Non ci sono dipendenze npm da installare.

```bash
cp .env.example .env
npm run vapid:generate
```

Modifica `.env`: scegli una password amministratore, inserisci la tua email e copia le due chiavi VAPID generate. Imposta anche `INITIAL_VAULT_PASSWORD` per il tuo archivio spese (almeno 12 caratteri). Non usare nuove chiavi VAPID al posto di quelle di un'app già in produzione con dispositivi iscritti.

```bash
npm run vault:init
npm test
npm run build
npm run dev
```

Apri `http://127.0.0.1:4173`. Il server locale conserva il database tecnico in `data/dev.sqlite` e simula l'identità Doriano **solo sul server di sviluppo**, vincolato a `127.0.0.1`. Per cambiare porta usa `PORT` nel file `.env`. Dopo una modifica ai sorgenti, ripeti la build e riavvia il server.

`npm run vault:init` crea `public/seed.clown` con un gruppo vuoto e nessuna spesa personale. Per riusare i tuoi dati puoi invece copiare un backup `.clown` esportato dall'app in `public/seed.clown`, mantenendo la sua password. Il comando di inizializzazione rifiuta di sovrascrivere un archivio già presente. File `.clown`, CSV originali e credenziali non devono essere pubblicati nel repository.

## Configurazione server

| Variabile | Uso | Segreta |
|---|---|---|
| `ADMIN_EMAIL` | Account autorizzato per l'area Doriano | Sì |
| `ADMIN_PASSWORD` | Password dell'area amministratore, separata da quella delle spese | Sì |
| `VAPID_PUBLIC_KEY` | Chiave pubblica Web Push, base64url | No |
| `VAPID_PRIVATE_JWK` | Chiave privata Web Push P-256 in formato JSON JWK | Sì |
| `VAPID_SUBJECT` | URL HTTPS o contatto `mailto:` del servizio push | No |

In produzione questi valori devono essere configurati nel runtime del server. `.env` viene letto dal comando di sviluppo; la build non incorpora le credenziali. Il database è collegato al Worker tramite il binding **`DB`**.

## Pubblicazione

L'app è progettata per **Cloudflare Workers con D1**, nel flusso di pubblicazione Sites. `.openai/hosting.json` identifica il sito esistente e dichiara il binding. La build incorpora file pubblici e file amministrativi nel Worker, mantenendoli su percorsi diversi.

```bash
npm run build
```

L'output è `dist/server/index.js`. Le migrazioni SQL si trovano in `drizzle/`; vanno applicate prima del nuovo Worker. Le tabelle contengono configurazione tecnica, sessioni amministratore e sottoscrizioni push. Il database delle spese condivise resta nel Google Sheet cifrato e sui dispositivi.

Il semplice caricamento di `public/` su un hosting statico **non è sufficiente**: area amministratore e push richiedono il backend. Su un hosting diverso da Sites bisogna fornire un'autenticazione attendibile equivalente. Il Worker riceve da Sites `oai-authenticated-user-id` e `oai-authenticated-user-email`; su un server pubblico non bisogna fidarsi di questi header se inviati direttamente dai client.

## Google Sheets e amministrazione

Accedi con l'account autorizzato, scegli il profilo Doriano e apri **Impostazioni → Area Doriano**. Dopo la password amministratore puoi scaricare script e guida, collegare il foglio e inviare notifiche. URL e token Google restano sul server; gli altri membri non devono configurarli.

La password amministratore, la password dell'archivio e il token Apps Script hanno scopi distinti. Nessuno dei loro valori di produzione è contenuto in questo repository.

## Notifiche e PWA

Ogni amico deve avere accesso al sito, installare la PWA e premere **Attiva notifiche**. Su iPhone l'attivazione va fatta dall'app aperta dalla schermata Home. L'installazione da sola non concede il permesso.

L'area Doriano mostra i dispositivi iscritti e permette l'invio di titolo e messaggio a tutti. Il risultato riporta le richieste accettate dai servizi push, non garantisce lettura o consegna immediata. Le iscrizioni scadute vengono rimosse. Non partono notifiche automaticamente alla pubblicazione.

Il service worker conserva i file dell'app per l'uso offline ed esclude tutte le API e i download amministrativi dalla cache. L'accesso ricordato alle spese dipende dalla conservazione dei dati del browser; la sessione amministratore è separata.

## Struttura

```text
public/          Interfaccia, manifest, service worker e archivio cifrato
worker/          API amministrative, sincronizzazione e Web Push
admin-assets/    Script e guida serviti solo dopo autenticazione amministratore
drizzle/         Migrazioni del database tecnico
scripts/         Build, sviluppo locale e generazione chiavi VAPID
tests.mjs        Contabilità, import CSV, assenze e cifratura
server-tests.mjs Autorizzazioni, sessioni e protocollo Web Push
```

I test push usano un trasporto simulato: non inviano messaggi a dispositivi reali. Token, chiavi private, database locali e file `.env` sono esclusi da Git.
