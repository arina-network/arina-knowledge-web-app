import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';

import { NotificationService } from '@/app/core/services/notification.service';
import { StructureApiService } from '../../services/structure-api.service';
import { StructureExportService } from '../../services/structure-export.service';
import { StructureViewComponent } from './structure-view.component';

describe('StructureViewComponent validation', () => {
    let fixture: ComponentFixture<StructureViewComponent>;
    let component: StructureViewComponent;
    let getStructureRaw: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        getStructureRaw = vi.fn();
        await TestBed.configureTestingModule({
            imports: [StructureViewComponent],
            providers: [
                provideRouter([]),
                { provide: StructureApiService, useValue: { getStructureRaw } },
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

    it('validates on click and renders colored issues with source rows beside the source', async () => {
        await loadFile('# Customer\nIntro\n## description\nText');
        expect(fixture.nativeElement.querySelector('aside')).toBeNull();

        validateButton()!.click();
        fixture.detectChanges();

        const panel = fixture.nativeElement.querySelector('aside') as HTMLElement;
        expect(panel.textContent).toContain('No Entity Type');
        expect(panel.querySelector('.bg-red-100')?.textContent).toContain('Row 1');
        expect(panel.querySelector('.bg-yellow-100')?.textContent).toContain('Row 3');
        expect(panel.textContent).toContain('Description is not first');
        const errorCard = panel.querySelector('.bg-red-100') as HTMLElement;
        expect(errorCard.querySelector('h3')?.textContent).toBe('No Entity Type');
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
        validateButton()!.click();
        fixture.detectChanges();

        const suggestion = fixture.nativeElement.querySelector('aside .bg-blue-100') as HTMLElement;
        expect(suggestion.querySelector('h3')?.textContent).toBe('No description found');
        expect(suggestion.querySelector('mat-icon')?.textContent?.trim()).toBe('lightbulb');
        expect(suggestion.querySelector('mat-icon')?.getAttribute('aria-label')).toBe('suggestion');
        expect(suggestion.querySelector('h3')?.textContent).not.toContain('Add a Descrition');
        expect(suggestion.textContent).toContain('Add a Descrition');
        expect(suggestion.textContent).toContain('Row 2');
        expect(component.validationTotals()).toEqual({ errors: 0, warnings: 0, suggestions: 1 });
        fixture.nativeElement.querySelector('button[aria-label="Close validation"]').click();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('aside')).toBeNull();
    });

    it('shows a success message when all rules pass', async () => {
        await loadFile('# model Customer\n\n## description\nText');
        validateButton()!.click();
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('aside')?.textContent).toContain('All validation rules passed.');
        expect(component.validationIssues()).toEqual([]);
        expect(component.validationTotals()).toEqual({ errors: 0, warnings: 0, suggestions: 0 });
        const totals = fixture.nativeElement.querySelector('[aria-label="Validation totals"]') as HTMLElement;
        expect(Array.from(totals.querySelectorAll('span')).map(element => element.textContent))
            .toEqual(['0 errors', '0 warnings', '0 suggestions']);
    });

    it('keeps validation available alongside rendered Markdown when switching views', async () => {
        await loadFile('# model Customer\n\n## description\nText');
        validateButton()!.click();
        component.onViewChange('action_view');
        fixture.detectChanges();

        await expect.poll(() => {
            fixture.detectChanges();
            return fixture.nativeElement.querySelector('.prose h1')?.textContent;
        }).toBe('model Customer');
        expect(fixture.nativeElement.querySelector('aside')?.textContent).toContain('All validation rules passed.');
        expect(validateButton()).toBeDefined();
    });

    it('clears results as navigation starts and hides Validate while loading or browsing a folder', async () => {
        await loadFile('# model Customer');
        component.validate();
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
        validateButton()!.click();
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelectorAll('aside .bg-red-100')).toHaveLength(2);
        expect(fixture.nativeElement.querySelectorAll('aside .bg-blue-100')).toHaveLength(1);
        expect(component.validationTotals()).toEqual({ errors: 2, warnings: 0, suggestions: 1 });
    });
});
