# Clown Club

Una PWA per spese di gruppo, saldi, appello e sfottò. I dati sono cifrati prima di essere salvati o inviati al foglio. I profili sono selezionabili dagli amici: non sono account individuali verificati. Chi ha accesso al circo può modificarne tutti i gruppi.

## Primo accesso

Usa la password iniziale fornita con la consegna, quindi cambiala in Impostazioni. Condividi la nuova password solo con gli amici del circo. “Ricordami” conserva sul dispositivo la chiave per aprire l’archivio. L’accesso resta attivo senza scadenza applicativa; cancellazione dati del browser, disinstallazione o uscita possono richiedere un nuovo accesso. Nessuna app web può garantire che il sistema conservi i dati per sempre.

## Notifiche del circo

Installa la PWA, aprila e vai in Impostazioni → Attiva notifiche. Consenti la richiesta del dispositivo. Su iPhone/iPad devi aprirla dalla schermata Home: Safari non installato non può ricevere questi avvisi. L’installazione da sola non attiva le notifiche. Le notifiche possono comparire anche con l’app chiusa; connessione, modalità Focus e impostazioni del sistema possono influire sulla consegna. Puoi disattivarle nelle impostazioni dell’app o del dispositivo.

La configurazione della sincronizzazione viene gestita da Doriano. Gli avvisi ricevuti possono essere letti sullo schermo bloccato del dispositivo secondo le impostazioni del telefono.

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
