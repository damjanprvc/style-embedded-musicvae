import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MidimeComponent } from './midime.component';

describe('MidimeComponent', () => {
  let component: MidimeComponent;
  let fixture: ComponentFixture<MidimeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MidimeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MidimeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
