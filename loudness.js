/**
 *  loundess.js
 *  Loudness module for the Web Audio Evaluation Toolbox
 *  Allows for automatic calculation of loudness of Web Audio API Buffer objects,
 * 	return gain values to correct for a target loudness or match loudness between
 *  multiple objects
 */

function getLoudness(buffer, result, timescale, offlineContext)
{
	// This function returns the EBU R 128 specification loudness model
	// buffer -> Web Audio API Buffer object
	// timescale -> M or Momentary (returns Array), S or Short (returns Array),
	//   I or Integrated (default, returns number)
	
	// Create the required filters
	if (buffer == undefined || result == undefined)
	{
		return 0;
	}
	if (timescale == undefined)
	{
		timescale = "I";
	}
	if (offlineContext == undefined)
	{
		offlineContext = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
	}
	var KFilter = offlineContext.createBiquadFilter();
	KFilter.type = "highshelf";
	KFilter.gain.value = 4;
	KFilter.frequency.value = 1480;
	
	var HPFilter = offlineContext.createBiquadFilter();
	HPFilter.type = "highpass";
	HPFilter.Q.value = 0.707;
	HPFilter.frequency.value = 60;
	// copy Data into the process buffer
	var processSource = offlineContext.createBufferSource();
	processSource.buffer = buffer;
	
	processSource.connect(KFilter);
	KFilter.connect(HPFilter);
	HPFilter.connect(offlineContext.destination);
	processSource.start();
	offlineContext.startRendering().then(function(renderedBuffer) {
		// Have the renderedBuffer information, now continue processing
		console.log(renderedBuffer);
		switch(timescale)
		{
		case "I":
			var blockEnergy = calculateProcessedLoudness(renderedBuffer, 400, 0.75);
			// Apply the absolute gate
			var loudness = calculateLoudnessFromChannelBlocks(blockEnergy);
			var absgatedEnergy = new Array(blockEnergy.length);
			for (var c=0; c<blockEnergy.length; c++)
			{
				absgatedEnergy[c] = [];
			}
			for (var i=0; i<loudness.length; i++)
			{
				if (loudness[i] >= -70)
				{
					for (var c=0; c<blockEnergy.length; c++)
					{
						absgatedEnergy[c].push(blockEnergy[c][i]);
					}
				}
			}
			var overallAbsLoudness = calculateOverallLoudnessFromChannelBlocks(absgatedEnergy);
			
			//applying the relative gate 8 dB down from overallAbsLoudness
			var relGateLevel = overallAbsLoudness - 8;
			var relgateEnergy = new Array(blockEnergy.length);
			for (var c=0; c<blockEnergy.length; c++)
			{
				relgateEnergy[c] = [];
			}
			for (var i=0; i<loudness.length; i++)
			{
				if (loudness[i] >= relGateLevel)
				{
					for (var c=0; c<blockEnergy.length; c++)
					{
						relgateEnergy[c].push(blockEnergy[c][i]);
					}
				}
			}
			var overallRelLoudness = calculateOverallLoudnessFromChannelBlocks(relgateEnergy);
			result[0] =  overallRelLoudness;
		}
	}).catch(function(err) {
		console.log(err);
		result[0] = 1;
	});
}

function calculateProcessedLoudness(buffer, winDur, overlap)
{
	// Buffer		Web Audio buffer node
	// winDur		Window Duration in milliseconds
	// overlap		Window overlap as normalised (0.5 = 50% overlap);
	if (buffer == undefined)
	{
		return 0;
	}
	if (winDur == undefined)
	{
		winDur = 400;
	}
	if (overlap == undefined)
	{
		overlap = 0.5;
	}
	var winSize = buffer.sampleRate*winDur/1000;
	var olapSize = overlap*winSize;
	var numberOfFrames = Math.floor(buffer.length/olapSize - winSize/olapSize + 1);
	var blockEnergy = new Array(buffer.numberOfChannels);
	for (var channel = 0; channel < buffer.numberOfChannels; channel++)
	{
		blockEnergy[channel] = new Float32Array(numberOfFrames);
		var data = buffer.getChannelData(channel);
		for (var i=0; i<numberOfFrames; i++)
		{
			var sigma = 0;
			for (var n=i*olapSize; n < i*olapSize+winSize; n++)
			{
				sigma += Math.pow(data[n],2);
			}
			blockEnergy[channel][i] = sigma/winSize;
		}
	}
	return blockEnergy;
}
function calculateLoudnessFromChannelBlocks(blockEnergy)
{
	// Loudness
	var loudness = new Float32Array(blockEnergy[0].length);
	for (var i=0; i<blockEnergy[0].length; i++)
	{
		var sigma = 0;
		for (var channel = 0; channel < blockEnergy.length; channel++)
		{
			var G = 1.0;
			if (channel >= 4) {G = 1.41;}
			sigma += blockEnergy[channel][i]*G;
		}
		loudness[i] = -0.691 + 10*Math.log10(sigma);
	}
	return loudness;
}
function calculateOverallLoudnessFromChannelBlocks(blockEnergy)
{
	// Loudness
	var summation = 0;
	for (var channel = 0; channel < blockEnergy.length; channel++)
	{
		var G = 1.0;
		if (channel >= 4) {G = 1.41;}
		var sigma = 0;
		for (var i=0; i<blockEnergy[0].length; i++)
		{
			blockEnergy[channel][i] *= G;
			sigma += blockEnergy[channel][i];
		}
		sigma /= blockEnergy.length;
		summation+= sigma;
	}
	return -0.691 + 10*Math.log10(summation);;
}
