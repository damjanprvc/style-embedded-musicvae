import { TestBed } from '@angular/core/testing';

import { AttributeVectorService } from './attribute-vector.service';

describe('AttributeVectorService', () => {
  let service: AttributeVectorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AttributeVectorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
