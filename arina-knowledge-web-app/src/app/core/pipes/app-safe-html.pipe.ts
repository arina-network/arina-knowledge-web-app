import { PipeTransform, Pipe } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'safe' })
export class AppSafePipe implements PipeTransform {
    constructor(private sanitizer: DomSanitizer) { }
    transform(url: string) {
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
}

@Pipe({ name: 'safeHtml' })
export class AppSafeHtmlPipe implements PipeTransform {

    constructor(private _sanitizer: DomSanitizer) {
    }

    transform(value: string): SafeHtml | null{
        if (!value) {
            return null;
        }

        return this._sanitizer.bypassSecurityTrustHtml(value);
    }
}
