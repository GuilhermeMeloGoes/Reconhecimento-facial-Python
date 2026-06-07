import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import PortalLayout from './components/PortalLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Reconhecimento from './pages/Reconhecimento'
import Alunos from './pages/Alunos'
import Cadastrar from './pages/Cadastrar'
import Relatorio from './pages/Relatorio'
import GerenciarUsuarios from './pages/GerenciarUsuarios'
import PortalDashboard from './pages/portal/PortalDashboard'
import PortalPresencas from './pages/portal/PortalPresencas'
import PortalRelatorio from './pages/portal/PortalRelatorio'

function RootRedirect() {
  const { usuario, loading } = useAuth()
  if (loading) return null
  if (!usuario) return <Navigate to="/login" replace />
  if (usuario.perfil === 'aluno') return <Navigate to="/portal" replace />
  return <Navigate to="/" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />

          {/* Admin routes */}
          <Route element={
            <ProtectedRoute requiredRole="admin">
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="/"               element={<Dashboard />} />
            <Route path="/reconhecimento" element={<Reconhecimento />} />
            <Route path="/alunos"         element={<Alunos />} />
            <Route path="/cadastrar"      element={<Cadastrar />} />
            <Route path="/relatorio"      element={<Relatorio />} />
            <Route path="/usuarios"       element={<GerenciarUsuarios />} />
          </Route>

          {/* Student/Parent portal routes */}
          <Route element={
            <ProtectedRoute requiredRole="aluno">
              <PortalLayout />
            </ProtectedRoute>
          }>
            <Route path="/portal"            element={<PortalDashboard />} />
            <Route path="/portal/presencas"  element={<PortalPresencas />} />
            <Route path="/portal/relatorio"  element={<PortalRelatorio />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}