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
        htmlContainer.style.width = '750px';
        htmlContainer.style.padding = '20px';
        htmlContainer.style.fontFamily = 'Arial, sans-serif';
        htmlContainer.style.fontSize = '12px';
        htmlContainer.style.color = '#1e293b';
        htmlContainer.style.background = '#ffffff';

        // htmlContainer.style.width = '550px';
        // htmlContainer.style.padding = '5px';
        // htmlContainer.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
        // htmlContainer.style.fontSize = '12px';
        // htmlContainer.style.color = '#1e293b';
        
        // htmlContainer.style.width = '700px';
        // htmlContainer.style.padding = '20px';
        // htmlContainer.style.fontFamily = 'Arial, sans-serif';
        // htmlContainer.style.fontSize = '10px';
        // htmlContainer.style.color = '#334155';
        
        // This overrides global Tailwind Resets within this isolated container
        const styleElement = document.createElement('style');
        // styleElement.innerHTML = `
        //     /* CRITICAL FIX 2: Force word-spacing and normal word rendering 
        //        to fix the missing spaces in headings */
        //     *, h1, h2, h3, h4, p, li, span, div { 
        //         line-height: 1.6 !important; 
        //         box-sizing: border-box !important;
        //         white-space: normal !important;      /* Forces standard space formatting */
        //         word-spacing: normal !important;       /* Re-enforces standard layout spaces */
        //         letter-spacing: normal !important;
        //     }
            
        //     /* Structural Heading Formats with distinct bottom buffer paddings */
        //     h1 { font-size: 28px; font-weight: bold !important; margin-top: 0px; margin-bottom: 16px; color: #0f172a; display: block; clear: both; }
        //     h2 { font-size: 20px; font-weight: bold !important; margin-top: 35px; margin-bottom: 14px; color: #1e293b; display: block; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; clear: both; }
        //     h3 { font-size: 16px; font-weight: bold !important; margin-top: 24px; margin-bottom: 10px; color: #334155; display: block; clear: both; }
        //     h4 { font-size: 14px; font-weight: bold !important; margin-top: 18px; margin-bottom: 8px; color: #475569; display: block; clear: both; }
            
        //     /* Body Paragraphs Spacing Rules */
        //     p { font-size: 13px; margin-top: 0px; margin-bottom: 14px; display: block; color: #334155; text-align: left !important; }
            
        //     /* Secure, Clean List Configurations */
        //     ul, ol { 
        //         list-style: none !important;
        //         padding: 0 !important;
        //         margin: 8px 0 16px 0 !important;
        //         display: block !important;
        //         text-align: left !important;
        //     }

        //     li { 
        //         font-size: 13px !important;
        //         color: #334155 !important;
        //         position: relative !important;
        //         display: block !important;
        //         text-align: left !important;
        //         padding-left: 20px !important;
        //         margin-bottom: 6px !important;
        //     }

        //     ul > li::before {
        //         content: "•" !important;
        //         position: absolute !important;
        //         left: 6px !important;
        //         top: 0px !important;
        //         font-size: 16px !important;
        //         line-height: 1 !important;
        //         color: #64748b !important;
        //     }

        //     ol { counter-reset: pdf-counter !important; }
        //     ol > li::before {
        //         counter-increment: pdf-counter !important;
        //         content: counter(pdf-counter) "." !important;
        //         position: absolute !important;
        //         left: 0px !important;
        //         top: 0px !important;
        //         font-weight: bold !important;
        //         color: #64748b !important;
        //     }
            
        //     pre { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 12px; white-space: pre-wrap; margin-bottom: 16px; text-align: left !important; display: block; clear: both; }
        //     code { font-family: monospace; background-color: #f1f5f9; padding: 2px 4px; border-radius: 3px; font-size: 12px; color: #0f172a; }
        // `;

        // styleElement.innerHTML = `
        //     /* Fix line height collapse and spacing across structural layers */
        //     * { 
        //         line-height: 1.6 !important; 
        //         box-sizing: border-box !important;
        //     }
            
        //     /* Typography Weight Configurations */
        //     strong, b { font-weight: 700 !important; color: #0f172a !important; }
        //     em, i { font-style: italic !important; }
            
        //     /* Professional Markdown Headings Spacing */
        //     h1 { font-size: 24px; font-weight: 700; margin-top: 0px; margin-bottom: 14px; color: #0f172a; display: block; line-height: 1.2 !important; }
        //     h2 { font-size: 18px; font-weight: 700; margin-top: 28px; margin-bottom: 12px; color: #1e293b; display: block; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; line-height: 1.3 !important; }
        //     h3 { font-size: 15px; font-weight: 700; margin-top: 20px; margin-bottom: 8px; color: #334155; display: block; }
        //     h4 { font-size: 13px; font-weight: 700; margin-top: 16px; margin-bottom: 6px; color: #475569; display: block; }
            
        //     /* Body Paragraphs Spacing Rules */
        //     p { font-size: 11.5px; margin-top: 0px; margin-bottom: 12px; display: block; color: #334155; text-align: left !important; }
            
        //     /* Secure, Clean List Configurations */
        //     ul, ol { 
        //         list-style: none !important;
        //         padding: 0 !important;
        //         margin: 6px 0 14px 0 !important;
        //         display: block !important;
        //         text-align: left !important;
        //     }

        //     li { 
        //         font-size: 11.5px !important;
        //         color: #334155 !important;
        //         position: relative !important;
        //         display: block !important;
        //         text-align: left !important;
        //         padding-left: 16px !important;
        //         margin-bottom: 5px !important;
        //     }

        //     /* Draw uniform slate bullets on the exact same text line context */
        //     ul > li::before {
        //         content: "•" !important;
        //         position: absolute !important;
        //         left: 4px !important;
        //         top: 0px !important;
        //         font-size: 14px !important;
        //         line-height: 1 !important;
        //         color: #64748b !important;
        //     }

        //     ol { counter-reset: pdf-counter !important; }
        //     ol > li::before {
        //         counter-increment: pdf-counter !important;
        //         content: counter(pdf-counter) "." !important;
        //         position: absolute !important;
        //         left: 0px !important;
        //         top: 0px !important;
        //         font-weight: bold !important;
        //         color: #64748b !important;
        //     }
            
        //     /* Source files markdown backings blocks layout */
        //     pre { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 10.5px; white-space: pre-wrap; margin-bottom: 14px; text-align: left !important; }
        //     code { font-family: monospace; background-color: #f1f5f9; padding: 2px 4px; border-radius: 3px; font-size: 10.5px; color: #0f172a; }
        // `;

        styleElement.innerHTML = `
            /* Fix layout line spacing and prevent horizontal clipping */
            * { 
                line-height: 1.5 !important; 
                box-sizing: border-box !important;
            }
            
            strong, b { font-weight: 700 !important; color: #0f172a; display: inline; }
            em, i { font-style: italic !important; display: inline; }
            
            /* Typography Sizing Structures */
            h1 { font-size: 22px; font-weight: bold; margin-top: 15px; margin-bottom: 8px; color: #0f172a; display: block; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;}
            h2 { font-size: 18px; font-weight: bold; margin-top: 25px; margin-bottom: 6px; color: #1e293b; display: block; }
            h3 { font-size: 15px; font-weight: bold; margin-top: 18px; margin-bottom: 4px; color: #334155; display: block; }
            h4 { font-size: 13px; font-weight: bold; margin-top: 14px; margin-bottom: 2px; color: #475569; display: block; }
            p { font-size: 12px; margin-bottom: 10px; display: block; color: #334155; text-align: left !important; }
            
            /* =========================================================
               CRITICAL FIX: PRODUCTION GRADE HTML2CANVAS LIST STRUCTURES
               ========================================================= */
            ul, ol { 
                list-style: none !important;  /* Strip out broken browser default bullets */
                padding: 0 !important;        /* Clear broken padding constraints */
                margin: 8px 0 8px 0 !important;
                display: block !important;
                text-align: left !important;  /* Force strict left alignment boundaries */
            }

            li { 
                font-size: 10px !important;
                color: #334155 !important;
                position: relative !important;
                display: block !important;    /* Force items to layout as structural blocks */
                text-align: left !important;
                padding-left: 18px !important; /* Build structural indentation for the bullet */
                margin-bottom: 6px !important;
                line-height: 1.4 !important;
            }

            /* Draw bullet safely on the exact same row frame line */
            ul > li::before {
                content: "•" !important;      /* Inject solid uniform bullet character */
                position: absolute !important;
                left: 4px !important;         /* Align bullet inside the item's left padding */
                top: 0px !important;          /* Pin it flat to the text row baseline */
                font-size: 10px !important;
                color: #64748b !important;    /* Slate bullet tone accent */
            }

            /* Ordered List Incrementing Counters fallback */
            ol { counter-reset: pdf-counter !important; }
            ol > li::before {
                counter-increment: pdf-counter !important;
                content: counter(pdf-counter) "." !important;
                position: absolute !important;
                left: 0px !important;
                top: 0px !important;
                font-size: 10px !important;
                font-weight: bold !important;
                color: #64748b !important;
            }
            
            /* Source files markdown backings code blocks formatting */
            pre { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 11px; white-space: pre-wrap; margin-bottom: 12px; text-align: left !important; }
            code { font-family: monospace; background-color: #f1f5f9; padding: 2px 4px; border-radius: 3px; font-size: 11px; color: #0f172a; }
        `;        
        htmlContainer.appendChild(styleElement);

        // Base folder meta wrapper template markup construction 
        const metaHeader = document.createElement('div');
        // metaHeader.style.marginBottom = '30px';
        // metaHeader.style.paddingBottom = '15px';
        // metaHeader.style.borderBottom = '2px solid #cbd5e1';
        // metaHeader.style.display = 'block';

        metaHeader.style.marginBottom = '20px';
        metaHeader.style.display = 'block';

        metaHeader.innerHTML = `<h1>/${key || 'root'}</h1>
            <div style="color: #64748b; font-size: 11px; margin-bottom: 4px; display: block;">owner: <b>${ownerName}</b>, repository: <b>${repositoryName}</b></div>
            <div style="color: #64748b; font-size: 11px; display: block;">branch: <b>${branchName}</b>, exported: <b>${new Date().toLocaleString()}</b></div>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 12px; margin-bottom: 20px; display: block;" />`;

        // metaHeader.style.marginBottom = '25px';
        // metaHeader.innerHTML = `<h1>/${key || 'root'}</h1>
        //     <div style="color: #64748b; font-size: 10px;">owner: <b>${ownerName}</b>, repository: <b>${repositoryName}</b></div>
        //     <div style="color: #64748b; font-size: 10px;">branch: <b>${branchName}</b>, exported: <b>${new Date().toLocaleString()}</b></div>
        //     <hr style="border: 0; border-top: 1px solid #cbd5e1; margin-top: 15px; margin-bottom: 15px;" />`;
        htmlContainer.appendChild(metaHeader);

        // process the folder structure recursively and append content to the container
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

        // Get actual standard dimensions of an A4 page inside the pixel tracking canvas
        const pdfWidth = doc.internal.pageSize.getWidth();

        await doc.html(htmlContainer, {
            callback: (pdf) => {
                pdf.save(`${ownerName}__${repositoryName}__${branchName}__${key?.replace(/\//g, '__') || 'root'}.pdf`);
                document.body.removeChild(htmlContainer); // Cleanup DOM
            },
            margin: [0, 0, 0, 0],
            autoPaging: 'text',
            x: 0,
            y: 0,
            // Match the target html width to scale down perfectly without breaking text layouts
            html2canvas: {
                width: 750,
                scale: pdfWidth / 750, // Scales the 750px sandbox element to fit the A4 width perfectly
                logging: false,
                useCORS: true
            }            
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
                    subfolderHeader.innerText = `/${item.path}`;
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
                // imgElement.crossOrigin = 'anonymous';
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