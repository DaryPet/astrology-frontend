import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Chart from './pages/Chart'
import Synastry from './pages/Synastry'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Logout from './pages/Logout'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chart/:id" element={<Chart />} />
        <Route path="/synastry" element={<Synastry />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/logout" element={<Logout />} />
      </Routes>
    </div>
  )
}

export default App
