import { Component, Input, SimpleChanges } from '@angular/core';
import { DataTableService } from '../../../services/data-table-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableDragService } from '../../../services/table-drag-service';
import { CommonService } from '../../../services/common-service';

@Component({
  selector: 'app-data-table-paginator',
  imports: [CommonModule, FormsModule,],
  templateUrl: './data-table-paginator.html',
  styleUrl: './data-table-paginator.css'
})
export class DataTablePaginator {

    constructor(public dataTableService: DataTableService,
                public tblDragService: TableDragService,
                public common: CommonService,) {

    }

    init = true
    totalRowStr = "";
    @Input() totalRows: number = 0;

    ngOnChanges(changes: SimpleChanges){
        if(!this.init && changes){
            if(changes["totalRows"]?.currentValue)
                this.setUpPagi()
        }
    }

    ngOnInit() {
        this.setUpPagi()
        this.init = false
    }

    setUpPagi() {
        this.totalRowStr = this.totalRows.toLocaleString(undefined, { maximumFractionDigits: 0 })
    }

}
