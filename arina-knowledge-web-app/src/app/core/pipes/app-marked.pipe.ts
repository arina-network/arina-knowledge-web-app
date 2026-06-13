import { Pipe, PipeTransform } from '@angular/core';
import * as marked from 'marked';

@Pipe({
    name: 'markdown'
})
export class AppMarkdownPipe implements PipeTransform {
    transform(value: string | null | undefined): string {
        if (!value) {        
            return '';
        }
        // parse the markdown to a raw HTML string and return it
        return marked.parse(value) as string; 
    }
}