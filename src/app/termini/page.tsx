import Link from 'next/link';
import { Icon } from '@/components/Icon';

export const metadata = { title: 'Termini di Servizio — UniQuiz' };

export default function TerminiPage() {
  return (
    <div className="min-h-screen bg-[rgb(240,242,247)]">
      <div className="nav-grad">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center gap-3">
          <Link href="/login" className="flex items-center gap-2 text-white/90 hover:text-white transition-colors">
            <Icon name="pulse" className="w-5 h-5 text-[#8FE3DE]" strokeWidth={2} />
            <span className="font-bold">UniQuiz</span>
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-3xl shadow-sm p-8 sm:p-10">
          <h1 className="text-2xl font-bold text-[rgb(32,44,71)] mb-1">Termini di Servizio</h1>
          <p className="text-sm text-gray-400 mb-8">Ultimo aggiornamento: 27 agosto 2026</p>

          <div className="space-y-7 text-[15px] leading-relaxed text-gray-700">

            <section>
              <h2 className="text-lg font-bold text-[rgb(32,44,71)] mb-2">1. Cos&apos;è UniQuiz</h2>
              <p>
                UniQuiz è una piattaforma online di quiz ed esercizi pensata come supporto allo studio per studenti universitari di area medica. Utilizzando UniQuiz accetti i presenti Termini di Servizio; se non li accetti, ti chiediamo di non utilizzare il servizio.
              </p>
              <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                <strong>UniQuiz è uno strumento di supporto allo studio indipendente.</strong> Non è affiliato con, gestito da, né garantito da alcun ateneo o facoltà. I contenuti sono forniti a scopo di esercitazione e non sostituiscono il materiale didattico ufficiale del tuo corso di laurea.
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[rgb(32,44,71)] mb-2">2. Registrazione e accesso</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>La registrazione richiede un indirizzo email istituzionale valido.</li>
                <li>Dopo la registrazione, il tuo indirizzo email deve essere confermato e il tuo account deve essere attivato da un amministratore prima che tu possa accedere.</li>
                <li>Sei responsabile della riservatezza delle tue credenziali di accesso. Ogni account è personale e non condivisibile con altre persone.</li>
                <li>Per motivi di sicurezza, ogni account può essere connesso da un solo dispositivo alla volta: l&apos;accesso da un nuovo dispositivo disconnette automaticamente quello precedente.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[rgb(32,44,71)] mb-2">3. Contenuti ed esattezza</h2>
              <p>
                Ci impegniamo a mantenere i contenuti il più possibile corretti e aggiornati, ma non possiamo garantirne l&apos;esattezza assoluta: domande, risposte e spiegazioni potrebbero occasionalmente contenere imprecisioni. Se noti un errore, puoi segnalarlo direttamente dall&apos;app tramite l&apos;apposita funzione di segnalazione: ogni segnalazione viene esaminata dal nostro team. UniQuiz non si assume responsabilità per decisioni prese esclusivamente sulla base dei contenuti della piattaforma senza verifica sul materiale didattico ufficiale.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[rgb(32,44,71)] mb-2">4. Uso consentito</h2>
              <p>Utilizzando UniQuiz ti impegni a non:</p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>condividere le tue credenziali di accesso con altre persone;</li>
                <li>copiare, estrarre in massa, redistribuire o rivendere i contenuti della piattaforma al di fuori di essa;</li>
                <li>tentare di aggirare le misure di sicurezza del servizio (es. limiti di accesso, controlli anti-condivisione);</li>
                <li>utilizzare il servizio per scopi diversi da quello per cui è stato progettato (supporto allo studio individuale).</li>
              </ul>
              <p className="mt-2">Ci riserviamo il diritto di sospendere o disattivare account che violano queste condizioni.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[rgb(32,44,71)] mb-2">5. Abbonamento e pagamenti</h2>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <strong>[DA COMPLETARE]</strong> — Al momento l&apos;accesso a UniQuiz non richiede alcun pagamento. Se in futuro verrà introdotto un abbonamento a pagamento, questa sezione verrà aggiornata con: prezzo, durata, modalità di rinnovo, diritto di recesso e politica di rimborso, prima che qualunque pagamento venga richiesto agli utenti.
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[rgb(32,44,71)] mb-2">6. Modifiche al servizio</h2>
              <p>
                Possiamo aggiungere, modificare o rimuovere funzionalità del servizio nel tempo, così come sospendere temporaneamente l&apos;accesso per manutenzione. Ci impegniamo a limitare al minimo i disagi per gli utenti.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[rgb(32,44,71)] mb-2">7. Limitazione di responsabilità</h2>
              <p>
                Nei limiti consentiti dalla legge, UniQuiz viene fornito &ldquo;così com&apos;è&rdquo;. Non garantiamo che il servizio sarà sempre privo di interruzioni o errori. La nostra responsabilità, ove applicabile, è limitata a quanto previsto dalla normativa vigente.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[rgb(32,44,71)] mb-2">8. Trattamento dei dati personali</h2>
              <p>
                Il trattamento dei tuoi dati personali è disciplinato dalla nostra{' '}
                <Link href="/privacy" className="text-[color:var(--sig)] font-medium hover:underline">Informativa sulla Privacy</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[rgb(32,44,71)] mb-2">9. Modifiche ai presenti Termini</h2>
              <p>
                Possiamo aggiornare questi Termini di Servizio nel tempo. La data di ultimo aggiornamento è indicata in cima alla pagina. L&apos;uso continuato del servizio dopo una modifica sostanziale costituisce accettazione dei nuovi termini.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[rgb(32,44,71)] mb-2">10. Legge applicabile e contatti</h2>
              <p>
                I presenti Termini sono regolati dalla legge italiana. Per qualsiasi domanda su questi Termini, scrivi a{' '}
                <a href="mailto:info@uniquiz.pro" className="text-[color:var(--sig)] font-medium hover:underline">info@uniquiz.pro</a>.
              </p>
            </section>

          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Vedi anche l&apos;<Link href="/privacy" className="text-[color:var(--sig)] hover:underline">Informativa sulla Privacy</Link>.
        </p>
      </div>
    </div>
  );
}
