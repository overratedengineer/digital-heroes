import {db} from './db.js';
import {randomUUID} from 'node:crypto';

export const PLAN = {monthly:{amount:999,days:30},yearly:{amount:9990,days:365}} as const;
export const PRIZE_POOL_PERCENT=30;

export function prizePoolForActiveSubscribers(){
  const activeUsers = db.prepare("SELECT plan FROM users WHERE role='user' AND subscription_status='active'").all() as {plan?:string}[];
  let monthlyTotal = 0;
  for(const u of activeUsers){
    monthlyTotal += (u.plan === 'yearly' ? 9990 / 12 : 999);
  }
  return Math.round(monthlyTotal * PRIZE_POOL_PERCENT / 100);
}

export function createSubscription(userId:string, plan:'monthly'|'yearly'){
 const p=PLAN[plan]; const renewal=new Date(Date.now()+p.days*86400000).toISOString();
 db.prepare("UPDATE users SET subscription_status='active',plan=?,renewal_date=? WHERE id=?").run(plan,renewal,userId);
 db.prepare('INSERT INTO subscriptions(id,user_id,plan,amount,status,provider,started_at,renewal_date) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),userId,plan,p.amount,'active','demo',new Date().toISOString(),renewal);
 return {plan,amount:p.amount,renewalDate:renewal,provider:'demo'};
}

export function cancelSubscription(userId:string){
 db.prepare("UPDATE users SET subscription_status='inactive' WHERE id=?").run(userId);
 db.prepare("UPDATE subscriptions SET status='cancelled',cancelled_at=? WHERE user_id=? AND status='active'").run(new Date().toISOString(),userId);
}

export function generateNumbers(mode:'random'|'algorithmic'){
  if(mode==='random'){
    const nums=new Set<number>();
    while(nums.size<5){
      nums.add(Math.floor(Math.random()*45)+1);
    }
    return [...nums].sort((a,b)=>a-b);
  }

  // Algorithmic: weighted by actual score frequency in the database
  const rows = db.prepare('SELECT score, COUNT(*) as freq FROM scores GROUP BY score').all() as {score:number, freq:number}[];
  const freqMap = new Map<number, number>();
  for(const r of rows){
    freqMap.set(r.score, r.freq);
  }

  // Baseline weight 1 for all numbers 1..45 (Laplace smoothing), plus actual score frequency * 3
  const poolOfChoices: {num: number, weight: number}[] = [];
  for(let i=1; i<=45; i++){
    const freq = freqMap.get(i) || 0;
    poolOfChoices.push({num: i, weight: 1 + freq * 3});
  }

  const selected = new Set<number>();
  while(selected.size < 5){
    const available = poolOfChoices.filter(c => !selected.has(c.num));
    const totalWeight = available.reduce((acc, c) => acc + c.weight, 0);
    let randomVal = Math.random() * totalWeight;
    for(const choice of available){
      if(randomVal <= choice.weight){
        selected.add(choice.num);
        break;
      }
      randomVal -= choice.weight;
    }
  }

  return [...selected].sort((a,b)=>a-b);
}

export function simulateDraw(type:'random'|'algorithmic'){
 const active=db.prepare("SELECT id FROM users WHERE role='user' AND subscription_status='active'").all() as {id:string}[];
 const numbers=generateNumbers(type);
 const base=prizePoolForActiveSubscribers();
 const prev=db.prepare("SELECT jackpot_rollover FROM draws WHERE status='published' ORDER BY created_at DESC LIMIT 1").get() as {jackpot_rollover:number}|undefined;
 const pool=base+(prev?.jackpot_rollover||0);
 const tiers=[{m:5,p:.4},{m:4,p:.35},{m:3,p:.25}];
 const winners:{userId:string,match:number}[]=[];
 for(const u of active){
   const scores=db.prepare('SELECT score FROM scores WHERE user_id=? ORDER BY score_date DESC LIMIT 5').all(u.id) as {score:number}[];
   const set=new Set(scores.map(s=>s.score)); const matches=numbers.filter(n=>set.has(n)).length;
   if(matches>=3) winners.push({userId:u.id,match:matches});
 }
 const counts={3:winners.filter(w=>w.match===3).length,4:winners.filter(w=>w.match===4).length,5:winners.filter(w=>w.match>=5).length};
 const allocated:any={}; let rollover=0;
 for(const t of tiers){const available=pool*t.p; const c=counts[t.m as 3|4|5]; if(t.m===5 && c===0) rollover+=available; else allocated[t.m]=c?available/c:0;}
 return {numbers,pool,rollover,winners,counts,allocated,activeCount:active.length};
}
