import Link from 'next/link';
import { Icon } from '@/components/Icon';

export const metadata = { title: 'Informativa sulla Privacy — UniQuiz' };

export default function PrivacyPage() {
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
          <h1 className="text-2xl font-bold text-[rgb(32,44,71)] mb-1">Informativa sulla Privacy</h1>
          <p className="text-sm text-gray-400 mb-8">Ultimo aggiornamento: 27 agosto 2026</p>

          <div className="prose-legal space-y-7 text-[15px] leading-relaxed text-gray-700">

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <strong>Nota:</strong> questa informativa descrive fedelmente i dati che UniQuiz raccoglie e come vengono trattati. Le parti contrassegnate con <span className="font-mono text-xs bg-amber-100 px-1 rounded">[DA COMPLETARE]</span> richiedono i dati anagrafici/fiscali del titolare del trattamento prima della pubblicazione definitiva.
            </div>

            <section>
              <h2 className="text-lg font-bold text-[rgb(32,44,71)] mb-2">1. Titolare del trattamento</h2>
              <p>
                Il titolare del trattamento dei dati raccolti tramite UniQuiz è{' '}
                <span className="font-mono text-sm bg-gray-100 px-1.5 py-0.5 rounded">[DA COMPLETARE: nome/ragione sociale, indirizzo, eventuale P.IVA]</span>.
                Per qualsiasi richiesta relativa ai tuoi dati personali puoi scrivere a{' '}
                <a href="mailto:info@uniquiz.pro" className="text-[color:var(--sig)] font-medium hover:underline">info@uniquiz.pro</a>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[rgb(32,44,71)] mb-2">2. Quali dati raccogliamo</h2>
              <p>Per fornire il servizio raccogliamo:</p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li><strong>Dati di registrazione:</strong> indirizzo email istituzionale, nome e cognome, anno di corso (facoltativo).</li>
                <li><strong>Credenziali di accesso:</strong> la password non è mai visibile a noi in chiaro: viene gestita in forma cifrata dal nostro fornitore di autenticazione (Supabase).</li>
                <li><strong>Dati di utilizzo del servizio:</strong> risposte date agli esercizi e alle simulazioni d&apos;esame, punteggi, domande viste/sbagliate, segnalazioni inviate su singole domande.</li>
                <li><strong>Dati tecnici del dispositivo:</strong> un identificativo del dispositivo e, quando accedi da un dispositivo mai visto, l&apos;indirizzo IP — usati esclusivamente per la regola &ldquo;un account, un dispositivo alla volta&rdquo; e per avvisare l&apos;amministratore in caso di accessi sospetti (possibile condivisione di credenziali).</li>
                <li><strong>Comunicazioni:</strong> il contenuto di eventuali email o segnalazioni che ci invii volontariamente.</li>
              </ul>
              <p className="mt-2">Non raccogliamo dati per finalità di marketing, profilazione pubblicitaria o rivendita a terzi.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[rgb(32,44,71)] mb-2">3. Perché li raccogliamo (finalità e base giuridica)</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Erogazione del servizio</strong> (creazione dell&apos;account, esercizi, simulazioni d&apos;esame, statistiche personali) — necessario per eseguire il contratto con te (art. 6.1.b GDPR).</li>
                <li><strong>Sicurezza dell&apos;account</strong> (regola del dispositivo singolo, verifica email, attivazione manuale dell&apos;account) — legittimo interesse a prevenire condivisioni non autorizzate delle credenziali (art. 6.1.f GDPR).</li>
                <li><strong>Comunicazioni di servizio</strong> (conferma email, reimpostazione password, notifiche di sicurezza) — necessario per l&apos;erogazione del servizio.</li>
                <li><strong>Eventuale fatturazione</strong>, quando e se il servizio prevederà un abbonamento a pagamento — necessario per l&apos;esecuzione del contratto e per obblighi di legge in materia fiscale.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[rgb(32,44,71)] mb-2">4. Con chi condividiamo i dati</h2>
              <p>Ci appoggiamo ad alcuni fornitori tecnici che trattano i dati per nostro conto, in qualità di responsabili del trattamento, esclusivamente per erogare il servizio:</p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li><strong>Supabase</strong> — database e autenticazione degli account.</li>
                <li><strong>Resend</strong> — invio delle email transazionali (conferma registrazione, reimpostazione password, avvisi di sicurezza).</li>
                <li><strong>Vercel</strong> — hosting dell&apos;applicazione web.</li>
              </ul>
              <p className="mt-2">Non vendiamo né condividiamo i tuoi dati con terzi per finalità commerciali o pubblicitarie.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[rgb(32,44,71)] mb-2">5. Cookie e tecnologie simili</h2>
              <p>
                UniQuiz non utilizza cookie di profilazione o di marketing di terze parti. Utilizziamo esclusivamente la memoria locale del browser (<em>localStorage</em>), tecnicamente necessaria per: mantenere la sessione di accesso, far rispettare la regola del dispositivo singolo, e salvare in locale le risposte di un esame in corso in modo da poterle recuperare in caso di ricarica accidentale della pagina. Questi dati restano sul tuo dispositivo e non vengono condivisi con terzi.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[rgb(32,44,71)] mb-2">6. Per quanto tempo conserviamo i dati</h2>
              <p>
                I dati del tuo account vengono conservati finché l&apos;account resta attivo. Se richiedi la cancellazione del tuo account, i tuoi dati personali e le tue statistiche vengono eliminati in modo definitivo dai nostri sistemi, salvo quanto debba essere conservato per un periodo più lungo in adempimento a obblighi di legge (ad esempio fiscali, una volta attivo un servizio a pagamento).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[rgb(32,44,71)] mb-2">7. I tuoi diritti</h2>
              <p>In qualità di interessato, in ogni momento puoi richiedere:</p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>l&apos;accesso ai dati che trattiamo su di te;</li>
                <li>la rettifica di dati inesatti o incompleti;</li>
                <li>la cancellazione definitiva del tuo account e dei dati associati;</li>
                <li>la limitazione o l&apos;opposizione al trattamento;</li>
                <li>la portabilità dei tuoi dati in un formato strutturato.</li>
              </ul>
              <p className="mt-2">
                Per esercitare uno di questi diritti scrivi a{' '}
                <a href="mailto:info@uniquiz.pro" className="text-[color:var(--sig)] font-medium hover:underline">info@uniquiz.pro</a>.
                Hai inoltre il diritto di proporre reclamo al Garante per la Protezione dei Dati Personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noreferrer" className="text-[color:var(--sig)] hover:underline">www.garanteprivacy.it</a>).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[rgb(32,44,71)] mb-2">8. Sicurezza dei dati</h2>
              <p>
                Adottiamo misure tecniche e organizzative adeguate a proteggere i tuoi dati, tra cui: cifratura delle password, regole di accesso ai dati a livello di database (ogni utente può leggere solo i propri dati), controllo del dispositivo di accesso, e limitazione dei permessi amministrativi secondo il principio del minimo privilegio necessario.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[rgb(32,44,71)] mb-2">9. Minori</h2>
              <p>UniQuiz è pensato per studenti universitari maggiorenni. Non raccogliamo consapevolmente dati di persone minori di 18 anni.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[rgb(32,44,71)] mb-2">10. Modifiche a questa informativa</h2>
              <p>
                Possiamo aggiornare periodicamente questa informativa, ad esempio in seguito a nuove funzionalità del servizio. La data di ultimo aggiornamento è sempre indicata in cima alla pagina. In caso di modifiche sostanziali, te ne daremo comunicazione tramite l&apos;app o via email.
              </p>
            </section>

          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Vedi anche i <Link href="/termini" className="text-[color:var(--sig)] hover:underline">Termini di Servizio</Link>.
        </p>
      </div>
    </div>
  );
}
