import { Component, OnInit } from '@angular/core';
import {DialogInfoComponent} from '../../dialogs/dialog-info/dialog-info.component';
import {MatDialog} from '@angular/material/dialog';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {

  constructor(public dialog: MatDialog) { }

  ngOnInit(): void {
  }

  onInfoClick(): void {
    const dialogRef = this.dialog.open(DialogInfoComponent);
  }
}
