export function initRenderer(){
'use strict';
const names=['base rotate 180 degrees','shoulder rotate up and down','wrist rotate 180','wrist_upanddown','hand'];
const J=[{id:'base',title:'Base — LOCKED',part:0,axis:null,min:0,max:0,val:0,p:[-20,3,85]},{id:'shoulder',title:'Shoulder — horizontal 180°',part:1,axis:'z',min:-90,max:90,val:0,p:[-20,3,55]},{id:'wristYaw',title:'Wrist axial rotation — UP / DOWN 180°',part:2,axis:'x',min:-90,max:90,val:0,p:[-42.5,3.5,32.5]},{id:'wristPitch',title:'Wrist up/down — HORIZONTAL 180° (−90° to +90°)',part:3,axis:'z',min:-90,max:90,val:0,p:[-23,-6,-29]},{id:'handPitch',title:'Hand — X-axis up/down 180°',part:4,axis:'x',min:-90,max:90,val:0,p:[-41.5,-0.5,-63]}];
const vis=[true,true,true,true,true];let camAz=0.7,camEl=0.19,zoom=425;const canvas=document.getElementById('scene'),gl=canvas.getContext('webgl2',{antialias:true,alpha:false})||canvas.getContext('webgl',{antialias:true,alpha:false});const $=id=>document.getElementById(id);if(!gl){$('readout').textContent='WebGL unavailable';return}
function shader(type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh}
const prog=gl.createProgram();gl.attachShader(prog,shader(gl.VERTEX_SHADER,`attribute vec3 pos; attribute vec3 norm;uniform mat4 mvp;uniform mat4 model;varying vec3 vN;varying vec3 vP;void main(){vec4 p=model*vec4(pos,1.);vP=p.xyz;vN=mat3(model)*norm;gl_Position=mvp*vec4(pos,1.);}`));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec3 vN;varying vec3 vP;uniform vec3 baseColor;void main(){vec3 n=normalize(vN);float diffuse=.40+.48*max(0.,dot(n,normalize(vec3(.5,.8,.7))));gl_FragColor=vec4(baseColor*diffuse+vec3(.07,.11,.13),1.);}`));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));gl.useProgram(prog);
const pLoc=gl.getAttribLocation(prog,'pos'),nLoc=gl.getAttribLocation(prog,'norm'),mvpLoc=gl.getUniformLocation(prog,'mvp'),modelLoc=gl.getUniformLocation(prog,'model'),colorLoc=gl.getUniformLocation(prog,'baseColor');
let buffers=names.map((name)=>{let src=window.ARM_GEOMETRY[name],v=Float32Array.from(src.v),n=Float32Array.from(src.n),ix=src.i;let vb=gl.createBuffer(),nb=gl.createBuffer(),ib=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,v,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,n,gl.STATIC_DRAW);let uses32=v.length/3>65535,ext=uses32&&!('drawElementsInstanced' in gl)?gl.getExtension('OES_element_index_uint'):null;gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,uses32?new Uint32Array(ix):new Uint16Array(ix),gl.STATIC_DRAW);return {vb,nb,ib,count:ix.length,type:uses32?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT}});
// Column-major transforms.
const I=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];function mm(a,b){let r=Array(16).fill(0);for(let c=0;c<4;c++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)r[c*4+row]+=a[k*4+row]*b[c*4+k];return r}function tr(x,y,z){let a=I();a[12]=x;a[13]=y;a[14]=z;return a}function rot(axis,t){let a=I(),c=Math.cos(t),s=Math.sin(t);if(axis==='z'){a[0]=c;a[4]=-s;a[1]=s;a[5]=c}else if(axis==='y'){a[0]=c;a[8]=s;a[2]=-s;a[10]=c}else if(axis==='x'){a[5]=c;a[9]=-s;a[6]=s;a[10]=c}return a}function motion(j){let p=j.p;let safeAngle=Math.min(j.max,Math.max(j.min,j.val));return mm(mm(tr(...p),rot(j.axis,safeAngle*Math.PI/180)),tr(-p[0],-p[1],-p[2]))}
function look(eye,at,up){let sub=(a,b)=>a.map((x,i)=>x-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=v=>{let l=Math.hypot(...v)||1;return v.map(x=>x/l)};let z=unit(sub(eye,at)),x=unit(cross(up,z)),y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((a,t,i)=>a+t*eye[i],0),-y.reduce((a,t,i)=>a+t*eye[i],0),-z.reduce((a,t,i)=>a+t*eye[i],0),1]}
function perspective(fov,asp,n,f){let t=1/Math.tan(fov/2);return [t/asp,0,0,0,0,t,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0]}
// GLB geometry uses the negative Z direction as 'up'. Rotate presentation to make it screen-up.
const orient=[1,0,0,0,0,0,1,0,0,-1,0,0,0,0,0,1]; // (x,y,z) -> (x,-z,y)
// Static world-space floor grid, generated in the coordinate system of the rendered arm.
let gridVertices=null,gridNormals=null,gridGroups=[];
const gridVB=gl.createBuffer(),gridNB=gl.createBuffer();
// Model coordinates map (x,y,z) -> (x,-z,y). The base mesh is fixed,
// so its maximum source Z is the lowest visible point in the viewer.
const baseVertices=window.ARM_GEOMETRY[names[0]].v;
let baseMaxSourceZ=-Infinity;
for(let i=2;i<baseVertices.length;i+=3) baseMaxSourceZ=Math.max(baseMaxSourceZ,baseVertices[i]);
const floorClearance=0.75;
const baseBottomWorldY=-baseMaxSourceZ;
$('gridHeight').value=(baseBottomWorldY-floorClearance).toFixed(2);

function buildGrid(){
 const step=Number($('gridSpacing').value)||20;
 const y=Number($('gridHeight').value)||0;
 const centerX=-20,centerZ=3,half=200;
 let vertex=[],groups=[];
 function line(x1,z1,x2,z2,color){let first=vertex.length/3;vertex.push(x1,y,z1,x2,y,z2);groups.push({first,color})}
 for(let a=-half;a<=half;a+=step){
   let major=Math.abs(a% (step*5))<.001;
   line(centerX+a,centerZ-half,centerX+a,centerZ+half,major?[.08,.45,.69]:[.07,.22,.34]);
   line(centerX-half,centerZ+a,centerX+half,centerZ+a,major?[.08,.45,.69]:[.07,.22,.34]);
 }
 line(centerX-half,centerZ,centerX+half,centerZ,[.02,.57,.94]);
 line(centerX,centerZ-half,centerX,centerZ+half,[1.0,.36,.03]);
 gridVertices=vertex;gridGroups=groups;
 gl.bindBuffer(gl.ARRAY_BUFFER,gridVB);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertex),gl.STATIC_DRAW);
 gl.bindBuffer(gl.ARRAY_BUFFER,gridNB);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(Array(vertex.length/3).fill(0).flatMap(()=>[0,1,0])),gl.STATIC_DRAW);
}
$('gridSpacing').addEventListener('change',buildGrid);
$('gridHeight').addEventListener('input',buildGrid);
buildGrid();
function drawGrid(){
 if(!$('gridVisible').checked)return;
 gl.disable(gl.CULL_FACE);
 gl.bindBuffer(gl.ARRAY_BUFFER,gridVB);gl.vertexAttribPointer(pLoc,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(pLoc);
 gl.bindBuffer(gl.ARRAY_BUFFER,gridNB);gl.vertexAttribPointer(nLoc,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(nLoc);
 gl.uniformMatrix4fv(mvpLoc,false,new Float32Array(viewproj));
 gl.uniformMatrix4fv(modelLoc,false,new Float32Array(I()));
 for(const g of gridGroups){gl.uniform3fv(colorLoc,g.color);gl.drawArrays(gl.LINES,g.first,2)}
 gl.enable(gl.CULL_FACE);
}
const focus=[-20,35,0];let viewproj=I();let matrices=[];const colors=[[.47,.60,.72],[1.0,.36,.04],[.42,.61,.77],[.93,.43,.08],[.70,.79,.86]];
function frame(){let w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2),pw=Math.max(1,Math.round(w*dpr)),ph=Math.max(1,Math.round(h*dpr));if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph}gl.viewport(0,0,pw,ph);gl.clearColor(.035,.076,.12,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);let cx=focus[0],cy=focus[1],cz=focus[2],eye=[cx+zoom*Math.cos(camEl)*Math.cos(camAz),cy+zoom*Math.sin(camEl),cz+zoom*Math.cos(camEl)*Math.sin(camAz)];viewproj=mm(perspective(0.72,w/h,.5,5000),look(eye,focus,[0,1,0]));drawGrid();let accumulated=I();matrices=[];for(let i=0;i<5;i++){if(i>0&&i<5)accumulated=mm(accumulated,motion(J[i]));matrices.push(mm(orient,accumulated));if(!vis[i])continue;let item=buffers[i];gl.bindBuffer(gl.ARRAY_BUFFER,item.vb);gl.vertexAttribPointer(pLoc,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(pLoc);gl.bindBuffer(gl.ARRAY_BUFFER,item.nb);gl.vertexAttribPointer(nLoc,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(nLoc);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,item.ib);gl.uniformMatrix4fv(mvpLoc,false,new Float32Array(mm(viewproj,matrices[i])));gl.uniformMatrix4fv(modelLoc,false,new Float32Array(matrices[i]));gl.uniform3fv(colorLoc,colors[i]);gl.drawElements(gl.TRIANGLES,item.count,item.type,0)}updateTarget();requestAnimationFrame(frame)}
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));function refresh(){J.forEach(j=>{let e=$('r-'+j.id),out=$('o-'+j.id);if(e){e.value=j.val;let pct=j.max>j.min?100*(j.val-j.min)/(j.max-j.min):0;e.style.setProperty('--fill',Math.max(0,Math.min(100,pct)).toFixed(2)+'%')}if(out)out.textContent=j.val+'°'});$('readout').textContent='Actual GLB · Hand '+J[4].val+'° · Shoulder '+J[1].val+'° · Base fixed'}
$('jointcontrols').innerHTML=J.map(j=>`<div class="joint"><div class="jhead"><strong>${j.title}</strong><output id="o-${j.id}"></output></div><input id="r-${j.id}" type="range" min="${j.min}" max="${j.max}" step="1" value="${j.val}" ${j.id==='base'?'disabled title="Base is permanently fixed"':''}></div>`).join('');J.forEach(j=>$('r-'+j.id).addEventListener('input',e=>{if(editing){e.target.value=0;return}j.val=clamp(+e.target.value,j.min,j.max);refresh()}));
$('meshcontrols').innerHTML=names.map((n,i)=>`<label class="meshline"><input type="checkbox" id="v${i}" checked><span>${i+1}. ${n}</span></label>`).join('');names.forEach((n,i)=>$('v'+i).addEventListener('change',e=>vis[i]=e.target.checked));
$('pivotcontrols').innerHTML=J.slice(1,5).map(j=>`<div class="joint"><b>${j.title}</b><div class="pivotgrid">${j.p.map((v,k)=>`<label>${['X','Y','Z'][k]}<input type="number" step="0.5" id="p-${j.id}-${k}" value="${v}"></label>`).join('')}</div><div class="small">Axis: ${j.axis.toUpperCase()}</div></div>`).join('');J.slice(1,5).forEach(j=>j.p.forEach((v,k)=>$('p-'+j.id+'-'+k).addEventListener('input',e=>{if(e.target.value!==''){j.p[k]=Number(e.target.value);updatePivotMarkers()}})));
$('home').onclick=()=>{J.forEach(j=>j.val=0);refresh()};$('front').onclick=()=>{camAz=Math.PI/2;camEl=0};$('side').onclick=()=>{camAz=0;camEl=0};$('top').onclick=()=>{camAz=0;camEl=1.45};
// Kinematic solver: chain is in GLB model coordinates; projection uses the same matrices as rendering.
let drag=null,ikAim=null,ikError=0;
// Actual tool-center point: distal end of the hand mesh, beyond its X-axis pivot.
// This ensures handPitch contributes a nonzero positional Jacobian.
const TCP=[-21,-6,-151];
function chainPoint(){let a=I();for(let k=1;k<=4;k++)a=mm(a,motion(J[k]));let p=TCP;return [0,1,2].map(r=>a[r]*p[0]+a[4+r]*p[1]+a[8+r]*p[2]+a[12+r])}
function projectWorld(p){let m=mm(viewproj,orient),q=[0,0,0,0],v=[...p,1];for(let r=0;r<4;r++)for(let c=0;c<4;c++)q[r]+=m[c*4+r]*v[c];return q[3]>0?{x:canvas.clientWidth*(q[0]/q[3]+1)/2,y:canvas.clientHeight*(1-q[1]/q[3])/2}:null}
function tip(){return projectWorld(chainPoint())}
function solveIK(target){let active=J.slice(1).filter(j=>$('ik-'+j.id).checked);if(!active.length)return;
  // Screen-space damped least squares; numerical derivatives in px/degree.
  for(let iter=0;iter<44;iter++){
    let pos=tip();if(!pos)break;let ex=target.x-pos.x,ey=target.y-pos.y,err=Math.hypot(ex,ey);ikError=err;if(err<1.7)break;
    let cols=active.map(j=>{let original=j.val,step=0.35;j.val=clamp(original+step,j.min,j.max);let d=j.val-original;if(!d){j.val=clamp(original-step,j.min,j.max);d=j.val-original}let sample=tip();j.val=original;return sample&&d?[ (sample.x-pos.x)/d,(sample.y-pos.y)/d ]:[0,0]});
    let a=2.5,b=0,c=2.5;for(let col of cols){a+=col[0]*col[0];b+=col[0]*col[1];c+=col[1]*col[1]}let det=a*c-b*b;if(det<1e-7)break;
    let ux=(c*ex-b*ey)/det,uy=(-b*ex+a*ey)/det;
    active.forEach((j,i)=>{let d=cols[i][0]*ux+cols[i][1]*uy;j.val=clamp(j.val+clamp(d,-6,6),j.min,j.max)});
  }
  let final=tip();if(final)ikError=Math.hypot(target.x-final.x,target.y-final.y);
  refresh();$('ikstatus').textContent=ikError<12?'Target reached within '+ikError.toFixed(0)+' px.':'Target error '+ikError.toFixed(0)+' px — possibly unreachable or limited by joints.';
}
const initialPivots=J.map(j=>j.p.slice());let editing=false,selectedPivot=1,editSnapshot=null,pivotMarkers=[];
const pivotLayer=$('pivotmarkers');J.slice(1).forEach((j,i)=>{const m=document.createElement('div');m.className='pivotdot hidden';m.innerHTML='<span>'+['Shoulder','Wrist axial','Wrist horizontal','Hand'][i]+'</span>';pivotLayer.appendChild(m);pivotMarkers.push(m)});
function syncPivotInputs(){J.slice(1).forEach(j=>j.p.forEach((v,k)=>{let e=$('p-'+j.id+'-'+k);if(e)e.value=Number(v.toFixed(3))}))}
function applyPoint(mat,p){return [0,1,2].map(r=>mat[r]*p[0]+mat[4+r]*p[1]+mat[8+r]*p[2]+mat[12+r])}
function pivotPoint(index){let a=I();for(let k=1;k<index;k++)a=mm(a,motion(J[k]));return projectWorld(applyPoint(a,J[index].p))}
function updatePivotMarkers(){pivotMarkers.forEach((m,k)=>{const idx=k+1,pos=editing?pivotPoint(idx):null;m.classList.toggle('hidden',!pos);m.classList.toggle('selected',idx===selectedPivot);if(pos){m.style.left=pos.x+'px';m.style.top=pos.y+'px'}})}
function setEditing(value){editing=value;$('pivotmode').checked=value;ikAim=null;if(value){editSnapshot=J.map(j=>j.val);J.forEach(j=>j.val=0);refresh();$('pivotstatus').textContent='Editing: drag orange handles. Joints temporarily set to home pose.'}else{if(editSnapshot)J.forEach((j,i)=>j.val=editSnapshot[i]);editSnapshot=null;refresh();$('pivotstatus').textContent='Saved in this session. Export calibration JSON to keep pivots.'}updatePivotMarkers()}
$('pivotmode').onchange=e=>setEditing(e.target.checked);
$('jointpick').onchange=e=>{selectedPivot=+e.target.value;updatePivotMarkers()};
$('pivotzero').onclick=()=>{J[selectedPivot].p=initialPivots[selectedPivot].slice();syncPivotInputs();updatePivotMarkers()};
$('pivotview').onclick=()=>{setEditing(true);updatePivotMarkers()};
function dragPivot(x,y){const j=J[selectedPivot],plane=$('pivotplane').value,idx=plane==='xy'?[0,1]:plane==='xz'?[0,2]:[1,2];const orig=pivotPoint(selectedPivot);if(!orig)return;let cols=idx.map(k=>{let old=j.p[k];j.p[k]=old+0.25;let p=pivotPoint(selectedPivot);j.p[k]=old;return p?[(p.x-orig.x)/.25,(p.y-orig.y)/.25]:[0,0]});let [a,b]=cols;let det=a[0]*b[1]-a[1]*b[0];let dx=x-orig.x,dy=y-orig.y;if(Math.abs(det)>0.002){j.p[idx[0]]+=clamp((dx*b[1]-dy*b[0])/det,-8,8);j.p[idx[1]]+=clamp((dy*a[0]-dx*a[1])/det,-8,8);syncPivotInputs();$('pivotstatus').textContent=j.title+': '+j.p.map(v=>v.toFixed(2)).join(', ');updatePivotMarkers()}else $('pivotstatus').textContent='Selected plane is edge-on. Change the camera or choose another plane.'}
function updateTarget(){updatePivotMarkers();let p=tip(),m=$('ikpoint'),t=$('iktarget');if(p){m.style.display='block';m.style.left=p.x+'px';m.style.top=p.y+'px'}else m.style.display='none';if(ikAim){t.style.display='block';t.style.left=ikAim.x+'px';t.style.top=ikAim.y+'px'}else t.style.display='none'}
canvas.addEventListener('pointerdown',e=>{let rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top,p=tip();let pick=editing?J.slice(1).map((j,i)=>({idx:i+1,pos:pivotPoint(i+1)})).filter(o=>o.pos).sort((a,b)=>Math.hypot(a.pos.x-x,a.pos.y-y)-Math.hypot(b.pos.x-x,b.pos.y-y))[0]:null;let movingPivot=!!pick&&Math.hypot(pick.pos.x-x,pick.pos.y-y)<30;if(movingPivot){selectedPivot=pick.idx;$('jointpick').value=String(selectedPivot)}let hand=!editing&&!!p&&Math.hypot(p.x-x,p.y-y)<110;drag={x,y,az:camAz,el:camEl,hand,movingPivot};if(hand){ikAim={x:p.x,y:p.y};$('ikstatus').textContent='Hand grabbed — move the pointer to reposition.'}canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!drag)return;let r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;if(drag.movingPivot){dragPivot(x,y)}else if(drag.hand){ikAim={x:clamp(x,0,r.width),y:clamp(y,0,r.height)};solveIK(ikAim)}else{camAz=drag.az-(x-drag.x)*.009;camEl=clamp(drag.el+(y-drag.y)*.008,-1.48,1.48)}});
canvas.addEventListener('pointerup',()=>{drag=null});canvas.addEventListener('pointercancel',()=>{drag=null;ikAim=null});
return {J,$,canvas,refresh,clamp,frame,updatePivotMarkers,syncPivotInputs,isEditing:()=>editing,resetIK(){ikAim=null;ikError=0;$('ikstatus').textContent='IK target reset; drag the glowing hand marker.';},enableWheel(){canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom*Math.exp(e.deltaY*.0012),135,1200)},{passive:false});}};
}
