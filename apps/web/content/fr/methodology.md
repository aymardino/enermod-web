Chaque chiffre de cette plateforme est reproductible. Cette page documente comment les études ont été sélectionnées et extraites, comment les données vides sont traitées, d'où vient chaque indicateur national, et comment exactement chaque score composite est calculé, afin que les indicateurs puissent être examinés et répliqués.

## La revue systématique (PRISMA 2020)

Une étude est incluse lorsqu'elle applique un outil de modélisation énergétique à représentation technologique explicite, ou l'une de deux familles méthodologiques ciblées (analyse spatiale SIG ad hoc, dynamique des systèmes), à un système énergétique communautaire ou territorial dont tous les pays modélisés sont africains. Les installations privées isolées modélisant leur propre approvisionnement et les modèles macroéconomiques purement descendants sans représentation technologique sont exclus. L'unité d'analyse est le cadre logiciel, pas ses instanciations nationales : une étude TIAM-ECN compte comme une application TIMES, une étude PyPSA-Earth comme une application PyPSA.

Les recherches ont été exécutées sur OpenAlex (ampleur) et Scopus (couverture curatée) le 5 mai 2026, avec une requête booléenne en quatre blocs : vocabulaire énergétique ET géographie (Afrique et les 54 pays) ET méthodes de modélisation ET instruments nommés. Elles ont renvoyé 9 582 notices ; après suppression de 1 823 doublons, 7 759 notices uniques ont été triées sur titre et résumé, 1 452 textes intégraux ont été recherchés, et 1 053 études ont été incluses. Les documents gris (thèses, rapports, actes) sont entrés via OpenAlex, l'inventaire pilote et la recherche par citations.

![Diagramme de flux PRISMA 2020](/brand/prisma_flow.png)

Le pipeline de découverte de ce hub relance les mêmes quatre blocs sur OpenAlex (voir [Recherche](/research)) ; aucune nouvelle correspondance n'entre dans l'inventaire sans vérification par un curateur.

## Périmètre du modèle

Les études sont regroupées selon le **périmètre du modèle** qu'elles utilisent. C'est une propriété de l'étude, pas de la façon dont elle a été traitée.

- **Système énergétique complet** : modèles représentant un système énergétique entier et ses arbitrages internes (MESSAGE, OSeMOSYS, TIMES, LEAP, PLEXOS, Balmorel). Les 51 champs sont extraits.
- **Ciblé** : modèles traitant une question délimitée, comme le dimensionnement d'un site, l'accès à l'électricité, l'analyse spatiale ou la comptabilité de scénarios (HOMER, OnSSET, RETScreen, analyses SIG, calculateurs). Environ 34 champs de base s'appliquent ; les champs propres à l'optimisation à l'échelle du système restent vides.

Mélanger les périmètres dans les statistiques peut induire en erreur : un classement d'outils sur les deux groupes dilue MESSAGE ou OSeMOSYS avec HOMER. Les pages analytiques permettent de filtrer par périmètre.

## Traitement des cellules vides

Une cellule vide signifie **non évalué**, jamais **non**. Les pourcentages de couverture sont calculés uniquement sur les études où une dimension a été effectivement évaluée :

```
couverture (%) = études marquées « oui » / études où le champ est renseigné × 100
```

La même règle s'applique aux pays : un pays non couvert par une source est exclu du classement correspondant, jamais ramené à la pire valeur.

## Indicateurs nationaux et sources

| Indicateur | Source | Calcul |
| --- | --- | --- |
| Gouvernance énergétique | Banque mondiale / ESMAP, Regulatory Indicators for Sustainable Energy (RISE) 2023 | Moyenne de trois indicateurs de gouvernance (planification de l'électrification, énergies renouvelables, efficacité énergétique), classée selon les zones RISE : ≥ 66,67 `forte`, 33,33 à 66,66 `modérée`, < 33,33 `faible`. 39 pays sur 54 couverts. |
| Disponibilité des données | Ember, African Electricity Data Transparency, janvier 2022 | Score de transparence de 0 à 5 sur les données nationales de production électrique : 3 à 5 `bonne`, 1 à 2 `limitée`, 0 `aucune`. Les 54 pays. |
| Taux d'électrification | Banque mondiale WDI, EG.ELC.ACCS.ZS, édition 2024 | Part de la population ayant accès à l'électricité, année la plus récente. |
| CDN et stratégie long terme | Registre des CDN et portail LT-LEDS de la CCNUCC | Soumise oui/non. |

**Mise en garde sur la gouvernance.** RISE mesure l'existence d'un cadre réglementaire formel, pas sa mise en œuvre, ni directement la capacité de modélisation d'un pays. Aucun jeu de données public ne mesure cette capacité ; RISE est le meilleur proxy disponible. Une mesure fondée sur le corpus, la part d'études d'échelle nationale menées par des institutions africaines, en est le complément naturel et figure sur chaque page pays.

## Score d'écart (0 à 100)

Mesure, par pays, du déficit de modélisation. Plus le score est élevé, plus le pays est mal desservi.

| Composante | Poids | Mesure |
| --- | --- | --- |
| Couverture des spécificités africaines | 35 | Moyenne, sur quatre dimensions (économie informelle, biomasse et charbon de bois, fiabilité de l'alimentation, urbanisation), de la part des études évaluées du pays qui la couvrent |
| Disponibilité des données | 30 | `bonne` = 2, `limitée` = 1, `aucune` = 0 |
| Gouvernance énergétique | 20 | `forte` = 2, `modérée` = 1, `faible` = 0 ; les pays non couverts par RISE reçoivent la valeur neutre 1 |
| Densité de modèles | 15 | Nombre d'outils distincts appliqués, plafonné à 10 |

```
écart = (1 − feat) × 35 + (1 − dat/2) × 30 + (1 − gov/2) × 20 + (1 − min(n, 10)/10) × 15
```

Une première version notait chaque dimension de façon binaire (traitée quelque part ou non) et saturait vite ; la version en parts ci-dessus l'a remplacée.

## Score de préparation (0 à 10)

Les conditions dans lesquelles la modélisation peut se traduire en politiques. Plus le score est élevé, plus le pays est prêt.

| Composante | Points | Source |
| --- | --- | --- |
| Gouvernance énergétique | `forte` 3, `modérée` 1,5, `faible` 0 | RISE 2023 |
| Disponibilité des données | `bonne` 3, `limitée` 1,5, `aucune` 0 | Ember 2022 |
| Taux d'électrification | taux / 100 × 2 (max 2) | WDI 2024 |
| CDN soumise | 1 | CCNUCC |
| Stratégie long terme soumise | 1 | CCNUCC |

```
préparation = gov + dat + min(élec/100 × 2, 2) + cdn + lts
```

Les pays sans couverture RISE (15 sur 54, surtout de petits États insulaires) ne reçoivent aucun score plutôt que d'être notés comme non prêts, d'où 39 pays classés.

## Notation du recommandeur

Le recommandeur note chaque outil publiquement disponible selon vos réponses. Les modèles internes (licence `internal`) sont listés mais jamais classés, puisqu'ils ne peuvent pas être obtenus.

| Signal | Points |
| --- | --- |
| Adéquation à l'objectif : jetons `best_for` (+30), type d'outil (+10) | jusqu'à +40 |
| Adéquation d'échelle | +12 (+6 quand l'échelle de l'outil « varie ») |
| Budget : licence, accès gratuit pour les institutions africaines, dépendances payantes (GAMS, MATLAB, ArcGIS…) | −25 à +15 |
| Capacité de l'équipe et support : programmation requise, formation, assistance, communauté, documentation | −20 à +23 |
| Horizon temporel | +10 (+5 pour un outil long terme sur une question moyen terme) |
| Disponibilité des données face à l'intensité en données | −8 à +10 |
| Expérience africaine : ≥ 10 études +10, ≥ 5 études +5 | +5 à +10 |
| Exigences optionnelles (cuisson propre, analyse financière, macOS/Linux, assistance) | −15 à +10 chacune |

L'exigence open source agit comme un filtre et non comme une pénalité : qui a besoin du code ne voit jamais un outil propriétaire classé premier. Le score est une heuristique transparente pour présélectionner des candidats, pas un substitut au jugement d'expert ; la décomposition est affichée pour chaque recommandation.

## L'assistant

L'assistant répond à partir d'un contexte assemblé à la volée depuis l'inventaire (statistiques de synthèse, profils d'outils, fiches pays et études correspondantes) et reçoit l'instruction de dire quand l'inventaire ne couvre pas une question. Chaque affirmation tirée d'un enregistrement est citée et liée, pour pouvoir être vérifiée. Il ne consulte pas le web et peut se tromper.

## Limites

- Les poids ci-dessus traduisent un jugement éditorial ; ils sont délibérés mais non calibrés empiriquement et peuvent être révisés.
- La gouvernance énergétique est un proxy de la préparation institutionnelle, pas une mesure directe de la capacité de modélisation.
- Le score Ember date de janvier 2022 et peut sous-estimer les progrès récents.
- Les scores ne valent que ce que vaut l'extraction sous-jacente ; les études ciblées apportent moins de champs par construction.
- L'inventaire est un document vivant : les chiffres évoluent au fil des contributions et de la découverte.
