import { Component, ElementRef, Input, Output, ViewChild, EventEmitter, SimpleChanges, } from '@angular/core';
import { CommonService } from '../../../services/common-service';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DataTableService } from '../../../services/data-table-service';
import { DataRow } from '../../../interfaces/data-row';
import { DataCellComponent } from '../data-cell/data-cell';
import { DataCell } from '../../../interfaces/data-cell';
import { TableDragService } from '../../../services/table-drag-service';

@Component({
  selector: 'app-row-group-panel',
  imports: [CommonModule, DecimalPipe, DataCellComponent],
  templateUrl: './row-group-panel.html',
  styleUrl: './row-group-panel.css'
})
export class RowGroupPanel {

  init = true
  count: number = 0
  verticalRest = 0
  open: boolean = false
  uiGroupValue: string = ""
  elifyGrouping: string = ""
  rows: DataRow[] = [];
  panelData: any[] = []
  tblBot: number = 0
  changedIds: string[] = []
  lastElRowIndex: number = 0;
  panelHeight: string = "400px"
  @Input() horizRest = 0
  @Input() groupValue: string = ""
  @Input() colWid: string = ""
  @Input() useRowWid: string = ""
  @Input() rowBuffer: number = 0
  @Input() editable: boolean = false
  @Input() columns: string[] = []
  @Output("openEvt") openEvt: EventEmitter<string> = new EventEmitter()
  @Output("horizPos") horizPos: EventEmitter<number> = new EventEmitter()
  @Output("cellEdit") cellEdit: EventEmitter<any> = new EventEmitter()
  @ViewChild("panelDataGrid") panelDataGrid!: ElementRef<HTMLElement>;

  constructor(private common: CommonService,
              private tblDragService: TableDragService,
              public dataTableService: DataTableService,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if(!this.init && this.open && changes){
      if(changes["horizRest"]?.currentValue)
        this.setHorizScrPos()
    }
  }

  ngOnInit() {
    this.uiGroupValue = this.common.titleCase(this.groupValue)
    this.elifyGrouping = this.common.elifyCol(this.groupValue)
    this.count = this.dataTableService.currFilData.filter( d => d[this.dataTableService.currGroup] === this.groupValue).length
    this.dataTableService.gridScrollEndWhileGrouped.subscribe( e => { this.setTblBot() })
    this.dataTableService.gridEventWhileGrouped.subscribe( e => { 
      const nowOpen = this.open
      this.rows = []
      this.panelData = []
      this.open = false 
      this.count = this.dataTableService.currFilData.filter( d => d[this.dataTableService.currGroup] === this.groupValue).length
      if(nowOpen)
        setTimeout( () => { this.openGroup() })
    })//just close
    this.init = false;
  }

  openGroup() {
    this.open = !this.open
    if(!this.open){
      this.rows = []
      this.panelData = []
    } else {
      this.panelData = this.dataTableService.currFilData.filter( d => d[this.dataTableService.currGroup] === this.groupValue)
      this.count = this.panelData.length
      let n = 0
      let init = 20;
      const addCell = (text: any, prop: string | null, row: DataRow | null) => {
          if(prop && row){
              const useProp = this.dataTableService.dataFilSrtTracker[prop]
              const notNum = (this.dataTableService.figureFilterType(prop) != "number" || /(year|yr|fy)/g.test(prop.toLocaleLowerCase())) ? true : false
              const useTxt = this.dataTableService.figureCellText(text, notNum, useProp["colCellSymbol"])
              row.cells?.push({
                column: prop,
                rawText: text,
                freeze: useProp.freeze,
                minimized: useProp.minimize,
                editable: this.editable,
                width: useProp.colWidth || this.colWid,
                dataType: this.dataTableService.figureFilterType(prop),
                text: (useTxt.prop === "textContent" ? useTxt.value : ""),
                html: (useTxt.prop !== "textContent" ? useTxt.value : ""),
              })
          }
      }
      const limit = Math.min(init, this.count)
      const colLen = this.columns.length
      for(n; n < limit; n++){
        const item = this.panelData[n]
        const index = this.dataTableService.findObjIndxInData(item)
        if(index > -1){
          this.rows.push({ id: "dataTableRow" + index, index: index, width: this.useRowWid, cells: [] })
          let k = 0
          for(k; k < colLen; k++){
            const col = this.columns[k]
            addCell(item[col], col, this.rows[n])
          }
        }
      }
      this.setLastRowIndex()
      setTimeout( () => { 
          this.setDataRowHgts() 
          if(this.count > init){
              let z = this.lastElRowIndex + 1
              const phund = (z+this.rowBuffer)
              const goTo = Math.min(this.count, phund)
              for(z; z < goTo; z++){
                const index = this.dataTableService.findObjIndxInData(this.panelData[z])
                if(index > -1)
                  this.rows.push({ id: "dataTableRow" + index, index: index, width: this.useRowWid, cells: [], height: "78px" })
              }
              this.setLastRowIndex()
          }
          this.setHorizScrPos()
          this.openEvt.emit("row-group-panel-" + this.elifyGrouping)
          setTimeout( () => { this.setTblBot() })
        }, 250)
      }
    }

  setTblBot() {
    if(this.panelDataGrid)
      this.tblBot = (this.panelDataGrid.nativeElement.getBoundingClientRect().bottom || 0) + 250
  }
    
  setHorizScrPos() {
      const body = this.panelDataGrid?.nativeElement
      if(body)
        body.scrollLeft = this.horizRest
  }

  setDataRowHgts() {
      let i = 0;
      const rows = document.getElementsByClassName("rows-for-" + this.elifyGrouping)
      const rLen = rows.length
      if(rLen){
          for(i; i < rLen; i++){
              const row = rows[i]
              const strtrowH = row.getBoundingClientRect().height;
              let rHgt = parseInt(strtrowH?.toString() || "80px")
              this.rows[i].height = rHgt + "px"
          } 
      }
  }

  setLastRowIndex() {
      this.lastElRowIndex = (this.rows.length - 1)
      return this.lastElRowIndex;
  }

  handleScroll(event: any) {
    const top = event.target.scrollTop
    const left = event.target.scrollLeft
    /*horiz scroll*/
    if(left !== this.horizRest){
      this.horizRest = left
      this.horizPos.emit(left)
    }
    /*horiz scroll*/
    /*vert scroll*/
    if(top === this.verticalRest)
        return;
    this.execVertScroll(this.columns, this.columns.length)
    this.verticalRest = top
    this.checkLastRowAdded()
    if(top%10 === 0)
      this.setDataRowHgtsById()
    /*vert scroll*/
  }

  addCell(text: any, prop: string): DataCell {
      const useProp = this.dataTableService.dataFilSrtTracker[prop]
      const notNum = (this.dataTableService.figureFilterType(prop) != "number" || /(year|yr|fy)/g.test(prop.toLocaleLowerCase())) ? true : false
      const useTxt = this.dataTableService.figureCellText(text, notNum, useProp["colCellSymbol"])
      return {
          column: prop,
          rawText: text,
          editable: this.editable,
          dataType: this.dataTableService.figureFilterType(prop),
          freeze: useProp.freeze,
          minimized: useProp.minimize,
          width: useProp.colWidth,
          text: useTxt.prop === "textContent" ? useTxt.value : "",
          html: useTxt.prop !== "textContent" ? useTxt.value : "",
      }
  }

  execVertScroll(cols: string[], colLen: number) {
      let changed = 0
      const els = this.rows.filter( r => !r.cells?.length)
      while(changed <= 7){
          const el = document.getElementById(els[changed]?.id)
          const elRect = el?.getBoundingClientRect()
          if(el && elRect && elRect.bottom < this.tblBot){
              let k = 0
              const id = parseInt(el.id.replace(/dataTableRow/g, ""))
              const item = this.dataTableService.mainData[id]
              const row = this.rows.find(r => r.index === id)
              if(item && row && !row.cells?.length){
                  let cells: DataCell[] = []
                  for(k; k < colLen; k++){
                      const col = cols[k]
                      const cell = this.addCell(item[col], col)
                      if(typeof cell !== "string")
                          cells.push(cell)
                  }
                  row.height = ""
                  row.cells = [...cells]
                  this.changedIds.push(row.id)
              }
          }
          changed += 1
      }
      /*vert scroll*/
  }

  setDataRowHgtsById() {
      const rLen = this.changedIds.length
      for(var i = rLen; i >= 0; i--){
          const id = this.changedIds[i]
          const row = this.rows.find( r => r.id === id)
          if(row){
              const strtrowH = document.getElementById(id)?.getBoundingClientRect().height;
              let rHgt = parseInt(strtrowH?.toString() || "80px")
              row.height = Math.ceil(rHgt) + "px"
              this.changedIds.pop()
          }
      }
  }

  checkLastRowAdded() {
      const dtr = "dataTableRow"
      const len = this.panelData.length
      const els = document.getElementsByClassName("rows-for-" + this.elifyGrouping)
      const eLen = els.length
      const last  = els[(eLen-1)]
      if(last && this.rows.length < (len - 1)){
          const bds = last.getBoundingClientRect()
          if(bds.top < (this.tblBot + 300)){
              let z = this.lastElRowIndex + 1
              const phund = (z+this.rowBuffer)
              const goTo = Math.min(len, phund)
              for(z; z < goTo; z++){
                  const index = this.dataTableService.findObjIndxInData(this.panelData[z])
                  if(index > -1)
                    this.rows.push({ id: dtr + index, index: index, width: this.useRowWid, cells: [], height: "78px" })
              }
              this.setLastRowIndex()
          }
      }
  }

  execCellEdit(event: any) {//{ element: el, column: this.cell.column, value: val }
    this.cellEdit.emit(event)
  }

  setSingleRowHgt(val: any, row?: any) {
      if(val && typeof val === "string")
          val = Math.ceil(parseInt(val))
      const rHgt = val
      const useHgt = Math.floor(rHgt) + "px";
      if(typeof row === "string" && this.tblDragService.colDragStartFrmCellTracker.row && this.tblDragService.colDragStartFrmCellTracker.ystart){
          const drow = this.rows.find( r => r.id === row)
          if(drow)
              drow.height = useHgt
      }
  }


}
