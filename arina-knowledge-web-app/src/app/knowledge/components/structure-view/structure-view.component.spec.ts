import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { NotificationService } from '@/app/core/services/notification.service';
import { StructureApiService } from '../../services/structure-api.service';
import { StructureExportService } from '../../services/structure-export.service';
import { StructureViewComponent } from './structure-view.component';

describe('StructureViewComponent validation', () => {
    let fixture: ComponentFixture<StructureViewComponent>;
    let component: StructureViewComponent;
    let getStructureRaw: ReturnType<typeof vi.fn>;
    let structureExists: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        getStructureRaw = vi.fn();
        structureExists = vi.fn().mockReturnValue(of(true));
        await TestBed.configureTestingModule({
            imports: [StructureViewComponent],
            providers: [
                provideRouter([]),
                { provide: StructureApiService, useValue: { getStructureRaw, structureExists } },
                { provide: StructureExportService, useValue: {} },
                { provide: NotificationService, useValue: { showError: vi.fn() } },
                { provide: MatDialog, useValue: {} }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(StructureViewComponent);
        component = fixture.componentInstance;
        component.currentView.set('action_source');
    });

    async function loadFile(source: string, key = 'model.md') {
        getStructureRaw.mockReturnValue(of({
            content: btoa(source), download_url: `https://example.com/${key}`
        }));
        await component.refreshData('owner', 'repository', 'main', key);
        fixture.detectChanges();
    }

    function validateButton(): HTMLButtonElement | undefined {
        return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
            .find(button => button.textContent?.includes('Validate'));
    }

    async function clickValidate() {
        validateButton()!.click();
        await expect.poll(() => component.isValidating()).toBe(false);
        fixture.detectChanges();
    }

    it('validates on click and renders colored issues with source rows beside the source', async () => {
        await loadFile('# Customer\nIntro\n## description\nText');
        expect(fixture.nativeElement.querySelector('aside')).toBeNull();
        const validate = validateButton()!;
        expect(validate.nextElementSibling?.textContent).toContain('Open in GitHub');
        const viewport = fixture.nativeElement.querySelector('pre').closest('.overflow-auto');
        expect(validate.closest('nav')?.parentElement).toBe(viewport.parentElement);

        await clickValidate();

        const panel = fixture.nativeElement.querySelector('aside') as HTMLElement;
        expect(panel.textContent).toContain('No Entity Type');
        expect(panel.querySelector('.bg-red-100')?.textContent).toContain('Row 1');
        expect(panel.querySelector('.bg-yellow-100')?.textContent).toContain('Row 3');
        expect(panel.textContent).toContain('Description is not first');
        const errorCard = panel.querySelector('.bg-red-100') as HTMLElement;
        expect(errorCard.querySelector('.font-semibold')?.textContent).toBe('No Entity Type');
        expect(errorCard.querySelector('mat-icon')?.textContent?.trim()).toBe('error');
        expect(errorCard.textContent).toContain('Add a lowercase entity type after #.');
        expect(panel.querySelector('.bg-yellow-100 mat-icon')?.textContent?.trim()).toBe('warning');
        const tooltips = fixture.debugElement.queryAll(By.directive(MatTooltip))
            .map(element => element.injector.get(MatTooltip).message);
        expect(tooltips).toEqual(['error', 'warning']);
        expect(component.validationTotals()).toEqual({ errors: 1, warnings: 1, suggestions: 0 });
        expect(Array.from(panel.querySelectorAll('[aria-label="Validation totals"] span'))
            .map(element => element.textContent)).toEqual(['1 errors', '1 warnings', '0 suggestions']);
        expect(panel.textContent).not.toContain('Entity title is valid');
        expect(fixture.nativeElement.querySelector('pre')?.textContent).toContain('# Customer');
    });

    it('renders missing-description suggestions in blue and supports closing the panel', async () => {
        await loadFile('# model Customer');
        await clickValidate();

        const suggestion = fixture.nativeElement.querySelector('aside .bg-blue-100') as HTMLElement;
        expect(suggestion.querySelector('.font-semibold')?.textContent).toBe('No description found');
        expect(suggestion.querySelector('mat-icon')?.textContent?.trim()).toBe('lightbulb');
        expect(suggestion.querySelector('mat-icon')?.getAttribute('aria-label')).toBe('suggestion');
        expect(suggestion.querySelector('.font-semibold')?.textContent).not.toContain('Add a Descrition');
        expect(suggestion.textContent).toContain('Add a Descrition');
        expect(suggestion.textContent).toContain('Row 2');
        expect(component.validationTotals()).toEqual({ errors: 0, warnings: 0, suggestions: 1 });
        fixture.nativeElement.querySelector('button[aria-label="Close validation"]').click();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('aside')).toBeNull();
    });

    it('shows a success message when all rules pass', async () => {
        await loadFile('# model Customer\n\n## description\nText');
        await clickValidate();

        expect(fixture.nativeElement.querySelector('aside')?.textContent).toContain('All validation rules passed.');
        expect(component.validationIssues()).toEqual([]);
        expect(component.validationTotals()).toEqual({ errors: 0, warnings: 0, suggestions: 0 });
        const totals = fixture.nativeElement.querySelector('[aria-label="Validation totals"]') as HTMLElement;
        expect(Array.from(totals.querySelectorAll('span')).map(element => element.textContent))
            .toEqual(['0 errors', '0 warnings', '0 suggestions']);
    });

    it('keeps validation available alongside rendered Markdown when switching views', async () => {
        await loadFile('# model Customer\n\n## description\nText');
        await clickValidate();
        component.onViewChange('action_view');
        fixture.detectChanges();

        await expect.poll(() => {
            fixture.detectChanges();
            return fixture.nativeElement.querySelector('.prose h1')?.textContent;
        }).toBe('model Customer');
        expect(fixture.nativeElement.querySelector('aside')?.textContent).toContain('All validation rules passed.');
        expect(validateButton()).toBeDefined();
    });

    it('selects the issue row in Source and highlights the full paragraph after switching to View', async () => {
        const markdown = '# model Customer\r\n\r\n## description\r\n[Good](https://example.com) [Bad](http://example.com)';
        await loadFile(markdown);
        await clickValidate();

        const sourceRow = fixture.nativeElement.querySelector('[data-source-row="4"]') as HTMLElement;
        const viewport = sourceRow.closest<HTMLElement>('.overflow-auto')!;
        vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 600, 300));
        const rowBounds = vi.spyOn(sourceRow, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 274, 600, 24));
        const scroll = vi.fn();
        sourceRow.scrollIntoView = scroll;
        const issue = fixture.nativeElement.querySelector('aside button.bg-red-100') as HTMLButtonElement;
        issue.click();
        fixture.detectChanges();

        expect(issue.getAttribute('aria-pressed')).toBe('true');
        expect(sourceRow.classList.contains('bg-amber-50')).toBe(true);
        expect(scroll).not.toHaveBeenCalled();

        rowBounds.mockReturnValue(new DOMRect(0, 350, 600, 24));
        issue.click();
        fixture.detectChanges();
        expect(sourceRow.classList.contains('scroll-mb-18')).toBe(true);
        expect(scroll).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
        expect(fixture.nativeElement.querySelector('pre code')?.textContent).toBe(markdown.replace(/\r\n/g, '\n'));

        component.onViewChange('action_view');
        await expect.poll(() => {
            fixture.detectChanges();
            return fixture.nativeElement.querySelector('.prose p.bg-amber-50')?.textContent;
        }).toBe('Good Bad');

        component.closeValidation();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.prose .bg-amber-50')).toBeNull();
    });

    it('highlights just the affected table row for a link inside a table', async () => {
        await loadFile('# model Customer\n## description\n| Name | Link |\n| --- | --- |\n| Example | [Bad](http://example.com) |');
        component.onViewChange('action_view');
        await clickValidate();

        fixture.nativeElement.querySelector('aside button.bg-red-100').click();
        await expect.poll(() => {
            fixture.detectChanges();
            return fixture.nativeElement.querySelector('.prose tr.bg-amber-50 td')?.textContent;
        }).toBe('Example');
    });

    it('highlights a rendered heading when the validation result refers to a section', async () => {
        await loadFile('# model Customer\n\nIntro\n\n## description\nText');
        component.onViewChange('action_view');
        await clickValidate();

        fixture.nativeElement.querySelector('aside button.bg-yellow-100').click();
        await expect.poll(() => {
            fixture.detectChanges();
            return fixture.nativeElement.querySelector('.prose h2.bg-amber-50')?.textContent;
        }).toBe('description');
    });

    it('clears results as navigation starts and hides Validate while loading or browsing a folder', async () => {
        await loadFile('# model Customer');
        await component.validate();
        const pending = new Subject<unknown>();
        getStructureRaw.mockReturnValue(pending);
        void component.refreshData('owner', 'repository', 'main', 'folder');
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('aside')).toBeNull();
        expect(validateButton()).toBeUndefined();
        expect(component.validationTotals()).toEqual({ errors: 0, warnings: 0, suggestions: 0 });
        pending.next([]);
        pending.complete();
        fixture.detectChanges();
        expect(validateButton()).toBeUndefined();
    });

    it('does not show Validate for non-Markdown file details', async () => {
        await loadFile('Text', 'notes.txt');
        expect(validateButton()).toBeUndefined();
    });

    it('can validate an empty Markdown file', async () => {
        await loadFile('', 'empty.MD');
        await clickValidate();

        expect(fixture.nativeElement.querySelectorAll('aside .bg-red-100')).toHaveLength(2);
        expect(fixture.nativeElement.querySelectorAll('aside .bg-blue-100')).toHaveLength(1);
        expect(component.validationTotals()).toEqual({ errors: 2, warnings: 0, suggestions: 1 });
    });

    it('shows progress while checking paths and then renders link errors', async () => {
        await loadFile('# model Customer\n## description\n[Missing](/missing.md)');
        const pending = new Subject<boolean>();
        structureExists.mockReturnValue(pending);
        const validation = component.validate();
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('aside')?.textContent).toContain('Checking Markdown links');
        expect(fixture.nativeElement.querySelector('aside')?.textContent).not.toContain('All validation rules passed.');
        expect(fixture.nativeElement.querySelector('button[aria-controls="structure-validation-panel"]')?.disabled).toBe(true);
        pending.next(false);
        pending.complete();
        await validation;
        fixture.detectChanges();

        expect(structureExists).toHaveBeenCalledWith('owner', 'repository', 'main', 'missing.md');
        const error = fixture.nativeElement.querySelector('aside .bg-red-100') as HTMLElement;
        expect(error.textContent).toContain('Wrong local link');
        expect(error.textContent).toContain('/missing.md');
        expect(error.textContent).toContain('Row 3');
        expect(component.isValidating()).toBe(false);
    });

    it.each(['close', 'navigate'])('ignores late validation results after %s', async action => {
        await loadFile('# model Customer\n## description\n[Missing](/missing.md)');
        const pending = new Subject<boolean>();
        structureExists.mockReturnValue(pending);
        const validation = component.validate();

        if (action === 'close') {
            component.closeValidation();
        } else {
            await loadFile('# model Other\n## description\nText', 'other.md');
        }
        pending.next(false);
        pending.complete();
        await validation;
        fixture.detectChanges();

        expect(component.validationResults()).toBeUndefined();
        expect(component.isValidating()).toBe(false);
        expect(fixture.nativeElement.querySelector('aside')).toBeNull();
    });

    it('reports API failures without labeling an inaccessible path as missing', async () => {
        await loadFile('# model Customer\n## description\n[File](/file.md)');
        structureExists.mockReturnValue(throwError(() => new Error('Rate limit exceeded')));
        await component.validate();

        expect(TestBed.inject(NotificationService).showError)
            .toHaveBeenCalledWith('Error validating Markdown links: Rate limit exceeded');
        expect(component.validationResults()).toBeUndefined();
        expect(component.isValidating()).toBe(false);
    });

    it.each(['missing.md', 'missing/folder'])('shows a 404 view for a missing repository path: %s', async key => {
        await loadFile('# model Customer');
        await component.validate();
        getStructureRaw.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
        await component.refreshData('owner', 'repository', 'main', key);
        fixture.detectChanges();

        const page = fixture.nativeElement.querySelector('section[aria-labelledby="structure-not-found-title"]') as HTMLElement;
        expect(page.textContent).toContain('404');
        expect(page.querySelector('h1')?.textContent).toBe('Structure not found');
        expect(page.querySelector('code')?.textContent).toBe(`/${key}`);
        expect(page.querySelector('a')?.getAttribute('href')).toBe('/knowledge/owner/repository/main');
        expect(component.isDataLoading()).toBe(false);
        expect(fixture.nativeElement.querySelector('pre')).toBeNull();
        expect(fixture.nativeElement.querySelector('aside')).toBeNull();
        expect(fixture.nativeElement.querySelector('mat-button-toggle-group')).toBeNull();
        expect(fixture.nativeElement.textContent).not.toContain('Export to PDF');
        expect(TestBed.inject(NotificationService).showError).not.toHaveBeenCalled();
    });

    it('clears the 404 view immediately when navigating to another path', async () => {
        getStructureRaw.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
        await component.refreshData('owner', 'repository', 'main', 'missing.md');
        const pending = new Subject<unknown>();
        getStructureRaw.mockReturnValue(pending);
        void component.refreshData('owner', 'repository', 'main', 'existing.md');
        fixture.detectChanges();

        expect(component.isNotFound()).toBe(false);
        expect(component.isDataLoading()).toBe(true);
        expect(fixture.nativeElement.querySelector('#structure-not-found-title')).toBeNull();

        pending.next({ content: btoa('# model Existing'), download_url: 'https://example.com/existing.md' });
        pending.complete();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('pre')?.textContent).toBe('# model Existing');
        expect(component.isDataLoading()).toBe(false);
    });

    it.each([0, 403, 500])('preserves notification handling for non-404 failures: %s', async status => {
        getStructureRaw.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
        await component.refreshData('owner', 'repository', 'main', 'file.md');
        fixture.detectChanges();

        expect(component.isNotFound()).toBe(false);
        expect(component.isDataLoading()).toBe(false);
        expect(fixture.nativeElement.querySelector('#structure-not-found-title')).toBeNull();
        expect(TestBed.inject(NotificationService).showError).toHaveBeenCalled();
    });

    it('keeps an existing folder available when its README is missing', async () => {
        getStructureRaw.mockReturnValueOnce(of([
            { name: 'README.md', path: 'folder/README.md', type: 'file', url: 'https://api.github.com/repos/owner/repository/contents/folder/README.md?ref=main' },
            { name: 'file.md', path: 'folder/file.md', type: 'file', url: 'https://api.github.com/repos/owner/repository/contents/folder/file.md?ref=main' }
        ])).mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 404 })));
        await component.refreshData('owner', 'repository', 'main', 'folder');
        component.onListViewChange('action_list');
        fixture.detectChanges();

        expect(component.isNotFound()).toBe(false);
        expect(component.contentLinks()).toHaveLength(2);
        expect(fixture.nativeElement.textContent).toContain('file.md');
        expect(TestBed.inject(NotificationService).showError).not.toHaveBeenCalled();
    });

    it('ignores a late 404 from an earlier repository path', async () => {
        const pending = new Subject<unknown>();
        getStructureRaw.mockReturnValue(pending);
        void component.refreshData('owner', 'repository', 'main', 'missing.md');
        await loadFile('# model Existing', 'existing.md');
        pending.error(new HttpErrorResponse({ status: 404 }));
        fixture.detectChanges();

        expect(component.isNotFound()).toBe(false);
        expect(fixture.nativeElement.querySelector('pre')?.textContent).toBe('# model Existing');
        expect(TestBed.inject(NotificationService).showError).not.toHaveBeenCalled();
    });
});
