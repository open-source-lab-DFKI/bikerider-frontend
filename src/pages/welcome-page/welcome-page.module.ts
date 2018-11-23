import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { WelcomePage } from './welcome-page';
import { SpeechCmdBtnModule } from '../../components/speech-cmd-button/speech-cmd-btn.module';

@NgModule({
  declarations: [
    WelcomePage
  ],
  imports: [
    IonicPageModule.forChild(WelcomePage),
    SpeechCmdBtnModule,
  ],
  exports: [
    WelcomePage,
  ]
})
export class WelcomePageModule {}