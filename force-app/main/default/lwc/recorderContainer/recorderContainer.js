import { LightningElement } from 'lwc';

export default class RecorderContainer extends LightningElement {
    modalOpen = false;

    toggleModal() {
        this.modalOpen = !this.modalOpen;
    }
}