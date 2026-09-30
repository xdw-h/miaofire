export const ROUTE_NODES=[
  [{id:'battle',type:'battle',name:'林间伏击',desc:'普通战斗，获得鱼干和远征币',targetKills:3,reward:8},{id:'chest',type:'chest',name:'古木宝箱',desc:'打开一次性宝箱，随机获得补给',targetKills:0,reward:0}],
  [{id:'elite',type:'elite',name:'精英守门',desc:'更强敌人，奖励更高',targetKills:5,reward:16},{id:'shop',type:'shop',name:'流动商店',desc:'消耗远征币购买补给',targetKills:0,reward:0},{id:'rest',type:'rest',name:'月光营地',desc:'恢复生命与护盾',targetKills:0,reward:0}],
  [{id:'boss',type:'elite',name:'远征首领',desc:'最终战，完成远征',targetKills:7,reward:30},{id:'chest',type:'chest',name:'星辉宝箱',desc:'终点前的大奖',targetKills:0,reward:0}],
];
export const routeDefaults=()=>({best:0,clears:0});
export const routeNode=(layer,id)=>ROUTE_NODES[layer]?.find(n=>n.id===id);
export const routeChoices=layer=>ROUTE_NODES[layer]??[];
