import {useEffect,useState} from 'react';
import {ArrowUpRight,Calendar,Heart,MapPin,Search,Sparkles} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {AppLayout} from '../components/Layout';
import {api,request} from '../lib/api';
import {Badge,Button,Card,Toast} from '../components/ui';

export default function Charities(){
  const nav=useNavigate();
  const token=localStorage.getItem('dh_token');
  const [items,setItems]=useState<any[]>([]);
  const [q,setQ]=useState('');
  const [category,setCategory]=useState('');
  const [selected,setSelected]=useState<any>(null);
  const [percent,setPercent]=useState(10);
  const [msg,setMsg]=useState('');
  const [donation,setDonation]=useState('250');

  const load=()=>{
    request<any>(()=>api.get('/charities',{params:{q,category:category||undefined}}))
      .then(d=>setItems(d.charities||[]))
      .catch(e=>setMsg(e.message));
  };

  useEffect(()=>{load()},[category]);

  const handleSearch=(e:React.FormEvent)=>{
    e.preventDefault();
    load();
  };

  const donate=async()=>{
    if(!token){
      nav('/signup');
      return;
    }
    try{
      await request(()=>api.post('/donations',{charityId:selected.id,amount:Number(donation)}));
      setMsg(`₹${Number(donation).toLocaleString('en-IN')} donation recorded for ${selected.name}. Thank you for your impact!`);
      setSelected(null);
    }catch(e:any){
      setMsg(e.message);
    }
  };

  const choose=async()=>{
    if(!token){
      nav('/signup');
      return;
    }
    try{
      await request(()=>api.put('/profile/charity',{charityId:selected.id,charityPercent:percent}));
      setMsg(`Success: ${selected.name} is now your selected cause (${percent}% share).`);
      setSelected(null);
    }catch(e:any){
      setMsg(e.message || 'Cause selection is available after activating a membership.');
    }
  };

  return (
    <AppLayout>
      <div className="page-head">
        <div>
          <span className="eyebrow">04 · IMPACT DIRECTORY</span>
          <h1>Choose your <em>cause.</em></h1>
          <p>Every Digital Heroes subscriber directs 10% to 50% of their subscription fee toward a verified charitable mission.</p>
        </div>
      </div>

      {msg&&<Toast message={msg}/>}

      <div className="directory-tools">
        <form onSubmit={handleSearch} className="search">
          <Search size={18}/>
          <input
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Search causes, missions, places…"
          />
        </form>
        <div className="category-pills">
          <button className={category===''?'active':''} onClick={()=>{setCategory('');setQ('');}}>All</button>
          <button className={category==='Youth'?'active':''} onClick={()=>setCategory('Youth')}>Youth</button>
          <button className={category==='Environment'?'active':''} onClick={()=>setCategory('Environment')}>Environment</button>
          <button className={category==='Health'?'active':''} onClick={()=>setCategory('Health')}>Health</button>
          <button className={category==='Education'?'active':''} onClick={()=>setCategory('Education')}>Education</button>
        </div>
      </div>

      <div className="charity-grid">
        {items.map(c=>{
          let events = [];
          try { events = typeof c.upcoming_events === 'string' ? JSON.parse(c.upcoming_events) : (c.upcoming_events || []); } catch { events = []; }
          return (
            <Card className="charity-card" key={c.id}>
              <div className="charity-img" style={{backgroundImage:`url(${c.image_url})`}}>
                <Badge tone={c.featured?'mint':'neutral'}>{c.featured?'Spotlight':c.category}</Badge>
                <button onClick={()=>setSelected(c)} aria-label="Select cause"><Heart size={17}/></button>
              </div>
              <div className="charity-content">
                <span className="eyebrow"><MapPin size={12} style={{display:'inline',marginRight:4}}/>{c.location}</span>
                <h3>{c.name}</h3>
                <p>{c.description}</p>
                {events.length > 0 && (
                  <div className="charity-event-preview">
                    <Calendar size={13}/>
                    <span>Golf Day: {events[0].title}</span>
                  </div>
                )}
                <div className="charity-foot">
                  <span><b>{c.impact}</b><small>documented impact</small></span>
                  <button className="text-link" onClick={()=>setSelected(c)}>
                    View profile <ArrowUpRight size={14}/>
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {selected&&(
        <div className="modal-backdrop" onClick={()=>setSelected(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <button className="modal-close" onClick={()=>setSelected(null)}>×</button>
            <div className="modal-cover" style={{backgroundImage:`url(${selected.image_url})`}}/>
            <span className="eyebrow">{selected.category} · {selected.location}</span>
            <h2>{selected.name}</h2>
            <p>{selected.description}</p>

            <div className="modal-impact-badge">
              <Sparkles size={16}/> Impact metric: <b>{selected.impact}</b>
            </div>

            {/* § 08.2: Upcoming Events such as Golf Days */}
            {(()=>{
              let events = [];
              try { events = typeof selected.upcoming_events === 'string' ? JSON.parse(selected.upcoming_events) : (selected.upcoming_events || []); } catch { events = []; }
              return (
                <div className="upcoming-events-box">
                  <h4><Calendar size={15} style={{display:'inline',marginRight:6}}/> Upcoming Events & Golf Days</h4>
                  {events.length ? events.map((ev:any, idx:number)=>(
                    <div className="event-item" key={idx}>
                      <div className="event-item-header">
                        <strong>{ev.title}</strong>
                        <span>{ev.date}</span>
                      </div>
                      <small><MapPin size={11} style={{display:'inline',marginRight:4}}/>{ev.location}</small>
                      {ev.description&&<p>{ev.description}</p>}
                    </div>
                  )) : (
                    <p className="muted">Next charity golf day announcement coming soon.</p>
                  )}
                </div>
              );
            })()}

            {token ? (
              <>
                <div className="cause-selector">
                  <label>Your subscription contribution: <b>{percent}%</b></label>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={percent}
                    onChange={e=>setPercent(Number(e.target.value))}
                  />
                  <small>PRD Rule: Minimum 10% of subscription fee · voluntary increase up to 50%</small>
                </div>
                <Button onClick={choose}>Set as my charity recipient</Button>
              </>
            ) : (
              <div className="guest-cta-box">
                <p>Join Digital Heroes to direct 10%–50% of your membership to {selected.name}.</p>
                <Button onClick={()=>nav('/signup')}>Create account & select cause</Button>
              </div>
            )}

            <div className="donation-box">
              <label>Independent donation <b>₹{Number(donation).toLocaleString('en-IN')}</b></label>
              <input
                type="number"
                min="10"
                value={donation}
                onChange={e=>setDonation(e.target.value)}
                placeholder="250"
              />
              <button onClick={donate}>
                {token ? 'Donate without gameplay' : 'Log in to donate'} <ArrowUpRight size={13}/>
              </button>
              <small>Independent contribution, not tied to gameplay (§ 08.1)</small>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
