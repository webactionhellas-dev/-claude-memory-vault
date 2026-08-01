# Surgical patch of Downloads\Epos-Burger.html:
#  - swap the 7-layer scroll-decomposition burger for ONE intact exploded PNG
#  - replace decomposition CSS/JS with a premium floating system
#  - drop the now-unused GSAP CDN scripts
# File is CRLF; we normalise to LF for editing then restore CRLF on write.
import base64, re, sys

HTML = r"C:\Users\mikef\Downloads\Epos-Burger.html"
WEBP = r"C:\Users\mikef\Downloads\epos-exploded.webp"

raw = open(HTML, "rb").read().decode("utf-8")
assert raw.count("\n") == raw.count("\r\n"), "expected pure CRLF file"
text = raw.replace("\r\n", "\n")

b64 = base64.b64encode(open(WEBP, "rb").read()).decode("ascii")
data_uri = "data:image/webp;base64," + b64

def sub_once(pattern, repl, s, flags=0, label=""):
    s2, n = re.subn(pattern, lambda m: repl, s, count=1, flags=flags)
    assert n == 1, "FAILED (%d matches): %s" % (n, label)
    print("ok:", label)
    return s2

def lit(old, new, s, label=""):
    assert s.count(old) == 1, "FAILED (%d matches): %s" % (s.count(old), label)
    print("ok:", label)
    return s.replace(old, new, 1)

# ---- 1. markup: burger-stack(7x blayer) -> single floating image ----
new_markup = (
    '<div class="burger-float" id="burgerFloat">\n'
    '          <img class="bfloat-img" width="765" height="1484" decoding="async"\n'
    '               alt="The Epos burger with every layer floating apart: toasted brioche crown, sweet onions, ketchup and mustard, pickles, melted cheese and two smashed beef patties above the seared base bun"\n'
    '               src="' + data_uri + '" />\n'
    '        </div>'
)
text = sub_once(r'<div class="burger-stack"[^>]*>[\s\S]*?</div>',
                new_markup, text, label="markup swap")

# ---- 2. drop the wrapper's reveal (the float JS owns the entrance) ----
text = lit('<div class="story-visual reveal" data-d="2">',
           '<div class="story-visual" data-d="2">', text, label="story-visual reveal off")

# ---- 3. CSS: decomposition layers -> floating image ----
old_css = (
    "/* scroll-decomposed burger: 7 stacked transparent layers, GSAP-driven */\n"
    ".burger-stack{position:relative;width:min(46vw,340px);max-width:84%;aspect-ratio:668/851}\n"
    ".blayer{position:absolute;top:0;left:0;width:100%;height:auto;\n"
    "  will-change:transform,filter;transform:translateZ(0);\n"
    "  filter:drop-shadow(0 8px 12px rgba(70,52,58,.12))}"
)
new_css = (
    "/* premium floating burger — ONE intact exploded PNG, moved only as a rigid unit */\n"
    ".burger-float{position:relative;display:flex;align-items:center;justify-content:center;\n"
    "  width:100%;will-change:transform;transform:translateZ(0)}\n"
    ".bfloat-img{width:auto;height:auto;max-width:100%;max-height:min(70vh,640px);\n"
    "  object-fit:contain;backface-visibility:hidden;will-change:transform,opacity;\n"
    "  filter:drop-shadow(0 40px 60px rgba(70,52,58,.25)) drop-shadow(0 80px 120px rgba(70,52,58,.15))}"
)
text = lit(old_css, new_css, text, label="css swap")

# ---- 4. responsive max-height (tablet + mobile) ----
text = lit("  .fly-wrap{width:min(78vw,420px)}\n",
           "  .fly-wrap{width:min(78vw,420px)}\n  .bfloat-img{max-height:min(56vh,520px)}\n",
           text, label="css tablet")
text = lit("  .pic{height:210px}\n}",
           "  .pic{height:210px}\n  .bfloat-img{max-height:46vh;max-width:66vw}\n}",
           text, label="css mobile")

# ---- 5. remove the two GSAP CDN scripts ----
text = lit(
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>\n'
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>\n',
    '', text, label="drop gsap cdn")

# ---- 6. JS: decomposition IIFE -> floating system ----
new_js = '''<script>
/* Premium floating burger. The asset is ONE intact exploded PNG, so it moves
   only as a single rigid unit — never per-ingredient. One composited transform
   (translate3d + scale) + opacity on one node, recomputed in a single rAF, so
   it holds 60fps with no layout/repaint thrash.
     entrance : fade + rise(40->0) + scale(.95->1), 1.2s ease-out, once on view
     idle     : slow Y bob (~10s round trip) so it hangs in the air
     parallax : whole image drifts <=8px toward the cursor (desktop only)
     scroll   : subtle scale 1->1.05 and lift 0->-30px across the story
   Honors prefers-reduced-motion: shown static with just its soft shadow. */
(function(){
  var node = document.getElementById("burgerFloat");
  if(!node) return;
  if(window.matchMedia("(prefers-reduced-motion:reduce)").matches){ node.style.opacity=1; return; }
  node.style.opacity = 0;                       // set before first paint -> no flash

  var enter=0, bobY=0, scrY=0, scl=1, mx=0, my=0, tmx=0, tmy=0;
  var isMobile = window.matchMedia("(max-width:700px)").matches;

  function render(){
    var ty = (1-enter)*40 + bobY + scrY + my;   // entrance rise + bob + scroll + parallax
    var s  = (0.95 + 0.05*enter) * scl;          // entrance scale * scroll scale
    node.style.opacity = enter.toFixed(3);
    node.style.transform = "translate3d("+mx.toFixed(2)+"px,"+ty.toFixed(2)+"px,0) scale("+s.toFixed(4)+")";
  }
  function loop(ts){
    bobY = Math.sin(ts/1600) * (isMobile?7:12);  // ~10s round trip, -12..12px
    mx += (tmx-mx)*0.06; my += (tmy-my)*0.06;     // ease toward cursor target
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // entrance — fires once the burger scrolls into view
  function easeOutCubic(t){ return 1-Math.pow(1-t,3); }
  var t0=null, started=false;
  function entranceFrame(ts){
    if(t0===null) t0=ts;
    enter = easeOutCubic(Math.min(1,(ts-t0)/1200));
    if(enter<1) requestAnimationFrame(entranceFrame);
  }
  new IntersectionObserver(function(es,obs){
    es.forEach(function(e){ if(e.isIntersecting && !started){ started=true; requestAnimationFrame(entranceFrame); obs.disconnect(); }});
  },{threshold:0.2}).observe(node);

  // mouse parallax — whole burger together, capped at 8px
  if(!isMobile){
    window.addEventListener("mousemove", function(ev){
      tmx = ((ev.clientX/window.innerWidth)*2-1)*8;
      tmy = ((ev.clientY/window.innerHeight)*2-1)*8;
    }, {passive:true});
  }

  // subtle scroll — scale 1->1.05, lift 0->-30px as the story crosses the viewport
  var story = document.getElementById("story");
  function onScroll(){
    var r=story.getBoundingClientRect(), vh=window.innerHeight||1;
    var p=1-(r.top+r.height/2)/vh; p=p<0?0:p>1?1:p;
    scl=1+0.05*p; scrY=-30*p;
  }
  window.addEventListener("scroll", onScroll, {passive:true});
  window.addEventListener("resize", onScroll);
  onScroll();
})();
</script>'''
text = sub_once(r'<script>\n/\* Scroll-driven burger decomposition\.[\s\S]*?</script>',
                new_js, text, label="js swap")

# sanity: every old token must be gone
for tok in ["burger-stack", "burgerStack", "blayer", "gsap", "ScrollTrigger", "decomposition"]:
    assert tok not in text, "leftover token: " + tok
print("clean: no decomposition/gsap tokens remain")

open(HTML, "wb").write(text.replace("\n", "\r\n").encode("utf-8"))
print("written; new size", len(text.replace("\n", "\r\n").encode("utf-8")), "bytes")
