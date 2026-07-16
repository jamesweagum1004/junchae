import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { DataProvider } from './context/DataContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import MainPage from './pages/MainPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';

function DynamicRouter() {
  const location = useLocation();
  const { adminPath } = useAdminAuth();
  const path = location.pathname.replace(/^\/+/, '');

  if (path === '') return <MainPage />;
  if (path === adminPath) return <AdminPage />;
  return <NotFoundPage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <AdminAuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/*" element={<DynamicRouter />} />
            </Routes>
          </BrowserRouter>
        </AdminAuthProvider>
      </DataProvider>
    </ThemeProvider>
  );
}
