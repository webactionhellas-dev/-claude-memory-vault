# Swap the single floating burger for a 6-layer decompose-on-scroll burger.
# Keeps container entrance/bob/parallax; layers tuck together at p=0 (assembled)
# and return to the source spread at p=1 (exploded). CRLF preserved.
import json, re

HTML = r"C:\Users\mikef\Downloads\Epos-Burger.html"
data = json.load(open(r"C:\Users\mikef\Downloads\layers.json"))
collapse, b64, names = data["collapse"], data["b64"], data["names"]

raw = open(HTML, "rb").read().decode("utf-8")
assert raw.count("\n") == raw.count("\r\n"), "expected pure CRLF"
text = raw.replace("\r\n", "\n")

def sub_once(pat, repl, s, flags=0, label=""):
    s2, n = re.subn(pat, lambda m: repl, s, count=1, flags=flags)
    assert n == 1, "FAILED (%d): %s" % (n, label); print("ok:", label); return s2
def lit(old, new, s, label=""):
    assert s.count(old) == 1, "FAILED (%d): %s" % (s.count(old), label); print("ok:", label); return s.replace(old, new, 1)

# ---- 1. markup: single img -> 6 layered imgs in a .bstage box ----
ALABEL = ("The Epos burger decomposing into its layers: brioche crown, sweet onions and "
          "house ketchup and mustard, pickles, melted cheese and two smashed beef patties "
          "above a toasted base bun")
imgs = "\n".join(
    '          <img class="blayer2" data-i="%d" alt="" aria-hidden="true" decoding="async" src="data:image/webp;base64,%s">'
    % (i, b64[i]) for i in range(len(b64)))
new_markup = (
    '<div class="burger-float" id="burgerFloat">\n'
    '        <div class="bstage" role="img" aria-label="' + ALABEL + '">\n'
    + imgs + '\n'
    '        </div>\n'
    '      </div>'
)
text = sub_once(r'<div class="burger-float" id="burgerFloat">[\s\S]*?</div>',
                new_markup, text, label="markup -> 6 layers")

# ---- 2. CSS ----
old_css = (
    "/* premium floating burger — ONE intact exploded PNG, moved only as a rigid unit */\n"
    ".burger-float{position:relative;display:flex;align-items:center;justify-content:center;\n"
    "  width:100%;will-change:transform;transform:translateZ(0)}\n"
    ".bfloat-img{width:auto;height:auto;max-width:100%;max-height:min(70vh,640px);\n"
    "  object-fit:contain;backface-visibility:hidden;will-change:transform,opacity;\n"
    "  filter:drop-shadow(0 40px 60px rgba(70,52,58,.25)) drop-shadow(0 80px 120px rgba(70,52,58,.15))}"
)
new_css = (
    "/* decomposing burger — 6 full-canvas layers stacked in one box (.bstage): the\n"
    "   first <img> sets the size (like the old single image) and the rest overlay it\n"
    "   pixel-aligned. A layer at translateY 0 reproduces the source's exploded spread,\n"
    "   so the JS only TUCKS them together at scroll progress 0 (assembled). Per-layer\n"
    "   drop-shadow (never on the whole burger) gives depth as they separate. */\n"
    ".burger-float{position:relative;display:flex;align-items:center;justify-content:center;\n"
    "  width:100%;will-change:transform;transform:translateZ(0)}\n"
    ".bstage{position:relative;max-width:100%}\n"
    ".blayer2{display:block;width:auto;height:auto;max-width:100%;max-height:min(70vh,640px);\n"
    "  object-fit:contain;backface-visibility:hidden;will-change:transform,opacity;\n"
    "  filter:drop-shadow(0 22px 34px rgba(70,52,58,.20))}\n"
    ".blayer2~.blayer2{position:absolute;top:0;left:0;width:100%;height:100%}"
)
text = lit(old_css, new_css, text, label="css swap")

# ---- 3. responsive: target the sizing layer ----
text = lit("  .bfloat-img{max-height:min(56vh,520px)}\n",
           "  .blayer2{max-height:min(56vh,520px)}\n", text, label="css tablet")
text = lit("  .bfloat-img{max-height:46vh;max-width:66vw}\n",
           "  .blayer2{max-height:46vh;max-width:66vw}\n", text, label="css mobile")

# ---- 4. JS: floating -> decomposition ----
new_js = '''<script>
/* Decomposing burger for #story. Six full-canvas layers share one box (.bstage):
   each layer's translateY 0 reproduces the source's exploded spread, so the JS
   only has to TUCK them together (COLLAPSE offsets) at scroll progress 0 and
   release them to 0 at progress 1 -> assembled, then exploded as you scroll past.
   The CONTAINER keeps the premium feel (entrance fade+rise+scale, idle bob, mouse
   parallax); the LAYERS do the decomposition. One rAF lerps a smoothed scrub (cp)
   toward the scroll target (tp) for buttery motion, and every layer is a single
   composited transform+opacity — no mask / clip-path / whole-burger filter — so it
   stays at 60fps. Honors prefers-reduced-motion (shown static and composed). */
(function(){
  var node = document.getElementById("burgerFloat"); if(!node) return;
  var L = [].slice.call(node.querySelectorAll(".blayer2")); if(!L.length) return;

  // per-layer tuning, index 0 = top bun .. 5 = bottom bun
  var COLLAPSE = __COLLAPSE__;                      // tuck offset (frac of height) at p=0
  var ROT  = [-4, 5, -7, 4, -5, 3];                 // playful rotation at p=1 (deg)
  var XR   = [0, 16, -20, 10, -12, 0];              // sideways drift at p=1 (px)
  var FADE = [0.04, 0.14, 0.16, 0.07, 0.07, 0.04];  // subtle opacity fade at p=1
  var ASSEMBLE = 1.0, EXTRA = 0.05, GROW = 0.02;    // composed tightness / burst / scale
  function sgn(v){ return v<0?-1:1; }

  function layers(p){                               // p: 0 composed -> 1 exploded
    var inv = 1-p;
    for(var i=0;i<L.length;i++){
      var ty = (COLLAPSE[i]*ASSEMBLE*inv - sgn(COLLAPSE[i])*EXTRA*p) * 100;
      L[i].style.transform = "translate3d("+(XR[i]*p).toFixed(2)+"px,"+ty.toFixed(3)+"%,0) rotate("+(ROT[i]*p).toFixed(2)+"deg) scale("+(1+GROW*p).toFixed(4)+")";
      L[i].style.opacity = (1-FADE[i]*p).toFixed(3);
    }
  }

  if(window.matchMedia("(prefers-reduced-motion:reduce)").matches){ node.style.opacity=1; layers(0); return; }
  node.style.opacity = 0;                           // set before first paint -> no flash

  var enter=0, bobY=0, mx=0, my=0, tmx=0, tmy=0, cp=0, tp=0;
  var isMobile = window.matchMedia("(max-width:700px)").matches;

  function loop(ts){
    bobY = Math.sin(ts/1600) * (isMobile?6:10);
    mx += (tmx-mx)*0.06; my += (tmy-my)*0.06;
    cp += (tp-cp)*0.12; if(Math.abs(tp-cp)<0.0006) cp=tp;   // smoothed scrub
    var ty = (1-enter)*40 + bobY + my, s = 0.95 + 0.05*enter;
    node.style.opacity = enter.toFixed(3);
    node.style.transform = "translate3d("+mx.toFixed(2)+"px,"+ty.toFixed(2)+"px,0) scale("+s.toFixed(4)+")";
    layers(cp);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // entrance — fires once the burger scrolls into view
  function easeOutCubic(t){ return 1-Math.pow(1-t,3); }
  var t0=null, started=false;
  function ef(ts){ if(t0===null)t0=ts; enter=easeOutCubic(Math.min(1,(ts-t0)/1200)); if(enter<1) requestAnimationFrame(ef); }
  new IntersectionObserver(function(es,ob){ es.forEach(function(e){ if(e.isIntersecting && !started){ started=true; requestAnimationFrame(ef); ob.disconnect(); }}); },{threshold:0.2}).observe(node);

  // mouse parallax — whole burger together, capped at 8px
  if(!isMobile) window.addEventListener("mousemove", function(ev){
    tmx = ((ev.clientX/window.innerWidth)*2-1)*8;
    tmy = ((ev.clientY/window.innerHeight)*2-1)*8;
  }, {passive:true});

  // scroll -> decomposition progress as the burger crosses the viewport.
  // composed (p=0) while it sits low, fully exploded (p=1) as it nears the top;
  // measured on the untransformed wrapper so bob/parallax never feed back.
  var A=0.85, B=0.30, host=node.parentElement;
  function onScroll(){
    var r=host.getBoundingClientRect(), vh=window.innerHeight||1;
    var f=(r.top + r.height*0.5)/vh;                // 1 = viewport bottom, 0 = top
    var p=(A - f)/(A - B);
    tp = p<0?0:p>1?1:p;
  }
  window.addEventListener("scroll", onScroll, {passive:true});
  window.addEventListener("resize", onScroll);
  onScroll();
})();
</script>'''
new_js = new_js.replace("__COLLAPSE__", "[" + ", ".join(str(c) for c in collapse) + "]")
text = sub_once(r'<script>\n/\* Premium floating burger\.[\s\S]*?</script>',
                new_js, text, label="js -> decomposition")

assert "bfloat-img" not in text and "Premium floating burger" not in text, "leftover"
print("clean")
open(HTML, "wb").write(text.replace("\n", "\r\n").encode("utf-8"))
print("written; collapse =", collapse)
