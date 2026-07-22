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


// Track state positions uniformly across global document rendering iterations
    private currentY = 40;
    private totalPages = 1;
    private pageHeight = 842; // Standard A4 points metric constraints max height
    private bottomMargin = 45;
    private leftMargin = 40;
    private contentWidth = 515; // 595 (A4 Width) - 80 (Margins)

    private ownerName: string | undefined;
    private repositoryName: string | undefined;
    private branchName: string | undefined;    

    async exportToPdf(
        ownerName: string | undefined,
        repositoryName: string | undefined,
        branchName: string | undefined,
        key: string | undefined        
    ): Promise<void> {
        this.ownerName = ownerName;
        this.repositoryName = repositoryName;
        this.branchName = branchName;

        // Initialize jsPDF directly using points layout configurations
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'pt',
            format: 'a4'
        });

        // Reset state variables before every export run execution block
        this.currentY = 40;
        this.totalPages = 1;

        const exportedStr = new Date().toLocaleString();
        const pathStr = `${'/' + key + ', ' || ''}${repositoryName}, ${branchName}`;

        // 1. Draw Metadata Cover Headers Manually
        this.renderMetaHeader(
            doc, 
            ownerName, 
            repositoryName, 
            branchName, 
            key,
            exportedStr
        );

        // 2. Fetch and recursively build the programmatic document tree contents
        await this.processFolderData(ownerName, repositoryName, branchName, key, doc);

        // 3. Stamp Page numbers across all page fragments retroactively
        this.injectPageNumbers(
            doc,
            pathStr,
            exportedStr
        );

        // 4. Clean file download execution
        doc.save(`${ownerName}__${repositoryName}__${branchName}__${key?.replace(/\//g, '__') || 'root'}.pdf`);
    }

    private renderMetaHeader(
        doc: jsPDF,
        owner: string | undefined,
        repo: string | undefined,
        branch: string | undefined,
        key: string | undefined,
        exportedStr: string
    ): void {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(`/${key || 'root'}`, this.leftMargin, this.currentY);
        this.currentY += 24;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(`owner: ${owner || ''}, repository: ${repo || ''}`, this.leftMargin, this.currentY);
        this.currentY += 14;
        doc.text(`branch: ${branch || ''}, exported: ${exportedStr}`, this.leftMargin, this.currentY);
        this.currentY += 16;

        // Visual divider rule lines 
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(1);
        doc.line(this.leftMargin, this.currentY, this.leftMargin + this.contentWidth, this.currentY);
        this.currentY += 30;
    }

    private async processFolderData(owner: string | undefined, repo: string | undefined, branch: string | undefined, key: string | undefined, doc: jsPDF): Promise<void> {
        try {
            const data = await firstValueFrom(this.api.getStructureRaw(owner, repo, branch, key));
            if (data.content) return;

            for (const item of data) {
                if (item.type === 'dir') {
                    // Check height limits before stamping subfolder names
                    this.ensureSpace(doc, 40);
                    
                    doc.setFont('Helvetica', 'bold');
                    doc.setFontSize(16);
                    doc.setTextColor(30, 41, 59); // slate-800
                    doc.text(`/${item.path}`, this.leftMargin, this.currentY);
                    this.currentY += 25;

                    await this.processFolderData(owner, repo, branch, item.path, doc);
                } else if (item.type === 'file' && item.download_url) {
                    await this.processFileData(owner, repo, branch, item.path, item.name, doc);
                }
            }
        } catch (error) {
            console.error(`Error reading pathway: ${key}`, error);
        }
    }

    private async processFileData(owner: string | undefined, repo: string | undefined, branch: string | undefined, key: string | undefined, name: string | undefined, doc: jsPDF): Promise<void> {
        try {
            const data = await firstValueFrom(this.api.getStructureRaw(owner, repo, branch, key));
            if (!data.content) return;

            const cleanBase64 = data.content.replace(/\s/g, '');
            const binaryString = atob(cleanBase64);
            const bytes = Uint8Array.from(binaryString, m => m.charCodeAt(0));
            const rawText = new TextDecoder('utf-8').decode(bytes);

            this.ensureSpace(doc, 30);
            
            // File metadata label block
            // doc.setFont('Helvetica', 'bold');
            // doc.setFontSize(12);
            // doc.setTextColor(71, 85, 105); // slate-600
            // doc.text(`File: ${name || ''}`, this.leftMargin, this.currentY);
            // this.currentY += 15;

            if (name?.endsWith('.md')) {
                this.parseAndRenderMarkdown(doc, rawText);
            } else {
                // Code block fallback layouts
                this.renderCodeBlockFallback(doc, rawText);
            }
            this.currentY += 20; // Structural buffer gap between files
        } catch (error) {
            console.error(`Failed parsing file: ${name}`, error);
        }
    }

    /**
     * Custom line parser engine loop to translate Markdown elements safely without HTML canvas wrappers
     */
    private parseAndRenderMarkdown(doc: jsPDF, text: string): void {
        const lines = text.split(/\r?\n/);
        
        for (let line of lines) {
            let cleanLine = line.trim();
            if (!cleanLine && line !== '') continue; // Skip redundant space gaps

            // --- 1. PARSE MARKDOWN HEADINGS ---
            if (cleanLine.startsWith('#')) {
                const match = cleanLine.match(/^(#{1,6})\s+(.*)$/);
                if (match) {
                    this.currentY += 10;

                    const level = match[1].length;
                    const headingText = match[2];
                    
                    const fontSize = level === 1 ? 20 : level === 2 ? 16 : level === 3 ? 14 : 12;
                    this.ensureSpace(doc, fontSize + 15);

                    doc.setFont('Helvetica', 'bold');
                    doc.setFontSize(fontSize);
                    doc.setTextColor(15, 23, 42);
                    doc.text(headingText, this.leftMargin, this.currentY);
                    this.currentY += fontSize + 10;
                    continue;
                }
            }

            // --- 2. PARSE UNORDERED LIST BULLETS ---
            if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
                const listText = cleanLine.substring(2);
                this.ensureSpace(doc, 18);

                // Draw uniform vector bullet tokens explicitly
                doc.setFont('Helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(100, 116, 139);
                doc.text('•', this.leftMargin + 10, this.currentY + 1);

                // Break text if line length overflows page width
                doc.setFont('Helvetica', 'normal');
                doc.setTextColor(51, 65, 85);
                this.renderTokenText(doc, listText, this.leftMargin + 22, this.contentWidth - 22, 11);
                continue;
            }

            // --- 3. PARSE ORDERED LIST NUMBERS ---
            if (/^\d+\.\s+/.test(cleanLine)) {
                const match = cleanLine.match(/^(\d+\.)\s+(.*)$/);
                if (match) {
                    const numToken = match[1];
                    const listText = match[2];
                    this.ensureSpace(doc, 18);

                    doc.setFont('Helvetica', 'bold');
                    doc.setFontSize(11);
                    doc.setTextColor(100, 116, 139);
                    doc.text(numToken, this.leftMargin + 10, this.currentY);

                    doc.setFont('Helvetica', 'normal');
                    doc.setTextColor(51, 65, 85);
                    this.renderTokenText(doc, listText, this.leftMargin + 26, this.contentWidth - 26, 11);
                    continue;
                }
            }

            // --- 4. PARSE STANDARD BODY PARAGRAPHS ---
            if (cleanLine.length > 0) {
                this.ensureSpace(doc, 16);
                doc.setFont('Helvetica', 'normal');
                doc.setFontSize(11);
                doc.setTextColor(51, 65, 85);
                this.renderTokenText(doc, cleanLine, this.leftMargin, this.contentWidth, 11);
            } else {
                this.currentY += 6; // Standard paragraph spacing buffer
            }
        }
    }

    /**
     * Dedicated horizontal inline regex token engine to extract **bold** markers dynamically
     */
    // private renderTokenText(doc: jsPDF, text: string, startX: number, maxWidth: number, fontSize: number): void {
    //     // Enforce font properties to accurately calculate string lengths
    //     doc.setFontSize(fontSize);
        
    //     // Split long input line blocks natively to maintain horizontal margins
    //     const wrappedLines: string[] = doc.splitTextToSize(text, maxWidth);

    //     for (const line of wrappedLines) {
    //         this.ensureSpace(doc, 16);
    //         let currentX = startX;

    //         // Split on markdown bold indicators (`**`)
    //         const parts = line.split(/(\*\*.*?\*\*)/g);

    //         for (const part of parts) {
    //             if (part.startsWith('**') && part.endsWith('**')) {
    //                 const cleanBoldText = part.slice(2, -2);
    //                 doc.setFont('Helvetica', 'bold');
    //                 doc.text(cleanBoldText, currentX, this.currentY);
                    
    //                 currentX += doc.getTextWidth(cleanBoldText); // Shift cursor to prevent collisions
    //             } else {
    //                 doc.setFont('Helvetica', 'normal');
    //                 doc.text(part, currentX, this.currentY);currentX += doc.getTextWidth(part);
    //             }
    //         }
            
    //         this.currentY += 15; // Row line height step height spacing
    //     }
    // }
    private renderTokenText(doc: jsPDF, text: string, startX: number, maxWidth: number, fontSize: number): void {
        doc.setFontSize(fontSize);
        
        // 1. Clean out raw markdown links from the string length wrapper to wrap rows cleanly
        // e.g., transforms "[Google](url)" into "Google" just to calculate safe page line wrap metrics
        const plainTextForWrapping = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1');
        const wrappedLines: string[] = doc.splitTextToSize(plainTextForWrapping, maxWidth);

        // Map line chunks back to original formatting parts using a sequential reader
        let currentRawTextIndex = 0;
        
        // For standard processing without complex pointer mapping, we tokenize the original string lines directly
        // and let jsPDF handle wrapped elements safely via coordinate cursors:
        const originalWrappedLines: string[] = doc.splitTextToSize(text, maxWidth);

        for (const line of originalWrappedLines) {
            this.ensureSpace(doc, 16);
            let currentX = startX;

            // Regex splits line into: [normal text], [**bold**], or [ [text](url) ]
            const parts = line.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);

            for (const part of parts) {
                if (!part) {
                    continue;
                }

                // // --- CASE A: BOLD TEXT HANDLING ---
                // if (part.startsWith('**') && part.endsWith('**')) {
                //     const cleanBoldText = part.slice(2, -2);
                //     doc.setFont('Helvetica', 'bold');
                //     doc.setTextColor(15, 23, 42); // slate-900
                //     doc.text(cleanBoldText, currentX, this.currentY);
                //     currentX += doc.getTextWidth(cleanBoldText);
                // } 
                // else if (part.startsWith('__') && part.endsWith('__')) {
                //     const cleanItalicText = part.slice(2, -2);
                //     doc.setFont('Helvetica', 'italic');
                //     doc.setTextColor(15, 23, 42); // slate-900
                //     doc.text(cleanItalicText, currentX, this.currentY);
                //     currentX += doc.getTextWidth(cleanItalicText);
                // } 
                // // --- CASE B: MARKDOWN LINK HANDLING ---

                // --- CASE 1: BOLD TEXT HANDLING (**bold**) ---
                if (part.startsWith('**') && part.endsWith('**')) {
                    const cleanBoldText = part.slice(2, -2);
                    doc.setFont('Helvetica', 'bold');
                    doc.setTextColor(15, 23, 42); // slate-900
                    doc.text(cleanBoldText, currentX, this.currentY);
                    currentX += doc.getTextWidth(cleanBoldText);
                } 
                // --- CASE 2: STRIKEOUT TEXT HANDLING (~~strikeout~~) ---
                else if (part.startsWith('~~') && part.endsWith('~~')) {
                    const cleanStrikeText = part.slice(2, -2);
                    doc.setFont('Helvetica', 'normal');
                    doc.setTextColor(148, 163, 184); // slate-400 (muted gray for deleted text)
                    doc.text(cleanStrikeText, currentX, this.currentY);

                    // Draw a strikeout line right through the middle of the text height baseline
                    const textWidth = doc.getTextWidth(cleanStrikeText);
                    doc.setDrawColor(148, 163, 184);
                    doc.setLineWidth(0.8);
                    // y coordinate is shifted up by 3.5 points to hit the exact middle of the letters
                    doc.line(currentX, this.currentY - 3.5, currentX + textWidth, this.currentY - 3.5);

                    currentX += textWidth;
                }
                // --- CASE 3: ITALIC TEXT HANDLING (*italic* or _italic_) ---
                else if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
                    const cleanItalicText = part.slice(1, -1);
                    doc.setFont('Helvetica', 'italic');
                    doc.setTextColor(51, 65, 85); // slate-700
                    doc.text(cleanItalicText, currentX, this.currentY);
                    currentX += doc.getTextWidth(cleanItalicText);
                }
                // --- CASE 4: MARKDOWN LINK HANDLING ([text](url)) ---
                else if (part.startsWith('[') && part.includes('](')) {
                    const match = part.match(/\[(.*?)\]\((.*?)\)/);
                    if (match) {
                        const linkText = match[1];
                        let linkUrl = match[2];

                        if (linkUrl.startsWith('/')) { // process only local links
                            linkUrl = `https://arina.network/#/knowledge/${this.ownerName}/${this.repositoryName}/${this.branchName}${linkUrl}`
                        }                        

                        // Style as clear, modern interactive clickable blueprint link text
                        doc.setFont('Helvetica', 'bold'); // Make link stand out
                        doc.setTextColor(37, 99, 235);   // Tailwind Blue-600

                        // Render text onto the canvas sheet layout view
                        doc.text(linkText, currentX, this.currentY);

                        // Draw a fine underline vector beneath the link text to make it readable
                        const textWidth = doc.getTextWidth(linkText);
                        doc.setDrawColor(37, 99, 235);
                        doc.setLineWidth(0.5);
                        doc.line(currentX, this.currentY + 1.5, currentX + textWidth, this.currentY + 1.5);

                        // Embed an active clickable link rect area mapping layer over the vector text coordinates
                        doc.link(currentX, this.currentY - 9, textWidth, 12, { url: linkUrl });

                        currentX += textWidth; // Shift processing pointer rightward
                    }
                } 
                // --- CASE C: STANDARD PLAIN TEXT ---
                else {
                    doc.setFont('Helvetica', 'normal');
                    doc.setTextColor(51, 65, 85); // slate-700
                    doc.text(part, currentX, this.currentY);
                    currentX += doc.getTextWidth(part);
                }
            }
            this.currentY += 15; // Shift row baseline downward for next text block iteration
        }
    }    

    private renderCodeBlockFallback(doc: jsPDF, text: string): void {
        doc.setFont('Courier', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59);
        const lines = doc.splitTextToSize(text, this.contentWidth - 15);
        for (const line of lines) {
            this.ensureSpace(doc, 14);// Draw a subtle code box background outline panel manually
            doc.setFillColor(248, 250, 252);
            doc.rect(this.leftMargin, this.currentY - 10, this.contentWidth, 14, 'F');
            doc.text(line, this.leftMargin + 8, this.currentY);
            this.currentY += 14;
        }
    }
    
    /*** Automated page break manager. Extends document chunks cleanly when text exceeds height bounds.*/
    private ensureSpace(doc: jsPDF, requiredSpace: number): void {
        if (this.currentY + requiredSpace > this.pageHeight - this.bottomMargin) {
            doc.addPage();this.totalPages++;this.currentY = 45; // Safe top layout boundary margin padding start
        }
    }
    
    private injectPageNumbers(
        doc: jsPDF,
        pathStr: string,
        exportedStr: string
    ): void {
        const total = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= total; i++) {
            doc.setPage(i);
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(148, 163, 184); // slate-400
            
            // Format standard page footer tracking strings
            const footerText = `${pathStr}, exported ${exportedStr}, page ${i} of ${total}`;
            const textWidth = doc.getTextWidth(footerText);
            doc.text(footerText, (595 / 2) - (textWidth / 2), 815);
        }
    }

    constructor() {
        // attach html2canvas globally so jsPDF's fallback resolution logic can find it
        (window as any).html2canvas = html2canvas;
    }    

    async v1_exportToPdf(
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
        await this.v1_processFolder(
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

    private async v1_processFolder(
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
                    await this.v1_processFolder(
                        ownerName,
                        repositoryName,
                        branchName,
                        item.path, // Pass the subdirectory path as the new key
                        container
                    );
                } else if (item.type === 'file' && item.download_url) {
                    await this.v1_processFile(
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

    private async v1_processFile(
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