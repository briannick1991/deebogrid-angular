export interface DataCell {
    column: string;
    width?: string;
    freeze: boolean;
    text?: string;
    html?: any;
    rawText: string;
    dataType: string;
    minimized: boolean;
    editable: boolean;
    top?: number;
}
