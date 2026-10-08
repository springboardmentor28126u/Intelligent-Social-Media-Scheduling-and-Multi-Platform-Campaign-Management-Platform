export type AITone = 'professional' | 'casual' | 'friendly' | 'witty' | 'inspirational';

export interface GeneratedPost {
  title: string | null;
  text: string;
}

export interface GenerateCaptionResponse {
  posts: Record<string, GeneratedPost>;
}

export interface GenerateCaptionParams {
  topic: string;
  platforms: string[];
  tone?: string;
}

const API_BASE = 'http://localhost:8000';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function generateCaption(
  topic: string,
  platforms: string[],
  tone: string = 'professional'
): Promise<GenerateCaptionResponse> {
  const response = await fetch(`${API_BASE}/ai/generate-caption`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      topic,
      platforms,
      tone,
    }),
  });

  if (!response.ok) {
    let errorDetail = 'AI generation failed. Please try again.';
    if (response.status === 429) {
      errorDetail = 'Daily AI limit reached, try again tomorrow';
    } else {
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorDetail;
      } catch {
        // Fallback to generic message
      }
    }
    throw new Error(errorDetail);
  }

  return response.json();
}
