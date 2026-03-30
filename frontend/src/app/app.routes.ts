import { Routes } from '@angular/router';
import { UnsubscribeComponent } from './unsubscribe/unsubscribe.component';
import { PublishEventComponent } from './publish-event/publish-event/publish-event.component';

export const routes: Routes = [
    { path: 'unsubscribe', component: UnsubscribeComponent },
    { path: 'publishEventNew', component: PublishEventComponent },
    { path: 'publishEventMod', component: PublishEventComponent }
];
