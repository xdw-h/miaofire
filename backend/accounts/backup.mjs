import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readdirSync,statSync,unlinkSync} from 'node:fs';
import path from 'node:path';
const directory=process.env.BACKUP_DIR||'/var/lib/miaofire-accounts/backups';
mkdirSync(directory,{recursive:true,mode:0o700});
const db=new DatabaseSync(process.env.ACCOUNT_DB||'/var/lib/miaofire-accounts/accounts.sqlite');
const destination=path.join(directory,`accounts-${Date.now()}.sqlite`);
db.prepare('VACUUM INTO ?').run(destination);db.close();
for(const file of readdirSync(directory)){if(/^accounts-\d+\.sqlite$/.test(file)){const full=path.join(directory,file);if(Date.now()-statSync(full).mtimeMs>14*86400000)unlinkSync(full);}}
console.log('Account backup completed');
