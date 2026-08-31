const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

/* ---------------- AUTH ---------------- */

export async function registerUser(
  name: string,
  email: string,
  password: string,
  role: string
) {
  const response = await fetch(
    `${API_BASE_URL}/auth/register`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
        role,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Registration failed"
    );
  }

  return data;
}

export async function loginUser(
  email: string,
  password: string
) {
  const response = await fetch(
    `${API_BASE_URL}/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Login failed"
    );
  }

  return data;
}

/* ---------------- AUTH HEADERS ---------------- */

function authHeaders() {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  return {
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

/* ---------------- PROFILE ---------------- */

export async function getMe() {
  const response = await fetch(
    `${API_BASE_URL}/auth/me`,
    {
      headers: authHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Failed to fetch profile"
    );
  }

  return data;
}

export async function updateProfile(
  name: string
) {
  const response = await fetch(
    `${API_BASE_URL}/auth/me`,
    {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ name }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Failed to update profile"
    );
  }

  return data;
}

/* ---------------- SOCIAL ACCOUNTS ---------------- */

export async function getSocialAccounts() {
  const response = await fetch(
    `${API_BASE_URL}/social-accounts`,
    {
      headers: authHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Failed to fetch social accounts"
    );
  }

  return data;
}

export async function connectSocialAccount(
  platform: string,
  accountName: string
) {
  const response = await fetch(
    `${API_BASE_URL}/social-accounts`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        platform,
        account_name: accountName,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Failed to connect account"
    );
  }

  return data;
}

/* ---------------- PASSWORD ---------------- */

export async function forgotPassword(
  email: string
) {
  const response = await fetch(
    `${API_BASE_URL}/auth/forgot-password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Request failed"
    );
  }

  return data;
}

export async function resetPassword(
  token: string,
  newPassword: string
) {
  const response = await fetch(
    `${API_BASE_URL}/auth/reset-password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        new_password: newPassword,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Reset failed"
    );
  }

  return data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
) {
  const response = await fetch(
    `${API_BASE_URL}/auth/change-password`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Failed to change password"
    );
  }

  return data;
}