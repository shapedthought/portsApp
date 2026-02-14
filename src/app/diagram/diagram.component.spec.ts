import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { DiagramComponent } from './diagram.component';

describe('DiagramComponent', () => {
  let component: DiagramComponent;
  let fixture: ComponentFixture<DiagramComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiagramComponent],
      providers: [MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(DiagramComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
