export interface User {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'teacher' | 'parent';
  phone?: string;
}

export function getStoredUser(): User | null {
  try {
    const data = localStorage.getItem('user');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem('token');
}

export function storeAuth(token: string, user: User) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function isLoggedIn(): boolean {
  return !!getStoredToken();
}
