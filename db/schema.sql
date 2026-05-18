-- Artists: bands, persons, characters, orchestras, choirs
CREATE TABLE artists (
    mbid TEXT PRIMARY KEY,           -- MusicBrainz UUID (public identifier)
    name TEXT NOT NULL,              -- e.g. "Queen", "Freddie Mercury"
    sort_name TEXT,                  -- e.g. "Queen", "Mercury, Freddie"
    type INTEGER,                    -- MusicBrainz artist type code
    disambiguation TEXT,             -- e.g. "British rock band" - disambiguates same-name artists
    begin_year INTEGER,              -- year of formation / birth
    end_year INTEGER,                -- year of dissolution / death
    ended INTEGER NOT NULL DEFAULT 0, -- bool: whether the artist ended
    country TEXT,                    -- ISO 3166-1 alpha-2, e.g. "PL", "GB"
    photo_url TEXT                   -- from Wikidata P18 (Commons), NULL if missing
);

-- Relations: directed musical connections between two artists
-- (member of band, supporting musician, instrumental/vocal supporting, etc.)
CREATE TABLE relations (
    link_id INTEGER PRIMARY KEY,     -- from MusicBrainz l_artist_artist.id (unique for free)
    entity0_mbid TEXT NOT NULL,      -- contributor side (e.g. the member, the supporting musician)
    entity1_mbid TEXT NOT NULL,      -- target side (e.g. the band, the supported artist)
    relation_type INTEGER NOT NULL,  -- MusicBrainz link type (see src/lib/db/relations.ts)
    is_lead_vocals INTEGER NOT NULL DEFAULT 0, -- bool: only meaningful for member-of-band relations
    attributes TEXT,                 -- CSV of MusicBrainz link-attribute names, e.g. "drums,marimba" or NULL
    begin_year INTEGER,              -- when the relation began (NULL = unknown)
    end_year INTEGER                 -- when the relation ended (NULL = ongoing or unknown)
);

-- External links: Wikidata, Last.fm, later Spotify etc.
CREATE TABLE artist_urls (
    artist_mbid TEXT NOT NULL,
    url_type TEXT NOT NULL,          -- 'wikidata', 'lastfm', 'spotify', 'facebook' etc.
    url TEXT NOT NULL,
    PRIMARY KEY (artist_mbid, url_type, url)
);

-- Indexes: critical for BFS traversal and name search
CREATE INDEX idx_relations_entity0 ON relations(entity0_mbid);
CREATE INDEX idx_relations_entity1 ON relations(entity1_mbid);
CREATE INDEX idx_relations_type ON relations(relation_type);
CREATE INDEX idx_artists_name_nocase ON artists(name COLLATE NOCASE);
CREATE INDEX idx_artist_urls_artist ON artist_urls(artist_mbid);
