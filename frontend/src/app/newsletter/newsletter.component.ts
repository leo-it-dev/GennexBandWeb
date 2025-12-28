import { Component } from '@angular/core';
import { SlotComponent } from '../slot/slot.component';

@Component({
  selector: 'app-newsletter',
  imports: [SlotComponent],
  templateUrl: './newsletter.component.html',
  styleUrl: './newsletter.component.scss'
})
export class NewsletterComponent {

  public oneLineText = "Du willst über kommende Auftritte informiert bleieben? Dann gleich hier den Email-Newsletter abonieren.";

}
