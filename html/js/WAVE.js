// Decode and perform WAVE file byte level manipulation
/*globals console, Uint8Array, Float32Array, Float64Array */

function find_subarray(arr, subarr) {
    var arr_length = arr.length;
    var subarr_length = subarr.length;
    var last_check_index = arr_length - subarr_length;

    positionLoop:
        for (var i = 0; i <= last_check_index; i++) {
            for (var j = 0; j < subarr_length; j++) {
                if (arr[i + j] !== subarr[j]) {
                    continue positionLoop;
                }
            }
            return i;
        }
    return -1;
}

function convertToInteger(arr) {
    var value = 0;
    for (var i = 0; i < arr.length; i++) {
        value += arr[i] << (i * 8);
    }
    return value;
}

function convertToString(arr) {
    var str = "";
    for (var i = 0; i < arr.length; i++) {
        str = str.concat(String.fromCharCode(arr[i]));
    }
    return str;
}

function WAVE() {
    // The WAVE file object
    this.status = 'WAVE_DECLARED';

    this.decoded_data = null;

    this.RIFF = String(); //ChunkID
    this.size = undefined; //ChunkSize
    this.FT_Header = undefined; //Format
    this.fmt_marker = undefined; //Subchunk1ID
    this.formatDataLength = undefined; //Subchunk1Size
    this.type = undefined; //AudioFormat
    this.num_channels = undefined; //NumChannels
    this.sample_rate = undefined; //SampleRate
    this.byte_rate = undefined; //ByteRate
    this.block_align = undefined; //BlockAlign
    this.bits_per_sample = undefined; //BitsPerSample
    this.data_header = undefined; //Subchunk2ID
    this.data_size = undefined; //Subchunk2Size
    this.num_samples = undefined;

    this.open = function (IOArrayBuffer) {
        var IOView8 = new Uint8Array(IOArrayBuffer);
        this.RIFF = convertToString(IOView8.subarray(0, 4));
        if (this.RIFF != 'RIFF') {
            console.log('WAVE ERR - Not a RIFF file');
            return 1;
        }
        this.size = convertToInteger(IOView8.subarray(4, 8));
        this.FT_Header = convertToString(IOView8.subarray(8, 12));
        this.fmt_marker = convertToString(IOView8.subarray(12, 16));
        this.formatDataLength = convertToInteger(IOView8.subarray(16, 20));
        this.type = convertToInteger(IOView8.subarray(20, 22));
        this.num_channels = convertToInteger(IOView8.subarray(22, 24));
        this.sample_rate = convertToInteger(IOView8.subarray(24, 28));
        this.byte_rate = convertToInteger(IOView8.subarray(28, 32));
        this.block_align = convertToInteger(IOView8.subarray(32, 34));
        this.bits_per_sample = convertToInteger(IOView8.subarray(34, 36));

        // Find the data header first
        var data_start = find_subarray(IOView8, [100, 97, 116, 97]);

        this.data_header = convertToString(IOView8.subarray(data_start, data_start + 4));
        this.data_size = convertToInteger(IOView8.subarray(data_start + 4, data_start + 8));

        this.num_samples = this.data_size / this.block_align;

        this.decoded_data = [];
        if (this.type != 1 && this.type != 3) {
            console.log("Neither PCM nor IEEE float, cannot decode");
            return 1;
        }
        for (var c = 0; c < this.num_channels; c++) {
            this.decoded_data.push(new Float32Array(this.num_samples));
        }
        var sampleDataOffset = data_start + 8;

        // Now need to decode the data from sampleDataOffset
        // Data is always interleved
        var data_view;
        if (this.type == 3) {
            // Already in float
            if (this.bits_per_sample == 32) {
                data_view = new Float32Array(IOArrayBuffer.slice(sampleDataOffset, sampleDataOffset + this.data_size));
            } else if (this.bits_per_sample == 64) {
                data_view = new Float64Array(IOArrayBuffer.slice(sampleDataOffset, sampleDataOffset + this.data_size));
            }
        } else if (this.type == 1) {
            data_view = new Float32Array(this.num_samples * this.num_channels);
            integerConvert(new Uint8Array(IOArrayBuffer.slice(sampleDataOffset, sampleDataOffset + this.data_size)), data_view, this.bits_per_sample / 8);
        }
        deInterlace(data_view, this.decoded_data);
        return 0;
    };
}

function deInterlace(src_array, dst_array) {
    var number = src_array.length;
    var channels = dst_array.length;
    var channel_index = 0;
    var dst_index = 0;
    for (var n = 0; n < number; n++) {
        dst_array[channel_index][dst_index] = src_array[n];
        channel_index++;
        if (channel_index >= channels) {
            channel_index = 0;
            dst_index++;
        }
    }
}

function integerConvert(srcView, dstView, srcBytes) {
    //Convert integers of a Uint8Array of certain byte length into a Float32Array
    var number = dstView.length;
    var outBits = srcBytes * 8;
    var endShift = 32 - outBits;
    if (srcView.length != dstView.length * srcBytes) {
        return -1;
    }
    for (var n = 0; n < number; n++) {
        var srcIndex = n * srcBytes;
        var intData = convertToInteger(srcView.subarray(srcIndex, srcIndex + srcBytes));
        intData = (intData << (endShift));
        dstView[n] = intData / 2147483648;
    }
}
