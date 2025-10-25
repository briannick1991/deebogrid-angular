import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonService } from '../../../services/common-service';
import { DataTableService } from '../../../services/data-table-service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dot-plot-component',
  imports: [ CommonModule, ],
  templateUrl: './dot-plot-component.html',
  styleUrl: './dot-plot-component.css'
})
export class DotPlotComponent {

  lgClass: string = "line-graph"
  alloneyr: boolean = false
  lblTxt: string = ""
  warnmsg: string = ""
  naddedtks: any[] = []
  nmrks: any[] = []
  dtmrks: any[] = []
  dtmrksH: any[] = []
  plots: any[] = []
  @Input() dateData: any[] = []
  @Input() allData: any[] = []
  @Input() numData: number[] = []
  @Input() column: string = ""
  @Input() numCol: string = ""
  @ViewChild("lineGraph", { static: true }) lineGraph!: ElementRef<HTMLDivElement>;
  @ViewChild("lgContain", { static: true }) lgContain!: ElementRef<HTMLDivElement>;

  constructor(public common: CommonService,
              public dataTableService: DataTableService,)
   {}

  ngOnInit() {
    if(this.allData.length > this.dataTableService.dpLim){
      this.lgClass = "flex-center"
      this.warnmsg = "Load a Dot Plot at your own risk using a button above."
    }
  }
  
  ngAfterViewInit() {
    setTimeout( () => { this.drawLineGraph(this.dateData, this.numData, this.allData, this.allData.length) })
  }

  drawLineGraph(dcol: any[], ncol: number[], data: any[], dlen: number): any {
    if(dcol.length && ncol.length && data && data.length){
          try{
              const lmarg = 60
              const lg = this.lineGraph.nativeElement
              const par = this.lgContain.nativeElement
              lg.style.width = ((par.getBoundingClientRect().width*0.92) -lmarg) + "px";
              let lgbds = lg.getBoundingClientRect()
              const hgtPropr = .64;
              const gHgt = Math.ceil(Math.max((lgbds.width*hgtPropr), 275))
              lg.style.height = gHgt + "px";
              lgbds = lg.getBoundingClientRect()

              //numbers
              const numArr = data.filter((a) => !!a[this.column] ).map( (d) => d[this.numCol] ).
              filter( (a) => !!a && a >= 0 ).sort( (a, b) => (a - b)*-1 );
              if(numArr.length < 2 || !numArr.some( (n) => n > 0 ))
                  return this.killPlots("No Dot Plot Data to present")
              const nlen = numArr.length;
              const nmmin = numArr[(nlen-1)]
              const nmmax = numArr[0]
              const nmrange = nmmax - nmmin;
              const nqtrdts = (nmrange/4) + nmmin
              const nhalfdts = (nmrange/2) + nmmin
              const nthrqtrdts = (nmrange*0.75) + nmmin
              const nokTickVal = [nmmax, nthrqtrdts, nhalfdts, nqtrdts, nmmin]//desc order!
              const ntklen = nokTickVal.length
              let nadded = [];
              let t = 0
              for(t; t < ntklen; t++){
                  const ntkval = nokTickVal[t]?.toLocaleString(undefined, {maximumFractionDigits: 2});
                  if(this.naddedtks.map( n => n.value).indexOf(ntkval) > -1)
                      continue
                  this.naddedtks.push({value: ntkval, visible: false})
              }
              let i = 0
              for(i; i < nlen; i++){//not seen but heard
                  const unum = numArr[i]
                  if(nadded.indexOf(unum) > -1)
                      continue
                  const pct = ((unum-nmmin) / nmrange)
                  const usenval = unum?.toLocaleString(undefined, {maximumFractionDigits: 2});
                  this.nmrks.push({value: usenval, percent: pct.toFixed(2), visible: false})
                  nadded.push(usenval)
              }
              //numbers

              //dates
              let arrFrmSet: any[] = []
              const dSet = new Set(data.filter( (a) => !!a[this.numCol] ).map( (d) => d[this.column] ))//unique dates
              dSet.forEach( (v) => { arrFrmSet.push(v) });
              if(arrFrmSet.length < 2)
                return this.killPlots();
              const dttype = typeof arrFrmSet[0];
              const ordDts = arrFrmSet.filter( (a) => !!a ).sort( (a, b) => { 
                  return (dttype !== "object" ? (parseInt(a.toString()) - parseInt(b.toString())) : ( a.getTime() - b.getTime() ))
              })
              let m = 0
              let added = []
              const olen = ordDts.length
              const yearvals = ordDts.map( (o) => typeof o !== "object" ? o : o.getFullYear() )
              this.alloneyr = (new Set(yearvals.filter( (d) => true )).size < 2) ? true : false;//unique years
              let yrReg = new RegExp("sjdkgf", "g")//not gonna replace anything
              if(this.alloneyr)
                  yrReg = new RegExp("\/" + yearvals[0], "g")
              let dtrange
              let dtmin: any; let dtmax: any;
              if(typeof ordDts[0] === "object"){
                  dtmin = ordDts[0]
                  dtmax = ordDts[(ordDts.length-1)]
              }
              if(typeof ordDts[0] === "number"){
                  dtmin = ordDts[0]
                  dtmax = ordDts[(ordDts.length-1)]
              }
              if(typeof ordDts[0] === "string" && !isNaN(parseInt(ordDts[0])) && !isNaN(parseInt(ordDts[(ordDts.length-1)]))){
                  dtmin = parseInt(ordDts[0]);
                  dtmax = parseInt(ordDts[(ordDts.length-1)])
              }
              dtrange = typeof ordDts[0] === "object" ? (dtmax.getTime() - dtmin.getTime()) : (dtmax - dtmin)
              if(!dtrange || typeof dtrange !== "number")
                return this.killPlots();
              const figureDtTicks = (val: number) => (typeof dtmin === "object" ? new Date(val+dtmin.getTime()) : (val+dtmin))
              const qtrdts = figureDtTicks(Math.ceil(dtrange/4))
              const halfdts = figureDtTicks(Math.ceil(dtrange/2))
              const thrqtrdts = figureDtTicks(Math.ceil(dtrange*0.75))
              const okDtTks = [dtmin, qtrdts, halfdts, thrqtrdts, dtmax];
              let de = 0
              let addeddttks = []
              const dtklen = okDtTks.length
              for(de; de < dtklen; de++){
                  const tval = okDtTks[de]
                  const useDVal = this.common.isADateObject(tval) ? tval.toLocaleDateString().replace(yrReg, "") : tval
                  if(addeddttks.indexOf(useDVal) > -1)
                      continue
                  this.dtmrks.push({value: useDVal, left: 0, visible: false})
                  addeddttks.push(useDVal)
              }
              for(m; m < olen; m++){
                  const oval = ordDts[m]
                  const useDVal = this.common.isADateObject(oval) ? oval.toLocaleDateString().replace(yrReg, "") : oval
                  if(added.indexOf(useDVal) > -1)
                      continue
                  let pct: number = 0
                  if(typeof ordDts[0] === "object")
                      pct = ((ordDts[m].getTime()-ordDts[0].getTime()) / dtrange)
                  if(typeof ordDts[0] === "number")
                      pct = ((ordDts[m]-ordDts[0]) / dtrange)
                  if(typeof ordDts[0] === "string")
                      pct = ((parseInt(ordDts[m])-parseInt(ordDts[0])) / dtrange)
                  this.dtmrksH.push({ value: useDVal, percent: pct.toFixed(2), left: 0, visible: false })
                  added.push(useDVal)
              }//space out the markers
              //dates
              //set graph dims
              setTimeout( (): any => {
                let r =0
                let hd =0
                let y =0
                const halfPlot = 4
                const mrks = document.querySelectorAll("#" + par.id + " .lg-dt-marker")
                const mrlen = mrks.length
                const hmrks = this.dtmrksH
                const hmrlen = hmrks.length
                const lastdtdv = mrks[mrlen-1].getBoundingClientRect()
                const space = (lgbds.right - (lastdtdv.right/*-lmarg*/)) - halfPlot
                const divby = Math.max(1, (mrlen-1))
                const mrrgt = Math.ceil(space/divby)//divide space up by count-1 because last gets no marg right
                for(r; r < mrlen; r++){
                  const dtmrk = this.dtmrks[r]
                  if(dtmrk)
                    dtmrk.left = Math.floor(mrrgt*r) + "px";
                }
                setTimeout( () => {
                  const m0 = mrks[0].getBoundingClientRect()
                  const xrange = mrks[mrlen-1].getBoundingClientRect().right - m0.left
                  for(hd; hd < hmrlen; hd++){
                    const hmrk = hmrks[hd]
                    if(hmrk)
                      hmrk.left = Math.floor((parseFloat(hmrk.percent)*(xrange-(m0.width/2))) - halfPlot) + "px";
                  }
    
                  const nmrks = document.querySelectorAll("#" + par.id + " .lg-n-marker")
                  const nmrlen = nmrks.length
                  const hnmrks = this.nmrks
                  const hnmrlen = hnmrks.length
                  const botndv = nmrks[nmrlen-1].getBoundingClientRect()
                  const nspace = (lgbds.bottom - botndv.top) - botndv.height/2
                  const nmrbot = Math.floor(nspace/(nmrlen-1))//divide space up by count-1 because last gets no marg bot
                  for(y; y < nmrlen; y++){
                      if(y < (nmrlen-1)){
                        const nm: HTMLElement = <HTMLElement>nmrks[y]
                        nm.style.marginBottom = nmrbot + "px";
                      }
                  }
                  //set graph dims
                  //add x label
                  const pretXlbl = this.common.sanitizeUi(this.common.titleCase(this.column))
                  this.lblTxt = pretXlbl
                  if(this.alloneyr)
                      this.lblTxt = yearvals[0] + " " + pretXlbl
                  //add x label
                  setTimeout( () => {
                    //add plots
                    const maxPtLft = xrange - halfPlot
                    const maxPtBot = lgbds.height - (halfPlot*3) - 1;
                    const dtmrWid =mrks[0].getBoundingClientRect().width
                    const findDtLft = (dt: any) => {
                        let q = 0; let k = 0
                        const ptval = this.common.isADateObject(dt) ? dt.toLocaleDateString().replace(yrReg, "") : dt
                        for(q; q < mrlen; q++){
                            const dtmrk = this.dtmrks[q]
                            if(dtmrk){
                              const dttxt = dtmrk.value
                              if(ptval === dttxt)
                                return (parseInt(dtmrk.left.replace(/[ ]?(px\%)/g, "")) || 0) + (dtmrWid/2) - halfPlot
                            }
                        }
                        
                        for(k; k < hmrlen; k++){
                            const hm = hmrks[k]
                            const dttxt = hm.value
                            if(ptval === dttxt)
                              return Math.min(maxPtLft, ((parseInt(hm.left.replace(/[ ]?(px\%)/g, "")) || 0))) - halfPlot
                        }
                        return null;
                    }
      
                    const nmrHgt =nmrks[0].getBoundingClientRect().height
                    const lbot = lgbds.bottom
                    const findNBot = (num: number) => {
                        let q = 0; let k = 0
                        const ptval = num?.toLocaleString(undefined, {maximumFractionDigits: 2});
                        for(q; q < nmrlen; q++){
                            const nmrk = this.naddedtks[q]
                            if(nmrk){
                              const dttxt = nmrk.value
                              if(ptval === dttxt)
                                  return (lbot - nmrks[q].getBoundingClientRect().bottom) + (nmrHgt/2) - halfPlot/*halfPlot is half the dot*/
                            }
                        }
                        
                        for(k; k < hnmrlen; k++){
                            const hnmrk = hnmrks[k]
                            const dttxt = hnmrk.value
                            if((ptval === dttxt) && hnmrk.percent){
                                const totalh = (lgbds.height*(parseFloat(hnmrk.percent) || 0)) + (nmrHgt/2) - halfPlot
                                return Math.min(maxPtBot, Math.ceil(totalh))/*halfPlot is half the dot*/
                            }
                        }
                        return null;
                    }
                    let p = 0;
                    for(p; p < dlen; p++){
                        try{
                            const dval = data[p]
                            if(!dval[this.column] || (typeof dval[this.numCol] !== "number"))
                                continue;
                            const plft = findDtLft(dval[this.column])
                            const pbot = findNBot(dval[this.numCol])
                            if(!plft || !pbot || typeof plft !== "number" || typeof pbot !== "number")
                                continue
                            const usedval = this.common.isADateObject(dval[this.column]) ? dval[this.column].toLocaleDateString().replace(yrReg, "") : dval[this.column]
                            let pt = { 
                              date: usedval, 
                              number: dval[this.numCol].toLocaleString(undefined, {maximumFractionDigits: 2}),
                              left: (Math.floor(plft) + "px"),
                              bottom: (Math.floor(pbot) + "px"),
                              background: "rgb(50, 50, 50)",
                            }
                            this.plots.push(pt)
                            if(this.dataTableService.themeColor1)
                                pt.background = this.dataTableService.themeColor1
                        }catch(e){}
                    }
                    if(!this.plots.length)
                        return this.killPlots();
                    //add plots
                  })
                })
              }, 250)
          }catch(e){}
        }
    }

    showDotPlotInfo(dt: any, num: any): any {
        const mrks = this.dtmrks
        const mrlen = mrks.length
        const hmrks = this.dtmrksH
        const hmrlen = hmrks.length
        let q = 0; let k = 0
        for(q; q < mrlen; q++){
            const dttxt = mrks[q].value
            if(dt === dttxt)
                return mrks[q].visible = true
        }
        
        for(k; k < hmrlen; k++){
            const dttxt = hmrks[k].value
            if(dt === dttxt)
                return hmrks[k].visible = true
        }

        q = 0;
        k = 0;
        const nmrks = this.naddedtks
        const nmrlen = nmrks.length
        const hnmrks = this.nmrks
        const hnmrlen = hnmrks.length
        const ptval = num?.toLocaleString(undefined, {maximumFractionDigits: 2});
        for(q; q < nmrlen; q++){
            const dttxt = nmrks[q].value
            if(ptval === dttxt)
                nmrks[q].visible = true
        }
        
        for(k; k < hnmrlen; k++){
            const dttxt = hnmrks[k].value
            if(ptval === dttxt)
                return hnmrks[k].visible = true
        }
    }

    hideDotPlotInfo() {
      this.dtmrks = this.dtmrks.map( n => {
        n.visible = false
        return n
      })
      this.dtmrksH = this.dtmrksH.map( n => {
        n.visible = false
        return n
      })
      this.naddedtks = this.naddedtks.map( n => {
        n.visible = false
        return n
      })
      this.nmrks = this.nmrks.map( n => {
        n.visible = false
        return n
      })
    }

    killPlots(msg?: string) {
      this.lblTxt = ""
      this.plots = []
      this.nmrks = []
      this.dtmrks = []
      this.dtmrksH = []
      this.naddedtks = []
      this.lgClass = "flex-center"
      this.warnmsg = msg || "We couldn't build a graph from this data.";
    }

}
