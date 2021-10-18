document.addEventListener("DOMContentLoaded", function (event) {

    //create audio context


    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    var globalGain = audioCtx.createGain();

    var button = document.getElementById("button");

    var babbling = 0;
    var babbler = null;

    button.addEventListener("click", function () {

        if (babbling == 0) {
            if (babbler == null) {
                var brown1 = makeBrownNoise();
                var brown2 = makeBrownNoise();

                var lpf1 = audioCtx.createBiquadFilter();
                lpf1.type = "lowpass";
                lpf1.frequency.value = 500;

                var lpf2 = audioCtx.createBiquadFilter();
                lpf2.type = "lowpass";
                lpf2.frequency.value = 20;

                var lpf2gain = audioCtx.createGain();
                lpf2gain.gain.value = 800;

                var constant = audioCtx.createConstantSource();
                constant.connect(lpf2gain.gain);
                constant.offset = 700;
                constant.start();

                var rhpf = audioCtx.createBiquadFilter();
                rhpf.type = "highpass";
                rhpf.Q.value = 1 / 0.03;
                rhpf.gain.value = 0.1;

                var rhpfgain = audioCtx.createGain();
                rhpfgain.gain.value = 0.1;

                brown1.connect(lpf1).connect(rhpf).connect(rhpfgain).connect(globalGain).connect(audioCtx.destination);
                brown2.connect(lpf2).connect(lpf2gain).connect(rhpf.frequency);

                babbler = rhpfgain;
                babbling = 1;
            }
            else {
                babbler.gain.linearRampToValueAtTime(0, audioCtx.currentTime);
                babbler.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
                babbling = 1;
            }
        }

        else if (babbling == 1) {
            babbler.gain.linearRampToValueAtTime(babbler.gain.value, audioCtx.currentTime); //set gain to 0
            babbler.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.01);
            babbling = 0;
        }

    });



    /////////////////////////////////////////////


    


    var pickupButton = document.getElementById("pickup");
    var hangupButton = document.getElementById("hangup");

    var dialTone = null; //keeping track of the dialTone node chain
    var ringer = null;
    var busyTone = null;
    var pickedUp = 0; //is the phone picked up or not
    var dialing = 0; //have you pressed digit buttons or not

    var number = []; 

    const numberToFreq = {
        '48': [1336, 941],  //0
        '49': [1209, 697], //1
        '50': [1336, 697],  //2
        '51': [1477, 697], //3
        '52': [1209, 770],  //4
        '53': [1336, 770],  //5
        '54': [1477, 770], //6
        '55': [1209, 852],  //7
        '56': [1336, 852], //8
        '57': [1477, 852],  //9
        '13': [1477, 941], //enter  
    };

    //when you pickup the phone... 
    pickupButton.addEventListener("click", function () {

        globalGain.gain.value = 1; 

        //only do pickup action if we're not dialing
        if (dialing == 0) {
            //if dial tone does not exist
            if (dialTone == null) {
                dialTone = makeDialTone(); //make a dial tone
                dialTone.gain.value = 1;  //set gain to 1
            }
            //or if dial tone exists and is not playing
            else if (dialTone.gain.value == 0) {
                dialTone.gain.value = 1; //set gain to 1
            }
            pickedUp = 1;

            if (ringer == null) {
                ringer = makeRing();
            }
            if (busyTone == null) {
                busyTone = makeBusyTone(); 
            }
        }
        

    });

    //when you hang up the phone....
    hangupButton.addEventListener("click", function () {

        //if dial tone exists
        if (dialTone != null) {
            //if dial tone is playing
            if (dialTone.gain.value == 1) {
                dialTone.gain.linearRampToValueAtTime(1, audioCtx.currentTime); //set gain to 0
                dialTone.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.01);
            }
            if (ringer.gain.value != 0) {
                ringer.gain.linearRampToValueAtTime(ringer.gain.value, audioCtx.currentTime); //set gain to 0
                ringer.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.01);
            }
            if (busyTone.gain.value != 0) {
                busyTone.gain.linearRampToValueAtTime(busyTone.gain.value, audioCtx.currentTime); //set gain to 0
                busyTone.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.01);
            }

        }

        pickedUp = 0;
        dialing = 0;

    });

    //when number keys/enter keys are pressed, dial those numbers 
    window.addEventListener('keydown', function (event) {

        const key = (event.detail || event.which).toString();
        if (pickedUp == 1) {
            if (numberToFreq[key]) {

                //if it's a digit
                if (key != '13') {
                    dialing = 1; 
                    dialTone.gain.linearRampToValueAtTime(1, audioCtx.currentTime); //set gain to 0
                    dialTone.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.01);
                    dialDigit(key); //dial that number
                    number.push(key);
                }
                //if it's the enter key
                else {
                    dialing = 1; 
                    dialTone.gain.linearRampToValueAtTime(1, audioCtx.currentTime); //set gain to 0
                    dialTone.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.01); 
                    dialDigit(key); //dial the enter key
                    setTimeout(function () {
                        dialNumber();
                    }, 400);
                    setTimeout(function () {
                        ringer.gain.linearRampToValueAtTime(0, audioCtx.currentTime); //set gain to 0
                        ringer.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
                    }, 600 + number.length*200); 
                    setTimeout(function () {
                        if (pickedUp == 1) {
                            ringer.gain.linearRampToValueAtTime(ringer.gain.value, audioCtx.currentTime); //set gain to 0
                            ringer.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.01);
                            busyTone.gain.linearRampToValueAtTime(0, audioCtx.currentTime); //set gain to 0
                            busyTone.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
                        }
                    }, 15000 + number.length*200);
                    
                }
            }
        }
    }, false);


    function dialNumber() {

        var numLength = number.length;
        var startTime = audioCtx.currentTime;
        var startTimes = [];
        for (var i = 0; i < numLength; i++) {
            startTimes[i] = startTime + (i * .220) + .220;
        }
        console.log(startTimes);
        for (var i = 0; i < numLength; i++) {
            var played = 0;
            while (audioCtx.currentTime < startTimes[i]) {
                if (played == 0) {
                    console.log("play" + number[i] + audioCtx.currentTime);
                    played = 1;
                    dialDigit(number[i]);
                }
                else {
                    ;
                }
            }
        }
        number = [];

    }

    //dial the digit pressed 
    function dialDigit(key) {

        const dialosc1 = audioCtx.createOscillator();
        const dialosc2 = audioCtx.createOscillator();
        dialosc1.frequency.value = numberToFreq[key][0];
        dialosc2.frequency.value = numberToFreq[key][1];

        const dialgain = audioCtx.createGain();
        dialgain.gain.value = 0;

        dialosc1.connect(dialgain);
        dialosc2.connect(dialgain);

        const dialhip = audioCtx.createBiquadFilter();
        dialhip.type = "highpass";
        dialhip.frequency.value = 100;

        dialgain.connect(dialhip);

        const dialout = audioCtx.createGain();
        dialout.gain.value = 0.5;

        dialhip.connect(dialout).connect(globalGain).connect(audioCtx.destination);

        dialosc1.start();
        dialosc2.start();

        dialgain.gain.linearRampToValueAtTime(0, audioCtx.currentTime); //set gain to 0
        dialgain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.01);
        dialgain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.25);
        setTimeout(function () {
            delete dialosc1;
            delete dialosc2;
            delete dialgain;
            delete dialhip;
            delete dialout;
            console.log("key deleted");
        }, 1000);
 
    }

 


    //create dial tone, return the important gain node    
    function makeDialTone() {

        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const oscgain = audioCtx.createGain();

        osc1.frequency.value = 350;
        osc2.frequency.value = 440;

        osc1.start();
        osc2.start();

        osc1.connect(oscgain);
        osc2.connect(oscgain);

        oscgain.gain.value = 0;

        const tline1 = tline();

        oscgain.connect(tline1);

        return oscgain;

    }


    //create telephone line, return important node
    function tline() {

        //first clip   
        const clip1 = new WaveShaperNode(audioCtx);
        var curve1 = new Float32Array(2);
        curve1[0] = -0.9;
        curve1[1] = 0.9;
        clip1.curve = curve1;

        //first bandpass 
        const bp1 = audioCtx.createBiquadFilter();
        bp1.type = "bandpass";
        bp1.frequency.value = 1200;
        bp1.Q.value = 12;

        clip1.connect(bp1);

        //second bandpass 
        const bp2gain = audioCtx.createGain();
        bp2gain.gain.value = 0.5;
        const bp2 = audioCtx.createBiquadFilter();
        bp2.type = "bandpass";
        bp2.frequency.value = 400;
        bp2.Q.value = 3;

        bp1.connect(bp2gain).connect(bp2);

        //second clip
        const clip2 = new WaveShaperNode(audioCtx);
        var curve2 = new Float32Array(2);
        curve2[0] = -0.4;
        curve2[1] = 0.4;
        clip2.curve = curve2;
        const clip2gain = audioCtx.createGain();
        clip2gain.gain.value = 0.15;

        bp1.connect(clip2).connect(clip2gain);

        //first hipass  
        const hi1 = audioCtx.createBiquadFilter();
        hi1.type = "highpass";
        hi1.frequency.value = 90;

        bp2.connect(hi1);
        clip2gain.connect(hi1);

        //second hipass
        const hi2 = audioCtx.createBiquadFilter();
        hi2.type = "highpass";
        hi2.frequency.value = 90;

        //final amplification

        const hiamp = audioCtx.createGain();
        hiamp.gain.value = 5;

        hi1.connect(hi2).connect(hiamp).connect(globalGain).connect(audioCtx.destination);

        return clip1; 

    }


    

    ///////////////////////////////

    ///////////////////////////////

    //RINGING TONE

    function makeRing() {

        const osc3 = audioCtx.createOscillator();
        const osc4 = audioCtx.createOscillator();

        osc3.frequency.value = 480;
        osc4.frequency.value = 440;

        const oscgain2 = audioCtx.createGain();
        oscgain2.gain.value = 0;

        const lop = audioCtx.createBiquadFilter();
        lop.type = "lowpass";
        lop.frequency.value = 100;

        lop.connect(oscgain2.gain);

        osc3.connect(oscgain2);
        osc4.connect(oscgain2);

        //on off gain 
        const ringOnOff = audioCtx.createGain();
        ringOnOff.gain.value = 0;

        oscgain2.connect(ringOnOff);

        const tline2 = tline();
        ringOnOff.connect(tline2).connect(globalGain).connect(audioCtx.destination);

        osc3.start();
        osc4.start();

        const fullsig = makeFullSignal();

        fullsig.connect(lop);

        ringOnOff.gain.value = 0;

        return ringOnOff;

    }



    //////////////////////////////
    //////////////////////////////

    //BUSY TONE

    function makeBusyTone() {
        const busyosc1 = audioCtx.createOscillator();
        const busyosc2 = audioCtx.createOscillator();
        busyosc1.frequency.value = 480;
        busyosc2.frequency.value = 620;

        const busyosc3 = audioCtx.createOscillator();
        busyosc3.frequency.value = 2;
        const busyosc3gain = audioCtx.createGain();
        busyosc3gain.gain.value = 10000;

        busyosc3.connect(busyosc3gain);

        const busyclip = new WaveShaperNode(audioCtx);
        var busycurve = new Float32Array(2);
        busycurve[0] = 0;
        busycurve[1] = 1;
        busyclip.curve = busycurve;

        busyosc3gain.connect(busyclip);

        const busylop = audioCtx.createBiquadFilter();
        busylop.type = "lowpass";
        busylop.frequency.value = 100;

        busyclip.connect(busylop);

        const osclopgain = audioCtx.createGain();
        osclopgain.gain.value = 0;
        busylop.connect(osclopgain.gain);
        busyosc1.connect(osclopgain);
        busyosc2.connect(osclopgain);

        const busygain = audioCtx.createGain();
        busygain.gain.value = 0.1;
        osclopgain.connect(busygain).connect(globalGain).connect(audioCtx.destination);
        busyosc1.start();
        busyosc2.start();
        busyosc3.start();

        busygain.gain.value = 0;
        return busygain;
    }


    //signal buffer for ringing tone
    function makeFullSignal() {
        var bufferSize = 6 * audioCtx.sampleRate,
            noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate),
            output = noiseBuffer.getChannelData(0);

        for (var i = 0; i < bufferSize / 2; i++) {
            output[i] = 1;
        }
        for (var i = bufferSize / 2; i < bufferSize; i++) {
            output[i] = null;
        }

        fullSig = audioCtx.createBufferSource();
        fullSig.buffer = noiseBuffer;
        fullSig.loop = true;

        fullSig.start(0);

        return fullSig;

    }


        //lowpass in: brown noise, freq is 14

        //resonant highpass: in, freq, rq (bandwidth/cutoffFreq? reciprocal of q),mult)

        //in: lowpass(brown noise, freq=400)
        //freq: lowpass(brown noise, freq=14)*400 + 500
        //rq: 0.03
        //multiplier: 0.1


    //{RHPF.ar(LPF.ar(BrownNoise.ar(), 400), LPF.ar(BrownNoise.ar(), 14) * 400 + 500, 0.03, 0.1)}.play


        //biquadfilter
        //.frequency

        //lowpass: BiquadFilterNode
        //.type = "lowpass"
        //.frequency = frequency 


        //highpass: BiquadFilterNode
        //.type = "highpass"
        //.frequency = frequency
        //.Q = q

    //lowpass for RHPF input  
   
   


    function makeBrownNoise() {
        var bufferSize = 10 * audioCtx.sampleRate,
            noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate),
            output = noiseBuffer.getChannelData(0);

        var lastOut = 0;
        for (var i = 0; i < bufferSize; i++) {
            var brown = Math.random() * 2 - 1;

            output[i] = (lastOut + (0.02 * brown)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
        }

        brownNoise = audioCtx.createBufferSource();
        brownNoise.buffer = noiseBuffer;
        brownNoise.loop = true;
        brownNoise.start(0);

        return brownNoise;
    }
    

}); 
