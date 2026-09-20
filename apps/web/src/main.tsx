import React from 'react';import ReactDOM from 'react-dom/client';import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom';import './styles.css';
import Landing from './pages/Landing';import Auth from './pages/Auth';import Dashboard from './pages/Dashboard';import Scores from './pages/Scores';import Charities from './pages/Charities';import Draws from './pages/Draws';import Admin from './pages/Admin';
function Guard({children,admin=false}:{children:React.ReactNode,admin?:boolean}){const token=localStorage.getItem('dh_token');const role=localStorage.getItem('dh_role');if(!token)return <Navigate to="/login" replace/>;if(admin&&role!=='admin')return <Navigate to="/dashboard" replace/>;return <>{children}</>}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing/>}/>
        <Route path="/login" element={<Auth mode="login"/>}/>
        <Route path="/signup" element={<Auth mode="signup"/>}/>
        <Route path="/dashboard" element={<Guard><Dashboard/></Guard>}/>
        <Route path="/scores" element={<Guard><Scores/></Guard>}/>
        <Route path="/charities" element={<Charities/>}/>
        <Route path="/draws" element={<Draws/>}/>
        <Route path="/admin" element={<Guard admin><Admin/></Guard>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
