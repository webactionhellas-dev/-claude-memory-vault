(function(){
  var D=document, W=window;
  var reduce=W.matchMedia("(prefers-reduced-motion:reduce)").matches;
  var hasGsap=!!(W.gsap && W.ScrollTrigger);
  var FLAT=location.search.indexOf("flat")>-1; // capture/verify mode: no preloader/pin, reveals shown
  D.documentElement.classList.remove("no-js");

  /* ---------- language ---------- */
  var LANGKEY="underdog-lang", langBtn=D.getElementById("lang"), heroLines=[];
  D.querySelectorAll(".hl").forEach(function(el){
    heroLines.push({el:el, el_txt:el.textContent.trim(), en_txt:(el.getAttribute("data-en")||el.textContent).trim()});
  });
  function splitWords(el){
    var words=el.textContent.trim().split(/\s+/); el.textContent="";
    var inners=[];
    words.forEach(function(w,i){
      var outer=D.createElement("span"); outer.className="word";
      var inner=D.createElement("span"); inner.textContent=w;
      outer.appendChild(inner); el.appendChild(outer);
      if(i<words.length-1) el.appendChild(D.createTextNode(" "));
      inners.push(inner);
    });
    return inners;
  }
  function heroApply(lang, animate){
    if(!heroLines.length) return;
    heroLines.forEach(function(l){ l.el.textContent = lang==="en"? l.en_txt : l.el_txt; });
    if(hasGsap && !reduce){
      var all=[]; heroLines.forEach(function(l){ all=all.concat(splitWords(l.el)); });
      W.gsap.set(all,{yPercent:animate?118:0});
      if(animate) W.gsap.to(all,{yPercent:0,duration:1.05,ease:"power4.out",stagger:.05,delay:.05});
    }
  }
  function applyLang(lang){
    D.documentElement.lang=lang;
    D.querySelectorAll("[data-en]").forEach(function(el){
      if(el.classList.contains("hl")) return;
      if(el.dataset.el===undefined) el.dataset.el=el.innerHTML;
      el.innerHTML = lang==="en"? el.getAttribute("data-en") : el.dataset.el;
    });
    if(langBtn) langBtn.innerHTML = lang==="en" ? "<b>EN</b> / EL" : "<b>EL</b> / EN";
  }
  var curLang=(function(){try{return localStorage.getItem(LANGKEY)||"el"}catch(e){return "el"}})();
  applyLang(curLang);
  if(langBtn) langBtn.addEventListener("click",function(){
    curLang=curLang==="en"?"el":"en";
    try{localStorage.setItem(LANGKEY,curLang)}catch(e){}
    applyLang(curLang); heroApply(curLang,true);
  });

  /* custom cursor removed per feedback (it parked at 0,0 before first mousemove and read as a gimmick) */

  var hdr=D.getElementById("hdr");
  function headerState(){
    if(!hdr) return;
    var hero=D.querySelector(".hero,.phero");
    var th=hero? hero.offsetHeight-80 : 120;
    (W.scrollY>th)? hdr.classList.add("solid") : hdr.classList.remove("solid");
  }

  function runPre(done){
    var pre=D.getElementById("pre");
    if(!pre || reduce || !hasGsap || FLAT){ if(pre) pre.style.display="none"; done(); return; }
    var g=W.gsap, num={v:0};
    g.timeline()
      .to("#pre .pl-brand span",{yPercent:0,duration:.7,ease:"power3.out",stagger:.05})
      .to("#pre .pl-bar i",{width:"100%",duration:1,ease:"power1.inOut"},"-=.3")
      .to(num,{v:100,duration:1,ease:"power1.inOut",onUpdate:function(){var n=D.querySelector("#pre .pl-num");if(n)n.textContent=Math.round(num.v)+"%";}},"<")
      .to("#pre",{yPercent:-100,duration:.9,ease:"power4.inOut",delay:.15,onComplete:function(){pre.style.display="none";done();}});
  }

  setTimeout(function(){D.body.classList.add("ready")},2800); // hard safety

  function start(){
    D.body.classList.add("ready");
    heroApply(curLang,!FLAT);
    headerState();
    if(!hasGsap || reduce){ W.addEventListener("scroll",headerState,{passive:true}); return; }
    var g=W.gsap, ST=W.ScrollTrigger; g.registerPlugin(ST);
    if(FLAT) D.body.classList.add("flat");

    if(W.Lenis){
      var lenis=new W.Lenis({lerp:.1,smoothWheel:true}); W.__lenis=lenis;
      lenis.on("scroll",function(){ST.update();headerState();});
      g.ticker.add(function(t){lenis.raf(t*1000)}); g.ticker.lagSmoothing(0);
    } else { W.addEventListener("scroll",headerState,{passive:true}); }

    g.utils.toArray(".hero .reveal").forEach(function(el,i){
      el.style.opacity=1; g.from(el,{opacity:0,y:24,duration:.9,ease:"power3.out",delay:.45+i*.12});
    });
    g.fromTo(".hero-bg img",{scale:1.18},{scale:1.06,duration:2.4,ease:"power2.out"});
    g.to(".hero-bg img",{yPercent:12,ease:"none",scrollTrigger:{trigger:".hero",start:"top top",end:"bottom top",scrub:true}});

    if(FLAT){ g.set(".reveal",{opacity:1,y:0}); }
    else g.utils.toArray(".reveal").forEach(function(el){
      if(el.closest(".hero")) return;
      g.fromTo(el,{opacity:0,y:34},{opacity:1,y:0,duration:.95,ease:"power3.out",scrollTrigger:{trigger:el,start:"top 88%",once:true}});
    });
    g.utils.toArray(".parallax").forEach(function(img){
      g.fromTo(img,{yPercent:-7},{yPercent:7,ease:"none",scrollTrigger:{trigger:img,start:"top bottom",end:"bottom top",scrub:true}});
    });
    var mq=D.getElementById("mq"); if(mq) g.to(mq,{xPercent:-50,duration:26,ease:"none",repeat:-1});

    g.utils.toArray(".stat .n").forEach(function(n){
      var to=parseFloat(n.getAttribute("data-count")); if(isNaN(to)) return;
      var suf=n.getAttribute("data-suffix")||"", o={v:0};
      g.to(o,{v:to,duration:1.7,ease:"power2.out",scrollTrigger:{trigger:n,start:"top 92%",once:true},
        onUpdate:function(){ n.textContent=(to>=1000? Math.round(o.v).toLocaleString("el-GR") : Math.round(o.v))+suf; }});
    });

    var track=D.getElementById("htrack");
    if(track && !FLAT){
      var vp=track.parentElement;
      var amt=function(){return Math.max(0, track.scrollWidth - vp.clientWidth);};
      g.to(track,{x:function(){return -amt();},ease:"none",
        scrollTrigger:{trigger:".hgal",start:"top top",end:function(){return "+="+amt();},scrub:.6,pin:true,anticipatePin:1,invalidateOnRefresh:true}});
    }

    /* magnetic buttons removed per feedback */

    var path=(location.pathname.split("/").pop()||"index.html");
    D.querySelectorAll(".nav-links a").forEach(function(a){
      var href=a.getAttribute("href")||""; if(path!=="index.html" && href.indexOf(path)!==-1) a.classList.add("active");
    });

    ST.refresh();
  }

  if(D.readyState==="complete") runPre(start);
  else W.addEventListener("load",function(){runPre(start)});
})();
