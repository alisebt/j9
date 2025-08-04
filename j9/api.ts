const API_BASE = 'http://localhost:3001/api';

export async function fetchPlaylists(): Promise<Record<string, string[]>> {
  const res = await fetch(`${API_BASE}/playlists`);
  if (!res.ok) throw new Error('Failed to fetch playlists');
  return res.json();
}

export async function createPlaylist(name: string) {
  await fetch(`${API_BASE}/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
}

export async function renamePlaylist(oldName: string, newName: string) {
  await fetch(`${API_BASE}/playlists/${encodeURIComponent(oldName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newName })
  });
}

export async function deletePlaylist(name: string) {
  await fetch(`${API_BASE}/playlists/${encodeURIComponent(name)}`, { method: 'DELETE' });
}

export async function addShotToPlaylist(name: string, shotId: string) {
  await fetch(`${API_BASE}/playlists/${encodeURIComponent(name)}/shots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shotId })
  });
}

export async function removeShotFromPlaylist(name: string, shotId: string) {
  await fetch(`${API_BASE}/playlists/${encodeURIComponent(name)}/shots/${encodeURIComponent(shotId)}`, {
    method: 'DELETE'
  });
}

export async function fetchTags(): Promise<Record<string, string[]>> {
  const res = await fetch(`${API_BASE}/tags`);
  if (!res.ok) throw new Error('Failed to fetch tags');
  return res.json();
}

export async function addTag(shotId: string, tag: string) {
  await fetch(`${API_BASE}/tags/${encodeURIComponent(shotId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag })
  });
}

export async function removeTag(shotId: string, tag: string) {
  await fetch(`${API_BASE}/tags/${encodeURIComponent(shotId)}/${encodeURIComponent(tag)}`, {
    method: 'DELETE'
  });
}

export async function renameTag(oldTag: string, newTag: string) {
  await fetch(`${API_BASE}/tags/rename`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldTag, newTag })
  });
}

export async function fetchDirectories(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/directories`);
  if (!res.ok) throw new Error('Failed to fetch directories');
  return res.json();
}

export async function saveDirectory(path: string) {
  await fetch(`${API_BASE}/directories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  });
}
