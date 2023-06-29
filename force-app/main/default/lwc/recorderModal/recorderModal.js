import { LightningElement, track } from 'lwc';

export default class RecorderModal extends LightningElement {
    // mediaEnabled;
    mediaRecorder;
    recordingStopped;
    audioURL;
    audioBlob;
    audioCtx;

    recording = false;
    recordingPaused;
    
    @track chunks = [];

    async connectedCallback() {
        if (!navigator.mediaDevices) {
            console.log('Media devices not supported');
            // this.mediaEnabled = false;
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            
            this.audioCtx = new AudioContext();
            // const recordingSource = this.audioCtx.createMediaStreamSource(stream);
            console.log(JSON.parse(JSON.stringify(this.audioCtx)));
            


            this.mediaRecorder.addEventListener('dataavailable', (e) => {
                this.chunks.push(e.data);
            });

            this.mediaRecorder.addEventListener('stop', () => {
                const formattedArrayBuffer = this._generateWavFile(new Blob(this.chunks, { type: 'audio/wav' }), 8000);
                this.audioBlob = new Blob([ formattedArrayBuffer ], { type: 'audio/wav' });
                this.audioURL = URL.createObjectURL(this.audioBlob);
                
                // this.audioBlob = new Blob(this.chunks, { type: 'audio/wav' });
                // this.audioURL = URL.createObjectURL(this.audioBlob);
                this._clearChunks();
                
                // try {
                //     const test = await this.audioBlob.arrayBuffer()
                //     const audioBuffer = await this.audioCtx.decodeAudioData(test);
                //     const track = this.audioCtx.createBufferSource();
                //     track.buffer = audioBuffer;
                //     track.connect(this.audioCtx.destination);
                //     track.start(0);
                // } catch(e) {
                //     console.error(e);
                // }
            });
        } catch(err) {
            console.error(`An error occurred: ${err.body.message}`);
        }
    }
    
    closeModal() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    toggleRecording() {
        this.recording = !this.recording;
    }

    startRecording() {
        if (!this.mediaRecorder) {
            return;
        }

        this.mediaRecorder.start();
        this.toggleRecording();
    }

    stopRecording() {
        this.mediaRecorder.stop();
        this.toggleRecording();
        this.recordingStopped = true;
    }

    pauseRecording() {
        this.mediaRecorder.pause();
        this.recordingPaused = true;
    }

    resumeRecording() {
        this.mediaRecorder.resume();
        this.recordingPaused = false;
    }

    resetRecording() {
        this._clearChunks();
        this.startRecording();
    }

    cancelRecording() {
        this._clearChunks();
        this.toggleRecording();
        this.recordingStopped = false;
    }

    downloadRecording() {

    }

    _generateWavFile(blobData, sampleRate) {
        const channels = 1; // Mono
        const bitDepth = 8; // 8-bit
        
        let dataLength = 0;
        
        if (blobData.size) {
            dataLength = blobData.size;
        } else if (blobData.length) {
            dataLength = blobData.length;
        } else {
            console.error('Invalid blob data');
            return null;
        }
        
        const fileSize = 44 + dataLength;
        const buffer = new ArrayBuffer(fileSize);
        const view = new DataView(buffer);
        
        // RIFF chunk descriptor
        this._writeString(view, 0, 'RIFF');
        view.setUint32(4, fileSize - 8, true);
        this._writeString(view, 8, 'WAVE');
        
        // Format chunk descriptor
        this._writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, channels, true);
        view.setUint32(24, sampleRate, true);
        
        const byteRate = sampleRate * channels * (bitDepth / 8);
        view.setUint32(28, byteRate, true);
        
        const blockAlign = channels * (bitDepth / 8);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        
        // Data chunk descriptor
        this._writeString(view, 36, 'data');
        view.setUint32(40, dataLength, true);
        
        // Copy the BLOB data to the WAV file buffer
        const dataOffset = 44;
        const reader = new FileReader();
        
        reader.onloadend = () => {
            const blobDataView = new Uint8Array(reader.result);
            const wavDataView = new Uint8Array(buffer, dataOffset);
            wavDataView.set(blobDataView);
        };
        
        reader.readAsArrayBuffer(blobData);
        
        return buffer;
    }

    _writeString(view, offset, value) {
        for (let i = 0; i < value.length; i++) {
            view.setUint8(offset + i, value.charCodeAt(i));
        }
    }
    
    _clearChunks() {
        this.chunks = [];
    }
}