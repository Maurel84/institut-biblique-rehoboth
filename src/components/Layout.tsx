import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard, Users, UserPlus, FileText, GraduationCap, BookOpen,
  ClipboardList, Award, CreditCard, Receipt, BookMarked, Package,
  CreditCard as IdCardIcon, Settings, Shield, FileBarChart, Archive, UsersRound,
  Menu, X, LogOut, ChevronDown, Calendar, Layers, School, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';

const logoSrc = '/Logo_IBR.jpeg';

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  roles?: string[];
  permission?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Tableau de bord',
    items: [
      { label: 'Tableau de bord', icon: LayoutDashboard, path: '/dashboard' },
    ],
  },
  {
    title: 'Étudiants',
    items: [
      { label: 'Liste des étudiants', icon: Users, path: '/students', permission: 'can_manage_academic' },
      { label: 'Nouvel étudiant', icon: UserPlus, path: '/students/new', permission: 'can_manage_academic' },
      { label: 'Inscriptions', icon: FileText, path: '/enrollments', permission: 'can_manage_academic' },
    ],
  },
  {
    title: 'Académique',
    items: [
      { label: 'Années académiques', icon: Calendar, path: '/academic-years', permission: 'can_manage_academic' },
      { label: 'Programmes', icon: School, path: '/programs', permission: 'can_manage_academic' },
      { label: 'Niveaux', icon: Layers, path: '/levels', permission: 'can_manage_academic' },
      { label: 'Enseignants', icon: GraduationCap, path: '/teachers', permission: 'can_manage_academic' },
      { label: 'Modules', icon: BookOpen, path: '/modules', permission: 'can_manage_academic' },
      { label: 'Matières', icon: BookMarked, path: '/subjects', permission: 'can_manage_academic' },
      { label: 'Saisie des notes', icon: ClipboardList, path: '/grades', permission: 'can_manage_grades' },
      { label: 'Moyennes & classements', icon: Award, path: '/rankings', permission: 'can_manage_grades' },
    ],
  },
  {
    title: 'Finances',
    items: [
      { label: 'Frais de scolarité', icon: CreditCard, path: '/fees', permission: 'can_manage_finances' },
      { label: 'Paiements', icon: Receipt, path: '/payments', permission: 'can_manage_finances' },
      { label: 'Fascicules', icon: Package, path: '/booklets', permission: 'can_manage_finances' },
      { label: 'Stock', icon: Package, path: '/stock', permission: 'can_manage_finances' },
    ],
  },
  {
    title: 'Cartes & Documents',
    items: [
      { label: 'Cartes d\'étudiant', icon: IdCardIcon, path: '/cards', permission: 'can_manage_academic' },
      { label: 'Documents', icon: FileText, path: '/documents', permission: 'can_manage_academic' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Utilisateurs', icon: UsersRound, path: '/users', permission: 'can_manage_users' },
      { label: 'Rôles & permissions', icon: Shield, path: '/roles', permission: 'can_manage_users' },
      { label: 'Paramètres', icon: Settings, path: '/settings', permission: 'can_manage_users' },
      { label: 'Journal d\'audit', icon: FileBarChart, path: '/audit', permission: 'can_manage_users' },
      { label: 'Contrôle anomalies', icon: AlertTriangle, path: '/archives', permission: 'can_manage_users' },
    ],
  },
];

export function Layout({ children }: { children: ReactNode }) {
  const { route, navigate } = useRouter();
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const currentPath = route.path;

  const filteredSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (profile?.role?.name === 'super_admin') return true;
      if (item.permission) {
        return !!(profile as any)?.[item.permission];
      }
      if (item.roles) {
        return profile?.role?.name && item.roles.includes(profile.role.name);
      }
      return true;
    }),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:translate-x-0 z-40 w-64 h-screen bg-ibr-900 text-white transition-transform duration-200 ease-in-out flex flex-col`}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-ibr-800">
          <img src={logoSrc} alt="Logo IBR" className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate">IBR Gestion</h1>
            <p className="text-xs text-ibr-300 truncate">Académique</p>
          </div>
          <button
            className="lg:hidden ml-auto text-ibr-300 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-4">
          {filteredSections.map((section) => (
            <div key={section.title}>
              <p className="px-3 text-xs font-semibold text-ibr-400 uppercase tracking-wider mb-1">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = currentPath === item.path || currentPath.startsWith(item.path + '/');
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active
                          ? 'bg-ibr-700 text-white font-medium'
                          : 'text-ibr-200 hover:bg-ibr-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-ibr-800 p-3">
          <div className="flex items-center gap-2 text-xs text-ibr-400">
            <span>© {new Date().getFullYear()} IBR Bonoua</span>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden text-gray-600 hover:text-gray-900"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
              <img src={logoSrc} alt="IBR" className="hidden sm:block w-8 h-8 rounded-lg object-contain" />
              <h2 className="text-lg font-semibold text-gray-900">
                {getPageTitle(currentPath)}
              </h2>
            </div>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-ibr-700 text-white flex items-center justify-center text-sm font-medium">
                  {profile?.first_name?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{profile?.role?.label ?? 'Utilisateur'}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 animate-scale-in">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {profile?.first_name} {profile?.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{profile?.role?.label}</p>
                    </div>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-lg"
                    >
                      <LogOut className="w-4 h-4" />
                      Déconnexion
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}

function getPageTitle(path: string): string {
  const titles: Record<string, string> = {
    '/dashboard': 'Tableau de bord',
    '/students': 'Étudiants',
    '/students/new': 'Nouvel étudiant',
    '/enrollments': 'Inscriptions',
    '/academic-years': 'Années académiques',
    '/programs': 'Programmes',
    '/levels': 'Niveaux',
    '/teachers': 'Enseignants',
    '/modules': 'Modules',
    '/subjects': 'Matières',
    '/grades': 'Saisie des notes',
    '/rankings': 'Moyennes & classements',
    '/fees': 'Frais de scolarité',
    '/payments': 'Paiements',
    '/booklets': 'Fascicules',
    '/stock': 'Stock',
    '/cards': 'Cartes d\'étudiant',
    '/documents': 'Documents',
    '/users': 'Utilisateurs',
    '/roles': 'Rôles & permissions',
    '/settings': 'Paramètres',
    '/audit': 'Journal d\'audit',
    '/archives': 'Contrôle anomalies',
  };
  if (titles[path]) return titles[path];
  if (path.startsWith('/students/')) return 'Fiche étudiant';
  return 'IBR Gestion Académique';
}
