import { redirect } from 'next/navigation';

// La root reindirizza al login. La pagina di accesso, a sua volta, porta
// automaticamente in dashboard gli utenti già autenticati.
export default function Home() {
  redirect('/login');
}
