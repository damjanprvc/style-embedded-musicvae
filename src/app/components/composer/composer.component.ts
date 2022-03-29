import { Component, OnInit } from '@angular/core';
import {MusicVAE} from '@magenta/music/es6/music_vae';
import {
  sequences,
  blobToNoteSequence,
  PianoRollCanvasVisualizer,
  Player,
  urlToNoteSequence,
  sequenceProtoToMidi,
  PianoRollSVGVisualizer, SoundFontPlayer, midiToSequenceProto
} from '@magenta/music/es6/core';
import {INoteSequence} from '@magenta/music';
import * as tf from '@tensorflow/tfjs';
import {AttributeVectorService} from '../../services/attribute-vector.service';
import {MatSliderChange} from '@angular/material/slider';
import {NoteSequence} from '@magenta/music/es6';
import {midiFilesCatchy, midiFilesDark, midiFilesEDM, midiFilesEmotional, midiFilesPop, midiFilesRnB} from '../../../assets/midi.js';
import {midiFilesCatchy16Bar, midiFilesDark16Bar, midiFilesEDM16Bar, midiFilesEmotional16Bar, midiFilesPop16Bar} from '../../../assets/midi.js';
// declare var NexusUI: any;
import * as Nexus from '../../../assets/NexusUI.js';
import { NgxFileDropEntry, FileSystemFileEntry, FileSystemDirectoryEntry } from 'ngx-file-drop';
import { NgxSpinnerService } from 'ngx-spinner';
import {MatSnackBar} from '@angular/material/snack-bar';
import { saveAs } from 'file-saver';
import {MatDialog} from '@angular/material/dialog';
import {DialogEmbedOwnStyleComponent} from '../../dialogs/dialog-embed-own-style/dialog-embed-own-style.component';
import soundfontJson from '../../../assets/soundfont.json';
import styleMeansJson from '../../../assets/style-means.json';

interface ModelCheckpoint {
  id: string;
  name: string;
  url: string;
  sequenceLength: number;
}

@Component({
  selector: 'app-composer',
  templateUrl: './composer.component.html',
  styleUrls: ['./composer.component.css']
})
export class ComposerComponent implements OnInit {

  SOUNDFONT_URL = 'https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus';
  player: SoundFontPlayer = new SoundFontPlayer(this.SOUNDFONT_URL);
  visualizer = null;
  canvasId = 'canvas';
  currentZValue;
  currentNoteSequence: INoteSequence[] = null;
  tempo = 120.0;
  temperature = 0.5;
  // go to https://goo.gl/magenta/musicvae-checkpoints to see more checkpoint urls
  // Local checkpoints - use this if you stored the Magenta checkpoints on your local machine
  modelCheckpoints: ModelCheckpoint[] = [
    {id: 'mel_2bar_small', name: '2-Bar Small', url: '../../../assets/checkpoints/mel_2bar_small_checkpoint', sequenceLength: 2},
    {id: 'mel_4bar_med_q2', name: '4-Bar Medium', url: '../../../assets/checkpoints/mel_4bar_med_q2_checkpoint', sequenceLength: 4},
    // Trained with a strong prior (low KL divergence), which is better for sampling.
    // tslint:disable-next-line:max-line-length
    {id: 'mel_4bar_med_lokl_q2', name: '4-Bar Low KL Medium', url: '../../../assets/checkpoints/mel_4bar_med_lokl_q2_checkpoint', sequenceLength: 4},
    {id: 'mel_16bar_small_q2', name: '16-Bar Small', url: '../../../assets/checkpoints/mel_16bar_small_q2_checkpoint', sequenceLength: 16}
  ];
  // Hosted checkpoints
  // modelCheckpoints: ModelCheckpoint[] = [
  //   {id: 'mel_2bar_small', name: '2-Bar Small', url: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small', sequenceLength: 2},
  //   {id: 'mel_4bar_med_q2', name: '4-Bar Medium', url: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_med_q2', sequenceLength: 4},
  //   {id: 'mel_4bar_med_lokl_q2', name: '4-Bar Low KL Medium', url: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_med_lokl_q2', sequenceLength: 4},
  //   {id: 'mel_16bar_small_q2', name: '16-Bar Small', url: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_16bar_small_q2', sequenceLength: 16}
  // ];
  selectedCheckpoint = this.modelCheckpoints[0];
  model = new MusicVAE(this.selectedCheckpoint.url);
  MEL_BARS = this.selectedCheckpoint.sequenceLength;

  // Soundfont SGM Samples
  instruments = Object.values(soundfontJson.instruments).slice(0, -1);
  selectedInstrument = 0;

  isPlaying = false;

  fileName: string;

  showAdditionalControl = true;

  // Drag to upload
  public files: NgxFileDropEntry[] = [];
  // old
  // files: File[] = [];
  // validComboDrag: any;
  // invalidComboDrag: any;

  SNACKBAR_DURATION = 3 * 1000;
  isLoading = false;

  svgId = 'svg_visualizer';

  // public sliders: Array<{category: string, value: number, mean: tf.Tensor}> = [{category: 'adasd', value: 0, mean: null}, {category: 'adasd', value: 0, mean: null}, {category: 'adasd', value: 0, mean: null}];
  public sliders: Array<{category: string, value: number, mean: tf.Tensor}> = [];
  public previousSlidersState: Array<{category: string, value: number}> = [];
  selectedAttribute: string;

  panelOpenState = false;

  // Play with this to get back a larger or smaller blend of melodies
  numInterpolations = 4; // numInterpolations containing 32 notes

  // generates an array where indices correspond to midi notes
  // tslint:disable-next-line:only-arrow-functions
  everyNote = 'C,C#,D,D#,E,F,F#,G,G#,A,A#,B,'.repeat(20).split(',').map( function(x, i): string {
    return x + '' + Math.floor(i / 12);
  });

  constructor(private attributeVectorService: AttributeVectorService, private spinner: NgxSpinnerService,
              private snackBar: MatSnackBar, public dialog: MatDialog) { }

  ngOnInit(): void {
    this.spinner.show();
    this.init().then(() => {
      this.spinner.hide();
      console.log('All set up.');
    });
  }

  async init(): Promise<void> {
    await this.model.initialize();
    console.log(this.selectedCheckpoint);
    console.log(this.MEL_BARS);

    // First MIDI Set (Trial Version)
    // await this.loadMeanForCategory('beauty', this.midiFilesBeauty);
    // await this.loadMeanForCategory('dark', this.midiFilesDark);
    // await this.loadMeanForCategory('hiphop', this.midiFilesHiphop);
    // await this.loadMeanForCategory('neosoul', this.midiFilesNeosoul);
    // await this.loadMeanForCategory('mozart', this.midiFilesMozart);

    // Niko MIDI Set
    // await this.loadMeanForCategory('catchy', midiFilesCatchy);
    // await this.loadMeanForCategory('dark', midiFilesDark);
    // await this.loadMeanForCategory('edm', midiFilesEDM);
    // await this.loadMeanForCategory('emotional', midiFilesEmotional);
    // await this.loadMeanForCategory('pop', midiFilesPop);
    // await this.loadMeanForCategory('rnb', midiFilesRnB);

    // 16Bar Niko MIDI Set
    // await this.loadMeanForCategory('catchy', midiFilesCatchy16Bar);
    // await this.loadMeanForCategory('dark', midiFilesDark16Bar);
    // await this.loadMeanForCategory('edm', midiFilesEDM16Bar);
    // await this.loadMeanForCategory('emotional', midiFilesEmotional16Bar);
    // await this.loadMeanForCategory('pop', midiFilesPop16Bar);

    // Load style means from file
    await this.loadMeanForCategoryFromFile('catchy', this.selectedCheckpoint.id);
    await this.loadMeanForCategoryFromFile('dark', this.selectedCheckpoint.id);
    await this.loadMeanForCategoryFromFile('edm', this.selectedCheckpoint.id);
    await this.loadMeanForCategoryFromFile('emotional', this.selectedCheckpoint.id);
    await this.loadMeanForCategoryFromFile('pop', this.selectedCheckpoint.id);
    if (this.selectedCheckpoint.id !== 'mel_16bar_small_q2') {
      await this.loadMeanForCategoryFromFile('rnb', this.selectedCheckpoint.id);
    }

    // this.selectedAttribute = this.sliders[0].category;
  }

  /**
   * Reloads the model on every 'checkpoint selector' change
   */
  reloadModel(): void {
    this.spinner.show();

    this.sliders = [];
    this.previousSlidersState = [];
    this.resetAllSlider();

    // this.model.dispose(); // evtl. ohne dispose
    this.model = new MusicVAE(this.selectedCheckpoint.url);
    this.MEL_BARS = this.selectedCheckpoint.sequenceLength;
    this.init().then(() => {
      this.spinner.hide();
      console.log('All set up.');
    });
  }

  /**
   * Opens the Embed your Own Style Dialog
   */
  openEmbedOwnStyleDialog(): void {
    const dialogRef = this.dialog.open(DialogEmbedOwnStyleComponent);

    dialogRef.afterClosed().subscribe(result => {
      // 'Embed' button in the Dialog was clicked
      if (result) {
        // console.log(result);
        this.spinner.show();
        this.loadMeanForCategory('custom', result).then(() => console.log('Successfully embedded own style.'));
        this.spinner.hide();
      }
    });
  }

  dropped(files: NgxFileDropEntry[]): void {
    // If more than 1 file has been uploaded, show error. Only one MIDI file allowed
    if (files.length > 1) {
      this.snackBar.open('Please upload only ONE MIDI file.', undefined, {
        duration: this.SNACKBAR_DURATION
      });
      this.files = [];
      return;
    }

    // File format check. Only .mid allowed
    const extension = files[0].relativePath.substring(files[0].relativePath.lastIndexOf('.') + 1);
    if (extension.toLowerCase() !== 'mid') {
      this.snackBar.open('ERROR: Only ".mid" file format allowed.', undefined, {
        duration: this.SNACKBAR_DURATION
      });
      this.files = [];
      return;
    }

    this.spinner.show();
    this.files = files;
    for (const droppedFile of files) {

      // Is it a file?
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {

          // Here you can access the real file
          // console.log(droppedFile.relativePath, file);

          // Embed the MIDI file and show the sequence
          blobToNoteSequence(file)
            .then(sequence => {
            const quantizedSequence = sequences.quantizeNoteSequence(sequence, 4);
            console.log(quantizedSequence);

            // Encode the given Melody & return tensor z
            this.model.encode([quantizedSequence])
              .then(tensor => {
                // Decode tensor z & return sequence
                this.model.decode(tensor).then(s => {
                  console.log(s);
                  this.currentNoteSequence = s;
                  this.currentZValue = tensor;
                  this.showSequenceToUI(this.currentNoteSequence);
                });
              });
          })
            .catch(err => {
              alert(err);
              this.files = [];
            });

        });
      } else {
        // It was a directory (empty directories are added, otherwise only files)
        const fileEntry = droppedFile.fileEntry as FileSystemDirectoryEntry;
        console.log(droppedFile.relativePath, fileEntry);
      }
    }
    this.spinner.hide();
  }

  async loadMeanForCategoryFromFile(category: string, checkpointId: string): Promise<void> {
    const selectedObj = styleMeansJson.find(x => x.checkpointId === checkpointId && x.name === category);
    // console.log(selectedObj);
    const mean = tf.tensor(selectedObj.meanTensor, [1, 256]);
    // console.log(mean.print(true));
    this.sliders.push({category, value: 0, mean});
    this.previousSlidersState.push({category, value: 0});
  }

  async loadMeanForCategory(category: string, midiFilesUrl: string[] | File[]): Promise<void> {
    const melodies: NoteSequence[] = [];
    // Check to use either 'urlToNoteSequence' or 'blobToNoteSequence'
    if (Array.isArray(midiFilesUrl) && midiFilesUrl[0] instanceof File) {
      for (const midi of midiFilesUrl) {
        const sequence = await blobToNoteSequence(midi as File);
        melodies.push(sequence);
      }
    } else {
      for (const midi of midiFilesUrl) {
        const sequence = await urlToNoteSequence(midi as string);
        melodies.push(sequence);
      }
    }

    // 1. Encode the input into MusicVAE, get back a z.
    const quantizedMels: NoteSequence[] = [];
    melodies.forEach((m) => quantizedMels.push(sequences.quantizeNoteSequence(m, 4)));

    // 1b. Split this sequence into 2 bar chunks.
    let chunks: NoteSequence[] = [];
    quantizedMels.forEach((m) => {
      // if you want to split the sequence into 2 bar chunks,
      // then if the sequence has 16th note quantization,
      // that will be 32 steps for each 2 bars (so a chunkSize of 32)
      const length = 16 * this.MEL_BARS; // = 32
      const melChunks = sequences.split(sequences.clone(m), length);
      chunks = chunks.concat(melChunks); // Array of 2 bar chunks
    });

    // TODO: Change chunks - all chunks: chunks. Only first chunk: [chunks[0]]
    // Get for every chunk a MusicVAE z value
    const z = await this.model.encode(chunks);  // shape of z is [chunks, 256]
    const attributeVectorZMean = z.mean(0, true); // mean of all chunks. Shape: [1, 256]
    this.sliders.push({category, value: 0, mean: attributeVectorZMean});
    this.previousSlidersState.push({category, value: 0});

    z.print(true);
    attributeVectorZMean.print(true);
    console.log(category + '-mean :');
    console.log(JSON.stringify(attributeVectorZMean.arraySync()));

    // Prints Variances
    // console.log(category + ' Variance:');
    // this.attributeVectorService.printVarianceFor(z, attributeVectorZMean as tf.Tensor2D);

    z.dispose();
  }

  async sampleNewSequence(): Promise<void> {
    this.spinner.show();

    // Clear uploaded files array to disable file name UI element
    this.files = [];

    // Sampling manual a random Z value via tf.randomNormal() function - z-value necessary for attribute vector manipulation
    const randomZ: tf.Tensor2D = tf.tidy(() => tf.randomNormal([1, this.model.zDims]));
    console.log('Sample:');
    console.log(randomZ.toString(true));
    const sequence = await this.model.decode(randomZ, this.temperature);
    this.currentZValue = randomZ;
    this.currentNoteSequence = sequence;
    this.showSequenceToUI(sequence);
    this.resetAllSlider();
    this.spinner.hide();

    // Sample with a 3DTensor as output (One-Hot output)
    // this.model.
    // sampleTensors(1, 1.0)
    //   .then((sample) => {
    //     console.log(sample.toString(true));
    //   });
  }

  async resampleSequence(): Promise<void> {
    this.spinner.show();
    const sequence = await this.model.decode(this.currentZValue, this.temperature);
    this.currentNoteSequence = sequence;
    this.showSequenceToUI(sequence);
    this.resetAllSlider();
    this.spinner.hide();

  }

  async sampleSimilarSequence(): Promise<void> {
    this.spinner.show();
    const sequence = await this.model.similar(this.currentNoteSequence[0], 1, 0.7, this.temperature);
    this.currentNoteSequence = sequence;
    this.showSequenceToUI(sequence);
    this.resetAllSlider();
    this.spinner.hide();
  }

  downloadCurrentSequence(): void {
    // There is a bug in Magenta - No velocities are set: so need to set it manually to be able to hear the notes in the saved file
    this.currentNoteSequence[0].notes.forEach(n => n.velocity = 80);
    saveAs(new File([sequenceProtoToMidi(this.currentNoteSequence[0])], 'sample.mid'));
  }

  /**
   * @deprecated The old open MIDI File method
   */
  openMidiFile(): void {
    const midiFile = '../../../assets/midi/Niko_Melody_8Bars.mid';

    urlToNoteSequence(midiFile).then(sequence => {
      const quantizedSequence = sequences.quantizeNoteSequence(sequence, 4);
      console.log(quantizedSequence);

      // Encode the given Melody & return tensor z
      this.model.encode([quantizedSequence])
        .then(tensor => {
        // Decode tensor z & return sequence
          this.model.decode(tensor).then(s => {
          console.log(s);
          this.currentNoteSequence = s;
          this.currentZValue = tensor;
          this.visualizer = new PianoRollSVGVisualizer(this.currentNoteSequence[0],
            document.getElementById(this.svgId) as unknown as SVGSVGElement);
          console.log('sampled');
        });
        });
    });
  }

  async showAttributeVector(category: string = this.selectedAttribute): Promise<void> {
    const sliderIndex = this.sliders.findIndex(obj => {
      return obj.category === category;
    });
    const attributeVectorsZMeanSequence = await this.model.decode(this.sliders[sliderIndex].mean as tf.Tensor2D);
    this.currentZValue = this.sliders[sliderIndex].mean;
    this.currentNoteSequence = attributeVectorsZMeanSequence;
    this.showSequenceToUI(attributeVectorsZMeanSequence);
  }

  // Show all Interpolations from 'sample' to 'category mean'
  // async onSliderChange(category: string): Promise<void> {
  //   // console.log(JSON.stringify(this.sliders));
  //
  //   this.sliders.forEach(slider => {
  //     console.log(slider.category + '-value: ' + slider.value);
  //   });
  //
  //   const currentSliderObj = this.sliders.find(obj => {
  //     console.log('Slider ' + category + ' changed');
  //     return obj.category === category;
  //   });
  //
  //   const currentSliderMean = currentSliderObj.mean as tf.Tensor2D;
  //   const currentSliderMeanAsSequence = await this.model.decode(currentSliderMean);
  //   currentSliderMean.print(true);
  //   const sequencesToInterpolate: INoteSequence[] = this.currentNoteSequence.concat(currentSliderMeanAsSequence);
  //
  //   const interpolations: INoteSequence[] = await this.model.interpolate(sequencesToInterpolate, 6);
  //
  //   this.showSequenceToUI([sequences.concatenate(interpolations)]);
  // }

  async onSliderChange(category: string): Promise<void> {
    const currentSliderObj = this.sliders.find(obj => {
      console.log(category + ' slider changed.');
      return obj.category === category;
    });

    const previousSliderObj = this.previousSlidersState.find(obj => {
      return obj.category === category;
    });

    const previousSliderIndex = this.previousSlidersState.findIndex(obj => {
      return obj.category === category;
    });

    if (previousSliderObj.value < currentSliderObj.value) {
      const valueChange = (currentSliderObj.value - previousSliderObj.value);
      console.log('Added: ' + valueChange);
      const currentSliderMean = currentSliderObj.mean as tf.Tensor2D;
      const zWithAttribute = tf.add(this.currentZValue, tf.mul(currentSliderMean, tf.scalar(valueChange / 10))) as tf.Tensor2D;
      const outputSequence: INoteSequence[] = await this.model.decode(zWithAttribute);
      this.currentZValue.print();
      this.currentZValue = zWithAttribute;
      this.currentNoteSequence = outputSequence;
      this.showSequenceToUI(outputSequence);

      currentSliderMean.print();
      zWithAttribute.print();
    }

    if (previousSliderObj.value > currentSliderObj.value) {
      const valueChange = (previousSliderObj.value - currentSliderObj.value);
      console.log('Subtracted: ' + valueChange);
      const currentSliderMean = currentSliderObj.mean as tf.Tensor2D;
      const zWithAttribute = tf.sub(this.currentZValue, tf.mul(currentSliderMean, tf.scalar(valueChange / 10))) as tf.Tensor2D;
      const outputSequence: INoteSequence[] = await this.model.decode(zWithAttribute);
      this.currentZValue.print();
      this.currentZValue = zWithAttribute;
      this.currentNoteSequence = outputSequence;
      this.showSequenceToUI(outputSequence);

      currentSliderMean.print();
      zWithAttribute.print();
    }

    // Update last values memory
    this.previousSlidersState[previousSliderIndex].value = currentSliderObj.value;
  }

  private showSequenceToUI(sequence: INoteSequence[]): void {
    this.visualizer = new PianoRollSVGVisualizer(sequence[0], document.getElementById(this.svgId) as unknown as SVGSVGElement);
  }

  playSequence(sequence: INoteSequence[]): void {
    if (this.player.isPlaying()) {
      this.isPlaying = false;
      this.player.stop();
      return;
    }
    this.isPlaying = true;
    const callbackObject = {
      run: (note: NoteSequence.Note) => {
        this.visualizer.redraw(note);
      },
      stop: () => {}
    };

    this.player = new SoundFontPlayer(
      this.SOUNDFONT_URL, undefined, undefined, undefined, callbackObject);

    // "Loads" i.e. sets for each note the current selected instrument
    sequence[0].notes.forEach(n => n.program = this.selectedInstrument);

    this.player.start(sequence[0], this.tempo).then(() => {
      console.log('Played');
      this.isPlaying = false;
    });

  }

  private resetAllSlider(): void {
    this.sliders.forEach(slider => {
      slider.value = 0;
    });
    this.previousSlidersState.forEach(slider => {
      slider.value = 0;
    });
  }

  // returns the midi pitch value for the given note.
  // returns -1 if not found
  toMidi(note): any {
    return this.everyNote.indexOf(note);
  }

  // onFileSelected(event: Event): void {
  //   const target = event.target as HTMLInputElement;
  //   const file: File = target.files[0];
  //   console.log(file);
  //
  //   if (file.type === 'audio/mid') {
  //     this.fileName = file.name;
  //
  //     blobToNoteSequence(file).then(r => console.log(r));
  //   }
  // }

  // async onSliderChange(id: string): Promise<void> {
  //   this.isLoading = true;
  //
  //   // console.log('current slider value: ' + this.value);
  //
  //   switch (id) {
  //     case 'slider-beauty': {
  //       console.log('slider-beauty triggered');
  //       if (this.valueSliderBeauty > 0) {
  //         // tslint:disable-next-line:max-line-length
  //         const zWithAttribute = tf.add(this.currentZValue, tf.mul(this.attributeVectorsZMeanMap.get('beauty'), tf.scalar(this.valueSliderBeauty)));
  //         console.log('zWithAttribute:');
  //         console.log(zWithAttribute.toString(true));
  //         const sequence = await this.model.decode(zWithAttribute as tf.Tensor2D);
  //         this.showSequenceToUI(sequence);
  //       }
  //
  //       if (this.valueSliderBeauty < 0) {
  //         // tslint:disable-next-line:max-line-length
  //         const zWithAttribute = tf.sub(this.currentZValue, tf.mul(this.attributeVectorsZMeanMap.get('beauty'), tf.scalar(this.valueSliderBeauty * -1)));
  //         console.log(zWithAttribute.toString(true));
  //         const sequence = await this.model.decode(zWithAttribute as tf.Tensor2D);
  //         this.showSequenceToUI(sequence);
  //       }
  //
  //       if (this.valueSliderBeauty === 0) {
  //         const sequence = await this.model.decode(this.currentZValue as tf.Tensor2D, 1.0);
  //         this.showSequenceToUI(sequence);
  //       }
  //       break;
  //     }
  //     case 'slider-dark': {
  //       console.log('slider-dark triggered');
  //       if (this.valueSliderDark > 0) {
  //         // tslint:disable-next-line:max-line-length
  //         const zWithAttribute = tf.add(this.currentZValue, tf.mul(this.attributeVectorsZMeanMap.get('dark'), tf.scalar(this.valueSliderDark)));
  //         console.log(zWithAttribute.toString(true));
  //         const sequence = await this.model.decode(zWithAttribute as tf.Tensor2D);
  //         this.showSequenceToUI(sequence);
  //       }
  //
  //       if (this.valueSliderDark < 0) {
  //         // tslint:disable-next-line:max-line-length
  //         const zWithAttribute = tf.sub(this.currentZValue, tf.mul(this.attributeVectorsZMeanMap.get('dark'), tf.scalar(this.valueSliderDark * -1)));
  //         console.log(zWithAttribute.toString(true));
  //         const sequence = await this.model.decode(zWithAttribute as tf.Tensor2D);
  //         this.showSequenceToUI(sequence);
  //       }
  //
  //       if (this.valueSliderDark === 0) {
  //         const sequence = await this.model.decode(this.currentZValue as tf.Tensor2D, 1.0);
  //         this.showSequenceToUI(sequence);
  //       }
  //       break;
  //     }
  //     case 'slider-hiphop': {
  //       console.log('slider-hiphop triggered');
  //       if (this.valueSliderHiphop > 0) {
  //         // tslint:disable-next-line:max-line-length
  //         const zWithAttribute = tf.add(this.currentZValue, tf.mul(this.attributeVectorsZMeanMap.get('hiphop'), tf.scalar(this.valueSliderHiphop)));
  //         console.log(zWithAttribute.toString(true));
  //         const sequence = await this.model.decode(zWithAttribute as tf.Tensor2D);
  //         this.showSequenceToUI(sequence);
  //       }
  //
  //       if (this.valueSliderHiphop < 0) {
  //         // tslint:disable-next-line:max-line-length
  //         const zWithAttribute = tf.sub(this.currentZValue, tf.mul(this.attributeVectorsZMeanMap.get('hiphop'), tf.scalar(this.valueSliderHiphop * -1)));
  //         console.log(zWithAttribute.toString(true));
  //         const sequence = await this.model.decode(zWithAttribute as tf.Tensor2D);
  //         this.showSequenceToUI(sequence);
  //       }
  //
  //       if (this.valueSliderHiphop === 0) {
  //         const sequence = await this.model.decode(this.currentZValue as tf.Tensor2D, 1.0);
  //         this.showSequenceToUI(sequence);
  //       }
  //       break;
  //     }
  //     default: {
  //       break;
  //     }
  //   }
  //   this.isLoading = false;
  //
  // }

  // private showSequenceToUI(sequence: INoteSequence[]): void {
  //   this.visualizer = new PianoRollCanvasVisualizer(sequence[0],
  //     document.getElementById(this.canvasId) as HTMLCanvasElement);
  //   this.currentNoteSequence = sequence;
  // }
}
