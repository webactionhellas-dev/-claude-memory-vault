/* WebGL hero accent: glossy brand-colored orbs (Underdog teal/red/brown/cream),
   soft studio lighting + mouse parallax. No bloom (site loads three core only).
   Robust: no-ops on reduced-motion, missing THREE, or any error. */
(function(){
  var canvas=document.getElementById("hero-canvas");
  if(!canvas || !window.THREE) return;
  if(window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  try{
    var THREE=window.THREE;
    var scene=new THREE.Scene();
    var camera=new THREE.PerspectiveCamera(45,1,.1,100); camera.position.set(0,0,9);
    var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.setClearColor(0x000000,0);

    scene.add(new THREE.AmbientLight(0xffffff,.6));
    var key=new THREE.DirectionalLight(0xffffff,2.4); key.position.set(5,7,8); scene.add(key);
    var rim=new THREE.DirectionalLight(0x9be7de,1.3); rim.position.set(-7,-2,-5); scene.add(rim);
    var warm=new THREE.PointLight(0xffd9a0,.7,40); warm.position.set(-4,3,6); scene.add(warm);

    var group=new THREE.Group(); scene.add(group);
    group.position.set(window.innerWidth<820?0:1.9, window.innerWidth<820?1.2:0.5, 0);
    var defs=[
      {r:1.7,p:[0,0,0],c:0x117E74},
      {r:.9,p:[2.7,1.2,-1],c:0xB61A23},
      {r:.72,p:[-2.7,-1.1,.6],c:0xF2E9D8},
      {r:.58,p:[1.9,-1.9,1],c:0x6B4A2F},
      {r:.5,p:[-2.3,1.7,-.6],c:0x1AA192}
    ];
    var balls=[];
    defs.forEach(function(d){
      var m=new THREE.Mesh(new THREE.SphereGeometry(d.r,48,48),new THREE.MeshStandardMaterial({color:d.c,metalness:.2,roughness:.18}));
      m.position.set(d.p[0],d.p[1],d.p[2]);
      m.userData={phase:Math.random()*6.283,baseY:d.p[1]};
      group.add(m); balls.push(m);
    });

    var mx=0,my=0;
    window.addEventListener("mousemove",function(e){ mx=e.clientX/window.innerWidth-.5; my=e.clientY/window.innerHeight-.5; },{passive:true});
    function resize(){ var w=canvas.clientWidth||window.innerWidth,h=canvas.clientHeight||window.innerHeight; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); }
    resize(); window.addEventListener("resize",resize);

    var t=0;
    (function loop(){
      t+=.01;
      group.rotation.y=Math.sin(t*.3)*.4 + mx*.5;
      group.rotation.x=Math.cos(t*.22)*.14 - my*.3;
      balls.forEach(function(b){ b.position.y=b.userData.baseY+Math.sin(t*1.1+b.userData.phase)*.26; b.rotation.y+=.004; });
      renderer.render(scene,camera);
      requestAnimationFrame(loop);
    })();
  }catch(e){}
})();
