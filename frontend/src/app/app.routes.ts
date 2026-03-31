import { Routes } from '@angular/router';
import { UnsubscribeComponent } from './unsubscribe/unsubscribe.component';
import { PublishEventComponent } from './publish-event/publish-event/publish-event.component';
import { ShowEventURLComponent } from './show-event-url/show-event-url.component';

export const routes: Routes = [
    { path: 'unsubscribe', component: UnsubscribeComponent },
    { path: 'publishEventNew', component: PublishEventComponent },
    { path: 'publishEventMod', component: PublishEventComponent },
    { path: 'publishEventDel', component: PublishEventComponent},
    { path: 'event', component: ShowEventURLComponent },
];
