import { LightningElement, track } from 'lwc';

const MAX_SECONDS = 300;

export default class RecorderModal extends LightningElement {
    // Recorder State Flags
    recording = false;
    playingBack = false;
    recordingStopped;
    recordingPaused;
    secondsRecording = 0;
    isRecordingProgressing;
    
    // Audio Objects
    mediaRecorder;
    audioBlob;
    audio;
    audioTime;
    audioDuration;
    audioTimeRatio;

    // Recorded Chunks
    @track chunks = [];

    get formattedRecordingTime() {
        return this._toMMSS(this.secondsRecording);
    }

    get formattedAudioTime() {
        return this._toMMSS(this.audioTime);
    }

    get playbackPaused() {
        return this.audio?.paused;
    }

    async connectedCallback() {
        if (!navigator.mediaDevices) {
            console.log('Media devices not supported');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            
            this.mediaRecorder.addEventListener('dataavailable', (e) => {
                this.chunks.push(e.data);
            });

            this.mediaRecorder.addEventListener('stop', async () => {
                let wavDataView;
                try {
                    wavDataView = await this._generateWavFile(new Blob(this.chunks));
                } catch(err) {
                    console.error(err.body.message);
                }
                
                this.audioBlob = new Blob([ wavDataView ], { type: 'audio/wav' });
                
                const audioURL = URL.createObjectURL(this.audioBlob);
                this.audio = new Audio(audioURL);
                this.audio.addEventListener('loadeddata', () => {
                    this.audioDuration = this.audio.duration;
                });
                this.audio.addEventListener('timeupdate', () => {
                    this.audioTime = this.audio.currentTime;
                    this.audioTimeRatio = this.audio.currentTime / this.audio.duration;
                });

                const downloadElement = this.template.querySelector('a');
                downloadElement.href = audioURL;
                
                this._clearChunks();
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

    toggleRecordingProgress() {
        if (this.isRecordingProgressing) {
            this.isRecordingProgressing = false;
            clearInterval(this._interval);
        } else {
            this.isRecordingProgressing = true;
            this._interval = setInterval(() => {
                if (this.secondsRecording === MAX_SECONDS) {
                    this.stopRecording();
                    return;
                }

                this.secondsRecording++;
            }, 1000);
        }
    }

    startRecording() {
        if (!this.mediaRecorder) {
            return;
        }
        
        this.mediaRecorder.start();
        
        this.toggleRecording();
        this.toggleRecordingProgress();
    }

    stopRecording() {
        this.mediaRecorder.stop();
        this.toggleRecording();
        this.toggleRecordingProgress();
        this.recordingStopped = true;
    }

    pauseRecording() {
        this.mediaRecorder.pause();
        this.toggleRecordingProgress();
        this.recordingPaused = true;
    }

    resumeRecording() {
        this.mediaRecorder.resume();
        this.toggleRecordingProgress();
        this.recordingPaused = false;
    }

    resetRecording() {
        this._clearChunks();
        this.recordingStopped = false;
        this.secondsRecording = 0;
        this.audioTime = 0;
        this.audioTimeRatio = 0;
        this.startRecording();
    }

    cancelRecording() {
        this._clearChunks();
        this.toggleRecording();
        this.recordingStopped = false;
    }

    playAudio() {
        this.audio.play();
    }

    pauseAudio() {
        this.audio.pause();
    }

    async _generateWavFile(blob) {
        const sampleRate = 8000;
        const channels = 1;
        const bitsPerSample = 8;
        const audioDataSize = blob.size;
        const byteOffset = 44;
        const fileSize = byteOffset + audioDataSize;
        const byteRate = sampleRate * channels * (bitsPerSample / 8);
        const blockAlign = channels * (bitsPerSample / 8);

        const buffer = new ArrayBuffer(fileSize);
        const view = new DataView(buffer);

        // RIFF Header
        // ChunkID
        this._writeString(view, 0, 'RIFF');
        // ChunkSize
        view.setUint32(4, fileSize - 8, true);
        // Format
        this._writeString(view, 8, 'WAVE');

        // fmt Subchunk
        // SubChunk1ID
        this._writeString(view, 12, 'fmt ');
        // Subchunk1Size
        view.setUint32(16, 16, true);
        // AudioFormat
        view.setUint16(20, 7, true);
        // NumChannels
        view.setUint16(22, 1, true);
        // SampleRate
        view.setUint32(24, sampleRate, true);
        // ByteRate
        view.setUint32(28, byteRate, true);
        // BlockAlign
        view.setUint16(32, blockAlign, true);
        // BitsPerSample
        view.setUint16(34, bitsPerSample, true);

        // data Subchunk
        // Subchunk2ID
        this._writeString(view, 36, 'data');
        // Subchunk2Size
        view.setUint32(40, audioDataSize, true);

        // append audio data to header
        let blobBuffer;
        try {
            blobBuffer = await blob.arrayBuffer();
        } catch(err) {
            console.error(err.body.message);
        }
        
        const blobView = new Uint8Array(blobBuffer);
        const wavView = new Uint8Array(buffer);
        wavView.set(blobView, byteOffset);
        
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

    _toMMSS(s) {
        const minutes = Math.floor(s / 60) || 0;
        const seconds = Math.floor(s % 60) || 0;
        const returnedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
        
        return `0${minutes}:${returnedSeconds}`;
    }
}