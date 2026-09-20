import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultDbPath = path.resolve(__dirname, '../../../data/digital-heroes.db');
const dbPath = process.env.DATABASE_PATH ? path.resolve(process.env.DATABASE_PATH) : defaultDbPath;
fs.mkdirSync(path.dirname(dbPath), {recursive:true});
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')), created_at TEXT NOT NULL,
 charity_id TEXT, charity_percent INTEGER NOT NULL DEFAULT 10, subscription_status TEXT NOT NULL DEFAULT 'inactive',
 plan TEXT, renewal_date TEXT, total_won REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS charities (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL,
 image_url TEXT NOT NULL, impact TEXT NOT NULL, location TEXT NOT NULL, featured INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
 upcoming_events TEXT,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS scores (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 45), score_date TEXT NOT NULL,
 created_at TEXT NOT NULL, UNIQUE(user_id, score_date)
);
CREATE TABLE IF NOT EXISTS subscriptions (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, plan TEXT NOT NULL, amount REAL NOT NULL,
 status TEXT NOT NULL, provider TEXT NOT NULL DEFAULT 'demo', started_at TEXT NOT NULL, renewal_date TEXT NOT NULL, cancelled_at TEXT
);
CREATE TABLE IF NOT EXISTS draws (
 id TEXT PRIMARY KEY, month TEXT UNIQUE NOT NULL, type TEXT NOT NULL, winning_numbers TEXT, status TEXT NOT NULL,
 prize_pool REAL NOT NULL DEFAULT 0, jackpot_rollover REAL NOT NULL DEFAULT 0, simulated_at TEXT, published_at TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS winners (
 id TEXT PRIMARY KEY, draw_id TEXT NOT NULL REFERENCES draws(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 match_type TEXT NOT NULL, prize REAL NOT NULL, proof_url TEXT, verification_status TEXT NOT NULL DEFAULT 'pending', payout_status TEXT NOT NULL DEFAULT 'pending',
 notes TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS donations (
 id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE SET NULL, charity_id TEXT NOT NULL REFERENCES charities(id) ON DELETE CASCADE,
 amount REAL NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scores_user_date ON scores(user_id, score_date DESC);
CREATE INDEX IF NOT EXISTS idx_winners_draw ON winners(draw_id);
`);

// Safe column migration for existing SQLite databases
try {
  db.exec("ALTER TABLE charities ADD COLUMN upcoming_events TEXT;");
} catch {
  // Column already exists
}

const now = new Date().toISOString();
const charityCount = db.prepare('SELECT COUNT(*) c FROM charities').get() as {c:number};
if(charityCount.c===0){
 const insert = db.prepare('INSERT INTO charities(id,name,slug,description,category,image_url,impact,location,featured,active,upcoming_events,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)');
 const rows = [
 ['c1','Fairway Futures Foundation','fairway-futures','Creates access to sport, mentoring and education for young people who need a first opportunity.','Youth','https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=1200&q=80','2,400 young people supported','Manchester, UK',1,1,JSON.stringify([{title:'Annual Youth Golf Invitational',date:'2026-10-14',location:'Manchester Golf Club',description:'18-hole charity tournament connecting emerging youth talent with sporting mentors.'}])],
 ['c2','Green Steps Collective','green-steps','Restores local green spaces while funding community-led environmental education.','Environment','https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1200&q=80','18,600 trees and plants restored','Bristol, UK',1,1,JSON.stringify([{title:'Eco-Links Charity Scramble',date:'2026-11-05',location:'Bristol Downs Golf Course',description:'Community golf scramble supporting local urban greenway restoration and tree planting.'}])],
 ['c3','Open Arms Health Fund','open-arms','Provides practical health support, transport and wellbeing services to underserved families.','Health','https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=1200&q=80','7,800 care journeys funded','Leeds, UK',0,1,JSON.stringify([{title:'Wellness On The Green',date:'2026-10-28',location:'Leeds Parkland Club',description:'Charity golf and wellbeing day funding non-emergency medical journeys.'}])],
 ['c4','Next Chapter Education','next-chapter','Scholarships, devices and coaching for students building their next chapter.','Education','https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80','640 scholarships funded','Liverpool, UK',0,1,JSON.stringify([{title:'Scholarship Cup 2026',date:'2026-11-18',location:'Royal Liverpool Links',description:'Annual fundraising golf challenge funding university technology grants.'}])]
 ];
 for(const r of rows) insert.run(...r, now);
} else {
 // Update existing seed charities if upcoming_events is null
 db.prepare("UPDATE charities SET upcoming_events=? WHERE id='c1' AND (upcoming_events IS NULL OR upcoming_events='')").run(JSON.stringify([{title:'Annual Youth Golf Invitational',date:'2026-10-14',location:'Manchester Golf Club',description:'18-hole charity tournament connecting emerging youth talent with sporting mentors.'}]));
 db.prepare("UPDATE charities SET upcoming_events=? WHERE id='c2' AND (upcoming_events IS NULL OR upcoming_events='')").run(JSON.stringify([{title:'Eco-Links Charity Scramble',date:'2026-11-05',location:'Bristol Downs Golf Course',description:'Community golf scramble supporting local urban greenway restoration and tree planting.'}]));
 db.prepare("UPDATE charities SET upcoming_events=? WHERE id='c3' AND (upcoming_events IS NULL OR upcoming_events='')").run(JSON.stringify([{title:'Wellness On The Green',date:'2026-10-28',location:'Leeds Parkland Club',description:'Charity golf and wellbeing day funding non-emergency medical journeys.'}]));
 db.prepare("UPDATE charities SET upcoming_events=? WHERE id='c4' AND (upcoming_events IS NULL OR upcoming_events='')").run(JSON.stringify([{title:'Scholarship Cup 2026',date:'2026-11-18',location:'Royal Liverpool Links',description:'Annual fundraising golf challenge funding university technology grants.'}]));
}
const admin = db.prepare('SELECT id FROM users WHERE email=?').get('admin@digitalheroes.local');
if(!admin){
 db.prepare('INSERT INTO users(id,name,email,password_hash,role,created_at) VALUES(?,?,?,?,?,?)').run('u-admin','Digital Heroes Admin','admin@digitalheroes.local',bcrypt.hashSync('Admin@12345',10),'admin',now);
}
const demo = db.prepare('SELECT id FROM users WHERE email=?').get('demo@digitalheroes.local');
if(!demo){
 db.prepare('INSERT INTO users(id,name,email,password_hash,role,created_at,charity_id,charity_percent,subscription_status,plan,renewal_date,total_won) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run('u-demo','Alex Morgan','demo@digitalheroes.local',bcrypt.hashSync('Demo@12345',10),'user',now,'c1',15,'active','monthly',new Date(Date.now()+1000*60*60*24*23).toISOString(),420);
 const insScore=db.prepare('INSERT INTO scores(id,user_id,score,score_date,created_at) VALUES(?,?,?,?,?)');
 [['s1',32,'2026-09-18'],['s2',37,'2026-09-12'],['s3',29,'2026-09-06'],['s4',35,'2026-08-29'],['s5',31,'2026-08-20']].forEach(x=>insScore.run(x[0],'u-demo',x[1],x[2],now));
 db.prepare('INSERT INTO subscriptions(id,user_id,plan,amount,status,provider,started_at,renewal_date) VALUES(?,?,?,?,?,?,?,?)').run('sub-demo','u-demo','monthly',999,'active','demo',now,new Date(Date.now()+1000*60*60*24*23).toISOString());
}
