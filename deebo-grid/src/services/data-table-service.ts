import { Injectable } from '@angular/core';
import { CommonService } from './common-service';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { ColumnSymbol } from '../interfaces/column-symbol';

@Injectable({
  providedIn: 'root'
})
export class DataTableService {

            constructor(private common: CommonService,
                        private http: HttpClient,
            ) {
              
            }

            sortOrder: string[] = []
            mainData: any[] = []
            mainDataLen = 0
            // currPage = 1
            // rowsPerPage = 25
            currFilData: any[] = []
            isSorting = false;
            isFiltering = false
            currEditIndex: any = 0
            currColumnEdit: any = null;
            currSelRows: any[] = []//just be an index of mainData
            displayOnlySelRows = false
            noDataMsg: string = "Loading data..."
            errorLoading = false;
            dataFilSrtTracker: any = {}
            comparatorOpts: any = {
                text: ["Equals", "Not Equal", "Empty", "Not Empty", "Contains", "Starts With", "Ends With"],
                number: ["Equals", "Not Equal", "Empty", "Not Empty", "Less Than", "Less Than or Equal", "Greater Than", "Greater Than or Equal"],
                date: ["Equals", "Not on", "Empty", "Not Empty", "Before", "After"],
            }

            /*numeric columns can have a predefined symbol up to 2 characters long, 
            add these based on columns (object properties) coming from your api*/
            columnSymbols: ColumnSymbol[] = [
                { column: "width", symbol: "px" },
                { column: "height", symbol: "px" },
            ]

            getSampleData(): Observable<any> {
              return this.http.get(/*"https://d2ffvluimla00s.cloudfront.net/stim_imgs_comm.json"*/"http://127.0.0.1:8080/api/big-data-test").pipe(
                catchError(error => {
                    this.errorLoading = true
                    this.noDataMsg = error.message
                    return of([]); // Return an empty array as a fallback
                }))
            }

            getNewTrackerObj(colName: string) {
                const symbol = this.columnSymbols.filter( c => c.column === colName)[0]?.symbol?.substring(0, 2);
                return { 
                        filter: "", 
                        comparator: "", 
                        sort: null, 
                        type: "string", 
                        selDDVals: null,
                        minimize: false, 
                        freeze: false, 
                        colWidth: null,
                        colCellSymbol: symbol,
                }
            }

            buildDataFilSrtTracker(data: any) {
                let i = 0
                let obj: any = {}
                const len = data.length
                for(i; i < len; i++)
                    obj[data[i]] = this.getNewTrackerObj(data[i])
                return obj
            }

            resetFilSrtTracker() {
                for(const prop in this.dataFilSrtTracker){
                    const fsObj = this.dataFilSrtTracker[prop]
                    const oType = fsObj["type"]//keep
                    const ddvals = fsObj["selDDVals"]?.map( (v: any) => {v.checked = true; return v})//keep
                    const oWid = fsObj["colWidth"]//keep
                    const sym = fsObj["colCellSymbol"]//keep
                    const min = false;
                    const compToUse = (ddvals && ddvals.length) ? "Equals" : "";
                    this.dataFilSrtTracker[prop] = { filter: "", comparator: compToUse, sort: null, type: oType, selDDVals: ddvals, minimize: min, 
                        freeze: false, colWidth: oWid, colCellSymbol: sym,
                    }
                }
            }

            nLevelSort(data: any[], sortOrder: string[], obj: any) {
                let sortData = data.filter( (d: any) => true)
                const len = sortOrder.length
                for(var i = (len-1); i >= 0; i--){
                    const field = sortOrder[i]
                    const dir = obj[field]["sort"] === "asc" ? 1 : -1;
                    sortData = sortData.sort( (a: any, b: any) => { 
                        if(!a[field] && a[field] !== 0)
                            return 1
                        if(!b[field] && b[field] !== 0)
                            return -1
                        if(a[field] > b[field])
                            return (1*dir)
                        if(a[field] === b[field])
                            return 0
                        return (-1*dir)
                    })
                }
                return sortData
            }

            doSortOnField(field: any) {
                if(!this.sortOrder.length || this.sortOrder.indexOf(field) < 0){
                    this.sortOrder.push(field)
                    this.dataFilSrtTracker[field]["sort"] = "asc"
                } else {
                    const currSort = this.dataFilSrtTracker[field]["sort"]
                    switch(currSort){
                        case "desc":
                            this.dataFilSrtTracker[field]["sort"] = null
                            this.sortOrder = this.sortOrder.filter( (s: string) => s !== field )
                        break;
                        case "asc":
                            this.dataFilSrtTracker[field]["sort"] = "desc"
                        break;
                    }
                }
                this.currFilData = this.nLevelSort(this.currFilData, this.sortOrder, this.dataFilSrtTracker)
            }

            nLevelFilter(data: any, filterVal: any, ddVals: any, comparator: any, field: any) {
                const sixHrs = (1000*60*60*6)
                const oneDay = (1000*60*60*24)
                const symReg = new RegExp(/[$€£₹¥¢\,]/, "g")
                const isDtReg = new RegExp(/\d+(\/|-)\d+(\/|-)\d+/)
                if(filterVal && typeof filterVal === "string"){
                    filterVal = filterVal.toLocaleLowerCase()
                    if(!this.common.idCol(field) && !isDtReg.test(filterVal) && !isNaN(parseInt(filterVal.replace(symReg, ""))))//not viewed as num, but can be
                        filterVal = /\./g.test(filterVal) ? parseFloat(filterVal.replace(symReg, "")) : parseInt(filterVal.replace(symReg, ""))
                    if(this.common.testShortDate(filterVal) || this.common.testISODate(filterVal) || this.common.testLongDate(filterVal))
                        filterVal = new Date(filterVal)
                }
                return data.filter( (d: any) => {
                    if(!ddVals && (!filterVal && filterVal != "0") && (!comparator || (comparator && comparator !== "Not Empty" && comparator !== "Empty")))
                        return true
                    let colVal = d[field]
                    if(typeof colVal === "string")
                        colVal = colVal.toLocaleLowerCase()
                    if(!comparator){//what we did originally
                        if(ddVals && ddVals.length){
                            const chkdVs = ddVals.filter( (d: any) => { return d.checked }).
                            map( (v: any) => { return typeof v.value === "string" ? v.value.toLocaleLowerCase() : v.value })
                            return chkdVs.indexOf(colVal) > -1
                        } else {
                            if(typeof colVal === "string")
                                return (colVal == filterVal || colVal.startsWith(filterVal) || colVal.indexOf(filterVal) > -1)
                            if(typeof colVal === "number")
                                return (colVal == filterVal || colVal.toString().startsWith(filterVal) || colVal.toString().indexOf(filterVal) > -1)
                            if(this.common.isADateObject(filterVal) && this.common.isADateObject(colVal))
                                return Math.abs(colVal.getTime() - filterVal.getTime()) < sixHrs
                            return colVal == filterVal
                        }
                    } else {
                        if(comparator === "Equals"){
                            if(ddVals && ddVals.length){
                                const chkdVs = ddVals.filter( (d: any) => { return d.checked }).
                                map( (v: any) => { return typeof v.value === "string" ? v.value.toLocaleLowerCase() : v.value })
                                return chkdVs.indexOf(colVal) > -1
                            } else {
                                if(this.common.isADateObject(filterVal) && this.common.isADateObject(colVal))
                                    return Math.abs(colVal.getTime() - filterVal.getTime()) < sixHrs
                                return colVal == filterVal
                            }
                        }
                        if(comparator === "Not Equal" || comparator === "Not on"){
                            if(ddVals && ddVals.length){
                                const chkdVs = ddVals.filter( (d: any) => { return !d.checked }).
                                map( (v: any) => { return typeof v.value === "string" ? v.value.toLocaleLowerCase() : v.value })
                                return chkdVs.indexOf(colVal) > -1
                            } else {
                                if(this.common.isADateObject(filterVal) && this.common.isADateObject(colVal))
                                    return Math.abs(colVal.getTime() - filterVal.getTime()) > oneDay
                                return colVal != filterVal
                            } 
                        }
                        if(comparator === "Contains")
                            return colVal && ((typeof colVal === "string" && colVal.indexOf(filterVal) > -1) || colVal == filterVal)
                        if(comparator === "Starts With")
                            return colVal && ((typeof colVal === "string" && colVal.startsWith(filterVal)) || (typeof colVal !== "string" && colVal.toString().startsWith(filterVal)))
                        if(comparator === "Ends With")
                            return colVal && ((typeof colVal === "string" && colVal.endsWith(filterVal)) || (typeof colVal !== "string" && colVal.toString().endsWith(filterVal)))
                        if(comparator === "Less Than" || comparator === "Before")
                            return colVal < filterVal
                        if(comparator === "Less Than or Equal")
                            return colVal <= filterVal
                        if(comparator === "Greater Than" || comparator === "After")
                            return colVal > filterVal
                        if(comparator === "Greater Than or Equal")
                            return colVal >= filterVal
                        if(comparator === "Not Empty"){
                            if((ddVals && ddVals.length) || (!filterVal && filterVal != "0"))
                                return !!colVal || (colVal === 0)//just return non empty
                            //treat it like normal filter
                            if(typeof colVal === "string")
                                return (colVal == filterVal || colVal.startsWith(filterVal) || colVal.indexOf(filterVal) > -1)
                            if(typeof colVal === "number")
                                return (colVal == filterVal || colVal.toString().startsWith(filterVal) || colVal.toString().indexOf(filterVal) > -1)
                            if(this.common.isADateObject(filterVal) && this.common.isADateObject(colVal))
                                return Math.abs(colVal.getTime() - filterVal.getTime()) < sixHrs
                            return colVal == filterVal
                        }
                        if(comparator === "Empty")
                            return (!colVal && colVal !== 0)
                        return false
                    }
                }).sort( (a: any, b: any) => { 
                    if(comparator)
                        return 0
                    const colVal = a[field]
                    if(colVal && typeof colVal === "string")
                        return (colVal.toLocaleLowerCase() == filterVal || colVal.toLocaleLowerCase().startsWith(filterVal)) ? -1 : 1
                    if(colVal && typeof colVal === "number")
                        return (colVal == filterVal || colVal.toString().startsWith(filterVal)) ? -1 : 1
                    return 0
                 })
            }
    
            columnFilter(dataI: any[], field: string, dataObj: any, sortOrder: string[], manual: any) {
                if(manual && !this.displayOnlySelRows && !dataObj[field].filter && this.arefilSrtTrkPropsDefault(true))
                    return this.currFilData = this.mainData.filter( (d: any) => true )
                const initData = !this.displayOnlySelRows ? dataI :
                dataI.filter( (d: any, ind: any) => { return this.currSelRows.indexOf(ind) > -1 })
                let dataM = this.nLevelFilter(initData, dataObj[field].filter, dataObj[field].selDDVals, dataObj[field].comparator, field)
                const doWithoutFilt = ["Not Empty", "Empty"]
                for(const prop in dataObj){
                    if(field === prop) 
                        continue;
                    if((dataObj[prop].filter || this.hasUnchkdDDVals(dataObj[prop])) || (dataObj[prop].comparator && doWithoutFilt.indexOf(dataObj[prop].comparator) > -1))
                        dataM = this.nLevelFilter(dataM, dataObj[prop].filter, dataObj[prop].selDDVals, dataObj[prop].comparator, prop)
                }
                this.currFilData = this.nLevelSort(dataM, sortOrder, dataObj)
                return this.currFilData
            }

            hasUnchkdDDVals(obj: any) {
                if(obj && obj.selDDVals && obj.selDDVals.length)
                    return obj.selDDVals.filter( (v: any) => v && !v.checked ).length
                return false
            }

            easyFilter(val: any, dataI: any[], sortOrder: string[]) {//only for non prim tables
                const initData = !this.displayOnlySelRows ? dataI :
                dataI.filter( (d: any, ind: any) => { return this.currSelRows.indexOf(ind) > -1 })
                let dataM = this.allDataFilter(val, initData)
                this.currFilData = this.nLevelSort(dataM, sortOrder, this.dataFilSrtTracker)
            }

            allDataFilter(filterVal: any, data: any[]) {
                const sixHrs = (1000*60*60*6)
                const symReg = new RegExp(/[$€£₹¥¢\,]/, "g")
                const isDtReg = new RegExp(/\d+(\/|-)\d+(\/|-)\d+/)
                if(filterVal && typeof filterVal === "string"){
                    filterVal = filterVal.toLocaleLowerCase()
                    if(!isDtReg.test(filterVal) && !isNaN(parseInt(filterVal.replace(symReg, ""))))//not viewed as num, but can be
                        filterVal = /\./g.test(filterVal) ? parseFloat(filterVal.replace(symReg, "")) : parseInt(filterVal.replace(symReg, ""))
                    if(this.common.testShortDate(filterVal) || this.common.testISODate(filterVal) || this.common.testLongDate(filterVal))
                        filterVal = new Date(filterVal)
                }
                return data.filter( (d: any) => {
                    if(!filterVal && filterVal != "0")
                        return true
                    for(const prop in d){
                        let colVal = d[prop]
                        if(typeof colVal === "string")
                            colVal = colVal.toLocaleLowerCase()
                        if(typeof colVal === "string" && (colVal == filterVal || colVal.startsWith(filterVal) || colVal.indexOf(filterVal) > -1))
                            return true
                        if(typeof colVal === "number" && (colVal == filterVal || colVal.toString().startsWith(filterVal) || colVal.toString().indexOf(filterVal) > -1))
                            return true
                        if(this.common.isADateObject(filterVal) && this.common.isADateObject(colVal) && 
                            (Math.abs(colVal.getTime() - filterVal.getTime()) < sixHrs || (colVal == filterVal || 
                            colVal.startsWith(filterVal) || colVal.indexOf(filterVal) > -1)))
                                return true
                        if(colVal == filterVal)
                            return true
                    }
                    return false
                })
            }

            arefilSrtTrkPropsDefault(ignoreColFM?: any) {
                for(const prop in this.dataFilSrtTracker){
                    // const elId= prop.replace(/ /g, this.common.uniSep)
                    const obj = this.dataFilSrtTracker[prop]
                    if(obj && (obj.filter || obj.comparator || obj.sort || obj.minimize || obj.freeze || obj.selDDVals)){
                        const fm = ignoreColFM ? true : (!obj.minimize && !obj.freeze);
                        const defComp = !obj.comparator || ["Equals", "Contains"].indexOf(obj.comparator) > -1;
                        if(!obj.filter && !obj.sort && fm && defComp /*&& document.getElementById("selectComp" + elId) */&& 
                        (!obj.selDDVals || (obj.selDDVals && !obj.selDDVals.filter( (v: any) => { return v && !v.checked } ).length))){
                            //let it go
                        } else
                            return false
                    }
                }
                return true
            }
  
}
