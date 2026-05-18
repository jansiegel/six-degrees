import pThrottle from 'p-throttle';
import type { Artist, ArtistDetails, ArtistRelation } from '@/lib/types';

const BASE_URL = 'https://musicbrainz.org/ws/2/';
const SEARCH_LIMIT = 5;

const throttle = pThrottle({ limit: 1, interval: 1000 });
const throttledFetch = throttle(fetch);

async function mbFetch<T>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const userAgent = process.env.MUSICBRAINZ_USER_AGENT;
  if (!userAgent) {
    throw new Error('MUSICBRAINZ_USER_AGENT missing');
  }

  const url = new URL(path, BASE_URL);
  url.searchParams.set('fmt', 'json');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const res = await throttledFetch(url, {
    headers: {
      'User-Agent': userAgent,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`MusicBrainz ${path} returned ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function searchArtists(query: string): Promise<Artist[]> {
  const data = await mbFetch<{ artists?: any[] }>('artist', {
    query,
    limit: SEARCH_LIMIT,
  });

  return (data.artists ?? []).map((artist: any) => {
    const { id, name, type, country, disambiguation } = artist;
    return { id, name, type, country, disambiguation };
  });
}

export async function getArtistDetails(mbid: string): Promise<ArtistDetails> {
  return mbFetch<ArtistDetails>(`artist/${mbid}`, { inc: 'artist-rels' });
}

export function extractFrontman(details: ArtistDetails): string {
  const pickPreferringActive = (matches: ArtistRelation[]): ArtistRelation | undefined => {
    if (matches.length === 0) {
      return undefined;
    }
    if (matches.length === 1) {
      return matches[0];
    }

    const active = matches.filter((m) => !m.end);
    if (active.length > 0) {
      return active[0];
    }

    return matches[0];
  };

  const members = (details.relations ?? []).filter(
    (r) => r.type === 'member of band' && r.direction === 'backward',
  );

  const frontman = pickPreferringActive(
    members.filter((m) => m.attributes?.includes('frontman')),
  );
  if (frontman?.artist) {
    return frontman.artist.name;
  }

  const leadVocalist = pickPreferringActive(
    members.filter((m) => m.attributes?.includes('lead vocals')),
  );
  if (leadVocalist?.artist) {
    return leadVocalist.artist.name;
  }

  return details.name;
}