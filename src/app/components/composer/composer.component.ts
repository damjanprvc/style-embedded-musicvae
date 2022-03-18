import { Component, OnInit } from '@angular/core';
import {MusicVAE} from '@magenta/music/es6/music_vae';
import {
  sequences,
  blobToNoteSequence,
  PianoRollCanvasVisualizer,
  Player,
  urlToNoteSequence,
  PianoRollSVGVisualizer, SoundFontPlayer
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

interface ModelCheckpoint {
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
  // go to https://goo.gl/magenta/musicvae-checkpoints to see more checkpoint urls
  // modelCheckpoint = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small';
  // modelCheckpoint = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_med_q2';
  // Trained with a strong prior (low KL divergence), which is better for sampling.
  // modelCheckpoint = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_med_lokl_q2';
  // modelCheckpoint = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_16bar_small_q2';
  // modelCheckpoint = '../../../assets/checkpoints/mel_2bar_small_checkpoint';
  // modelCheckpoint = '../../../assets/checkpoints/hierdec-mel_16bar_checkpoint';
  // modelCheckpoint = '../../../assets/checkpoints/cat-mel_2bar_big_checkpoint';
  player: SoundFontPlayer = null;
  visualizer = null;
  canvasId = 'canvas';
  currentNoteSequence: INoteSequence[] = null;
  tempo = 120.0;
  temperature = 0.5;
  // Local checkpoints - use this if you stored the Magenta checkpoints on your local machine
  // modelCheckpoints: ModelCheckpoint[] = [
  //   {name: '2-Bar Small', url: '../../../assets/checkpoints/mel_2bar_small_checkpoint', sequenceLength: 2},
  //   {name: '4-Bar Medium', url: '../../../assets/checkpoints/mel_4bar_med_q2_checkpoint', sequenceLength: 4},
  //   {name: '4-Bar Low KL Medium', url: '../../../assets/checkpoints/mel_4bar_med_lokl_q2_checkpoint', sequenceLength: 4},
  //   {name: '16-Bar Small', url: '../../../assets/checkpoints/mel_16bar_small_q2_checkpoint', sequenceLength: 16}
  // ];
  // Hosted checkpoints
  modelCheckpoints: ModelCheckpoint[] = [
    {name: '2-Bar Small', url: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small', sequenceLength: 2},
    {name: '4-Bar Medium', url: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_med_q2', sequenceLength: 4},
    {name: '4-Bar Low KL Medium', url: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_med_lokl_q2', sequenceLength: 4},
    {name: '16-Bar Small', url: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_16bar_small_q2', sequenceLength: 16}
  ];
  selectedCheckpoint = this.modelCheckpoints[0];
  model = new MusicVAE(this.selectedCheckpoint.url);
  MEL_BARS = this.selectedCheckpoint.sequenceLength;

  isPlaying = false;

  fileName: string;

  // Drag to upload
  public files: NgxFileDropEntry[] = [];
  // old
  // files: File[] = [];
  // validComboDrag: any;
  // invalidComboDrag: any;

  isLoading = false;

  private currentZValue;

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

  // If you want to try out other melodies copy and paste any of these in https://github.....
  MELODY1: INoteSequence = { notes: [
      {pitch: this.toMidi('A3'), quantizedStartStep: 0, quantizedEndStep: 4},
      {pitch: this.toMidi('D4'), quantizedStartStep: 4, quantizedEndStep: 6},
      {pitch: this.toMidi('E4'), quantizedStartStep: 6, quantizedEndStep: 8},
      {pitch: this.toMidi('F4'), quantizedStartStep: 8, quantizedEndStep: 10},
      {pitch: this.toMidi('D4'), quantizedStartStep: 10, quantizedEndStep: 12},
      {pitch: this.toMidi('E4'), quantizedStartStep: 12, quantizedEndStep: 16},
      {pitch: this.toMidi('C4'), quantizedStartStep: 16, quantizedEndStep: 20},
      {pitch: this.toMidi('D4'), quantizedStartStep: 20, quantizedEndStep: 26},
      {pitch: this.toMidi('A3'), quantizedStartStep: 26, quantizedEndStep: 28},
      {pitch: this.toMidi('A3'), quantizedStartStep: 28, quantizedEndStep: 32}
    ],
    quantizationInfo: {stepsPerQuarter: 4}
  };

  // you can also just put in the midi pitch note if you know it
  MELODY2 = { notes: [
      {pitch: 50, quantizedStartStep: 0, quantizedEndStep: 1},
      {pitch: 53, quantizedStartStep: 1, quantizedEndStep: 2},
      {pitch: 58, quantizedStartStep: 2, quantizedEndStep: 3},
      {pitch: 58, quantizedStartStep: 3, quantizedEndStep: 4},
      {pitch: 58, quantizedStartStep: 4, quantizedEndStep: 5},
      {pitch: 53, quantizedStartStep: 5, quantizedEndStep: 6},
      {pitch: 53, quantizedStartStep: 6, quantizedEndStep: 7},
      {pitch: 53, quantizedStartStep: 7, quantizedEndStep: 8},
      {pitch: 52, quantizedStartStep: 8, quantizedEndStep: 9},
      {pitch: 55, quantizedStartStep: 9, quantizedEndStep: 10},
      {pitch: 60, quantizedStartStep: 10, quantizedEndStep: 11},
      {pitch: 60, quantizedStartStep: 11, quantizedEndStep: 12},
      {pitch: 60, quantizedStartStep: 12, quantizedEndStep: 13},
      {pitch: 60, quantizedStartStep: 13, quantizedEndStep: 14},
      {pitch: 60, quantizedStartStep: 14, quantizedEndStep: 15},
      {pitch: 52, quantizedStartStep: 15, quantizedEndStep: 16},
      {pitch: 57, quantizedStartStep: 16, quantizedEndStep: 17},
      {pitch: 57, quantizedStartStep: 17, quantizedEndStep: 18},
      {pitch: 57, quantizedStartStep: 18, quantizedEndStep: 19},
      {pitch: 65, quantizedStartStep: 19, quantizedEndStep: 20},
      {pitch: 65, quantizedStartStep: 20, quantizedEndStep: 21},
      {pitch: 65, quantizedStartStep: 21, quantizedEndStep: 22},
      {pitch: 57, quantizedStartStep: 22, quantizedEndStep: 23},
      {pitch: 57, quantizedStartStep: 23, quantizedEndStep: 24},
      {pitch: 57, quantizedStartStep: 24, quantizedEndStep: 25},
      {pitch: 57, quantizedStartStep: 25, quantizedEndStep: 26},
      {pitch: 62, quantizedStartStep: 26, quantizedEndStep: 27},
      {pitch: 62, quantizedStartStep: 27, quantizedEndStep: 28},
      {pitch: 65, quantizedStartStep: 28, quantizedEndStep: 29},
      {pitch: 65, quantizedStartStep: 29, quantizedEndStep: 30},
      {pitch: 69, quantizedStartStep: 30, quantizedEndStep: 31},
      {pitch: 69, quantizedStartStep: 31, quantizedEndStep: 32}
    ],
    quantizationInfo: {stepsPerQuarter: 4}
  };

  TWINKLE_TWINKLE: INoteSequence = {
    notes: [
      {pitch: 60, startTime: 0.0, endTime: 0.5},
      {pitch: 60, startTime: 0.5, endTime: 1.0},
      {pitch: 67, startTime: 1.0, endTime: 1.5},
      {pitch: 67, startTime: 1.5, endTime: 2.0},
      {pitch: 69, startTime: 2.0, endTime: 2.5},
      {pitch: 69, startTime: 2.5, endTime: 3.0},
      {pitch: 67, startTime: 3.0, endTime: 4.0},
      {pitch: 65, startTime: 4.0, endTime: 4.5},
      {pitch: 65, startTime: 4.5, endTime: 5.0},
      {pitch: 64, startTime: 5.0, endTime: 5.5},
      {pitch: 64, startTime: 5.5, endTime: 6.0},
      {pitch: 62, startTime: 6.0, endTime: 6.5},
      {pitch: 62, startTime: 6.5, endTime: 7.0},
      {pitch: 60, startTime: 7.0, endTime: 8.0},
    ],
    totalTime: 8
  };

  // midiFilesBeauty = [
  //   '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/1a.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/1b.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/2a.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/2b.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/3.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/4a.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/4b.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/5a.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/5b.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/6a.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/6b.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/7a.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/7b.mid',
  // ];
  //
  // midiFilesDark = [
  //   '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/1a.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/1b.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/2a.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/2b.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/3a.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/4a.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/4b.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/5a.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/6a.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/7a.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/7b.mid',
  // ];
  //
  // midiFilesHiphop = [
  //   '../../../assets/midi/CMaj(AMin)_MELODY_HIPHOP/1.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_HIPHOP/2.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_HIPHOP/3.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_HIPHOP/4a.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_HIPHOP/4b.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_HIPHOP/5a.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_HIPHOP/5b.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_HIPHOP/6a.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_HIPHOP/6b.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_HIPHOP/7.mid',
  // ];
  //
  // midiFilesNeosoul = [
  //   '../../../assets/midi/CMaj(AMin)_MELODY_NEOSOUL/1.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_NEOSOUL/2.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_NEOSOUL/3.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_NEOSOUL/4.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_NEOSOUL/5.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_NEOSOUL/6.mid',
  // ];
  //
  // midiFilesMozart = [
  //   '../../../assets/midi/Mozart/Mozart - Piano Sonata No1 m1 Melody.mid'
  // ];

  constructor(private attributeVectorService: AttributeVectorService, private spinner: NgxSpinnerService) { }

  ngOnInit(): void {
    this.spinner.show();
    this.init().then(() => {
      this.spinner.hide();
      console.log('All set up.');
    });
  }

  reloadModel(): void {
    this.sliders = [];
    this.previousSlidersState = [];

    // this.model.dispose(); // evtl. ohne dispose
    this.model = new MusicVAE(this.selectedCheckpoint.url);
    this.spinner.show();
    this.init().then(() => {
      this.spinner.hide();
      console.log('All set up.');
    });
  }

  public dropped(files: NgxFileDropEntry[]): void {
    this.files = files;
    for (const droppedFile of files) {

      // Is it a file?
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {

          // Here you can access the real file
          console.log(droppedFile.relativePath, file);

          //  // You could upload it like this:
          // const formData = new FormData();
          // formData.append('logo', file, relativePath);
          //
          //  // Headers
          // const headers = new HttpHeaders({
          //   'security-token': 'mytoken'
          // });
          //
          // this.http.post('https://mybackend.com/api/upload/sanitize-and-save-logo', formData, { headers, responseType: 'blob' })
          //  .subscribe(data => {
          //   // Sanitized logo returned from backend
          // });

        });
      } else {
        // It was a directory (empty directories are added, otherwise only files)
        const fileEntry = droppedFile.fileEntry as FileSystemDirectoryEntry;
        console.log(droppedFile.relativePath, fileEntry);
      }
    }
  }

  public fileOver(event): void {
    console.log(event);
  }

  public fileLeave(event): void {
    console.log(event);
  }

  async init(): Promise<void> {
    await this.model.initialize();

    // First MIDI Set
    // await this.loadMeanForCategory('beauty', this.midiFilesBeauty);
    // await this.loadMeanForCategory('dark', this.midiFilesDark);
    // await this.loadMeanForCategory('hiphop', this.midiFilesHiphop);
    // await this.loadMeanForCategory('neosoul', this.midiFilesNeosoul);
    // await this.loadMeanForCategory('mozart', this.midiFilesMozart);

    // Niko MIDI Set
    await this.loadMeanForCategory('catchy', midiFilesCatchy);
    await this.loadMeanForCategory('dark', midiFilesDark);
    await this.loadMeanForCategory('edm', midiFilesEDM);
    await this.loadMeanForCategory('emotional', midiFilesEmotional);
    await this.loadMeanForCategory('pop', midiFilesPop);
    await this.loadMeanForCategory('rnb', midiFilesRnB);

    // 16Bar Niko MIDI Set
    // await this.loadMeanForCategory('catchy', midiFilesCatchy16Bar);
    // await this.loadMeanForCategory('dark', midiFilesDark16Bar);
    // await this.loadMeanForCategory('edm', midiFilesEDM16Bar);
    // await this.loadMeanForCategory('emotional', midiFilesEmotional16Bar);
    // await this.loadMeanForCategory('pop', midiFilesPop16Bar);

    // this.selectedAttribute = this.sliders[0].category;
  }

  async loadMeanForCategory(category: string, midiFilesUrl: string[]): Promise<void> {
    const melodies: NoteSequence[] = [];
    for (const midi of midiFilesUrl) {
      const sequence = await urlToNoteSequence(midi);
      melodies.push(sequence);
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

    // Prints Variances
    // console.log(category + ' Variance:');
    // this.attributeVectorService.printVarianceFor(z, attributeVectorZMean as tf.Tensor2D);

    z.dispose();
  }

  async sampleNewSequence(): Promise<void> {
    // TODO: isInitialized Abfrage

    // Sampling manual a random Z value via tf.randomNormal() function - z-value necessary for attribute vector manipulation
    const randomZ: tf.Tensor2D = tf.tidy(() => tf.randomNormal([1, this.model.zDims]));
    console.log('Sample:');
    console.log(randomZ.toString(true));
    const sequence = await this.model.decode(randomZ, this.temperature);
    this.currentZValue = randomZ;
    this.currentNoteSequence = sequence;
    this.showSequenceToUI(sequence);
    this.resetAllSlider();

    // Sample with a 3DTensor as output (One-Hot output)
    // this.model.
    // sampleTensors(1, 1.0)
    //   .then((sample) => {
    //     console.log(sample.toString(true));
    //   });
  }

  playSequence(): void {
    if (this.player.isPlaying()) {
      this.isPlaying = false;
      this.player.stop();
    } else {
      this.isPlaying = true;
      this.player.start(this.visualizer.noteSequence).then(() => {
        console.log('Played');
        this.isPlaying = false;
      });
    }
  }

  openMidiFile(): void {
    this.isLoading = true;

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
    this.isLoading = false;
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

    const callbackObject = {
      run: (note: NoteSequence.Note) => {
        this.visualizer.redraw(note);
      },
      stop: () => {}
    };

    this.player = new SoundFontPlayer(
      this.SOUNDFONT_URL, undefined, undefined, undefined, callbackObject);
    this.player.loadSamples(sequence[0]).then(() => console.log('Samples loaded.'));
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
