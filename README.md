# IBR Gestion Académique

Application web de gestion académique et financière pour l'Institut Biblique Rehoboth de Bonoua.

## Fonctionnalités

- **Authentification** : Connexion sécurisée avec Supabase Auth, 6 rôles (super admin, direction académique, secrétariat, enseignant, finance, consultation)
- **Étudiants** : Fiches complètes, matricules auto-générés, statuts académiques, documents joints
- **Inscriptions** : Workflow complet d'inscription et réinscription, copie automatique des frais
- **Académique** : Années académiques, programmes, niveaux, modules, matières, enseignants
- **Notes** : Saisie type tableur, navigation clavier, statuts (brouillon → validé → verrouillé), historique
- **Moyennes & classements** : Calcul pondéré ou simple, gestion des ex aequo, décisions automatiques
- **Finances** : Grille de frais par niveau, comptes étudiants, paiements multi-moyens, reçus auto
- **Fascicules** : Catalogue, stock, mouvements, ventes, alertes de stock faible
- **Cartes d'étudiant** : Génération avec QR code, statuts, suivi des impressions
- **Documents** : Génération de listes de classe, relevés, et plus
- **Administration** : Utilisateurs, rôles, paramètres, journal d'audit, archives

## Stack technique

- React 18 + TypeScript + Vite
- Tailwind CSS (charte bleu profond, vert, doré)
- Supabase (PostgreSQL, Auth, RLS)
- lucide-react pour les icônes

## Installation

```bash
npm install
npm run dev
```

## Configuration Supabase

Les variables d'environnement sont pré-configurées dans `.env` :
- `VITE_SUPABASE_URL` - URL du projet Supabase
- `VITE_SUPABASE_ANON_KEY` - Clé anonyme Supabase

## Création du premier administrateur

1. Lancez l'application et cliquez sur "Créer un compte"
2. Inscrivez-vous avec votre email et mot de passe
3. Connectez-vous à Supabase et assignez le rôle `super_admin` à votre profil via la table `user_profiles` (champ `role_id`)

Alternativement, exécutez cette requête SQL dans Supabase :
```sql
UPDATE user_profiles
SET role_id = (SELECT id FROM roles WHERE name = 'super_admin')
WHERE user_id = 'VOTRE_USER_ID';
```

## Personnalisation des matricules

Allez dans **Paramètres > Configuration des matricules** pour configurer :
- Le sigle de l'institut (ex: IBR)
- Le séparateur (ex: /)
- Le nombre de chiffres (ex: 4 → 0001)
- Le numéro de départ
- L'autorisation de création manuelle

## Configuration des frais par niveau

Allez dans **Frais de scolarité** pour définir les montants par :
- Année académique
- Niveau
- Catégorie de frais (inscription, scolarité, carte, examen, etc.)
- Nombre de tranches

## Déploiement Vercel

1. Poussez le code sur GitHub
2. Connectez le dépôt à Vercel
3. Les variables d'environnement sont automatiquement configurées
4. Déployez

## Données de démonstration

L'application est pré-chargée avec :
- 2 niveaux (Première année, Deuxième année)
- 5 modules par niveau
- 15 matières en B1, 16 matières en B2
- 8 enseignants
- 10 étudiants avec matricules
- Des notes, paiements, fascicules et stock de démonstration

## Sécurité

- Row Level Security (RLS) activée sur toutes les tables
- Authentification requise pour toutes les opérations
- Suppression logique (soft delete) pour les étudiants
- Journal d'audit pour les actions sensibles

## Évolutions futures prévues

- Emplois du temps
- Gestion des présences
- Portail étudiant et enseignant
- Notifications WhatsApp / email
- Diplômes
- Multi-campus
- Paiements Mobile Money automatisés
