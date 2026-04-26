import { Routes } from '@angular/router';
import { PageNewComponent } from './page-new/page-new.component';
import { PressKitComponent } from './press-kit/press-kit.component';
import { PublishEventComponent } from './publish-event/publish-event/publish-event.component';
import { ShowEventURLComponent } from './show-event-url/show-event-url.component';
import { UnsubscribeComponent } from './unsubscribe/unsubscribe.component';

export const routes: Routes = [
    { path: '', component: PageNewComponent },
    { path: 'unsubscribe', component: UnsubscribeComponent },
    { path: 'publishEventNew', component: PublishEventComponent },
    { path: 'publishEventMod', component: PublishEventComponent },
    { path: 'publishEventDel', component: PublishEventComponent},
    { path: 'event', component: ShowEventURLComponent },
    { path: 'booking', component: PressKitComponent },
];
