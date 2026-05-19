<p align="center">
  <img src="public/readme-logo.png" alt="Six Degrees of Music" width="240" />
</p>

# Six Degrees of _______, music edition

Find the shortest connection between any two musicians through their collaborators. A musical take on the classic [Six Degrees of Kevin Bacon](https://en.wikipedia.org/wiki/Six_Degrees_of_Kevin_Bacon): instead of co-starring in films, two artists are linked if they shared a band, played as a supporting musician, or worked together in any recorded collaboration.

## How to use it

Fill the search inputs, pick an artist from the dropdown and hit **FIND THE CONNECTION**. The result shows the chain of musicians linking your two picks; each name in between played in or alongside the artists on either side of them. So a result like _Queens of the Stone Age → Josh Homme → Eagles of Death Metal_ tells you Josh Homme is the person who connects the two bands.

If no path exists within ten hops, the page shows "no connection found". Click **CHECK ANOTHER** to start over with two new artists.

## Where the data comes from

The graph is built from [MusicBrainz](https://musicbrainz.org) database mirror. Only artists who appear in at least one recorded collaboration (band membership, supporting musician, or known performance alias) are included — purely solo artists with no documented collaborators won't appear in search.

## Live

[jansiegel.com/six-degrees](https://jansiegel.com/six-degrees)

---

Created by [Jan Siegel](https://jansiegel.com), based on the idea of the [Six Degrees of Kevin Bacon](https://en.wikipedia.org/wiki/Six_Degrees_of_Kevin_Bacon). Data sourced from the [MusicBrainz database](https://musicbrainz.org).
