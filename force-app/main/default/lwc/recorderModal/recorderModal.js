import { LightningElement } from 'lwc';

export default class RecorderModal extends LightningElement {
    recordingStopped;
    recording = false;
    
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