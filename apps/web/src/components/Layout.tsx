import {ReactNode,useEffect,useState} from 'react'; import {Link,useLocation,useNavigate} from 'react-router-dom'; import {BarChart3,HeartHandshake,Home,LogOut,Menu,Settings,ShieldCheck,Trophy,X,ChevronRight} from 'lucide-react';
import {PublicNav} from './PublicNav';

const userNav=[['/dashboard','Overview',Home],['/scores','Scores',BarChart3],['/charities','Charity',HeartHandshake],['/draws','Draws',Trophy]] as const;

export function AppLayout({children,admin=false}:{children:ReactNode,admin?:boolean}){
  const loc=useLocation();
  const nav=useNavigate();
  const [open,setOpen]=useState(false);
  const token = localStorage.getItem('dh_token');
  const name=localStorage.getItem('dh_name')||'Alex';

  useEffect(()=>setOpen(false),[loc.pathname]);

  const logout=()=>{
    localStorage.clear();
    nav('/login');
  };

  // If user is not logged in, render a public wrapper with PublicNav
  if(!token){
    return (
      <div className="landing" style={{minHeight:'100vh',display:'flex',flexDirection:'column'}}>
        <PublicNav/>
        <div style={{maxWidth:1180,width:'100%',margin:'0 auto',padding:'3rem 1.5rem 6rem',flex:1}}>
          {children}
        </div>
        <footer>
          <div className="brand light">
            <span className="brand-mark">D</span>
            <div>digital<span>heroes</span><small>PLAY · WIN · GIVE</small></div>
          </div>
          <span>Built for people who want their game to mean a little more.</span>
          <span>© 2026 Digital Heroes</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className={open?'sidebar open':'sidebar'}>
        <div className="brand">
          <span className="brand-mark">D</span>
          <div>digital<span>heroes</span><small>PLAY · WIN · GIVE</small></div>
        </div>
        <nav>
          {userNav.map(([to,label,Icon])=>(
            <Link className={loc.pathname===to?'active':''} to={to} key={to}>
              <Icon size={18}/>{label}
            </Link>
          ))}
          {admin&& (
            <Link className={loc.pathname.startsWith('/admin')?'active':''} to="/admin">
              <ShieldCheck size={18}/>Admin studio
            </Link>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-mini">
            <div className="avatar">{name[0]}</div>
            <div><b>{name}</b><small>{admin?'Administrator':'Member'}</small></div>
          </div>
          <button className="logout" onClick={logout} title="Log out">
            <LogOut size={17}/>
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button className="menu" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
          <div className="crumb">
            <span>Digital Heroes</span>
            <ChevronRight size={15}/>
            <b>{loc.pathname.startsWith('/admin')?'Admin Studio':loc.pathname.slice(1)||'Overview'}</b>
          </div>
          <div className="top-actions">
            <button className="icon-btn"><Settings size={17}/></button>
            <div className="avatar small">{name[0]}</div>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
