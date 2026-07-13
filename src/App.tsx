import { AuthProvider, useAuth } from './lib/auth';
import { useRouter } from './lib/router';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsListPage, StudentCreatePage, StudentDetailPage } from './pages/StudentsPage';
import {
  AcademicYearsPage, ProgramsPage, LevelsPage, TeachersPage,
  ModulesPage, SubjectsPage, EnrollmentsPage,
} from './pages/AcademicPages';
import { GradesPage, RankingsPage } from './pages/GradesPage';
import { FeesPage, PaymentsPage, BookletsPage, StockPage } from './pages/FinancePages';
import {
  CardsPage, UsersPage, RolesPage, SettingsPage, AuditPage,
  DocumentsPage, ArchivesPage,
} from './pages/AdminPages';
import { CardVerifyPage } from './pages/CardVerifyPage';
import { LoadingSpinner } from './components/ui';

function AppRoutes() {
  const { route } = useRouter();
  const { profile } = useAuth();

  // Route protection
  const adminOnly = ['/users', '/roles', '/settings', '/audit'];
  if (adminOnly.some((p) => route.path.startsWith(p)) && profile?.role?.name !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">Accès refusé</p>
          <p className="text-sm text-gray-500 mt-1">Vous n'avez pas les permissions nécessaires.</p>
        </div>
      </div>
    );
  }

  switch (route.path) {
    case '/dashboard': return <DashboardPage />;
    case '/students': return <StudentsListPage />;
    case '/students/new': return <StudentCreatePage />;
    default:
      if (route.path.startsWith('/students/')) {
        return <StudentDetailPage studentId={route.path.split('/')[2]} />;
      }
      switch (route.path) {
        case '/enrollments': return <EnrollmentsPage />;
        case '/academic-years': return <AcademicYearsPage />;
        case '/programs': return <ProgramsPage />;
        case '/levels': return <LevelsPage />;
        case '/teachers': return <TeachersPage />;
        case '/modules': return <ModulesPage />;
        case '/subjects': return <SubjectsPage />;
        case '/grades': return <GradesPage />;
        case '/rankings': return <RankingsPage />;
        case '/fees': return <FeesPage />;
        case '/payments': return <PaymentsPage />;
        case '/booklets': return <BookletsPage />;
        case '/stock': return <StockPage />;
        case '/cards': return <CardsPage />;
        case '/documents': return <DocumentsPage />;
        case '/users': return <UsersPage />;
        case '/roles': return <RolesPage />;
        case '/settings': return <SettingsPage />;
        case '/audit': return <AuditPage />;
        case '/archives': return <ArchivesPage />;
        default: return <DashboardPage />;
      }
  }
}

function AppContent() {
  const { session, profile, loading } = useAuth();
  const { route, navigate } = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner label="Chargement..." />
      </div>
    );
  }

  if (route.path.startsWith('/check-card/')) {
    return <CardVerifyPage studentId={route.path.split('/')[2]} />;
  }

  if (!session) {
    return <LoginPage />;
  }

  // Redirect to dashboard by default
  if (route.path === '/' || route.path === '') {
    navigate('/dashboard');
    return null;
  }

  return (
    <Layout>
      <AppRoutes />
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
