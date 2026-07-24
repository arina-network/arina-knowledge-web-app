import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { jsPDF } from 'jspdf';

import { cyrillicFontBase64, cyrillicFontBase64Italic } from '../constants/pdf-fonts';
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

       
        doc.addFileToVFS('RobotoVariable.ttf', cyrillicFontBase64);
        doc.addFileToVFS('RobotoVariable-Italic.ttf', cyrillicFontBase64Italic);

        // 2. REGISTER THE FONT INTO JSPDF'S REPOSITORY HOOK
        // Important: Set the font variant parameters to 'normal'
        doc.addFont('RobotoVariable.ttf', 'RobotoCustom', 'normal');
        doc.addFont('RobotoVariable.ttf', 'RobotoCustom', 'bold');
        doc.addFont('RobotoVariable-Italic.ttf', 'RobotoCustom', 'italic');

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
        doc.setFont('RobotoCustom', 'normal');
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(`/${key || 'root'}`, this.leftMargin, this.currentY);
        this.currentY += 24;

        doc.setFont('RobotoCustom', 'normal');
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

    private async processFolderData(
        owner: string | undefined, 
        repo: string | undefined, 
        branch: string | undefined, 
        key: string | undefined, 
        doc: jsPDF
    ): Promise<void> {
        try {
            const data = await firstValueFrom(this.api.getStructureRaw(owner, repo, branch, key));
            if (data.content) return;

            for (const item of data) {
                if (item.type === 'dir') {
                    // Check height limits before stamping subfolder names
                    this.ensureSpace(doc, 40);
                    
                    doc.setFont('RobotoCustom', 'normal');
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

    private async processFileData(
        owner: string | undefined, 
        repo: string | undefined, 
        branch: string | undefined, 
        key: string | undefined, 
        name: string | undefined, 
        doc: jsPDF
    ): Promise<void> {
        try {
            const data = await firstValueFrom(this.api.getStructureRaw(owner, repo, branch, key));
            if (!data.content) return;

            const cleanBase64 = data.content.replace(/\s/g, '');
            const binaryString = atob(cleanBase64);
            const bytes = Uint8Array.from(binaryString, m => m.charCodeAt(0));
            const rawText = new TextDecoder('utf-8').decode(bytes);

            this.ensureSpace(doc, 30);
            
            // File metadata label block
            // doc.setFont('RobotoCustom', 'normal');
            // doc.setFontSize(12);
            // doc.setTextColor(71, 85, 105); // slate-600
            // doc.text(`File: ${name || ''}`, this.leftMargin, this.currentY);
            // this.currentY += 15;

            if (name?.endsWith('.md')) {
                await this.parseAndRenderMarkdown(doc, rawText);
            } else if (name?.endsWith('.svg')) {
                // Intercept full separate standalone repository .svg source layouts correctly
                await this.renderSvgDirectlyToPdf(key || '', doc, name);
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
    private async parseAndRenderMarkdown(
        doc: jsPDF, 
        text: string
    ): Promise<void> {
    // private parseAndRenderMarkdown(doc: jsPDF, text: string): void {
        const lines = text.split(/\r?\n/);
        
        let inCodeBlock = false;
        let codeLines: string[] = [];
        
        let inMarkdownTable = false;
        let mdTableRows: string[][] = [];

        // HTML TABLE PARSER BUFFER STATE
        let inHtmlTable = false;
        let htmlTableBuffer = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // --- PRE-EMPTIVE CRITICAL CHECK: CAPTURE MARKDOWN IMAGES ---
            // Intercept inline diagram layouts before the text routing engine parses them
            if (await this.parseAndRenderMarkdownImages(doc, line)) {
                continue; // Skip the rest of the parsing steps for this row
            }

            // --- 1. STATE MACHINE: HTML TABLE CAPTURE ACCUMULATOR ---
            if (trimmed.toLowerCase().includes('<table')) {
                inHtmlTable = true;
                htmlTableBuffer = line;
                // If it closes on the exact same row sequence line, process it immediately
                if (trimmed.toLowerCase().includes('</table>')) {
                    this.processAndRenderHtmlTable(doc, htmlTableBuffer);
                    inHtmlTable = false;
                    htmlTableBuffer = '';
                }
                continue;
            }
            if (inHtmlTable) {
                htmlTableBuffer += ' ' + line;
                if (trimmed.toLowerCase().includes('</table>')) {
                    this.processAndRenderHtmlTable(doc, htmlTableBuffer);
                    inHtmlTable = false;
                    htmlTableBuffer = '';
                }
                continue;
            }

            // --- 2. STATE MACHINE: MULTI-LINE CODE BLOCKS ---
            if (trimmed.startsWith('```')) {
                if (inCodeBlock) {
                    this.renderMarkdownCodeBlock(doc, codeLines);
                    codeLines = [];
                    inCodeBlock = false;
                } else {
                    inCodeBlock = true;
                }
                continue;
            }
            if (inCodeBlock) {
                codeLines.push(line);
                continue;
            }

            // --- 3. STATE MACHINE: MARKDOWN TABLES (RESILIENT PATTERN) ---
            // Fixes hidden whitespace padding characters before or after the structural pipe marks
            if (trimmed.startsWith('|') || (trimmed.length > 0 && line.includes('|') && trimmed.split('|').length > 2)) {
                inMarkdownTable = true;
                
                // Parse out pipe delimited column strings cleanly
                const cells = line.split('|')
                                  .map(c => c.trim())
                                  .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
                
                // Check if this is an structural alignment row: |--|:--:|--:|
                const isSpacerRow = cells.every(cell => cell === '' || /^:?-+:?$/.test(cell));
                
                if (!isSpacerRow && cells.length > 0) {
                    mdTableRows.push(cells);
                }
                
                // Look-ahead check: determine safely if table data block terminates on next row cycle
                const nextLine = lines[i + 1];
                const nextTrimmed = nextLine ? nextLine.trim() : '';
                
                // If next row is empty or doesn't have grid descriptors, close and flush table contents to layout view
                if (!nextLine || (!nextTrimmed.startsWith('|') && !nextTrimmed.includes('|'))) {
                    // Only invoke the renderer loop if we successfully parsed text data segments
                    if (mdTableRows.length > 0) {
                        this.renderMarkdownTable(doc, mdTableRows);
                    }
                    mdTableRows = [];
                    inMarkdownTable = false;
                }
                continue;
            }

            // --- 4. BLOCKQUOTES FORMATTING ( > Quote Text ) ---
            if (trimmed.startsWith('>')) {
                const quoteText = trimmed.substring(1).trim();
                this.renderBlockquote(doc, quoteText);
                continue;
            }

            // --- 5. STANDARD MARKDOWN ELEMENTS (Headings, Lists, Paragraphs) ---
            if (trimmed.startsWith('#')) {
                const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
                if (match) {
                    /*
                    this.currentY += 10;

                    const level = match[1].length;
                    const headingText = match[2];
                    
                    const fontSize = level === 1 ? 20 : level === 2 ? 16 : level === 3 ? 14 : 12;
                    this.ensureSpace(doc, fontSize + 15);

                    doc.setFont('RobotoCustom', 'normal');
                    doc.setFontSize(fontSize);
                    doc.setTextColor(15, 23, 42);
                    doc.text(headingText, this.leftMargin, this.currentY);
                    this.currentY += fontSize + 10;
                    continue;
                    */
                    this.currentY += 10;

                    const level = match[1].length;
                    const headingText = match[2];
                    const fontSize = level === 1 ? 20 : level === 2 ? 16 : level === 3 ? 14 : 12;
                    
                    this.ensureSpace(doc, fontSize + 15);
                    doc.setFont('RobotoCustom', 'normal');
                    doc.setFontSize(fontSize);
                    doc.setTextColor(15, 23, 42);
                    doc.text(headingText, this.leftMargin, this.currentY);
                    this.currentY += fontSize + 10;
                    continue;
                }
            }

            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const listText = trimmed.substring(2);
                this.ensureSpace(doc, 18);
                doc.setFont('RobotoCustom', 'normal');
                doc.setFontSize(11);
                doc.setTextColor(100, 116, 139);
                doc.text('•', this.leftMargin + 10, this.currentY + 1);
                this.renderTokenText(doc, listText, this.leftMargin + 22, this.contentWidth - 22, 11);
                continue;
            }

            if (/^\d+\.\s+/.test(trimmed)) {
                const match = trimmed.match(/^(\d+\.)\s+(.*)$/);
                if (match) {
                    this.ensureSpace(doc, 18);
                    doc.setFont('RobotoCustom', 'normal');
                    doc.setFontSize(11);
                    doc.setTextColor(100, 116, 139);
                    doc.text(match[1], this.leftMargin + 10, this.currentY);
                    this.renderTokenText(doc, match[2], this.leftMargin + 26, this.contentWidth - 26, 11);
                    continue;
                }
            }

            if (trimmed.length > 0) {
                this.ensureSpace(doc, 16);
                this.renderTokenText(doc, trimmed, this.leftMargin, this.contentWidth, 11);
            } else {
                this.currentY += 6; 
            }
        }
    }
    
    /**
     * Extracts rows and columns out of raw accumulated HTML table blocks safely using match arrays
     */
    private processAndRenderHtmlTable(doc: jsPDF, rawHtml: string): void {
        const rows: string[][] = [];
        
        // Match explicit HTML table rows: <tr>...</tr>
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch;

        while ((rowMatch = rowRegex.exec(rawHtml)) !== null) {
            const rowContent = rowMatch[1]; // Get the inner row content string block
            const cells: string[] = [];
            
            // Match both Table Headings (<th>) and Standard Cells (<td>) inside the row
            const cellRegex = /<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi;
            let cellMatch;
            
            while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
                // FIX: Target cellMatch[2] (the text inside the tags) instead of the cellMatch array object
                const innerHtmlContent = cellMatch[2] || '';
                
                // Strip any remaining internal nested elements like <strong> or <span> tokens cleanly
                let cellText = innerHtmlContent.replace(/<[^>]*>/g, '').trim();
                cells.push(cellText);
            }
            
            if (cells.length > 0) {
                rows.push(cells);
            }
        }

        // Render the processed data using your stable vector layout engine
        if (rows.length > 0) {
            this.renderMarkdownTable(doc, rows);
        }
    }

    private renderMarkdownCodeBlock(doc: jsPDF, lines: string[]): void {
        doc.setFont('Courier', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);

        // Calculate total code height bounds first
        const wrappedLines: string[] = [];
        for (const line of lines) {
            const split = doc.splitTextToSize(line, this.contentWidth - 16);
            wrappedLines.push(...split);
        }

        this.ensureSpace(doc, 15);
        // Draw top background edge container padding block
        const blockStartY = this.currentY - 4;

        for (const line of wrappedLines) {
            this.ensureSpace(doc, 14);
            
            // Draw continuous back panel row background elements manually
            doc.setFillColor(248, 250, 252); // slate-50
            doc.rect(this.leftMargin, this.currentY - 10, this.contentWidth, 14, 'F');
            
            doc.text(line, this.leftMargin + 10, this.currentY);
            this.currentY += 14;
        }
        // Left structural border strip accent line decoration
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(1);
        doc.line(this.leftMargin, blockStartY, this.leftMargin, this.currentY - 10);
        this.currentY += 6;
    }

    private renderMarkdownTable(doc: jsPDF, rows: string[][]): void {
        if (!rows || rows.length === 0) return;

        doc.setFontSize(10);
        
        // --- CRITICAL FIX 1: CALCULATE COLUMNS FROM THE CELL COUNT OF THE FIRST ROW ---
        const colCount = rows[0].length; 
        const colWidth = this.contentWidth / colCount;
        const rowHeight = 22; 

        for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            const isHeader = (r === 0);

            this.ensureSpace(doc, rowHeight);

            // Shading background passes: Header vs Alternating Zebra rows
            if (isHeader) {
                doc.setFillColor(241, 245, 249); // slate-100 dark header background
                doc.setFont('RobotoCustom', 'bold');
                doc.setTextColor(15, 23, 42);
            } else {
                if (r % 2 === 0) {
                    doc.setFillColor(255, 255, 255);
                } else {
                    doc.setFillColor(248, 250, 252);
                }                  
                // doc.setFillColor(r % 2 === 0 ? 255, 255, 255 : 248, 250, 252); // slate-50 stripes
                doc.setFont('RobotoCustom', 'normal');
                doc.setTextColor(51, 65, 85);
            }

            // Draw full background cell bar cross column boundary
            doc.rect(this.leftMargin, this.currentY - 14, this.contentWidth, rowHeight, 'F');

            // --- CRITICAL FIX 2: ITERATE EXACTLY UP TO THE TRUE COLUMN COUNT ---
            for (let c = 0; c < colCount; c++) {
                const cellText = row[c] || '';
                const cellX = this.leftMargin + (c * colWidth) + 6; // left cell spacing padding
                const maxCellWidth = colWidth - 12; // column margin boundaries
                
                if (isHeader) {
                    const lines = doc.splitTextToSize(cellText, maxCellWidth);
                    const clippedHeader = lines[0] || '';
                    doc.text(clippedHeader, cellX, this.currentY);
                } else {
                    // Pass to token engine mapping local safe coordinates
                    this.renderTableCellTokenText(doc, cellText, cellX, maxCellWidth, this.currentY);
                }
            }

            // Draw thin table bottom grid lines
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.5);
            doc.line(this.leftMargin, this.currentY + (rowHeight - 14), this.leftMargin + this.contentWidth, this.currentY + (rowHeight - 14));

            this.currentY += rowHeight;
        }
        this.currentY += 10;
    }
 
    /**
     * Isolated cell horizontal builder that wraps link tokens without drifting currentY pointers
     */
    private renderTableCellTokenText(doc: jsPDF, text: string, startX: number, maxWidth: number, cellY: number): void {
        doc.setFontSize(10);
        const lines: string[] = doc.splitTextToSize(text, maxWidth);
        if (lines.length === 0) return;
        
        // FIX: Extract index 0 to get the actual text string from the array
        const line = lines[0];
        let currentX = startX;

        // Split standard inline tags matching structure rules
        const parts = line.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\)|~~.*?~~|\*.*?\*|_.*?_)/g);

        for (const part of parts) {
            if (!part) continue;

            if (part.startsWith('**') && part.endsWith('**')) {
                doc.setFont('RobotoCustom', 'bold');
                doc.setTextColor(15, 23, 42);
                const t = part.slice(2, -2);
                doc.text(t, currentX, cellY);
                currentX += doc.getTextWidth(t);
            } else if (part.startsWith('~~') && part.endsWith('~~')) {
                doc.setFont('RobotoCustom', 'normal');
                doc.setTextColor(148, 163, 184);
                const t = part.slice(2, -2);
                doc.text(t, currentX, cellY);
                const tw = doc.getTextWidth(t);
                doc.setDrawColor(148, 163, 184);
                doc.setLineWidth(0.8);
                doc.line(currentX, cellY - 3.5, currentX + tw, cellY - 3.5);
                currentX += tw;
            } else if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
                doc.setFont('RobotoCustom', 'italic');
                doc.setTextColor(51, 65, 85);
                const t = part.slice(1, -1);
                doc.text(t, currentX, cellY);
                currentX += doc.getTextWidth(t);
            } else if (part.startsWith('[') && part.includes('](')) {
                const match = part.match(/\[(.*?)\]\((.*?)\)/);
                if (match) {
                    doc.setFont('RobotoCustom', 'bold');
                    doc.setTextColor(37, 99, 235); // Blue link text
                    
                    const linkText = match[1];
                    const linkUrl = match[2];

                    doc.text(linkText, currentX, cellY);
                    const tw = doc.getTextWidth(linkText);
                    
                    doc.setDrawColor(37, 99, 235);
                    doc.setLineWidth(0.5);
                    doc.line(currentX, cellY + 1.5, currentX + tw, cellY + 1.5);
                    
                    doc.link(currentX, cellY - 9, tw, 12, { url: linkUrl });
                    currentX += tw;
                }
            } else {
                doc.setFont('RobotoCustom', 'normal');
                doc.setTextColor(51, 65, 85);
                doc.text(part, currentX, cellY);
                currentX += doc.getTextWidth(part);
            }
        }
    }

    /**
     * Intercepts and processes inline markdown visual tags asynchronously
     */
    private async parseAndRenderMarkdownImages(
        doc: jsPDF, 
        text: string
    ): Promise<boolean> {
        const trimmed = text.trim();
        const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?\.svg)\)$/i);
        
        if (imageMatch) {
            const altText = imageMatch[1];
            const relativeSvgPath = imageMatch[2];
            
            // CRITICAL FIX: Await the image conversion before releasing the execution thread
            await this.renderSvgDirectlyToPdf(relativeSvgPath, doc, altText);
            return true;
        }
        return false;
    }

    /**
     * Fetches raw SVG text, rasterizes it natively using the browser's Canvas API, 
     * and injects it cleanly as a crisp high-res layout image.
     */
    private async renderSvgDirectlyToPdf(
        key: string | undefined, 
        doc: jsPDF, 
        altText: string
    ): Promise<void> {
        try {
            // 1. Fetch raw SVG string via your existing API infrastructure
            const data = await firstValueFrom(this.api.getStructureRaw(this.ownerName, this.repositoryName, this.branchName, key));
            if (!data || !data.content) return;

            const cleanBase64 = data.content.replace(/\s/g, '');
            const binaryString = atob(cleanBase64);
            const bytes = Uint8Array.from(binaryString, m => m.charCodeAt(0));
            const rawSvgXml = new TextDecoder('utf-8').decode(bytes);

            // 2. Wrap the raw SVG string inside a browser-native secure Blob object
            // const svgBlob = new Blob([rawSvgXml], { type: 'image/svg+xml;charset=utf-8' });
            // const blobUrl = URL.createObjectURL(svgBlob);
            const encodedSvg = btoa(unescape(encodeURIComponent(rawSvgXml)));
            const safeDataUrl = `data:image/svg+xml;base64,${encodedSvg}`;

            // 3. Load the Blob URL into an asynchronous Image element container
            // const img = new Image();
            
            // await new Promise<void>((resolve, reject) => {
            //     img.onload = () => resolve();
            //     img.onerror = (err) => reject(err);
            //     img.src = blobUrl;
            // });
            const img = new Image();
            img.crossOrigin = 'anonymous'; // Explicitly grant read permissions to the canvas
            
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = (err) => reject(err);
                img.src = safeDataUrl; // Set source directly to the local data URI string
            });

            // 4. Extract natural dimensions or provide a balanced structural default
            const svgWidth = img.naturalWidth || 500;
            const svgHeight = img.naturalHeight || 300;
            const aspectRatio = svgHeight / svgWidth;
            
            const scaleFactor = 2; // High-res canvas scale
            const renderWidth = this.contentWidth;
            const renderHeight = this.contentWidth * aspectRatio;

            // 5. Build an internal off-screen high-res Canvas element sandbox
            const canvas = document.createElement('canvas');
            canvas.width = renderWidth * scaleFactor;
            canvas.height = renderHeight * scaleFactor;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Could not instantiate canvas 2D rendering layout.');

            // Fill background with solid white
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw the image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // 6. Enforce vertical space check barriers before rendering
            this.ensureSpace(doc, renderHeight + 30);

            // Print caption text
            doc.setFont('RobotoCustom', 'italic');
            doc.setFontSize(9);
            doc.setTextColor(148, 163, 184);
            doc.text(`Diagram: ${altText || 'Vector Graphic Asset'}`, this.leftMargin, this.currentY);
            this.currentY += 12;

            // 7. Extract the canvas data and embed it into the document immediately
            const imgDataUrl = canvas.toDataURL('image/png', 1.0);
            doc.addImage(imgDataUrl, 'PNG', this.leftMargin, this.currentY, renderWidth, renderHeight);
            
            this.currentY += renderHeight + 20;

            // Clean up system memory resources immediately
            // URL.revokeObjectURL(blobUrl);

        } catch (error) {
            console.error(`Native SVG vector compiler pipeline failed for: ${key}`, error);
            this.ensureSpace(doc, 25);
            doc.setFont('RobotoCustom', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(239, 68, 68);
            doc.text(`[Error loading vector model asset: ${altText}]`, this.leftMargin, this.currentY);
            this.currentY += 15;
        }
    }

    private renderBlockquote(doc: jsPDF, text: string): void {
        doc.setFont('RobotoCustom', 'italic');
        doc.setFontSize(11);doc.setTextColor(71, 85, 105); // slate-600
        // Indent quotes and calculate wrapping boundaries
        const indentedWidth = this.contentWidth - 20;
        const wrappedLines = doc.splitTextToSize(text, indentedWidth);
        const startY = this.currentY - 10;
        for (const line of wrappedLines) {
            this.ensureSpace(doc, 15);// Soft quote backdrop layout shading fill block
            doc.setFillColor(241, 245, 249); // slate-100
            doc.rect(this.leftMargin, this.currentY - 11, this.contentWidth, 15, 'F');
            doc.text(line, this.leftMargin + 15, this.currentY);
            this.currentY += 15;
        }
        
        // Draw a thick left accent border line
        doc.setDrawColor(148, 163, 184); // slate-400 accent bar
        doc.setLineWidth(3);
        doc.line(this.leftMargin, startY, this.leftMargin, this.currentY - 11);
        this.currentY += 4;
    }            

    /**
     * Dedicated horizontal inline regex token engine to extract **bold** markers dynamically
     */
    private renderTokenText(doc: jsPDF, text: string, startX: number, maxWidth: number, fontSize: number): void {
        doc.setFontSize(fontSize);
        const originalWrappedLines: string[] = doc.splitTextToSize(text, maxWidth);

        for (const line of originalWrappedLines) {
            this.ensureSpace(doc, 16);
            let currentX = startX;

            // CORRECTED REGEX: Safely catches blocks without breaking the compiler
            const parts = line.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\)|~~.*?~~|\*.*?\*|_.*?_)/g);

            for (const part of parts) {
                if (!part) continue;

                if (part.startsWith('**') && part.endsWith('**')) {
                    doc.setFont('RobotoCustom', 'bold');
                    doc.setTextColor(15, 23, 42);
                    const t = part.slice(2, -2);
                    doc.text(t, currentX, this.currentY);
                    currentX += doc.getTextWidth(t);
                } else if (part.startsWith('~~') && part.endsWith('~~')) {
                    doc.setFont('RobotoCustom', 'normal');
                    doc.setTextColor(148, 163, 184);
                    const t = part.slice(2, -2);
                    doc.text(t, currentX, this.currentY);
                    const tw = doc.getTextWidth(t);
                    doc.setDrawColor(148, 163, 184);
                    doc.setLineWidth(0.8);
                    doc.line(currentX, this.currentY - 3.5, currentX + tw, this.currentY - 3.5);
                    currentX += tw;
                } else if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
                    doc.setFont('RobotoCustom', 'italic');
                    doc.setTextColor(51, 65, 85);
                    const t = part.slice(1, -1);
                    doc.text(t, currentX, this.currentY);
                    currentX += doc.getTextWidth(t);
                } else if (part.startsWith('[') && part.includes('](')) {
                    // CORRECTED MATCH REGEX: Using single backslashes here too
                    const match = part.match(/\[(.*?)\]\((.*?)\)/);
                    if (match) {
                        doc.setFont('RobotoCustom', 'bold');
                        doc.setTextColor(37, 99, 235); // Blue-600
                        
                        const linkText = match[1];
                        const linkUrl = match[2];

                        doc.text(linkText, currentX, this.currentY);
                        const tw = doc.getTextWidth(linkText);
                        
                        doc.setDrawColor(37, 99, 235);
                        doc.setLineWidth(0.5);
                        doc.line(currentX, this.currentY + 1.5, currentX + tw, this.currentY + 1.5);
                        
                        doc.link(currentX, this.currentY - 9, tw, 12, { url: linkUrl });
                        currentX += tw;
                    }
                } else {
                    doc.setFont('RobotoCustom', 'normal');
                    doc.setTextColor(51, 65, 85);
                    doc.text(part, currentX, this.currentY);
                    currentX += doc.getTextWidth(part);
                }
            }
            this.currentY += 15;
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
            doc.addPage();
            this.totalPages++;
            this.currentY = 45; // Safe top layout boundary margin padding start
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
            doc.setFont('RobotoCustom', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(148, 163, 184); // slate-400
            
            // Format standard page footer tracking strings
            const footerText = `${pathStr}, exported ${exportedStr}, page ${i} of ${total}`;
            const textWidth = doc.getTextWidth(footerText);
            doc.text(footerText, (595 / 2) - (textWidth / 2), 815);
        }
    }
}
