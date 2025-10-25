import { Component, Input } from '@angular/core';
import { CommonService } from '../../../services/common-service';
import { DataTableService } from '../../../services/data-table-service';
import { CommonModule } from '@angular/common';
import { NumValueDistroComponent } from '../num-value-distro-component/num-value-distro-component';
import { PieGraphComponent } from '../pie-graph-component/pie-graph-component';

@Component({
  selector: 'app-column-chart',
  imports: [ CommonModule, NumValueDistroComponent, PieGraphComponent, ],
  templateUrl: './column-chart.html',
  styleUrl: './column-chart.css'
})
export class ColumnChart {

  isNumData = false
  isBoolData = false
  counts: any = null
  sum: string = ""
  avg: string = ""
  min: string = ""
  max: string = ""
  numArrMax: number = 5000
  numAvg: number = 0
  modeHtml: string = ""
  tdivHtml: string = ""
  numValDistMsg = ""
  numLen: number = 0
  symCls: string = ""
  symAttr: string = ""
  pieData: any = null
  nonNumUVal: string = ""
  nonNumEVal: string = ""
  @Input() column: string = ""
  @Input() colData: any[] = []

  constructor(public common: CommonService,
              public dataTableService: DataTableService,){ }

  ngOnInit() {
    this.buildDataInsights()
  }

  setDistMsg(event: string) {
    this.numValDistMsg = event
  }

  buildDataInsights() {
    const yearCol = /(year|yr|fy)/g.test(this.column?.toLocaleLowerCase())
    const allNumData = this.colData.every( d => !d || (d && typeof d === "number") )
    const boolData = this.colData.every( d => !d || (d && typeof d === "boolean") )
    this.counts = this.getColumnValueCounts(this.colData)//build pie graphs with this
    let mode = this.getColumnMode(this.counts)
    const disr = (this.counts["n_a"] && this.counts["n_a"] >= mode?.amount) ? " (non-empty value)" : "";
    if(mode && mode.amount != 1){
        try{
            let maxChars = 75
            let pMdTxt = this.common.sanitizeUi(mode.text)
            if(mode.text && typeof mode.text === "string"){
                pMdTxt = mode.text.substring(0, maxChars)
                if(pMdTxt.length === maxChars){
                    try{
                        pMdTxt = (pMdTxt.trim() + "...")
                        if(pMdTxt.startsWith("\""))
                            pMdTxt += "\""
                        if(pMdTxt.startsWith("'"))
                            pMdTxt += "'"
                    }catch(e){}
                }
            }
            if(pMdTxt && allNumData && !yearCol)
                pMdTxt = parseInt(pMdTxt).toLocaleString(undefined, { maximumFractionDigits: 3 })
            const modeVal = mode.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })
            this.modeHtml = "Most frequent"+disr+": <i>" + pMdTxt + "</i> appears " + modeVal + " time" + (mode.amount === 1 ? "" : "s");
        }catch(e){}
    }
    let bitData;
    if(allNumData)
        bitData = this.colData.every( d => !d || d === 1 || d === 0 )
    if(allNumData && !yearCol && !bitData){//num data
        this.isNumData = true
        const numsOnly = this.colData.filter( d => !!d || (d === 0) )
        this.numLen = numsOnly.length
        let usum = numsOnly.reduce( (acc, curr) => (acc + curr), 0)
        const lastNum = numsOnly[numsOnly.length-1]
        const sym = this.dataTableService.dataFilSrtTracker[this.column]?.colCellSymbol;
        if(sym){
            this.symCls = ["$","€","£","¥","₣","₹"].indexOf(sym) > -1 ? ' has-symbol-b' : ' has-symbol';
            this.symAttr = sym;
        }
        if(typeof lastNum === "number" && ((usum - lastNum === lastNum) || (Math.abs(usum - lastNum*2) < 0.02))){//check that a total column is already there
            usum -= lastNum
            this.numLen -= 1
            this.tdivHtml = "We omitted the last value from the total because it may be a total row itself.";
        }
        this.numAvg = (usum/this.numLen)
        this.sum = usum.toLocaleString(undefined, { maximumFractionDigits: 5 });
        this.avg = this.numAvg.toLocaleString(undefined, { maximumFractionDigits: 2 });
        this.min = Math.min(...numsOnly).toLocaleString(undefined, { maximumFractionDigits: 5 });
        this.max = Math.max(...(this.tdivHtml ? numsOnly.filter( (n, ind) => ind < (numsOnly.length-1) ) : numsOnly)).
        toLocaleString(undefined, { maximumFractionDigits: 5 });
        if(this.numLen && this.numLen < this.numArrMax)
            this.numValDistMsg = "Building " + this.common.sanitizeUi(this.common.titleCase(this.column)) + " value distribution..."
    } else {
        const dSet =new Set(this.colData)
        let arrFrmSet: any[] = []
        dSet.forEach( (v) => { arrFrmSet.push(v) })
        this.nonNumUVal = arrFrmSet.length.toLocaleString(undefined, { maximumFractionDigits: 0 }) + " unique value" + (dSet.size === 1 ? "" : "s")
        const empVals = this.colData.filter( (d) => !d).length
        this.nonNumEVal = empVals.toLocaleString(undefined, { maximumFractionDigits: 0 }) + " empty value" + (empVals === 1 ? "" : "s");                
        const cantDoDD = arrFrmSet.some( a => a && a.length > 40 )
        if(!cantDoDD && ((boolData || bitData) || (arrFrmSet.filter( (a) => !!a ).length > 0 && this.colData.every( (d) => !d || typeof d === "string")))){
            if(arrFrmSet.length <= 18)
                this.pieData = { counts: this.counts, type: ((boolData || bitData) ? "boolean" : "string") }
        }
    }
    // if(len){
    //     //end rows evenly
    //     if(wid >= 760){
    //         let n = 0;
    //         let ifds = document.getElementsByClassName("insight-field")
    //         const mod = ifds.length%insightCols
    //         const addLen = insightCols-mod
    //         const rows = document.getElementsByClassName("insight-field-row")
    //         const lastRow = rows[(rows.length)-1]
    //         // if(!lastRow.children.length)
    //         //     return el.removeChild(lastRow)
    //         if(lastRow && addLen !== insightCols){
    //             for(n; n < addLen; n++){
    //                 const div = document.createElement("div")
    //                 div.className = "insight-field"
    //                 div.style.color = "white"
    //                 div.style.textAlign = "center"
    //                 div.textContent = "A"
    //                 lastRow.appendChild(div)
    //             }
    //         }
    //     }
    // }
    // if(!forSelRows && !document.getElementsByClassName("graph-actual-bar").length){
    //     const makeBarGraph = dataUpload.methods.canBeBarGraph(cols, data, dLen)
    //     if(makeBarGraph && typeof makeBarGraph === "object")
    //         dataUpload.methods.buildBarGraphWithTwoCols(makeBarGraph)
    // }
    // if(dtCols.length && numCols.length && typeof document.querySelectorAll === "function")
    //     dataUpload.methods.buildLineGraphs(dtCols, numCols, data, dLen, selOrFil, dLen)
  }

  getColumnValueCounts(data: any[]) {
        let i = 0
        let count: any = {}
        const na = "n_a"
        const len = data.length
        for(i; i < len; i++){
            const d = data[i]
            const val = (d && typeof d) === "string" ? d : 
            (this.common.isADateObject(d) ? d.toLocaleDateString() : d)
            if(!val || typeof val === "undefined" || this.dataTableService.badStrings.indexOf(val) > -1){
                if(!count[na] || typeof count[na] === "undefined")
                    count[na] = 1
                else
                    count[na] += 1
                continue
            }
            if(!count[val] || typeof count[val] === "undefined")
                count[val] = 1
            else
                count[val] += 1
        }
        count[this.dataTableService.deboTotal] = len
        return count;
    }

    getColumnMode(count: any) {
        let most = null
        const na = "n_a"
        for(const prop in count){
            if(prop === this.dataTableService.deboTotal || prop === na)
                continue
            if(!most)
                most = {text: prop, amount: count[prop]}
            if(count[prop] > most.amount)
                most = {text: prop, amount: count[prop]}
        }
        return most
    }

}
