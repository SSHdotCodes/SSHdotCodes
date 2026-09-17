
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const root=document.getElementById('workstation-reconstruction');
const $=id=>root.querySelector('#'+id);
// Let the homepage paint before preparing the model, then give the browser
// time for input and scrolling between each construction/compilation step.
const yieldToPage=()=>new Promise(resolve=>setTimeout(resolve,0));
try {
await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
performance.mark('workstation-build-start');
const scene=new THREE.Scene();
const canvas=root.querySelector('canvas.workstation-canvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
renderer.setClearColor(0x000000,0);
let renderScale=Math.min(window.devicePixelRatio||1,innerWidth<700?1.25:1.5);
renderer.setPixelRatio(renderScale);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const pmrem=new THREE.PMREMGenerator(renderer);
const environment=pmrem.fromScene(new RoomEnvironment(),.035).texture;
scene.environment=environment;
pmrem.dispose();
await yieldToPage();
const camera=new THREE.PerspectiveCamera(36,1,.05,100);
const controls=new OrbitControls(camera,canvas);
controls.target.set(0,2.67,0);
controls.enableDamping=true;controls.dampingFactor=.12;
controls.minDistance=4.6;controls.maxDistance=23;controls.maxPolarAngle=Math.PI*.495;
controls.enablePan=true;
const composer=new EffectComposer(renderer);
composer.renderTarget1.samples=2;composer.renderTarget2.samples=2;
renderer.info.autoReset=false;
composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(800,600),.26,.32,1.05);
// Add only the luminous pixels to alpha. The stock bloom copy writes an
// opaque alpha channel across the entire viewport, making a visible box.
bloom.blendMaterial.fragmentShader=`
 uniform float opacity;
 uniform sampler2D tDiffuse;
 varying vec2 vUv;
 void main(){
  vec3 glow=texture2D(tDiffuse,vUv).rgb*opacity;
  float coverage=clamp(max(glow.r,max(glow.g,glow.b)),0.0,1.0);
  gl_FragColor=vec4(glow,coverage);
 }`;
bloom.blendMaterial.blending=THREE.CustomBlending;
bloom.blendMaterial.blendEquation=THREE.AddEquation;
bloom.blendMaterial.blendSrc=THREE.OneFactor;
bloom.blendMaterial.blendDst=THREE.OneFactor;
bloom.blendMaterial.blendEquationAlpha=THREE.AddEquation;
bloom.blendMaterial.blendSrcAlpha=THREE.OneFactor;
bloom.blendMaterial.blendDstAlpha=THREE.OneMinusSrcAlphaFactor;
composer.addPass(bloom);
const outputPass=new OutputPass();
outputPass._outputColorSpace=renderer.outputColorSpace;outputPass._toneMapping=renderer.toneMapping;
outputPass.material.defines={SRGB_TRANSFER:'',ACES_FILMIC_TONE_MAPPING:''};
composer.addPass(outputPass);

let seed=8041;
function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
function texture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
const noise=texture(256,256,(c,w,h)=>{const d=c.createImageData(w,h);for(let i=0;i<d.data.length;i+=4){const n=100+rnd()*110;d.data[i]=d.data[i+1]=d.data[i+2]=n;d.data[i+3]=255;}c.putImageData(d,0,0);});
noise.wrapS=noise.wrapT=THREE.RepeatWrapping;noise.repeat.set(4,4);noise.colorSpace=THREE.NoColorSpace;
const steel=new THREE.MeshStandardMaterial({color:0x2b2c2f,metalness:.62,roughness:.38,roughnessMap:noise,bumpMap:noise,bumpScale:.0025,envMapIntensity:.5});
const frameMat=new THREE.MeshStandardMaterial({color:0x0c0e11,metalness:.7,roughness:.28,envMapIntensity:.55});
const plastic=new THREE.MeshStandardMaterial({color:0x101115,roughness:.6,metalness:.08});
const aluminum=new THREE.MeshStandardMaterial({color:0x898c91,metalness:.8,roughness:.34,envMapIntensity:.8});
const darkAluminum=new THREE.MeshStandardMaterial({color:0x55585e,metalness:.65,roughness:.4});
const nickel=new THREE.MeshStandardMaterial({color:0x82888b,metalness:1,roughness:.26});
const gold=new THREE.MeshStandardMaterial({color:0x998362,metalness:.8,roughness:.4});
const wireMat=new THREE.MeshStandardMaterial({color:0x101013,roughness:.5});
const tower=new THREE.Group();tower.name='Workstation — reconstructed from supplied photographs';scene.add(tower);
const named=(o,name)=>{o.name=name;return o;};
function mesh(geo,mat,p=[0,0,0],parent=tower,name=''){const o=new THREE.Mesh(geo,mat);o.position.set(...p);o.castShadow=true;o.receiveShadow=true;if(name)o.name=name;parent.add(o);return o;}
function box(w,h,d,x,y,z,mat=steel,parent=tower,r=.015,name=''){return mesh(r?new RoundedBoxGeometry(w,h,d,1,Math.min(r,w/3,h/3,d/3)):new THREE.BoxGeometry(w,h,d),mat,[x,y,z],parent,name);}
function cyl(r,h,p,mat=plastic,parent=tower,axis='z',r2=r,segments=32){const o=mesh(new THREE.CylinderGeometry(r,r2,h,segments),mat,p,parent);if(axis==='z')o.rotation.x=Math.PI/2;else if(axis==='x')o.rotation.z=Math.PI/2;return o;}
function tube(points,r=.018,mat=wireMat,parent=tower){const cv=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(new THREE.TubeGeometry(cv,32,r,6,false),mat,[0,0,0],parent);}
const labelMaterials=new Map();
function label(text,w,h,x,y,z,{color='#c4c4bf',bg=null,rotation=0,parent=tower,size=45,font='Arial',metalness=.1}={}){
 const key=JSON.stringify([text,color,bg,font,metalness]);
 if(!labelMaterials.has(key)){
  const tex=texture(512,256,(c,W,H)=>{if(bg){c.fillStyle=bg;c.fillRect(0,0,W,H);}c.fillStyle=color;c.font='500 180px '+font;c.textAlign='center';c.textBaseline='middle';c.fillText(text,W/2,H/2,490);});
  labelMaterials.set(key,new THREE.MeshStandardMaterial({map:tex,transparent:true,roughness:.5,metalness,depthWrite:false}));
 }
 const o=mesh(new THREE.PlaneGeometry(w,h),labelMaterials.get(key),[x,y,z],parent);o.rotation.z=rotation;o.castShadow=false;return o;
}
function screw(x,y,z,axis='z',parent=tower){const o=cyl(.033,.014,[x,y,z],darkAluminum,parent,axis,.033,12);const line=box(.038,.005,.003,0,0,0,plastic,o,0);line.position.set(0,.008,0);line.rotation.x=Math.PI/2;return o;}
function instanced(geo,mat,items,parent=tower,name=''){const o=new THREE.InstancedMesh(geo,mat,items.length);const dummy=new THREE.Object3D();items.forEach((it,i)=>{dummy.position.set(...it.p);dummy.rotation.set(...(it.r||[0,0,0]));dummy.scale.set(...(it.s||[1,1,1]));dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);});o.castShadow=true;o.receiveShadow=true;o.name=name;parent.add(o);return o;}
function perforation(w,h,x,y,z,parent=tower,rotation=[0,0,0],pitch=.025){
 const alpha=texture(64,64,(c,W,H)=>{c.fillStyle='#ffffff';c.fillRect(0,0,W,H);c.globalCompositeOperation='destination-out';for(let row=-1;row<3;row++)for(let col=-1;col<3;col++){c.beginPath();c.arc(col*32+(row%2?16:0),row*32,11.5,0,Math.PI*2);c.fill();}});
 alpha.wrapS=alpha.wrapT=THREE.RepeatWrapping;alpha.repeat.set(w/pitch/2,h/pitch/2);
 const mat=new THREE.MeshStandardMaterial({color:0x181a1d,metalness:.62,roughness:.46,map:alpha,transparent:true,alphaTest:.01,depthWrite:false,side:THREE.DoubleSide,envMapIntensity:.5});
 const o=mesh(new THREE.PlaneGeometry(w,h),mat,[x,y,z],parent,'Perforated steel mesh');o.rotation.set(...rotation);return o;
}

// Small stamped panels and true socket openings, in each panel's local XY plane.
const portRecess=new THREE.MeshStandardMaterial({color:0x020305,roughness:.92,metalness:0});
const usbBlue=new THREE.MeshStandardMaterial({color:0x147884,roughness:.55,metalness:.08});
const grateSteel=new THREE.MeshStandardMaterial({color:0x282b30,metalness:.58,roughness:.5,roughnessMap:noise,envMapIntensity:.35});
function roundedPath(x,y,w,h,r=.02,shape=false){
 const p=shape?new THREE.Shape():new THREE.Path();r=Math.min(r,w/2,h/2);
 const l=x-w/2,b=y-h/2,R=x+w/2,t=y+h/2;
 p.moveTo(l+r,b);p.lineTo(R-r,b);p.quadraticCurveTo(R,b,R,b+r);p.lineTo(R,t-r);p.quadraticCurveTo(R,t,R-r,t);p.lineTo(l+r,t);p.quadraticCurveTo(l,t,l,t-r);p.lineTo(l,b+r);p.quadraticCurveTo(l,b,l+r,b);p.closePath();return p;
}
function polygonPath(points,shape=false){const p=shape?new THREE.Shape():new THREE.Path();points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();return p;}
function plate(shape,parent,mat=grateSteel,depth=.025,name='Stamped metal panel'){
 return mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:5}),mat,[0,0,0],parent,name);
}
function panelGroup(name,p,rotation){const group=new THREE.Group();group.name=name;group.position.set(...p);group.rotation.set(...rotation);tower.add(group);return group;}
function triangularGrille(points,pitch,parent,name){
 const shape=polygonPath(points,true);const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 const xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),step=pitch*Math.sqrt(3)/2;
 function inside(x,y){let c=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[j],b=points[i];if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))c=!c;
  const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
  if(Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t)<.017)return false;
 }return c;}
 for(let row=0,y=ymin+.020;y<ymax;row++,y+=step){
  const offset=row%2?pitch/2:0;
  for(let x=xmin-pitch+offset+.020;x<xmax+pitch;x+=pitch){
   for(const tri of [[[x,y],[x+pitch,y],[x+pitch/2,y+step]],[[x+pitch/2,y+step],[x+pitch*1.5,y+step],[x+pitch,y]]]){
    const cx=tri.reduce((v,p)=>v+p[0],0)/3,cy=tri.reduce((v,p)=>v+p[1],0)/3;
    const hole=tri.map(([u,v])=>[cx+(u-cx)*.74,cy+(v-cy)*.74]);
    if(hole.every(([u,v])=>inside(u,v)))shape.holes.push(polygonPath(hole));
   }
  }
 }
 const result=plate(shape,parent,grateSteel,.017,name);result.userData.triangularOpenings=shape.holes.length;return result;
}
function socket(type,x,y,w,h,parent,{angle=0,tongue=plastic,name=type+' socket'}={}){
 const g=new THREE.Group();g.position.set(x,y,.038);g.rotation.z=angle;g.name=name;parent.add(g);
 let outline;
 if(type==='DisplayPort')outline=[[-w/2,-h/2],[w/2,-h/2],[w/2,h*.19],[w*.29,h/2],[-w/2,h/2]];
 else if(type==='IEC')outline=[[-w/2,-h/2],[w/2,-h/2],[w/2,h*.18],[w*.31,h/2],[-w*.31,h/2],[-w/2,h*.18]];
 else if(type==='HDMI')outline=[[-w/2,h/2],[w/2,h/2],[w/2,-h*.05],[w*.33,-h/2],[-w*.33,-h/2],[-w/2,-h*.05]];
 const outer=outline?polygonPath(outline,true):roundedPath(0,0,w,h,type==='USB-C'?h*.48:.008,true);
 const inner=outline?polygonPath(outline.map(([u,v])=>[u*.82,v*.72])):roundedPath(0,0,w-.016,h-.016,type==='USB-C'?(h-.016)*.48:.005);
 outer.holes.push(inner);plate(outer,g,nickel,.025,name+' metal lip');
 const cavity=mesh(new THREE.ShapeGeometry(new THREE.Shape(inner.getPoints(8))),portRecess,[0,0,-.012],g,name+' dark recess');cavity.castShadow=false;
 if(type==='USB-A'){
  box(w*.69,h*.25,.018,0,-h*.20,.003,tongue,g,.002,name+' tongue');
  for(let i=0;i<5;i++)box(w*.045,h*.065,.007,-w*.25+i*w*.125,-h*.065,.012,gold,g,0);
 }else if(type==='USB-C')box(w*.63,h*.14,.023,0,0,.006,plastic,g,.002,name+' tongue');
 else if(type==='LAN'){
  box(w*.31,h*.16,.008,0,-h*.36,.01,plastic,g,0,'Ethernet latch');
  for(let i=0;i<8;i++)box(w*.035,h*.3,.014,-w*.30+i*w*.086,h*.18,-.002,gold,g,0,'Ethernet contact');
 }else if(type==='DisplayPort'||type==='HDMI'){
  box(w*.68,h*.17,.018,0,0,.003,plastic,g,.001,'Display connector tongue');
  for(let i=0;i<10;i++)box(w*.023,h*.065,.005,-w*.29+i*w*.064,h*.105,.015,gold,g,0);
 }
 return g;
}
function audioJack(x,y,parent,{radius=.025,mat=nickel,name='Audio socket'}={}){
 const ring=mesh(new THREE.TorusGeometry(radius,.007,6,20),mat,[x,y,.045],parent,name+' rim');
 cyl(radius*.72,.014,[x,y,.032],portRecess,parent,'z',radius*.72,20);return ring;
}

await yieldToPage();
// Chassis: side-on coordinates, rear at -X, front at +X.
box(5.16,.13,2.25,0,.26,0,frameMat,tower,.025,'Bottom chassis');
for(const x of [-2.40,2.40])box(.32,.12,2.25,x,5.31,0,frameMat,tower,.015,'Roof end border');
for(const z of [-1.0,1.0])box(4.85,.12,.25,0,5.31,z,frameMat,tower,.015,'Roof side border');
box(5.12,.66,.08,0,.64,1.095,frameMat,tower,.012,'Lower fascia');
box(5.0,.06,2.17,0,1.03,0,steel,tower,.009,'PSU shroud');
box(5.05,4.95,.065,0,2.79,-1.115,steel,tower,.01,'Steel cable side panel');
for(const x of [-2.52,2.52])for(const z of [-1.095,1.095])box(.11,4.99,.11,x,2.81,z,frameMat,tower,.014);
for(const y of [1.01,5.19])box(5.15,.17,.105,0,y,1.13,frameMat,tower,.01);
for(const x of [-2.26,2.24])for(const z of [-.81,.81])box(.55,.19,.39,x,.105,z,plastic,tower,.035,'Rubber foot');
// Removable top filter: a fine woven screen over a triangular support grille.
const roof=panelGroup('Top grille and controls',[-.43,5.375,0],[-Math.PI/2,0,0]);
const roofOutline=[[-1.82,-.80],[1.82,-.80],[1.82,.80],[-1.82,.80]];
triangularGrille(roofOutline,.105,roof,'Top fan support grate');
const roofRim=roundedPath(0,0,3.76,1.73,.11,true);roofRim.holes.push(roundedPath(0,0,3.64,1.61,.075));
plate(roofRim,roof,frameMat,.029,'Rounded magnetic dust-filter frame');
const filter=perforation(3.63,1.60,0,0,.034,roof,[0,0,0],.011);filter.name='Top fine dust-filter mesh';
filter.material.color.setHex(0x23262a);filter.material.roughness=.88;filter.material.metalness=.05;
filter.material.alphaTest=.12;filter.material.forceSinglePass=true;
// The shorter filter leaves a solid section before the front I/O strip.
const roofSkin=panelGroup('Solid roof around filter',[0,5.328,0],[-Math.PI/2,0,0]);
const roofSkinShape=roundedPath(0,0,5.03,2.12,.025,true);
roofSkinShape.holes.push(roundedPath(-.43,0,3.75,1.72,.10));
plate(roofSkinShape,roofSkin,frameMat,.021,'Roof panel around smaller filter');
// The front edge is a solid I/O strip rather than mesh beneath the sockets.
box(.57,.072,2.12,2.225,5.342,0,frameMat,tower,.012,'Top I/O strip');
const topIO=panelGroup('Top buttons and sockets',[2.225,5.388,0],[-Math.PI/2,0,0]);
const powerLed=new THREE.MeshStandardMaterial({color:0xff1026,emissive:0xff1026,emissiveIntensity:1.4,roughness:.4});
mesh(new THREE.TorusGeometry(.077,.008,6,28),powerLed,[0,-.76,.008],topIO,'Power button illuminated rim');
cyl(.070,.014,[0,-.76,.013],plastic,topIO,'z',.070,28);
const powerSymbol=mesh(new THREE.TorusGeometry(.022,.0024,4,20,Math.PI*1.5),nickel,[0,-.762,.024],topIO,'Power icon');powerSymbol.rotation.z=Math.PI*.75;
box(.003,.025,.002,0,-.738,.025,nickel,topIO,0);
cyl(.033,.012,[0,-.50,.012],darkAluminum,topIO,'z',.033,24);
label('RGB',.066,.021,.105,-.50,.004,{parent:topIO,color:'#73797e'});
// Audio, microphone, two USB-A ports and the capped optional USB-C position.
audioJack(0,-.265,topIO,{radius:.024,name:'Headphone jack'});
audioJack(0,-.085,topIO,{radius:.024,name:'Microphone jack'});
label('OUT',.069,.020,.116,-.265,.006,{parent:topIO,color:'#73797e'});
label('MIC',.069,.020,.116,-.085,.006,{parent:topIO,color:'#73797e'});
for(const v of [.20,.445])socket('USB-A',0,v,.169,.075,topIO,{tongue:usbBlue,name:'Top USB-A'});
label('USB',.08,.023,.13,.325,.006,{parent:topIO,color:'#73797e'});
box(.105,.038,.006,0,.675,.009,plastic,topIO,.016,'Optional USB-C blanking plug');

// Front air filter, lower drive cover, and narrow intake edges.
box(.14,.75,2.22,2.61,.66,0,frameMat,tower,.03,'Front lower drive cover');
box(.085,4.12,.095,2.63,3.16,-1.07,frameMat);box(.085,4.12,.095,2.63,3.16,1.07,frameMat);
perforation(2.04,4.13,2.68,3.13,0,tower,[0,Math.PI/2,0],.026);
for(const y of [1.03,5.25])box(.14,.13,2.18,2.61,y,0,frameMat);
label('Fractal',.47,.19,1.94,.75,1.15,{color:'#686b6d',size:50});
await yieldToPage();
// Fan assemblies use curved blades, rubber corners, a motor and rear braces.
const rgbFans=[];
const spinningFans=[];
function fan(x,y,z,r,{lit=false,orientation='x',name='Case fan'}={}){
 const group=new THREE.Group();group.position.set(x,y,z);group.name=name;tower.add(group);
 if(orientation==='x')group.rotation.y=Math.PI/2;
 if(orientation==='y')group.rotation.x=-Math.PI/2;
 const outer=r*1.12,depth=r*.28;
 // Square flange with a real circular opening.
 const shape=new THREE.Shape();shape.moveTo(-outer,-outer);shape.lineTo(outer,-outer);shape.lineTo(outer,outer);shape.lineTo(-outer,outer);shape.closePath();
 const hole=new THREE.Path();hole.absarc(0,0,r*.98,0,Math.PI*2,true);shape.holes.push(hole);
 const flange=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.012,bevelThickness:.01,curveSegments:48});
 mesh(flange,plastic,[0,0,-depth/2],group);
 for(const a of [-1,1])for(const b of [-1,1]){box(r*.23,r*.23,depth*1.06,a*r*.91,b*r*.91,0,frameMat,group,.025);screw(a*r*.91,b*r*.91,depth*.56,'z',group);screw(a*r*.91,b*r*.91,-depth*.56,'z',group);}
 const fanMat=new THREE.MeshStandardMaterial({color:lit?0xd7d9d7:0x292c31,metalness:.04,roughness:lit?.36:.53,emissive:lit?0xff1026:0x000000,emissiveIntensity:lit?1.1:0,side:THREE.DoubleSide});
 const motorRingMat=new THREE.MeshStandardMaterial({color:lit?0xe6e6e2:0x222528,emissive:lit?0xff1026:0x000000,emissiveIntensity:lit?2:0,roughness:.3});
 const rotor=new THREE.Group();rotor.rotation.z=.14;group.add(rotor);
 spinningFans.push({rotor,speed:name.includes('CPU')?13.3:10.7});
 const blade=new THREE.Shape();blade.moveTo(r*.19,-r*.06);blade.bezierCurveTo(r*.43,-r*.22,r*.91,-r*.25,r*.945,r*.04);blade.bezierCurveTo(r*.99,r*.30,r*.70,r*.54,r*.44,r*.37);blade.quadraticCurveTo(r*.33,r*.23,r*.19,r*.13);blade.closePath();
 const bladeGeo=new THREE.ExtrudeGeometry(blade,{depth:r*.017,steps:1,bevelEnabled:true,bevelSize:r*.01,bevelThickness:r*.008,bevelSegments:1,curveSegments:10});
 const blades=[];
 for(let k=0;k<7;k++)blades.push(bladeGeo.clone().rotateZ(k*Math.PI*2/7));
 const rotorMesh=mesh(mergeGeometries(blades),fanMat,[0,0,0],rotor,'Spinning blades');
 rotorMesh.castShadow=false;
 blades.forEach(g=>g.dispose());bladeGeo.dispose();
 for(const side of [-1,1]){
  const ring=mesh(new THREE.TorusGeometry(r*.245,r*.028,8,48),motorRingMat,[0,0,side*r*.055],group);ring.castShadow=false;
  cyl(r*.215,r*.09,[0,0,side*r*.08],plastic,group,'z');
  const l=label(name.includes('CPU')?'Thermalright':'Fractal',r*.36,r*.21,0,-r*.015,side*r*.13,{parent:group,color:'#d3d4d5',size:53});if(side<0)l.rotation.y=Math.PI;
 }
 for(let k=0;k<3;k++){const arm=box(r*.08,r*.79,r*.052,0,0,0,plastic,group,.01);const a=k*Math.PI*2/3+.35;arm.position.set(Math.sin(a)*r*.61,Math.cos(a)*r*.61,-depth*.5-.012);arm.rotation.z=-a-.16;}
 if(lit){const light=new THREE.PointLight(0xff1026,8,4.5,2);group.add(light);light.position.z=-.78;
  const outLight=new THREE.PointLight(0xff1026,3.0,2.7,2);outLight.position.z=.22;group.add(outLight);
  rgbFans.push({group,fanMat,motorRingMat,light,outLight,rotor});}
 return group;
}
fan(2.37,4.51,0,.57,{lit:true,name:'RGB front — top'});
fan(2.37,3.18,0,.57,{lit:true,name:'RGB front — middle'});
fan(2.37,1.85,0,.57,{lit:true,name:'RGB front — bottom'});
fan(-2.36,3.685,.21,.65,{lit:true,name:'RGB rear exhaust'});
for(const x of [-1.3,.14])fan(x,5.10,.0,.61,{orientation:'y',name:'Unlit roof exhaust'});
// Rear panel traced from the user's photo: stepped exhaust grille, I/O column,
// eight expansion positions, side ventilation and the lower power supply.
const rear=panelGroup('Detailed rear panel',[-2.586,0,0],[0,-Math.PI/2,0]);
const rearShape=roundedPath(0,2.805,2.13,5.01,.025,true);
const fanOutline=[[-.28,2.90],[.70,2.90],[.70,3.17],[.91,3.17],[.91,4.18],[.70,4.18],[.70,4.47],[-.28,4.47],[-.28,4.18],[-.49,4.18],[-.49,3.17],[-.28,3.17]];
rearShape.holes.push(polygonPath(fanOutline),roundedPath(-.775,3.635,.465,1.71,.022),roundedPath(-.325,1.94,1.365,1.76,.02),roundedPath(.745,1.98,.48,1.90,.09),roundedPath(-.015,.646,1.965,.67,.02));
// Vertical adjustment slots around the rear fan.
for(const u of [-.40,.83])for(const y of [3.02,4.34])rearShape.holes.push(roundedPath(u,y,.043,.255,.02));
plate(rearShape,rear,steel,.035,'Rear chassis with real vent cutouts');
triangularGrille(fanOutline,.135,rear,'Triangular rear exhaust grille');
triangularGrille([[.51,1.04],[.97,1.04],[.97,2.90],[.51,2.90]],.115,rear,'Tall triangular expansion vent');
for(const u of [-.40,.83])for(const y of [3.02,4.34])screw(u,y,.045,'z',rear);
for(const u of [-.98,.98])for(const y of [.35,1.02,2.78,5.21])screw(u,y,.046,'z',rear);
for(const u of [-.99,.99])for(const y of [.51,4.81]){
 cyl(.048,.055,[u,y,.058],darkAluminum,rear,'z',.048,16);
 cyl(.038,.065,[u,y,.082],plastic,rear,'z',.038,16);
}
// Black I/O shield with warm printed legends and recessed connector mouths.
box(.453,1.69,.026,-.775,3.635,-.011,plastic,rear,.016,'ProArt rear I/O shield');
const io= new THREE.Group();io.position.x=-.775;rear.add(io);io.name='Motherboard rear connectors';
socket('HDMI',-.107,4.275,.165,.067,io,{angle:Math.PI/2});
socket('DisplayPort',.073,4.275,.184,.071,io,{angle:Math.PI/2});
label('HDMI',.098,.032,-.11,4.399,.026,{parent:io,color:'#ae9470'});
label('DP',.056,.034,.075,4.399,.026,{parent:io,color:'#ae9470'});
label('ProArt',.13,.045,.10,4.15,.026,{parent:io,color:'#ae9470'});
box(.064,.064,.015,-.108,4.055,.026,nickel,io,.012,'BIOS FlashBack surround');
box(.043,.043,.018,-.108,4.055,.039,plastic,io,.009,'BIOS FlashBack button');
label('BIOS',.074,.025,-.002,4.07,.026,{parent:io,color:'#ae9470'});
label('FLBK',.074,.025,-.002,4.04,.026,{parent:io,color:'#ae9470'});
for(const y of [3.90,3.445]){
 for(const u of [-.106,.036])socket('USB-A',u,y,.162,.072,io,{angle:Math.PI/2,name:'Rear USB-A'});
 label('10G',.065,.025,-.106,y-.115,.026,{parent:io,color:'#ae9470'});
 label('2.0',.065,.025,.055,y-.115,.026,{parent:io,color:'#ae9470'});
}
// Central network / high-speed USB cluster is partly hidden by plugs in the photo.
socket('LAN',.096,3.67,.132,.138,io,{name:'Upper Ethernet port'});
for(const y of [3.704,3.621])socket('USB-C',-.092,y,.080,.034,io,{name:'Upper USB-C'});
socket('USB-C',-.13,3.192,.108,.045,io,{angle:Math.PI/2,name:'Lower USB-C'});
socket('USB-A',-.013,3.192,.15,.072,io,{angle:Math.PI/2,tongue:usbBlue,name:'Teal USB-A'});
socket('LAN',.128,3.192,.127,.14,io,{name:'Lower Ethernet port'});
label('USB',.06,.025,-.13,3.29,.026,{parent:io,color:'#ae9470'});
for(const [u,y] of [[.042,3.755],[.145,3.755],[.075,3.272],[.177,3.272]])box(.014,.022,.009,u,y,.066,usbBlue,io,.003,'Network indicator lens');
for(const u of [-.095,.105]){
 cyl(.028,.035,[u,2.993,.043],gold,io,'z',.028,6);
 cyl(.019,.055,[u,2.993,.071],nickel,io,'z',.019,16);
 for(const z of [.064,.073,.082])mesh(new THREE.TorusGeometry(.020,.0025,4,16),gold,[u,2.993,z],io,'Antenna socket thread');
 cyl(.009,.009,[u,2.993,.103],portRecess,io,'z',.009,12);
}
label('WI-FI',.078,.025,0,3.052,.026,{parent:io,color:'#ae9470'});
for(const [u,y] of [[-.13,2.864],[0,2.864],[.13,2.864],[-.065,2.935],[.065,2.935]])audioJack(u,y,io,{radius:.023,name:'Rear audio jack'});
await yieldToPage();
// The card's four DisplayPort sockets occupy a two-slot bracket, below the
// first perforated blank; five more ventilated blanks continue underneath.
for(const row of [0,3,4,5,6,7]){
 const y=2.708-row*.216;
 const outline=[[-.975,y-.088],[.326,y-.088],[.326,y+.088],[-.975,y+.088]];
 triangularGrille(outline,.111,rear,'Triangular expansion-slot cover');
 screw(-.925,y,.043,'z',rear);
}
box(1.29,.408,.025,-.325,2.384,.015,frameMat,rear,.012,'Graphics card rear bracket');
for(let i=0;i<4;i++)socket('DisplayPort',-.809+i*.30,2.49,.235,.084,rear,{name:'GPU DisplayPort '+(i+1)});
label('NVIDIA',.27,.036,-.73,2.329,.042,{parent:rear,color:'#90989c'});
// A compact compliance-style texture replaces the unreadable sticker text.
const sticker=texture(256,64,(c,w,h)=>{c.fillStyle='#8898a4';for(let row=0;row<6;row++){const n=7+row%3;for(let j=0;j<n;j++)c.fillRect(6+j*20,5+row*8,12-(j%4)*2,3);}});
const stickerMat=new THREE.MeshStandardMaterial({map:sticker,transparent:true,depthWrite:false,color:0x8c969e,roughness:.8});
mesh(new THREE.PlaneGeometry(.39,.067),stickerMat,[-.68,2.268,.041],rear,'GPU rear sticker');
for(const y of [2.55,2.235])screw(-.95,y,.052,'z',rear);
// PSU: exposed IEC inlet with three contacts, rocker switch and open mesh.
const psu=roundedPath(-.015,.646,1.94,.65,.018,true);psu.holes.push(roundedPath(.50,.64,.78,.53,.035));
plate(psu,rear,frameMat,.026,'Power supply rear plate');
const psuMesh=perforation(.77,.52,.5,.64,.028,rear,[0,0,0],.031);psuMesh.name='Power supply honeycomb ventilation';psuMesh.material.color.setHex(0x101318);psuMesh.material.roughness=.85;psuMesh.material.metalness=.2;psuMesh.material.forceSinglePass=true;
const inlet=socket('IEC',-.67,.67,.33,.255,rear,{name:'IEC power inlet'});
for(const [u,v] of [[-.079,-.034],[.079,-.034],[0,.065]])box(.025,.057,.035,u,v,.006,nickel,inlet,.003,'IEC power pin');
box(.184,.217,.033,-.283,.668,.047,plastic,rear,.018,'Rocker switch bezel');
const rocker=box(.143,.173,.023,-.283,.67,.072,frameMat,rear,.01,'PSU rocker switch');rocker.rotation.x=-.10;
label('I',.036,.048,-.283,.713,.089,{parent:rear,color:'#c4c8c9'});
label('O',.036,.038,-.283,.625,.089,{parent:rear,color:'#c4c8c9'});
for(const u of [-.914,.874])for(const y of [.393,.89])screw(u,y,.041,'z',rear);

await yieldToPage();
// Motherboard printed solder mask and traces.
const pcbTex=texture(1024,1024,(c,W,H)=>{
 c.fillStyle='#202326';c.fillRect(0,0,W,H);
 for(let i=0;i<180;i++){let x=rnd()*W,y=rnd()*H,l=25+rnd()*190;c.strokeStyle=i%4?'#343b3b':'#65645a';c.lineWidth=i%7?1:2;c.beginPath();c.moveTo(x,y);c.lineTo(x+l*.35,y);c.lineTo(x+l*.57,y+l*.22);c.lineTo(x+l,y+l*.22);c.stroke();}
 for(let i=0;i<700;i++){const x=rnd()*W,y=rnd()*H;c.fillStyle=i%3?'#7b827c':'#323839';c.fillRect(x,y,2+rnd()*6,2+rnd()*7);}
 c.fillStyle='#b9b9a9';c.font='16px Arial';for(const [txt,x,y]of[['ProArt',155,195],['PCIEX16',184,797],['USB',820,930],['ASUS',738,858],['M.2',390,680]])c.fillText(txt,x,y);
});
const pcbMat=new THREE.MeshStandardMaterial({color:0xc4c4c4,map:pcbTex,metalness:.25,roughness:.52});
box(2.82,3.25,.055,-.98,2.88,-.913,pcbMat,tower,.009,'ProArt motherboard');
for(const x of [-2.29,.35])for(const y of [1.34,2.8,4.39]){cyl(.057,.026,[x,y,-.867],nickel);screw(x,y,-.849);}
// IO cover with fine gold etched lines.
box(.55,1.72,.32,-2.01,3.53,-.704,darkAluminum,tower,.025,'ProArt rear IO heatsink');
for(const p of [[-2.245,3.7],[-1.765,3.7]])box(.009,1.66,.004,p[0],p[1],-.535,gold,tower,0);
tube([[-2.24,4.24,-.535],[-1.91,4.24,-.535],[-1.77,4.03,-.535],[-1.77,3.28,-.535]],.004,gold);
const arc=mesh(new THREE.TorusGeometry(.23,.004,5,50,Math.PI*1.9),gold,[-2.0,3.88,-.528]);
label('ProArt',.46,.22,-2.0,2.94,-.523,{color:'#b1a186',size:58});
box(1.30,.26,.28,-1.10,4.36,-.70,darkAluminum);
for(let i=0;i<15;i++)box(.062,.29,.34,-1.71+i*.085,4.37,-.7,aluminum,tower,.003);
// DIMM banks behind the cooler.
for(let j=0;j<4;j++){
 const x=-.07+j*.14;box(.075,1.38,.19,x,3.72,-.745,plastic,tower,.009,'Memory DIMM');
 box(.041,1.22,.02,x,3.73,-.635,darkAluminum,tower,.002);
 for(const y of [3.09,4.35])box(.09,.095,.21,x,y,-.72,frameMat);
}
await yieldToPage();
// CPU socket, two towers, stacked cooling fins and engraved endplates.
box(.89,.92,.095,-1.12,3.64,-.69,nickel,tower,.012,'CPU socket');
for(const x of [-1.24,-.40]){
 const fins=[];for(let i=0;i<47;i++)fins.push({p:[x,3.60,-.51+i*.028]});
 instanced(new THREE.BoxGeometry(.57,1.45,.011),aluminum,fins,tower,'Thermalright aluminum fin stack');
 for(const dx of [-.16,0,.16])for(const yy of [3.0,4.2])cyl(.025,1.35,[x+dx,yy,.16],nickel,tower,'z');
 const cap=box(.585,1.465,.045,x,3.60,.825,darkAluminum,tower,.04,'Thermalright endplate');
 for(const dx of [-.19,.19])box(.025,1.28,.01,x+dx,3.6,.852,aluminum,tower,.002);
 for(const side of [-1,1])tube([[x+side*.21,4.24,.855],[x+side*.11,4.03,.858],[x+side*.11,3.94,.859]],.011,plastic);
 label('THERMALRIGHT',.95,.125,x,3.6,.861,{rotation:Math.PI/2,size:34,color:'#c3c5c6'});
 for(const yy of [2.99,4.21])screw(x,yy,.86);
}
for(const x of [-.82,.02])fan(x,3.60,.13,.63,{name:'Black CPU cooling fan'});
// Slim metal retaining clips follow the side of the heatsinks.
for(const x of [-1.53,-.1])tube([[x,4.18,.76],[x-.035,4.24,.62],[x-.045,4.24,-.28],[x,4.14,-.36]],.009,nickel);

await yieldToPage();
// Graphics board, black blower shroud, exposed horizontal fin section.
const gpuStart=tower.children.length;
box(2.94,.068,1.33,-.84,2.24,-.02,pcbMat,tower,.004,'NVIDIA graphics board');
box(2.96,.37,1.35,-.84,2.015,.02,frameMat,tower,.045,'NVIDIA GPU shroud');
box(1.46,.30,.045,-.69,2.02,.712,plastic,tower,.01,'GPU side fin opening');
for(let n=0;n<11;n++)box(1.44,.009,.08,-.69,1.89+n*.024,.74,darkAluminum);
box(.81,.40,.065,-1.92,2.025,.727,steel,tower,.02);
box(.71,.40,.065,.285,2.025,.727,steel,tower,.02);
label('NVIDIA',.49,.17,.32,2.045,.765,{size:49,color:'#c3c4c0'});
// The blower is visible through its underside grille when orbiting.
cyl(.48,.018,[-1.82,1.815,.0],plastic,tower,'y');
for(let i=0;i<30;i++){const a=i*Math.PI*2/30;const b=box(.015,.02,.22,-1.82+Math.sin(a)*.32,1.8,Math.cos(a)*.32,darkAluminum,tower,.002);b.rotation.y=a;}
cyl(.13,.03,[-1.82,1.79,0],darkAluminum,tower,'y');
for(let i=0;i<8;i++)tube([[.18,2.14,.80],[.59,1.96,.84+i*.022],[.98,1.93,.60+i*.017],[1.01,2.29,-.23+i*.021],[.85,2.51,-.90]],.012,wireMat);
box(.20,.14,.13,.13,2.12,.83,plastic);
for(const part of tower.children.slice(gpuStart))part.position.y+=.38;
// Adjustable GPU support post on the shroud.
cyl(.048,1.14,[-.54,1.635,.71],darkAluminum,tower,'y');
cyl(.078,.07,[-.54,1.09,.71],plastic,tower,'y');
cyl(.065,.15,[-.54,1.57,.71],plastic,tower,'y');
box(.27,.04,.14,-.49,2.17,.71,plastic);
for(let n=0;n<3;n++){
 box(1.72,.11,.105,-1.26,1.66-n*.19,-.797,plastic,tower,.003,'Expansion slot');
 box(1.60,.017,.009,-1.29,1.683-n*.19,-.735,nickel,tower,0);
}
box(.66,.46,.105,.05,1.61,-.815,darkAluminum,tower,.02);
for(let i=0;i<8;i++)box(.007,.42,.016,-.20+i*.073,1.61,-.75,aluminum,tower,0);
const parts=[];const solder=[];
for(let i=0;i<155;i++){
 const x=-2.23+rnd()*2.68,y=1.33+rnd()*3.01;
 if(y>2.48&&y<4.34&&x<.28)continue;
 const w=.035+rnd()*.05,h=.025+rnd()*.068;parts.push({p:[x,y,-.83],s:[w,h,.032]});
 solder.push({p:[x-w*.64,y,-.826],s:[.015,h*.75,.014]},{p:[x+w*.64,y,-.826],s:[.015,h*.75,.014]});
}
instanced(new THREE.BoxGeometry(1,1,1),plastic,parts,tower,'Motherboard components');
instanced(new THREE.BoxGeometry(1,1,1),nickel,solder,tower,'Soldered component contacts');
for(let i=0;i<12;i++)cyl(.032,.066,[-2.22+i*.094,1.27,-.799],aluminum,tower,'z',.032,12);
await yieldToPage();
// Only internal power and fan cables; the exterior remains uncluttered.
for(let i=0;i<9;i++)tube([[-1.83+i*.029,4.47,-.77],[-1.89+i*.033,4.64,-.50],[-2.15+i*.028,4.68,-.51],[-2.27+i*.022,4.78,-.89]],.012,wireMat);
for(let i=0;i<8;i++)tube([[.41,3.80-i*.027,-.74],[.60,3.8-i*.026,-.49],[.83,3.58-i*.029,-.40],[.89,3.40-i*.03,-.91]],.013,wireMat);
for(let i=0;i<3;i++)tube([[-.88+i*.035,4.36,-.53],[-.58+i*.04,4.67,-.28],[-.41+i*.04,4.60,.03],[-.02,4.26,.12]],.010,wireMat);
for(let i=0;i<6;i++){box(.35,.035,.032,1.18,1.30+i*.64,-1.071,plastic,tower,.009);screw(1.39,1.30+i*.64,-1.07);}
perforation(1.42,1.4,-1.63,1.068,-.04,tower,[-Math.PI/2,0,0],.06);
for(let n=0;n<3;n++)box(.34,.008,.022,.83,1.067,-.37+n*.25,plastic);

await yieldToPage();
// Transparent side with subtle reflections and edge tint.
const glassGroup=new THREE.Group();glassGroup.name='Removable tempered glass';tower.add(glassGroup);
// A thin reflective surface keeps transparent vent holes transparent.
// Screen-space transmission sampled the white environment behind those holes
// and also rendered the entire machine a second time on every frame.
const glassMat=new THREE.MeshPhysicalMaterial({color:0x18212a,metalness:0,roughness:.06,transparent:true,opacity:.018,ior:1.46,envMapIntensity:.25,side:THREE.FrontSide,depthWrite:false});
const glass=mesh(new THREE.BoxGeometry(4.96,4.14,.024),glassMat,[0,3.13,1.16],glassGroup);glass.castShadow=false;glass.renderOrder=8;
const gasket=new THREE.MeshStandardMaterial({color:0x05070a,roughness:.38});
for(const x of [-2.456,2.456])box(.045,4.17,.029,x,3.13,1.169,gasket,glassGroup,.004);
for(const y of [1.066,5.193])box(4.96,.046,.03,0,y,1.17,gasket,glassGroup,.004);
for(const x of [-2.45,2.45])for(const y of [1.12,5.13])screw(x,y,1.19,'z',glassGroup);

// Soft key shadows keep the metal, mesh and internal geometry legible.
const key=new THREE.DirectionalLight(0xffefe3,3);key.position.set(-3.5,8,6);key.castShadow=true;
key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-6;key.shadow.camera.near=.5;key.shadow.camera.far=23;key.shadow.normalBias=.018;key.shadow.bias=-.0002;key.shadow.radius=3;scene.add(key);
const fill=new THREE.DirectionalLight(0xdbe8ff,1);fill.position.set(4,5,1);scene.add(fill);
const hemi=new THREE.HemisphereLight(0xf4e9db,0x303541,.8);scene.add(hemi);
const rim=new THREE.DirectionalLight(0xf5f4ef,.65);rim.position.set(-2,6,-4);scene.add(rim);

const rearFill=new THREE.DirectionalLight(0xdde4ec,.6);rearFill.position.set(-8,4.3,1);scene.add(rearFill);
const flash=new THREE.DirectionalLight(0xfff4ec,1.5);flash.position.set(-.5,3.8,9);scene.add(flash);
const cameras={hero:[6.6,4.5,11.2],photo:[-4.4,4.55,11.5],frontside:[7.3,5.25,11.5],side:[0,3.4,13.8],front:[13.5,3.7,.02],top:[.05,15.8,1.0],rear:[-12.7,4.35,2.3]};
// Homepage presentation: one cinematic entrance, then uninterrupted fan motion.
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let roomLevel=.42,brightness=1,spinning=!reducedMotion.matches;
let introActive=!reducedMotion.matches,introStart=null,visible=false,lastFrame=0,power=1;
const stage=root.querySelector('.ws-stage');
const cameraFrom=new THREE.Vector3(10.8,3.7,4.7);
const cameraTo=new THREE.Vector3(6.6,4.5,11.2);
controls.enablePan=false;controls.enableZoom=false;
canvas.style.touchAction='pan-y';
canvas.addEventListener('pointerdown',event=>event.stopPropagation());
scene.background=null;
scene.fog=null;
renderer.toneMappingExposure=1.13;
// Hundreds of screws, fins and chassis pieces share a handful of materials.
// Batch their exact geometry into one draw per material, retaining detail.
const movingRoots=new Set(spinningFans.map(f=>f.rotor));
const batches=new Map();tower.updateMatrixWorld(true);
tower.traverse(o=>{
 if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||o.material.transparent)return;
 for(let p=o.parent;p&&p!==tower;p=p.parent)if(p===glassGroup||movingRoots.has(p))return;
 const key=o.material.uuid+':'+o.castShadow+':'+o.receiveShadow;
 if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);
});
for(const objects of batches.values()){
 if(objects.length<2)continue;
 const geometries=[];
 for(let i=0;i<objects.length;i++){
  const o=objects[i];const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
  g.applyMatrix4(o.matrixWorld);geometries.push(g);
  if(i%32===31)await yieldToPage();
 }
 const combined=new THREE.Mesh(mergeGeometries(geometries),objects[0].material);
 combined.name='Batched stationary details';combined.castShadow=objects[0].castShadow;combined.receiveShadow=objects[0].receiveShadow;
 tower.add(combined);objects.forEach(o=>o.removeFromParent());geometries.forEach(g=>g.dispose());
 await yieldToPage();
}
performance.mark('workstation-geometry-ready');
const materials=[...new Set((()=>{const list=[];tower.traverse(o=>{if(o.isMesh)list.push(...(Array.isArray(o.material)?o.material:[o.material]));});return list;})())];
const floorGlow=texture(128,128,(c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(255,8,34,.6)');g.addColorStop(.35,'rgba(255,8,34,.21)');g.addColorStop(1,'rgba(255,8,34,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});
const underglow=mesh(new THREE.PlaneGeometry(8,5),new THREE.MeshBasicMaterial({map:floorGlow,transparent:true,depthWrite:false,opacity:.6}),[.45,-.015,.1],scene);
underglow.rotation.x=-Math.PI/2;underglow.castShadow=false;
$('ws-spin').checked=spinning;
function announce(s){$('ws-announcement').textContent=s;}
function applyLights(reveal=1){
 power=reveal;
 powerLed.color.set($('ws-fan-0').value);powerLed.emissive.set($('ws-fan-0').value);powerLed.emissiveIntensity=brightness*reveal*1.4;
 rgbFans.forEach((f,i)=>{
  const q=brightness*Math.min(1,Math.max(0,(reveal-i*.075)/.775));
  const color=$('ws-fan-'+i).value;
  f.fanMat.emissive.set(color);f.fanMat.emissiveIntensity=q*.90;
  f.fanMat.color.set(q>0?color:0x797b7b);
  f.motorRingMat.emissive.set(color);f.motorRingMat.emissiveIntensity=q*3.8;
  f.light.color.set(color);f.light.intensity=q*3.8;
  f.outLight.color.set(color);f.outLight.intensity=q*.17;
 });
 const light=roomLevel*(.55+.45*reveal);
 rearFill.intensity=.06+light*1.8;
 key.intensity=.13+light*3.4;fill.intensity=.035+light*1.3;hemi.intensity=.06+light*.95;rim.intensity=.25+light*1.5;flash.intensity=.1+light*2.4;
 for(const m of materials)if('envMapIntensity' in m)m.envMapIntensity=.10+light*.9;
 bloom.strength=.25+brightness*.19;
 underglow.material.opacity=brightness*reveal*.5;
 $('ws-bright-out').value=Math.round(brightness*100)+'%';$('ws-ambient-out').value=Math.round(roomLevel*100)+'%';
}
function finishIntro(){introActive=false;introStart=null;root.classList.remove('is-intro');applyLights(1);}
function view(v){finishIntro();camera.position.set(...cameras[v]);controls.target.set(0,v==='top'?2.55:2.67,0);controls.update();}
function startIntro(manual=false){
 if(reducedMotion.matches&&!manual){view('hero');return;}
 introActive=true;introStart=null;root.classList.add('is-intro');
 camera.position.copy(cameraFrom);controls.target.set(0,2.67,0);controls.update();applyLights(0);
}
function colorAll(hex){$('ws-color').value=hex;for(let i=0;i<4;i++)$('ws-fan-'+i).value=hex;applyLights();}
$('ws-view').addEventListener('change',e=>view(e.target.value));
$('ws-glass').addEventListener('change',e=>{finishIntro();glassGroup.visible=e.target.checked;renderer.shadowMap.needsUpdate=true;});
$('ws-bright').addEventListener('input',e=>{finishIntro();brightness=e.target.value/100;applyLights();});
$('ws-ambient').addEventListener('input',e=>{finishIntro();roomLevel=e.target.value/100;applyLights();});
$('ws-color').addEventListener('input',e=>{finishIntro();colorAll(e.target.value);$('ws-preset').value='custom';});
for(let i=0;i<4;i++)$('ws-fan-'+i).addEventListener('input',()=>{finishIntro();$('ws-preset').value='custom';applyLights();});
$('ws-preset').addEventListener('change',e=>{
 finishIntro();const colors={red:'#ff1026',blue:'#1734ff',ice:'#bce7ff',violet:'#a020ff',teal:'#00ffd5'};
 if(colors[e.target.value])colorAll(colors[e.target.value]);
 if(e.target.value==='split'){['#2558ff','#7838ff','#ff247d','#7c38ff'].forEach((c,i)=>$('ws-fan-'+i).value=c);applyLights();}
 announce('Workstation lighting updated.');
});
$('ws-spin').addEventListener('change',e=>{finishIntro();spinning=e.target.checked;announce(spinning?'Fans spinning.':'Fan motion paused.');});
$('ws-replay').addEventListener('click',()=>{spinning=true;$('ws-spin').checked=true;startIntro(true);announce('Replaying the workstation entrance.');});
$('ws-settings-toggle').addEventListener('click',()=>{const p=$('ws-settings');p.hidden=!p.hidden;$('ws-settings-toggle').setAttribute('aria-expanded',String(!p.hidden));});
root.addEventListener('keydown',e=>{if(e.key==='Escape'){$('ws-settings').hidden=true;$('ws-settings-toggle').setAttribute('aria-expanded','false');$('ws-settings-toggle').focus();}});
controls.addEventListener('start',finishIntro);
reducedMotion.addEventListener('change',e=>{if(e.matches){finishIntro();spinning=false;$('ws-spin').checked=false;}});
function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.fov=w/h<.73?40:33;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(stage);
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;lastFrame=0;},{threshold:.05}).observe(root);
document.addEventListener('visibilitychange',()=>{lastFrame=0;});
resize();camera.position.copy(cameraTo);controls.update();applyLights();startIntro();
const textures=new Set();
for(const m of [...materials,underglow.material])for(const v of Object.values(m))if(v?.isTexture)textures.add(v);
for(const t of textures){renderer.initTexture(t);await yieldToPage();}
// Compile in the same linear render target used during actual rendering.
// Compiling against the screen makes a second, blocking shader variant later.
renderer.setRenderTarget(composer.readBuffer);
await renderer.compileAsync(scene,camera);
const shadowWarmup=new THREE.Scene();const depthMaterials=new Map();
tower.traverse(o=>{
 if(!o.isMesh||!o.castShadow)return;
 const m=o.material;
 if(!depthMaterials.has(m))depthMaterials.set(m,new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:m.map,alphaMap:m.alphaMap,alphaTest:m.alphaTest,side:m.side===THREE.FrontSide?THREE.BackSide:m.side===THREE.BackSide?THREE.FrontSide:THREE.DoubleSide}));
 o.customDepthMaterial=depthMaterials.get(m);
 const proxy=o.clone(false);proxy.material=o.customDepthMaterial;shadowWarmup.add(proxy);
});
// Shadow passes inherit the main scene light state, even for depth materials.
// Match it here to avoid compiling a second shader variant on the first frame.
await renderer.compileAsync(shadowWarmup,key.shadow.camera,scene);
await yieldToPage();
// Compile post-processing materials as well, rather than blocking the first
// visible animation frame while bloom and output programs are linked.
for(const pass of composer.passes){
 const shaderMaterials=[pass.material,pass.materialHighPassFilter,...(pass.separableBlurMaterials||[]),pass.compositeMaterial,pass.blendMaterial].filter(Boolean);
 for(const material of shaderMaterials){
  renderer.setRenderTarget(pass===outputPass?null:composer.readBuffer);
  const geometry=new THREE.PlaneGeometry(2,2);
  await renderer.compileAsync(new THREE.Mesh(geometry,material),new THREE.OrthographicCamera(-1,1,1,-1,0,1));
  geometry.dispose();
  await yieldToPage();
 }
}
renderer.setRenderTarget(null);
performance.mark('workstation-shaders-ready');
renderer.info.reset();composer.render();
renderer.shadowMap.autoUpdate=false;
await yieldToPage();
performance.mark('workstation-ready');
root.classList.add('is-ready');root.querySelector('.ws-loading').hidden=true;
let frameCost=16,slowFrames=0;

function frame(now){
 if(!root.isConnected)return;
 requestAnimationFrame(frame);
 if(!visible||document.hidden){lastFrame=0;return;}
 const dt=lastFrame?Math.min((now-lastFrame)/1000,.05):0;lastFrame=now;
 if(introActive){
  if(introStart===null)introStart=now;
  const t=Math.min(1,(now-introStart)/4200);
  const e=1-Math.pow(1-t,3);
  camera.position.lerpVectors(cameraFrom,cameraTo,e);controls.target.set(0,2.67,0);
  applyLights(Math.min(1,t*1.85));
  if(t>=1){finishIntro();announce('Workstation ready. Drag to rotate.');}
 }
 if(spinning)for(const fan of spinningFans)fan.rotor.rotation.z=(fan.rotor.rotation.z-dt*fan.speed*(introActive?power:1))%(Math.PI*2);
 controls.update();
 renderer.info.reset();composer.render();
 // Keep the entrance smooth on high-DPI/low-power devices without rebuilding.
 if(dt>0){frameCost=frameCost*.94+dt*1000*.06;if(frameCost>27)slowFrames++;else slowFrames=0;}
 if(slowFrames>45&&renderScale>.8){renderScale=Math.max(.8,renderScale-.2);renderer.setPixelRatio(renderScale);composer.setPixelRatio(renderScale);resize();slowFrames=0;frameCost=16;}
}
requestAnimationFrame(frame);
window.workstationScene={scene,tower,camera,renderer,composer,controls,rgbFans,spinningFans,glassGroup,applyLights,view,get introActive(){return introActive;},get spinning(){return spinning;}};
}catch(error){
 root.classList.add('has-fallback');const img=root.querySelector('.ws-fallback');img.src='/workstation-poster.png?v=20260907-ws5';
 root.querySelector('.ws-loading').textContent='3D is unavailable in this browser. Showing the workstation render.';
 $('ws-settings-toggle').hidden=true;$('ws-replay').hidden=true;console.error('Workstation:',error);
}
