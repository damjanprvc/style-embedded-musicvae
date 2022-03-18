import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {ComposerComponent} from './components/composer/composer.component';
import {MidimeComponent} from './components/midime/midime.component';

/**
 * Central routing component
 */
const routes: Routes = [
  {path: '',  redirectTo: '/composer', pathMatch: 'full'},
  {path: 'midime', component: MidimeComponent},
  {path: 'composer', component: ComposerComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
