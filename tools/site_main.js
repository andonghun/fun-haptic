(function(){
  var $=function(s,c){return (c||document).querySelector(s)}, $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- language: Korean browsers get Korean, everyone else English; the nav button switches for this visit ---- */
  var EN={};
  $$('[data-ko]').forEach(function(el,i){el.dataset.i=i;EN[i]=el.innerHTML});
  function setLang(l){
    document.documentElement.lang=l;
    $$('[data-ko]').forEach(function(el){el.innerHTML=l==='ko'?el.dataset.ko:EN[el.dataset.i]});
    $('#langBtn').textContent=l==='ko'?'English':'한국어';
    var inp=$('.rs-input'); if(inp) inp.placeholder=l==='ko'?'가이드 검색, 예: “Steam”':'Search the guide, e.g. “Steam”';
    document.title=l==='ko'?'Pixel Haptics — 브라우저에서 DualSense를 느껴보세요':'Pixel Haptics — feel your DualSense in the browser';
    finding(cur); trigMode(curMode);
  }
  $('#langBtn').addEventListener('click',function(){setLang(document.documentElement.lang==='ko'?'en':'ko')});
  var L=function(en,ko){return document.documentElement.lang==='ko'?ko:en};

  /* ---- home: experience tabs drive the live preview ---- */
  var FIND={
    playground:['Footsteps that change with the floor, a sweep across your palms on a dash, and a hit-stop thud when a weapon lands.','바닥에 따라 바뀌는 발소리, 대시할 때 손바닥을 쓸고 가는 느낌, 무기가 맞는 순간 멈칫하는 쿵.'],
    rain:['Hundreds of tiny taps spread over both palms; an umbrella turns them into a low drumming.','양손에 흩어지는 수백 개의 작은 톡톡. 우산을 펴면 낮게 두드리는 소리로 바뀝니다.'],
    pistol:['A clean click in R2, then a hard kick, then the impact arriving in your right hand.','R2의 깔끔한 딸깍, 강한 반동, 그리고 오른손에 도착하는 명중감.'],
    rifle:['The trigger buzzes under your finger twelve times a second until it overheats and locks.','과열돼서 잠길 때까지 손가락 밑에서 초당 12번 떨리는 트리거.'],
    bow:['Resistance that builds with the draw, a tremble at full pull, then the string ringing left and right.','당길수록 쌓이는 저항, 끝까지 당기면 떨림, 그리고 좌우로 울리는 시위.'],
    melee:['A swish that crosses your hands before contact, then a hit whose weight matches the swing.','맞기 전에 손을 가로지르는 바람 소리, 그리고 휘두른 무게만큼의 타격.'],
    gallery:['Whatever lights up the screen lights up your hands: bursts hit, glows hum, colour sets the pitch.','화면에서 빛나는 것이 손에서도 빛납니다. 터지면 치고, 빛나면 웅웅거리고, 색이 음높이를 정합니다.']
  };
  var NAMES={playground:['Playground','플레이그라운드'],rain:['Rain','비'],pistol:['Pistol','권총'],rifle:['Machine gun','기관총'],bow:['Bow','활'],melee:['Melee','근접 무기'],gallery:['Effect gallery','이펙트 갤러리']};
  var cur='playground';
  function finding(id){var f=FIND[id];$('[data-k=finding]').textContent=L(f[0],f[1]);$('[data-k=title]').textContent=L(NAMES[id][0],NAMES[id][1])}
  $$('.p-home .task').forEach(function(b){b.addEventListener('click',function(){
    cur=b.dataset.x; $$('.p-home .task').forEach(function(t){var on=t===b;t.classList.toggle('on',on);t.setAttribute('aria-selected',on)});
    var sw=$$('.p-home .swap'); sw.forEach(function(s){s.classList.add('fade')});
    setTimeout(function(){finding(cur);sw.forEach(function(s){s.classList.remove('fade')})},180);
    if(window.__pv) window.__pv.main(cur);
  })});

  /* ---- trigger modes: draw the resistance curve ---- */
  var MODES={click:['Resistance rises, then breaks at the click — the pistol.','저항이 올라가다 딸깍 끊깁니다 — 권총.'],ramp:['Heavier the further you pull — the bow.','당길수록 무거워집니다 — 활.'],buzz:['The trigger vibrates under your finger — the machine gun.','손가락 밑에서 트리거가 떨립니다 — 기관총.'],wall:['A hard stop partway down — an overheated barrel.','중간에서 딱 막힙니다 — 과열된 총열.']};
  var curMode='click';
  function trigMode(m){
    curMode=m; var d='';
    for(var i=0;i<=60;i++){var x=i*5,u=i/60,y;
      if(m==='click') y=u<0.55?80-u*110:(u<0.6?80-0.55*110+(u-0.55)*900:12);
      else if(m==='ramp') y=80-Math.pow(u,1.6)*72;
      else if(m==='buzz') y=u<0.25?80:46+Math.sin(u*120)*14;
      else y=u<0.5?80-u*20:6;
      y=Math.max(4,Math.min(82,y)); d+=(i?'L':'M')+x+' '+y.toFixed(1)}
    $('#trigPath').setAttribute('d',d); $('#trigNote').textContent=L(MODES[m][0],MODES[m][1]);
    $$('#trigModes .role').forEach(function(b){b.classList.toggle('on',b.dataset.mode===m)});
  }
  $$('#trigModes .role').forEach(function(b){b.addEventListener('click',function(){trigMode(b.dataset.mode)})});

  /* ---- surfaces ---- */
  var SURF=[['Grass','풀','#4f9a3c'],['Wood','나무','#9a6232'],['Steel','철판','#7d889a'],['Stone','돌','#76737f'],['Gravel','자갈','#8c7d6a'],['Snow','눈','#c9d6e6'],['Water','물','#3a78b0'],['Sand','모래','#d4b070']];
  var st=$('#surfTiles');
  SURF.forEach(function(s,i){var b=document.createElement('button');b.type='button';b.className='surf'+(i?'':' on');b.style.background='linear-gradient(180deg,rgba(7,9,10,0),rgba(7,9,10,.65)),'+s[2];b.innerHTML='<span data-ko="'+s[1]+'">'+s[0]+'</span>';
    b.addEventListener('click',function(){$$('.surf').forEach(function(x){x.classList.toggle('on',x===b)});toast(L('Try it in the Playground: walk onto '+s[0].toLowerCase(),'플레이그라운드에서 '+s[1]+' 위를 걸어 보세요'))});st.appendChild(b)});
  $$('.surf [data-ko]').forEach(function(el){el.dataset.i='s'+el.textContent;EN['s'+el.textContent]=el.innerHTML});

  /* ---- weapon chips, rain timeline, proof numbers ---- */
  $$('.p-home .model').forEach(function(b){b.addEventListener('click',function(){$$('.p-home .model').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')})})});
  var runs=$$('.p-home .sched .run'),si=0,stimer=null;
  function tick(){runs.forEach(function(r,j){r.classList.toggle('lit',j<si);r.classList.toggle('now',j===si-1)});si++;if(si>runs.length+2)si=0}
  function fmt(n){return String(n)}
  function countUp(el,to){if(reduce||!to){el.textContent=fmt(to);return}var t0=null;function step(t){if(!t0)t0=t;var k=Math.min(1,(t-t0)/1400),e=1-Math.pow(1-k,3);el.textContent=Math.round(to*e);if(k<1)requestAnimationFrame(step)}requestAnimationFrame(step)}
  var proofDone=false;
  if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;
    if(e.target.classList.contains('proof')&&!proofDone){proofDone=true;$$('.proof [data-count]').forEach(function(b){countUp(b,+b.dataset.count)})}
    if(e.target.classList.contains('sched')&&!stimer){tick();stimer=setInterval(tick,900)}})},{threshold:.4});
    io.observe($('.p-home .proof'));io.observe($('.p-home .sched'))}

  /* ---- FAQ accordion (experiences page) ---- */
  var qas=$$('.p-xp .qa');
  function setOpen(qa,open){var ans=$('.ans',qa),btn=$('button',qa);qa.classList.toggle('open',open);btn.setAttribute('aria-expanded',open);
    if(open){ans.style.height=ans.scrollHeight+'px'}else{ans.style.height=ans.scrollHeight+'px';ans.offsetHeight;ans.style.height='0px'}}
  qas.forEach(function(qa){var ans=$('.ans',qa);ans.addEventListener('transitionend',function(){if(qa.classList.contains('open'))ans.style.height='auto'});
    if(qa.classList.contains('open'))ans.style.height='auto';
    $('button',qa).addEventListener('click',function(){var w=!qa.classList.contains('open');qas.forEach(function(o){if(o!==qa&&o.classList.contains('open'))setOpen(o,false)});setOpen(qa,w)})});

  /* ---- guide articles in a side drawer ---- */
  var ART={
    start:['Getting started','시작하기',
      '<ol><li>Use desktop Chrome or Edge.</li><li>Connect the DualSense with a USB cable.</li><li>Open <b>Play</b> and press <b>Connect DualSense</b>; pick the controller in the browser prompt.</li><li>Press <b>Turn on HD haptics</b> and choose the DualSense audio output. Allow the microphone prompt once (nothing is recorded).</li><li>Run the two-hand test: you should feel a buzz travel from left to right.</li></ol><p>No DualSense? Any standard gamepad works with rumble, and the keyboard and mouse work too.</p>',
      '<ol><li>데스크톱 Chrome 또는 Edge를 쓰세요.</li><li>DualSense를 USB 케이블로 연결합니다.</li><li><b>플레이</b>를 열고 <b>DualSense 연결</b>을 누른 뒤 브라우저 창에서 컨트롤러를 고릅니다.</li><li><b>HD 햅틱 켜기</b>를 누르고 DualSense 오디오 출력을 고릅니다. 마이크 권한은 한 번만 허용하면 됩니다(녹음하지 않음).</li><li>양손 테스트로 왼쪽에서 오른쪽으로 흐르는 진동을 확인하세요.</li></ol><p>DualSense가 없어도 일반 게임패드는 일반 진동으로, 키보드와 마우스로도 플레이할 수 있습니다.</p>'],
    hd:['What are HD haptics?','HD 햅틱이란?',
      '<p>Older pads spin weighted motors: they can only buzz harder or softer. The DualSense has a <b>voice coil actuator</b> in each grip, closer to a small speaker than a motor. It plays a waveform, so it can draw a short tap, a gritty crunch or a deep thud.</p><p>Over USB the controller appears as a 4-channel audio device. Channels 1 and 2 are the speaker and headphones; <b>channels 3 and 4 drive the left and right coil</b>. Pixel Haptics sends waveforms straight to those two channels from the browser.</p>',
      '<p>예전 패드는 추가 달린 모터를 돌려서 세게, 약하게만 떨 수 있었습니다. DualSense는 손잡이마다 <b>보이스코일 액추에이터</b>가 있어서 모터보다 작은 스피커에 가깝습니다. 파형을 재생하기 때문에 짧은 톡, 거친 자글자글, 묵직한 쿵을 그릴 수 있습니다.</p><p>USB로 연결하면 컨트롤러가 4채널 오디오 장치로 잡힙니다. 1·2번은 스피커와 헤드폰, <b>3·4번이 왼손·오른손 코일</b>입니다. Pixel Haptics는 브라우저에서 이 두 채널로 파형을 직접 보냅니다.</p>'],
    triggers:['The four trigger modes','트리거 모드 네 가지',
      '<ul><li><b>Click</b> — resistance builds and breaks at a point, like a real trigger sear. Used by the pistol.</li><li><b>Ramp</b> — resistance grows with the pull. Used by the bow.</li><li><b>Buzz</b> — the trigger motor vibrates at a set frequency. Used by the machine gun.</li><li><b>Wall</b> — a firm stop partway down. Used when the gun overheats.</li></ul><p>The browser sends these settings to the controller over WebHID in an output report, next to the lightbar colour.</p>',
      '<ul><li><b>딸깍</b> — 저항이 쌓이다가 한 지점에서 끊깁니다. 권총.</li><li><b>경사</b> — 당길수록 저항이 커집니다. 활.</li><li><b>진동</b> — 트리거 모터가 정해진 주파수로 떱니다. 기관총.</li><li><b>벽</b> — 중간에서 단단히 막힙니다. 총이 과열됐을 때.</li></ul><p>브라우저는 이 설정을 라이트바 색과 함께 WebHID 출력 리포트로 컨트롤러에 보냅니다.</p>'],
    steam:['Steam Input is blocking the controller','Steam Input이 컨트롤러를 막을 때',
      '<p>Steam can take over a DualSense to translate it for other games. While it does, the browser may connect but the haptics stay silent.</p><ol><li>Quit Steam completely (tray icon, Exit), or</li><li>In Steam, open Settings, Controller, and turn off PlayStation controller support for the desktop.</li><li>Also close DS4Windows or similar tools.</li><li>Unplug, plug back in, and reconnect on the Play page.</li></ol>',
      '<p>Steam은 다른 게임용으로 DualSense를 가로채 변환할 수 있습니다. 그동안에는 브라우저가 연결돼도 진동이 나지 않을 수 있습니다.</p><ol><li>Steam을 완전히 종료하거나(트레이 아이콘, 종료)</li><li>Steam 설정, 컨트롤러에서 데스크톱용 PlayStation 컨트롤러 지원을 끕니다.</li><li>DS4Windows 같은 도구도 끄세요.</li><li>케이블을 뺐다 다시 꽂고 플레이 페이지에서 다시 연결합니다.</li></ol>'],
    bt:['Playing over Bluetooth','블루투스로 플레이하기',
      '<p>Everything works over Bluetooth except the voice-coil audio: browsers cannot reach the controller audio wirelessly. Pixel Haptics falls back to the classic rumble motors, still split left and right, and keeps the adaptive triggers and lightbar.</p>',
      '<p>블루투스에서도 보이스코일 오디오를 빼고 모두 동작합니다. 브라우저가 무선으로는 컨트롤러 오디오에 접근할 수 없기 때문입니다. 이때는 좌우로 나뉜 일반 진동 모터로 대신하고, 적응형 트리거와 라이트바는 그대로 씁니다.</p>'],
    privacy:['Privacy','개인정보처리방침',
      '<p>Pixel Haptics runs entirely in your browser. We do not run accounts or collect personal data.</p><ul><li><b>Microphone prompt</b>: Chrome hides audio device names until a media permission is granted. We request it once to find the DualSense output and stop the stream immediately. Nothing is recorded or sent.</li><li><b>Saved settings</b>: vibration strength, volume and language are stored only in your browser\'s local storage.</li><li><b>Ads</b>: this site may show ads from Google AdSense, which can use cookies to serve and measure ads. You can manage personalised ads at google.com/settings/ads.</li></ul>',
      '<p>Pixel Haptics는 전부 브라우저 안에서 동작합니다. 계정을 운영하지 않고 개인정보를 수집하지 않습니다.</p><ul><li><b>마이크 권한</b>: Chrome은 미디어 권한을 받기 전까지 오디오 장치 이름을 숨깁니다. DualSense 출력 장치를 찾으려고 한 번 요청하고 바로 스트림을 닫습니다. 녹음하거나 전송하지 않습니다.</li><li><b>저장되는 설정</b>: 진동 세기, 볼륨, 언어는 이 브라우저의 로컬 저장소에만 저장됩니다.</li><li><b>광고</b>: 이 사이트는 Google AdSense 광고를 보여줄 수 있으며, 광고 제공과 측정에 쿠키를 쓸 수 있습니다. 맞춤 광고는 google.com/settings/ads 에서 관리할 수 있습니다.</li></ul>'],
    silent:['Haptics are silent on Windows','Windows에서 진동이 안 날 때',
      '<ol><li>Is it on USB? Bluetooth only gives classic rumble.</li><li>Quit Steam or turn off Steam Input (see the Steam article).</li><li>In Windows Sound settings, open the DualSense output, then Properties, Advanced, and pick a <b>4-channel</b> format.</li><li>Make sure that device\'s volume is not muted.</li><li>Reconnect and run the two-hand test again.</li></ol>',
      '<ol><li>USB로 연결했나요? 블루투스는 일반 진동만 됩니다.</li><li>Steam을 끄거나 Steam Input을 끄세요(Steam 글 참고).</li><li>Windows 소리 설정에서 DualSense 출력, 속성, 고급으로 가서 <b>4채널</b> 형식을 고릅니다.</li><li>그 장치의 볼륨이 음소거가 아닌지 확인합니다.</li><li>다시 연결하고 양손 테스트를 해 보세요.</li></ol>'],
    auto:['Turning sound and light into touch','소리와 빛을 촉감으로 바꾸기',
      '<p>For footsteps we take a real recording, follow its loudness, and replay that shape on a low carrier tone with a sharp click at the start: the step keeps its character but becomes something a palm can feel.</p><p>For the 244 pixel effects we measure the light each frame: a sudden rise becomes a hit, a steady glow becomes a hum, its left-right position picks the hand, and warm colours play lower than cold ones.</p>',
      '<p>발소리는 실제 녹음의 크기 변화를 따라가서, 그 모양을 낮은 기본음 위에 다시 그리고 시작에 날카로운 클릭을 더합니다. 발소리의 개성은 남기고 손바닥이 느낄 수 있게 바꾸는 겁니다.</p><p>픽셀 이펙트 244개는 매 프레임 빛을 잽니다. 갑자기 밝아지면 타격, 계속 빛나면 허밍, 좌우 위치로 손을 고르고, 따뜻한 색은 낮게, 차가운 색은 높게 울립니다.</p>'],
    surfaces:['Feel the difference between surfaces','바닥의 차이 느끼기',
      '<ol><li>Open the Playground and walk slowly onto the wooden deck. Notice the hollow knock in each hand.</li><li>Keep walking onto the brick: it is shorter and harder.</li><li>Push the stick all the way to run; steps come faster and heavier. Release suddenly to feel the skid.</li><li>Jump from a run and land on each floor.</li></ol>',
      '<ol><li>플레이그라운드에서 나무 데크 위를 천천히 걸어 보세요. 손마다 속이 빈 두드림이 옵니다.</li><li>벽돌로 넘어가면 더 짧고 단단합니다.</li><li>스틱을 끝까지 밀어 달리면 발걸음이 빠르고 무거워집니다. 갑자기 놓으면 미끄러지는 감촉이 옵니다.</li><li>달리다 점프해서 각 바닥에 착지해 보세요.</li></ol>'],
    bit:['Why one hidden bit silences the coils','숨은 비트 하나가 진동을 막는 이유',
      '<p>The controller\'s output report has flags that say which fields are valid. Two of them enable the classic rumble compatibility mode. While they are set, the coils follow the rumble values and ignore the audio channels completely — so HD haptics seem dead even though the audio stream is running.</p><p>Pixel Haptics only sets those flags when HD haptics are off, and sends rumble values of zero otherwise.</p>',
      '<p>컨트롤러 출력 리포트에는 어떤 값이 유효한지 알려주는 플래그가 있습니다. 그중 두 개가 구형 진동 호환 모드를 켭니다. 이 플래그가 켜져 있으면 코일이 구형 진동 값만 따르고 오디오 채널을 완전히 무시합니다. 그래서 오디오는 나가는데 HD 햅틱이 죽은 것처럼 보입니다.</p><p>Pixel Haptics는 HD 햅틱이 꺼져 있을 때만 이 플래그를 켭니다.</p>']
  };
  var dr=$('#drawer');
  function openArt(k){var a=ART[k];if(!a)return;$('#drBody').innerHTML='<h2>'+L(a[0],a[1])+'</h2>'+L(a[2],a[3]);$('#drEyebrow').textContent=L('Guide','가이드');dr.classList.add('open');$('.close',dr).focus()}
  function closeArt(){dr.classList.remove('open')}
  $$('[data-art]').forEach(function(b){b.addEventListener('click',function(){openArt(b.dataset.art)})});
  $$('[data-art-link]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();window.__show&&window.__show('guide');setTimeout(function(){openArt(a.dataset.artLink)},200)})});
  $('.close',dr).addEventListener('click',closeArt); $('.scrim',dr).addEventListener('click',closeArt);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeArt()});

  setLang(/^ko/i.test(navigator.language||'')?'ko':'en');
  finding('playground'); trigMode('click');
})();
