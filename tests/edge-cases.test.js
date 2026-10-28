import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSequence, MOTION_FORMAT } from '../src/motion-sequence.js';
import { validateServoMappings, angleToServo } from '../src/arduino.js';
const joints=Array.from({length:4},()=>({min:-90,max:90}));
const pose=(angles,ms=500)=>({name:'Edge',ms,angles});
const doc=poses=>({format:MOTION_FORMAT,poses});

test('accepts lower and upper duration boundaries',()=>{
 const result=validateSequence(doc([pose([-90,-90,-90,-90],500),pose([90,90,90,90],30000)]),joints);
 assert.equal(result.length,2);
});
test('rejects NaN and Infinity in motion angles',()=>{
 for(const angle of [NaN,Infinity,-Infinity]) assert.throws(()=>validateSequence(doc([pose([angle,0,0,0])]),joints));
});
test('rejects nonnumeric string durations and angles',()=>{
 assert.throws(()=>validateSequence(doc([pose(['20',0,0,0])]),joints));
 assert.throws(()=>validateSequence(doc([pose([0,0,0,0],'1000')]),joints));
});
test('preserves source document while creating normalized records',()=>{
 const original=doc([pose([1.1,2.2,3.3,4.4],501.2)]);
 const normalized=validateSequence(original,joints);
 assert.equal(normalized[0].ms,501);
 assert.equal(original.poses[0].ms,501.2);
 assert.notStrictEqual(normalized[0].angles,original.poses[0].angles);
});
test('rejects missing and duplicate servo pins',()=>{
 const mapping=[3,5,6,9].map(pin=>({pin,low:0,high:180,reversed:false}));
 assert.throws(()=>validateServoMappings([...mapping.slice(0,3),{...mapping[3],pin:5}]));
 assert.throws(()=>validateServoMappings([...mapping.slice(0,3),{...mapping[3],pin:null}]));
});
test('servo conversion clamps outside supplied angle endpoints',()=>{
 const config={pin:3,low:10,high:170,reversed:false};
 assert.equal(angleToServo(-999,config),10);
 assert.equal(angleToServo(999,config),170);
});
