import {Link,useNavigate} from 'react-router-dom'; import {ArrowUpRight} from 'lucide-react';
export function PublicNav(){
  const nav=useNavigate();
  const logged=!!localStorage.getItem('dh_token');
  return (
    <header className="public-nav">
      <Link to="/" className="brand light">
        <span className="brand-mark">D</span>
        <div>digital<span>heroes</span><small>PLAY · WIN · GIVE</small></div>
      </Link>
      <div className="public-links">
        <Link to="/">Home</Link>
        <Link to="/charities">Causes</Link>
        <Link to="/draws">The Draw</Link>
        <a href="/#how">How it works</a>
      </div>
      <div className="public-actions">
        {logged ? (
          <button className="btn btn-secondary" onClick={()=>nav('/dashboard')}>
            Dashboard <ArrowUpRight size={15}/>
          </button>
        ) : (
          <>
            <Link className="nav-login" to="/login">Log in</Link>
            <Link className="btn btn-primary" to="/signup">
              Join the movement <ArrowUpRight size={15}/>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
