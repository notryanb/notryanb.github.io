"use strict";

$().ready(function(){ 

  var innerColors = ["#993D4E",
                     "#99513D",
                     "#99643D",
                     "#99913D",
                     "#74993D",
                     "#3D9952",
                     "#3D9987",
                     "#3D7999",
                     "#595099",
                     "#944699"];

  var borderColors = ["#CC052A",
                      "#CC3007",
                      "#CC5A05",
                      "#CCBA00",
                      "#7FCC0D",
                      "#07CC35",
                      "#08CCA7",
                      "#0C89CC",
                      "#3B25CC",
                      "#C118CC"];

   $('.key').each(function(i, k){
    // k.body.style.background = borderColors[i%10];
    $(k).css('background', borderColors[i%10]);
    $(k).css('border-color', innerColors[i%10]);
   });

    // ------- UI --------
    $(".wave").click(function(e){
      var $this = $(this);
      var newWave = $this.data('wave');

      if ($this.hasClass('osc1')) { 
        waveForm.osc1Wave = newWave; }
      if ($this.hasClass('osc2')) { 
        waveForm.osc2Wave = newWave; }
    });

    $('#lfo1-btn').click(function(){
        if (!waveForm.lfo1Switch) {
          waveForm.lfo1Switch = true;
          this.innerHTML = "LFO On";
        } else {
          waveForm.lfo1Switch = false;
          this.innerHTML = "LFO Off";
        }
      });

    $('#lfo2-btn').click(function(){
        if (!waveForm.lfo2Switch) {
          waveForm.lfo2Switch = true;
          this.innerHTML = "LFO On";
        } else {
          waveForm.lfo2Switch = false;
          this.innerHTML = "LFO Off";
        }
      });

});


// Defaults values
var waveForm = {
  "osc1Wave": "sin",
  "osc2Wave": "sin",
  "lfo1Switch": false,
  "lfo2Switch": false
}


// --- Helper Functions to buffer FX -----
var fx = function (opts) {
  if (waveForm.lfo1Switch) { return lfoModule(opts);  }
  else if (waveForm.lfo2Switch) { return lfoModule(opts);  }
  else { return opts.freq; } 
};

var glideModule = function (opts) {
  var glide = T("param", {value:opts})
};

var lfoModule = function(opts) {
    var lfo = T("sin", {freq: "200ms", mul:5, add:opts.freq}).kr();
    return lfo;
};

// --------Define Synthesizer----------
var synth = T("SynthDef").play();

synth.def = function(opts) {
  var osc1, osc2, env;
  
  osc1 = T(waveForm.osc1Wave, {freq: fx(opts), mul:0.5});
  osc2 = T(waveForm.osc2Wave, {freq: fx(opts), mul:0.5});
  env  = T("linen", {a: 260, d: 40,s:40, r:1050, lv:1}, osc1, osc2);
  return env.on("ended", opts.doneAction).bang();
};

// ----- Key Controller ------------
var keydict = T("ndict.key");
var midicps = T("midicps");
T("keyboard").on("keydown", function(e) {
  var midi = keydict.at(e.keyCode);
  if (midi) {
    boxSelect(midi);
    synth.noteOn(midi, 50);
  }
}).on("keyup", function(e) {
  var midi = keydict.at(e.keyCode);
  if (midi) {
    boxUnselect(midi);
  }
}).start();


function boxSelect(midi) {
  $('#_'+midi).css('opacity', '0.5');
};

function boxUnselect(midi) {
   $('#_'+midi).css('opacity', '1.0');
};

