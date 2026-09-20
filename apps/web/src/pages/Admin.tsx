import {useEffect,useState} from 'react';
import {
  BarChart3,Check,Edit3,ExternalLink,HeartHandshake,Layers,Play,Plus,
  RefreshCw,RotateCcw,Search,ShieldAlert,ShieldCheck,Trash2,Trophy,Users,X
} from 'lucide-react';
import {AppLayout} from '../components/Layout';
import {api,request} from '../lib/api';
import {Badge,Button,Card,Loading,Stat,Toast} from '../components/ui';

export default function Admin(){
  const [tab,setTab]=useState<'overview'|'users'|'draw'|'charities'|'winners'>('overview');
  const [stats,setStats]=useState<any>();
  const [users,setUsers]=useState<any[]>([]);
  const [winners,setWinners]=useState<any[]>([]);
  const [charities,setCharities]=useState<any[]>([]);
  const [sim,setSim]=useState<any>();
  const [type,setType]=useState<'random'|'algorithmic'>('random');
  const [msg,setMsg]=useState('');

  // Modals
  const [editUserModal,setEditUserModal]=useState<any>(null);
  const [scoresModal,setScoresModal]=useState<{userId:string,userName:string,scores:any[]}|null>(null);
  const [scoreEditForm,setScoreEditForm]=useState<{id:string,score:number,scoreDate:string}|null>(null);
  const [charityModal,setCharityModal]=useState<any>(null); // null = closed, {} = add, {id,...} = edit
  const [proofPreview,setProofPreview]=useState<string|null>(null);

  const load=async()=>{
    try{
      const [s,u,w,c]=await Promise.all([
        request<any>(()=>api.get('/admin/stats')),
        request<any>(()=>api.get('/admin/users')),
        request<any>(()=>api.get('/admin/winners')),
        request<any>(()=>api.get('/admin/charities'))
      ]);
      setStats(s);
      setUsers(u.users||[]);
      setWinners(w.winners||[]);
      setCharities(c.charities||[]);
    }catch(e:any){
      setMsg(e.message);
    }
  };

  useEffect(()=>{load()},[]);

  if(!stats)return <AppLayout admin><Loading/></AppLayout>;

  // Draw Operations (§ 11.02)
  const simulate=async()=>{
    try{
      setSim(await request(()=>api.post('/draws/simulate',{type})));
      setMsg(`Simulation ready using ${type} mode. Review winning numbers and tier allocation before publishing.`);
    }catch(e:any){
      setMsg(e.message);
    }
  };

  const publish=async()=>{
    if(!sim)return;
    try{
      await request(()=>api.post('/draws/publish',{
        month:new Date().toISOString().slice(0,7),
        type,
        numbers:sim.numbers,
        pool:sim.pool,
        rollover:sim.rollover,
        winners:sim.winners,
        allocated:sim.allocated
      }));
      setMsg('Draw published successfully. Winners recorded in database.');
      setSim(null);
      load();
    }catch(e:any){
      setMsg(e.message);
    }
  };

  // User Management (§ 11.01)
  const saveUserProfile=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!editUserModal)return;
    try{
      await request(()=>api.put('/admin/users/'+editUserModal.id,{
        name:editUserModal.name,
        email:editUserModal.email,
        role:editUserModal.role,
        charityId:editUserModal.charityId||null,
        charityPercent:Number(editUserModal.charityPercent),
        subscriptionStatus:editUserModal.subscriptionStatus,
        plan:editUserModal.plan||null
      }));
      setMsg('User profile updated successfully.');
      setEditUserModal(null);
      load();
    }catch(e:any){
      setMsg(e.message);
    }
  };

  const toggleSubscription=async(userId:string,currentStatus:string)=>{
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try{
      await request(()=>api.put('/admin/users/'+userId+'/subscription',{status:newStatus}));
      setMsg(`Subscription marked as ${newStatus}.`);
      load();
    }catch(e:any){
      setMsg(e.message);
    }
  };

  const openUserScores=async(u:any)=>{
    try{
      const d = await request<any>(()=>api.get('/admin/users/'+u.id+'/scores'));
      setScoresModal({userId:u.id,userName:u.name,scores:d.scores||[]});
    }catch(e:any){
      setMsg(e.message);
    }
  };

  const saveAdminScore=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!scoreEditForm || !scoresModal)return;
    try{
      await request(()=>api.put('/admin/scores/'+scoreEditForm.id,{
        score:Number(scoreEditForm.score),
        scoreDate:scoreEditForm.scoreDate
      }));
      setMsg('Score updated.');
      setScoreEditForm(null);
      openUserScores({id:scoresModal.userId,name:scoresModal.userName});
    }catch(e:any){
      setMsg(e.message);
    }
  };

  const deleteAdminScore=async(scoreId:string)=>{
    if(!confirm('Delete this score?'))return;
    try{
      await request(()=>api.delete('/admin/scores/'+scoreId));
      setMsg('Score deleted.');
      if(scoresModal){
        openUserScores({id:scoresModal.userId,name:scoresModal.userName});
      }
    }catch(e:any){
      setMsg(e.message);
    }
  };

  // Charity Management (§ 11.03)
  const saveCharity=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!charityModal)return;
    try{
      const payload = {
        name: charityModal.name,
        description: charityModal.description,
        category: charityModal.category,
        imageUrl: charityModal.imageUrl,
        impact: charityModal.impact,
        location: charityModal.location,
        featured: Boolean(charityModal.featured),
        active: Boolean(charityModal.active !== false),
        upcomingEvents: charityModal.upcomingEvents ? JSON.stringify(charityModal.upcomingEvents) : undefined
      };
      if(charityModal.id){
        await request(()=>api.put('/admin/charities/'+charityModal.id,payload));
        setMsg('Charity updated successfully.');
      }else{
        await request(()=>api.post('/admin/charities',payload));
        setMsg('New charity created successfully.');
      }
      setCharityModal(null);
      load();
    }catch(e:any){
      setMsg(e.message);
    }
  };

  const deleteCharity=async(id:string)=>{
    if(!confirm('Deactivate this charity?'))return;
    try{
      await request(()=>api.delete('/admin/charities/'+id));
      setMsg('Charity deactivated.');
      load();
    }catch(e:any){
      setMsg(e.message);
    }
  };

  // Winner Verification & Payouts (§ 11.04 & § 09)
  const updateWinner=async(id:string,verificationStatus:'pending'|'approved'|'rejected',payoutStatus:'pending'|'paid')=>{
    try{
      await request(()=>api.put('/admin/winners/'+id,{verificationStatus,payoutStatus}));
      setMsg(`Winner updated: Verification ${verificationStatus}, Payout ${payoutStatus}`);
      load();
    }catch(e:any){
      setMsg(e.message);
    }
  };

  return (
    <AppLayout admin>
      <div className="page-head">
        <div>
          <span className="eyebrow">CONTROL ROOM · ADMINISTRATOR</span>
          <h1>Operate the <em>engine.</em></h1>
          <p>PRD Control Surfaces: User Management, Draw Engine, Charities, Winners Verification & Analytics.</p>
        </div>
        <Button variant="secondary" onClick={load}>
          <RefreshCw size={16}/> Refresh
        </Button>
      </div>

      {msg&&<Toast message={msg}/>}

      <div className="admin-tabs">
        {[
          ['overview','Overview & Stats',BarChart3],
          ['users','User Management',Users],
          ['draw','Draw Studio',Trophy],
          ['winners','Winners & Payouts',ShieldCheck],
          ['charities','Charity Management',HeartHandshake]
        ].map(([k,l,I]:any)=>(
          <button className={tab===k?'active':''} onClick={()=>setTab(k)} key={k}>
            <I size={16}/>{l}
          </button>
        ))}
      </div>

      {/* 05: Reports & Analytics (§ 11.05) */}
      {tab==='overview'&&(
        <>
          <div className="stats-grid">
            <Stat label="TOTAL USERS" value={stats.totalUsers} detail="Registered members"/>
            <Stat label="ACTIVE SUBSCRIBERS" value={stats.activeSubscribers} detail="Contributing to pool"/>
            <Stat label="LIVE PRIZE POOL" value={`₹${Number(stats.prizePool).toLocaleString('en-IN')}`} accent detail="30% of active revenue"/>
            <Stat label="CHARITY CONTRIBUTIONS" value={`₹${Number(stats.charityTotal).toLocaleString('en-IN')}`} detail="Direct donations"/>
          </div>

          <div className="admin-grid">
            <Card>
              <div className="card-heading">
                <div>
                  <span className="eyebrow">DRAW STATISTICS</span>
                  <h3>Performance & Rollovers</h3>
                </div>
                <Trophy size={18}/>
              </div>
              <div className="analytics-details">
                <div className="stat-row">
                  <span>Total Draws Executed:</span>
                  <b>{stats.drawStats?.totalDraws ?? 0}</b>
                </div>
                <div className="stat-row">
                  <span>Current Jackpot Rollover:</span>
                  <b>₹{Number(stats.drawStats?.jackpotRollover || 0).toLocaleString('en-IN')}</b>
                </div>
                <div className="stat-row">
                  <span>Pending Scorecard Verifications:</span>
                  <b>{stats.drawStats?.pendingVerifications ?? 0}</b>
                </div>
                <div className="stat-row">
                  <span>Total Completed Payouts:</span>
                  <b>₹{Number(stats.drawStats?.paidPrizes || 0).toLocaleString('en-IN')}</b>
                </div>
                <div className="stat-row">
                  <span>Pending Payouts:</span>
                  <b>₹{Number(stats.drawStats?.pendingPrizes || 0).toLocaleString('en-IN')}</b>
                </div>
              </div>
            </Card>

            <Card>
              <div className="card-heading">
                <div>
                  <span className="eyebrow">OPERATIONAL STATUS</span>
                  <h3>Engine Health</h3>
                </div>
                <ShieldCheck size={18}/>
              </div>
              <div className="health">
                <div><span className="health-dot"/><b>Database</b><small>SQLite · Foreign keys ON · WAL</small></div>
                <div><span className="health-dot"/><b>Auth</b><small>JWT + Bcrypt · Role guarded</small></div>
                <div><span className="health-dot"/><b>Draw Engine</b><small>Random + Score-frequency weighted</small></div>
                <div><span className="health-dot"/><b>Payment Boundary</b><small>Demo provider · Stripe-ready</small></div>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* 01: User Management (§ 11.01) */}
      {tab==='users'&&(
        <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">USER MANAGEMENT</span>
              <h3>Registered Members ({users.length})</h3>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Plan</th>
                  <th>Cause %</th>
                  <th>Status</th>
                  <th>Total Won</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u=>(
                  <tr key={u.id}>
                    <td>
                      <b>{u.name}</b>
                      <small>{u.email}</small>
                    </td>
                    <td><Badge tone={u.role==='admin'?'mint':'neutral'}>{u.role}</Badge></td>
                    <td>{u.plan ? `${u.plan.toUpperCase()}` : '—'}</td>
                    <td>{u.charityPercent}%</td>
                    <td>
                      <Badge tone={u.subscriptionStatus==='active'?'success':'neutral'}>
                        {u.subscriptionStatus}
                      </Badge>
                    </td>
                    <td>₹{Number(u.totalWon||0).toLocaleString('en-IN')}</td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn-table" onClick={()=>setEditUserModal({...u})} title="Edit user profile">
                          <Edit3 size={13}/> Profile
                        </button>
                        <button className="btn-table" onClick={()=>openUserScores(u)} title="Inspect & edit scores">
                          Scores
                        </button>
                        <button
                          className={`btn-table ${u.subscriptionStatus==='active'?'danger-btn':''}`}
                          onClick={()=>toggleSubscription(u.id,u.subscriptionStatus)}
                        >
                          {u.subscriptionStatus==='active'?'Deactivate':'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 02: Draw Management (§ 11.02) */}
      {tab==='draw'&&(
        <div className="draw-studio">
          <Card className="studio-controls">
            <span className="eyebrow">DRAW ENGINE CONTROLS</span>
            <h2>Simulate before you publish.</h2>
            <p>Configure draw logic, run simulation against active member scores, inspect tier breakdown, and publish monthly results.</p>
            <div className="mode-toggle">
              <button className={type==='random'?'selected':''} onClick={()=>setType('random')}>
                <b>Random</b>
                <small>Standard lottery (1–45)</small>
              </button>
              <button className={type==='algorithmic'?'selected':''} onClick={()=>setType('algorithmic')}>
                <b>Algorithmic</b>
                <small>Weighted by score frequency</small>
              </button>
            </div>
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <Button onClick={simulate}><Play size={16}/> Run simulation</Button>
              {sim&&<Button variant="secondary" onClick={publish}>Publish results</Button>}
            </div>
          </Card>

          {sim ? (
            <Card className="simulation">
              <span className="eyebrow">SIMULATION RESULTS ({type.toUpperCase()})</span>
              <div className="sim-numbers">
                {sim.numbers.map((n:number)=>(
                  <i key={n}>{String(n).padStart(2,'0')}</i>
                ))}
              </div>
              <div className="sim-summary">
                <div><b>₹{Number(sim.pool).toLocaleString('en-IN')}</b><span>Total Pool</span></div>
                <div><b>{sim.activeCount}</b><span>Active Subscribers</span></div>
                <div><b>₹{Number(sim.rollover).toLocaleString('en-IN')}</b><span>Jackpot Rollover</span></div>
              </div>
              <div className="tier-breakdown">
                <div>5 Match (40%): {sim.counts[5]} winners · ₹{Number(sim.allocated[5]||0).toLocaleString('en-IN')} each</div>
                <div>4 Match (35%): {sim.counts[4]} winners · ₹{Number(sim.allocated[4]||0).toLocaleString('en-IN')} each</div>
                <div>3 Match (25%): {sim.counts[3]} winners · ₹{Number(sim.allocated[3]||0).toLocaleString('en-IN')} each</div>
              </div>
              <p className="muted" style={{marginTop:12}}>
                {sim.winners.length} total winning entries detected. Publishing will record winners and carry forward any unclaimed 5-match jackpot.
              </p>
            </Card>
          ) : (
            <Card className="empty large-empty">
              <Trophy size={24}/>
              <h3>No active simulation</h3>
              <p>Select random or algorithmic mode above and click "Run simulation" to preview numbers and allocations.</p>
            </Card>
          )}
        </div>
      )}

      {/* 04: Winners Management (§ 11.04 & § 09) */}
      {tab==='winners'&&(
        <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">WINNER VERIFICATION & PAYOUTS</span>
              <h3>Full Winners List ({winners.length})</h3>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Winner</th>
                  <th>Draw</th>
                  <th>Tier</th>
                  <th>Prize</th>
                  <th>Proof</th>
                  <th>Verification</th>
                  <th>Payout</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {winners.length ? winners.map(w=>(
                  <tr key={w.id}>
                    <td>
                      <b>{w.name}</b>
                      <small>{w.email}</small>
                    </td>
                    <td>{w.month}</td>
                    <td><b>{w.match_type}</b></td>
                    <td><strong>₹{Number(w.prize).toLocaleString('en-IN')}</strong></td>
                    <td>
                      {w.proof_url ? (
                        <button className="text-link" onClick={()=>setProofPreview(w.proof_url)}>
                          <ExternalLink size={13}/> View proof
                        </button>
                      ) : (
                        <small className="muted">No proof uploaded</small>
                      )}
                    </td>
                    <td>
                      <Badge tone={w.verification_status==='approved'?'success':w.verification_status==='rejected'?'danger':'warning'}>
                        {w.verification_status}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={w.payout_status==='paid'?'success':'neutral'}>
                        {w.payout_status}
                      </Badge>
                    </td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        <button
                          className="btn-table success-btn"
                          title="Approve verification"
                          onClick={()=>updateWinner(w.id,'approved',w.payout_status)}
                        >
                          Approve
                        </button>
                        <button
                          className="btn-table danger-btn"
                          title="Reject verification"
                          onClick={()=>updateWinner(w.id,'rejected',w.payout_status)}
                        >
                          Reject
                        </button>
                        <button
                          className="btn-table"
                          title="Toggle payout status"
                          onClick={()=>updateWinner(w.id,w.verification_status,w.payout_status==='paid'?'pending':'paid')}
                        >
                          {w.payout_status==='paid'?'Mark Pending':'Mark Paid'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} style={{textAlign:'center',padding:'2rem'}}>No winners recorded yet. Run and publish a monthly draw.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 03: Charity Management (§ 11.03) */}
      {tab==='charities'&&(
        <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">CHARITY MANAGEMENT</span>
              <h3>Causes & Golf Day Events ({charities.length})</h3>
            </div>
            <Button onClick={()=>setCharityModal({name:'',category:'Youth',description:'',imageUrl:'',impact:'',location:'',featured:false,upcomingEvents:[{title:'',date:'',location:'',description:''}]})}>
              <Plus size={16}/> Add Charity
            </Button>
          </div>

          <div className="admin-charities-grid">
            {charities.map(c=>{
              let events = [];
              try { events = typeof c.upcoming_events === 'string' ? JSON.parse(c.upcoming_events) : (c.upcoming_events||[]); } catch { events = []; }
              return (
                <div className="admin-charity-item" key={c.id}>
                  <img src={c.image_url} alt={c.name}/>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <b>{c.name}</b>
                      <Badge tone={c.featured?'mint':'neutral'}>{c.featured?'Spotlight':c.category}</Badge>
                      {!c.active && <Badge tone="danger">Inactive</Badge>}
                    </div>
                    <small>{c.location} · {c.impact}</small>
                    <p>{c.description}</p>
                    {events.length > 0 && (
                      <div style={{marginTop:6,fontSize:'0.82rem',color:'var(--accent)'}}>
                        <b>Upcoming Golf Day:</b> {events[0].title} ({events[0].date} at {events[0].location})
                      </div>
                    )}
                  </div>
                  <div className="charity-actions">
                    <button
                      className="btn-table"
                      onClick={()=>{
                        setCharityModal({
                          id:c.id,
                          name:c.name,
                          category:c.category,
                          description:c.description,
                          imageUrl:c.image_url,
                          impact:c.impact,
                          location:c.location,
                          featured:Boolean(c.featured),
                          active:Boolean(c.active),
                          upcomingEvents:events.length ? events : [{title:'',date:'',location:'',description:''}]
                        });
                      }}
                    >
                      <Edit3 size={14}/> Edit
                    </button>
                    <button className="btn-table danger-btn" onClick={()=>deleteCharity(c.id)}>
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Edit User Profile Modal */}
      {editUserModal && (
        <div className="modal-backdrop" onClick={()=>setEditUserModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <button className="modal-close" onClick={()=>setEditUserModal(null)}>×</button>
            <span className="eyebrow">USER PROFILE EDIT</span>
            <h2>Edit {editUserModal.name}</h2>
            <form onSubmit={saveUserProfile}>
              <label>
                Full Name
                <input
                  required
                  value={editUserModal.name}
                  onChange={e=>setEditUserModal({...editUserModal,name:e.target.value})}
                />
              </label>
              <label>
                Email
                <input
                  required
                  type="email"
                  value={editUserModal.email}
                  onChange={e=>setEditUserModal({...editUserModal,email:e.target.value})}
                />
              </label>
              <label>
                Role
                <select
                  value={editUserModal.role}
                  onChange={e=>setEditUserModal({...editUserModal,role:e.target.value})}
                >
                  <option value="user">User / Member</option>
                  <option value="admin">Administrator</option>
                </select>
              </label>
              <label>
                Subscription Status
                <select
                  value={editUserModal.subscriptionStatus}
                  onChange={e=>setEditUserModal({...editUserModal,subscriptionStatus:e.target.value})}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label>
                Subscription Plan
                <select
                  value={editUserModal.plan||'monthly'}
                  onChange={e=>setEditUserModal({...editUserModal,plan:e.target.value})}
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </label>
              <label>
                Charity Percentage ({editUserModal.charityPercent}%)
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={editUserModal.charityPercent}
                  onChange={e=>setEditUserModal({...editUserModal,charityPercent:Number(e.target.value)})}
                />
              </label>
              <Button type="submit">Save profile</Button>
            </form>
          </div>
        </div>
      )}

      {/* Inspect & Edit User Scores Modal */}
      {scoresModal && (
        <div className="modal-backdrop" onClick={()=>setScoresModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <button className="modal-close" onClick={()=>setScoresModal(null)}>×</button>
            <span className="eyebrow">SCORE MANAGEMENT (§ 11.01)</span>
            <h2>{scoresModal.userName}'s Stableford Rounds</h2>
            <div className="score-list" style={{margin:'1rem 0'}}>
              {scoresModal.scores.length ? scoresModal.scores.map((s,i)=>(
                <div className="score-row" key={s.id}>
                  <span className="score-date">
                    <b>{new Date(s.scoreDate).toLocaleDateString('en-GB',{day:'2-digit'})}</b>
                    <small>{new Date(s.scoreDate).toLocaleDateString('en-GB',{month:'short'})}</small>
                  </span>
                  <strong>{s.score} pts</strong>
                  <span className="score-rank">Round {i+1}</span>
                  <div className="score-actions">
                    <button onClick={()=>setScoreEditForm({id:s.id,score:s.score,scoreDate:s.scoreDate})}>
                      <Edit3 size={14}/>
                    </button>
                    <button className="danger-icon" onClick={()=>deleteAdminScore(s.id)}>
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              )) : (
                <div className="empty">No scores recorded for this user.</div>
              )}
            </div>

            {scoreEditForm && (
              <form onSubmit={saveAdminScore} style={{borderTop:'1px solid var(--border)',paddingTop:12}}>
                <h4>Edit Score Entry</h4>
                <div style={{display:'flex',gap:10}}>
                  <input
                    type="number"
                    min="1"
                    max="45"
                    value={scoreEditForm.score}
                    onChange={e=>setScoreEditForm({...scoreEditForm,score:Number(e.target.value)})}
                    style={{width:100}}
                    required
                  />
                  <input
                    type="date"
                    value={scoreEditForm.scoreDate}
                    onChange={e=>setScoreEditForm({...scoreEditForm,scoreDate:e.target.value})}
                    required
                  />
                  <button type="submit" className="btn btn-primary">Save</button>
                  <button type="button" className="btn btn-ghost" onClick={()=>setScoreEditForm(null)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Charity Modal */}
      {charityModal && (
        <div className="modal-backdrop" onClick={()=>setCharityModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <button className="modal-close" onClick={()=>setCharityModal(null)}>×</button>
            <span className="eyebrow">CHARITY MANAGEMENT (§ 11.03)</span>
            <h2>{charityModal.id ? 'Edit Charity' : 'Add New Charity'}</h2>
            <form onSubmit={saveCharity}>
              <label>
                Charity Name
                <input
                  required
                  value={charityModal.name}
                  onChange={e=>setCharityModal({...charityModal,name:e.target.value})}
                  placeholder="e.g. Fairway Youth Foundation"
                />
              </label>
              <label>
                Category
                <select
                  value={charityModal.category}
                  onChange={e=>setCharityModal({...charityModal,category:e.target.value})}
                >
                  <option value="Youth">Youth</option>
                  <option value="Environment">Environment</option>
                  <option value="Health">Health</option>
                  <option value="Education">Education</option>
                </select>
              </label>
              <label>
                Description
                <textarea
                  required
                  rows={3}
                  value={charityModal.description}
                  onChange={e=>setCharityModal({...charityModal,description:e.target.value})}
                />
              </label>
              <label>
                Image URL
                <input
                  required
                  type="url"
                  value={charityModal.imageUrl}
                  onChange={e=>setCharityModal({...charityModal,imageUrl:e.target.value})}
                  placeholder="https://images.unsplash.com/..."
                />
              </label>
              <label>
                Impact Metric
                <input
                  required
                  value={charityModal.impact}
                  onChange={e=>setCharityModal({...charityModal,impact:e.target.value})}
                  placeholder="e.g. 5,000 trees planted"
                />
              </label>
              <label>
                Location
                <input
                  required
                  value={charityModal.location}
                  onChange={e=>setCharityModal({...charityModal,location:e.target.value})}
                  placeholder="e.g. Manchester, UK"
                />
              </label>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                <input
                  type="checkbox"
                  checked={Boolean(charityModal.featured)}
                  onChange={e=>setCharityModal({...charityModal,featured:e.target.checked})}
                />
                <b>Spotlight on Homepage (§ 08.2)</b>
              </label>

              {/* Upcoming Event Fields */}
              <div style={{borderTop:'1px solid var(--border)',paddingTop:12,marginTop:12}}>
                <h4>Upcoming Charity Event / Golf Day (§ 08.2)</h4>
                <label>
                  Event Title
                  <input
                    value={charityModal.upcomingEvents?.[0]?.title||''}
                    onChange={e=>{
                      const evs = [...(charityModal.upcomingEvents||[{}])];
                      evs[0] = {...evs[0],title:e.target.value};
                      setCharityModal({...charityModal,upcomingEvents:evs});
                    }}
                    placeholder="Annual Charity Golf Classic"
                  />
                </label>
                <label>
                  Event Date
                  <input
                    type="date"
                    value={charityModal.upcomingEvents?.[0]?.date||''}
                    onChange={e=>{
                      const evs = [...(charityModal.upcomingEvents||[{}])];
                      evs[0] = {...evs[0],date:e.target.value};
                      setCharityModal({...charityModal,upcomingEvents:evs});
                    }}
                  />
                </label>
                <label>
                  Event Location
                  <input
                    value={charityModal.upcomingEvents?.[0]?.location||''}
                    onChange={e=>{
                      const evs = [...(charityModal.upcomingEvents||[{}])];
                      evs[0] = {...evs[0],location:e.target.value};
                      setCharityModal({...charityModal,upcomingEvents:evs});
                    }}
                    placeholder="e.g. Royal Parkland Golf Club"
                  />
                </label>
              </div>

              <Button type="submit">{charityModal.id ? 'Save changes' : 'Create charity'}</Button>
            </form>
          </div>
        </div>
      )}

      {/* Proof Preview Modal */}
      {proofPreview && (
        <div className="modal-backdrop" onClick={()=>setProofPreview(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:600}}>
            <button className="modal-close" onClick={()=>setProofPreview(null)}>×</button>
            <span className="eyebrow">WINNER PROOF SUBMISSION</span>
            <h2>Scorecard Verification</h2>
            <div style={{margin:'1rem 0',textAlign:'center'}}>
              {proofPreview.startsWith('http') || proofPreview.startsWith('/uploads') ? (
                <img src={proofPreview} alt="Scorecard proof" style={{maxWidth:'100%',borderRadius:8,maxHeight:400,objectFit:'contain'}}/>
              ) : (
                <div className="empty">
                  <p>Document identifier: <code>{proofPreview}</code></p>
                </div>
              )}
            </div>
            <button className="btn btn-secondary" onClick={()=>setProofPreview(null)}>Close</button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
