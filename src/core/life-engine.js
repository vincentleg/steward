import { randomUUID } from 'node:crypto';
import { principal, representationContext } from './identity.js';
import { personalWorld, verifyOutcome } from './world.js';
import { impactGraph, detectDeviation } from './impact.js';
import { simulateFutures, rankFutures, compressDecision } from './intelligence.js';
import { appendMemory } from './memory.js';
import { CONSTITUTION } from './constitution.js';
import { SCENARIOS, capabilityPlan } from '../capabilities/life-library.js';
const MODES=['observe','ask','rules'];
const ALLOWED=['rebook','update_commitment','send_message','request_refund','reschedule','reserve','cancel','verify','replace','accept_offer','decline_offer','activate_backup','prepare','submit_form'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export function seedLife(id=randomUUID()){
  const identity=principal({id:`person:${id}`,name:'Alex · synthetic'});
  const context=representationContext({id:`personal:${id}`,principalId:identity.id,mandateId:`mandate:${id}`,resourceIds:['cash','miles','hotspot'],timeZone:'America/Los_Angeles',ephemeral:true});
  const world=personalWorld({identity,context,goals:[{id:'arrival',label:'Protect commitments and flexible value'},{id:'strategic-goal',label:'Meet relevant founders without sacrificing commitments'}],commitments:[{id:'morning',label:'Sarah · tomorrow',hour:9,importance:1,status:'planned'},{id:'event-a',label:'AI infrastructure · 6 PM',status:'confirmed'},{id:'founder',label:'Founder event · 6:30 PM',status:'waitlisted'},{id:'event-c',label:'Investor event · 8 PM',status:'confirmed'},{id:'work-meeting',label:'Work meeting',status:'2 PM'},{id:'preparation',label:'Preparation',status:'1 PM'},{id:'next-meeting',label:'Next commitment',status:'4:30 PM'},{id:'dinner',label:'Dinner with a friend',status:'7 PM'}]});
  return {...world,id,revision:0,createdAt:new Date().toISOString(),resources:{cash:5000,miles:31000,hotspot:true,benefit:300},settings:{autonomy:'ask',maxSpend:250,spendingAuthority:100,timeValue:'medium',riskTolerance:'balanced',calendarPriority:'professional',preserveMiles:true,deliveryUrgent:true,subscriptionUsage:'low',airlineUseProbability:.3},travel:{flight:'SFO → JFK',status:'scheduled',arrival:'Tonight',hotel:'confirmed'},money:{charges:[],refunds:[]},purchases:{order:'in transit'},subscriptions:{subscription:'renewed'},benefits:{benefit:'expires in 24 hours'},home:{internet:'online',backup:null},admin:{renewal:'pending',form:'missing',document:'missing'},people:[{id:'sarah',label:'Sarah',communication:'not prepared'}],work:{},opportunities:{invitation:'pending'},rights:[{id:'refund-rights',label:'Synthetic refund eligibility'}],dependencies:[['flight','morning'],['morning','sarah'],['flight','cash'],['flight','miles'],['flight','refund-rights'],['event-a','founder'],['founder','event-c'],['founder','strategic-goal'],['founder','cash'],['founder','sarah'],['subscription','cash'],['subscription','refund-rights'],['order','cash'],['order','delivery-deadline'],['benefit','cash'],['benefit','future-trip'],['work-meeting','preparation'],['work-meeting','next-meeting'],['work-meeting','deadline'],['work-meeting','sarah'],['internet','call'],['internet','hotspot'],['internet','cash'],['renewal','document'],['renewal','form'],['renewal','cash'],['dinner','sarah'],['dinner','next-meeting'],['dinner','transport'],['invitation','strategic-goal'],['invitation','cash'],['invitation','calendar']],ledger:[],resolutions:[],events:[],memory:[],prepared:[],watching:['Time','Money','Travel','People','Work','Opportunities','Purchases','Benefits','Home','Administration'],constitution:structuredClone(CONSTITUTION)};
}
export class LifeEngine{
  constructor({pace=350,now=()=>Date.now()}={}){this.pace=pace;this.now=now;this.worlds=new Map();this.busy=new Set();}
  create(){const w=seedLife();this.worlds.set(w.id,w);return w;}
  emit(w,r,type,label,data={}){const e={id:`event:${randomUUID()}`,type,label,at:new Date(this.now()).toISOString(),resolutionId:r?.id,...data};w.events.push(e);w.events=w.events.slice(-150);w.revision++;if(r)r.state=type;return e;}
  evaluate(w,r){
    const {targets,options}=capabilityPlan(r.scenario,w);
    // Traverse the shared dependency graph; unreachable entities never affect the resolution.
    const source=targets[0],edges=w.dependencies.map(([from,to])=>({from,to}));
    const ids=new Set([source,...targets]);let pending=[source];while(pending.length){const id=pending.shift();for(const e of edges.filter(e=>e.from===id))if(!ids.has(e.to)){ids.add(e.to);pending.push(e.to)}}
    const nodes=[...ids].map(id=>({id,contextId:w.context.id,label:id.replaceAll('-',' ')}));
    r.impact=impactGraph({contextId:w.context.id,sourceId:source,nodes,edges:edges.filter(e=>ids.has(e.from)&&ids.has(e.to))});
    // Source also counts as an affected outcome in the product tally.
    r.impact.affectedCount=r.impact.nodes.length+1;
    r.futures=simulateFutures(w,options.map(o=>({...o,constraints:[...(o.constraints||[]),{id:'cash',passed:(o.costs.money||0)<=w.resources.cash}]})));
    const weights={money:1,futureValue:1,commitments:1,opportunityCost:1,preferences:1,risk:w.settings.riskTolerance==='low'?2:1,time:w.settings.timeValue==='high'?2:w.settings.timeValue==='low'?.1:.4};
    r.evaluation=rankFutures(r.futures,{weights});r.options=options;r.recommended=r.evaluation.recommended;
    const selected=options.find(o=>o.id===r.recommended);r.selected=selected||null;
    r.requiresApproval=!selected||w.settings.autonomy==='ask'||selected.requiresApproval===true||selected.reversibility==='irreversible'||(selected.costs.money||0)>w.settings.spendingAuthority;
    r.compression=compressDecision({impacts:{nodes:[{id:source},...r.impact.nodes]},futures:r.futures,actions:selected?[{id:selected.id,allowed:true,requiresApproval:r.requiresApproval}]:[{id:'evidence',allowed:false}]});
    r.evidence=selected?.evidence||['No future satisfies every current constraint. Change the world or your budget.'];r.worldRevision=w.revision;r.analysisSettings=JSON.stringify(w.settings);return r;
  }
  async start(w,scenario){
    if(!SCENARIOS.some(s=>s.id===scenario))throw Error('Unknown scenario');
    if(w.resolutions.some(r=>!['outcome.restored','stopped'].includes(r.state)))throw Error('Finish or stop the active resolution first');
    if(w.resolutions.some(r=>r.scenario===scenario&&r.state==='outcome.restored'))throw Error('This event is already resolved. Reset the world to try it again.');
    const c=SCENARIOS.find(s=>s.id===scenario);const r={id:randomUUID(),scenario,title:c.title,goal:c.goal,provider:c.provider,state:'watching',actions:[],humanDecisions:0,createdAt:new Date(this.now()).toISOString(),approved:false};w.resolutions.push(r);w.resolutions=w.resolutions.slice(-30);
    if(scenario==='travel')w.travel.status='cancelled';if(scenario==='events'){w.commitments.find(c=>c.id==='founder').status='accepted';}if(scenario==='home')w.home.internet='outage';if(scenario==='purchase')w.purchases.order='delivery failed';
    r.deviation=detectDeviation({id:`deviation:${r.id}`,contextId:w.context.id,intended:{outcome:c.goal},observed:{outcome:'at risk'},evidenceIds:[c.event]});w.activeDeviations.push(r.deviation);w.activeResolutions.push({id:r.id,capability:scenario});
    this.emit(w,r,'deviation.detected',c.title,{source:c.event});
    await sleep(this.pace);if(r.state==='stopped')return r;this.emit(w,r,'impact.understood','Understanding connected consequences');this.evaluate(w,r);
    await sleep(this.pace);if(r.state==='stopped')return r;this.emit(w,r,'futures.simulated','Evaluating possible outcomes');
    await sleep(this.pace);if(r.state==='stopped')return r;this.evaluate(w,r);this.emit(w,r,'authority.checked','Checking your rules');
    if(w.settings.autonomy==='observe'){this.emit(w,r,'observing','Observe only · no action will execute');return r;}
    if(!r.selected){this.emit(w,r,'needs.information','No feasible plan · adjust a constraint');return r;}
    if(r.requiresApproval){this.emit(w,r,'decision.pending','One decision needs you');return r;}
    this.emit(w,r,'action.authorized','Within your rules · no decision needed');await this.execute(w,r);return r;
  }
  async approve(w,id,revision){const r=w.resolutions.find(r=>r.id===id);if(!r)throw Error('Resolution not found');if(r.approved)return r;if(r.state!=='decision.pending'||w.settings.autonomy==='observe')throw Error('No approval is available');if(revision!==w.revision)throw Error('The world changed. Review the updated plan.');this.evaluate(w,r);if(!r.selected)throw Error('No feasible plan');r.approved=true;r.humanDecisions=1;r.approvedOption=r.recommended;this.emit(w,r,'approval.received','Approved from your browser');await this.execute(w,r);return r;}
  policy(w,r,op){if(!ALLOWED.includes(op.type)||op.realMoney||op.expandsAuthority||op.modifiesConstitution||w.settings.autonomy==='observe'||r.state==='stopped')throw Error('Action outside authority');if(r.requiresApproval&&(!r.approved||r.approvedOption!==r.recommended))throw Error('Approval required');if((op.amount||0)>w.resources.cash&&['reserve','submit_form'].includes(op.type))throw Error('Insufficient synthetic resources');}
  async execute(w,r){if(this.busy.has(r.id))return;this.busy.add(r.id);try{
    for(const [i,op]of r.selected.operations.entries()){
      await sleep(this.pace);if(r.state==='stopped')return;this.policy(w,r,op);const actionId=`${r.id}:${i}`;if(w.ledger.some(a=>a.id===actionId))continue;
      this.emit(w,r,'action.executing',op.type.replaceAll('_',' '));
      if(op.type==='request_refund')await this.negotiate(w,r,op,actionId);else this.apply(w,r,op,actionId);
      const a={id:actionId,type:op.type,status:'completed',at:new Date(this.now()).toISOString(),operation:structuredClone(op)};w.ledger.push(a);w.ledger=w.ledger.slice(-150);r.actions.push(a);this.emit(w,r,'action.completed',`${op.type.replaceAll('_',' ')} completed`);
    }
    this.emit(w,r,'outcome.verifying','Verifying the intended outcome');await sleep(this.pace);if(r.state==='stopped')return;
    r.outcome=verifyOutcome(w,r.selected.operations.map((op,i)=>({id:`check:${r.id}:${i}`,label:this.verificationLabel(op,r),check:()=>this.verify(w,r,op)})));
    if(!r.outcome.verified){this.emit(w,r,'verification.failed','The outcome is not restored · further judgment needed');return;}
    r.deviation.status='resolved';w.activeDeviations=w.activeDeviations.filter(d=>d.id!==r.deviation.id);w.activeResolutions=w.activeResolutions.filter(a=>a.id!==r.id);w.outcomeHistory.push({resolutionId:r.id,scenario:r.scenario,...r.outcome});w.outcomeHistory=w.outcomeHistory.slice(-30);
    appendMemory(w,{id:`resolution:${r.id}`,contextId:w.context.id,kind:'resolution-history',value:{scenario:r.scenario,option:r.recommended,verified:true},source:{type:'verification',id:r.id},evidenceIds:r.outcome.evidence.map(e=>e.id)});
    this.emit(w,r,'outcome.restored','Outcome restored · watching again');
  }catch{this.emit(w,r,'action.failed','Action paused safely. Stop this resolution or reset the world.');}finally{this.busy.delete(r.id)}}
  async negotiate(w,r,op,id){
    this.emit(w,r,'provider.contacted',`Refund requested from ${r.provider}`);await sleep(this.pace);if(r.state==='stopped')throw Error('Stopped');
    if(r.scenario==='travel'){
      r.offer={credit:450,cash:412,creditWorth:Math.round(450*w.settings.airlineUseProbability),assumptions:['Airline locked','Expires','Seeded expected airline use']};this.emit(w,r,'counteroffer.received','$450 airline credit offered');await sleep(this.pace);if(r.state==='stopped')throw Error('Stopped');
      r.offer.accepted=r.offer.creditWorth>412;this.emit(w,r,'offer.evaluated',r.offer.accepted?'Credit is worth more under your explicit preference':'$412 cash is worth more to you');
      if(r.offer.accepted){w.resources.airlineCredit=(w.resources.airlineCredit||0)+450;r.offer.status='credit accepted';return;}
      this.emit(w,r,'negotiating','Credit rejected · cash requested within the mandate');await sleep(this.pace);if(r.state==='stopped')throw Error('Stopped');
    }else{this.emit(w,r,'provider.responded','Provider checked synthetic eligibility');await sleep(this.pace);if(r.state==='stopped')throw Error('Stopped');this.emit(w,r,'negotiating','Refund terms confirmed');}
    if(!w.money.refunds.some(a=>a.id===id)){w.money.refunds.push({id,amount:op.amount,provider:r.provider});w.resources.cash+=op.amount;}this.emit(w,r,'refund.confirmed',`$${op.amount} cash refund confirmed`);
  }
  apply(w,r,op,id){
    const c=w.commitments.find(c=>c.id===op.id);
    switch(op.type){
      case 'rebook':w.travel.status='rebooked';w.travel.choice=op.choice;w.travel.arrival=op.choice==='A'?'Tomorrow evening':'6:05 AM tomorrow';if(op.choice==='B'){w.resources.cash-=504;w.money.charges.push({id,amount:504,reason:'Replacement flight'});}if(op.choice==='C')w.resources.miles-=31000;break;
      case 'update_commitment':case 'reschedule':if(c)c.status=op.status;else w.work[op.id]=op.status;break;
      case 'send_message':w.people.find(p=>p.id===op.id).communication='sandbox update sent';break;
      case 'reserve':case 'submit_form':w.resources.cash-=op.amount;w.money.charges.push({id,amount:op.amount,reason:op.id});if(op.type==='submit_form')w.admin.renewal='submitted';else w.work[op.id]='reserved';break;
      case 'cancel':if(op.id==='subscription')w.subscriptions.subscription='cancelled';if(op.id==='order')w.purchases.order='cancelled';if(c)c.status='cancelled';break;
      case 'replace':w.purchases.order='replacement arrives tonight';break;
      case 'accept_offer':if(op.id==='benefit'){w.resources.benefit=0;w.benefits.benefit='applied to planned trip';}else w.opportunities[op.id]='accepted';break;
      case 'decline_offer':if(op.id==='benefit')w.benefits.benefit='expired';else w.opportunities[op.id]='declined';break;
      case 'activate_backup':w.home.backup=op.id;w.home.call='protected';break;
      case 'prepare':if(!w.prepared.includes(op.id))w.prepared.push(op.id);if(['form','document'].includes(op.id))w.admin[op.id]='prepared';break;
      case 'verify':break;
    }
  }
  verificationLabel(op,r){if(op.type==='rebook')return r.selected.id==='A'?'Tomorrow’s rebooking confirmed':'Arrival tonight’s departure confirmed';if(op.type==='request_refund')return r.offer?.accepted?'Airline credit confirmed':`$${op.amount} cash refund confirmed`;if(op.type==='update_commitment')return `Commitment ${op.status}`;return `${op.type.replaceAll('_',' ')}: ${op.id||'world'}`;}
  verify(w,r,op){const c=w.commitments.find(c=>c.id===op.id);switch(op.type){case 'rebook':return w.travel.choice===op.choice&&w.travel.status==='rebooked';case 'update_commitment':case 'reschedule':return (c?.status||w.work[op.id])===op.status;case 'request_refund':return r.offer?.accepted?w.resources.airlineCredit>=450:w.money.refunds.some(a=>a.provider===r.provider&&a.amount===op.amount);case 'send_message':return w.people.find(p=>p.id===op.id)?.communication==='sandbox update sent';case 'reserve':return w.work[op.id]==='reserved';case 'submit_form':return w.admin.renewal==='submitted';case 'cancel':return op.id==='subscription'?w.subscriptions.subscription==='cancelled':op.id==='order'?w.purchases.order==='cancelled':c?.status==='cancelled';case 'replace':return w.purchases.order==='replacement arrives tonight';case 'accept_offer':return op.id==='benefit'?w.benefits.benefit==='applied to planned trip':w.opportunities[op.id]==='accepted';case 'decline_offer':return op.id==='benefit'?w.benefits.benefit==='expired':w.opportunities[op.id]==='declined';case 'activate_backup':return w.home.backup===op.id&&w.home.call==='protected';case 'prepare':return w.prepared.includes(op.id);case 'verify':return true;default:return false;}}
  change(w,input){
    const active=w.resolutions.find(r=>!['outcome.restored','stopped'].includes(r.state));if(active&&this.busy.has(active.id))throw Error('An authorized action is running. Stop it before changing its mandate.');
    const changes={};if(typeof input.text==='string'){
      const t=input.text.toLowerCase().trim();if(t.length>300)throw Error('Use a short synthetic update');
      if(/(meeting|commitment).*(isn.t important|not important|doesn.t matter|less important)/.test(t))changes.meetingImportance=0;
      else if(/(meeting|commitment).*(important|must preserve)/.test(t))changes.meetingImportance=1;
      const hour=t.match(/meeting.*?(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);if(hour)changes.meetingHour=(Number(hour[1])%12)+(hour[3]==='pm'?12:0)+(Number(hour[2]||0)/60);
      const budget=t.match(/(?:spend|budget|more than|limit).*?\$\s*(\d{1,4})/);if(budget)changes.maxSpend=Number(budget[1]);
      if(/preserve.*miles|keep.*miles/.test(t))changes.preserveMiles=true;
      if(/(use|spend).*miles|miles.*(not important|don.t matter)/.test(t))changes.preserveMiles=false;
      if(/delivery.*(not urgent|isn.t urgent|no longer urgent)/.test(t))changes.deliveryUrgent=false;
      if(/rather.*dinner|personal.*priority/.test(t))changes.calendarPriority='personal';
      if(/hotel.*cancel/.test(t))changes.hotel='cancelled';
      if(!Object.keys(changes).length)return {recognized:false,message:'I could not safely interpret that update. Use the structured controls below; no state changed.'};
    }else if(input.settings&&typeof input.settings==='object'&&!Array.isArray(input.settings))Object.assign(changes,input.settings);else throw Error('A supported update is required');
    const bounds={maxSpend:[0,2000],spendingAuthority:[0,250],meetingHour:[0,23.99],meetingImportance:[0,1],airlineUseProbability:[0,1]};
    const enums={autonomy:MODES,timeValue:['low','medium','high'],riskTolerance:['low','balanced','high'],calendarPriority:['personal','balanced','professional'],subscriptionUsage:['low','high']};
    for(const [key,value]of Object.entries(changes)){if(bounds[key]){if(typeof value!=='number'||!Number.isFinite(value)||value<bounds[key][0]||value>bounds[key][1])throw Error('Invalid constraint');}else if(enums[key]){if(!enums[key].includes(value))throw Error('Invalid preference');}else if(['preserveMiles','deliveryUrgent'].includes(key)){if(typeof value!=='boolean')throw Error('Invalid preference');}else if(key==='hotel'){if(value!=='cancelled')throw Error('Invalid hotel observation');}else throw Error('This field cannot be changed');}
    for(const [key,value]of Object.entries(changes)){if(key==='meetingImportance')w.commitments.find(c=>c.id==='morning').importance=value;else if(key==='meetingHour')w.commitments.find(c=>c.id==='morning').hour=value;else if(key==='hotel')w.travel.hotel=value;else w.settings[key]=value;}
    appendMemory(w,{id:`change:${randomUUID()}`,contextId:w.context.id,kind:'explicit-rule',value:changes,source:{type:'human',id:`visitor:${w.id}`},explicit:true});this.emit(w,null,'world.changed','Explicit synthetic constraints updated',{changes});
    if(active){active.approved=false;this.evaluate(w,active);if(w.settings.autonomy==='observe')this.emit(w,active,'observing','Observe only · actions paused');else if(!active.selected)this.emit(w,active,'needs.information','No feasible plan · adjust a constraint');else if(active.requiresApproval)this.emit(w,active,'decision.pending','Plan recalculated · review the new decision');else{this.emit(w,active,'action.authorized','Updated rules permit a reversible action');void this.execute(w,active);}}
    if(changes.hotel)this.emit(w,null,'needs.information','Hotel cancellation recorded. Hotel recovery is not available yet.');
    return {recognized:true,message:'World updated. Recommendations use the new constraints.',changes};
  }
  stop(w,id){const r=w.resolutions.find(r=>r.id===id);if(!r)throw Error('Resolution not found');if(r.state==='outcome.restored'||r.state==='stopped')return;this.emit(w,r,'stopped','No further actions will execute');w.activeDeviations=w.activeDeviations.filter(d=>d.id!==r.deviation?.id);w.activeResolutions=w.activeResolutions.filter(a=>a.id!==r.id);}
  reset(w){if(w.resolutions.some(r=>this.busy.has(r.id)))throw Error('Stop the active resolution and wait for its action to settle before resetting');for(const r of w.resolutions)this.stop(w,r.id);const fresh=seedLife(w.id);Object.keys(w).forEach(k=>delete w[k]);Object.assign(w,fresh);this.emit(w,null,'world.reset','Synthetic world reset');return w;}
}
