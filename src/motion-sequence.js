/** Strict motion-sequence import validation; no unsafe property coercion. */
export const MOTION_FORMAT='RobotArmStudioMotion';
export function validateSequence(doc,joints){
 if(!doc||doc.format!==MOTION_FORMAT||!Array.isArray(doc.poses))throw Error('Not a RobotArm Studio motion file');
 if(doc.poses.length>30)throw Error('Maximum 30 poses in Arduino-compatible mode');
 return doc.poses.map((p,i)=>{
  if(!p||!Array.isArray(p.angles)||p.angles.length!==4 || p.angles.some(a=>typeof a!=='number'||!Number.isFinite(a)))throw Error(`Invalid angles in pose ${i+1}`);
  if(typeof p.ms!=='number'||!Number.isFinite(p.ms)||p.ms<500||p.ms>30000)throw Error(`Invalid duration in pose ${i+1}`);
  if(p.angles.some((a,k)=>a<joints[k].min||a>joints[k].max))throw Error(`Out-of-range joint in pose ${i+1}`);
  return {name:String(p.name||`Pose ${i+1}`).slice(0,50),ms:Math.round(p.ms),angles:p.angles.slice()};
 });
}
export function makeSampleSequence(){return [
 {name:'Home',ms:1800,angles:[0,0,0,0]},
 {name:'Reach',ms:2400,angles:[-32,18,25,-12]},
 {name:'Orient wrist',ms:1700,angles:[-32,42,20,22]},
 {name:'Lift',ms:2200,angles:[18,30,-28,8]},
 {name:'Return',ms:2200,angles:[0,0,0,0]}
 ];}
