import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Chart from './pages/Chart'
import Synastry from './pages/Synastry'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chart/:id" element={<Chart />} />
        <Route path="/synastry" element={<Synastry />} />
      </Routes>
    </div>
  )
}

export default App
