import { auth } from '@/lib/firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type SurveyStatus = 'not_started' | 'completed' | 'skipped';

export interface SurveyStatusResponse {
  has_survey: boolean;
  survey_status: SurveyStatus;
  skipped?: boolean;
}

async function getAuthHeaderFromToken(token?: string): Promise<Record<string, string>> {
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }

  const user = auth.currentUser;
  if (!user) return {};

  try {
    const idToken = await user.getIdToken();
    return { Authorization: `Bearer ${idToken}` };
  } catch {
    return {};
  }
}

export async function getSurveyStatus(token?: string): Promise<SurveyStatusResponse | null> {
  try {
    const headers = await getAuthHeaderFromToken(token);
    if (!headers.Authorization) return null;

    const res = await fetch(`${API_URL}/survey/status`, {
      cache: 'no-store',
      headers,
    });

    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data ?? null) as SurveyStatusResponse | null;
  } catch {
    return null;
  }
}

export async function shouldGoToPersonalization(token?: string): Promise<boolean> {
  const status = await getSurveyStatus(token);
  if (!status) return true;
  return status.survey_status === 'not_started';
}

export async function saveSurvey(
  payload: { favoriteGenre?: string | null; age?: string | null; gender?: string | null },
  token?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaderFromToken(token);
    if (!headers.Authorization) {
      return { success: false, error: 'Unauthorized' };
    }

    const response = await fetch(`${API_URL}/survey/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      return { success: false, error: data?.error || data?.message || 'Gagal menyimpan preferensi' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Gagal menyimpan preferensi' };
  }
}

export async function skipSurvey(token?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaderFromToken(token);
    if (!headers.Authorization) {
      return { success: false, error: 'Unauthorized' };
    }

    const response = await fetch(`${API_URL}/survey/skip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      return { success: false, error: data?.error || data?.message || 'Gagal menyimpan skip survey' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Gagal menyimpan skip survey' };
  }
}
