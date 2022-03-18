import {Component, OnInit} from '@angular/core';
import {MidiMe, MusicVAE} from '@magenta/music/es6/music_vae';
import {logging, PianoRollSVGVisualizer, sequences, SoundFontPlayer, urlToNoteSequence} from '@magenta/music/es6/core';
import {INoteSequence} from '@magenta/music';
import * as tf from '@tensorflow/tfjs';
import {NoteSequence} from '@magenta/music/es6';
import {AttributeVectorService} from '../../services/attribute-vector.service';


@Component({
  selector: 'app-midime',
  templateUrl: './midime.component.html',
  styleUrls: ['./midime.component.css']
})
export class MidimeComponent implements OnInit {

  SOUNDFONT_URL = 'https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus';
  modelCheckpoint = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small';
  // modelCheckpoint = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_med_q2';
  // Trained with a strong prior (low KL divergence), which is better for sampling.
  // modelCheckpoint = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_med_lokl_q2';
  MEL_BARS = 2;
  mvae = new MusicVAE(this.modelCheckpoint);
  midime = new MidiMe({epochs: 100});
  player: SoundFontPlayer = null;
  visPlayer = null;
  visualizer = null;
  svgId = 'svg_visualizer';
  currentNoteSequence: INoteSequence[] = null;
  i = 1;

  // Where we will store the loaded input so that we can train on it.
  inputMelodies: NoteSequence[] = [];

  fileName: string;

  attributeVectorZ = null;
  attributeVectorsZMeanMap = new Map<string, tf.Tensor>();
  public sliders: Array<{category: string, value: number, mean: tf.Tensor}> = [];
  public previousSlidersState: Array<{category: string, value: number}> = [];
  selectedAttribute: string;

  isLoading = false;

  private currentZValue;

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
  // midiFilesBeautyOctave = [
  //   '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION_OCTAVE/1.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION_OCTAVE/2.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION_OCTAVE/3.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION_OCTAVE/4.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION_OCTAVE/5.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION_OCTAVE/6.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION_OCTAVE/7.mid',
  // ];
  //
  // midiFilesDarkOctave = [
  //   '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD_OCTAVE/1.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD_OCTAVE/2.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD_OCTAVE/3.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD_OCTAVE/4.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD_OCTAVE/5.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD_OCTAVE/6.mid',
  //   '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD_OCTAVE/7.mid',
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

  midiFilesCatchy = [
    '../../../assets/midi/Nikos_Melodies/Catchy_Melody/Catchy_Melody_1.mid',
    '../../../assets/midi/Nikos_Melodies/Catchy_Melody/Catchy_Melody_2.mid',
    '../../../assets/midi/Nikos_Melodies/Catchy_Melody/Catchy_Melody_3.mid',
    '../../../assets/midi/Nikos_Melodies/Catchy_Melody/Catchy_Melody_4.mid',
    '../../../assets/midi/Nikos_Melodies/Catchy_Melody/Catchy_Melody_5.mid',
    '../../../assets/midi/Nikos_Melodies/Catchy_Melody/Catchy_Melody_6.mid',
    '../../../assets/midi/Nikos_Melodies/Catchy_Melody/Catchy_Melody_7.mid',
    '../../../assets/midi/Nikos_Melodies/Catchy_Melody/Catchy_Melody_8.mid',
    '../../../assets/midi/Nikos_Melodies/Catchy_Melody/Catchy_Melody_9.mid',
    '../../../assets/midi/Nikos_Melodies/Catchy_Melody/Catchy_Melody_10.mid',
    '../../../assets/midi/Nikos_Melodies/Catchy_Melody/Catchy_Melody_11.mid',
  ];

  midiFilesDark = [
    '../../../assets/midi/Nikos_Melodies/Dark_HipHop_Trap_Melody/Dark_Melody_1.mid',
    '../../../assets/midi/Nikos_Melodies/Dark_HipHop_Trap_Melody/Dark_Melody_2.mid',
    '../../../assets/midi/Nikos_Melodies/Dark_HipHop_Trap_Melody/Dark_Melody_3.mid',
    '../../../assets/midi/Nikos_Melodies/Dark_HipHop_Trap_Melody/Dark_Melody_4.mid',
    '../../../assets/midi/Nikos_Melodies/Dark_HipHop_Trap_Melody/Dark_Melody_5.mid',
    '../../../assets/midi/Nikos_Melodies/Dark_HipHop_Trap_Melody/Dark_Melody_6.mid',
    '../../../assets/midi/Nikos_Melodies/Dark_HipHop_Trap_Melody/Dark_Melody_7.mid',
    '../../../assets/midi/Nikos_Melodies/Dark_HipHop_Trap_Melody/Dark_Melody_8.mid',
    '../../../assets/midi/Nikos_Melodies/Dark_HipHop_Trap_Melody/Dark_Melody_9.mid',
    '../../../assets/midi/Nikos_Melodies/Dark_HipHop_Trap_Melody/Dark_Melody_10.mid',
    '../../../assets/midi/Nikos_Melodies/Dark_HipHop_Trap_Melody/Dark_Melody_11.mid',
    '../../../assets/midi/Nikos_Melodies/Dark_HipHop_Trap_Melody/Dark_Melody_12.mid',
    '../../../assets/midi/Nikos_Melodies/Dark_HipHop_Trap_Melody/Dark_Melody_13.mid',
    '../../../assets/midi/Nikos_Melodies/Dark_HipHop_Trap_Melody/Dark_Melody_14.mid',
    '../../../assets/midi/Nikos_Melodies/Dark_HipHop_Trap_Melody/Dark_Melody_15.mid',
    '../../../assets/midi/Nikos_Melodies/Dark_HipHop_Trap_Melody/Dark_Melody_16.mid',
    '../../../assets/midi/Nikos_Melodies/Dark_HipHop_Trap_Melody/Dark_Melody_17.mid',
    '../../../assets/midi/Nikos_Melodies/Dark_HipHop_Trap_Melody/Dark_Melody_18.mid',
    '../../../assets/midi/Nikos_Melodies/Dark_HipHop_Trap_Melody/Dark_Melody_19.mid',
    '../../../assets/midi/Nikos_Melodies/Dark_HipHop_Trap_Melody/Dark_Melody_20.mid',
  ];

  midiFilesEDM = [
    '../../../assets/midi/Nikos_Melodies/EDM_Melody/EDM_Melody_1.mid',
    '../../../assets/midi/Nikos_Melodies/EDM_Melody/EDM_Melody_2.mid',
    '../../../assets/midi/Nikos_Melodies/EDM_Melody/EDM_Melody_3.mid',
    '../../../assets/midi/Nikos_Melodies/EDM_Melody/EDM_Melody_4.mid',
    '../../../assets/midi/Nikos_Melodies/EDM_Melody/EDM_Melody_5.mid',
    '../../../assets/midi/Nikos_Melodies/EDM_Melody/EDM_Melody_6.mid',
    '../../../assets/midi/Nikos_Melodies/EDM_Melody/EDM_Melody_7.mid',
    '../../../assets/midi/Nikos_Melodies/EDM_Melody/EDM_Melody_8.mid',
    '../../../assets/midi/Nikos_Melodies/EDM_Melody/EDM_Melody_9.mid',
    '../../../assets/midi/Nikos_Melodies/EDM_Melody/EDM_Melody_10.mid',
    '../../../assets/midi/Nikos_Melodies/EDM_Melody/EDM_Melody_11.mid',
  ];

  midiFilesEmotional = [
    '../../../assets/midi/Nikos_Melodies/Emotional_Melody/Emotional_Melody_1.mid',
    '../../../assets/midi/Nikos_Melodies/Emotional_Melody/Emotional_Melody_2.mid',
    '../../../assets/midi/Nikos_Melodies/Emotional_Melody/Emotional_Melody_3.mid',
    '../../../assets/midi/Nikos_Melodies/Emotional_Melody/Emotional_Melody_4.mid',
    '../../../assets/midi/Nikos_Melodies/Emotional_Melody/Emotional_Melody_5.mid',
    '../../../assets/midi/Nikos_Melodies/Emotional_Melody/Emotional_Melody_6.mid',
    '../../../assets/midi/Nikos_Melodies/Emotional_Melody/Emotional_Melody_7.mid',
    '../../../assets/midi/Nikos_Melodies/Emotional_Melody/Emotional_Melody_8.mid',
    '../../../assets/midi/Nikos_Melodies/Emotional_Melody/Emotional_Melody_9.mid',
    '../../../assets/midi/Nikos_Melodies/Emotional_Melody/Emotional_Melody_10.mid',
    '../../../assets/midi/Nikos_Melodies/Emotional_Melody/Emotional_Melody_11.mid',
    '../../../assets/midi/Nikos_Melodies/Emotional_Melody/Emotional_Melody_12.mid',
    '../../../assets/midi/Nikos_Melodies/Emotional_Melody/Emotional_Melody_13.mid',
    '../../../assets/midi/Nikos_Melodies/Emotional_Melody/Emotional_Melody_14.mid',
    '../../../assets/midi/Nikos_Melodies/Emotional_Melody/Emotional_Melody_15.mid',
    '../../../assets/midi/Nikos_Melodies/Emotional_Melody/Emotional_Melody_16.mid',
    '../../../assets/midi/Nikos_Melodies/Emotional_Melody/Emotional_Melody_17.mid',
  ];

  midiFilesPop = [
    '../../../assets/midi/Nikos_Melodies/Pop_Melody/Pop_Melody_1.mid',
    '../../../assets/midi/Nikos_Melodies/Pop_Melody/Pop_Melody_2.mid',
    '../../../assets/midi/Nikos_Melodies/Pop_Melody/Pop_Melody_3.mid',
    '../../../assets/midi/Nikos_Melodies/Pop_Melody/Pop_Melody_4.mid',
    '../../../assets/midi/Nikos_Melodies/Pop_Melody/Pop_Melody_5.mid',
    '../../../assets/midi/Nikos_Melodies/Pop_Melody/Pop_Melody_6.mid',
    '../../../assets/midi/Nikos_Melodies/Pop_Melody/Pop_Melody_7.mid',
    '../../../assets/midi/Nikos_Melodies/Pop_Melody/Pop_Melody_8.mid',
    '../../../assets/midi/Nikos_Melodies/Pop_Melody/Pop_Melody_9.mid',
    '../../../assets/midi/Nikos_Melodies/Pop_Melody/Pop_Melody_10.mid',
    '../../../assets/midi/Nikos_Melodies/Pop_Melody/Pop_Melody_11.mid',
  ];

  midiFilesRnB = [
    '../../../assets/midi/Nikos_Melodies/R&B_Neosoul_Melody/R&B_Melody_1.mid',
    '../../../assets/midi/Nikos_Melodies/R&B_Neosoul_Melody/R&B_Melody_2.mid',
    '../../../assets/midi/Nikos_Melodies/R&B_Neosoul_Melody/R&B_Melody_3.mid',
    '../../../assets/midi/Nikos_Melodies/R&B_Neosoul_Melody/R&B_Melody_4.mid',
    '../../../assets/midi/Nikos_Melodies/R&B_Neosoul_Melody/R&B_Melody_5.mid',
    '../../../assets/midi/Nikos_Melodies/R&B_Neosoul_Melody/R&B_Melody_6.mid',
    '../../../assets/midi/Nikos_Melodies/R&B_Neosoul_Melody/R&B_Melody_7.mid',
    '../../../assets/midi/Nikos_Melodies/R&B_Neosoul_Melody/R&B_Melody_8.mid',
    '../../../assets/midi/Nikos_Melodies/R&B_Neosoul_Melody/R&B_Melody_9.mid',
    '../../../assets/midi/Nikos_Melodies/R&B_Neosoul_Melody/R&B_Melody_10.mid',
    '../../../assets/midi/Nikos_Melodies/R&B_Neosoul_Melody/R&B_Melody_11.mid',
    '../../../assets/midi/Nikos_Melodies/R&B_Neosoul_Melody/R&B_Melody_12.mid',
    '../../../assets/midi/Nikos_Melodies/R&B_Neosoul_Melody/R&B_Melody_13.mid',
    '../../../assets/midi/Nikos_Melodies/R&B_Neosoul_Melody/R&B_Melody_14.mid',
  ];

  constructor(private attributeVectorService: AttributeVectorService) { }

  ngOnInit(): void {
    this.init().then(() => console.log('All set up.'));
  }

  async init(): Promise<void> {
    await this.mvae.initialize();
    await this.midime.initialize();
    await this.train();
    // await this.loadMeanForCategory('beauty', this.midiFilesBeauty);
    // await this.loadMeanForCategory('dark', this.midiFilesDark);
    // await this.loadMeanForCategory('hiphop', this.midiFilesHiphop);
    // await this.loadMeanForCategory('neosoul', this.midiFilesNeosoul);
    // await this.loadMeanForCategory('mozart', this.midiFilesMozart);

    await this.loadMeanForCategory('catchy', this.midiFilesCatchy);
    await this.loadMeanForCategory('dark', this.midiFilesDark);
    await this.loadMeanForCategory('edm', this.midiFilesEDM);
    await this.loadMeanForCategory('emotional', this.midiFilesEmotional);
    await this.loadMeanForCategory('pop', this.midiFilesPop);
    await this.loadMeanForCategory('rnb', this.midiFilesRnB);
    this.selectedAttribute = this.sliders[0].category;

    await this.printEmbeddings('catchy', this.midiFilesCatchy);
    await this.printEmbeddings('dark', this.midiFilesDark);
    await this.printEmbeddings('edm', this.midiFilesEDM);
    await this.printEmbeddings('emotional', this.midiFilesEmotional);
    await this.printEmbeddings('pop', this.midiFilesPop);
    await this.printEmbeddings('rnb', this.midiFilesRnB);
  }

  async loadFiles(): Promise<void> {
    // TODO: Normalize input MIDI to one octave?

    // Input melodies to load and further to train MidiMe on
    // const midiFilesAll = this.midiFilesBeauty.concat(this.midiFilesDark, this.midiFilesHiphop, this.midiFilesNeosoul, this.midiFilesMozart);
    const midiFilesAll = this.midiFilesCatchy.concat(this.midiFilesDark, this.midiFilesEDM, this.midiFilesEmotional, this.midiFilesPop, this.midiFilesRnB);
    // const midiFilesAll = this.midiFilesCatchy.concat(this.midiFilesDark, this.midiFilesEDM, this.midiFilesEmotional);
    // const midiFilesAll = this.midiFilesHiphop.concat(this.midiFilesMozart);

    const melodies = [];
    for (const midi of midiFilesAll) {
      const sequence = await urlToNoteSequence(midi);
      melodies.push(sequence);
    }
    this.inputMelodies = melodies;
    this.showSequenceToUI([sequences.concatenate(melodies)]);

    // const promises = [];
    // midiFilesAll.forEach(item => {
    //   promises.push(urlToNoteSequence(item));
    // });

    // Promise.all(promises).then((melodies) => {
    //   this.inputMelodies = melodies;
    //   // Show all input melodies in one visualisation
    //   this.showSequenceToUI([sequences.concatenate(melodies)]);
    // });
  }

  async train(mel?: NoteSequence[]): Promise<void> {
    const start = performance.now();

    // If no melodies uploaded/loaded, then load files
    if (this.inputMelodies.length === 0) {
      await this.loadFiles();
    }

    // 1. Encode the input into MusicVAE, get back a z.
    const quantizedMels: NoteSequence[] = [];
    this.inputMelodies.forEach((m) => quantizedMels.push(sequences.quantizeNoteSequence(m, 4)));

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
    this.showSequenceToUI([sequences.concatenate(chunks)]);
    // get for every chunk a MusicVAE z value
    const z = await this.mvae.encode(chunks);  // shape of z is [chunks, 256]

    // 2. Use that z as input to train MidiMe.
    // Midime reconstruction of the input melodies before training.
    const z1 = this.midime.predict(z) as tf.Tensor2D; // z1 dim = [chunks, 256]
    const ns1 = await this.mvae.decode(z1);
    this.showSequenceToUI([sequences.concatenate(ns1)]);
    z1.dispose();

    // 3. Train!
    const losses: number[] = [];

    console.log('Training started...');
    // tslint:disable-next-line:no-any
    await this.midime.train(z, async (epoch: number, logs: any) => {
      losses.push(logs.total);
    });

    // 4. Check reconstruction after training.
    const z2 = this.midime.predict(z) as tf.Tensor2D;
    const ns2 = await this.mvae.decode(z2);
    this.showSequenceToUI([sequences.concatenate(ns2)]);
    z2.dispose();

    this.writeTimer(start);

    z.dispose();
    // this.mvae.dispose();
    // this.midime.dispose();
  }

  private writeTimer(startTime: number): void {
    console.log(((performance.now() - startTime) / 1000).toString() + 's');
  }

  private showSequenceToUI(sequence: INoteSequence[]): void {
    this.visualizer = new PianoRollSVGVisualizer(sequence[0], document.getElementById(this.svgId) as unknown as SVGSVGElement);

    const callbackObject = {
      run: (note: NoteSequence.Note) => {
        this.visualizer.redraw(note);
        // See if we need to scroll the container. TODO
        // const containerWidth = container.getBoundingClientRect().width;
        // if (currentNotePosition > (container.scrollLeft + containerWidth)) {
        //   container.scrollLeft = currentNotePosition - 20;
        // }
      },
      stop: () => {}
    };

    this.player = new SoundFontPlayer(
      this.SOUNDFONT_URL, undefined, undefined, undefined, callbackObject);
    this.player.loadSamples(sequence[0]).then(() => console.log('loaded'));
  }

  playSequence(): void {
    if (this.player.isPlaying()) {
      this.player.stop();
    } else {
      this.player.start(this.visualizer.noteSequence).then(() => console.log('played'));
      // this.player.start(this.visualizer.noteSequence).then(() => (button.textContent = playText));
      // button.textContent = 'Stop';
    }
  }

  async sample(): Promise<void> {
    this.resetAllSlider();
    // 5. Sample from MidiMe
    // const sample11 = await this.midime.sample(1) as tf.Tensor2D;
    // const sample12 = await this.midime.sample(1) as tf.Tensor2D;
    // const sample13 = await this.midime.sample(1) as tf.Tensor2D;
    // const sample14 = await this.midime.sample(1) as tf.Tensor2D;
    // const sample15 = await this.midime.sample(1) as tf.Tensor2D;

    // const ns31 = await this.mvae.decode(sample11);
    // const ns32 = await this.mvae.decode(sample12);
    // const ns33 = await this.mvae.decode(sample13);
    // const ns34 = await this.mvae.decode(sample14);
    // const ns35 = await this.mvae.decode(sample15);

    // const midiMeSamples = sequences.concatenate(ns31);
    // this.showSequenceToUI([midiMeSamples]);
    // this.currentNoteSequence = [midiMeSamples];
    // console.log(sample11.toString(true)); // Dim 4 Samples

    const randomZ: tf.Tensor2D = tf.tidy(() => tf.randomNormal([1, this.midime.config.latent_size]));
    const midiMeDecoding = await this.midime.decode(randomZ) as tf.Tensor2D;
    const ns1 = await this.mvae.decode(midiMeDecoding);
    this.currentZValue = randomZ;
    this.currentNoteSequence = ns1;
    this.showSequenceToUI(ns1);

    this.currentZValue.print(true);
    midiMeDecoding.print(true);

    // 5. Sample from MusicVAE.
    // const sample2 = await this.mvae.sample(1);
  }

  async loadMeanForCategory(category: string, midiFilesUrl: string[]): Promise<void> {
    const melodies: NoteSequence[] = [];

    for (const midi of midiFilesUrl) {
      const sequence = await urlToNoteSequence(midi);
      // const quantizedSequence = sequences.quantizeNoteSequence(sequence, 4);
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

    // Get for every chunk a MusicVAE z value
    const z = await this.mvae.encode(chunks);  // shape of z is [chunks, 256]
    const zMidiMe = await this.midime.encode(z); // MidiMe Zs for category snippets
    const attributeVectorZMean = zMidiMe.mean(0, true);
    // this.attributeVectorsZMeanMap.set(category, attributeVectorZMean);
    this.sliders.push({category, value: 0, mean: attributeVectorZMean});
    this.previousSlidersState.push({category, value: 0});

    // Prints Variances
    console.log(category + ' Variance:');
    this.attributeVectorService.printVarianceFor(zMidiMe as tf.Tensor2D, attributeVectorZMean as tf.Tensor2D);

    z.dispose();
    zMidiMe.dispose();
    // attributeVectorZMean.dispose();
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
  //   currentSliderMean.print(true);
  //   const tensorsToInterpolate: tf.Tensor2D = this.currentZValue.concat(currentSliderMean);
  //   tensorsToInterpolate.print(true);
  //
  //   const interpolations: INoteSequence[] = await this.interpolateTensors(tensorsToInterpolate, 6);
  //
  //   this.showSequenceToUI([sequences.concatenate(interpolations)]);
  // }

  // Show interpolation no. {slider.value} between 'sample' to 'category mean'
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
  //   currentSliderMean.print(true);
  //   const tensorsToInterpolate: tf.Tensor2D = this.currentZValue.concat(currentSliderMean);
  //   tensorsToInterpolate.print(true);
  //
  //   const interpolations: INoteSequence[] = await this.interpolateTensors(tensorsToInterpolate, 6);
  //
  //   this.showSequenceToUI([interpolations[currentSliderObj.value]]);
  //
  //   // Reconstruct the current NoteSequence to get current MidiMe z value (Dim: 4)
  //   // const mvaeEncoding = await this.mvae.encode([interpolations[currentSliderObj.value]]);
  //   // this.currentZValue = await this.midime.encode(mvaeEncoding);
  // }

  // Add attribute vector (category mean) to the current sequence
  async onSliderChange(category: string): Promise<void> {
    // this.sliders.forEach(slider => {
    //   console.log(slider.category + '-value: ' + slider.value);
    // });

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
      const outputMidiMeDecoding = await this.midime.decode(zWithAttribute) as tf.Tensor2D;
      const outputSequence: INoteSequence[] = await this.mvae.decode(outputMidiMeDecoding);
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
      const outputMidiMeDecoding = await this.midime.decode(zWithAttribute) as tf.Tensor2D;
      const outputSequence: INoteSequence[] = await this.mvae.decode(outputMidiMeDecoding);
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

  async showAttributeVector(category: string = this.selectedAttribute): Promise<void> {
    const sliderIndex = this.sliders.findIndex(obj => {
      return obj.category === category;
    });
    const attributeVectorsZMeanMidiMe = await this.midime.decode(this.sliders[sliderIndex].mean as tf.Tensor2D);
    const outputMidiMeDecoding = await this.mvae.decode(attributeVectorsZMeanMidiMe as tf.Tensor2D);
    this.currentZValue = this.sliders[sliderIndex].mean;
    this.currentNoteSequence = outputMidiMeDecoding;
    this.showSequenceToUI(outputMidiMeDecoding);
  }

  async interpolateTensors(inputTensors: tf.Tensor2D, numInterps: number, temperature?: number): Promise<INoteSequence[]> {
    const startTime = performance.now();

    const interpZs = tf.tidy(() => this.getInterpolatedZs(inputTensors, numInterps));
    interpZs.print(); // Interpolation Zs
    const outputMidiMeDecoding = await this.midime.decode(interpZs) as tf.Tensor2D;
    const outputSequences = this.mvae.decode(outputMidiMeDecoding, temperature);
    interpZs.dispose();

    outputSequences.then(
      () => logging.logWithDuration(
        'Interpolation completed', startTime, 'My MidiMe',
        logging.Level.INFO));

    return outputSequences;
  }

  private getInterpolatedZs(z: tf.Tensor2D, numInterps: number|number[]): tf.Tensor2D {
    if (typeof numInterps === 'number') {
      numInterps = [numInterps];
    }

    if (z.shape[0] !== 2 && z.shape[0] !== 4) {
      throw new Error(
        'Invalid number of input sequences. Requires length 2, or 4');
    }
    if (numInterps.length !== 1 && numInterps.length !== 2) {
      throw new Error('Invalid number of dimensions. Requires length 1, or 2.');
    }

    const w = numInterps[0];
    const h = numInterps.length === 2 ? numInterps[1] : w;

    // Compute the interpolations of the latent variable.
    const interpolatedZs: tf.Tensor2D = tf.tidy(() => {
      const rangeX = tf.linspace(0.0, 1.0, w);

      const z0 = z.slice([0, 0], [1, z.shape[1]]).as1D();
      const z1 = z.slice([1, 0], [1, z.shape[1]]).as1D();

      if (z.shape[0] === 2) {
        const zDiff = z1.sub(z0) as tf.Tensor1D;
        return tf.outerProduct(rangeX, zDiff).add(z0) as tf.Tensor2D;
      } else if (z.shape[0] === 4) {
        const rangeY = tf.linspace(0.0, 1.0, h);
        const z2 = z.slice([2, 0], [1, z.shape[1]]).as1D();
        const z3 = z.slice([3, 0], [1, z.shape[1]]).as1D();

        const revRangeX = tf.scalar(1.0).sub(rangeX) as tf.Tensor1D;
        const revRangeY = tf.scalar(1.0).sub(rangeY) as tf.Tensor1D;

        let finalZs =
          z0.mul(tf.outerProduct(revRangeY, revRangeX).as3D(h, w, 1));
        finalZs = tf.addStrict(
          finalZs, z1.mul(tf.outerProduct(rangeY, revRangeX).as3D(h, w, 1)));
        finalZs = tf.addStrict(
          finalZs, z2.mul(tf.outerProduct(revRangeY, rangeX).as3D(h, w, 1)));
        finalZs = tf.addStrict(
          finalZs, z3.mul(tf.outerProduct(rangeY, rangeX).as3D(h, w, 1)));

        return finalZs.as2D(w * h, z.shape[1]);
      } else {
        throw new Error(
          'Invalid number of note sequences. Requires length 2, or 4');
      }
    });
    return interpolatedZs;
  }

  private resetAllSlider(): void {
    this.sliders.forEach(slider => {
      slider.value = 0;
    });
    this.previousSlidersState.forEach(slider => {
      slider.value = 0;
    });
  }

  async printEmbeddings(category: string, midiFilesUrl: string[]): Promise<void> {
    const melodies: NoteSequence[] = [];

    for (const midi of midiFilesUrl) {
      const sequence = await urlToNoteSequence(midi);
      // const quantizedSequence = sequences.quantizeNoteSequence(sequence, 4);
      melodies.push(sequence);
    }

    // 1. Encode the input into MusicVAE, get back a z.
    const quantizedMels: NoteSequence[] = [];
    melodies.forEach((m) => quantizedMels.push(sequences.quantizeNoteSequence(m, 4)));

    // 1b. Split this sequence into 2 bar chunks.
    let chunks: NoteSequence[] = [];
    const metaDataNames: string[] = [];
    quantizedMels.forEach((m) => {
      // if you want to split the sequence into 2 bar chunks,
      // then if the sequence has 16th note quantization,
      // that will be 32 steps for each 2 bars (so a chunkSize of 32)
      const length = 16 * this.MEL_BARS; // = 32
      const melChunks = sequences.split(sequences.clone(m), length);
      chunks = chunks.concat(melChunks); // Array of 2 bar chunks

      // Prepare metaData
      for (let j = 1; j <= melChunks.length; j++) {
        metaDataNames.push(j.toString());
      }
    });

    // Prepare metaData
    const metaDataChunkNames = [];
    let x = 0;
    let currentFileName = '';
    // tslint:disable-next-line:prefer-for-of
    for (let j = 0; j < metaDataNames.length; j++) {
      if (metaDataNames[j] !== '1') {
        currentFileName = midiFilesUrl[x - 1].split('\\').pop().split('/').pop();
        metaDataChunkNames.push(currentFileName + '-' + metaDataNames[j]);
        continue;
      }
      x++;
      currentFileName = midiFilesUrl[x - 1].split('\\').pop().split('/').pop();
      metaDataChunkNames.push(currentFileName + '-' + metaDataNames[j]);
    }

    // Get for every chunk a MusicVAE z value
    const z = await this.mvae.encode(chunks);  // shape of z is [chunks, 256]
    const zMidiMe = await this.midime.encode(z); // MidiMe Zs for category snippets
    const attributeVectorZMean = zMidiMe.mean(0, true);

    // Preparing the data for csv writing
    const separator = '\t';
    let csvContent = '';
    // let csvMetaData = 'index' + separator + 'label' + '\r\n';
    let csvMetaData = '';
    // @ts-ignore
    zMidiMe.arraySync().forEach((rowArray, index) => {
      const row = rowArray.join(separator);
      csvContent += row + '\r\n';
      csvMetaData += this.i + separator + category + separator + metaDataChunkNames[index] + '\r\n';
      this.i++;
    });
    // @ts-ignore
    attributeVectorZMean.arraySync().forEach((rowArray, index) => {
      const row = rowArray.join(separator);
      csvContent += row + '\r\n';
      csvMetaData += this.i + separator + category + '_mean' + separator + '0' + '\r\n';
      this.i++;
    });

    console.log(category + ' csvContent:');
    console.log(csvContent);
    console.log(category + ' csvMetaData:');
    console.log(csvMetaData);

    z.dispose();
    zMidiMe.dispose();
  }
}
