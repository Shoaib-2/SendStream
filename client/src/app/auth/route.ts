// src/app/api/auth/route.ts
interface Credentials {
  username: string;
  password: string;
}

export async function login(credentials: Credentials) {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return response.json();
  }