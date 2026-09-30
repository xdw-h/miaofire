import {SAVE_KEY,validateState} from './storage.mjs';
export const OWNER_KEY='miaofire.account.active';
const prefix=id=>`miaofire.account.${id}.`;
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(id);
export function scopedStorage(raw){
 let owner=null;try{const id=raw.getItem(OWNER_KEY);if(validId(id))owner=id;}catch{}
 const key=k=>owner?prefix(owner)+k:k;
 return {owner,getItem:k=>raw.getItem(key(k)),setItem(k,v){const actual=raw.getItem(OWNER_KEY)||null;if(actual!==owner)throw Error('账号已在另一个标签页切换，请刷新。');raw.setItem(key(k),v);},removeItem:k=>raw.removeItem(key(k))};
}
export function parseSave(raw){const value=JSON.parse(raw);if(value?.version!==6||!validateState(value.state,6))throw Error('存档校验失败，原始进度保留。');return value;}
export function activateAccount(raw,user,payload,revision){
 if(!validId(user.id)||!Number.isSafeInteger(revision)||revision<0)throw Error('账号信息异常。');parseSave(payload);
 const base=prefix(user.id),old=raw.getItem(base+SAVE_KEY);
 if(old!==null)raw.setItem(base+'backup',old);
 raw.setItem(base+SAVE_KEY,payload);
 raw.setItem(base+'revision',String(revision));
 let profile={};try{profile=JSON.parse(raw.getItem(base+'miaofire.honor.v1')||'{}');}catch{}
 raw.setItem(base+'miaofire.honor.v1',JSON.stringify({...profile,token:user.honorToken}));
 raw.setItem(base+'username',user.username||'');
 raw.setItem(OWNER_KEY,user.id);
}
export function activateGuest(raw){raw.removeItem(OWNER_KEY);}
export function storedRevision(raw,id){const value=raw.getItem(prefix(id)+'revision');return value!==null&&/^\d+$/.test(value)?Number(value):null;}
export function saveRevision(raw,id,value){raw.setItem(prefix(id)+'revision',String(value));}
export async function accountRequest(path,{body,userId,fetcher=globalThis.fetch.bind(globalThis)}={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const res=await fetcher('/api/account'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:{...(body?{'Content-Type':'application/json'}:{}),...(userId?{'X-Account-ID':userId}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal});let data;try{data=await res.json();}catch{throw Error('账号服务未连接，请从服务器游戏地址打开。');}if(!res.ok)throw Object.assign(Error(data.error||'账号服务请求失败。'),{status:res.status});return data;}catch(e){if(e.name==='AbortError'||e instanceof TypeError)throw Error('网络未连接，进度仍保存在本机，请稍后重试。');throw e;}finally{clearTimeout(timer);}
}
