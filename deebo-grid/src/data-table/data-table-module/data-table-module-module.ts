import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { DataTableService } from '../../services/data-table-service';
import { CommonService } from '../../services/common-service';
import { TableDragService } from '../../services/table-drag-service';
import { DataCellComponent } from './data-cell/data-cell';
import { DataTableHeader } from './data-table-header/data-table-header';
import { DataTablePaginator } from './data-table-paginator/data-table-paginator';
import { DeebodataDataTableComponent } from './deebodata-data-table-component/deebodata-data-table-component';
import { ExportComponent } from './export-component/export-component';
import { RowGroupMenu } from './row-group-menu/row-group-menu';
import { RowGroupPanel } from './row-group-panel/row-group-panel';



@NgModule({
  declarations: [ ],
  imports: [
    CommonModule,
    DeebodataDataTableComponent,
    DataTableHeader,
    DataCellComponent,
    DataTablePaginator,
    RowGroupMenu,
    RowGroupPanel,
    ExportComponent,
  ],
  providers: [ 
    CommonService,
    DataTableService, 
    TableDragService, 
  ],
  exports: [ 
    DeebodataDataTableComponent, 
  ]
})
export class DataTableModuleModule { }
