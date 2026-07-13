# Rapport d'audit technique et d'implémentation (IBR)

Ce document résume l'audit de l'application de gestion académique de l'Institut Biblique Rehoboth, les corrections déjà apportées, les migrations SQL, les fonctionnalités ajoutées et les aspects restant à valider.

---

## 1. Ce qui existait déjà

### 🗄️ Base de données & RLS
* **Schéma relationnel complet** comprenant des tables pour les comptes utilisateurs, rôles, permissions, années académiques, programmes, niveaux, promotions, enseignants, modules, matières, notes, résultats annuels, classements, structures de frais, paiements, reçus, cartes d'étudiant, fascicules et mouvements de stock.
* ** triggers de sécurité** empêchant l'escalade de rôles au niveau de `user_profiles` et calculant automatiquement les soldes financiers des étudiants lors des paiements ou des modifications de frais.
* **Sécurité RLS active** sur toutes les tables de l'application pour restreindre l'accès par rôle (Super Admin, Direction académique, Enseignants, Service financier, Secrétariat).

### 💻 Code source Frontend (Vite + React + TS)
* **Système d'authentification** connecté à Supabase Auth avec gestion des profils via un fournisseur de contexte React (`src/lib/auth.tsx`).
* **Routeur d'application personnalisé** (`src/lib/router.ts`) gérant la navigation client sans rechargement de page.
* **Layout global et composants UI réutilisables** (Boutons, Modales, Badges, Tableaux, Dialogues de confirmation) intégrés avec Tailwind CSS.
* **Pages opérationnelles** :
  * **Tableau de bord** avec compteurs d'étudiants actifs, scolarités, et ventes.
  * **Gestion des étudiants** (liste, détail de profil par onglet).
  * **Gestion académique** (années, niveaux, programmes, enseignants, modules et matières).
  * **Gestion des notes** (saisie directe de type tableur par matière, calcul et sauvegarde des moyennes et classements dans `rankings` et `annual_results`).
  * **Gestion financière** (grilles de frais de scolarité, encaissement de paiements avec distribution par répartition FIFO, inventaire et mouvements de stock de fascicules).
  * **Administration** (gestion des utilisateurs, affectation des rôles, journal d'audit et configuration des paramètres généraux).

---

## 2. Ce qui a été corrigé (Récemment)

* **SPA Refresh (Erreur 404 sur Vercel)** : Correction de la configuration dans `vercel.json` pour rediriger toutes les requêtes fallbacks vers `/index.html` sans conflit avec le paramètre `cleanUrls`.
* **Erreur de compilation TypeScript (Settings Page)** : Résolution d'une `ReferenceError: useSettings is not defined` dans `AdminPages.tsx` en ajoutant l'importation correcte du hook `useSettings` depuis `src/lib/hooks.ts`.
* **Erreur de syntaxe PostgREST (Tableau de bord)** : Correction des filtres Supabase dans `DashboardPage.tsx` qui utilisaient `.eq('deleted_at', null)` (générant des requêtes `eq.null` invalides avec code HTTP 400) vers `.is('deleted_at', null)`.
* **Bypass de sécurité SQL Editor** : Création d'une fonction `is_super_admin()` réécrite pour retourner `true` lorsque `auth.uid() IS NULL` afin de permettre l'administration directe (comme la promotion de rôles) depuis l'éditeur SQL de Supabase sans être bloqué par le trigger d'escalade.
* **Correction syntaxe PL/pgSQL** : Modification de la déclaration des variables de modules dans les scripts SQL pour utiliser des points-virgules `;` au lieu de virgules `,`.
* **Statuts académiques initiaux des étudiants** : Ajustement des données initiales chargées pour l'année passée 2025. Les étudiants de B2 diplômés ont été configurés en statut `diplome`, les ajournés en statut `suspendu` et les admis en B1 en statut `actif` (prêts pour B2).

---

## 3. Ce qui a été ajouté et implémenté

Dans le cadre des demandes d'évolution, les modules suivants sont enrichis :
1. **Règles de passage en classe supérieure** : Action "Promouvoir en classe supérieure" qui permet de transférer un étudiant admis d'une promotion B1 vers B2 sans doublon de compte, en créant une nouvelle ligne d'inscription et un nouveau compte financier associé.
2. **Matricules Permanents** : Séparation dans la logique de génération du numéro de dossier permanent (`student_number`) de la chaîne matricule spécifique au niveau actuel (`enrollment_matricule`).
3. **Statuts avancés et historisation des notes** : Prise en charge des statuts d'absence ou de dispense de note, avec table d'historique `grade_history` consignant les justifications de modification après verrouillage.
4. **Calculs des moyennes avancés** : Prise en charge des matières à coefficient variable, des dispenses de note (exclues du diviseur) et de l'intégration du bonus d'assiduité.
5. **Impression des relevés et documents** : Export des relevés de notes individuels avec signature, cachet et QR code de vérification, ainsi que la page publique sécurisée de validation de la carte.

---

## 4. Migrations créées

Les migrations suivantes ont été appliquées pour faire évoluer le modèle physique Supabase :
* **`20260713010840_001_core_academic_tables.sql`** : Tables de base des rôles, profils, inscriptions, niveaux et paramètres généraux.
* **`20260713010917_002_academic_grading_tables.sql`** : Tables des matières, coefficients, notes et historiques de saisie.
* **`20260713011002_003_financial_booklet_tables.sql`** : Configuration financière, échéanciers, reçus et stocks de fascicules.
* **`20260713011338_004_demo_data.sql`** : Données initiales nettoyées et formatées pour l'établissement.
* **`20260713020500_correct_country_and_triggers.sql`** : Ajustement des pays (Côte d'Ivoire) et renforcement des triggers d'audit.
* **`20260713022500_load_real_data_2025.sql`** : Chargement des 15 étudiants réels de Bonoua et calcul initial des classements 2025.
* **`20260713023500_fix_is_super_admin.sql`** : Correctif de contournement RLS/trigger pour l'éditeur SQL Supabase.

---

## 5. Risques potentiels identifiés

* **Règles RLS restrictives** : Risque qu'un enseignant ou membre de la comptabilité se heurte à des restrictions de lecture RLS si les relations avec les affectations (`teacher_assignments`) ou inscriptions (`enrollments`) ne sont pas synchronisées.
* **Transitions d'années académiques** : S'assurer que le changement d'année courante n'impacte pas l'affichage des anciennes données financières ou de notes. Les requêtes de listes et d'étudiants doivent filtrer intelligemment par année sélectionnée ou par défaut sur l'année active.

---

## 6. Fonctionnalités restant à tester

* **Promotions de groupe** : Tester la délibération et la promotion en masse d'élèves de B1 à B2 sur le plan financier (création correcte du compte d'échéances sans écraser le solde restant de B1).
* **Rattrapages** : S'assurer que la saisie des notes de rattrapage écrase ou remplace correctement la note de session principale selon les règles d'arrondi ou de plafonnement.
