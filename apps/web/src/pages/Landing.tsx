import {useEffect,useState} from 'react';
import {motion} from 'framer-motion';
import {ArrowUpRight,Calendar,Heart,Play,ShieldCheck,Sparkles,Trophy} from 'lucide-react';
import {Link} from 'react-router-dom';
import {PublicNav} from '../components/PublicNav';
import {api,request} from '../lib/api';

export default function Landing(){
  const [spotlights,setSpotlights]=useState<any[]>([]);

  useEffect(()=>{
    request<any>(()=>api.get('/charities'))
      .then(d=>{
        const feats = (d.charities||[]).filter((c:any)=>c.featured);
        setSpotlights(feats.length?feats:(d.charities||[]).slice(0,2));
      })
      .catch(()=>null);
  },[]);

  return (
    <div className="landing">
      <PublicNav/>
      <section className="hero">
        <div className="hero-copy">
          <div className="pill"><span/>A different kind of golf platform</div>
          <h1>Play for something <em>bigger.</em></h1>
          <p>Track your game. Enter the monthly draw. Turn every round into a little more good in the world.</p>
          <div className="hero-actions">
            <Link to="/signup" className="btn btn-primary large">Start your journey <ArrowUpRight size={18}/></Link>
            <a className="text-link" href="#how"><Play size={15}/> See how it works</a>
          </div>
          <div className="hero-proof">
            <div className="avatars"><span>A</span><span>J</span><span>M</span><span>+</span></div>
            <span><b>2,840</b> members already playing with purpose</span>
          </div>
        </div>
        <div className="hero-art">
          <div className="orb orb-a"/>
          <div className="orb orb-b"/>
          <motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} transition={{duration:.7}} className="impact-card">
            <div className="card-top"><span>THIS MONTH</span><Heart size={17}/></div>
            <strong>₹1,84,200</strong>
            <p>directed to causes</p>
            <div className="mini-progress"><i/></div>
            <small>+14.8% from last month</small>
          </motion.div>
          <motion.div animate={{y:[0,-8,0]}} transition={{duration:4,repeat:Infinity}} className="score-float">
            <span>YOUR LAST ROUND</span><b>37</b><small>Stableford</small>
          </motion.div>
          <div className="ring"><span>PLAY</span><b>WIN</b><i>GIVE</i></div>
        </div>
      </section>

      <section className="marquee">
        <div>
          <Sparkles size={16}/> Every subscription creates impact <span>✦</span> Every round enters the story <span>✦</span> Every win can give back <span>✦</span> Transparent monthly prize draws <span>✦</span>
        </div>
      </section>

      <section id="how" className="section">
        <div className="section-intro">
          <span className="eyebrow">01 · HOW IT WORKS</span>
          <h2>A simple loop.<br/><em>A bigger ripple.</em></h2>
          <p>No complicated handicap portals or golf-club clichés. Digital Heroes is built around three actions that feel effortless.</p>
        </div>
        <div className="steps">
          <div className="step">
            <div className="step-no">01</div>
            <Trophy/>
            <h3>Track your game</h3>
            <p>Log your latest five Stableford scores (1–45). Your newest round automatically rolls the oldest out of history.</p>
          </div>
          <div className="step featured">
            <div className="step-no">02</div>
            <Sparkles/>
            <h3>Play the draw</h3>
            <p>Each month, active members participate in a draw with transparent prize-pool tiers and a rolling 5-match jackpot.</p>
          </div>
          <div className="step">
            <div className="step-no">03</div>
            <Heart/>
            <h3>Give back</h3>
            <p>Choose a verified cause and direct at least 10% (up to 50%) of your subscription toward work you care about.</p>
          </div>
        </div>
      </section>

      {/* § 08.2: HOMEPAGE SPOTLIGHT FEATURED CHARITIES */}
      <section className="spotlight-section">
        <div className="section-intro">
          <span className="eyebrow">02 · SPOTLIGHT CAUSES</span>
          <h2>Causes leading<br/><em>real change.</em></h2>
          <p>Every subscriber chooses where their impact lands. Here are two of this month's featured organizations.</p>
        </div>
        <div className="spotlight-grid">
          {(spotlights.length ? spotlights : [
            {
              id:'c1',
              name:'Fairway Futures Foundation',
              category:'Youth',
              location:'Manchester, UK',
              impact:'2,400 young people supported',
              description:'Creates access to sport, mentoring and education for young people who need a first opportunity.',
              image_url:'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=1200&q=80',
              upcoming_events: JSON.stringify([{title:'Annual Youth Golf Invitational',date:'2026-10-14',location:'Manchester Golf Club'}])
            },
            {
              id:'c2',
              name:'Green Steps Collective',
              category:'Environment',
              location:'Bristol, UK',
              impact:'18,600 trees and plants restored',
              description:'Restores local green spaces while funding community-led environmental education.',
              image_url:'https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1200&q=80',
              upcoming_events: JSON.stringify([{title:'Eco-Links Charity Scramble',date:'2026-11-05',location:'Bristol Downs Golf Course'}])
            }
          ]).map((c:any)=>{
            let events = [];
            try { events = typeof c.upcoming_events === 'string' ? JSON.parse(c.upcoming_events) : (c.upcoming_events || []); } catch { events = []; }
            return (
              <div className="spotlight-card" key={c.id}>
                <div className="spotlight-img" style={{backgroundImage:`url(${c.image_url})`}}>
                  <span className="badge mint">Spotlight · {c.category}</span>
                </div>
                <div className="spotlight-body">
                  <span className="eyebrow">{c.location}</span>
                  <h3>{c.name}</h3>
                  <p>{c.description}</p>
                  <div className="spotlight-impact">
                    <Heart size={16}/> <b>{c.impact}</b>
                  </div>
                  {events.length > 0 && (
                    <div className="spotlight-event">
                      <Calendar size={14}/>
                      <span>Upcoming Golf Day: <b>{events[0].title}</b> ({events[0].date})</span>
                    </div>
                  )}
                  <div className="spotlight-actions">
                    <Link to="/charities" className="btn btn-secondary">Explore Cause <ArrowUpRight size={15}/></Link>
                    <Link to="/signup" className="btn btn-primary">Direct 10–50% <ArrowUpRight size={15}/></Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="impact" className="impact-section">
        <div className="impact-grid">
          <div>
            <span className="eyebrow">03 · IMPACT STORY</span>
            <h2>Your membership has<br/><em>a second destination.</em></h2>
            <p>We put charitable impact beside performance, not beneath it. Pick a cause, choose your contribution from 10% to 50%, or make independent donations anytime.</p>
            <Link to="/charities" className="btn btn-light">Explore all causes <ArrowUpRight size={16}/></Link>
          </div>
          <div className="impact-stat">
            <div className="impact-big">₹12.4L</div>
            <p>projected community impact</p>
            <div className="impact-lines">
              <div><b>62%</b><span>youth & education</span></div>
              <div><b>24%</b><span>environment</span></div>
              <div><b>14%</b><span>health & wellbeing</span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="draw" className="draw-section">
        <div className="draw-copy">
          <span className="eyebrow">04 · THE DRAW ENGINE</span>
          <h2>Numbers with<br/><em>real purpose.</em></h2>
          <p>Every active member is entered into a monthly draw. The engine supports standard random lottery and score-weighted algorithmic modes, with a 5-match jackpot that rolls forward if unclaimed.</p>
          <div className="tier-row">
            <div><b>40%</b><span>5 match · jackpot rolls over</span></div>
            <div><b>35%</b><span>4 match · shared equally</span></div>
            <div><b>25%</b><span>3 match · shared equally</span></div>
          </div>
          <div style={{marginTop:'1.5rem'}}>
            <Link to="/draws" className="btn btn-secondary">View draw mechanics & history <ArrowUpRight size={16}/></Link>
          </div>
        </div>
        <div className="number-card">
          <span>SEPTEMBER · 2026 DRAW</span>
          <div className="numbers"><i>07</i><i>18</i><i>24</i><i>31</i><i>37</i></div>
          <p>30% of subscription revenue contributes to the monthly prize pool</p>
          <div className="secure"><ShieldCheck size={16}/> Automated prize pool & verified payouts</div>
        </div>
      </section>

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
