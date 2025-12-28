import { Component, computed, ElementRef, ViewChild } from '@angular/core';
import { SlotComponent, SlotScrollCommunication } from '../slot/slot.component';

@Component({
	selector: 'app-contact',
	imports: [SlotComponent],
	templateUrl: './contact.component.html',
	styleUrl: './contact.component.scss'
})
export class ContactComponent {

	public oneLineText = "Du möchtest uns eine Konzertanfrage senden oder genaueres erfahren? Dann kannst Du hier per Mail mit uns in Kontakt treten.";

}
