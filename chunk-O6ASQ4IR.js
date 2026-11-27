import{a as j}from"./chunk-XMJONAHE.js";import{h as $}from"./chunk-O7BYLEDC.js";import"./chunk-MU4FGLPM.js";import"./chunk-4TUYNIUD.js";import{o as f,va as z}from"./chunk-33CUCXKS.js";import"./chunk-TXRFLRI4.js";import"./chunk-HAJ6CM3P.js";import"./chunk-TA6MHMGO.js";import{K as D,Q as U}from"./chunk-3KZVGQAX.js";import{a as p}from"./chunk-HDFHHM3B.js";import{$d as w,Da as v,Fb as O,Ia as l,J as _,Jb as x,Kc as A,Lc as I,O as T,Pa as M,Qa as E,Sc as C,Tc as H,Va as P,Yc as R,Za as u,ae as L,cc as S,fd as N,gd as F,id as k}from"./chunk-VGZWTXUK.js";import"./chunk-CYHSBBGC.js";var B="2025-11-21",c={INITIALIZE:"ui/initialize",MESSAGE:"ui/message",NOTIFY_INITIALIZED:"ui/notifications/initialized",NOTIFY_SIZE_CHANGED:"ui/notifications/size-changed",NOTIFY_TOOL_RESULT:"ui/notifications/tool-result",OPEN_LINK:"ui/open-link",TOOLS_CALL:"tools/call",UPDATE_MODEL_CONTEXT:"ui/update-model-context"},Y=-32601,Z=-32603,G={name:"FZ Assistant",version:"1.0.0"},V={openLinks:{},serverResources:{},serverTools:{}},h="_hostHints";var W=(()=>{class i{route(t,e){if(!this.#r(t))return;let r=t.id,n=t.params??{};switch(t.method){case c.INITIALIZE:e.postToFrame({id:r,jsonrpc:"2.0",result:this.#e(e)});break;case c.NOTIFY_INITIALIZED:e.postToFrame({jsonrpc:"2.0",method:c.NOTIFY_TOOL_RESULT,params:this.toCallToolResult(e.initialToolResultPayload())});break;case c.TOOLS_CALL:{let o=typeof n.name=="string"?n.name:"",s=n.arguments??{};e.callServerTool(o,s,a=>e.postToFrame({id:r,jsonrpc:"2.0",result:this.toCallToolResult(a)}),a=>e.postToFrame({error:{code:Z,message:a},id:r,jsonrpc:"2.0"}));break}case c.MESSAGE:{let{autoSubmit:o,text:s}=this.#a(n);s&&e.deliverMessage(s,o),e.postToFrame({id:r,jsonrpc:"2.0",result:{}});break}case c.UPDATE_MODEL_CONTEXT:{let o=this.#n(n),s=n.structuredContent,a=this.#i(s).triggerResponse===!0,m=this.#s(s);e.updateModelContext(o,m,a,()=>e.postToFrame({id:r,jsonrpc:"2.0",result:{}}));break}case c.OPEN_LINK:{let o=n.url;typeof o=="string"&&o&&e.openExternalLink(o),e.postToFrame({id:r,jsonrpc:"2.0",result:{}});break}case c.NOTIFY_SIZE_CHANGED:{let o=n.height;typeof o=="number"&&Number.isFinite(o)&&e.resizeFrame(o);break}default:r!==void 0&&e.postToFrame({error:{code:Y,message:`Method not found: ${t.method}`},id:r,jsonrpc:"2.0"})}}toCallToolResult(t){return t.isError===!0?{content:[{text:this.#o(t),type:"text"}],isError:!0,structuredContent:t}:{content:[{text:JSON.stringify(t),type:"text"}],isError:!1,structuredContent:t}}#e(t){return{hostCapabilities:V,hostContext:t.buildHostContext(),hostInfo:G,protocolVersion:B}}#r(t){return!!t&&typeof t=="object"&&t.jsonrpc==="2.0"&&typeof t.method=="string"}#t(t){return t!==null&&typeof t=="object"&&t.type==="text"&&typeof t.text=="string"}#a(t){let e=this.#n(t).find(r=>r.type==="text");return{autoSubmit:e?._meta?.autoSubmit===!0,text:e?.text??""}}#n(t){let e=t.content;return Array.isArray(e)?e:[]}#i(t){let e=t?.[h];return e&&typeof e=="object"?e:{}}#s(t){return!t||!(h in t)?t:Object.fromEntries(Object.entries(t).filter(([e])=>e!==h))}#o(t){if(typeof t.error=="string"&&t.error.trim())return t.error;let e=Array.isArray(t.content)?t.content:[];for(let r of e)if(this.#t(r)&&r.text.trim())return r.text;return"unknown error"}static{this.\u0275fac=function(e){return new(e||i)}}static{this.\u0275prov=v({token:i,factory:i.\u0275fac,providedIn:"root"})}}return i})();function J(i){let y=[];for(let t=i.parentElement;t!==null;t=t.parentElement)(t.scrollHeight>t.clientHeight||t.scrollWidth>t.clientWidth)&&y.push({element:t,left:t.scrollLeft,top:t.scrollTop});return()=>{for(let t of y)t.element.scrollTop=t.top,t.element.scrollLeft=t.left}}var X=`@charset "UTF-8";

:root {
  color-scheme: light;
  --button-color-background-primary: #0079ca;
  --button-color-background-primary-hover: #0068b0;
  --button-color-foreground-primary: #ffffff;
  --button-color-foreground-primary-hover: #ffffff;
  --button-color-foreground-secondary: #0079ca;
  --button-color-foreground-secondary-hover: #005795;
  --button-color-border-secondary: #ccd2d8;
  --button-color-border-secondary-hover: #ccd2d8;
}

html {
  height: auto;
  min-height: 0;
  font-family: "Montserrat", sans-serif;
}

*,
*::before,
*::after {
  font-family: inherit;
}

body {
  height: auto;
  min-height: 0;
  margin: 0;
  padding: 0.75rem;
  font: 400 1rem / 1.5rem var(--ignt-font-family, "Montserrat", sans-serif);
  color: #031419;
  background: #ffffff;
}

h1,
h2,
h3,
h4,
h5,
h6 {
  margin: 0 0 0.5rem;
  color: #031419;
}

h1 {
  font: 600 1.25rem / 1.5rem var(--ignt-font-family, "Montserrat", sans-serif);
}

h2 {
  font: 600 1.125rem / 1.75rem var(--ignt-font-family, "Montserrat", sans-serif);
  margin-bottom: 0.5rem;
}
h2::after {
  content: "";
  display: block;
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
  border: 0;
  border-top: 0.0625rem solid #ccd2d8;
}

hr {
  margin: 0 0 0.75rem;
  border: 0;
  border-top: 0.0625rem solid #ccd2d8;
}

h3 {
  font: 600 1rem / 1.5rem var(--ignt-font-family, "Montserrat", sans-serif);
}

h4,
h5,
h6 {
  font: 600 0.875rem / 1.25rem var(--ignt-font-family, "Montserrat", sans-serif);
}

h1 + p,
h2 + p,
h3 + p {
  margin-top: 0.25rem;
  font: 400 0.875rem / 1.25rem var(--ignt-font-family, "Montserrat", sans-serif);
  color: #536b75;
}

p {
  margin: 0 0 0.75rem;
  font: 400 1rem / 1.5rem var(--ignt-font-family, "Montserrat", sans-serif);
  color: #031419;
}

small {
  font: 400 0.75rem / 1rem var(--ignt-font-family, "Montserrat", sans-serif);
  color: #536b75;
}

fieldset {
  border: none;
  margin: 0 0 0.75rem;
  padding: 0;
}

legend {
  display: block;
  margin-bottom: 0.5rem;
  padding: 0;
  font: 600 0.875rem / 1.25rem var(--ignt-font-family, "Montserrat", sans-serif);
  color: #031419;
}

label {
  display: block;
  margin-bottom: 0.25rem;
  font: 600 0.875rem / 1.25rem var(--ignt-font-family, "Montserrat", sans-serif);
  color: #031419;
}

label:has(input[type=checkbox]),
label:has(input[type=radio]) {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  margin-right: 0.5rem;
  font: 400 1rem / 1.5rem var(--ignt-font-family, "Montserrat", sans-serif);
}

input,
select,
textarea {
  box-sizing: border-box;
  width: 100%;
  margin-bottom: 0.75rem;
  min-height: 2rem;
  padding: 0.5rem 0.75rem;
  border: 0.0625rem solid var(--input-color-border, #ccd2d8);
  border-radius: var(--input-dimensions-radii, 0.5rem);
  background: #ffffff;
  color: #031419;
  font: 400 1rem / 1.5rem var(--ignt-font-family, "Montserrat", sans-serif);
}

input::placeholder,
textarea::placeholder {
  color: #a7b2ba;
}

input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  border-color: #0068b0;
  box-shadow: inset 0 0 0 0.0625rem #0068b0;
  outline: 0.25rem solid rgba(0, 137, 227, 0.32);
  outline-offset: 0;
}

input:disabled,
select:disabled,
textarea:disabled {
  background: #f2f3f3;
  color: #a7b2ba;
  cursor: not-allowed;
}

input:user-invalid,
select:user-invalid,
textarea:user-invalid,
input[aria-invalid=true],
select[aria-invalid=true],
textarea[aria-invalid=true] {
  border-color: #eb0052;
  color: #eb0052;
}

input[type=checkbox],
input[type=radio] {
  width: auto;
  min-height: auto;
  margin-right: 0.5rem;
  margin-bottom: 0;
  accent-color: var(--button-color-background-primary, #0079ca);
}

details {
  margin-bottom: 0.75rem;
}

summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border: none;
  border-radius: 0;
  font: 600 0.875rem / 1.25rem var(--ignt-font-family, "Montserrat", sans-serif);
  color: #0079ca;
  background: transparent;
  cursor: pointer;
  list-style: none;
  appearance: none;
  user-select: none;
}
summary::-webkit-details-marker {
  display: none;
}
summary::marker {
  content: "";
}
summary::before {
  content: "\u25B8";
  font-size: 0.75rem;
  line-height: 1;
  transition: transform 120ms ease-in-out;
}
summary:hover {
  color: #005795;
  background: transparent;
}
summary:focus, summary:focus-visible, summary:active {
  background: transparent;
  outline: none;
}
summary:focus-visible {
  outline: 0.25rem solid rgba(0, 137, 227, 0.32);
  outline-offset: 0.25rem;
}
summary::selection {
  background: transparent;
  color: inherit;
}

details[open] summary::before {
  transform: rotate(90deg);
}

details[open] summary {
  margin-bottom: 0.5rem;
}

button,
input[type=button],
input[type=reset],
input[type=submit] {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  min-width: 4rem;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
  padding: 0 0.75rem;
  border: 0.125rem solid transparent;
  border-radius: 4rem;
  font: 600 0.875rem / 1.25rem var(--ignt-font-family, "Montserrat", sans-serif);
  cursor: pointer;
  width: auto;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
button::selection,
input[type=button]::selection,
input[type=reset]::selection,
input[type=submit]::selection {
  background: transparent;
  color: inherit;
}

button[type=button],
input[type=button],
button[type=reset],
input[type=reset] {
  border-color: #ccd2d8 !important;
  background: #ffffff !important;
  color: #0079ca !important;
}

button:not([type]),
button[type=submit],
input[type=submit] {
  border-color: transparent !important;
  background: #0079ca !important;
  color: #ffffff !important;
}

button[type=button]:not(:disabled):hover,
input[type=button]:not(:disabled):hover,
button[type=reset]:not(:disabled):hover,
input[type=reset]:not(:disabled):hover {
  border-color: #ccd2d8 !important;
  background: #ffffff !important;
  color: #005795 !important;
}

button:not([type]):not(:disabled):hover,
button[type=submit]:not(:disabled):hover,
input[type=submit]:not(:disabled):hover {
  border-color: transparent !important;
  background: #0068b0 !important;
  color: #ffffff !important;
}

button:not(:disabled):focus-visible,
input[type=button]:not(:disabled):focus-visible,
input[type=reset]:not(:disabled):focus-visible,
input[type=submit]:not(:disabled):focus-visible {
  outline: 0.25rem solid rgba(0, 137, 227, 0.32);
  outline-offset: 0;
}

button:disabled,
input[type=button]:disabled,
input[type=reset]:disabled,
input[type=submit]:disabled {
  background: #f2f3f3 !important;
  border-color: #f2f3f3 !important;
  color: #a7b2ba !important;
  cursor: not-allowed;
}`;var g="fz-mcp-app-host-theme",Q='<meta name="color-scheme" content="light">',tt='<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap">',et=`<style id="${g}">${X}</style>`,d=`${Q}${tt}${et}`;function q(i){return i.includes(g)?i:/<\/head>/i.test(i)?i.replace(/<\/head>/i,`${d}</head>`):/<head[\s>]/i.test(i)?i.replace(/<head([^>]*)>/i,`<head$1>${d}`):/<html[\s>]/i.test(i)?i.replace(/<html([^>]*)>/i,`<html$1><head>${d}</head>`):`${d}${i}`}var rt=["mcpFrame"],ot=200,nt=200,it=2e3,Ct=(()=>{class i{constructor(){this.http=l(D),this.partnerService=l(z),this.chatbotFacade=l($),this.composer=l(j),this.sanitizer=l(U),this.destroyRef=l(P),this.bridge=l(W),this.frame=L("mcpFrame"),this.data=w.required(),this.frameHeight=u(ot),this.iframeUrlSafe=u(this.sanitizer.bypassSecurityTrustResourceUrl("about:blank")),this.expectedOrigin=u(null),this.#e=null,this.#r=null,this.#t=null}#e;#r;#t;buildHostContext(){return{appName:"FZ Assistant",locale:navigator.language||"en",partnerId:this.partnerId??null,theme:"light",threadId:this.threadId??null,timestamp:new Date().toISOString()}}callServerTool(t,e,r,n){let o=this.partnerId;if(o===void 0){n("No active partner session");return}let s=`${f.agentsBaseUrl}/fz-assistant/partner/${o}/chatbot/mcp-app-proxy`;this.http.post(s,{arguments:e,tool_name:t}).pipe(p(this.destroyRef)).subscribe({error:a=>n(a?.message??"Proxy error"),next:a=>r(a??{})})}deliverMessage(t,e){e?this.chatbotFacade.sendMessage(t).pipe(p(this.destroyRef)).subscribe():this.composer.setDraft(t)}initialToolResultPayload(){return this.data().meta?.tool_result??{mcp_app_uri:this.data().id}}ngOnInit(){this.destroyRef.onDestroy(()=>{this.#i(),this.#s(),this.#l()}),this.#d(),_(window,"message").pipe(T(t=>t.source===this.iframeWindow&&this.#a(t.origin)),p(this.destroyRef)).subscribe(t=>this.bridge.route(t.data,this))}onFrameLoad(){this.#n(),this.#o()}openExternalLink(t){window.open(t,"_blank","noopener,noreferrer")}postToFrame(t){this.iframeWindow?.postMessage(t,this.expectedOrigin()??"*")}resizeFrame(t){this.#o(t)}updateModelContext(t,e,r,n){let o=this.partnerId,s=this.threadId;if(o===void 0||!s){n();return}let a=`${f.agentsBaseUrl}/fz-assistant/partner/${o}/chatbot/mcp-app-context`;this.http.post(a,{content:t,structured_content:e??null,thread_id:s,trigger_response:r}).pipe(p(this.destroyRef)).subscribe({error:()=>n(),next:m=>{n(),r&&m.run_id&&this.chatbotFacade.displayRunResult(m.run_id).pipe(p(this.destroyRef)).subscribe()}})}#a(t){let e=this.expectedOrigin();return e===null||t===e}#n(){this.#i();try{let t=this.frame()?.nativeElement.contentDocument;if(!t?.body)return;this.#r=new MutationObserver(()=>{this.#o()}),this.#r.observe(t.body,{childList:!0,subtree:!0})}catch{}}#i(){this.#r?.disconnect(),this.#r=null}#s(){this.#t!==null&&(cancelAnimationFrame(this.#t),this.#t=null)}#o(t){this.#s(),this.#t=requestAnimationFrame(()=>{this.#t=requestAnimationFrame(()=>{this.#t=null,this.#p(t)})})}#p(t){let e=this.frame()?.nativeElement;if(!e){t!==void 0&&this.frameHeight.set(this.#c(t));return}let r=J(e);try{e.style.height="0px",e.offsetHeight;let n=this.#m(),o=this.#c(n??t??this.frameHeight());e.style.height=`${o}px`,e.offsetHeight,this.frameHeight.set(o)}finally{r()}}#c(t){return Math.min(it,Math.max(nt,Math.round(t)))}#m(){try{let t=this.frame()?.nativeElement.contentDocument;if(!t?.body)return null;let e=t.body,r=0;for(let b of Array.from(e.children))b instanceof HTMLElement&&(r=Math.max(r,b.offsetTop+b.offsetHeight));let n=t.defaultView?.getComputedStyle(e)??{paddingBottom:"0",paddingTop:"0"},o=Number.parseFloat(n.paddingTop)||0,s=Number.parseFloat(n.paddingBottom)||0,a=r+o+s,m=Math.max(e.scrollHeight,t.documentElement.scrollHeight);return Math.max(a,m)}catch{return null}}#d(){let t=this.data().id;if(t.startsWith("ui://")){let e=this.partnerService.getPartner()?.id;if(!e){this.iframeUrlSafe.set(this.sanitizer.bypassSecurityTrustResourceUrl("about:blank"));return}let r=`${f.agentsBaseUrl}/fz-assistant/partner/${e}/chatbot/mcp-app-resource?uri=${encodeURIComponent(t)}`;this.http.get(r,{responseType:"text"}).pipe(p(this.destroyRef)).subscribe({error:()=>{this.iframeUrlSafe.set(this.sanitizer.bypassSecurityTrustResourceUrl("about:blank"))},next:n=>{this.#l();let o=new Blob([q(n)],{type:"text/html"}),s=URL.createObjectURL(o);this.#e=s,this.iframeUrlSafe.set(this.sanitizer.bypassSecurityTrustResourceUrl(s)),this.expectedOrigin.set(null)}})}else{this.iframeUrlSafe.set(this.sanitizer.bypassSecurityTrustResourceUrl(t));try{let e=new URL(t,window.location.href).origin;this.expectedOrigin.set(e)}catch{this.expectedOrigin.set(null)}}}get iframeWindow(){return this.frame()?.nativeElement?.contentWindow??null}get partnerId(){return this.partnerService.getPartner()?.id}get threadId(){return this.chatbotFacade.threadId()}#l(){this.#e!==null&&(URL.revokeObjectURL(this.#e),this.#e=null)}static{this.\u0275fac=function(e){return new(e||i)}}static{this.\u0275cmp=S({type:i,selectors:[["app-chatbot-mcp-app"]],viewQuery:function(e,r){e&1&&N(r.frame,rt,5),e&2&&F()},inputs:{data:[1,"data"]},decls:3,vars:3,consts:[["mcpFrame",""],["data-testid","mcp-app-wrapper",1,"mcp-app-wrapper"],["sandbox","allow-scripts allow-same-origin allow-forms","title","MCP App",1,"mcp-app-iframe",3,"load","src"]],template:function(e,r){if(e&1){let n=C();A(0,"div",1)(1,"iframe",2,0),R("load",function(){return M(n),E(r.onFrameLoad())}),I()()}e&2&&(x(),k("height",r.frameHeight(),"px"),H("src",r.iframeUrlSafe(),O))},styles:[".mcp-app-wrapper[_ngcontent-%COMP%]{width:100%;padding:1rem;border:1px solid #ccd2d8;border-radius:1rem;overflow:hidden;background:#fff;color-scheme:light}.mcp-app-iframe[_ngcontent-%COMP%]{display:block;width:100%;min-height:200px;border:none;background:#fff;color-scheme:light}"],changeDetection:0})}}return i})();export{Ct as ChatbotMcpAppComponent};
