import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { ColumnHeader } from '../../../interfaces/column-header';
import { CommonService } from '../../../services/common-service';
import { TableDragService } from '../../../services/table-drag-service';
import { DataTableService } from '../../../services/data-table-service';
import { DataRow } from '../../../interfaces/data-row';
import { DataTableHeader } from '../data-table-header/data-table-header';
import { DataTablePaginator } from '../data-table-paginator/data-table-paginator';
import { DataCellComponent } from '../data-cell/data-cell';
import { CommonModule } from '@angular/common';
import { ExportComponent } from '../export-component/export-component';
import { FormsModule } from '@angular/forms';
import { CellEdit } from '../../../interfaces/cell-edit';
import { DataCell } from '../../../interfaces/data-cell';
import { RowGroupMenu } from '../row-group-menu/row-group-menu';
import { RowGroupPanel } from '../row-group-panel/row-group-panel';
import { ChartsAndGraphs } from '../../charts/charts-and-graphs/charts-and-graphs';

@Component({
  selector: 'app-deebodata-data-table-component',
  imports: [
    DataTableHeader,
    DataCellComponent,
    DataTablePaginator,
    ChartsAndGraphs,
    RowGroupMenu,
    RowGroupPanel,
    ExportComponent,
    CommonModule,
    FormsModule,
  ],
  templateUrl: './deebodata-data-table-component.html',
  styleUrl: './deebodata-data-table-component.css'
})
export class DeebodataDataTableComponent {

    @HostListener('window:click', ['$event'])
    onWindowClick(e: MouseEvent) {
        if(this.listenToWindowCurrFil && this.currFilOpts.length){
            if(e && e.target && (e.target instanceof Element) && (/selfil-/g.test(e.target.className) || /selfil-/g.test(e.target.id))){
            } else {
                this.killSelFilOpts(true)
            }
        }

        if(this.dataTableService.listenToCloseExportOpts){
            if(e && e.target && (e.target instanceof Element) && /deebo-dd-export/g.test(e.target.className)){
            } else {
                this.dataTableService.closeExportOpts.next(false)
                this.dataTableService.listenToCloseExportOpts = false
            }
        }

        if(this.dataTableService.listenToCloseGroupByOpts){
            if(e && e.target && (e.target instanceof Element) && /deebo-dd-groupby/g.test(e.target.className)){
            } else {
                this.dataTableService.closeGroupByOpts.next(false)
                this.dataTableService.listenToCloseGroupByOpts = false
            }
        }
    }

    @HostListener('window:mouseup', ['$event'])
    onWindowMouseUp(e: MouseEvent) {
        if(this.tblDragService.listenForMouseUp){
            this.tblDragService.handleColResMouseUp(e)
            this.dataTableBody?.nativeElement.scrollBy(1, 0)
        }
        if(this.tblDragService.listenForColMvMouseUp)
          this.tblDragService.handleColMoveMouseUp(e)
    }

    @HostListener('window:selectstart', ['$event'])
    onWindowSelectStart(e: Event) {
        if(this.tblDragService.listenForSelectStart)
            this.tblDragService.stopWindowSelection(e)
    }

    @HostListener('window:scroll', ['$event'])
    onWindowScroll(e: Event) {
        this.dataTableService.setTblVertBounds()
        this.dataTableService.setTblHorizBounds()
    }

    @HostListener('window:resize', ['$event'])
    onWindowResize(e: Event) {
        this.dataTableService.setTblVertBounds()
        this.dataTableService.setTblHorizBounds()
    }

    constructor(public dataTableService: DataTableService, 
                private tblDragService: TableDragService,
                public common: CommonService,) {
  
      }

      rows: DataRow[] = [];
      dtChecks: any[] = [];
      verticalRest = 0
      horizRest = 0
      rowBuffer = 50
      useRowWid: string = ""
      currGroupValues: any[] = []
      showCharts = false
      chartHgt: string = ""
      chartState: string = "all"
      columnsForCharts: string[] = []
      paginatorReady = false;
      handlingSelRows = false
      columnOfInterest: string = ""
      hiddenCols: string[] = [];
      desRowHeight: string = "50"
      useColWid: string = "100px"
      currFilOpts: any[] = []
      listenToWindowCurrFil = false
      currDDFilter: string = "";
      topLevelFilter: string = ""
      isScrolling = false
      lockVScroll: boolean = false;
      isMultiFiltering = false;
      ddFilStyle: any = {}
      filterBuildUp: any[] = []
      togSelRows: string = "Selected Rows"
      dTblHeight: number = 500;
      changedIds: string[] = []
      maxCols: number = 0;
      lastElRowIndex: number = 0;
      columnHeaders: ColumnHeader[] = []
      columnNames: string[] = []
      linkCell: any;
      linkCells: any[] = []
      canGroupBy: string[] = []
      @Input() editable: boolean = true;
      @Output("cellEdit") cellEdit: EventEmitter<CellEdit> = new EventEmitter()
      @ViewChild("dataTable", { static: true }) dataTable!: ElementRef<HTMLElement>;
      @ViewChild("dataTableBody", { static: true }) dataTableBody!: ElementRef<HTMLElement>;
      @ViewChild("selFilContainer", { static: true }) selFilContainer!: ElementRef<HTMLElement>;
      @ViewChild("btnTogSelRows", { static: true }) btnTogSelRows!: ElementRef<HTMLButtonElement>;
      @ViewChild("dataTableHeaders", { static: true }) dataTableHeaders!: ElementRef<HTMLElement>;
      @ViewChild("topLevelDataFilter", { static: true }) topLevelDataFilter!: ElementRef<HTMLInputElement>;

      ngOnInit() {
        this.dataTableService.getSampleData().subscribe( data => {
            try{
                let tdata = this.convertNeededCols(data.result)
                this.dataTableService.mainData = tdata.filter( function(d: any) { return true })
                this.dataTableService.currFilData = tdata.filter( function(d: any) { return true })
                this.dataTableService.mainDataLen = this.dataTableService.mainData.length
                this.buildInitUiDataTable(tdata, null, null)//any 2 css colors
                if(!this.dataTableService.errorLoading)
                  this.dataTableService.noDataMsg = "No data to display for this configuration.";
                this.tblDragService.dTblHeightOutput.subscribe( h => this.setTableHeight(h) )
                this.tblDragService.columnMove.subscribe( c => this.processColMove(c) )
                this.dataTableService.currGrouping.subscribe( g => this.processGrouping(g) )
            }catch(e: any) { 
                this.dataTableService.noDataMsg = e.message 
            }
        }
        )
      }

        getAllColsAtRuntime(excludeHidden: any) {
            let cols = (typeof this.dataTableService.mainData[0] === "object" ? Object.keys(this.dataTableService.mainData[0]) : 
            (Object.keys(this.dataTableService.dataFilSrtTracker)));
            if(!excludeHidden)
                return cols;
            return cols.filter( (c: any) => { 
                return !this.dataTableService.dataFilSrtTracker[c].minimize
            });
        }

        setMaxCols() {
            const el = this.dataTable.nativeElement
            if(el){
                const elWid = el.getBoundingClientRect().width;
                return elWid >= 1024 ? 5 : (elWid > 760 ? 3 : 2)
            }
            const wid = window.innerWidth
            return wid >= 1024 ? 5 : (wid > 760 ? 3 : 2)
        }

        getAllColWidth(colLen: any) {
            try{
                if(!colLen || colLen === 0)
                    return 0
                const colWid = parseInt(this.useColWid.replace(/[ ]?px/g, ""))
                let i = 0
                let wid = 0
                for(const prop in this.dataTableService.dataFilSrtTracker){
                    if(this.dataTableService.dataFilSrtTracker[prop].minimize)
                        continue
                    i += 1
                    const ownColWid = this.dataTableService.dataFilSrtTracker[prop].colWidth
                    wid += (ownColWid ? parseInt(ownColWid.replace(/[ ]?px/g, "")) : colWid)
                }
                if(i === colLen)
                    return Math.floor(wid)
                return Math.floor(colWid*colLen)
            }catch(e){ 
                try{
                    return Math.floor(parseInt(this.useColWid.replace(/[ ]?px/g, ""))*colLen)
                }catch(e){
                    return window.innerWidth
                }
            }
        }

        removeAllFreezeCols() {
            const len = this.columnHeaders.length
            const rlen = this.rows.length
            for(var i = (len-1); i >= 0; i--)
                try{this.columnHeaders[i].freeze = false}catch(e){}
            for(var o = (rlen-1); o >= 0; o--){
                try{
                    const row =this.rows[o]
                    const clen = row.cells?.length
                    if(clen && clen > 0){
                        for(var n = (clen-1); n >= 0; n--){
                            const cell = row.cells?.[n]
                            if(cell)
                                cell.freeze = false
                        }
                    }
                }catch(e){}
            }
        }

        setTableHeight(h: number) {
            this.dTblHeight = h
            setTimeout( () => { 
                this.setRowSelChecksPlacement() 
                this.dataTableService.setTblVertBounds()
                this.chartHgt = this.dataTable.nativeElement.getBoundingClientRect().height + "px";
            })
        }

        openCharts() {
            this.showCharts = true
            this.chartHgt = this.dataTable.nativeElement.getBoundingClientRect().height + "px";
            this.columnsForCharts = this.columnHeaders.filter( c => !c.minimized && !this.common.idCol(c.column)).map( c => c.column)
            this.chartState = this.dataTableService.displayOnlySelRows ? 'selected' : 
            (this.dataTableService.currFilData.length !== this.dataTableService.mainDataLen ? 'filtered' : 'all');
        }

        processColMove(event: any) {
            let lfts = event.ls
            let nwColLft = event.nl
            let wantlfts = event.wl
            let xDrop = event.x
            const wLf = wantlfts.indexOf(xDrop)
            if(wLf != lfts.indexOf(nwColLft)){
                const inAft = wLf - 1
                this.columnHeaders = this.columnHeaders.filter( c => this.common.elifyCol(c.column) !== this.dataTableService.currColumnEdit)
                const rwCol = this.common.replaceUniSep(this.dataTableService.currColumnEdit)
                const addCol: ColumnHeader = { column: rwCol, width: (this.dataTableService.dataFilSrtTracker[rwCol]["colWidth"] || this.useColWid), 
                    hideMinCol: false, freeze: false, minimized: false, dataType: this.dataTableService.figureFilterType(rwCol) }
                if(inAft === -1){//they want it first
                    this.columnHeaders.unshift(addCol)
                } else {
                    if(inAft >= (wantlfts.length - 2)){//last
                        this.columnHeaders.push(addCol)
                    } else {
                        if(this.columnHeaders[inAft])
                            this.columnHeaders.splice((inAft+1), 0, addCol)
                    }
                }
                const dtB = this.dataTableBody.nativeElement
                if(dtB){
                    const willSclTo = dtB.scrollLeft
                    this.resetCurrentData()
                    setTimeout( () => { dtB.scrollLeft = willSclTo })
                }
            }
        }

        processGrouping(group: any) {
            if(!group)
                return this.resetCurrentData()
            this.rows = []
            this.dtChecks = []
            this.dataTableService.currSelRows = []
            this.dataTableService.displayOnlySelRows = false
            this.dataTableService.currGroup = group
            this.currGroupValues = this.dataTableService.dataFilSrtTracker[group]?.["selDDVals"]?.filter( (g: any) => g.value !== "(Select All)")
            setTimeout( () => { this.dataTableBody.nativeElement.scrollTop = 0 })
        }

        setColHeaderHgt() {//set hgt = to tallest
            let z = 0; let i = 0; let x = 0
            let hgts = []
            const cols =  document.getElementsByClassName("col-header")
            const cLen = this.columnHeaders?.length
            for(x; x < cLen; x++){
                const col = this.columnHeaders[x]
                col.height = undefined
                col.lineHeight = undefined
            }
            for(z; z < cLen; z++){
                if(cols[z])
                    hgts.push(cols[z].getBoundingClientRect().height)
            }
            const maxHgt = hgts.sort( (a: number,b: number) => a > b ? -1 : 1 )[0]
            const useHgt = Math.ceil(maxHgt)
            for(i; i < cLen; i++){
                const col = this.columnHeaders[i]
                if(col && !col.minimized){
                    col.height = useHgt + "px"
                    const elCol = cols[i]
                    if(elCol && elCol.firstElementChild && elCol.firstElementChild.getBoundingClientRect().height < 40)
                        col.lineHeight = Math.floor(((useHgt/2)-21)) + "px"
                }
            }
            if(this.dataTableHeaders)
                this.dataTableHeaders.nativeElement.style.height = useHgt + "px"
            this.setRowSelChecksPlacement()
        }

      renameColSpecChars(data: any[]) {
          if(data && data.some( function(d) { return d && typeof d === "object" })){
              let specCharCols = []
              if(data[0] && typeof data[0] === "object"){
                  for(const prop in data[0]){
                      if(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/g.test(prop))
                          specCharCols.push(prop) 
                  }
                  let c = 0
                  let i = 0
                  const dlen = data.length
                  const len = specCharCols.length
                  for(c; c < len; c++){
                      const prop = specCharCols[c]
                      const okNwNam = this.common.stripSpecChars(prop)
                      for(i; i < dlen; i++){
                          if(data[i] && typeof data[i] === "object"){
                            const desc = Object.getOwnPropertyDescriptor(data[i], prop)
                            if(desc){
                                try{
                                    Object.defineProperty(data[i], okNwNam, desc);
                                    delete data[i][prop]
                                }catch(e){}
                            }
                          }
                      }
                      i = 0;
                  }
                  return data?.filter( function(d) { return true });
              }
              return data?.filter( function(d) { return true });
          }
          return data?.filter( function(d) { return true });
      }

      scoopOutObjsInObjs(data: any[]) {//scoop out one layer of nested objs
          let i = 0;
          let ndata = []
          const len = data?.length
          if(data && data.some( (d: any) => { return d && typeof d === "object" })){
              for(i; i < len; i++){
                  try{
                      const dta = data[i]
                      if(dta && typeof dta === "object"){
                          let nobj: any = {}
                          for(const prop in dta){
                              const val = dta[prop]
                              if(val && typeof val === "object" && typeof val.getTime === "undefined" && typeof val.filter === "undefined" && Object.keys(val).length){
                                  for(const iprp in val)
                                      nobj[iprp] = val[iprp]
                              } else {
                                  nobj[prop] = val
                              }
                          }
                          ndata.push(nobj)
                      }
                  } catch(e){}
              }
          } else {
              ndata = data?.filter( (d: any) => { return true })
          }
          return ndata;
      }

      convertNeededCols(data: any) {
          data = this.scoopOutObjsInObjs(data)
          data = this.renameColSpecChars(data)
          let nData = data?.filter( function(d: any) { return true })
          const symReg = new RegExp(/[$€£₹¥¢%\,\"\']/, "g")
          const isDtReg = new RegExp(/\d+(\/|-)\d+(\/|-)\d+/)
          let i = 0;
          const len = data?.length
          let allCols: any[] = []
          if(data && data.some( function(d: any) { return d && typeof d === "object" })){
              allCols = this.getDataColumns(data)//gets all possible props in array
              this.dataTableService.dataFilSrtTracker = this.dataTableService.buildDataFilSrtTracker(allCols)
              for(i; i < len; i++){
                  try{
                      if(data[i] && typeof data[i] === "object"){
                          for(const prop in data[i]){
                              const val = data[i][prop]
                              if(val && typeof val === "string"){
                                  const tval = val.trim()
                                  const low = tval.toLocaleLowerCase()
                                  if(this.common.testShortDate(tval) || this.common.testISODate(tval) || this.common.testLongDate(low))
                                      nData[i][prop] = this.common.coerceDate(tval)
                                  if(this.common.testISODate(tval.replace(/ /g, "")))
                                      nData[i][prop] = this.common.coerceDate(tval.replace(/ /g, ""))
                                  if(low === "null" || low === "undefined")
                                      nData[i][prop] = null
                                  if(!this.common.idCol(prop) && !isDtReg.test(tval) && !/[A-Za-z]/g.test(val) && /^[0-9,]+[\.]{0,1}?[0-9,]+$/g.test(tval.replace(symReg, "")) && !isNaN(parseInt(tval.replace(symReg, ""))))//not viewed as num, but can be
                                      nData[i][prop] = /\./g.test(val) ? parseFloat(tval.replace(symReg, "")) : parseInt(tval.replace(symReg, ""))
                              }
                              if(val && typeof val === "object" && typeof val.getTime === "undefined")/**not dates */
                                  try{ nData[i][prop] = JSON.stringify(val).replace(/[\[\]{}\"]/g, "").replace(/:/g, ": ").replace(/,/g, ", ").replace(/  /g, " ")}catch(e){}
                          }
                          const keys = Object.keys(data[i])
                          const diff = allCols.filter( function(c) { return keys.indexOf(c) < 0 })
                          const dLen = diff.length
                          if(dLen){//obj doesn't have all props
                              let n = 0
                              for(n; n < dLen; n++)
                                  nData[i][diff[n]] = "";
                          }
                      }
                  }catch(e) {  }
              }
          }
          //read data that's already not a string
          if(allCols && allCols.length){//array of objs
              let a = 0
              const alen = allCols.length
              for(a; a < alen; a++){
                  const col = allCols[a]
                  const colData = nData?.map( function(d: any) { return d[col] })
                  if(colData && colData.every( function(d: any) { return !d }))
                      continue
                  if(!this.common.idCol(col) && colData && colData.every( function(d: any) { return !d || typeof d === "number" })){
                      try{ this.dataTableService.dataFilSrtTracker[col]["type"] = "number" } catch(e){}
                  }
                  if(colData && colData.every( (d: any) => { return !d || this.common.isADateObject(d) })){
                      try{ this.dataTableService.dataFilSrtTracker[col]["type"] = "date" } catch(e){}
                  }
                  if(colData && colData.every( function(d: any) { return !d || typeof d === "boolean" })){
                      nData = nData.map( function(d: any) {
                          d[col] = d[col]?.toString() || "false";
                          return d
                      })
                  }
              }
          }
          return nData
      }

      setRowSelChecksPlacement() {
        let i = 0
        const radd = 12
        const els = document.getElementsByClassName("select-row-check")
        const len = els.length
        const dtBody = this.dataTableBody.nativeElement
        const tbds = dtBody.getBoundingClientRect()
        const initT = this.initCheckTop()
        const col1Frozen = document.getElementsByClassName("col-item-freeze").length
        for(i; i < len; i++){
            const chk = <HTMLInputElement>els[i]
            const row = document.getElementById(chk.value)
            if(row){
                const tTop = tbds.top
                const rbds = row.getBoundingClientRect()
                const hh = (rbds.height/2)
                const top = Math.floor(initT + ((rbds.bottom - (hh+radd)) - tTop))
                chk.style.top = Math.floor(top) + "px"
                if((rbds.top+(hh-radd)) < tTop || ((rbds.bottom - (hh-radd)) >= (tTop + tbds.height)) || (dtBody.scrollLeft > 35 && !col1Frozen)){
                    chk.classList.add("hide")
                    continue
                }
                chk.className = "select-row-check"
            } else {
                chk.classList.add("hide")
            }
        }
    }

    initCheckTop() {
        const headHt = this.dataTableHeaders.nativeElement.getBoundingClientRect().height
        return headHt + 17;//dt table marg top is 17
    }

    toggleSelectedRows(forceUnsel?: any) {
        this.handlingSelRows = true
        setTimeout( () => {//let the button disable
            this.dataTableService.displayOnlySelRows = !this.dataTableService.displayOnlySelRows
            if(forceUnsel)
                this.dataTableService.displayOnlySelRows = false
            const icn = this.btnTogSelRows.nativeElement.firstElementChild;
            if(this.dataTableService.displayOnlySelRows){
                this.dataTableService.currFilData = this.dataTableService.mainData.
                filter( (d: any, ind: number) => this.dataTableService.currSelRows.indexOf(ind) > -1 )
                if(icn){
                    icn.textContent = "check_box"
                    icn.classList.add("sel-rows-checked")
                }
            } else {
                this.dataTableService.currFilData = this.dataTableService.mainData.filter( (d: any) => true )
                if(icn){
                    icn.classList.remove("sel-rows-checked")
                    icn.textContent = "check_box_outline_blank"
                }
            }
            if(this.dataTableService.arefilSrtTrkPropsDefault(true)){
                this.renderCurrData(null)
            } else {
                const col = this.columnHeaders[0].column//just fil by 1st col
                const fil = this.dataTableService.dataFilSrtTracker[col].filter
                if(col)
                    this.execFilter(col, (fil || ""))
            }
            setTimeout( () => this.handlingSelRows = false)
        })
    }

    toggleSingleRowSelected(useInd: number) {
        if(this.tblDragService.didResizeOnEvent)
            return false
        try{
            if(this.dataTableService.currSelRows.indexOf(useInd) > -1){//it's already selected
                this.dataTableService.currSelRows = this.dataTableService.currSelRows.filter( function(r) { return r !== useInd })
                if(this.dataTableService.displayOnlySelRows){
                    const btnTog = this.btnTogSelRows.nativeElement
                    btnTog.click()
                    btnTog.click()
                    if(!this.dataTableService.currSelRows.length)
                        btnTog.click()
                }
            } else {
                if(this.dataTableService.currSelRows.indexOf(useInd) < 0)
                    this.dataTableService.currSelRows.push(useInd)
            }
        }catch(e){}
        return this.setBtnTogRows(this.dataTableService.currSelRows.length)
    } 

    setBtnTogRows(amt?: number) {
        if(amt){
            this.togSelRows = amt.toLocaleString(undefined, {maximumFractionDigits:0}) + " Selected Row" + (amt == 1 ? "" : "s")
        } else {
            this.togSelRows = "Selected Rows"
        }
    }

    clearSelectedRows() {
        this.handlingSelRows = true
        this.dataTableService.currSelRows = []
        const fullClear = this.dataTableService.displayOnlySelRows ? true : false;
        this.dataTableService.displayOnlySelRows = false;
        this.setBtnTogRows()
        if(fullClear)
            return this.toggleSelectedRows(true)
        setTimeout( () => this.handlingSelRows = false)
    }

      getDataColumns(data: any[]) {
          let i = 0
          let cols = Object.keys(data[0])
          const len = data.length
          for(i; i < len; i++){
              const obj = data[i]
              const keys = Object.keys(obj)
              const notInCols = keys.filter( (k: any) => cols.indexOf(k) < 0)
              if(typeof obj === "object" && notInCols.length){
                  let n = 0
                  const dLen = notInCols.length
                  for(n; n < dLen; n++)
                      cols.push(notInCols[n])
              }
          }
          return cols.map( (c: any) => this.common.stripSpecChars(c) )
      }

    getTallestCellInRow(kids: any) {
        let i = 0
        let hgts = []
        const len = kids.length
        for(i; i < len; i++)
            hgts.push(kids[i].scrollHeight)
        const srt = hgts.sort( function(a, b) { return a > b ? -1 : 1 })
        return Math.ceil(srt[0] + 1);
    }

    setDataRowHgts() {
        let i = 0;
        const rows = document.getElementsByClassName("data-table-row")
        const rLen = rows.length
        if(rLen){
            for(i; i < rLen; i++){
                const row = rows[i]
                const kids = document.querySelectorAll("#" + row.id + " .data-cell")
                const rHgt = this.getTallestCellInRow(kids)
                this.rows[i].height = rHgt + "px"
            }
            setTimeout( () => { this.setRowSelChecksPlacement() }) 
        }
    }

    setDataRowHgtsById() {
        const rLen = this.changedIds.length
        for(var i = rLen; i >= 0; i--){
            const id = this.changedIds[i]
            const row = this.rows.find( r => r.id === id)
            if(row){
                const strtrowH = document.getElementById(id)?.getBoundingClientRect().height;
                const el = document.getElementById(row.id)
                if(el){
                    const kids = document.querySelectorAll("#" + row.id + " .data-cell")
                    const rHgt = kids.length ? this.getTallestCellInRow(kids) : (parseInt(strtrowH?.toString() || this.desRowHeight))
                    row.height = rHgt + "px"
                    this.changedIds.pop()
                }
            }
        }
    }

        setLastRowIndex() {
            this.lastElRowIndex = (this.rows.length - 1)
            return this.lastElRowIndex;
        }

      buildInitUiDataTable(data: any[], color1?: any, color2?: any) {
          try{
              const cols = Object.keys(data[0])
              let i = 0; let n = 0; let init = 20;//init amt of rows to render
              const len = data.length;
              const colLen = cols.length
              this.maxCols = this.setMaxCols()
              this.useColWid = Math.ceil((this.dataTableBody.nativeElement.getBoundingClientRect().width-16)/Math.min(colLen, this.maxCols)) + "px"
              for(i; i < colLen; i++){
                  this.columnHeaders.push({ column: cols[i], width: this.useColWid, hideMinCol: false, freeze: false, minimized: false, dataType: this.dataTableService.figureFilterType(cols[i]) })
                  if(i < this.maxCols)
                    this.dataTableService.visibleCols.push(cols[i])
              }
              this.columnNames = this.columnHeaders.map( c => c.column)
              const addCell = (text: any, prop: string | null, row: DataRow | null, indx: number) => {
                if(prop && row){
                    const notNum = (this.dataTableService.figureFilterType(prop) != "number" || /(year|yr|fy)/g.test(prop.toLocaleLowerCase())) ? true : false
                    const useTxt = this.dataTableService.figureCellText(text, notNum, this.dataTableService.dataFilSrtTracker[prop]["colCellSymbol"])
                    const figEditable = (val: string): boolean => {
                        if(/<img/g.test(val))
                            return false;
                        return this.editable
                    }
                    row.cells?.push({
                      column: prop,
                      freeze: false,
                      minimized: false,
                      rawText: text,
                      visible: true,
                      width: this.useColWid,
                      editable: useTxt.prop === "textContent" ? this.editable : figEditable(useTxt.value),
                      dataType: this.dataTableService.figureFilterType(prop),
                      text: (useTxt.prop === "textContent" ? useTxt.value : ""),
                      html: (useTxt.prop !== "textContent" ? useTxt.value : ""),
                    })
                    this.dataTableService.dataFilSrtTracker[prop].colWidth = this.useColWid
                }

                  if(row && prop && row.cells && row.cells.length === 1)
                      this.dtChecks.push(indx)
              }
              this.useRowWid = this.getAllColWidth(colLen) + "px"
              const limit = Math.min(init, len)
              const horizLim = Math.min(this.maxCols, colLen)
              for(n; n < limit; n++){
                this.rows.push({ id: "dataTableRow" + n, index: n, width: this.useRowWid, cells: [] })
                let k = 0
                for(k; k < horizLim; k++)
                    addCell(data[n][cols[k]], cols[k], this.rows[n], n)
              }
              this.setLastRowIndex()
              this.paginatorReady = true;
              this.handleTheme(color1, color2)
              this.handleColAnyDDFilters(data, cols)
              setTimeout( () => { 
                this.testHideMinBtn() 
                this.setColHeaderHgt()
                this.dataTableService.setTblVertBounds()//critical
                this.dataTableService.setTblHorizBounds()
              })
              setTimeout( () => { 
                this.setDataRowHgts()
                this.dataTableService.setIdealColumnWidth.next(true)
                if(len > init){
                    let z = this.lastElRowIndex + 1
                    const phund = (z+this.rowBuffer)
                    const goTo = Math.min(len, phund)
                    for(z; z < goTo; z++)
                        this.rows.push({ id: "dataTableRow" + z, index: z, width: this.useRowWid, cells: [], height: "78px" })
                    this.setLastRowIndex()
                }
                this.dataTableService.setTblVertBounds()//critical, do it again it's ok
                this.dataTableService.setTblHorizBounds()
            }, 250)
          } catch(e) {}                
      }

      handleColAnyDDFilters(data: any[], cols: string[]) {
        let i = 0;
        const len = cols.length
        const dLen = data.length
        for(i; i < len; i++){
            const col = cols[i]
            const colData = data.map( function(d) { return (d && typeof d === "object") ? d[col] : d })
            const yearCol = /(year|yr|fy)/g.test(col?.toLocaleLowerCase())
            const allNumData = colData.every( function(d) { return !d || (d && typeof d === "number") })
            const boolData = colData.every( function(d) { return !d || (d && typeof d === "boolean") })
            if(colData.every( function(d) { return !d }))
                continue;
            let bitData;
            if(allNumData)
                bitData = colData.every( function(d) { return !d || d === 1 || d === 0 })
            if(allNumData && !yearCol && !bitData)//num data
                continue
            const dSet =new Set(colData)
            let arrFrmSet: any[] = []
            dSet.forEach( (v: any) => { arrFrmSet.push(v) })                         
            const doSels = dLen < 100 ? 2 : ((dLen >= 100 && dLen < 500) ? 10 : 15)
            const cantDoDD = arrFrmSet.some( function(a) { return a && a.length > 40 })
            if(!cantDoDD && ((boolData || bitData) || (arrFrmSet.filter( function(a) { return !!a }).length > 0 && colData.every( function(d) { return !d || typeof d === "string" })))){
                if(arrFrmSet.length > 1 && arrFrmSet.length <= doSels)
                    this.swapColFilterToSelect(col, arrFrmSet.filter( (v: any) => { return !!v && this.dataTableService.badStrings.indexOf(v) < 0 }))
            }
        }
    }

    swapColFilterToSelect(col: string, vals: any[]) {
        let o = 0;
        vals = vals?.sort()
        const oLen = vals?.length
        this.dataTableService.dataFilSrtTracker[col]["selDDVals"] = []
        this.dataTableService.dataFilSrtTracker[col]["selDDVals"].push({ value: "(Select All)", checked: true })
        for(o; o < oLen; o++)
            this.dataTableService.dataFilSrtTracker[col]["selDDVals"].push({ value: vals[o], checked: true })
        this.dataTableService.dataFilSrtTracker[col].comparator = "Equals"
        this.canGroupBy.push(col)
    }

    handleFilFocus(event: any) {
        if(!event.select)
            return this.killSelFilOpts(true)
        this.buildSelFilOptions(event)
    }

    buildSelFilOptions(event: any) {
        const target = event.target
        const col: string = event.col;
        const esfd = document.getElementsByClassName("selfil-opt-" + this.currDDFilter)[0]
        if(this.currDDFilter){
            target.blur()
            this.currFilOpts = []
            this.currDDFilter = ""
            this.listenToWindowCurrFil = false
            return this.listenToWindowCurrFil
        }
        if(esfd){
            this.currFilOpts = []
            this.listenToWindowCurrFil = false
        }
        let i = 0
        const rel = this.selFilContainer.nativeElement
        this.currDDFilter = this.common.elifyCol(col)
        const len = this.dataTableService.dataFilSrtTracker[col]["selDDVals"].length
        for(i; i < len; i++)
            this.currFilOpts.push(this.dataTableService.dataFilSrtTracker[col]["selDDVals"][i])
        const rbds = rel.getBoundingClientRect()
        const ibds = target.getBoundingClientRect()
        this.ddFilStyle = {'top': Math.ceil((ibds.bottom - rbds.top)+5) + "px", 'left': Math.ceil(ibds.left - rbds.left) + "px"}
        return target.blur()
    }

    handleWinClickOnSelFil() {
        this.listenToWindowCurrFil = false;
        setTimeout( () => { this.listenToWindowCurrFil = true })
    }

    killSelFilOpts(skipBlur?: boolean) {
      this.currFilOpts = []
      this.ddFilStyle = {}
      this.currDDFilter = ""
      if(!skipBlur){
          try{ 
            const actEl = document.activeElement
            if(actEl && actEl instanceof HTMLInputElement)
                actEl.blur()
          }catch(e){}
      }
      this.listenToWindowCurrFil = false
    }

    handleMultiSelFilter(elCol: string, value: any, checked: boolean) {
        let checkAll: any;
        const sAll = "(Select All)";
        const col= this.common.replaceUniSep(elCol)
        if(col && this.dataTableService.dataFilSrtTracker[col] && !this.isMultiFiltering && 
            this.dataTableService.dataFilSrtTracker[col]["selDDVals"]){
            this.dataTableService.dataFilSrtTracker[col]["selDDVals"] = this.dataTableService.dataFilSrtTracker[col]["selDDVals"].map( (v: any) => {
                if(value === sAll){
                    v.checked = checked
                    checkAll = checked ? "true" : "false";
                } else {
                    const tarChkd = checked;
                    if((v.value === value) || (!v.value && !value))
                        v.checked = tarChkd
                    if(!tarChkd && v.value === sAll)
                        v.checked = false
                }
                return v
            })
            if(checkAll && typeof checkAll === "string"){
                this.currFilOpts = this.currFilOpts.map( o => {
                    o.checked = checkAll === "true" ? true : false;
                    return o;
                })

            }
            this.isMultiFiltering = true;
            this.execFilter(col, "")
            setTimeout( () => { this.isMultiFiltering = false })
            this.topLevelFilter = ""
        }
    }

    execFilter(field: any, val: any) {
        this.dataTableService.isFiltering = true
        this.dataTableService.dataFilSrtTracker[field].filter = val || ""
        this.dataTableService.columnFilter(this.dataTableService.mainData, field, this.dataTableService.dataFilSrtTracker, this.dataTableService.sortOrder, true)
        this.renderCurrData(val, field)
        setTimeout( () => { this.dataTableService.isFiltering = false }, 500)
    }

    topFilterOnKeyUp() {
      if(!this.dataTableService.isFiltering){
          this.dataTableService.isFiltering = true
          this.dataTableService.easyFilter((this.topLevelFilter || ""), this.dataTableService.mainData, this.dataTableService.sortOrder)
          if(!this.topLevelFilter && !this.dataTableService.arefilSrtTrkPropsDefault()){
              let altField = Object.keys(this.dataTableService.mainData[0])[0]
              this.dataTableService.columnFilter(this.dataTableService.mainData, altField, this.dataTableService.dataFilSrtTracker, this.dataTableService.sortOrder, false)
          }
          this.renderCurrData(this.topLevelFilter, "topLevelDataFilter")
          setTimeout( () => { 
              this.dataTableService.isFiltering = false
              const buildUpLen = this.filterBuildUp.length
              if(buildUpLen){
                  this.topFilterOnKeyUp()
                  this.filterBuildUp = []
              } 
          }, 500)
      } else {
          this.filterBuildUp.push(this.topLevelFilter)
      }
    }

      setHorizPos(event: any) {
        const head = this.dataTableHeaders.nativeElement
        if(event > 0)
            head.style.marginLeft = -event + "px"
        else
            head.style.removeProperty("margin-left")
        this.horizRest = event
      }

      setColsOnVisScreen() {
        let i = 0
        let vCols = []
        const useCols = this.columnHeaders.filter( c => !c.minimized).map( c => c.column)
        const len = useCols.length
        for(i; i < len; i++){
            const col = useCols[i]
            const el = document.getElementById("columnHeader" + this.common.elifyCol(col))
            if(el){
                const elbds = el.getBoundingClientRect()
                if(elbds.left >= this.dataTableService.tblLeft && elbds.right < this.dataTableService.tblRight)
                    vCols.push(col)
            }
        }
        this.dataTableService.visibleCols = [...vCols]
      }

      handleScroll(event: any) {
          const head = this.dataTableHeaders.nativeElement
          const top = event.target.scrollTop
          const left = event.target.scrollLeft
          /*horiz scroll*/
          if(this.currGroupValues.length || this.showCharts)
              return;
          if(left !== this.horizRest){
              if(left > 0)
                  head.style.marginLeft = -left + "px"
              else
                  head.style.removeProperty("margin-left")
              if(left > this.horizRest){
                  this.execHorizScrollRight(this.dataTableService.visibleCols)
              } else {//scrolling back left
                  this.execHorizScrollLeft(this.dataTableService.visibleCols)
              }
              this.horizRest = left
              this.setColsOnVisScreen()
          }
          /*horiz scroll*/
          /*vert scroll*/
          if(top === this.verticalRest || this.lockVScroll)
              return;
          this.isScrolling = true
          if(top > this.verticalRest){
              this.execVertScrollDown(this.columnNames, this.columnNames.length)
              this.clearAboveFoldRows()
          } else {//scrolling back up
            this.execVertScrollUp(this.columnNames, this.columnNames.length)
            this.clearBelowFoldRows()
          }
          this.verticalRest = top
          this.checkLastRowAdded()
          if(top%10 === 0)
            this.setDataRowHgtsById()
          /*vert scroll*/
        }

    handleScrollEnd(): any {
        this.lockVScroll = false
        if(this.currGroupValues.length)
            return setTimeout( () => { this.dataTableService.gridScrollEndWhileGrouped.next(true) })
        setTimeout( () => { 
            this.setDataRowHgtsById()
            this.isScrolling = false
            this.setColsOnVisScreen()
            this.setRowSelChecksPlacement() 
        })
    }
    
    checkLastRowAdded() {
        const dtr = "dataTableRow"
        const len = this.dataTableService.currFilData.length
        const els = document.getElementsByClassName("data-table-row")
        const eLen = els.length
        const last  = els[(eLen-1)]
        if(last && this.rows.length < (len - 1)){
            const bds = last.getBoundingClientRect()
            if(bds.top < (this.dataTableService.tblBot + 300)){
                this.useRowWid = this.getAllColWidth(this.columnHeaders.length - this.getMiniColCount()) + "px";
                let z = this.lastElRowIndex + 1
                const phund = (z+this.rowBuffer)
                const goTo = Math.min(len, phund)
                for(z; z < goTo; z++){
                    const index = this.dataTableService.findObjIndxInData(this.dataTableService.currFilData[z])
                    this.rows.push({ id: dtr + index, index: index, width: this.useRowWid, cells: [], height: "78px" })
                }
                this.setLastRowIndex()
            }
        }
    }

    addCell(text: any, prop: string): DataCell {
        const useProp = this.dataTableService.dataFilSrtTracker[prop]
        const notNum = (this.dataTableService.figureFilterType(prop) != "number" || /(year|yr|fy)/g.test(prop.toLocaleLowerCase())) ? true : false
        const useTxt = this.dataTableService.figureCellText(text, notNum, useProp["colCellSymbol"])
        return {
            column: prop,
            rawText: text,
            editable: useTxt.prop !== "textContent" ? false : this.editable,
            dataType: this.dataTableService.figureFilterType(prop),
            freeze: useProp.freeze,
            visible: true,
            minimized: useProp.minimize,
            width: useProp.colWidth || this.useColWid,
            text: useTxt.prop === "textContent" ? useTxt.value : "",
            html: useTxt.prop !== "textContent" ? useTxt.value : "",
        }
    }

    execHorizScrollRight(cols: string[]) {
        let i = 0; let c = 0; let e = 0;
        const rows = this.rows.filter( r => r.cells?.length)
        const len = rows.length
        const clen = cols.length
        let colsToAdd: string[] = []
        let colsToRem: string[] = []
        const cellsExst: string[] | undefined = rows[0]?.cells?.map( c => c.column)
        if(cellsExst){
            const eLen = cellsExst.length
            for(c; c < clen; c++){//add
                const col = cols[c]
                if(cellsExst.indexOf(col) < 0)
                    colsToAdd.push(col)
            }
            for(e; e < eLen; e++){//remove
                const col = cellsExst[e]
                if(cols.indexOf(col) < 0)
                    colsToRem.push(col)
            }
        }
        const colLen = colsToAdd.length
        const colRLen = colsToRem.length
        if(colLen || colRLen){
            for(i; i < len; i++){
                let k = 0; let r = 0
                const row = rows[i]
                const item = this.dataTableService.mainData[row.index]
                for(k; k < colLen; k++){//add
                    const col = colsToAdd[k]
                    const eCell: DataCell | undefined = row.cells?.find( c => c.column === col)
                    if(eCell){//already there, make visible
                        eCell.visible = true
                        // row.cells = row.cells?.map( c => {
                        //     if(c.column === col)
                        //         c.visible = true
                        //     return c
                        // })
                    } else {
                        const cell = this.addCell(item[col], col)
                        if(typeof cell !== "string")
                            row.cells?.push(cell)
                    }
                }
                for(r; r < colRLen; r++){//remove
                    const col = colsToRem[r]
                    if(row.cells){
                        const rCell: DataCell | undefined = row.cells.find( c => c.column === col)
                        if(rCell)
                            rCell.visible = false
                    }
                }
            }
        }
    }

    execHorizScrollLeft(cols: string[]) {
        let i = 0; let c = 0; let e = 0;
        const rows = this.rows.filter( r => r.cells?.length)
        const len = rows.length
        const clen = cols.length
        let colsToAdd: string[] = []
        let colsToRem: string[] = []
        const cellsExst: string[] | undefined = rows[0]?.cells?.filter( c => c.visible).map( c => c.column)
        if(cellsExst){
            const eLen = cellsExst.length
            for(c; c < clen; c++){//add
                const col = cols[c]
                if(cellsExst.indexOf(col) < 0)
                    colsToAdd.push(col)
            }
            for(e; e < eLen; e++){//remove
                const col = cellsExst[e]
                if(cols.indexOf(col) < 0)
                    colsToRem.push(col)
            }
        }
        const colLen = colsToAdd.length
        const colRLen = colsToRem.length
        if(colLen || colRLen){
            for(i; i < len; i++){
                let k = 0; let r = 0
                const row = rows[i]
                for(k; k < colLen; k++){//add visible
                    const col = colsToAdd[k]
                    const cell: DataCell | undefined = row.cells?.find( c => c.column === col)
                    if(cell){
                        cell.visible = true
                        // row.cells = row.cells?.map( c => {
                        //     if(c.column === col)
                        //         c.visible = true
                        //     return c
                        // })
                    }
                }
                for(r; r < colRLen; r++){//remove
                    const col = colsToRem[r]
                    if(row.cells){
                        const rCell: DataCell | undefined = row.cells.find( c => c.column === col)
                        if(rCell)
                            rCell.visible = false
                    }
                }
            }
        }
    }

    execVertScrollDown(cols: string[], colLen: number) {
        let changed = 0
        const els = this.rows.filter( r => !r.aboveTable && !r.cells?.length)
        while(changed <= 7){
            const el = document.getElementById(els[changed]?.id)
            const elRect = el?.getBoundingClientRect()
            if(el && elRect && elRect.top < this.dataTableService.tblBot){
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
                    this.dtChecks.push(id)
                    this.changedIds.push(row.id)
                }
            }
            changed += 1
        }
    }

    execVertScrollUp(cols: string[], colLen: number) {
        let changed = 0
        const els = this.rows.filter( r => r.aboveTable && !r.cells?.length ).reverse().filter( (r, ind) => ind < 7)
        while(changed <= 7){
            const el = document.getElementById(els[changed]?.id)
            const elRect = el?.getBoundingClientRect()
            if(el && elRect && elRect.bottom >= this.dataTableService.tblTop){
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
                    row.aboveTable = false
                    row.cells = [...cells]
                    this.dtChecks.push(id)
                    this.changedIds.push(row.id)
                }
            }
            changed += 1
        }
    }

    clearAboveFoldRows() {
        const els = this.rows.filter( r => r.cells?.length && this.dataTableService.elIsAboveFold(document.getElementById(r.id), this.dataTableService.tblTop))
        const len = Math.min(7, els.length)
        for(var i = (len-1); i >= 0; i--){
            const el = els[i]
            if(el){
                const row = this.rows.find( r => r.id === el.id)
                if(row){
                    row.cells = []
                    row.aboveTable = true
                    this.dtChecks = this.dtChecks.filter( c => c !== el.id)
                }
            }
        }
    }

    clearBelowFoldRows() {
        const els = this.rows.filter( r => r.cells?.length && this.dataTableService.elIsBelowFold(document.getElementById(r.id), this.dataTableService.tblBot))
        const len = Math.min(7, els.length)
        for(var i = (len-1); i >= 0; i--){
            const el = els[i]
            if(el){
                const row = this.rows.find( r => r.id === el.id)
                if(row){
                    row.cells = []
                    this.dtChecks = this.dtChecks.filter( c => c !== el.id)
                }
            }
        }
    }

    scrollToRowGroup(rClass: string) {
        const el = document.getElementsByClassName(rClass)[0]
        if(el){
            const dtb = this.dataTableBody.nativeElement
            const dttop = dtb.getBoundingClientRect().top - dtb.scrollTop
            const etop = el.getBoundingClientRect().top
            this.dataTableBody.nativeElement.scrollTop = etop - dttop
        }
    }

     execCellEdit(e: any) {//{ element: el, column: this.cell.column, value: val }
        if(this.dataTableService.currEditIndex || this.dataTableService.currEditIndex === 0){
            let val = e.value;
            const realProp: string = e.column
            this.dataTableService.mainData[this.dataTableService.currEditIndex][realProp] = val;
            const dtType = this.dataTableService.figureFilterType(realProp)
            const notNum = (dtType != "number" || /(year|yr|fy)/g.test(realProp.toLocaleLowerCase())) ? true : false
            if(val){
                if(dtType === "date")
                    val = this.common.coerceDate(val)
                if(dtType === "number")
                    val = /\./g.test(val) ? parseFloat(val.replace(/,/g, "")) : parseInt(val.replace(/,/g, ""))
            }
            const useTxt = this.dataTableService.figureCellText(val, notNum);
            if(useTxt.prop === "textContent")
                e.element.textContent = useTxt.value;
            else
                e.element.innerHTML = useTxt.value;
            const edit: CellEdit = {
                value: val,
                column: realProp,
                row: this.dataTableService.currEditIndex,
            }
            this.cellEdit.emit(edit)
            this.dataTableService.currEditIndex = null
        }
    }

      handleSingleColResize(val: any, column?: string) {
        if(val && (this.dataTableService.currColumnEdit || column)){
            const cols = this.getAllColsAtRuntime(null);
            const colLen = cols.length - this.getMiniColCount()
            const rawCol = column || this.common.replaceUniSep(this.dataTableService.currColumnEdit)
            const thecol = this.columnHeaders.find( c => (c && c.column === rawCol))
            if(thecol){
                thecol.width = (val + "px")
                this.dataTableService.dataFilSrtTracker[thecol.column]["colWidth"] = (val + "px")
            }
            let i = 0
            const toResize = this.rows.filter( r => r.cells?.length)
            const len = toResize.length
            for(i; i < len; i++){
                const ind = toResize[i].index
                const row = this.rows.find( r => r.index === ind)
                if(row){
                    row.cells = row.cells?.map( c => {
                        if(c && c.column === rawCol)
                            c.width = (val + "px")
                        return c
                    })
                }
            }
            setTimeout( () => { 
                const allColW = this.getAllColWidth(colLen)
                this.setDataRowWidthsOnMinimize(allColW)
                this.setRowSelChecksPlacement() 
                this.testHideMinBtn()
            })
        }
    }

    testHideMinBtn() {
        let i = 0
        const els = document.getElementsByClassName("btn-min-col")
        const len = els.length
        for(i; i < len; i++){
            const el = els[i]
            const col = el.id.replace(/btnMin/g, "")
            const ellf = el.getBoundingClientRect().left
            const srt = document.getElementById("btnSort" + col)
            const colHd = this.columnHeaders.find( c => c.column === this.common.replaceUniSep(col)) 
            if(colHd && srt){
                const srtrt = srt.getBoundingClientRect().right + 5;
                if(ellf < srtrt)
                    colHd.hideMinCol = true
                else
                    colHd.hideMinCol = false
            }
        }
    }

    setHeaderHeight(val: any, force?: boolean) {
            if(val && typeof val === "string")
                val = Math.ceil(parseInt(val))
            const rHgt = force ? val : Math.max(val, parseInt(this.desRowHeight))
            const useHgt = Math.floor(rHgt) + "px";
            const row = this.dataTableHeaders.nativeElement
            row["style"]["height"] = useHgt
            this.columnHeaders.forEach( c => {c.height = useHgt})
            setTimeout( () => { this.setRowSelChecksPlacement() })
        }

       setSingleRowHgt(val: any, row?: any, force?: boolean) {
            if(val && typeof val === "string")
                val = Math.ceil(parseInt(val))
            const rHgt = force ? val : Math.max(val, (parseInt(this.desRowHeight) || Math.ceil(row.getBoundingClientRect().height)))
            const useHgt = Math.floor(rHgt) + "px";
            if(typeof row === "string" && this.tblDragService.colDragStartFrmCellTracker.row && this.tblDragService.colDragStartFrmCellTracker.ystart){
                const drow = this.rows.find( r => r.id === row)
                if(drow)
                    drow.height = useHgt
            }
            setTimeout( () => { this.setRowSelChecksPlacement() })
        }

        handleTheme(co1: string | null, co2: string | null) {
            let rule1; let rule1a; let rule2; let rule3; let rule4; let rule5; let rule6;
            if(co1){
                this.dataTableService.themeColor1 = co1
                rule1 = ".col-header span, .col-header sup, .col-header button .material-icons, " + 
                ".row-group-panel button span, .row-group-panel button i, .paginator-half-wid{color: "+co1+"}";
                rule1a = ".col-header select, .col-header input:not(input[type=file]), #skipTo{box-shadow:0 0 1px 1px "+co1+";" +
                "-webkit-box-shadow:0 0 1px 1px "+co1+"}";
            }
            if(co2){
                this.dataTableService.themeColor2 = co2
                rule2 = ".col-header, .data-table-footer, .skip-to-options, .btn-fil-comp{background: "+co2+"}"
                const tblbxSh = "0 -1px 3px 1px ";
                const tblFbxSh = "0 1px 3px -3px ";
                if(this.dataTableService.mainDataLen){
                    rule2 = ".col-header, .skip-to-options, .btn-fil-comp{background: "+co2+"}"
                    rule3 = ".data-table{ box-shadow: "+tblbxSh + co2+"; -webkit-box-shadow: "+tblbxSh + co2+"; -moz-box-shadow: "+tblbxSh + co2+"}"
                    rule6 = ".data-table-footer{background: "+co2+"; box-shadow: "+tblFbxSh + co2+"; -webkit-box-shadow: "+tblFbxSh + co2+"; -moz-box-shadow: "+tblFbxSh + co2+"}";
                }
                rule4 = ".row-group-panel{background: "+co2+"}";
                if(co1)
                   rule4 = ".row-group-panel{background: "+co2+"; border-bottom: 1px dotted "+co1+"}"; 
                rule5 = ".data-cell{ border-bottom: 1px solid "+co2+"; border-right: 1px solid "+co2+"}"
            }
            if(rule1 || rule1a || rule2 || rule3 || rule4 || rule5 || rule6){
                const el = document.createElement("style")
                document.head.appendChild(el)
                if(rule1)
                    el.sheet?.insertRule(rule1)
                if(rule1a)
                    el.sheet?.insertRule(rule1a)
                if(rule2)
                    el.sheet?.insertRule(rule2)
                if(rule3)
                    el.sheet?.insertRule(rule3)
                if(rule4)
                    el.sheet?.insertRule(rule4)
                if(rule5)
                    el.sheet?.insertRule(rule5)
                if(rule6)
                    el.sheet?.insertRule(rule6)
            }
        }

    renderCurrData(val: any, field?: any) {//filter val
        const thead = this.dataTableHeaders.nativeElement
        const tbody = this.dataTableBody.nativeElement
        const tbodyX = tbody.scrollLeft
        this.rows = []
        this.changedIds = []
        this.dtChecks = []
        if(!this.currGroupValues.length)//only if not grouped
            this.horizRest = 0
        tbody.scrollTop = 0
        this.verticalRest = 0
        let didXScrl = false;
        this.lastElRowIndex = 0
        let n = 0
        let init = 20;
        const len = this.dataTableService.currFilData.length;
        if(!len)//always just add 1
            return setTimeout( () => { this.styleEmptyFilDataRow(tbody, tbodyX) })
        if(this.currGroupValues.length){//don't add to rows here
            if(field)
                this.columnOfInterest = field
            return this.dataTableService.gridEventWhileGrouped.next(true);
        }
        const uCols = this.columnHeaders?.filter( c => !c.minimized )
        const colLen = uCols.length
        const addCell = (text: any, prop: string | null, row: DataRow, indx: number) => {
            if(prop && row){
                const notNum = (this.dataTableService.figureFilterType(prop) != "number" || /(year|yr|fy)/g.test(prop.toLocaleLowerCase())) ? true : false
                const useTxt = this.dataTableService.figureCellText(text, notNum, this.dataTableService.dataFilSrtTracker[prop]["colCellSymbol"])
                const figEditable = (val: string): boolean => {
                    if(/<img/g.test(val))
                        return false;
                    return this.editable
                }
                row.cells?.push({
                    column: prop,
                    rawText: text,
                    visible: true,
                    editable: useTxt.prop === "textContent" ? this.editable : figEditable(useTxt.value),
                    dataType: this.dataTableService.figureFilterType(prop),
                    freeze: this.dataTableService.dataFilSrtTracker[prop].freeze,
                    minimized: this.dataTableService.dataFilSrtTracker[prop].minimize,
                    width: this.dataTableService.dataFilSrtTracker[prop].colWidth || this.useColWid,
                    text: useTxt.prop === "textContent" ? useTxt.value : "",
                    html: useTxt.prop !== "textContent" ? useTxt.value : "",
                })
            }

            if(row && prop && row.cells && row.cells.length === 1)
                this.dtChecks.push(indx)
            if(field && field === prop && !didXScrl){
                setTimeout( () => {
                    tbody.scrollLeft = tbodyX
                    if(tbodyX > 0)
                        thead.style.marginLeft = (-tbodyX + "px")
                    this.horizRest = tbodyX
                }, 100)
                didXScrl = true
            }
        }
        this.useRowWid = this.getAllColWidth(colLen - this.getMiniColCount()) + "px";
        const limit = Math.min(init, len)
        this.maxCols = this.setMaxCols()
        let horizLim = Math.min(this.maxCols, colLen)
        if(field && field !== "topLevelDataFilter"){
            const vlen: number =this.dataTableService.visibleCols.length
            const lastVis = uCols.map( c => c.column).indexOf(this.dataTableService.visibleCols[(vlen-1)]) + 1
            horizLim = Math.max(horizLim, lastVis)
        }
        for(n; n < limit; n++){
            const item = this.dataTableService.currFilData[n]
            const index = this.dataTableService.findObjIndxInData(item)
            if(index > -1){
                const row: DataRow = { id: "dataTableRow" + index, index: index, width: this.useRowWid, cells: [] }
                this.rows.push(row)
                let k = 0
                for(k; k < horizLim; k++){
                    const col = uCols[k]?.column
                    if(col)
                        addCell(item[col], col, row, index)
                }
            }
        }
        this.setLastRowIndex()
        if(len){
            setTimeout( () => { this.setDataRowHgts() }, 250)
            setTimeout( () => { //add rows that won't render yet
                if(len > init){
                    let z = this.lastElRowIndex + 1
                    const phund = (z+this.rowBuffer)
                    const goTo = Math.min(len, phund)
                    for(z; z < goTo; z++){
                        const index = this.dataTableService.findObjIndxInData(this.dataTableService.currFilData[z])
                        if(index > -1)
                            this.rows.push({ id: "dataTableRow" + index, index: index, width: this.useRowWid, cells: [], height: "78px" })
                    }
                    this.setLastRowIndex()
                }
                this.dataTableService.setIdealColumnWidth.next(true)
            }, 350)
        }
        return this.setHoldingCheckCls()
    }

    styleEmptyFilDataRow(tbody: HTMLElement, tbodyX: number) {
        const row = <HTMLElement>document.getElementsByClassName("data-table-row-no-data")[0]
        if(row){
            row.style.width = this.dataTableHeaders.nativeElement.scrollWidth + "px"
            setTimeout( () => tbody.scrollLeft = tbodyX, 100)
        }
    }

    freezeColCells(col: string) {
        this.rows = this.rows.map( r => {
            r.cells = r.cells?.map( c => {
                if(c && c.column === col)
                    c.freeze = !c.freeze
                return c
            })
            return r
        })
        this.dataTableService.gridEventWhileGrouped.next(true)
    }

    maximizeColCells(col: string, fullClear?: boolean) {
        this.dataTableService.dataFilSrtTracker[col].minimize = false
        this.minimizeColEls(col, fullClear)
    }

    minimizeColEls(col: string, fullClear?: boolean) { 
        this.lockVScroll = true
        if(!fullClear)
            setTimeout( () => { this.lockVScroll = false }, 1000)
        const thecol = this.columnHeaders.find( c => c.column === col)
        if(thecol){
            if(this.dataTableService.dataFilSrtTracker[col].colWidth === "1px")//still not sure how/why this happens
                this.dataTableService.dataFilSrtTracker[col].colWidth = "150px";
            thecol.width = this.dataTableService.dataFilSrtTracker[col].colWidth || this.useColWid;
            thecol.minimized = !thecol.minimized
        }
        this.rows = this.rows.map( r => {
            r.cells = r.cells?.map( c => {
                if(c && c.column === col)
                    c.minimized = !c.minimized
                return c
            })
            return r
        })
        if(this.hiddenCols.indexOf(col) < 0)
            this.hiddenCols.push(col)
        else
            this.hiddenCols = this.hiddenCols.filter( c => c !== col)
        setTimeout( () => { 
            if(!fullClear || (fullClear && this.hiddenCols.length === 1)){
                this.setTableWidthOnChange()
                setTimeout( () => {
                    this.dataTableBody.nativeElement.scrollBy(1, 0)
                    this.scrollAllGBPanels()
                })
            }
        }, 750)
    }

    scrollAllGBPanels() {
        let i = 0
        const els = document.getElementsByClassName("group-panel-grid")
        const len = els.length
        for(i; i < len; i++)
            els[i].scrollBy(1, 0)
    }

    setTableWidthOnChange() {
        const cols = this.getAllColsAtRuntime(null)
        this.maxCols = this.setMaxCols()
        const colLen = cols.length - this.getMiniColCount()
        setTimeout( () => { 
            this.setDataRowWidthsOnMinimize(this.getAllColWidth(colLen))
        }, 375)
        this.setHoldingCheckCls()
        this.setColsOnVisScreen()
        setTimeout( () => { this.setColHeaderHgt() })
    }

    setHoldingCheckCls() {
        if(document.getElementsByClassName("col-header-minimized").length){
            const els = document.getElementsByClassName("holding-check")
            const len = els.length
            for(var i = (len-1); i >= 0; i--)
                els[i].classList.remove("holding-check")
            let j = 0
            const rows = document.getElementsByClassName("data-table-row")
            const rlen = rows.length
            for(j; j < rlen; j++){
                let o = 0
                const kids = rows[j].children
                const klen = kids.length
                for(o; o < klen; o++){
                    const kid = kids[o]
                    if(/data-cell/g.test(kid.className) && !kid.classList.contains("col-header-minimized")){
                        kid.classList.add("holding-check")
                        break
                    }
                }
            }
        }
    }

    setDataRowWidthsOnMinimize(width: number) {
        let i = 0;
        const wid = width + "px"
        const rLen = this.rows.length
        for(i; i < rLen; i++)
            this.rows[i].width = wid
        this.useRowWid = wid;
        this.dataTableService.gridEventWhileGrouped.next(true)
    }

    clearHiddenCols() {
        const len = this.hiddenCols.length
        for(var i = (len-1); i >= 0; i--)
            this.maximizeColCells(this.hiddenCols[i], true)
        setTimeout( () => { this.lockVScroll = false }, 900)
    }

    clearFilInputs() {
        let i = 0
        const els = document.querySelectorAll(".col-header input")
        const len = els.length
        for(i; i < len; i++){
            const el = <HTMLInputElement>els[i]
            if(el)
                el.value = ""
        }
    }

    clearGroupBySels() {
        let i = 0
        const len = this.canGroupBy.length
        for(i; i < len; i++){
            const el = <HTMLInputElement>document.getElementById("groupby" + this.canGroupBy[i])
            if(el)
                el.checked = false
        }
    }

    resetCurrentData() {
        this.topLevelFilter = ""
        this.dataTableService.sortOrder = []
        this.clearHiddenCols()
        this.clearSelectedRows()
        this.removeAllFreezeCols()
        this.clearFilInputs()
        this.resetVisCols()
        this.clearGroupBySels()
        this.columnOfInterest = ""
        this.currGroupValues = []
        this.dataTableService.currGroup = ""
        this.dataTableService.resetFilSrtTracker()
        this.dataTableService.currFilData = this.dataTableService.mainData.filter( d => { return true })
        this.renderCurrData(null)
        setTimeout( () => { 
            const head = this.dataTableHeaders.nativeElement
            this.dataTableBody.nativeElement.scrollTop = 0 
            this.dataTableBody.nativeElement.scrollLeft = 0 
            head.style.removeProperty("margin-left")
            this.horizRest = 0
        })
    }

    resetVisCols() {
        let i = 0
        this.dataTableService.visibleCols = []
        const len = this.columnHeaders.length
        for(i; i < len; i++){
            if(i < this.maxCols)
                this.dataTableService.visibleCols.push(this.columnHeaders[i].column)
        }
    }

    getMiniColCount() {
        let o = 0
        for(const prop in this.dataTableService.dataFilSrtTracker){
            if(this.dataTableService.dataFilSrtTracker[prop].minimize)
                o += 1
        }
        return o
    }
  

}
