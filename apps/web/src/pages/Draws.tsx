import {useEffect,useState} from 'react';
import {ArrowUpRight,CalendarClock,CheckCircle2,Coins,RotateCcw,ShieldCheck,Sparkles,Trophy} from 'lucide-react';
import {Link} from 'react-router-dom';
import {AppLayout} from '../components/Layout';
import {api,request} from '../lib/api';
import {Badge,Card,Toast} from '../components/ui';

export default function Draws(){
  const [draws,setDraws]=useState<any[]>([]);
  const [msg,setMsg]=useState('');
  const token = localStorage.getItem('dh_token');

  useEffect(()=>{
    request<any>(()=>api.get('/draws'))
      .then(d=>setDraws(d.draws||[]))
      .catch(e=>setMsg(e.message));
  },[]);

  return (
    <AppLayout admin={localStorage.getItem('dh_role')==='admin'}>
      <div className="page-head">
        <div>
          <span className="eyebrow">05 · REWARDS ENGINE</span>
          <h1>The monthly <em>draw.</em></h1>
          <p>Transparent prize tiers, published results, and a rollover jackpot when the top tier goes unclaimed.</p>
        </div>
        {!token && (
          <Link to="/signup" className="btn btn-primary">
            Join to participate <ArrowUpRight size={16}/>
          </Link>
        )}
      </div>

      {msg&&<Toast message={msg} type="error"/>}

      {/* PRD § 06 & § 07 Draw & Prize Pool Logic */}
      <div className="draw-hero">
        <div>
          <span className="eyebrow">HOW THE PRIZE POOL WORKS</span>
          <h2>Every active member builds the pool.</h2>
          <p>30% of active monthly subscription fees automatically fund the prize pool. The distribution follows pre-defined mathematical tiers enforced automatically.</p>
          <div className="draw-features-list">
            <div><Coins size={16}/> <b>Auto-calculation</b> based on active subscriber count</div>
            <div><RotateCcw size={16}/> <b>5-match jackpot rollover</b> carries forward if unclaimed</div>
            <div><ShieldCheck size={16}/> <b>Equal split</b> among multiple winners in each tier</div>
          </div>
        </div>
        <div className="tier-stack">
          <div className="tier-item gold">
            <span className="tier-badge">JACKPOT</span>
            <b>40%</b>
            <span>5-number match</span>
            <i>Rolls over into next month if unclaimed</i>
          </div>
          <div className="tier-item silver">
            <span className="tier-badge">TIER 2</span>
            <b>35%</b>
            <span>4-number match</span>
            <i>Split equally among winners (no rollover)</i>
          </div>
          <div className="tier-item bronze">
            <span className="tier-badge">TIER 3</span>
            <b>25%</b>
            <span>3-number match</span>
            <i>Split equally among winners (no rollover)</i>
          </div>
        </div>
      </div>

      <div className="draw-modes-banner">
        <div className="mode-card">
          <span className="eyebrow">MODE 01 · RANDOM</span>
          <h3>Standard Lottery Style</h3>
          <p>Five unique numbers from 1 to 45 are generated with uniform probability.</p>
        </div>
        <div className="mode-card highlight">
          <span className="eyebrow">MODE 02 · ALGORITHMIC</span>
          <h3>Score-Frequency Weighted</h3>
          <p>Numbers are probabilistically weighted according to actual Stableford scores entered by community golfers.</p>
        </div>
      </div>

      <div className="section-title">
        <h3>Published Monthly Draws</h3>
        <p className="muted">Historical and current draw records keyed by month</p>
      </div>

      <div className="draw-grid">
        {draws.length ? draws.map(d=>(
          <Card className="draw-card" key={d.id}>
            <div className="draw-card-head">
              <div>
                <span className="draw-month-tag">{d.month}</span>
                <span className="draw-type-tag">{d.type}</span>
              </div>
              <Badge tone={d.status==='published'?'success':'warning'}>{d.status}</Badge>
            </div>
            <div className="draw-numbers">
              {d.winningNumbers ? (
                JSON.parse(d.winningNumbers).map((n:number)=>(
                  <i key={n}>{String(n).padStart(2,'0')}</i>
                ))
              ) : (
                <i className="pending">?</i>
              )}
            </div>
            <div className="draw-meta">
              <span><CalendarClock size={15}/> {d.type==='algorithmic'?'Algorithmic':'Random'} draw</span>
              <span><Trophy size={15}/> ₹{Number(d.prizePool).toLocaleString('en-IN')} total pool</span>
            </div>
            {Number(d.jackpotRollover) > 0 && (
              <div className="draw-rollover-info">
                <RotateCcw size={14}/> Jackpot rollover: <b>₹{Number(d.jackpotRollover).toLocaleString('en-IN')}</b>
              </div>
            )}
            {d.status==='published'&& (
              <div className="verified">
                <CheckCircle2 size={15}/> Published and verified
              </div>
            )}
          </Card>
        )) : (
          <Card className="empty large-empty">
            <Sparkles size={24}/>
            <h3>Your next draw is being prepared.</h3>
            <p>Once the administrator runs simulation and publishes the monthly draw, the winning numbers and prize allocations will appear here.</p>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
