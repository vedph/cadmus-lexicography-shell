import { TestBed } from '@angular/core/testing';

import { AppLidGenerator } from './app-lid-generator';

describe('AppLidGenerator', () => {
  let service: AppLidGenerator;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppLidGenerator);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
