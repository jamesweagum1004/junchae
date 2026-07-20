import { adminAuthHeaders } from './adminApi';

const extractUploadUrl = (body: unknown) => {
  if (!body || typeof body !== 'object') return '';
  const root = body as Record<string, unknown>;
  const data = root.data && typeof root.data === 'object' ? root.data as Record<string, unknown> : {};
  return String(data.url || data.imageUrl || data.path || root.url || root.imageUrl || root.path || '');
};

export async function uploadSitePreviewImage(file: File) {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch('/api/uploads/site-preview', {
    method: 'POST',
    headers: adminAuthHeaders(),
    body: formData,
  });
  const body = await res.json().catch(() => null);
  const url = extractUploadUrl(body);

  if (!res.ok || !body?.ok || !url) {
    console.error('사이트 미리보기 이미지 업로드 응답 오류', { status: res.status, body });
    throw new Error(body?.message || body?.error || '사이트 미리보기 이미지 업로드에 실패했습니다.');
  }

  return url;
}
