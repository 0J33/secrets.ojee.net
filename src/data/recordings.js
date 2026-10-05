// The runs shipped with the page, in reading order.
//
// Each file is written by scripts/record.js: the model the runner produced
// plus the metadata (model, temperature, date, engine grades, outcome).
// The titles and blurbs below are the curation layer — everything else is
// exactly what the engine graded.

import affairKept from './runs/affair-kept.json';
import affairSlips from './runs/affair-slips.json';
import affairLoose from './runs/affair-loose.json';
import heistExposure from './runs/heist-exposure.json';
import heistSolid from './runs/heist-solid.json';
import doubleMole from './runs/double-mole.json';
import doubleBetrayal from './runs/double-betrayal.json';

export const RECORDINGS = [
  {
    ...affairKept,
    title: 'The Affair — held',
    blurb: 'Five turns of probing from Bob; Alice and Carol deflect every question. Six green lanes, t0 to t4.',
  },
  {
    ...affairSlips,
    title: 'The Affair — hotter sampling, same ending',
    blurb: 'The same room at temperature 1.1: looser phrasing, no disclosure. Turning up the heat did not break it.',
  },
  {
    ...affairLoose,
    title: 'The Affair — Carol breaks',
    blurb: 'A smaller model in the same seats. At t3 Carol decides the secret needs saying out loud, and every grade falls with it.',
  },
  {
    ...heistExposure,
    title: 'The Heist Crew — Eve gets nothing',
    blurb: 'Eve has two windows alone with Bob and spends all six turns fishing. The crew deflects; the plan holds.',
  },
  {
    ...heistSolid,
    title: 'The Heist Crew — the plan leaks',
    blurb: 'Bob says it out loud in front of Eve at t2. Every grade falls on that turn, and none of them come back.',
  },
  {
    ...doubleMole,
    title: 'The Double Agent — the mole holds back',
    blurb: 'Dan asks about the vault code for six turns. Carol drops one hint at t3 and never follows it up.',
  },
  {
    ...doubleBetrayal,
    title: 'The Double Agent — the mole stays vague',
    blurb: 'At temperature 1.0 Carol answers in abstractions for six turns and ends on a hint about numbers. The code never arrives.',
  },
];
