// AREA Owner Finder — app logic (Firebase-backed, offline-capable fallback)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch, enableIndexedDbPersistence }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = s => document.querySelector(s);
const SEED = window.__SEED__ || [];
const FB = window.__FB__ || {};
const ADMINPW = window.__ADMINPW__ || "";
const okCol = '#1f7a4d', pendCol = '#b25a00';

// ---- state ----
let assets = {};            // n -> record  (live, from Firestore or seed)
SEED.forEach(r => assets[r.n] = r);
let isAdmin = false;
let db = null, fbReady = false, seeded = false;
let editingNo = null;

// ---- map ----
const map = L.map('map', { zoomControl: true, maxZoom: 20 }).setView([17.5945, 83.0975], 15);
const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { maxZoom: 20, maxNativeZoom: 19, attribution: 'Imagery &copy; Esri, Maxar' });
const labels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  { maxZoom: 20, maxNativeZoom: 19, opacity: .9 });
const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  { maxZoom: 19, attribution: '&copy; OpenStreetMap' });
let satOn = true;
function setSat(on){ satOn=on; if(on){street.remove();sat.addTo(map);labels.addTo(map);$('#layerBtn').classList.add('on');}else{sat.remove();labels.remove();street.addTo(map);$('#layerBtn').classList.remove('on');} }
setSat(true);
$('#layerBtn').onclick = () => setSat(!satOn);

let markerLayer = L.layerGroup().addTo(map);
let polyLayer = L.layerGroup().addTo(map);
let mkIndex = {};

function esc(s){return String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}

function render(){
  markerLayer.clearLayers(); polyLayer.clearLayers(); mkIndex = {};
  let ok=0, pend=0;
  Object.values(assets).forEach(d=>{
    if(typeof d.lat!=='number'||typeof d.lng!=='number') return;
    if(d.poly && d.poly.length>=3){
      const pg=L.polygon(d.poly,{color:okCol,weight:1.6,fillColor:okCol,fillOpacity:.18});
      pg.on('click',()=>openSheet(d.n)); polyLayer.addLayer(pg);
    }
    const prec=!d.approx; prec?ok++:pend++;
    const ic=L.divIcon({className:'pinlbl',html:'<span style="background:'+(prec?okCol:pendCol)+'"><b>'+d.n+'</b></span>',iconSize:[22,22],iconAnchor:[11,22]});
    const mk=L.marker([d.lat,d.lng],{icon:ic}); mk.on('click',()=>openSheet(d.n));
    markerLayer.addLayer(mk); mkIndex[d.n]=mk;
  });
  $('#legOk').textContent=ok; $('#legPend').textContent=pend;
  $('#sub').textContent=Object.keys(assets).length+' assets · NTPC Simhadri';
}
function fitAll(){
  const pts=Object.values(assets).filter(d=>typeof d.lat==='number').map(d=>[d.lat,d.lng]);
  if(pts.length) map.fitBounds(L.latLngBounds(pts),{padding:[40,40]});
}
$('#fitBtn').onclick=fitAll;

// ---- detail sheet ----
function telHref(m){ return 'tel:'+String(m).replace(/[^0-9+]/g,''); }
function openSheet(no){
  const d=assets[no]; if(!d) return;
  $('#shNum').textContent='#'+no;
  $('#shArea').textContent=d.a; $('#shSec').textContent=d.g;
  $('#shKv').innerHTML='<span class="k">Group: <b>'+esc(d.g)+'</b></span><span class="k">S.No: <b>'+no+'</b></span>'+(d.poly?'<span class="k">Boundary: <b>mapped</b></span>':'');
  // owner card + contacts
  let oh='';
  if(d.owner||d.mobile||d.email){
    oh+='<div class="owner"><div class="onm">'+esc(d.owner||'—')+'</div>';
    const role=[d.desig,d.dept].filter(Boolean).join(' · ');
    oh+='<div class="orole">'+esc(role||'')+(d.emp?'  ·  Emp '+esc(d.emp):'')+'</div>';
    oh+='<div class="contacts">';
    if(d.mobile) oh+='<a class="crow" href="'+telHref(d.mobile)+'"><span class="ci">&#128222;</span><span class="ctx"><span class="cl">Call</span><span class="cv">'+esc(d.mobile)+'</span></span><span class="cgo">&#8250;</span></a>';
    if(d.email) oh+='<a class="crow" href="mailto:'+esc(d.email)+'?subject='+encodeURIComponent('NTPC Simhadri — '+(d.a||'Area'))+'"><span class="ci">&#9993;</span><span class="ctx"><span class="cl">Email</span><span class="cv">'+esc(d.email)+'</span></span><span class="cgo">&#8250;</span></a>';
    oh+='</div></div>';
  }
  $('#shOwner').innerHTML=oh;
  const st=$('#shStatus'); const cls=d.approx?'pend':'ok';
  st.className='status '+cls;
  st.innerHTML='<div><div>'+(d.approx?'Approximate (layout-derived)':'Mapped polygon — precise')+'</div><div class="coords">'+(+d.lat).toFixed(6)+', '+(+d.lng).toFixed(6)+'</div></div>';
  // actions
  let ah='<button class="btn go" id="routeBtn">&#129517; Directions (in-app)</button>'
       + '<a class="btn sec" href="https://www.google.com/maps/dir/?api=1&destination='+d.lat+','+d.lng+'" target="_blank" rel="noopener">&#128205; Google Maps</a>';
  if(isAdmin) ah+='<button class="btn edit" id="editBtn">&#9999;&#65039; Edit</button><button class="btn del" id="delBtn">&#128465;&#65039; Delete</button>';
  $('#shActs').innerHTML=ah;
  $('#routeBtn').onclick=()=>routeTo(no);
  if(isAdmin){ $('#editBtn').onclick=()=>openEdit(no); $('#delBtn').onclick=()=>delLoc(no); }
  $('#shNote').textContent=d.poly?'Standing inside this boundary identifies this asset.':'';
  $('#sheet').classList.add('show');
  map.setView([d.lat,d.lng],Math.max(map.getZoom(),18));
}
$('#shX').onclick=()=>$('#sheet').classList.remove('show');

// ---- search ----
const q=$('#q'),results=$('#results'),clr=$('#clr');
function doSearch(){
  const v=q.value.trim().toLowerCase(); clr.hidden=!v;
  if(!v){results.hidden=true;return;}
  const hits=Object.values(assets).filter(d=>{
    return (d.a||'').toLowerCase().includes(v)||(d.g||'').toLowerCase().includes(v)||
           (d.owner||'').toLowerCase().includes(v)||(d.dept||'').toLowerCase().includes(v)||
           (d.emp||'').toString().includes(v)||String(d.n)===v;
  }).slice(0,60);
  results.innerHTML=hits.map(d=>{const dot=d.approx?'pend':'ok';const sub=[d.g,d.owner].filter(Boolean).map(esc).join(' · ');
    return '<div class="ritem" data-no="'+d.n+'"><span class="rdot '+dot+'"></span><div class="rtext"><div class="a">'+esc(d.a)+'</div><div class="o">'+sub+'</div></div><span class="rnum">#'+d.n+'</span></div>';}).join('');
  results.hidden=false;
  results.querySelectorAll('.ritem').forEach(el=>el.onclick=()=>{results.hidden=true;q.blur();openSheet(+el.dataset.no);});
}
q.addEventListener('input',doSearch); clr.onclick=()=>{q.value='';doSearch();q.focus();};

// ---- toast ----
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800);}

// ---- geolocation / My Location ----
let meMarker=null, mePos=null;
$('#hereBtn').onclick=()=>{
  if(!navigator.geolocation){toast('Geolocation not available');return;}
  toast('Locating…');
  navigator.geolocation.getCurrentPosition(pos=>{
    mePos={lat:pos.coords.latitude,lng:pos.coords.longitude};
    if(meMarker)meMarker.remove();
    meMarker=L.marker([mePos.lat,mePos.lng],{icon:L.divIcon({className:'',html:'<div class="me-dot"></div>',iconSize:[18,18],iconAnchor:[9,9]}),zIndexOffset:1000}).addTo(map);
    map.setView([mePos.lat,mePos.lng],18);
    // which asset am I inside?
    let inside=null;
    for(const d of Object.values(assets)){ if(d.poly&&pip(mePos.lat,mePos.lng,d.poly)){inside=d.n;break;} }
    if(inside){openSheet(inside);toast('You are in: '+assets[inside].a+(assets[inside].owner?' — '+assets[inside].owner:''));}
    else{
      let best=null,bd=1e9;
      for(const d of Object.values(assets)){ if(typeof d.lat!=='number')continue; const dd=(d.lat-mePos.lat)**2+(d.lng-mePos.lng)**2; if(dd<bd){bd=dd;best=d.n;} }
      if(best){openSheet(best);toast('Nearest: '+assets[best].a);}
    }
  },err=>toast('Location error: '+err.message+' — allow location access.'),{enableHighAccuracy:true,timeout:15000,maximumAge:0});
};
function pLat(p){return Array.isArray(p)?p[0]:p.lat;}
function pLng(p){return Array.isArray(p)?p[1]:p.lng;}
function pip(lat,lng,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const yi=pLat(poly[i]),xi=pLng(poly[i]),yj=pLat(poly[j]),xj=pLng(poly[j]);if(((yi>lat)!=(yj>lat))&&(lng<(xj-xi)*(lat-yi)/(yj-yi)+xi))c=!c;}return c;}

// ---- in-app directions ----
let routeLine=null;
function haversine(a,b){const R=6371e3,toR=x=>x*Math.PI/180;const dLa=toR(b.lat-a.lat),dLo=toR(b.lng-a.lng);const s=Math.sin(dLa/2)**2+Math.cos(toR(a.lat))*Math.cos(toR(b.lat))*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(s));}
function clearRoute(){ if(routeLine){routeLine.remove();routeLine=null;} $('#routebox').classList.remove('show'); }
$('#clrRoute').onclick=clearRoute;
function showRouteInfo(distM,dest,straight){
  const km=distM/1000;
  const walkMin=Math.round(distM/ (1.35*60));   // ~1.35 m/s walking
  $('#rdist').textContent=km<1?Math.round(distM)+' m':km.toFixed(2)+' km';
  $('#rtime').textContent=walkMin+' min walk';
  $('#rdest').textContent=dest+(straight?' (straight line)':'');
  $('#routebox').classList.add('show');
}
async function routeTo(no){
  const d=assets[no]; if(!d) return;
  if(!mePos){
    if(!navigator.geolocation){toast('Enable location first');return;}
    toast('Getting your location…');
    await new Promise(res=>navigator.geolocation.getCurrentPosition(p=>{mePos={lat:p.coords.latitude,lng:p.coords.longitude};res();},e=>{toast('Location error: '+e.message);res();},{enableHighAccuracy:true,timeout:15000}));
    if(!mePos) return;
    if(meMarker)meMarker.remove();
    meMarker=L.marker([mePos.lat,mePos.lng],{icon:L.divIcon({className:'',html:'<div class="me-dot"></div>',iconSize:[18,18],iconAnchor:[9,9]}),zIndexOffset:1000}).addTo(map);
  }
  $('#sheet').classList.remove('show');
  clearRoute();
  const from={lat:mePos.lat,lng:mePos.lng}, to={lat:+d.lat,lng:+d.lng};
  // try OSRM road route; fall back to straight line offline
  try{
    const u='https://router.project-osrm.org/route/v1/walking/'+from.lng+','+from.lat+';'+to.lng+','+to.lat+'?overview=full&geometries=geojson';
    const r=await fetch(u); const j=await r.json();
    if(j.routes&&j.routes[0]){
      const coords=j.routes[0].geometry.coordinates.map(c=>[c[1],c[0]]);
      routeLine=L.polyline(coords,{color:'#1a73e8',weight:5,opacity:.85}).addTo(map);
      map.fitBounds(routeLine.getBounds(),{padding:[60,60]});
      showRouteInfo(j.routes[0].distance,d.a,false);
      return;
    }
  }catch(e){/* offline → straight line */}
  routeLine=L.polyline([[from.lat,from.lng],[to.lat,to.lng]],{color:'#1a73e8',weight:4,opacity:.8,dashArray:'7,7'}).addTo(map);
  map.fitBounds(routeLine.getBounds(),{padding:[60,60]});
  showRouteInfo(haversine(from,to),d.a,true);
}

// ---- admin ----
const loginModal=$('#loginModal'), editModal=$('#editModal');
$('#adminBadge').onclick=()=>{ if(isAdmin){ /* already admin */ toast('Admin mode active'); } else loginModal.classList.add('show'); };
$('#loginCancel').onclick=()=>loginModal.classList.remove('show');
$('#loginGo').onclick=()=>{
  if($('#pw').value===ADMINPW){ setAdmin(true); loginModal.classList.remove('show'); $('#pw').value=''; toast('Admin mode on'); }
  else toast('Wrong password');
};
$('#pw').addEventListener('keydown',e=>{if(e.key==='Enter')$('#loginGo').click();});
function setAdmin(on){
  isAdmin=on;
  $('#adminBadge').classList.toggle('admin',on);
  $('#adminBadge').innerHTML=on?'&#128275; Admin':'&#128274; Admin';
  $('#ebar').classList.toggle('show',on);
  if(!fbReady && on) toast('Note: Firebase not connected — edits are local only.');
}
$('#logout').onclick=()=>{ setAdmin(false); toast('Admin mode off'); };
$('#addLoc').onclick=()=>openEdit(null);

function openEdit(no){
  editingNo=no;
  const d = no!=null ? assets[no] : {};
  $('#editTitle').textContent = no!=null ? 'Edit location #'+no : 'Add new location';
  $('#editSub').textContent = no!=null ? (d.a||'') : 'Create a new asset/location with owner details.';
  $('#eA').value=d.a||''; $('#eG').value=d.g||'';
  $('#eLat').value=d.lat!=null?d.lat:''; $('#eLng').value=d.lng!=null?d.lng:'';
  $('#eOwner').value=d.owner||''; $('#eEmp').value=d.emp||'';
  $('#eDesig').value=d.desig||''; $('#eDept').value=d.dept||'';
  $('#eMobile').value=d.mobile||''; $('#eEmail').value=d.email||'';
  $('#editNote').textContent = fbReady ? 'Saved changes go live for all users instantly.' : 'Firebase not connected — change is local to this device only.';
  editModal.classList.add('show');
}
$('#editCancel').onclick=()=>editModal.classList.remove('show');
$('#editSave').onclick=async()=>{
  const lat=parseFloat($('#eLat').value), lng=parseFloat($('#eLng').value);
  if(!$('#eA').value.trim()){toast('Name required');return;}
  if(isNaN(lat)||isNaN(lng)){toast('Valid lat/lng required');return;}
  let no=editingNo;
  if(no==null){ no=1+Math.max(0,...Object.keys(assets).map(Number)); }
  const rec={...(assets[no]||{}), n:no, a:$('#eA').value.trim(), g:$('#eG').value.trim(),
    lat, lng, owner:$('#eOwner').value.trim(), emp:$('#eEmp').value.trim(),
    desig:$('#eDesig').value.trim(), dept:$('#eDept').value.trim(),
    mobile:$('#eMobile').value.trim(), email:$('#eEmail').value.trim() };
  if(!('approx' in rec)) rec.approx=false;
  assets[no]=rec; render();
  editModal.classList.remove('show');
  if(fbReady){ try{ await setDoc(doc(db,'assets',String(no)), rec); toast('Saved & live'); }catch(e){ toast('Save failed: '+e.message); } }
  else toast('Saved locally');
  openSheet(no);
};
async function delLoc(no){
  if(!confirm('Delete location #'+no+' ("'+(assets[no]?.a||'')+'")? This cannot be undone.')) return;
  delete assets[no]; render(); $('#sheet').classList.remove('show');
  if(fbReady){ try{ await deleteDoc(doc(db,'assets',String(no))); toast('Deleted & live'); }catch(e){ toast('Delete failed: '+e.message); } }
  else toast('Deleted locally');
}

// ---- install prompt ----
let deferred=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;$('#installBtn').classList.add('show');});
$('#installBtn').onclick=async()=>{if(!deferred)return;deferred.prompt();await deferred.userChoice;deferred=null;$('#installBtn').classList.remove('show');};
window.addEventListener('appinstalled',()=>$('#installBtn').classList.remove('show'));
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('service-worker.js').catch(()=>{}));}

// ---- Firebase connect + live sync ----
async function connectFirebase(){
  if(!FB || !FB.projectId || FB.projectId==='PASTE_HERE'){ fbReady=false; render(); fitAll(); return; }
  try{
    const app=initializeApp(FB);
    db=getFirestore(app);
    try{ await enableIndexedDbPersistence(db); }catch(_){}
    onSnapshot(collection(db,'assets'),snap=>{
      // first run (or incomplete seed): load the embedded 360 assets in one batch
      if(snap.size < SEED.length && !seeded){
        seeded=true;
        seedFirestore();
        return;
      }
      const next={};
      snap.forEach(docSnap=>{ const v=docSnap.data(); if(v&&typeof v.n!=='undefined') next[v.n]=v; });
      if(Object.keys(next).length){ assets=next; render(); if(map.getZoom()<13) fitAll(); }
    },err=>{ toast('Live sync error: '+err.message); fbReady=false; });
    fbReady=true;
    render(); fitAll();
  }catch(e){ fbReady=false; toast('Firebase init failed — running offline.'); render(); fitAll(); }
}
async function seedFirestore(){
  try{
    toast('First run: loading 360 assets…');
    // Firestore allows up to 500 writes per batch; commit in chunks.
    for(let i=0;i<SEED.length;i+=400){
      const batch=writeBatch(db);
      SEED.slice(i,i+400).forEach(r=>batch.set(doc(db,'assets',String(r.n)), r));
      await batch.commit();
    }
    toast('Database ready — 360 assets loaded.');
  }catch(e){ toast('Seed failed: '+e.message); seeded=false; }
}

render(); fitAll();
connectFirebase();
