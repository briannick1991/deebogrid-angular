import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeebodataDataTableComponent } from './deebodata-data-table-component';

describe('DeebodataDataTableComponent', () => {
  let component: DeebodataDataTableComponent;
  let fixture: ComponentFixture<DeebodataDataTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeebodataDataTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeebodataDataTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
