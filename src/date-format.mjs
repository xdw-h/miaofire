const pad=n=>String(n).padStart(2,'0');
export function formatDateTime(value){
 if(value===null||value===undefined||value==='')return '-';
 if(typeof value==='string'){
  const parts=/^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(value);if(!parts)return '-';
  const [y,m,d]=parts.slice(1).map(Number),probe=new Date(Date.UTC(y,m-1,d));
  if(probe.getUTCFullYear()!==y||probe.getUTCMonth()!==m-1||probe.getUTCDate()!==d)return '-';
  if(value.length===10)return value;
  value=value.replace(' ','T');
 }
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return '-';
 return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
