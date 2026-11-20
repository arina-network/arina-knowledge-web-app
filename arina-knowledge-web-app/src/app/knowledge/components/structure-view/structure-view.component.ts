import { afterRenderEffect, Component, computed, effect, ElementRef, inject, signal, viewChild, viewChildren } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppRoutes } from '@/app/core/constants/app-routes';
import { Breadcrumb } from '@/app/core/models/breadcrumb';
import { AppMarkdownPipe } from '@/app/core/pipes/app-marked.pipe';
import { AppSafeHtmlPipe } from '@/app/core/pipes/app-safe-html.pipe';
import { ProgressComponent } from '@/app/core/components/progress/progress.component';
import { AppParams } from '@/app/core/constants/app-params';
import { NotificationService } from '@/app/core/services/notification.service';


import { StructureApiService } from '../../services/structure-api.service';
import { StructureExportService } from '../../services/structure-export.service';
import { StructureValidationService } from '../../services/structure-validation.service';
import { StructureValidation } from '../../models/structure-validation';
import { StructureValidationResult } from '../../constants/structure-validation-result';
import { StructureLink } from '../../models/structure-link';
import { parseStructureTitle } from '../../validation/structure-title';
import { StructureContentComponent } from '../structure-content/structure-content.component';
import { StructureHomeComponent } from '../structure-home/structure-home.component';
import { ProgressExportComponent } from '@/app/core/components/progress-export/progress-export.component';

interface ViewValidation extends StructureValidation {
    filePath?: string;
}

interface ValidationGroup {
    path: string;
    name: string;
    issues: ViewValidation[];
}

@Component({
    selector: 'app-structure-view',
    standalone: true,
    host: { class: 'flex h-full min-h-0 flex-col' },
    imports: [
        AsyncPipe,
        RouterLink,
        MatDividerModule,
        MatButtonModule,
        MatIconModule,
        MatProgressBarModule,
        MatTooltipModule,
        MatButtonToggleModule,
        ProgressComponent,
        AppMarkdownPipe,
        AppSafeHtmlPipe,
        StructureContentComponent,
        StructureHomeComponent
    ],
    templateUrl: './structure-view.component.html'
})
export class StructureViewComponent {

    protected route = inject(ActivatedRoute);
    protected router = inject(Router);
    protected events = toSignal(this.router.events);

    protected notificationService = inject(NotificationService);        
   
    protected api = inject(StructureApiService);
    protected exportService = inject(StructureExportService);
    private readonly validationService = inject(StructureValidationService);
    protected routes = inject(AppRoutes);

    protected dialog = inject(MatDialog);

    protected owner?: string;
    protected repository?: string;
    protected branch?: string;
    protected key?: string;

    public isDataLoading = signal<boolean>(false);
    public isNotFound = signal(false);
    protected readonly isFolder = signal(false);
    private dataRequest = 0;

    constructor() {
        effect(() => {
            const currentEvent = this.events();
            // console.log('Router event detected: ', currentEvent);
            if (currentEvent instanceof NavigationEnd) {
                // console.log('NavigationEnd event detected. Refreshing data...', {route: this.route.url});
                const urlTree = this.router.parseUrl(this.router.url);
                const segments = urlTree.root.children['primary']?.segments || [];

                const newKey = segments.length >= 5 ? 
                    segments.slice(4).map(s => s.path).join('/') :
                    undefined;

                this.refreshData(
                    this.route.snapshot.paramMap.get(AppParams.Owner) || '',
                    this.route.snapshot.paramMap.get(AppParams.Repository) || '',
                    this.route.snapshot.paramMap.get(AppParams.Branch) || 'main',
                    newKey
                )
            }
        });

        afterRenderEffect(onCleanup => {
            const selection = this.selectedValidation();
            if (!selection) {
                return;
            }

            const filePath = selection.result.filePath;
            const content = filePath
                ? this.findFolderFile(filePath)?.renderedContent()?.nativeElement
                : this.validationContent()?.nativeElement;
            if (!content) {
                return;
            }

            const target = !filePath && this.currentView() === 'action_source'
                ? content.querySelector<HTMLElement>(`[data-source-row="${this.selectedSourceRow()}"]`)
                : this.findRenderedRow(content, selection.result.row) ?? (filePath ? content : undefined);
            if (target) {
                target.classList.add('bg-amber-50', 'scroll-mb-18');
                onCleanup(() => target.classList.remove('bg-amber-50', 'scroll-mb-18'));

                const viewport = this.contentViewport()?.nativeElement.getBoundingClientRect();
                const bounds = target.getBoundingClientRect();
                if (viewport && (bounds.top < viewport.top || bounds.bottom > viewport.bottom)) {
                    target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
                }
            }
        });
    }  
   
    // title: string | undefined;
    public githubUrl = signal<string | undefined>(undefined);
    public rawUrl = signal<string | undefined>(undefined);
    // source: string | undefined;
    public source = signal<string | undefined>(undefined);
    protected readonly sourceRows = computed(() => (this.source() ?? '').split(/\r\n|\r|\n/));
    private readonly contentViewport = viewChild<ElementRef<HTMLElement>>('contentViewport');
    private readonly structureStart = viewChild<ElementRef<HTMLElement>>('structureStart');
    private readonly validationContent = viewChild<ElementRef<HTMLElement>>('validationContent');
    private readonly folderContent = viewChildren(StructureContentComponent);
    protected readonly selectedValidation = signal<{ result: ViewValidation } | undefined>(undefined);
    protected readonly selectedSourceRow = computed(() => {
        const row = this.selectedValidation()?.result.row;
        return row === undefined ? undefined : Math.min(row, this.sourceRows().length);
    });

    protected goToValidationRow(result: ViewValidation) {
        // Clicking the same issue again should also bring it back into view.
        this.selectedValidation.set({ result });
    }

    protected goToStructure(path: string) {
        const start = this.isFolderContent()
            ? this.findFolderFile(path)?.element.nativeElement
            : this.structureStart()?.nativeElement;
        this.selectedValidation.set(undefined);
        start?.scrollIntoView?.({ block: 'start', inline: 'nearest' });
    }

    private findFolderFile(path: string) {
        return this.folderContent().find(file => file.key() === path);
    }

    private findRenderedRow(content: HTMLElement, row: number): HTMLElement | undefined {
        const blockSelector = '[data-markdown-row]:not(a)';
        const linkRow = content.querySelector(`a[data-markdown-row="${row}"]`)
            ?.closest<HTMLElement>(`tr, ${blockSelector}`);
        if (linkRow) {
            return linkRow;
        }

        let best: HTMLElement | undefined;
        let bestDistance = Infinity;
        let bestSize = Infinity;
        for (const element of content.querySelectorAll<HTMLElement>(blockSelector)) {
            const start = Number(element.dataset['markdownRow']);
            const end = Number(element.dataset['markdownEndRow']);

            // Blank or insertion rows may have no rendered element. Use the closest block.
            const distance = Math.max(start - row, row - end, 0);
            const size = end - start;
            if (distance < bestDistance || (distance === bestDistance && size <= bestSize)) {
                best = element;
                bestDistance = distance;
                bestSize = size;
            }
        }
        return best;
    }

    public canValidate = computed(() =>
        this.source() !== undefined && /\.md$/i.test(this.key ?? '') && !this.isDataLoading()
    );
    protected readonly validationResult = StructureValidationResult;
    protected readonly validationIcons: Record<StructureValidationResult, string> = {
        [StructureValidationResult.Ok]: 'check_circle',
        [StructureValidationResult.Error]: 'error',
        [StructureValidationResult.Warning]: 'warning',
        [StructureValidationResult.Suggestion]: 'lightbulb'
    };
    public validationResults = signal<ViewValidation[] | undefined>(undefined);
    protected readonly validationFailures = signal<readonly string[]>([]);
    public isValidating = signal(false);
    private validationRun = 0;
    public validationIssues = computed(() =>
        this.validationResults()?.filter(validation => validation.result !== StructureValidationResult.Ok) ?? []
    );
    protected readonly validationGroups = computed(() => {
        const groups = new Map<string, ValidationGroup>();
        const sources = new Map(this.folderContent().map(file => [file.key(), file.source()]));
        for (const issue of this.validationIssues()) {
            const path = issue.filePath ?? this.key ?? '';
            let group = groups.get(path);
            if (!group) {
                const source = issue.filePath ? sources.get(path) : this.source();
                const firstLine = source?.split(/\r\n?|\n/, 1)[0] ?? '';
                const { entityName } = parseStructureTitle(firstLine);
                group = { path, name: entityName ?? (path.split('/').at(-1) || 'Structure'), issues: [] };
                groups.set(path, group);
            }
            group.issues.push(issue);
        }
        return [...groups.values()];
    });
    public validationTotals = computed(() => {
        const totals = { errors: 0, warnings: 0, suggestions: 0 };
        for (const validation of this.validationIssues()) {
            switch (validation.result) {
                case StructureValidationResult.Error: totals.errors++; break;
                case StructureValidationResult.Warning: totals.warnings++; break;
                case StructureValidationResult.Suggestion: totals.suggestions++; break;
            }
        }
        return totals;
    });

    async validate() {
        const source = this.source();
        const folder = this.isFolderContent();
        if (this.isValidating() || (folder ? this.isFolderValidationLoading() : !this.canValidate())) {
            return;
        }
        const run = ++this.validationRun;
        this.selectedValidation.set(undefined);
        this.validationFailures.set([]);
        this.isValidating.set(true);
        this.validationResults.set([]);
        try {
            const { results, failures } = folder
                ? await this.validateFolder(run)
                : { results: await this.validateFile(source!, this.key!), failures: [] };
            if (run === this.validationRun) {
                this.validationResults.set(results);
                this.validationFailures.set(failures);
            }
        } catch (error) {
            if (run === this.validationRun) {
                this.validationResults.set(undefined);
                const message = error instanceof Error ? error.message : String(error);
                this.notificationService.showError('Error validating Markdown links: ' + message);
            }
        } finally {
            if (run === this.validationRun) {
                this.isValidating.set(false);
            }
        }
    }

    private validateFile(source: string, key: string) {
        return this.validationService.validate(source, {
            owner: this.owner!, repository: this.repository!, branch: this.branch ?? 'main', key
        });
    }

    private async validateFolder(run: number) {
        const sources = new Map(this.folderContent().map(file => [file.key(), file.source()]));
        const results: ViewValidation[] = [];
        const failures: string[] = [];
        for (const filePath of this.folderMarkdownPaths()) {
            if (run !== this.validationRun) {
                break;
            }
            const source = sources.get(filePath);
            if (source === undefined) {
                failures.push(filePath);
                continue;
            }
            try {
                const fileResults = await this.validateFile(source, filePath);
                results.push(...fileResults.map(result => ({ ...result, filePath })));
            } catch {
                failures.push(filePath);
            }
        }
        return { results, failures };
    }

    closeValidation() {
        this.validationRun++;
        this.selectedValidation.set(undefined);
        this.isValidating.set(false);
        this.validationResults.set(undefined);
        this.validationFailures.set([]);
    }

    public contentLinks = signal<StructureLink[]>([]);
    public contentReadme = signal<any | undefined>(undefined);

    // structure view
    currentView = signal<'action_view' | 'action_source'>('action_view');

    onViewChange(view: 'action_view' | 'action_source') {
        this.currentView.set(view);
    }    

    // folder view
    currentListView = signal<'action_readme' | 'action_list' | 'action_content' >('action_readme');
    protected readonly isFolderContent = computed(() => this.isFolder() && this.currentListView() === 'action_content');
    protected readonly folderFiles = computed(() => this.contentLinks()
        .filter(item => !item.isFolder && item.name !== 'README.md'));
    protected readonly folderMarkdownPaths = computed(() => this.folderFiles()
        .filter(item => item.key && /\.md$/i.test(item.key))
        .map(item => item.key!));
    protected readonly isFolderValidationLoading = computed(() => {
        const files = new Map(this.folderContent().map(file => [file.key(), file]));
        return this.folderMarkdownPaths().some(path => files.get(path)?.isDataLoading() !== false);
    });

    onListViewChange(view: 'action_readme' | 'action_list' | 'action_content') {
        if (view !== 'action_content' && this.isFolderContent()) {
            this.closeValidation();
        }
        this.currentListView.set(view);
    }

    async refreshData(
        newOwner: string,
        newRepository: string,
        newBranch: string,
        newKey?: string
    ) {
        const request = ++this.dataRequest;
        this.isDataLoading.set(true);
        this.clearData();

        this.owner = newOwner;
        this.repository = newRepository;
        this.branch = newBranch;
        this.key = newKey;

        this.api.getStructureRaw(
            this.owner, 
            this.repository, 
            this.branch ?? 'main',
            this.key
        ).subscribe({
            next: (data) => {
                if (request !== this.dataRequest) {
                    return;
                }
                this.clearData()

                // no data
                if (!data) {
                    this.isDataLoading.set(false);

                    // this.notificationService.showError('GitHub returns no data.');

                    return;
                }

                // content
                if (typeof data.content === 'string') {
                    this.isDataLoading.set(false);

                    this.setSource(data)

                    this.rawUrl.set(data.download_url);
                    this.githubUrl.set(`${this.routes.github}/${this.owner}/${this.repository}/${this.routes.githubBlob}/${this.branch}/${this.key}`);
                } else if (Array.isArray(data)) {
                    this.isFolder.set(true);
                    let readme: any = undefined;
                    data.map(item => {
                        const parsedUrl = new URL(item.url);
                        const segments = parsedUrl.pathname.split('/');
                        
                        const ownerName = segments[2]
                        const repositoryName = segments[3]
                        const branchName = parsedUrl.searchParams.get('ref')

                        const itemUrl = `${this.routes.knowledge}/${ownerName}/${repositoryName}/${branchName}/${item.path}`

                        if (item.name === 'README.md') {
                            readme = item;
                        }

                        const newLink = {
                            name: item.name,
                            url: itemUrl,
                            isFolder: item.type === 'dir',

                            owner: this.owner,
                            repository: this.repository,
                            branch: this.branch,
                            key: item.path
                        }
                        this.contentLinks.update(current => [...current, newLink]);  

                        // this.contentLinks.push({
                        //     name: item.name,
                        //     url: itemUrl,
                        //     isFolder: item.type === 'dir',

                        //     owner: this.owner,
                        //     repository: this.repository,
                        //     branch: this.branch,
                        //     key: item.path
                        // })                                        
                    })

                    if (!readme) {
                        this.isDataLoading.set(false);
                        return;
                    }

                    this.api.getStructureRaw(
                        this.owner, 
                        this.repository, 
                        this.branch ?? 'main',
                        `${readme.path}`
                    ).subscribe({                        
                        next: (readmeData) => {
                            if (request !== this.dataRequest) {
                                return;
                            }
                            if (readmeData?.content) {
                                this.isDataLoading.set(false);

                                this.setReadme(readmeData);
                                this.source.set(undefined);
                                
                                this.rawUrl.set(undefined);
                                // this.githubUrl = undefined;
                                // this.contentLinks = [];
                            } else {
                                this.isDataLoading.set(false);

                                // this.title = this.key;
                                this.source.set(undefined);
                                this.rawUrl.set(undefined);
                                this.githubUrl.set(undefined);
                                this.contentReadme.set(undefined);
                            }
                        },
                        error: (err) => {
                            if (request !== this.dataRequest) {
                                return;
                            }
                            if (err.status === 404) {
                                this.contentReadme.set(undefined);
                                this.isDataLoading.set(false);
                                return;
                            }
                            this.isDataLoading.set(false);

                            this.notificationService.showError('Error fetching README.md from GitHub: ' + err.message);
                        }
                    });
                } else {
                    this.isDataLoading.set(false);
                }

                // this.cdr.detectChanges(); 
            },
            error: (err) => {
                if (request !== this.dataRequest) {
                    return;
                }
                this.clearData()
                this.isDataLoading.set(false);

                if (err.status === 404) {
                    this.isNotFound.set(true);
                    return;
                }
                this.notificationService.showError('Error fetching Raw Data from GitHub: ' + err.message);
            }
        });
    }

    protected setSource(data: any) {
        const cleanBase64 = data.content.replace(/\s/g, '');
        const binaryString = atob(cleanBase64);
        const bytes = Uint8Array.from(binaryString, m => m.charCodeAt(0));

        // this.title = this.key;
        this.source.set(new TextDecoder('utf-8').decode(bytes));
    }

    protected setReadme(data: any) {
        const cleanBase64 = data.content.replace(/\s/g, '');
        const binaryString = atob(cleanBase64);
        const bytes = Uint8Array.from(binaryString, m => m.charCodeAt(0));

        // this.title = this.key;
        this.contentReadme.set(new TextDecoder('utf-8').decode(bytes));
    }

    protected clearData() {
        this.isNotFound.set(false);
        this.isFolder.set(false);
        this.closeValidation();
        this.githubUrl.set(undefined);

        // this.title = undefined;
        this.source.set(undefined);
        this.rawUrl.set(undefined);
        
        this.contentReadme.set(undefined);
        this.contentLinks.set([]);
    }

    isEmpty() {
        return !this.owner || !this.repository;
    }

    get isShowBreadcrumb() : boolean {
        return !this.isEmpty();
        // return !!this.key;
    }

    get breadcrumbs() : Breadcrumb[] {
        const result: Breadcrumb[] = [];

        // empty repository
        if (!(this.repository?.length ?? 0 > 0)) {
            return result;
        }

        result.push({
            name: this.repository!,
            url: `/${this.routes.knowledge}/${this.owner}/${this.repository}/${this.branch}`
        });

        // empty key
        if (!(this.key?.length ?? 0 > 0)) {
            return result;
        }

        const route = this.key?.split('/').filter(x => x?.length > 0) ?? [];
        for (let i = 0; i < route.length; i++) {
            result.push({
                name: route[i]!,
                url: `/${this.routes.knowledge}/${this.owner}/${this.repository}/${this.branch}/${route.slice(0, i + 1).join('/')}`
            });
        }

        return result;
    }    

    async exportToPdf() {
        const dialogRef = this.dialog.open(ProgressExportComponent, {
            disableClose: true,
            data: { currentFile: 'Initializing connection...' }
        });

        try {
            await this.exportService.exportToPdf(this.owner, this.repository, this.branch, this.key);

        } catch (error) {
            dialogRef.close();

            const message = error instanceof Error ? error.message : String(error);
            this.notificationService.showError('Error exporting to PDF: ' + message);
        } finally {
            dialogRef.close();
        }
    }
}
