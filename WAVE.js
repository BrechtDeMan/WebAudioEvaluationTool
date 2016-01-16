// Decode and perform WAVE file byte level manipulation

find_subarray = function(arr,subarr) {
    var arr_length = arr.length;
    var subarr_length = subarr.length;
    var last_check_index = arr_length - subarr_length;
    
    positionLoop:
    for (var i=0; i <= last_check_index; i++)
    {
        for (var j=0; j< subarr_length; j++)
        {
            if (arr[i + j] !== subarr[j]) {
                continue positionLoop;
            }
        }
        return i;
    }
    return -1;
};

function WAVE()
{
    // The WAVE file object
    this.status == 'WAVE_DECLARED'
    
    this.decoded_data = null;
    
    this.RIFF = String(); //ChunkID
	this.size; //ChunkSize
	this.FT_Header; //Format
	this.fmt_marker; //Subchunk1ID
	this.formatDataLength; //Subchunk1Size
	this.type; //AudioFormat
	this.num_channels; //NumChannels
	this.sample_rate; //SampleRate
	this.byte_rate; //ByteRate
	this.block_align; //BlockAlign
	this.bits_per_sample; //BitsPerSample
	this.data_header; //Subchunk2ID
	this.data_size; //Subchunk2Size
    this.num_samples;
    
    this.open = function(IOArrayBuffer)
    {
        var IOView8 = new Uint8Array(IOArrayBuffer);
        IOView8.subarray(0,4).forEach(function(i){
            var char = String.fromCharCode(i);
            this.RIFF = this.RIFF.concat(char);
        },this);
        if (this.RIFF != 'RIFF')
        {
            console.log('WAVE ERR - Not a RIFF file');
            return 1;
        }
        this.size = 0;
        IOView8.subarray(4,8).forEach(function(i,a){this.size += Number(i)<<(8*a);},this);
        this.FT_Header = String();
        IOView8.subarray(8,12).forEach(function(i){this.FT_Header = this.FT_Header.concat(String.fromCharCode(i));},this);
        this.fmt_marker = String();
        IOView8.subarray(12,16).forEach(function(i){this.fmt_marker = this.fmt_marker.concat(String.fromCharCode(i));},this);
        this.formatDataLength = 0;
        IOView8.subarray(16,20).forEach(function(i,a){this.formatDataLength += Number(i)<<(8*a);},this);
        this.type = 0;
        IOView8.subarray(20,22).forEach(function(i,a){this.type += Number(i)<<(8*a);},this);
        this.num_channels = 0;
        IOView8.subarray(22,24).forEach(function(i,a){this.num_channels += Number(i)<<(8*a);},this);
        this.sample_rate = 0;
        IOView8.subarray(24,28).forEach(function(i,a){this.sample_rate += Number(i)<<(8*a);},this);
        this.byte_rate = 0;
        IOView8.subarray(28,32).forEach(function(i,a){this.byte_rate += Number(i)<<(8*a);},this);
        this.block_align = 0;
        IOView8.subarray(32,34).forEach(function(i,a){this.block_align += Number(i)<<(8*a);},this);
        this.bits_per_sample = 0;
        IOView8.subarray(34,36).forEach(function(i,a){this.bits_per_sample += Number(i)<<(8*a);},this);
        
        // Find the data header first
        var data_start = find_subarray(IOView8,[100, 97, 116, 97]);
        
        this.data_header = String();
        IOView8.subarray(data_start,data_start+4).forEach(function(i){this.data_header = this.data_header.concat(String.fromCharCode(i));},this);
        this.data_size = 0;
        IOView8.subarray(data_start+4,data_start+8).forEach(function(i,a){this.data_size += Number(i)<<(8*a);},this);
        
        this.num_samples = this.data_size / this.block_align;
        
        this.decoded_data = [];
        if (this.type != 1 && this.type != 3) {
            console.log("Neither PCM nor IEEE float, cannot decode");
            return 1;
        }
        for (var c=0; c<this.num_channels; c++)
        {
            this.decoded_data.push(new Float32Array(this.num_samples));
        }
        var sampleDataOffset = data_start+8;
        
        // Now need to decode the data from sampleDataOffset
        // Data is always interleved
        var data_view;
        if (this.type == 3)
        {
            // Already in float
            if (this.bits_per_sample == 32) {
                data_view = new Float32Array(IOArrayBuffer.slice(sampleDataOffset,sampleDataOffset+this.data_size));
            } else if (this.bits_per_sample == 64) {
                data_view = new Float64Array(IOArrayBuffer.slice(sampleDataOffset,sampleDataOffset+this.data_size));
            }
        } else if (this.type == 1)
        {
            data_view = new Float32Array(this.num_samples);
            integerConvert(new Uint8Array(IOArrayBuffer.slice(sampleDataOffset,sampleDataOffset+this.data_size)),data_view,this.bits_per_sample/8);
        }
        deInterlace(data_view,this.decoded_data);
        return 0;
    };
}

function deInterlace(src_array, dst_array)
{
    var number = src_array.length;
    var channels = dst_array.length;
    var channel_index = 0;
    var dst_index = 0;
    for (var n=0; n<number; n++)
    {
        dst_array[channel_index][dst_index] = src_array[n];
        channel_index++;
        if (channel_index >= channels) {
            channel_index = 0;
            dst_index++;
        }
    }
}

function integerConvert(srcView,dstView,srcBytes)
{
    //Convert integers of a Uint8Array of certain byte length into a Float32Array
    var number = dstView.length;
    var outBits = srcBytes*8;
    var endShift = 32 - outBits;
    if (srcView.length != dstView.length*srcBytes)
    {
        return -1;
    }
    for (var n=0; n<number; n++)
    {
        var intData;
        var srcIndex = n*srcBytes;
        srcView.subarray(srcIndex,srcIndex+srcBytes).forEach(function(i,a){intData += Number(i)<<(8*a);},this);
        intData = (intData << (endShift));
        dstView[n] = intData / 2147483648;
    }
}