# Clown Club

Una PWA per spese di gruppo, saldi, appello e sfottò. I dati sono cifrati prima di essere salvati o inviati al foglio. I profili sono selezionabili dagli amici: non sono account individuali verificati. Chi ha accesso al circo può modificarne tutti i gruppi.

## Primo accesso

Usa la password iniziale fornita con la consegna, quindi cambiala in Impostazioni. Condividi la nuova password solo con gli amici del circo. “Ricordami” conserva sul dispositivo la chiave per aprire l’archivio. L’accesso resta attivo senza scadenza applicativa; cancellazione dati del browser, disinstallazione o uscita possono richiedere un nuovo accesso. Nessuna app web può garantire che il sistema conservi i dati per sempre.

## Google Sheets

1. Crea un foglio Google privato, poi apri Estensioni → Apps Script.
2. Incolla il file `Google-Sheets.gs` scaricabile dall’app. Sostituisci il token nella funzione `setup` con almeno 24 caratteri casuali. Il token deve essere diverso dalla password del circo.
3. Esegui `setup` e autorizza lo script sul tuo account. Il foglio ospiterà una scheda `ClownVault`.
4. In Apps Script scegli Distribuisci → Nuova distribuzione → Web app. Esegui come te e consenti accesso a Chiunque. Il servizio rifiuta richieste senza il token corretto; il contenuto del foglio resta cifrato. Non pubblicare o condividere il foglio come documento pubblico.
5. Copia l’URL che finisce con `/exec` e inseriscilo con il token in Impostazioni dell’app. Premi Collega. La prima copia inizializza il foglio; se contiene già dati viene proposta la versione remota.
6. Sugli altri dispositivi apri la stessa app, inserisci URL e token e carica il circo dal foglio usando la stessa password. Per condividere l’app con amici, il suo hosting deve consentire loro l’accesso: la prima pubblicazione Sites è privata per il proprietario.
7. Le modifiche vengono salvate prima sul dispositivo e poi sincronizzate quando il foglio è collegato. All’apertura della PWA premi Sincronizza per ricevere le modifiche degli amici; le scritture confrontano sempre la revisione condivisa. Se due dispositivi hanno modifiche diverse, l’app ferma il caricamento e propone backup locale e caricamento remoto. Non unisce automaticamente modifiche concorrenti. Prima di cambiare dispositivo sincronizza; evita modifiche simultanee finché non hai ricaricato.

Il foglio ospita un archivio cifrato diviso in blocchi, non una tabella di spese leggibili. È una scelta per proteggere dati e password. Non modificare manualmente i blocchi. Un account Google Workspace può vietare web app aperte a Chiunque: in quel caso questa integrazione richiede un account/policy che lo consenta. Il collegamento reale non è testabile prima della distribuzione del tuo script.

## Presenze, assenze e tema

Dalla Panoramica o da Appello premi **Segna assenza**, scegli persona e data e salva. Non serve creare prima un’uscita. Più assenze nello stesso giorno vengono raggruppate nello stesso appello giornaliero; registrare di nuovo la stessa persona aggiorna la nota. Per un’uscita organizzata usa **Organizza un’uscita**: nella sua scheda ogni persona ha pulsanti Presente, Assente e In ritardo. Tocca di nuovo lo stato selezionato per azzerarlo. Le note si modificano da **Aggiungi alibi o nota**.

Il pulsante luna/sole in alto cambia tema subito. In **Impostazioni → Aspetto** puoi scegliere Chiara, Scura o Automatica. La preferenza resta su questo dispositivo e in automatico segue il tema di sistema.

## Installa e usa offline

- iPhone: apri in Safari, Condividi → Aggiungi alla schermata Home → Apri come app web.
- Android: apri in Chrome, menu → Installa app / Aggiungi a schermata Home.
- Dopo il primo caricamento i file dell’app vengono memorizzati offline. I dati nuovi restano sul dispositivo finché torni online e sincronizzi.
- Un hosting con protezione aggiuntiva del provider può richiedere anche il suo accesso: la sessione del provider non è controllata da Clown Club.

## Dati importati

Il gruppo Le Vetrine contiene 528 spese e 4 rimborsi del CSV del 18 ottobre 2026. La riga Bilancio totale è esclusa dai movimenti. Saldi netti in centesimi conservati esattamente. La presenza storica è dedotta dagli importi diversi da zero una volta per giorno. Non si deducono assenze: vanno registrate nell’Appello. Le spese importate consentono modifica delle note ed eliminazione; la divisione originale non si può ricostruire con certezza dalle sole colonne nette. Eventuali scarti di arrotondamento vengono mantenuti.

Le nuove spese sono in EUR, in parti uguali o con quote personalizzate. I centesimi residui vengono assegnati ai primi partecipanti selezionati. I rimborsi sono registrazioni contabili, non trasferimenti bancari.

## Backup e sicurezza

Scarica regolarmente il backup `.clown`. È cifrato con la password valida al momento della creazione: conserva anche quella password. Non esiste reset o recupero della password. Prima di caricare una versione remota o ripristinare un backup, esporta la copia locale. Il ripristino sostituisce tutti i gruppi locali.

AES-256-GCM con IV casuale per ogni salvataggio e derivazione PBKDF2-SHA256 con 310.000 iterazioni e salt casuale. La password non viene inviata a Google. La chiave ricordata permette di leggere i dati sul dispositivo: proteggi il telefono e non usare Ricordami su dispositivi condivisi. Il token Apps Script è conservato sul dispositivo e accompagna le richieste HTTPS. Cambia il token nello script se lo condividi per errore.

Le classifiche e i messaggi sono scherzi tra amici. Reazioni una per profilo e categoria: i profili sono di fiducia, non anti-manomissione. I verbali sono visibili a tutti quelli con accesso al circo.

## Area Doriano e notifiche

Apri Impostazioni con il profilo Doriano sul tuo account ChatGPT autorizzato, poi Sblocca area Doriano. Inserisci la password amministratore che hai scelto. La sessione amministratore dura fino a 24 ore o al blocco esplicito. Le verifiche sono sul server: cambiare soltanto nome profilo non concede accesso. Script, guida di configurazione e token del foglio sono protetti e non memorizzati dal service worker.

In questa area puoi configurare Google Sheets per tutti. Il token del foglio rimane sul server; gli amici non devono inserirlo. I dati di spesa restano sul dispositivo e nel foglio cifrato. Un database tecnico del sito conserva solamente impostazioni amministrative, sessioni e iscrizioni push. Per usare la sincronizzazione e le notifiche, gli amici devono avere accesso al sito tramite le sue autorizzazioni: questa pubblicazione mantiene l’accesso privato esistente.

Gli amici attivano le notifiche su ogni dispositivo. Il pannello mostra i dispositivi iscritti. Scrivi titolo e messaggio, premi Invia a tutti e conferma l’anteprima. Il risultato indica quanti servizi push hanno accettato il messaggio, non garantisce che sia già stato letto o consegnato. Le iscrizioni scadute vengono rimosse. Nessuna notifica viene inviata automaticamente alla pubblicazione dell’app.

La password dell’area amministratore è separata dalla password dell’archivio spese. Non modificare manualmente il foglio ClownVault.
