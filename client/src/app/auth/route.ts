// src/app/api/auth/route.ts
interface Credentials {
  username: string;
  password: string;
}

export async function login(credentials: Credentials) {    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return response.json();
  }