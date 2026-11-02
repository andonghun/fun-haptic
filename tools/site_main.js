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
    document.title=l==='ko'?'Pixel Haptics — 브라우저에서 DualSense 진동':'Pixel Haptics — DualSense haptics in the browser';
    finding(cur); trigMode(curMode);
  }
  $('#langBtn').addEventListener('click',function(){setLang(document.documentElement.lang==='ko'?'en':'ko')});
  var L=function(en,ko){return document.documentElement.lang==='ko'?ko:en};

  /* ---- home: experience tabs drive the live preview ---- */
  var FIND={
    playground:['Footsteps vibrate on the side of the foot that lands. Dashes move across both hands. Hits vibrate harder for heavier weapons.','발이 닿는 쪽 손에 발소리 진동이 옵니다. 대시는 양손을 가로지르고, 무거운 무기일수록 타격 진동이 셉니다.'],
    weather:['Rain taps both hands, snow ticks lightly, wind moves from one hand to the other.','비는 양손을 톡톡 치고, 눈은 가볍게 닿고, 바람은 한쪽 손에서 다른 쪽으로 이동합니다.'],
    tray:['Each ball vibrates on the side it is on. Each coin taps where it lands.','공이 있는 쪽 손이 진동하고, 코인은 떨어진 자리에서 톡 칩니다.'],
    pistol:['A click in R2, a recoil kick, then the hit on the right.','R2 딸깍, 반동, 그리고 오른쪽에서 명중.'],
    rifle:['The trigger vibrates with each round until it overheats and locks.','과열돼 잠길 때까지 한 발마다 트리거가 떨립니다.'],
    bow:['Resistance increases as you pull, vibrates at full draw, and the string vibrates on release.','당길수록 저항이 커지고, 끝까지 당기면 떨리고, 놓으면 시위가 진동합니다.'],
    melee:['A short sweep before the hit, then a hit timed to the move.','타격 직전 짧은 휘두름, 그리고 동작에 맞춘 타격.'],
    gallery:['Flashes become hits, steady light becomes a hum, and the side follows the effect.','번쩍이면 탁, 계속 빛나면 웅웅, 좌우는 이펙트 위치를 따라갑니다.']
  };
  var NAMES={playground:['Playground','플레이그라운드'],weather:['Weather lab','날씨 실험실'],tray:['Treasure tray','보물 쟁반'],pistol:['Pistol','권총'],rifle:['Machine gun','기관총'],bow:['Bow','활'],melee:['Melee','근접 무기'],gallery:['Effect gallery','이펙트 갤러리']};
  var cur='playground';
  function finding(id){var f=FIND[id];$('[data-k=finding]').textContent=L(f[0],f[1]);$('[data-k=title]').textContent=L(NAMES[id][0],NAMES[id][1])}
  $$('.p-home .task').forEach(function(b){b.addEventListener('click',function(){
    cur=b.dataset.x; $$('.p-home .task').forEach(function(t){var on=t===b;t.classList.toggle('on',on);t.setAttribute('aria-selected',on)});
    var sw=$$('.p-home .swap'); sw.forEach(function(s){s.classList.add('fade')});
    setTimeout(function(){finding(cur);sw.forEach(function(s){s.classList.remove('fade')})},180);
    if(window.__pv) window.__pv.main(cur);
  })});

  /* ---- trigger modes: draw the resistance curve ---- */
  var MODES={click:['Resistance builds, then drops at the click. Used by the pistol.','저항이 올라가다 딸깍 하고 풀립니다. 권총에 씁니다.'],ramp:['Resistance increases with the pull. Used by the bow.','당길수록 저항이 커집니다. 활에 씁니다.'],buzz:['The trigger vibrates. Used by the machine gun.','트리거가 떨립니다. 기관총에 씁니다.'],wall:['A hard stop partway down. Used when the gun overheats.','중간에서 막힙니다. 총이 과열됐을 때 씁니다.']};
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
