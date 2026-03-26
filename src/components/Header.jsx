// import React, { useState, useEffect } from 'react';
// import { useNavigate, Link } from 'react-router-dom';
// import { authAPI } from '../services/authApi';

// const Header = () => {
//   const navigate = useNavigate();
//   const [isLoggedIn, setIsLoggedIn] = useState(false);
//   const [user, setUser] = useState(null);

//   // Проверяем авторизацию при загрузке
//   useEffect(() => {
//     checkAuth();
//   }, []);

//   const checkAuth = async () => {
//     try {
//       const token = localStorage.getItem('auth_token');
//       if (token) {
//         const userData = await authAPI.getCurrentUser();
//         setUser(userData);
//         setIsLoggedIn(true);
//       }
//     } catch (error) {
//       console.log('Пользователь не авторизован');
//       localStorage.removeItem('auth_token');
//     }
//   };

//   const handleLogout = () => {
//     // Перенаправляем на страницу logout
//     navigate('/logout');
//   };

//   return (
//     <header className="header">
//       <div className="container header-content">
//         <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
//           Астрология
//         </div>
        
//         <nav className="nav">
//           <Link to="/" className="nav-link">
//             Главная
//           </Link>
//           <Link to="/synastry" className="nav-link">
//             Синастрия
//           </Link>
          
//           {isLoggedIn ? (
//             <>
//               <Link to="/dashboard" className="nav-link">
//                 Dashboard
//               </Link>
//               <div className="user-info">
//                 <span className="user-name">{user?.name || user?.email}</span>
//                 <button className="btn-logout" onClick={handleLogout}>
//                   Выйти
//                 </button>
//               </div>
//             </>
//           ) : (
//             <div className="auth-buttons">
//               <Link to="/login" className="btn-login">
//                 Войти
//               </Link>
//               <Link to="/register" className="btn-register">
//                 Регистрация
//               </Link>
//             </div>
//           )}
//         </nav>
//       </div>
//     </header>
//   );
// };

// export default Header;
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="container header-content">
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          Астрология
        </div>
        <nav className="nav">
          <Link to="/" className="nav-link">Главная</Link>
          <Link to="/synastry" className="nav-link">Синастрия</Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <div className="user-info">
                <span className="user-name">{user?.user_metadata?.name || user?.email}</span>
                <button className="btn-logout" onClick={handleLogout}>Выйти</button>
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn-login">Войти</Link>
              <Link to="/register" className="btn-register">Регистрация</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;