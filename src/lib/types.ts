interface ArtistAlias {
  name: string;
}

interface ArtistTag {
  count: number;
  name: string;
}

export interface Artist {
  id: string;
  name: string;
  type?: string;
  country?: string;
  // aliases?: ArtistAlias[]; // YAGNI
  // tags?: ArtistTag[]; // YAGNI
  disambiguation?: string;
}

export interface ArtistRelation {
  type: string;
  direction: 'forward' | 'backward';
  attributes?: string[];
  artist?: {
    id: string;
    name: string;
  };
  begin?: string | null;
  end?: string | null;
}

export interface ArtistDetails {
  id: string;
  name: string;
  type?: string;
  disambiguation?: string;
  relations: ArtistRelation[];
}
