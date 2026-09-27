const API_BASE_URL = "http://127.0.0.1:8000";

/* ============================================================
   TYPES
============================================================ */

export type UserProfile = {
  user_id: number;
  name: string;
  email: string;
  role: string;
};

export type SimpleMessageResponse = {
  message: string;
};

export type AuthResponse = {
  access_token?: string;
  token?: string;
  token_type?: string;
  user?: UserProfile;
  message?: string;
  [key: string]: unknown;
};

export type PostResponse = {
  post_id?: number;
  id?: number;
  message?: string;
  content?: string;
  status?: string;
  [key: string]: unknown;
};

/* ============================================================
   REGISTER
============================================================ */

export async function registerUser(
  name: string,
  email: string,
  password: string,
  role: string
): Promise<AuthResponse> {
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

/* ============================================================
   LOGIN
============================================================ */

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
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

/* ============================================================
   AUTH HEADERS
============================================================ */

function authHeaders(): HeadersInit {
  if (typeof window === "undefined") {
    return {
      "Content-Type": "application/json",
    };
  }

  const token =
    localStorage.getItem("access_token");

  if (!token) {
    throw new Error(
      "You are not logged in."
    );
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/* ============================================================
   GET CURRENT USER
============================================================ */

export async function getMe(): Promise<UserProfile> {
  const response = await fetch(
    `${API_BASE_URL}/auth/me`,
    {
      headers: authHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Failed to fetch profile"
    );
  }

  return data;
}

/* ============================================================
   SOCIAL ACCOUNTS
============================================================ */

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

/* ============================================================
   MANUAL SOCIAL ACCOUNT CONNECTION
============================================================ */

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

/* ============================================================
   LINKEDIN OAUTH
============================================================ */

export async function getLinkedInAuthorizeUrl(): Promise<string> {
  const response = await fetch(
    `${API_BASE_URL}/oauth/linkedin/authorize-url`,
    {
      headers: authHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Failed to start LinkedIn connection"
    );
  }

  if (!data.url) {
    throw new Error(
      "LinkedIn authorization URL was not returned."
    );
  }

  return data.url;
}

/* ============================================================
   CREATE POST
============================================================ */

export type CreatePostPayload = {
  content: string;
  platforms: string[];
  content_type: string;
  status: "draft" | "scheduled";
  scheduled_at: string | null;
};

export async function createPost(
  postData: CreatePostPayload
): Promise<PostResponse> {
  const response = await fetch(
    `${API_BASE_URL}/posts`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(postData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Failed to create post"
    );
  }

  return data;
}

/* ============================================================
   GET ALL POSTS
============================================================ */

export async function getPosts() {
  const response = await fetch(
    `${API_BASE_URL}/posts`,
    {
      headers: authHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Failed to fetch posts"
    );
  }

  return data;
}

/* ============================================================
   GET SINGLE POST
============================================================ */

export async function getPost(
  postId: number
) {
  const response = await fetch(
    `${API_BASE_URL}/posts/${postId}`,
    {
      headers: authHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Failed to fetch post"
    );
  }

  return data;
}

/* ============================================================
   UPDATE POST
============================================================ */

export type UpdatePostPayload = {
  content?: string;
  platforms?: string[];
  content_type?: string;
  status?:
    | "draft"
    | "scheduled"
    | "published"
    | "failed"
    | "cancelled"
    | "pending_approval";
  scheduled_at?: string | null;
};

export async function updatePost(
  postId: number,
  postData: UpdatePostPayload
) {
  const response = await fetch(
    `${API_BASE_URL}/posts/${postId}`,
    {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(postData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Failed to update post"
    );
  }

  return data;
}

/* ============================================================
   DELETE POST
============================================================ */

export async function deletePost(
  postId: number
): Promise<SimpleMessageResponse> {
  const response = await fetch(
    `${API_BASE_URL}/posts/${postId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Failed to delete post"
    );
  }

  return data;
}

/* ============================================================
   FORGOT PASSWORD
============================================================ */

export async function forgotPassword(
  email: string
): Promise<SimpleMessageResponse> {
  const response = await fetch(
    `${API_BASE_URL}/auth/forgot-password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Request failed"
    );
  }

  return data;
}

/* ============================================================
   RESET PASSWORD
============================================================ */

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<SimpleMessageResponse> {
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
      data.detail ||
        "Reset failed"
    );
  }

  return data;
}

/* ============================================================
   UPDATE PROFILE
============================================================ */

export async function updateProfile(
  name: string
): Promise<UserProfile> {
  const response = await fetch(
    `${API_BASE_URL}/auth/me`,
    {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        name: name.trim(),
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Failed to update profile"
    );
  }

  return data;
}

/* ============================================================
   CHANGE PASSWORD
============================================================ */

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<SimpleMessageResponse> {
  const response = await fetch(
    `${API_BASE_URL}/auth/change-password`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        current_password:
          currentPassword,
        new_password:
          newPassword,
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

/* ============================================================
   LINKEDIN PUBLISH
============================================================ */

export async function publishLinkedInPost(
  content: string
): Promise<PostResponse> {
  const response = await fetch(
    `${API_BASE_URL}/linkedin/publish`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        content,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Failed to publish to LinkedIn"
    );
  }

  return data;
}