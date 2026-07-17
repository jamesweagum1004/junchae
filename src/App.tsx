import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { DataProvider } from './context/DataContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import MainPage from './pages/MainPage';
import AdminPage from './pages/AdminPage';
import CategoryPage from './pages/CategoryPage';
import NotFoundPage from './pages/NotFoundPage';
import SeoHeadManager from './components/SeoHeadManager';

function DynamicRouter() {
  const location = useLocation();
  const { adminPath } = useAdminAuth();
  const path = location.pathname.replace(/^\/+/, '');

  if (path === '') return <MainPage />;
  if (path.startsWith('category/') && path.length > 'category/'.length) return <CategoryPage />;
  if (path === adminPath) return <AdminPage />;
  return <NotFoundPage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <AdminAuthProvider>
          <BrowserRouter>
            <SeoHeadManager />
            <Routes>
              <Route path="/*" element={<DynamicRouter />} />
            </Routes>
          </BrowserRouter>
        </AdminAuthProvider>
      </DataProvider>
    </ThemeProvider>
  );
}
