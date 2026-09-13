# Calcolo dei voti e recupero dello storico

Il voto è `30 × (corrette × punti − errate × penalità) / (domande × punti)`.
Si arrotonda una sola volta, alla fine, all'intero più vicino: sotto 0,5
per difetto, da 0,5 per eccesso. Il voto rimane tra 0 e 30. Le omesse
valgono zero e restano nel totale delle domande. La regola è comune agli
esami standard e alla fase principale degli esami bifasici.

Per Testa-Collo, 39 corrette e 6 errate con +0,7/−0 danno 27,3 punti
su un massimo di 31,5, quindi **26/30**. Prima il denominatore era 45 e
il voto diventava erroneamente 18,2. I punti grezzi e il dettaglio delle
penalità mantengono i decimali; solo il voto finale è intero.

## Pubblicazione

La correzione dell'app non richiede nuove colonne nel database. Pubblicare
prima la nuova versione, poi eseguire l'aggiornamento dello storico, così
le nuove simulazioni usano già il calcolo corretto. Gli esami già aperti
in un browser con la vecchia versione possono ancora salvare il vecchio
calcolo: lo script può essere rieseguito in seguito.

## Risultati già salvati

Il repository non contiene il database degli utenti e questa PR non modifica
la produzione. Il file `supabase_exam_scores.sql` è un'operazione separata,
da eseguire come proprietario nel SQL Editor del progetto Supabase.

1. Verificare che le regole delle materie da recuperare non siano cambiate
   rispetto alle simulazioni interessate. Le vecchie righe NON contengono
   una copia delle regole originali: una coincidenza dei punti non è prova
   sufficiente in caso di modifiche simultanee a punti e penalità. Se le
   regole sono cambiate, limitare la query `rules` agli ID dei corsi verificati
   (aggiungendo `WHERE id IN (...)`) e analizzare gli altri separatamente.
2. Eseguire tutto lo script così com'è: l'ultimo `ROLLBACK` annulla ogni
   scrittura, compresa la tabella di backup. Leggere il resoconto per materia
   e le righe con voto precedente e nuovo voto.
3. Le righe con conteggi, punti o voti incompatibili sono escluse e riportate
   nel resoconto. Non vengono reinterpretate con regole inventate.
4. Dopo la verifica, sostituire solo l'ultimo `ROLLBACK` con `COMMIT` ed
   eseguire nuovamente tutto il file. L'aggiornamento e il backup sono atomici.
5. La tabella `exam_score_repair_backup`, inaccessibile ai normali client,
   conserva punti e voti prima/dopo e regole usate. Rieseguire lo script non
   applica di nuovo la correzione alle righe già recuperate.

Lo script usa i punti grezzi originali, non il vecchio voto già arrotondato:
questo evita un doppio arrotondamento vicino alla soglia di 0,5. Dashboard,
profilo e statistiche leggono `score_in_30` e mostreranno il voto aggiornato
alla successiva lettura dei dati.

## Ripristino dei soli valori modificati

Se necessario, come proprietario del database:

```sql
begin;
update public.exam_results e
set raw_score = b.old_raw_score, score_in_30 = b.old_score_in_30
from public.exam_score_repair_backup b
where e.id = b.exam_result_id
  and e.raw_score = b.new_raw_score
  and e.score_in_30 = b.new_score_in_30;
commit;
```

La condizione evita di sovrascrivere punteggi modificati dopo la riparazione.
Il backup resta disponibile per verifica; non cancellarlo automaticamente.

## Verifiche per sviluppatori

- `npm test`: include il caso Testa-Collo, pesi diversi, omesse, penalità,
  soglie di arrotondamento e formattazione dei decimali.
- `npm run build` con le variabili Supabase di test definite nella CI.
- `node tests/exam-score-repair.mjs`: verifica lo script su PostgreSQL in memoria
  con `@electric-sql/pglite` installato separatamente. È possibile impostare
  `PGLITE_MODULE` al percorso assoluto del suo `dist/index.js` per usare
  un'installazione temporanea senza modificare le dipendenze del progetto.
  Il test copre anteprima senza scritture, conversione, soglie, righe escluse,
  backup non leggibile dai client e riesecuzione idempotente.
