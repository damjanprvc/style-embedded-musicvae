# ReStyle-MusicVAE - Style Embedded Google MusicVAE

[![Demo](https://img.shields.io/badge/Web-Demo-blue)](https://restyle-musicvae.web.app)
[![Paper](https://img.shields.io/badge/Paper-3511047.3536412-red)](https://dl.acm.org/doi/10.1145/3511047.3536412)

## Abstract
Deep generative models have emerged as one of the most actively researched topics in artificial intelligence. An area that draws increasing attention is the automatic generation of music, with various applications including systems that support and inspire the process of music composition. For these assistive systems, in order to be successful and accepted by users, it is imperative to give the user agency and express their personal style in the process of composition.

In this paper, we demonstrate ReStyle-MusicVAE, a system for human-AI co-creation in music composition. More specifically, ReStyle-MusicVAE combines the automatic melody generation and variation approach of MusicVAE and adds semantic control dimensions to further steer the process. To this end, expert-annotated melody lines created for music production are used to define stylistic anchors, which serve as semantic references for interpolation. We present an easy-to-use web app built on top of the Magenta.js JavaScript library and pre-trained MusicVAE checkpoints.

For more details, please see:
"[ReStyle-MusicVAE: Enhancing User Control of Deep Generative Music Models with Expert Labeled Anchors](https://dl.acm.org/doi/10.1145/3511047.3536412)", [Damjan Prvulovic](https://damjanprvulovic.vercel.app/), [Richard Vogl](https://www.ifs.tuwien.ac.at/~vogl/), [Peter Knees](https://www.ifs.tuwien.ac.at/~knees/). ACM, 2022. If you use ideas or code from this work, please cite our paper:

```BibTex
@inproceedings{10.1145/3511047.3536412,
author = {Prvulovic, Damjan and Vogl, Richard and Knees, Peter},
title = {ReStyle-MusicVAE: Enhancing User Control of Deep Generative Music Models with Expert Labeled Anchors},
year = {2022},
isbn = {9781450392327},
publisher = {Association for Computing Machinery},
address = {New York, NY, USA},
url = {https://doi.org/10.1145/3511047.3536412},
doi = {10.1145/3511047.3536412},
booktitle = {Adjunct Proceedings of the 30th ACM Conference on User Modeling, Adaptation and Personalization},
pages = {63–66},
numpages = {4},
keywords = {user control, variational auto encoder, music generation},
location = {Barcelona, Spain},
series = {UMAP '22 Adjunct}
}
```

## How to run

The project relies on pretrained MusicVAE checkpoints. The checkpoints can either be used local or the hosted by Google Magenta ones.
Select the appropriate option in the `composer.components.ts` file. (Go to https://goo.gl/magenta/musicvae-checkpoints to see all checkpoint urls)

Run as usual: `ng serve`

----

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 10.2.0.

## Install The Angular CLI

`npm install -g @angular/cli`
Additionaly for Windows machines, run this: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
