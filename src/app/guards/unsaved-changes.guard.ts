import { CanDeactivateFn } from '@angular/router';
import { MappingComponent } from '../mapping/mapping.component';

export const unsavedChangesGuard: CanDeactivateFn<MappingComponent> = (component) => {
  if (!component.hasUnsavedChanges) return true;
  return component.confirmLeave();
};
