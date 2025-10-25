import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartsAndGraphs } from './charts-and-graphs/charts-and-graphs';
import { ColumnChart } from './column-chart/column-chart';
import { NumValueDistroComponent } from './num-value-distro-component/num-value-distro-component';



@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ChartsAndGraphs,
    ColumnChart,
    NumValueDistroComponent,
  ]
})
export class ChartsModule { }
