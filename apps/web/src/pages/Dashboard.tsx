import {useEffect,useState} from 'react';
import {ArrowUpRight,CalendarDays,CheckCircle,Edit3,Heart,Plus,RotateCcw,ShieldAlert,ShieldCheck,Sparkles,Trash2,Trophy,UploadCloud,X} from 'lucide-react';
import {AppLayout} from '../components/Layout';
import {api,request} from '../lib/api';
import {Badge,Button,Card,Loading,Stat,Toast} from '../components/ui';
import {Link} from 'react-router-dom';

export default function Dashboard(){
  const [data,setData]=useState<any>();
  const [plan,setPlan]=useState<'monthly'|'yearly'>('monthly');
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState('');
  const [scoreModal,setScoreModal]=useState(false);
  const [scoreForm,setScoreForm]=useState({score:'',scoreDate:new Date().toISOString().slice(0,10),editId:''});

  const load=()=>{
    request(()=>api.get('/dashboard'))
      .then(setData)
      .catch(e=>setMsg(e.message));
  };

  useEffect(()=>{
    load();
  },[]);

  if(!data)return <AppLayout><Loading/></AppLayout>;

  const u=data.user;
  const active=u.subscriptionStatus==='active';
  const scores=data.scores||[];
  const avg=scores.length?Math.round(scores.reduce((a:any,b:any)=>a+b.score,0)/scores.length):0;

  const uploadProof=async(id:string,file:File)=>{
    const fd=new FormData();
    fd.append('proof',file);
    try{
      await request(()=>api.post('/winners/'+id+'/proof',fd,{headers:{'Content-Type':'multipart/form-data'}}));
      setMsg('Scorecard proof uploaded for administrator review.');
      load();
    }catch(e:any){
      setMsg(e.message);
    }
  };

  const subscribe=async()=>{
    setBusy(true);
    try{
      await request(()=>api.post('/subscriptions/checkout',{plan}));
      setMsg(`Your ${plan} membership is now active.`);
      load();
    }catch(e:any){
      setMsg(e.message);
    }finally{
      setBusy(false);
    }
  };

  const cancelSub=async()=>{
    if(!confirm('Are you sure you want to cancel your membership renewal?'))return;
    setBusy(true);
    try{
      await request(()=>api.post('/subscriptions/cancel'));
      setMsg('Membership cancelled.');
      load();
    }catch(e:any){
      setMsg(e.message);
    }finally{
      setBusy(false);
    }
  };

  const saveScore=async(e:React.FormEvent)=>{
    e.preventDefault();
    try{
      if(scoreForm.editId){
        await request(()=>api.put('/scores/'+scoreForm.editId,{score:Number(scoreForm.score),scoreDate:scoreForm.scoreDate}));
        setMsg('Score updated successfully.');
      }else{
        await request(()=>api.post('/scores',{score:Number(scoreForm.score),scoreDate:scoreForm.scoreDate}));
        setMsg('Score logged successfully.');
      }
      setScoreModal(false);
      setScoreForm({score:'',scoreDate:new Date().toISOString().slice(0,10),editId:''});
      load();
    }catch(e:any){
      setMsg(e.message);
    }
  };

  const removeScore=async(id:string)=>{
    if(!confirm('Delete this score entry?'))return;
    try{
      await request(()=>api.delete('/scores/'+id));
      setMsg('Score deleted.');
      load();
    }catch(e:any){
      setMsg(e.message);
    }
  };

  return (
    <AppLayout admin={localStorage.getItem('dh_role')==='admin'}>
      <div className="page-head">
        <div>
          <span className="eyebrow">MEMBER DASHBOARD · {new Date().toLocaleDateString('en-GB',{month:'long',year:'numeric'}).toUpperCase()}</span>
          <h1>Make your game <em>matter.</em></h1>
          <p>Welcome back, {u.name.split(' ')[0]}. Track your performance, draw participation, and charity impact.</p>
        </div>
        <div className="head-actions">
          {active ? (
            <button className="btn btn-secondary" onClick={()=>{setScoreForm({score:'',scoreDate:new Date().toISOString().slice(0,10),editId:''});setScoreModal(true);}}>
              <Plus size={16}/> Log round
            </button>
          ) : (
            <Link className="btn btn-primary" to="/scores">
              View scorebook <ArrowUpRight size={16}/>
            </Link>
          )}
        </div>
      </div>

      {msg&&<Toast message={msg}/>}

      {/* § 10 Module 1: Subscription Status */}
      {!active ? (
        <Card className="upgrade">
          <div>
            <span className="eyebrow">YOUR MEMBERSHIP STATUS</span>
            <h2>Unlock the full Digital Heroes loop.</h2>
            <p>Activate a monthly or yearly plan to enter monthly prize draws and direct 10%–50% of your subscription to your chosen cause.</p>
          </div>
          <div className="plan-picker">
            <button className={plan==='monthly'?'selected':''} onClick={()=>setPlan('monthly')}>
              <b>Monthly Plan</b>
              <span>₹999 / month</span>
            </button>
            <button className={plan==='yearly'?'selected':''} onClick={()=>setPlan('yearly')}>
              <b>Yearly Plan</b>
              <span>₹9,990 / year</span>
              <small>save 16% annually</small>
            </button>
            <Button onClick={subscribe} disabled={busy}>
              {busy?'Activating…':'Activate plan'}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="status-banner">
          <div className="status-icon"><ShieldCheck/></div>
          <div style={{flex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <b>Membership Active</b>
              <Badge tone="success">Active</Badge>
            </div>
            <span>
              {u.plan==='yearly'?'Annual':'Monthly'} subscription · Next renewal on{' '}
              {new Date(u.renewalDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
            </span>
          </div>
          <button className="btn btn-ghost danger-text" onClick={cancelSub} disabled={busy}>
            Cancel subscription
          </button>
        </div>
      )}

      {/* Key Metrics */}
      <div className="stats-grid">
        <Stat
          label="LATEST STABLEFORD"
          value={scores[0]?.score??'—'}
          detail={scores[0]?`on ${new Date(scores[0].scoreDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}`:'Add your first round'}
          accent
        />
        <Stat
          label="5-ROUND AVERAGE"
          value={avg||'—'}
          detail={`${scores.length} of 5 scores active`}
        />
        <Stat
          label="TOTAL WON"
          value={`₹${Number(u.totalWon||0).toLocaleString('en-IN')}`}
          detail={data.winners.length?`${data.winners.length} winning entry`:'No winnings yet'}
        />
        <Stat
          label="CHARITY SHARE"
          value={`${u.charityPercent}%`}
          detail={data.charity?.name||'Choose a cause'}
        />
      </div>

      <div className="dashboard-grid">
        {/* § 10 Module 2: Score Entry & Edit Interface */}
        <Card className="score-panel">
          <div className="card-heading">
            <div>
              <span className="eyebrow">YOUR PERFORMANCE</span>
              <h3>Last 5 Stableford scores</h3>
            </div>
            <div style={{display:'flex',gap:8}}>
              {active && (
                <button className="text-link" onClick={()=>{setScoreForm({score:'',scoreDate:new Date().toISOString().slice(0,10),editId:''});setScoreModal(true);}}>
                  + Quick log
                </button>
              )}
              <Link to="/scores">Full scorebook <ArrowUpRight size={14}/></Link>
            </div>
          </div>
          <div className="score-list">
            {scores.length ? scores.map((s:any,i:number)=>(
              <div className="score-row" key={s.id}>
                <span className="score-date">
                  <b>{new Date(s.scoreDate).toLocaleDateString('en-GB',{day:'2-digit'})}</b>
                  <small>{new Date(s.scoreDate).toLocaleDateString('en-GB',{month:'short'})}</small>
                </span>
                <div className="score-bar">
                  <i style={{width:`${Math.min(100,(s.score/45)*100)}%`}}/>
                </div>
                <strong>{s.score}</strong>
                <span className="score-rank">{i===0?'Latest':'Round '+(i+1)}</span>
                {active && (
                  <div className="score-actions">
                    <button onClick={()=>{setScoreForm({score:String(s.score),scoreDate:s.scoreDate,editId:s.id});setScoreModal(true);}} title="Edit score">
                      <Edit3 size={14}/>
                    </button>
                    <button className="danger-icon" onClick={()=>removeScore(s.id)} title="Delete score">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                )}
              </div>
            )) : (
              <div className="empty">Your last five rounds will appear here. Click "Log round" to add your latest score.</div>
            )}
          </div>
          <small className="muted" style={{display:'block',marginTop:12}}>
            PRD Rule: Exactly 5 scores retained. New rounds automatically replace the oldest stored score. One score per date.
          </small>
        </Card>

        {/* § 10 Module 3: Selected Charity & Contribution Percentage */}
        <Card className="cause-card">
          <div className="cause-image" style={{backgroundImage:`url(${data.charity?.image_url})`}}>
            <span>YOUR CAUSE</span>
          </div>
          <div className="cause-body">
            <span className="eyebrow">GIVING WITH PURPOSE</span>
            <h3>{data.charity?.name||'Choose a charity'}</h3>
            <p>{data.charity?.impact||'Pick a cause to start your impact story.'}</p>
            <div className="cause-meta">
              <Heart size={15}/>
              <b>{u.charityPercent}%</b>
              <span>of subscription directed here</span>
            </div>
            <Link to="/charities" className="btn btn-secondary" style={{marginTop:'auto'}}>
              Change cause or percentage <ArrowUpRight size={14}/>
            </Link>
          </div>
        </Card>
      </div>

      <div className="dashboard-grid lower">
        {/* § 10 Module 4: Participation Summary (Draws Entered & Upcoming Draws) */}
        <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">PARTICIPATION SUMMARY</span>
              <h3>Draws entered & upcoming</h3>
            </div>
            <Link to="/draws">All draws <ArrowUpRight size={14}/></Link>
          </div>

          <div className="participation-box">
            <div className="draw-participation-current">
              <div className="part-header">
                <b>Current Draw ({new Date().toISOString().slice(0,7)})</b>
                <Badge tone={active?'success':'warning'}>
                  {active ? (scores.length >= 5 ? 'Entered · 5/5 scores' : `Entered · ${scores.length}/5 scores`) : 'Membership required'}
                </Badge>
              </div>
              <p className="muted">
                {active
                  ? `Your latest five Stableford scores (${scores.map((s:any)=>s.score).join(', ')||'none yet'}) will be matched against the winning numbers.`
                  : 'Activate your membership to be entered in the upcoming monthly draw.'}
              </p>
            </div>

            <div className="upcoming-draws-list">
              <span className="eyebrow" style={{marginBottom:8}}>PUBLISHED & RECENT DRAWS</span>
              {data.draws.length ? data.draws.slice(0,3).map((d:any)=>(
                <div className="draw-row" key={d.id}>
                  <div className="draw-date">
                    <CalendarDays size={16}/>
                    <span>{d.month}</span>
                  </div>
                  <div>
                    <b>{d.status==='published'?'Published Draw':'Next Draw'}</b>
                    <small>{d.winningNumbers ? JSON.parse(d.winningNumbers).join(' · ') : 'Revealed at publish'}</small>
                  </div>
                  <Badge tone={d.status==='published'?'success':'mint'}>{d.status}</Badge>
                </div>
              )) : (
                <div className="empty"><Sparkles size={16}/> Next draw announcement in progress.</div>
              )}
            </div>
          </div>
        </Card>

        {/* § 10 Module 5: Winnings Overview & Current Payment Status */}
        <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">WINNINGS OVERVIEW</span>
              <h3>Rewards & payout status</h3>
            </div>
            <Trophy size={20}/>
          </div>

          {data.winners.length ? data.winners.map((w:any)=>(
            <div className="winner-row" key={w.id} style={{flexWrap:'wrap',gap:8}}>
              <div className="winner-medal">{w.match_type?.split('-')[0]}</div>
              <div style={{flex:1}}>
                <b>{w.match_type}</b>
                <div style={{display:'flex',gap:6,alignItems:'center',marginTop:2}}>
                  <small>{w.month}</small>
                  <span className="dot" style={{width:4,height:4,background:'currentColor',borderRadius:'50%'}}/>
                  <Badge tone={w.verification_status==='approved'?'success':w.verification_status==='rejected'?'danger':'warning'}>
                    Verification: {w.verification_status}
                  </Badge>
                  <Badge tone={w.payout_status==='paid'?'success':'neutral'}>
                    Payout: {w.payout_status}
                  </Badge>
                </div>
              </div>
              <strong>₹{Number(w.prize).toLocaleString('en-IN')}</strong>

              {/* Proof upload if verification is pending */}
              {w.verification_status==='pending' && (
                <div style={{width:'100%',marginTop:8,padding:'8px 12px',background:'var(--surface-sunken)',borderRadius:6}}>
                  <label className="proof-upload-btn">
                    <UploadCloud size={14}/>
                    <span>Upload scorecard screenshot proof</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      style={{display:'none'}}
                      onChange={e=>e.target.files?.[0]&&uploadProof(w.id,e.target.files[0])}
                    />
                  </label>
                  {w.proof_url && (
                    <small style={{display:'block',marginTop:4,color:'var(--accent)'}}>
                      Proof submitted: <a href={w.proof_url} target="_blank" rel="noreferrer">View uploaded document</a>
                    </small>
                  )}
                </div>
              )}
            </div>
          )) : (
            <div className="empty">
              <Trophy size={22}/>
              <h4>No winnings recorded yet</h4>
              <p>Keep your 5 Stableford scores up to date. When winning numbers are published, matches will appear here.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Quick Score Modal */}
      {scoreModal && (
        <div className="modal-backdrop" onClick={()=>setScoreModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:440}}>
            <button className="modal-close" onClick={()=>setScoreModal(false)}>×</button>
            <span className="eyebrow">{scoreForm.editId ? 'EDIT SCORE' : 'LOG A ROUND'}</span>
            <h2>{scoreForm.editId ? 'Update Stableford score' : 'What did you shoot?'}</h2>
            <p className="muted">Stableford score range: 1–45. One score permitted per date.</p>
            <form onSubmit={saveScore}>
              <label>
                Stableford score (1–45)
                <div className="score-input">
                  <input
                    autoFocus
                    required
                    type="number"
                    min="1"
                    max="45"
                    value={scoreForm.score}
                    onChange={e=>setScoreForm({...scoreForm,score:e.target.value})}
                    placeholder="36"
                  />
                  <span>/ 45</span>
                </div>
              </label>
              <label>
                Round date
                <input
                  required
                  type="date"
                  value={scoreForm.scoreDate}
                  onChange={e=>setScoreForm({...scoreForm,scoreDate:e.target.value})}
                />
              </label>
              <Button type="submit">{scoreForm.editId ? 'Save changes' : 'Save score'}</Button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
