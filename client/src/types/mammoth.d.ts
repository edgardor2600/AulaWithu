declare module 'mammoth' {
  export interface ConvertToHtmlOptions {
    arrayBuffer: ArrayBuffer;
    [key: string]: any;
  }
  export interface ConvertResult {
    value: string;
    messages: any[];
  }
  export function convertToHtml(options: ConvertToHtmlOptions): Promise<ConvertResult>;
}
