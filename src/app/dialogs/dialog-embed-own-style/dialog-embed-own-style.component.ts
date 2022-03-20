import {Component, OnInit} from '@angular/core';
import {FileSystemDirectoryEntry, FileSystemFileEntry, NgxFileDropEntry} from 'ngx-file-drop';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
  selector: 'app-dialog-embed-own-style',
  templateUrl: './dialog-embed-own-style.component.html',
  styleUrls: ['./dialog-embed-own-style.component.css']
})
export class DialogEmbedOwnStyleComponent implements OnInit {
  public filesToEmbed: NgxFileDropEntry[] = [];
  public filesToEmbedAsFile: File[] = [];
  SNACKBAR_DURATION = 3 * 1000;

  constructor(private snackBar: MatSnackBar) {
  }

  ngOnInit(): void {
  }

  dropped(files: NgxFileDropEntry[]): void {
    // File format check. Only .mid allowed
    const extension = files[0].relativePath.substring(files[0].relativePath.lastIndexOf('.') + 1);
    if (extension.toLowerCase() !== 'mid') {
      this.snackBar.open('ERROR: Only ".mid" file format allowed.', undefined, {
        duration: this.SNACKBAR_DURATION,
      });
      this.filesToEmbed = [];
      this.filesToEmbedAsFile = [];
      return;
    }

    this.filesToEmbed = files;
    this.filesToEmbedAsFile = [];
    for (const droppedFile of files) {

      // Is it a file?
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {

          // Here you can access the real file
          console.log(droppedFile.relativePath, file);
          this.filesToEmbedAsFile.push(file);

        });
      } else {
        // It was a directory (empty directories are added, otherwise only files)
        const fileEntry = droppedFile.fileEntry as FileSystemDirectoryEntry;
        console.log(droppedFile.relativePath, fileEntry);
      }
    }
  }

}
