import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { jsPDF } from 'jspdf';
import { marked } from 'marked';
import html2canvas from 'html2canvas';

import { StructureApiService } from './structure-api.service';

@Injectable({
  providedIn: 'root'
})
export class StructureExportService {
    protected api = inject(StructureApiService);

    constructor() {
        // attach html2canvas globally so jsPDF's fallback resolution logic can find it
        (window as any).html2canvas = html2canvas;
    }    

    async exportToPdf(
        ownerName: string | undefined,
        repositoryName: string | undefined,
        branchName: string | undefined,
        key: string | undefined        
    ): Promise<void> {
        const htmlContainer = document.createElement('div');
        htmlContainer.style.width = '750px'; // Restricts viewport width to mirror standard A4 sizing
        htmlContainer.style.padding = '30px';
        htmlContainer.style.fontFamily = 'Arial, sans-serif';
        
        htmlContainer.innerHTML = `<h1>Repository Export:/ ${ownerName}/${repositoryName}/${branchName}/${key}</h1><hr/>`;

        // 1. Traverse and fetch HTML strings recursively
        await this.processFolder(
            ownerName, 
            repositoryName, 
            branchName, 
            key,
            htmlContainer
        );

        // Temporarily attach to DOM for jsPDF's HTML worker layout calculation
        document.body.appendChild(htmlContainer);

        // 2. Generate PDF from structural HTML layout
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: 'a4'
        });

        await doc.html(htmlContainer, {
            callback: (pdf) => {
                pdf.save(`${ownerName}-${repositoryName}-${branchName}-${key?.replace(/\//g, '-') || 'root'}.pdf`);
                document.body.removeChild(htmlContainer); // Cleanup DOM
            },
            margin:8,
            autoPaging: 'text',
            x: 0,
            y: 0
        });
    }

    private async processFolder(
        ownerName: string | undefined,
        repositoryName: string | undefined,
        branchName: string | undefined,
        key: string | undefined,
        container: HTMLElement, 
    ): Promise<void> {

        try {
            const data = await firstValueFrom(this.api.getStructureRaw(
                ownerName,
                repositoryName,
                branchName,
                key
            ));
            if (data.content) {
                return
            }

            for (const item of data) {
                if (item.type === 'dir') {
                    // Visual separator for subfolder boundaries
                    const subfolderHeader = document.createElement('h2');
                    subfolderHeader.style.color = '#2c3e50';
                    subfolderHeader.style.marginTop = '40px';
                    subfolderHeader.innerText = `📁 Directory: ${item.path}`;
                    container.appendChild(subfolderHeader);

                    // Deep crawl nested subdirectory path
                    await this.processFolder(
                        ownerName,
                        repositoryName,
                        branchName,
                        item.path, // Pass the subdirectory path as the new key
                        container
                    );
                } else if (item.type === 'file' && item.download_url) {
                    await this.processFile(
                        ownerName,
                        repositoryName,
                        branchName,
                        item.path,
                        item.name,  
                        container
                    );
                }
            }
        } catch (error) {
            console.error(`Error browsing pathway: ${key}`, error);
        }
    }

    private async processFile(
        ownerName: string | undefined,
        repositoryName: string | undefined,
        branchName: string | undefined,
        key: string | undefined,
        name: string | undefined,
        container: HTMLElement
    ): Promise<void> {
        try {
            const data = await firstValueFrom(this.api.getStructureRaw(
                ownerName,
                repositoryName,
                branchName,
                key
            ));
            if (!data.content) {
                return 
            }

            const cleanBase64 = data.content.replace(/\s/g, '');
            const binaryString = atob(cleanBase64);
            const bytes = Uint8Array.from(binaryString, m => m.charCodeAt(0));

            const rawText = new TextDecoder('utf-8').decode(bytes);

            const fileWrapper = document.createElement('div');
            fileWrapper.style.marginBottom = '30px';
            
            const title = document.createElement('h4');
            title.style.borderBottom = '1px solid #ddd';
            title.style.paddingBottom = '5px';
            title.innerText = `📄 ${name}`;
            fileWrapper.appendChild(title);

            if (name?.endsWith('.md')) {
                // Parse markdown text natively into HTML blocks
                const parsedMarkdown = await marked.parse(rawText);
                const mdContainer = document.createElement('div');
                mdContainer.innerHTML = parsedMarkdown;
                fileWrapper.appendChild(mdContainer);
            } 
            else if (name?.endsWith('.svg')) {
                // Convert active SVG code blocks into static pixel data URLs for crisp layout prints
                const imgUrl = await this.convertSvgToDataUrl(rawText);
                const imgElement = document.createElement('img');
                imgElement.src = imgUrl;
                imgElement.style.maxWidth = '100%';
                imgElement.style.display = 'block';
                imgElement.style.marginTop = '15px';
                fileWrapper.appendChild(imgElement);
            } 
            else {
                // Standard structural source code backup format fallback
                const pre = document.createElement('pre');
                pre.style.background = '#f8f9fa';
                pre.style.padding = '10px';
                pre.style.fontSize = '11px';
                pre.style.whiteSpace = 'pre-wrap';
                pre.innerText = rawText;
                fileWrapper.appendChild(pre);
            }

            container.appendChild(fileWrapper);
        } catch (error) {
            console.error(`Failed execution pipeline for file: ${name}`, error);
        }
    }

    /**
     * Converts raw SVG text code into an image data string safely compatible with pdf engines
     */
    private convertSvgToDataUrl(svgText: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Safeguard default geometry constraints for small vector frames
                canvas.width = img.width || 500;
                canvas.height = img.height || 300;
                
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const pngUrl = canvas.toDataURL('image/png');
                    URL.revokeObjectURL(url);
                    resolve(pngUrl);
                } else {
                    reject(new Error('Canvas 2D context context unavailable'));
                }
            };

            img.onerror = (err) => reject(err);
            img.src = url;
        });
    }    
}