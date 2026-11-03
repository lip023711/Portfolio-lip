'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname),out=path.join(root,'dist');
if(path.dirname(out)!==root||path.basename(out)!=='dist')throw new Error('Unexpected output directory');
fs.mkdirSync(path.join(out,'deck-assets'),{recursive:true});
const original=fs.readFileSync(path.join(root,'index.html'),'utf8');
const originals=new Map();let occurrences=0;
const html=original.replace(/data:image\/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/g,(uri,type,data)=>{
 const bytes=Buffer.from(data,'base64'),hash=crypto.createHash('sha256').update(bytes).digest('hex');
 const ext=({'png':'png','jpeg':'jpg','jpg':'jpg','webp':'webp','gif':'gif','svg+xml':'svg','x-icon':'ico'})[type];
 if(!ext)throw new Error('Unsupported embedded image type: '+type);
 const url='deck-assets/'+hash+'.'+ext;
 if(originals.has(url)&&originals.get(url)!==uri)throw new Error('Unexpected duplicate representation');
 originals.set(url,uri);occurrences++;
 fs.writeFileSync(path.join(out,url),bytes);return url;
});
let restored=html;for(const [url,uri] of originals)restored=restored.split(url).join(uri);
if(restored!==original)throw new Error('HTML preservation check failed');
fs.writeFileSync(path.join(out,'index.html'),html);
fs.cpSync(path.join(root,'personal-intro'),path.join(out,'personal-intro'),{recursive:true});
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?files(path.join(dir,x.name)):[path.join(dir,x.name)]);}
const stats=files(out).map(p=>({path:path.relative(out,p).split(path.sep).join('/'),bytes:fs.statSync(p).size}));
const tooLarge=stats.filter(x=>x.bytes>25*1024*1024);
if(tooLarge.length)throw new Error('Cloudflare 25 MiB limit exceeded: '+JSON.stringify(tooLarge));
if(stats.length>20000)throw new Error('Cloudflare free plan file count exceeded');
console.log(JSON.stringify({output:'dist',originalHtmlBytes:Buffer.byteLength(original),publishedHtmlBytes:Buffer.byteLength(html),extractedImageOccurrences:occurrences,uniqueImages:originals.size,files:stats.length,totalBytes:stats.reduce((n,x)=>n+x.bytes,0),largest:stats.sort((a,b)=>b.bytes-a.bytes)[0],restoresOriginalExactly:true}));
