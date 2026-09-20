import {FormEvent,useEffect,useState} from 'react';
import {ArrowUpRight,CalendarPlus,CheckCircle2,Edit3,Info,ShieldAlert,Trash2} from 'lucide-react';
import {Link} from 'react-router-dom';
import {AppLayout} from '../components/Layout';
import {api,request} from '../lib/api';
import {Badge,Button,Card,Toast} from '../components/ui';

export default function Scores(){
  const [scores,setScores]=useState<any[]>([]);
  const [user,setUser]=useState<any>(null);
  const [form,setForm]=useState({score:'',scoreDate:new Date().toISOString().slice(0,10)});
  const [edit,setEdit]=useState<string|null>(null);
  const [msg,setMsg]=useState('');

  const load=async()=>{
    try{
      const [sRes,meRes] = await Promise.all([
        request<any>(()=>api.get('/scores')),
        request<any>(()=>api.get('/me'))
      ]);
      setScores(sRes.scores||[]);
      setUser(meRes.user);
    }catch(e:any){
      setMsg(e.message);
    }
  };

  useEffect(()=>{load()},[]);

  const save=async(e:FormEvent)=>{
    e.preventDefault();
    try{
      if(edit){
        await request(()=>api.put('/scores/'+edit,{score:Number(form.score),scoreDate:form.scoreDate}));
        setMsg('Score updated successfully');
      }else{
        await request(()=>api.post('/scores',{score:Number(form.score),scoreDate:form.scoreDate}));
        setMsg('New round logged. Performance history updated.');
      }
      setEdit(null);
      setForm({score:'',scoreDate:new Date().toISOString().slice(0,10)});
      load();
    }catch(e:any){
      setMsg(e.message);
    }
  };

  const remove=async(id:string)=>{
    if(!confirm('Delete this score?'))return;
    try{
      await request(()=>api.delete('/scores/'+id));
      setMsg('Score removed from performance history');
      load();
    }catch(e:any){
      setMsg(e.message);
    }
  };

  const isSubscribed = user?.subscriptionStatus === 'active';

  return (
    <AppLayout admin={localStorage.getItem('dh_role')==='admin'}>
      <div className="page-head">
        <div>
          <span className="eyebrow">02 · PERFORMANCE</span>
          <h1>Your <em>scorebook.</em></h1>
          <p>Stableford format (1–45). Exactly five most recent rounds retained. One score per date.</p>
        </div>
      </div>

      {msg&&<Toast message={msg} type={msg.toLowerCase().includes('error')||msg.toLowerCase().includes('already')||msg.toLowerCase().includes('required')?'error':'success'}/>}

      {!isSubscribed && (
        <div className="status-banner" style={{background:'rgba(217, 119, 6, 0.1)',borderColor:'rgba(217, 119, 6, 0.3)'}}>
          <ShieldAlert style={{color:'#f59e0b'}}/>
          <div style={{flex:1}}>
            <b>Subscription Required to Log Scores</b>
            <p style={{margin:0,fontSize:'0.88rem'}}>
              Non-subscribers have view-only access. Activate your monthly or yearly membership to log scores and enter monthly prize draws.
            </p>
          </div>
          <Link to="/dashboard" className="btn btn-primary" style={{alignSelf:'center'}}>
            Activate membership <ArrowUpRight size={15}/>
          </Link>
        </div>
      )}

      <div className="score-page-grid">
        <Card className="score-form">
          <span className="eyebrow">{edit?'EDIT ROUND':'LOG A ROUND'}</span>
          <h2>{edit?'Update this score.':'What did you shoot?'}</h2>
          <p className="muted">Stableford score range: 1–45. Date must be unique across your rounds.</p>
          
          <form onSubmit={save}>
            <label>
              Stableford score
              <div className="score-input">
                <input
                  autoFocus
                  required
                  type="number"
                  min="1"
                  max="45"
                  value={form.score}
                  onChange={e=>setForm({...form,score:e.target.value})}
                  placeholder="37"
                />
                <span>/ 45</span>
              </div>
            </label>

            <label>
              Round date
              <div className="input-icon">
                <CalendarPlus size={17}/>
                <input
                  required
                  type="date"
                  value={form.scoreDate}
                  onChange={e=>setForm({...form,scoreDate:e.target.value})}
                />
              </div>
            </label>

            <Button type="submit" disabled={!isSubscribed}>
              {edit?'Save changes':'Add score'}
            </Button>

            {edit&& (
              <button
                type="button"
                className="cancel"
                onClick={()=>{setEdit(null);setForm({score:'',scoreDate:new Date().toISOString().slice(0,10)})}}
              >
                Cancel edit
              </button>
            )}
          </form>

          <div className="score-rules-box" style={{marginTop:'1.5rem',padding:'12px',background:'var(--surface-sunken)',borderRadius:8,fontSize:'0.83rem'}}>
            <b><Info size={14} style={{display:'inline',marginRight:4}}/> PRD § 05 Rolling Logic:</b>
            <ul style={{margin:'6px 0 0 16px',padding:0}}>
              <li>Only the latest 5 scores are retained at any time.</li>
              <li>A new score replaces the oldest stored score automatically.</li>
              <li>Scores display in reverse chronological order (most recent first).</li>
              <li>Only one score entry per date (edit or delete existing).</li>
            </ul>
          </div>
        </Card>

        <Card className="score-history">
          <div className="card-heading">
            <div>
              <span className="eyebrow">LAST 5 ROUNDS</span>
              <h3>Performance history</h3>
            </div>
            <span className="history-count">{scores.length} / 5</span>
          </div>

          {scores.length ? scores.map((s,i)=>(
            <div className="history-row" key={s.id}>
              <div className="history-index">0{i+1}</div>
              <div className="history-date">
                <b>{new Date(s.scoreDate).toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})}</b>
                <small>{i===0?'Most recent round':'Previous round'}</small>
              </div>
              <div className="history-meter">
                <i style={{width:`${(s.score/45)*100}%`}}/>
              </div>
              <strong>{s.score}</strong>
              <button onClick={()=>{setEdit(s.id);setForm({score:String(s.score),scoreDate:s.scoreDate})}} title="Edit score">
                <Edit3 size={15}/>
              </button>
              <button className="danger-icon" onClick={()=>remove(s.id)} title="Delete score">
                <Trash2 size={15}/>
              </button>
            </div>
          )) : (
            <div className="empty">No rounds recorded yet. Enter your latest Stableford score to establish your performance history.</div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
