import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonService } from '../../../services/common-service';
import { DataTableService } from '../../../services/data-table-service';
import { CommonModule } from '@angular/common';
import { ColumnChart } from '../column-chart/column-chart';
import { DotPlotComponent } from '../dot-plot-component/dot-plot-component';

@Component({
  selector: 'app-charts-and-graphs',
  imports: [ CommonModule, ColumnChart, DotPlotComponent, ],
  templateUrl: './charts-and-graphs.html',
  styleUrl: './charts-and-graphs.css'
})
export class ChartsAndGraphs {

  chartsReady = false;
  useData: any[] = []
  iRows: any[][] = []
  dtCols: string[] = [];
  numCols: string[] = [];
  filterInfo: string = ""
  currNumColData: any[] = []
  currNumColNm: string = ""
  @Input() height: string = "";
  @Input() state: string = "all";
  @Input() chartColumns: string[] = [];
  @Output("close") close: EventEmitter<boolean> = new EventEmitter();
  @ViewChild("xChartsBtn", { static: true }) xChartsBtn!: ElementRef<HTMLButtonElement>;
  @ViewChild("chartsTitle", { static: true }) chartsTitle!: ElementRef<HTMLHeadElement>;
  @ViewChild("chartContain", { static: true }) chartContain!: ElementRef<HTMLElement>;
  h2Text: string = "" 

  constructor(public common: CommonService,
              public dataTableService: DataTableService,){ }

  ngOnInit() {
    if(this.state === "selected")
        this.useData = this.dataTableService.mainData.filter( (d, ind) => this.dataTableService.currSelRows.indexOf(ind) > -1 )
    else
        this.useData = this.dataTableService.currFilData.filter( d => true )
    this.gatherDotPlotPairs()
    const dLen = this.useData.length
    let filinfo = this.getAllFilSrtInfo()?.replace(/Filtered By:/g, "filtered by").
                      replace(/ \&bull; Sorted By/g, ", Sorted By").replace(/ \&bull; /g, " ")
    this.h2Text = "Data Insights for <b>"+ dLen.toLocaleString(undefined, {maximumFractionDigits: 0}) + "</b>" +
    (this.state !== 'all' ? (' ' + this.common.titleCase(this.state)) : '') +" Rows ";
    if(filinfo){
      this.h2Text = ("Data Insights " + ("for <b>" + (dLen).toLocaleString(undefined, {maximumFractionDigits:0}) + 
                    "</b> row" + (dLen === 1 ? " " : "s ")) + filinfo?.split(", Sorted By")[0].trim())
    }
  }

  ngAfterViewInit() {
    setTimeout( () => {
      let r = 0; let c = 0
      const clen = this.chartColumns.length
      const cWid = this.chartContain.nativeElement.getBoundingClientRect().width
      const insightColsPerRow = cWid < 640 ? 1 : (cWid < 960 ? 2 : 3);
      const rlen = Math.ceil(clen/insightColsPerRow)
      for(r; r < rlen; r++){
        let i = 0
        this.iRows[r] = []
        for(i; i < insightColsPerRow; i++){
          const col = this.chartColumns[c]
          if(col){
            const mappedData = this.useData.map( d => d[col] )
            if(mappedData.every( d => !d )){
              c += 1
              continue;
            }
            this.iRows[r].push({ column: col, data: mappedData })
            c += 1
          }
        }
      }
      setTimeout( () => { this.chartsReady = true })
    })
  }

  keepTitleNClose(event: any) {
    const xBtn= this.xChartsBtn.nativeElement
    const top = event.target.scrollTop
    if(xBtn)
      xBtn.style.top = (7 + top) + "px"
  }

  getAllFilSrtInfo(): string {
    let filinfo = "Filtered By:";
    let srtinfo = "Sorted By:";
    const doWithoutFilt = ["Not Empty", "Empty"]
    for(const prop in this.dataTableService.dataFilSrtTracker){
        const obj = this.dataTableService.dataFilSrtTracker[prop]
        const colNm = this.common.sanitizeUi(this.common.titleCase(prop));
        const initB = " <span>";
        if(obj && (obj.filter || this.dataTableService.hasUnchkdDDVals(obj) || (obj.comparator && doWithoutFilt.indexOf(obj.comparator) > -1))){
            const comp = this.dataTableService.mapCompToSym(obj.comparator ? obj.comparator : (obj.type === "string" ? "Contains" : "Equals"))
            let propFilTxt = (initB + colNm + "</span> " + comp)
            if(obj.filter)
                propFilTxt += (initB + this.common.sanitizeUi(obj.filter) + "</span>");
            if(!obj.filter && obj.selDDVals && obj.selDDVals.length && this.dataTableService.hasUnchkdDDVals(obj)){
                const chkdVals = obj.selDDVals.filter( (v: any) => v && v.checked ).map( (v: any) => v.value).join()
                propFilTxt += (initB + chkdVals + "</span>");
            }
            if(propFilTxt.endsWith("Equals"))
                propFilTxt = "";
            if(filinfo === "Filtered By:"){
                filinfo += propFilTxt
            } else {
                filinfo += ("," + propFilTxt)
            }
        }
        if(obj && obj.sort){
            const propSrtTxt = (initB + colNm + "</span> " + obj.sort.toLocaleUpperCase())
            if(srtinfo === "Sorted By:"){
                srtinfo += propSrtTxt
            } else {
                srtinfo += ("," + propSrtTxt)
            }
        }
    }
    if(filinfo === "Filtered By:")
        filinfo = "";
    if(srtinfo === "Sorted By:")
        srtinfo = "";
    if(filinfo && srtinfo)
        return (" &bull; " + filinfo + " &bull; " + srtinfo)
    if(filinfo && !srtinfo)
        return (" &bull; " + filinfo)
    if(!filinfo && srtinfo)
        return (" &bull; " + srtinfo)
    return "";
  }

  gatherDotPlotPairs() {
      let i = 0;
      const len = this.chartColumns.length
      for(i; i < len; i++){
        const col = this.chartColumns[i]
        const colData = this.useData.map( (d) => d[col] )
        if(colData.every( (d: any) => !d ))
            continue;
        const yearCol = /(year|yr|fy)/g.test(col?.toLocaleLowerCase())
        const allNumData = colData.every( (d: any) => !d || (d && typeof d === "number") )
        let bitData;
        if(allNumData)
            bitData = colData.every( (d: any) => !d || d === 1 || d === 0 )
        if(allNumData && !yearCol && !bitData){//num data
            this.numCols.push(col);
        } else {
            const dSet =new Set(colData)
            let arrFrmSet: any = []
            dSet.forEach( (v) => arrFrmSet.push(v) )
            const dateData = (colData.every( (d: any) => !d || this.common.isADateObject(d)) && !colData.every( (d: any) => !d ))
            if(dateData || yearCol)
                this.dtCols.push(col)
        }
      }

      // if(!forSelRows && !document.getElementsByClassName("graph-actual-bar").length){
          // const makeBarGraph = dataUpload.methods.canBeBarGraph(cols, data, dLen)
          // if(makeBarGraph && typeof makeBarGraph === "object")
          //     dataUpload.methods.buildBarGraphWithTwoCols(makeBarGraph)
      // }
      if(this.dtCols.length && this.numCols.length && typeof document.querySelectorAll === "function"){
          this.currNumColNm = this.numCols[0]
          this.currNumColData = this.useData.filter( d => !!d).map( (d) => d[this.numCols[0]] )
      }
  }

  setLineGraphNumCol(col: string) {
    this.currNumColData = []
    setTimeout( () => { 
        this.currNumColNm = col
        this.currNumColData = this.useData.filter( d => !!d).map( (d) => d[col] ) 
    })
  }

  closeCharts() {
    this.close.emit(false)
  }
  
}
