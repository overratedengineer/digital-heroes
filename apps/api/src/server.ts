import express from 'express'; import cors from 'cors'; import jwt from 'jsonwebtoken'; import bcrypt from 'bcryptjs'; import multer from 'multer'; import {z} from 'zod'; import {randomUUID} from 'node:crypto'; import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url'; import {db} from './db.js'; import {createSubscription,cancelSubscription,simulateDraw,prizePoolForActiveSubscribers} from './services.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app=express(); const PORT=Number(process.env.PORT||4000); const SECRET=process.env.JWT_SECRET||'digital-heroes-local-dev-secret-change-in-production';
app.use(cors({origin:true,credentials:true})); app.use(express.json({limit:'2mb'}));
const uploadsDir = path.resolve(__dirname, '../uploads');
fs.mkdirSync(uploadsDir,{recursive:true});
app.use('/uploads', express.static(uploadsDir));
const upload=multer({dest:uploadsDir,limits:{fileSize:5*1024*1024}});

type ReqUser={id:string,role:'user'|'admin'};
function auth(req:any,res:any,next:any){try{const h=req.headers.authorization||'';const token=h.startsWith('Bearer ')?h.slice(7):'';req.user=jwt.verify(token,SECRET) as ReqUser;next()}catch{res.status(401).json({error:'Authentication required'})}}
function subscriber(req:any,res:any,next:any){const u=db.prepare("SELECT subscription_status FROM users WHERE id=?").get(req.user.id) as any;if(u?.subscription_status!=='active')return res.status(402).json({error:'An active membership is required for this action'});next()}
function admin(req:any,res:any,next:any){if(req.user?.role!=='admin')return res.status(403).json({error:'Admin access required'});next()}
const ok=(res:any,data:any)=>res.json(data); const now=()=>new Date().toISOString();

app.get('/api/health',(_,res)=>ok(res,{ok:true,service:'digital-heroes-api',time:now()}));
app.post('/api/auth/register',(req,res)=>{try{const body=z.object({name:z.string().min(2),email:z.string().email(),password:z.string().min(8),charityId:z.string(),charityPercent:z.number().min(10).max(50)}).parse(req.body);if(db.prepare('SELECT id FROM users WHERE email=?').get(body.email))return res.status(409).json({error:'Email already registered'});const id=randomUUID();db.prepare('INSERT INTO users(id,name,email,password_hash,role,created_at,charity_id,charity_percent) VALUES(?,?,?,?,?,?,?,?)').run(id,body.name,body.email,bcrypt.hashSync(body.password,10),'user',now(),body.charityId,body.charityPercent);const token=jwt.sign({id,role:'user'},SECRET,{expiresIn:'7d'});res.json({token,user:{id,name:body.name,email:body.email,role:'user'}})}catch(e:any){res.status(400).json({error:e.message})}});
app.post('/api/auth/login',(req,res)=>{const body=z.object({email:z.string().email(),password:z.string()}).parse(req.body);const u=db.prepare('SELECT * FROM users WHERE email=?').get(body.email) as any;if(!u||!bcrypt.compareSync(body.password,u.password_hash))return res.status(401).json({error:'Invalid email or password'});const token=jwt.sign({id:u.id,role:u.role},SECRET,{expiresIn:'7d'});res.json({token,user:{id:u.id,name:u.name,email:u.email,role:u.role}})});
app.get('/api/me',auth,(req:any,res)=>{const u=db.prepare('SELECT id,name,email,role,charity_id charityId,charity_percent charityPercent,subscription_status subscriptionStatus,plan,renewal_date renewalDate,total_won totalWon FROM users WHERE id=?').get(req.user.id);ok(res,{user:u})});

app.get('/api/charities',(req,res)=>{const q=String(req.query.q||'').trim();const category=String(req.query.category||'').trim();let sql='SELECT * FROM charities WHERE active=1';const args:any[]=[];if(q){sql+=' AND (name LIKE ? OR description LIKE ?)';args.push(`%${q}%`,`%${q}%`)}if(category){sql+=' AND category=?';args.push(category)}sql+=' ORDER BY featured DESC,name';ok(res,{charities:db.prepare(sql).all(...args)})});
app.get('/api/charities/:id',(req,res)=>{const c=db.prepare('SELECT * FROM charities WHERE id=?').get(req.params.id);if(!c)return res.status(404).json({error:'Charity not found'});ok(res,{charity:c})});
app.put('/api/profile/charity',auth,(req:any,res)=>{try{const b=z.object({charityId:z.string(),charityPercent:z.number().int().min(10).max(50)}).parse(req.body);const c=db.prepare('SELECT id FROM charities WHERE id=? AND active=1').get(b.charityId);if(!c)return res.status(404).json({error:'Charity not found'});db.prepare('UPDATE users SET charity_id=?,charity_percent=? WHERE id=?').run(b.charityId,b.charityPercent,req.user.id);ok(res,{success:true})}catch(e:any){res.status(400).json({error:e.message})}});
app.post('/api/donations',auth,(req:any,res)=>{try{const b=z.object({charityId:z.string(),amount:z.number().positive()}).parse(req.body);db.prepare('INSERT INTO donations(id,user_id,charity_id,amount,created_at) VALUES(?,?,?,?,?)').run(randomUUID(),req.user.id,b.charityId,b.amount,now());ok(res,{success:true})}catch(e:any){res.status(400).json({error:e.message})}});

app.post('/api/subscriptions/checkout',auth,(req:any,res)=>{try{const b=z.object({plan:z.enum(['monthly','yearly'])}).parse(req.body);ok(res,{checkoutId:randomUUID(),...createSubscription(req.user.id,b.plan)})}catch(e:any){res.status(400).json({error:e.message})}});
app.post('/api/subscriptions/cancel',auth,(req:any,res)=>{cancelSubscription(req.user.id);ok(res,{success:true})});

app.get('/api/scores',auth,(req:any,res)=>ok(res,{scores:db.prepare('SELECT id,score,score_date scoreDate FROM scores WHERE user_id=? ORDER BY score_date DESC LIMIT 5').all(req.user.id)}));
app.post('/api/scores',auth,subscriber,(req:any,res)=>{try{const b=z.object({score:z.number().int().min(1).max(45),scoreDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}).parse(req.body);const existing=db.prepare('SELECT id FROM scores WHERE user_id=? AND score_date=?').get(req.user.id,b.scoreDate) as any;if(existing)return res.status(409).json({error:'A score already exists for this date. Edit or delete the existing score.'});db.prepare('INSERT INTO scores(id,user_id,score,score_date,created_at) VALUES(?,?,?,?,?)').run(randomUUID(),req.user.id,b.score,b.scoreDate,now());const rows=db.prepare('SELECT id FROM scores WHERE user_id=? ORDER BY score_date DESC').all(req.user.id) as any[];if(rows.length>5)db.prepare('DELETE FROM scores WHERE id=?').run(rows[rows.length-1].id);ok(res,{success:true})}catch(e:any){res.status(400).json({error:e.message})}});
app.put('/api/scores/:id',auth,subscriber,(req:any,res)=>{try{const b=z.object({score:z.number().int().min(1).max(45),scoreDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}).parse(req.body);const row=db.prepare('SELECT id FROM scores WHERE id=? AND user_id=?').get(req.params.id,req.user.id);if(!row)return res.status(404).json({error:'Score not found'});const dup=db.prepare('SELECT id FROM scores WHERE user_id=? AND score_date=? AND id<>?').get(req.user.id,b.scoreDate,req.params.id);if(dup)return res.status(409).json({error:'A score already exists for this date.'});db.prepare('UPDATE scores SET score=?,score_date=? WHERE id=?').run(b.score,b.scoreDate,req.params.id);ok(res,{success:true})}catch(e:any){res.status(400).json({error:e.message})}});
app.delete('/api/scores/:id',auth,subscriber,(req:any,res)=>{db.prepare('DELETE FROM scores WHERE id=? AND user_id=?').run(req.params.id,req.user.id);ok(res,{success:true})});

app.get('/api/dashboard',auth,(req:any,res)=>{const u:any=db.prepare('SELECT id,name,email,charity_id charityId,charity_percent charityPercent,subscription_status subscriptionStatus,plan,renewal_date renewalDate,total_won totalWon FROM users WHERE id=?').get(req.user.id);const charity=u.charityId?db.prepare('SELECT * FROM charities WHERE id=?').get(u.charityId):null;const scores=db.prepare('SELECT id,score,score_date scoreDate FROM scores WHERE user_id=? ORDER BY score_date DESC LIMIT 5').all(req.user.id);const winners=db.prepare("SELECT w.*,d.month FROM winners w JOIN draws d ON d.id=w.draw_id WHERE w.user_id=? ORDER BY w.created_at DESC").all(req.user.id);const draws=db.prepare("SELECT id,month,type,status,prize_pool prizePool,winning_numbers winningNumbers FROM draws WHERE status='published' ORDER BY month DESC LIMIT 6").all();ok(res,{user:u,charity,scores,winners,draws})});

// Publicly readable draws for public visitors (§ 03) and subscribers
app.get('/api/draws',(req,res)=>ok(res,{draws:db.prepare('SELECT id,month,type,status,prize_pool prizePool,jackpot_rollover jackpotRollover,winning_numbers winningNumbers,created_at createdAt FROM draws ORDER BY month DESC').all()}));
app.post('/api/draws/simulate',auth,admin,(req:any,res)=>{try{const type=z.enum(['random','algorithmic']).default('random').parse(req.body?.type||'random');const result=simulateDraw(type);ok(res,result)}catch(e:any){res.status(400).json({error:e.message})}});
app.post('/api/draws/publish',auth,admin,(req:any,res)=>{try{const b=z.object({month:z.string(),type:z.enum(['random','algorithmic']),numbers:z.array(z.number()),pool:z.number(),rollover:z.number(),winners:z.array(z.object({userId:z.string(),match:z.number()})),allocated:z.record(z.string(),z.number())}).parse(req.body);const existing=db.prepare('SELECT id FROM draws WHERE month=?').get(b.month);if(existing)return res.status(409).json({error:'A draw already exists for this month'});const drawId=randomUUID();db.prepare('INSERT INTO draws(id,month,type,winning_numbers,status,prize_pool,jackpot_rollover,simulated_at,published_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(drawId,b.month,b.type,JSON.stringify(b.numbers),'published',b.pool,b.rollover,now(),now(),now());const ins=db.prepare('INSERT INTO winners(id,draw_id,user_id,match_type,prize,created_at) VALUES(?,?,?,?,?,?)');for(const w of b.winners){const key=String(Math.min(w.match,5));const prize=b.allocated[key]||0;if(prize>0){ins.run(randomUUID(),drawId,w.userId,`${w.match}-number match`,prize,now());db.prepare('UPDATE users SET total_won=total_won+? WHERE id=?').run(prize,w.userId)}}ok(res,{success:true,drawId})}catch(e:any){res.status(400).json({error:e.message})}});

// Admin reports and draw statistics (§ 11.05)
app.get('/api/admin/stats',auth,admin,(_,res)=>{
  const total=(db.prepare('SELECT COUNT(*) c FROM users WHERE role=\'user\'').get() as any).c;
  const active=(db.prepare("SELECT COUNT(*) c FROM users WHERE role='user' AND subscription_status='active'").get() as any).c;
  const charity=(db.prepare('SELECT COALESCE(SUM(amount),0) s FROM donations').get() as any).s;
  const wins=(db.prepare('SELECT COALESCE(SUM(prize),0) s FROM winners').get() as any).s;
  const drawsCount=(db.prepare('SELECT COUNT(*) c FROM draws').get() as any).c;
  const pendingProof=(db.prepare("SELECT COUNT(*) c FROM winners WHERE verification_status='pending'").get() as any).c;
  const paidPrizes=(db.prepare("SELECT COALESCE(SUM(prize),0) s FROM winners WHERE payout_status='paid'").get() as any).s;
  const pendingPrizes=(db.prepare("SELECT COALESCE(SUM(prize),0) s FROM winners WHERE payout_status='pending'").get() as any).s;
  const latestDraw=(db.prepare("SELECT jackpot_rollover FROM draws WHERE status='published' ORDER BY created_at DESC LIMIT 1").get() as any);
  ok(res,{
    totalUsers:total,
    activeSubscribers:active,
    prizePool:prizePoolForActiveSubscribers(),
    charityTotal:charity,
    totalWinnings:wins,
    drawStats:{
      totalDraws:drawsCount,
      jackpotRollover:latestDraw?.jackpot_rollover||0,
      pendingVerifications:pendingProof,
      paidPrizes,
      pendingPrizes
    }
  });
});

// Admin user management (§ 11.01)
app.get('/api/admin/users',auth,admin,(_,res)=>ok(res,{users:db.prepare("SELECT id,name,email,role,charity_id charityId,subscription_status subscriptionStatus,plan,charity_percent charityPercent,renewal_date renewalDate,total_won totalWon,created_at createdAt FROM users ORDER BY created_at DESC").all()}));
app.put('/api/admin/users/:id',auth,admin,(req,res)=>{
  try{
    const b=z.object({
      name:z.string().min(2),
      email:z.string().email(),
      role:z.enum(['user','admin']),
      charityId:z.string().nullable().optional(),
      charityPercent:z.number().int().min(10).max(50),
      subscriptionStatus:z.enum(['active','inactive']),
      plan:z.enum(['monthly','yearly']).nullable().optional()
    }).parse(req.body);
    const existing=db.prepare('SELECT id FROM users WHERE email=? AND id<>?').get(b.email,req.params.id);
    if(existing)return res.status(409).json({error:'Email already registered to another account'});
    db.prepare('UPDATE users SET name=?,email=?,role=?,charity_id=?,charity_percent=?,subscription_status=?,plan=? WHERE id=?')
      .run(b.name,b.email,b.role,b.charityId||null,b.charityPercent,b.subscriptionStatus,b.plan||null,req.params.id);
    ok(res,{success:true});
  }catch(e:any){res.status(400).json({error:e.message})}
});
app.put('/api/admin/users/:id/subscription',auth,admin,(req,res)=>{const b=z.object({status:z.enum(['active','inactive'])}).parse(req.body);db.prepare('UPDATE users SET subscription_status=? WHERE id=?').run(b.status,req.params.id);ok(res,{success:true})});

// Admin user score inspection and editing (§ 11.01)
app.get('/api/admin/users/:id/scores',auth,admin,(req,res)=>{
  const scores=db.prepare('SELECT id,score,score_date scoreDate,created_at createdAt FROM scores WHERE user_id=? ORDER BY score_date DESC').all(req.params.id);
  ok(res,{scores});
});
app.put('/api/admin/scores/:id',auth,admin,(req,res)=>{
  try{
    const b=z.object({score:z.number().int().min(1).max(45),scoreDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}).parse(req.body);
    const row=db.prepare('SELECT id,user_id FROM scores WHERE id=?').get(req.params.id) as any;
    if(!row)return res.status(404).json({error:'Score not found'});
    const dup=db.prepare('SELECT id FROM scores WHERE user_id=? AND score_date=? AND id<>?').get(row.user_id,b.scoreDate,req.params.id);
    if(dup)return res.status(409).json({error:'A score already exists for this date'});
    db.prepare('UPDATE scores SET score=?,score_date=? WHERE id=?').run(b.score,b.scoreDate,req.params.id);
    ok(res,{success:true});
  }catch(e:any){res.status(400).json({error:e.message})}
});
app.delete('/api/admin/scores/:id',auth,admin,(req,res)=>{
  db.prepare('DELETE FROM scores WHERE id=?').run(req.params.id);
  ok(res,{success:true});
});

// Winners management (§ 11.04 & § 09)
app.get('/api/admin/winners',auth,admin,(_,res)=>ok(res,{winners:db.prepare("SELECT w.*,u.name,u.email,d.month FROM winners w JOIN users u ON u.id=w.user_id JOIN draws d ON d.id=w.draw_id ORDER BY w.created_at DESC").all()}));
app.post('/api/winners/:id/proof',auth,upload.single('proof'),(req:any,res)=>{
  const w=db.prepare('SELECT id,user_id FROM winners WHERE id=?').get(req.params.id) as any;
  if(!w||w.user_id!==req.user.id)return res.status(404).json({error:'Winner not found'});
  const proof=req.file?`/uploads/${req.file.filename}`:'demo-proof://scorecard';
  db.prepare("UPDATE winners SET proof_url=?,verification_status='pending' WHERE id=?").run(proof,req.params.id);
  ok(res,{success:true,proofUrl:proof});
});
app.put('/api/admin/winners/:id',auth,admin,(req,res)=>{
  const b=z.object({verificationStatus:z.enum(['pending','approved','rejected']),payoutStatus:z.enum(['pending','paid']),notes:z.string().optional()}).parse(req.body);
  db.prepare('UPDATE winners SET verification_status=?,payout_status=?,notes=? WHERE id=?').run(b.verificationStatus,b.payoutStatus,b.notes||'',req.params.id);
  ok(res,{success:true});
});

// Charity management (§ 11.03)
app.get('/api/admin/charities',auth,admin,(_,res)=>ok(res,{charities:db.prepare('SELECT * FROM charities ORDER BY featured DESC,name').all()}));
app.post('/api/admin/charities',auth,admin,(req,res)=>{
  try{
    const b=z.object({
      name:z.string().min(2),
      description:z.string().min(5),
      category:z.string(),
      imageUrl:z.string().url(),
      impact:z.string(),
      location:z.string(),
      featured:z.boolean().default(false),
      upcomingEvents:z.string().optional()
    }).parse(req.body);
    const id=randomUUID();
    db.prepare('INSERT INTO charities(id,name,slug,description,category,image_url,impact,location,featured,active,upcoming_events,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(id,b.name,b.name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),b.description,b.category,b.imageUrl,b.impact,b.location,b.featured?1:0,1,b.upcomingEvents||null,now());
    ok(res,{success:true,id});
  }catch(e:any){res.status(400).json({error:e.message})}
});
app.put('/api/admin/charities/:id',auth,admin,(req,res)=>{
  try{
    const b=z.object({
      name:z.string().min(2),
      description:z.string().min(5),
      category:z.string(),
      imageUrl:z.string().url(),
      impact:z.string(),
      location:z.string(),
      featured:z.boolean(),
      active:z.boolean().default(true),
      upcomingEvents:z.string().optional()
    }).parse(req.body);
    db.prepare('UPDATE charities SET name=?,description=?,category=?,image_url=?,impact=?,location=?,featured=?,active=?,upcoming_events=? WHERE id=?')
      .run(b.name,b.description,b.category,b.imageUrl,b.impact,b.location,b.featured?1:0,b.active?1:0,b.upcomingEvents||null,req.params.id);
    ok(res,{success:true});
  }catch(e:any){res.status(400).json({error:e.message})}
});
app.delete('/api/admin/charities/:id',auth,admin,(req,res)=>{
  db.prepare('UPDATE charities SET active=0 WHERE id=?').run(req.params.id);
  ok(res,{success:true});
});

const webDist=path.resolve(__dirname,'../../web/dist'); if(fs.existsSync(webDist)){app.use(express.static(webDist)); app.use((req:any,res:any,next:any)=>{if(req.method==='GET' && !req.path.startsWith('/api')) return res.sendFile(path.join(webDist,'index.html')); next()})}
app.use((err:any,_req:any,res:any,_next:any)=>{console.error(err);res.status(500).json({error:'Unexpected server error'})});
app.listen(PORT,()=>console.log(`Digital Heroes API running on http://localhost:${PORT}`));

