/**
 *  loundess.js
 *  Loudness module for the Web Audio Evaluation Toolbox
 *  Allows for automatic calculation of loudness of Web Audio API Buffer objects,
 * 	return gain values to correct for a target loudness or match loudness between
 *  multiple objects
 */
/* globals webkitOfflineAudioContext, navigator, audioContext, Float32Array */
var interval_cal_loudness_event = null;

if (typeof OfflineAudioContext == "undefined") {
    var OfflineAudioContext = webkitOfflineAudioContext;
}

function calculateLoudness(buffer, timescale, target, offlineContext) {
    // This function returns the EBU R 128 specification loudness model and sets the linear gain required to match -23 LUFS
    // buffer -> Web Audio API Buffer object
    // timescale -> M or Momentary (returns Array), S or Short (returns Array),
    //   I or Integrated (default, returns number)
    // target -> default is -23 LUFS but can be any LUFS measurement.
    if (navigator.platform == 'iPad' || navigator.platform == 'iPhone') {
        buffer.ready();
    }
    if (buffer === undefined) {
        return 0;
    }
    if (timescale === undefined) {
        timescale = "I";
    }
    if (target === undefined) {
        target = -23;
    }
    if (offlineContext === undefined) {
        offlineContext = new OfflineAudioContext(audioContext.destination.channelCount, Math.max(0.4, buffer.buffer.duration) * audioContext.sampleRate, audioContext.sampleRate);
    }
    // Create the required filters
    var KFilter = offlineContext.createBiquadFilter();
    KFilter.type = "highshelf";
    KFilter.gain.value = 4;
    KFilter.frequency.value = 1500;

    var HPFilter = offlineContext.createBiquadFilter();
    HPFilter.type = "highpass";
    HPFilter.Q.value = 0.5;
    HPFilter.frequency.value = 38;
    // copy Data into the process buffer
    var processSource = offlineContext.createBufferSource();
    processSource.buffer = buffer.buffer;

    processSource.connect(KFilter);
    KFilter.connect(HPFilter);
    HPFilter.connect(offlineContext.destination);
    offlineContext.oncomplete = function (renderedBuffer) {
        // Have the renderedBuffer information, now continue processing
        if (typeof renderedBuffer.renderedBuffer == 'object') {
            renderedBuffer = renderedBuffer.renderedBuffer;
        }
        switch (timescale) {
            case "I":
                // Calculate the Mean Squared of a signal
                var MS = calculateMeanSquared(renderedBuffer, 0.4, 0.75);
                // Calculate the Loudness of each block
                var MSL = calculateLoudnessFromBlocks(MS);
                // Get blocks from Absolute Gate
                var LK = loudnessGate(MSL, MS, -70);
                // Calculate Loudness
                var LK_gate = loudnessOfBlocks(LK);
                // Get blocks from Relative Gate
                var RK = loudnessGate(MSL, MS, LK_gate - 10);
                var RK_gate = loudnessOfBlocks(RK);
                buffer.buffer.lufs = RK_gate;
        }
        buffer.ready();
    };
    processSource.start(0);
    offlineContext.startRendering();
}

function calculateMeanSquared(buffer, frame_dur, frame_overlap) {
    var frame_size = Math.floor(buffer.sampleRate * frame_dur);
    var step_size = Math.floor(frame_size * (1.0 - frame_overlap));
    var num_frames = Math.floor((buffer.length - frame_size) / step_size);
    num_frames = Math.max(num_frames, 1);

    var MS = Array(buffer.numberOfChannels);
    for (var c = 0; c < buffer.numberOfChannels; c++) {
        MS[c] = new Float32Array(num_frames);
        var data = buffer.getChannelData(c);
        for (var no = 0; no < num_frames; no++) {
            MS[c][no] = 0.0;
            for (var ptr = 0; ptr < frame_size; ptr++) {
                var i = no * step_size + ptr;
                if (i >= buffer.length) {
                    break;
                }
                var sample = data[i];
                MS[c][no] += sample * sample;
            }
            MS[c][no] /= frame_size;
        }
    }
    return MS;
}

function calculateLoudnessFromBlocks(blocks) {
    var num_frames = blocks[0].length;
    var num_channels = blocks.length;
    var MSL = Array(num_frames);
    for (var n = 0; n < num_frames; n++) {
        var sum = 0;
        for (var c = 0; c < num_channels; c++) {
            var G = 1.0;
            if (G >= 3) {
                G = 1.41;
            }
            sum += blocks[c][n] * G;
        }
        MSL[n] = -0.691 + 10 * Math.log10(sum);
    }
    return MSL;
}

function loudnessGate(blocks, source, threshold) {
    var num_frames = source[0].length;
    var num_channels = source.length;
    var LK = Array(num_channels);
    var n, c;
    for (c = 0; c < num_channels; c++) {
        LK[c] = [];
    }

    for (n = 0; n < num_frames; n++) {
        if (blocks[n] > threshold) {
            for (c = 0; c < num_channels; c++) {
                LK[c].push(source[c][n]);
            }
        }
    }
    return LK;
}

function loudnessOfBlocks(blocks) {
    var num_frames = blocks[0].length;
    var num_channels = blocks.length;
    var loudness = 0.0;
    for (var n = 0; n < num_frames; n++) {
        var sum = 0;
        for (var c = 0; c < num_channels; c++) {
            var G = 1.0;
            if (G >= 3) {
                G = 1.41;
            }
            sum += blocks[c][n] * G;
        }
        sum /= num_frames;
        loudness += sum;
    }
    loudness = -0.691 + 10 * Math.log10(loudness);
    return loudness;
}
