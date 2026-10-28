## Contexte

L'**African Institute for Sustainable Energy and Systems Analysis (AISESA)** est une initiative qui construit, en Afrique, les connaissances et la capacité d'analyse nécessaires à des décisions énergétiques fondées sur les faits. AISESA organise son agenda de recherche en grappes thématiques ; la première est consacrée aux trajectoires d'énergie propre pour le développement durable, et son activité d'ouverture (Activité 1) consiste à cartographier les outils de modélisation énergétique et les capacités d'analyse qui existent déjà sur le continent. EnerMod Africa réalise cette cartographie et la tient à jour.

Le travail a été accueilli au **Centre de Mathématiques Appliquées (CMA) de MINES Paris-PSL** à Sophia Antipolis, au sein de **The Transition Institute 1.5 (TTI.5)**, sous la direction de la Prof. Nadia Maïzi, comme mission d'entreprise du Mastère Spécialisé Optimisation des Systèmes Énergétiques (OSE). La coordination avec la communauté AISESA a été continue, en particulier avec la coordination du Cluster 1 à l'université Makerere, et les résultats ont été présentés au 3e Congrès AISESA à Kampala en septembre 2026.

## La mission initiale

La mission visait à établir qui modélise les systèmes énergétiques des pays africains, avec quels outils, et ce que les modèles laissent de côté. Elle a abouti à trois réalisations :

1. une **revue systématique PRISMA 2020** de la littérature publiée, étape initiale, avec des recherches dans OpenAlex et Scopus le 5 mai 2026 : 7 759 notices uniques triées, 1 452 textes intégraux évalués, et un corpus initial de 1 053 études (2001 à 2026) mobilisant 101 outils distincts ;
2. un **outil d'extraction assisté par IA** qui convertit chaque document en un enregistrement structuré de 51 champs, chaque enregistrement étant vérifié à la main contre le texte source. Cet outil est devenu [Krinea](https://krinea.org), un atelier open source de revue systématique ;
3. **cet observatoire**, grâce auquel planificateurs, chercheurs et bailleurs explorent la couverture géographique, les lacunes thématiques, la préparation institutionnelle et les outils les mieux adaptés à leur contexte.

## Ce que le hub ajoute

La première version de l'observatoire était une application Streamlit alimentée par un classeur maître. Cette version en fait un hub de recherche qui reste vivant après la mission :

- chaque chiffre est servi par une API depuis une base relationnelle (PostgreSQL sur Supabase, ou SQLite) ; le site, les exports de données et l'assistant lisent la même source de vérité ;
- **chacun peut contribuer** : proposer une étude manquante, une correction ou un profil d'outil. Un curateur vérifie chaque proposition avant son entrée dans l'inventaire ;
- un **pipeline de découverte** relance la stratégie de recherche de la revue sur OpenAlex pour trouver les études nouvelles ou oubliées, les confronte au corpus et transmet les candidats aux curateurs (et à Krinea pour le tri et l'extraction) ;
- un **suivi des outils** montre l'activité du dépôt de code de chaque outil ouvert à côté de son usage dans la littérature ;
- un **assistant ancré dans les données** répond aux questions à partir du seul inventaire et cite les enregistrements utilisés ;
- l'ensemble du site est disponible en **français et en anglais**.

## Qui est derrière

La mission a été menée par Kodjovi Aymard Plakoo (MINES Paris-PSL, Mastère OSE) pour le Cluster 1 d'AISESA. L'observatoire est conçu pour être transmis à la communauté AISESA : le tenir à jour demande des compétences de curation, pas d'ingénierie logicielle.

## Comment citer

> Plakoo, K. A. (2026). *Who models Africa's energy future? A systematic review of energy modelling studies and tools applied to African countries, and the EnerMod Africa Observatory.* Mémoire de mastère, MINES Paris-PSL, pour le Cluster 1 d'AISESA.

La plateforme et ses données sont archivées sur Zenodo sous le DOI [10.5281/zenodo.23749376](https://doi.org/10.5281/zenodo.23749376) : citez-le pour l'observatoire lui-même, et le mémoire pour la revue. Les exports de données sont sous licence CC BY 4.0 ; le code est sous GPL-3.0 et disponible sur [GitHub](https://github.com/aymardino/enermod-web). L'édition Streamlit d'origine reste dans le dépôt [Enermod_Africa](https://github.com/aymardino/Enermod_Africa).
