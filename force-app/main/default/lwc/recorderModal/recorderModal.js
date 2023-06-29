import { LightningElement } from 'lwc';

export default class RecorderModal extends LightningElement {
    // mediaEnabled;
    mediaRecorder;
    chunks;
    
    recordingStopped;
    recording = false;

    async connectedCallback() {
        if (!navigator.mediaDevices) {
            console.log('Media devices not supported');
            // this.mediaEnabled = false;
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
        } catch(e) {
            console.error(`An error occurred: ${e.body.message}`);
        }
    }
    
    closeModal() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    toggleRecording() {
        this.recording = !this.recording;
    }

    startRecording() {
        this.toggleRecording();
    }

    stopRecording() {
        this.toggleRecording();
        this.recordingStopped = true;
    }
}