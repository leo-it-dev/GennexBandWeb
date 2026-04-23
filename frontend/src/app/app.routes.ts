import { Routes } from '@angular/router';
import { UnsubscribeComponent } from './unsubscribe/unsubscribe.component';
import { PublishEventComponent } from './publish-event/publish-event/publish-event.component';
import { ShowEventURLComponent } from './show-event-url/show-event-url.component';
import { MainpageComponent } from './mainpage/mainpage.component';
import { PressKitComponent } from './press-kit/press-kit.component';

export const routes: Routes = [
    { path: '', component: MainpageComponent },
    { path: 'unsubscribe', component: UnsubscribeComponent },
    { path: 'publishEventNew', component: PublishEventComponent },
    { path: 'publishEventMod', component: PublishEventComponent },
    { path: 'publishEventDel', component: PublishEventComponent},
    { path: 'event', component: ShowEventURLComponent },
    { path: 'booking', component: PressKitComponent },
];
