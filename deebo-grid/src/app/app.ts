import { Component } from '@angular/core';
import { DataTableModuleModule } from '../data-table/data-table-module/data-table-module-module';
import { CellEdit } from '../interfaces/cell-edit';

@Component({
  selector: 'app-root',
  imports: [ DataTableModuleModule ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  editable: boolean = true

  handleCellEdit(event: CellEdit) {//use this to hook to your back end for edits
    // console.log(event)
  }
}
