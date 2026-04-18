import { redirect } from 'next/navigation';

export default function Home() {
  // Root of the app redirects to the main website
  // In production, this could be the LocalMint admin or marketing site
  redirect('/join/marios');
}
