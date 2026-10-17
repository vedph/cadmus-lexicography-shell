// global providers for all the Vitest unit tests (see the test targets in
// angular.json)
import { Provider } from '@angular/core';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';

const providers: Provider[] = [
  // jsdom does not run CSS transitions, and some Material components
  // (e.g. tabs) wait for their end before showing their content
  { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
];

export default providers;
