import { Injectable } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import {MusicVAE} from '@magenta/music/es6/music_vae';
import {PianoRollCanvasVisualizer, sequences, urlToNoteSequence} from '@magenta/music/es6/core';
import {tensorflow} from '@magenta/music/es6/protobuf/proto';
import INoteSequence = tensorflow.magenta.INoteSequence;
import NoteSequence = tensorflow.magenta.NoteSequence;
// import * as fs from 'fs';

@Injectable({
  providedIn: 'root'
})
export class AttributeVectorService {
  // files = fs.readdirSync('../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION');
  midiFilesBeauty = [
    '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/1a.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/1b.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/2a.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/2b.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/3.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/4a.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/4b.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/5a.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/5b.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/6a.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/6b.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/7a.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_BEAUTY_EMOTION/7b.mid',
  ];

  midiFilesDark = [
    '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/1a.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/1b.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/2a.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/2b.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/3a.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/4a.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/4b.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/5a.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/6a.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/7a.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_DARK_SAD/7b.mid',
  ];

  midiFilesHiphop = [
    '../../../assets/midi/CMaj(AMin)_MELODY_HIPHOP/1.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_HIPHOP/2.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_HIPHOP/3.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_HIPHOP/4a.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_HIPHOP/4b.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_HIPHOP/5a.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_HIPHOP/5b.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_HIPHOP/6a.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_HIPHOP/6b.mid',
    '../../../assets/midi/CMaj(AMin)_MELODY_HIPHOP/7.mid',
  ];

// sequencesBeautyDecoded = null;
  sequencesBeauty: INoteSequence[] = [];
  private sequencesDark: INoteSequence[] = [];
  private sequencesHiphop: INoteSequence[] = [];
  attributeVectorsZMeanMap = new Map<string, tf.Tensor>();

  constructor() { }

  async getAttributeVectorsForModel(model: MusicVAE): Promise<Map<string, tf.Tensor>> {

    for (const midi of this.midiFilesBeauty) {
      const sequence = await urlToNoteSequence(midi);
      const quantizedSequence = sequences.quantizeNoteSequence(sequence, 4);
      this.sequencesBeauty.push(quantizedSequence);
    }

    for (const midi of this.midiFilesDark) {
      const sequence = await urlToNoteSequence(midi);
      const quantizedSequence = sequences.quantizeNoteSequence(sequence, 4);
      this.sequencesDark.push(quantizedSequence);
    }

    for (const midi of this.midiFilesHiphop) {
      const sequence = await urlToNoteSequence(midi);
      const quantizedSequence = sequences.quantizeNoteSequence(sequence, 4);
      this.sequencesHiphop.push(quantizedSequence);
    }

    // console.log(this.sequencesBeauty);

    // Encode the given Sequences[] & return tensor Zs
    const tensorZsBeauty = await model.encode(this.sequencesBeauty);
    const tensorZsDark = await model.encode(this.sequencesDark);
    const tensorZsHiphop = await model.encode(this.sequencesHiphop);
    // tensorZsHiphop.print(true);
    // console.log(JSON.stringify(tensorZsHiphop.arraySync()));

    const attributeVectorZMeanBeauty = tensorZsBeauty.mean(0, true);
    const attributeVectorZMeanDark = tensorZsDark.mean(0, true);
    const attributeVectorZMeanHiphop = tensorZsHiphop.mean(0, true);
    // attributeVectorZMeanHiphop.print(true);
    // console.log(JSON.stringify(attributeVectorZMeanHiphop.arraySync()));

    this.attributeVectorsZMeanMap.set('beauty', attributeVectorZMeanBeauty);
    this.attributeVectorsZMeanMap.set('dark', attributeVectorZMeanDark);
    this.attributeVectorsZMeanMap.set('hiphop', attributeVectorZMeanHiphop);

    console.log('Beauty Variance:');
    this.printVarianceFor(tensorZsBeauty, attributeVectorZMeanBeauty as tf.Tensor2D);
    console.log('Dark Variance:');
    this.printVarianceFor(tensorZsDark, attributeVectorZMeanDark as tf.Tensor2D);
    console.log('HipHop Variance:');
    this.printVarianceFor(tensorZsHiphop, attributeVectorZMeanHiphop as tf.Tensor2D);

    // Decode tensor z & return sequence
    // const sequenceDecoded = await model.decode(tensorZs);
    // console.log(sequenceDecoded);
    // this.sequencesBeautyDecoded = sequenceDecoded;

    return this.attributeVectorsZMeanMap;
  }

  printVarianceFor(inputZs: tf.Tensor2D, mean: tf.Tensor2D): void {

    // Abweichung vom Mittelwert/Mean
    const difference = inputZs.sub(mean);
    const squaredDifference = tf.pow(difference, 2);
    const sumPerDimension = tf.sum(squaredDifference, 0, true);
    const variancePerDimension = sumPerDimension.div(inputZs.shape[0] - 1);
    const meanVariance = variancePerDimension.mean(1);

    // squaredDifference.print(true);
    // sumPerDimension.print(true);
    console.log('Variance per dimension:');
    variancePerDimension.print(true);
    console.log('Mean Variance/Mittlere Varianz - Durchschnitt aller Dimensionen:');
    meanVariance.print(true);

  }
}
