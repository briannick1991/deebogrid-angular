import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonService } from '../../../services/common-service';
import { DataTableService } from '../../../services/data-table-service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pie-graph-component',
  imports: [CommonModule],
  templateUrl: './pie-graph-component.html',
  styleUrl: './pie-graph-component.css'
})
export class PieGraphComponent {

  rmNotes: any[] = []
  pieLbls: any[] = []
  @Input() data: any = null
  @Input() column: string = ""
  @ViewChild("pieParent", { static: true }) pieParent!: ElementRef<HTMLElement>; 
  @ViewChild("pieCanvas", { static: true }) pieCanvas!: ElementRef<HTMLElement>; 
  @ViewChild("pieLayover", { static: true }) pieLayover!: ElementRef<HTMLElement>;

    constructor(public common: CommonService,
                public dataTableService: DataTableService,)
   {}

   ngOnInit() {
       this.buildPieGraphFromColVals(this.data.counts, this.data.type)
   }

  //pie graph
  buildPieGraphFromColVals(counts: any, type: any) {
    let data = []
    const div: HTMLDivElement = <HTMLDivElement>this.pieParent.nativeElement
    const odiv: HTMLDivElement = <HTMLDivElement>this.pieLayover.nativeElement
    const canvas: HTMLCanvasElement = <HTMLCanvasElement>this.pieCanvas.nativeElement;
    const ctx = canvas.getContext("2d");
    if(ctx){
        const dbds = div.getBoundingClientRect()
        const cwid = dbds.width
        const canWid = Math.floor(cwid/3)
        canvas.width = canWid;
        canvas.height = canWid;
        div.appendChild(canvas)
        div.appendChild(odiv)
        const cBds = canvas.getBoundingClientRect()
        const oWid = Math.floor(cwid/3.8)
        odiv.style.width = oWid + "px"
        odiv.style.height = oWid + "px"
        const diff = cBds.width-oWid
        odiv.style.top = Math.floor((cBds.top-dbds.top) + (diff/2)) + "px";
        odiv.style.left = Math.floor((cBds.left-dbds.left) + (diff/2)) + "px";
        const props = Object.keys(counts)
        let colors = ["forestgreen", "crimson", "orange", "blue", "turquoise", "brown", "hotpink", "goldenrod", "purple", "olive", "steelblue", "black", 
            "violet", "teal", "gray", "navy", "tan", "indigo"]
        const na = "n_a"
        const oth = "Other"
        const dTotal = counts[this.dataTableService.deboTotal]
        if(props.length >= 5){
            const totalSansEmp = counts[na] ? (dTotal - counts[na]) : dTotal
            for(const prop in counts){//first alter small percents to other
                if(prop === this.dataTableService.deboTotal || prop === oth)
                    continue
                const percent = Math.ceil((counts[prop]/totalSansEmp)*100)
                if(percent < 5){
                    if(!counts[oth] || typeof counts[oth] === "undefined")
                        counts[oth] = counts[prop]
                    else
                        counts[oth] += counts[prop]
                    delete counts[prop]
                }
            }
        }
    
        if(counts[oth])
            props.push(oth)
        
        const isBool = type === "boolean" ? true : false;
        if(isBool || props.filter( (p) => p != this.dataTableService.deboTotal ).length < 3)
            colors = [(this.dataTableService.themeColor1 || "#00a8f3"), (this.dataTableService.themeColor2 || "black")]
        const numNa = counts[na]
        const rmNaPer = 65
        const perNa = numNa ? ((numNa/dTotal)*100) : 0
        const useTotal = (!isBool && numNa && (perNa > rmNaPer)) ? (dTotal-numNa) : dTotal
        for(const prop in counts){
            if(prop === this.dataTableService.deboTotal)
                continue
            const percent = (counts[prop]/useTotal)*100
            const strPct = percent.toLocaleString(undefined, {maximumFractionDigits: 1})
            if(strPct === "0")
                continue
            if(!isBool && (prop === na && perNa > rmNaPer)){
                const rmNt = "Note: <b>N/A</b> values make up " + Math.floor(perNa).toLocaleString(undefined, {maximumFractionDigits: 0}) + "% of all values, " +
                              "so we removed it from the chart to help visualize the make up of values in this column from the " + 
                              Math.ceil(100-perNa).toLocaleString(undefined, {maximumFractionDigits: 0}) + "% that has values."
                this.rmNotes.push(rmNt)
                continue
            }
            const color = colors[props.indexOf(prop)]
            data.push({ label: prop, value: counts[prop], color: color })
            this.pieLbls.push({ text: this.common.sanitizeUi(prop).replace(/n_a/, "N/A"), background: color, percent: (strPct+"%") })
        }
    
        let n = 0
        let total = 0;
        const dlen = data.length
        for (n; n < dlen; n++) {
            total += data[n].value;
        }
    
        const maxArr = data.sort( function(a, b) { return a.value < b.value ? -1 : 1 })
        const max = maxArr[(maxArr.length-1)]
        if(max && (max.value !== maxArr[0].value || maxArr.length === 1)){
            odiv.style.color = max.color;
            odiv.innerHTML = ("<div><div>" + this.common.sanitizeUi(max.label) + '</div><div class="pad-top-sm">'+((max.value/total)*100).toFixed(1)+ '%</div></div>')
        }
    
        if(dlen > 1){
            try{
                let m = 0
                let diffCts = []
                for(m; m < dlen; m++){
                    const dct = data[m].value
                    if(diffCts.indexOf(dct) < 0)
                        diffCts.push(dct)
                }
                if(diffCts.length === 1){
                    let cltxt = this.column
                    if(!cltxt.endsWith("s"))
                        cltxt += "s";
                    odiv.innerHTML = ('<div><div><b class="ins-even-dist-ct">' + dlen + '</b> </div><div class="pad-top-sm">' +cltxt+ '</div></div>')
                }
            }catch(e){}
        }
    
        let i = 0
        let startAngle = 0;
        for (i; i < dlen; i++) {
            const sliceAngle = 2 * Math.PI * data[i].value / total;
    
            ctx.beginPath();
            ctx.arc(canvas.width/2, canvas.height/2, Math.min(canvas.width, canvas.height)/2, startAngle, startAngle + sliceAngle);
            ctx.lineTo(canvas.width/2, canvas.height/2);
            ctx.fillStyle = data[i].color;
            ctx.fill();
            ctx.closePath();
    
            startAngle += sliceAngle;
        }
      }
    }
}
