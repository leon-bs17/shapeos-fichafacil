const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const exportsObject={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/lib/ui/anchored-popover.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exportsObject});const {positionAnchoredPopover:place}=exportsObject;
const viewport={left:0,top:0,width:1280,height:720},panel={width:300,height:390};
assert.equal(place({left:900,right:1054,top:600,bottom:640},panel,viewport).side,'top');
assert.equal(place({left:30,right:184,top:40,bottom:80},panel,viewport).side,'bottom');
for(const viewport of [{left:0,top:0,width:320,height:480},{left:0,top:0,width:375,height:220},{left:120,top:230,width:280,height:360},{left:0,top:0,width:1920,height:1080}]) {
 for(const align of ['start','end']) for(let i=0;i<100;i++) {
  const left=viewport.left+(viewport.width-20)*i/99,top=viewport.top+(viewport.height-44)*i/99;
  const p=place({left,right:left+154,top,bottom:top+44},panel,viewport,align);
  assert(p.left>=viewport.left+8);assert(p.top>=viewport.top+8);
  assert(p.left+Math.min(panel.width,p.maxWidth)<=viewport.left+viewport.width-8+1e-8);
  assert(p.top+Math.min(panel.height,p.maxHeight)<=viewport.top+viewport.height-8+1e-8);
 }
}
console.log('PASS: upward/downward placement, both alignments, viewport edges, mobile/landscape/keyboard and zoom offsets (800 positions)');
