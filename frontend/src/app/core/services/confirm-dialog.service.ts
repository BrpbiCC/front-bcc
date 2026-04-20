import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent, type ConfirmDialogData } from '../components/confirm-dialog/confirm-dialog.component';

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  constructor(private readonly dialog: MatDialog) {}

  async confirm(data: ConfirmDialogData): Promise<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data,
      width: '440px',
      maxWidth: '92vw',
      autoFocus: false,
      restoreFocus: true,
      disableClose: true,
      panelClass: 'bcc-confirm-dialog-panel',
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    return !!result;
  }
}
