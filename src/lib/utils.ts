export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA';
}

export function formatNumber(amount: number, decimals = 2): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fullName(lastName: string | null, firstName: string | null): string {
  return [lastName, firstName].filter(Boolean).join(' ');
}

export const ACADEMIC_STATUS_LABELS: Record<string, string> = {
  preinscrit: 'Préinscrit',
  inscrit: 'Inscrit',
  actif: 'Actif',
  suspendu: 'Suspendu',
  abandonne: 'Abandonné',
  exclu: 'Exclu',
  redoublant: 'Redoublant',
  admis_superieur: 'Admis en classe supérieure',
  diplome: 'Diplômé',
  ancien_etudiant: 'Ancien étudiant',
};

export const GRADE_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  in_progress: 'Saisie en cours',
  submitted: 'Soumise',
  validated: 'Validée',
  corrected: 'Corrigée',
  locked: 'Verrouillée',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  especes: 'Espèces',
  virement: 'Virement bancaire',
  depot_bancaire: 'Dépôt bancaire',
  mobile_money: 'Mobile Money',
  cheque: 'Chèque',
  autre: 'Autre',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  partially_paid: 'Partiellement payé',
  paid: 'Payé',
  cancelled: 'Annulé',
  refunded: 'Remboursé',
  rejected: 'Rejeté',
};

export const DECISION_LABELS: Record<string, string> = {
  admis: 'Admis',
  admis_reserve: 'Admis avec réserve',
  ajourne: 'Ajourné',
  redoublant: 'Redoublant',
  exclu: 'Exclu',
  abandon: 'Abandon',
  dossier_incomplet: 'Dossier incomplet',
  passage_superieur: 'Passage en classe supérieure',
  diplome: 'Diplômé',
};

export const CARD_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  generated: 'Générée',
  printed: 'Imprimée',
  delivered: 'Remise',
  expired: 'Expirée',
  cancelled: 'Annulée',
  replaced: 'Remplacée',
};

export const BOOKLET_ORDER_STATUS_LABELS: Record<string, string> = {
  ordered: 'Commandé',
  unpaid: 'Non payé',
  partially_paid: 'Partiellement payé',
  paid: 'Payé',
  available: 'Disponible',
  delivered: 'Remis',
  cancelled: 'Annulé',
  refunded: 'Remboursé',
};

export const STOCK_MOVEMENT_LABELS: Record<string, string> = {
  initial: 'Stock initial',
  in: 'Entrée en stock',
  out: 'Sortie',
  sale: 'Vente',
  free_delivery: 'Remise gratuite',
  damaged: 'Endommagé',
  loss: 'Perte',
  correction: "Correction d'inventaire",
};
