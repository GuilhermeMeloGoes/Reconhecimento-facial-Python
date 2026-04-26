import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Reconhecimento from './pages/Reconhecimento'
import Alunos from './pages/Alunos'
import Cadastrar from './pages/Cadastrar'
import Relatorio from './pages/Relatorio'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/"             element={<Dashboard />} />
          <Route path="/reconhecimento" element={<Reconhecimento />} />
          <Route path="/alunos"       element={<Alunos />} />
          <Route path="/cadastrar"    element={<Cadastrar />} />
          <Route path="/relatorio"    element={<Relatorio />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}