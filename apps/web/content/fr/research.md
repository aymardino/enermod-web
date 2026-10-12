EnerMod Africa est conçu comme un hub de recherche plutôt que comme un rapport : l'inventaire, le pipeline qui l'alimente et les personnes qui l'entretiennent sont faits pour survivre à la mission qui les a créés.

## Publications et productions

- **Mémoire de mastère** (2026) : *Who models Africa's energy future?* Revue systématique PRISMA de 1 053 études de modélisation énergétique appliquées aux pays africains, pipeline d'extraction et cet observatoire. MINES Paris-PSL (Mastère OSE) pour le Cluster 1 d'AISESA.
- **Document de travail « perspective »** (Plakoo et al., 2026) sur les approches de modélisation énergétique en contexte africain, coécrit au sein de la communauté du Cluster 1.
- **3e Congrès AISESA**, Kampala, septembre 2026 : présentation de la revue achevée et de l'observatoire.
- **Krinea** : l'outil d'extraction construit pour cette revue, devenu un atelier open source de revue systématique (import, dédoublonnage, tri, extraction assistée par IA avec citations textuelles, rapport PRISMA 2020).

## Données et API {#data}

Toutes les données de l'inventaire sont ouvertes (CC BY 4.0) :

- [Études (CSV)](/api/export/studies.csv), [études (JSON)](/api/export/studies.json), [outils (CSV)](/api/export/tools.csv), [pays (CSV)](/api/export/countries.csv), ou [tout en zip](/api/export/all.zip) avec les tables de liaison ;
- une API JSON en lecture derrière chaque page de l'observatoire : `/api/stats/overview`, `/api/studies?country=KE&tool=OSeMOSYS`, `/api/tools/HOMER`, `/api/countries/NG`, `/api/stats/gaps?level=full`, `/api/stats/readiness`, `POST /api/recommend` ;
- le classeur maître et la base SQLite de la première édition restent dans le dépôt sous `data/`.

## Comment l'inventaire reste vivant

Une revue est un instantané daté par sa recherche. Quatre mécanismes font avancer celle-ci :

1. **Contributions.** Chacun peut [proposer une étude, une correction ou un outil](/contribute). Les propositions sont confrontées aux doublons (DOI, titre) et attendent dans une file de curation ; rien n'est publié sans vérification par un curateur.
2. **Découverte.** Le hub relance la stratégie de recherche OpenAlex de la revue (les mêmes quatre blocs booléens) à une cadence configurable, depuis la date de la dernière exécution ou depuis 2000 pour un balayage complet qui rattrape les études oubliées. Les travaux déjà dans le corpus sont reconnus par DOI ou titre ; les autres deviennent des candidats que les curateurs trient. Les candidats pertinents sont exportés en RIS et passés dans Krinea pour le tri sur texte intégral et l'extraction en 51 champs, puis réimportés comme contributions en attente.
3. **Sondage.** Le sondage de validation envoyé aux équipes de modélisation (membres du Cluster 1 d'abord) est connecté par un flux CSV ; chaque réponse devient une contribution en attente avec les coordonnées de son auteur.
4. **Suivi des outils.** Pour les outils ouverts dont le dépôt est connu, le hub enregistre chaque mois étoiles, forks, tickets ouverts, contributeurs et dernier commit, à côté de l'usage de chaque outil dans la littérature africaine, dans l'esprit de l'openmod tracker.

Une couche d'usage enregistre quelles pages, outils, pays et études les visiteurs consultent et combien de fois le recommandeur et l'assistant sont utilisés, sans stocker aucune donnée personnelle.

## Feuille de route

- Intégrer le corpus de politiques publiques (CDN, CCDR, stratégies nationales) comme un flux documenté avec son propre protocole de provenance.
- Publier un indice de capacité nationale de modélisation fondé sur le corpus (part d'études d'échelle nationale menées par des institutions africaines).
- Relancer tout le protocole de revue chaque année ou tous les deux ans, pour transformer l'instantané 2026 en revue vivante.
- Approfondir l'intégration avec les trackers d'outils communautaires, pour que le corpus africain appliqué et l'écosystème mondial des outils s'informent mutuellement.

## Gouvernance

L'observatoire a vocation à être ancré dans la communauté AISESA, la coordination du Cluster 1 étant son lieu naturel. Les curateurs sont désignés par la communauté ; le code et les données restent ouverts.
