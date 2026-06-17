// ─── User store persisted to localStorage ────────────────────────────────────
// Seeded with two built-in accounts; admins can add more at runtime.

export interface AppUser {
  username: string;
  password: string;       // plain text (demo app, no server)
  displayName: string;
  isAdmin: boolean;
  createdAt: string;
}

const STORE_KEY = 'medquiz_users_v1';

const SEED_USERS: AppUser[] = [
  {
    username: 'edoardo',
    password: 'medicina2025',
    displayName: 'Edoardo',
    isAdmin: true,
    createdAt: new Date().toISOString(),
  },
];

function loadUsers(): AppUser[] {
  if (typeof window === 'undefined') return SEED_USERS;
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) {
    // first boot — persist seed
    localStorage.setItem(STORE_KEY, JSON.stringify(SEED_USERS));
    return SEED_USERS;
  }
  const stored: AppUser[] = JSON.parse(raw);
  // make sure seed admin always exists
  const hasAdmin = stored.some(u => u.username === 'edoardo');
  if (!hasAdmin) {
    stored.unshift(SEED_USERS[0]);
    localStorage.setItem(STORE_KEY, JSON.stringify(stored));
  }
  return stored;
}

function saveUsers(users: AppUser[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(users));
}

export function authenticate(username: string, password: string): AppUser | null {
  const users = loadUsers();
  return users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password) ?? null;
}

export function getAllUsers(): AppUser[] {
  return loadUsers();
}

export function addUser(user: Omit<AppUser, 'createdAt'>): { ok: boolean; error?: string } {
  const users = loadUsers();
  if (users.some(u => u.username.toLowerCase() === user.username.toLowerCase())) {
    return { ok: false, error: 'Username già in uso.' };
  }
  users.push({ ...user, createdAt: new Date().toISOString() });
  saveUsers(users);
  return { ok: true };
}

export function deleteUser(username: string): { ok: boolean; error?: string } {
  if (username === 'edoardo') return { ok: false, error: 'Non puoi eliminare l\'account admin principale.' };
  const users = loadUsers().filter(u => u.username !== username);
  saveUsers(users);
  return { ok: true };
}

export function updateUser(username: string, patch: Partial<Pick<AppUser, 'password' | 'displayName' | 'isAdmin'>>): boolean {
  const users = loadUsers();
  const idx = users.findIndex(u => u.username === username);
  if (idx === -1) return false;
  users[idx] = { ...users[idx], ...patch };
  saveUsers(users);
  return true;
}
