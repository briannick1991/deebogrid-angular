import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CommonService } from '../../../services/common-service';
import { DataTableService } from '../../../services/data-table-service';

@Component({
  selector: 'app-row-group-menu',
  imports: [CommonModule],
  templateUrl: './row-group-menu.html',
  styleUrls: ['./row-group-menu.css', '../export-component/export-component.css']
})
export class RowGroupMenu {

  optsOpen = false
  @Input() groups: string[] = []
  @Input() enableClear: boolean = false

  constructor(public common: CommonService,
              private dataTableService: DataTableService,
  ) { }

  ngOnInit() {
    this.dataTableService.closeGroupByOpts.subscribe( e => this.optsOpen = e)
  }

  toggleGroupByOpts() {
    this.optsOpen = !this.optsOpen
    if(this.optsOpen)
        setTimeout( () => this.dataTableService.listenToCloseGroupByOpts = true )
  }

  setGrouping(group: string | null) {
    this.dataTableService.currGrouping.next(group)
    if(!group){
      let i = 0
      const len = this.groups.length
      for(i; i < len; i++){
        const el = <HTMLInputElement>document.getElementById("groupby" + this.groups[i])
        if(el)
          el.checked = false
      }
    }
  } 

}
