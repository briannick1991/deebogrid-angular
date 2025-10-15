import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { DataCell } from '../../../interfaces/data-cell';
import { CommonService } from '../../../services/common-service';
import { TableDragService } from '../../../services/table-drag-service';
import { CommonModule } from '@angular/common';
import { DataTableService } from '../../../services/data-table-service';

@Component({
  selector: 'app-data-cell',
  imports: [CommonModule],
  templateUrl: './data-cell.html',
  styleUrl: './data-cell.css'
})
export class DataCellComponent {

  constructor(public tblDragService: TableDragService,
              private dataTableService: DataTableService,
              private common: CommonService,) {

  }

  init = true
  elCol: string = ""
  cellStyle: any = {}
  @Input() rawText: any;
  @Input() cell!: DataCell;
  @Input() rowId: string = "";//starts with dataTableRow
  @Input() colWid: string = "";
  @Input() rowHeight: string = "";
  @Input() noColResize: boolean = false;
  @Output("width") width: EventEmitter<number> = new EventEmitter()
  @Output("height") height: EventEmitter<any> = new EventEmitter()
  @Output("edit") edit: EventEmitter<any> = new EventEmitter()
  @ViewChild('cellEl', { static: true }) cellElem!: ElementRef<HTMLElement>
  rightAlign: string = "";//for numbers, always add a space in front
  symbolCls: string = "";//also for numbers only, always add a space in front

  ngOnChanges() {
    if(!this.init)
      this.applyDimensions()
  }

  ngOnInit() {
    if(this.cell.column)
      this.elCol = this.common.elifyCol(this.cell.column) 
    this.rightAlign = this.cell.dataType === "number" ? " data-cell-riiight" : "";
    this.init = false
    this.tblDragService.cellDims.subscribe( d => { this.updateUiColCellTheme(d.prop, d.value) })
  }

  ngAfterViewInit() {
    this.applyDimensions()
    if(this.cell.text || this.cell.html){
      this.setCellText()
      setTimeout( () => {
        const sym = this.dataTableService.dataFilSrtTracker[this.cell.column]["colCellSymbol"];
        if(sym){
            this.symbolCls = ["$","€","£","¥","₣","₹"].indexOf(sym) > -1 ? " has-symbol-b" : " has-symbol";
            this.cellElem.nativeElement.setAttribute("data-symbol", sym)
        }
      })
    }
  }

  setCellText() {
    const cell = this.cellElem.nativeElement
    if(this.cell.text && !cell.textContent)
      cell.textContent = this.cell.text
    if(this.cell.html && !cell.innerHTML)
      cell.innerHTML = this.cell.html
  }

  applyDimensions() {
    this.cellStyle = { "width": (this.cell.width || this.colWid), "height": this.rowHeight }
    setTimeout( () => this.setHeight())
  }

  updateUiColCellTheme(cssProp: string, val: number) {
      const rProp = this.common.replaceUniSep(this.tblDragService.currColForDataRow)
      if(cssProp === "height" && (this.cell.column === this.tblDragService.currColForDataRow || this.cell.column === rProp) && 
      this.tblDragService.currDataRow.id === this.rowId)
        this.height.emit(val)
      const prop = this.common.replaceUniSep(this.dataTableService.currColumnEdit)
      if(prop && this.dataTableService.dataFilSrtTracker[prop]){
          if(cssProp === "width"){
              this.dataTableService.dataFilSrtTracker[prop].colWidth = (val || parseInt(this.colWid)).toString() + "px"
              this.width.emit(val || parseInt(this.colWid))
          }    
      }
  }

  setHeight() {
    const cell = this.cellElem.nativeElement
    const txt = cell.textContent
    if(txt){
        const nHgt = parseInt(this.rowHeight.replace(/[ ]?px/g, ""))
        if(cell && cell.scrollHeight <= nHgt)
            cell["style"]["paddingTop"] = Math.floor((nHgt-30-cell.scrollHeight)/2) + "px";
        else
            cell["style"].removeProperty("padding-top")
    }
  }

  handleColResDblClick(prop: string) {
    if(this.dataTableService.dataFilSrtTracker[prop]){
          let i = 0
          let wids = []
          let useWid = 50
          const elCol = this.common.elifyCol(prop)
          const els = document.getElementsByClassName("data-cell-" + elCol)
          const len = els.length
          for(i; i < len; i++)
              wids.push(els[i].scrollWidth)
          useWid =wids.sort()[(len-1)]
          const cswid = (Math.max(useWid+1))
          this.dataTableService.currColumnEdit = elCol
          this.updateUiColCellTheme("width", cswid)
          setTimeout( () => this.dataTableService.currColumnEdit = null)
      }
  }

  setCellToEdit() {
      if(this.tblDragService.didResizeOnEvent || !this.cell.editable)
          return//not editable or was really a drag event, not click
      this.dataTableService.currEditIndex = parseInt(this.rowId.replace(/^dataTableRow/, ""))
  }

  emitEdit() {
    if(!this.cell.editable)
        return;
    const el = this.cellElem.nativeElement
    const val = el.textContent
    if(val !== this.rawText)
      this.edit.emit({ element: el, column: this.cell.column, value: val })
  }

}
