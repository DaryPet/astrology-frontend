import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app">
      {/* Навигация */}
      <nav style={{
        backgroundColor: 'var(--nav-bg)',
        padding: '15px 30px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <Link 
            to="/" 
            style={{
              color: 'var(--text-primary)',
              textDecoration: 'none',
              fontSize: '20px',
              fontWeight: 'bold'
            }}
          >
            Астрология
          </Link>
          
          {isAuthenticated && (
            <>
              <Link 
                to="/" 
                style={{
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  fontSize: '16px'
                }}
              >
                Главная
              </Link>
            </>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {isAuthenticated ? (
            <>
              <span style={{ color: 'var(--text-secondary)' }}>
                Привет, {user?.name}!
              </span>
              <button
                onClick={handleLogout}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link 
                to="/login" 
                style={{
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  fontSize: '16px'
                }}
              >
                Вход
              </Link>
              <Link 
                to="/register" 
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--button-primary)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                Регистрация
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Основной контент */}
      <div style={{ padding: '30px' }}>
        <Routes>
          <Route path="/" element={isAuthenticated ? <Home /> : <Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
