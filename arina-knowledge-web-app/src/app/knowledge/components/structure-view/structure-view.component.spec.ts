import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
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
        expect(panel.textContent).not.toContain('Entity title is valid');
        expect(fixture.nativeElement.querySelector('pre')?.textContent).toContain('# Customer');
    });

    it('renders missing-description suggestions in blue and supports closing the panel', async () => {
        await loadFile('# model Customer');
        validateButton()!.click();
        fixture.detectChanges();

        const suggestion = fixture.nativeElement.querySelector('aside .bg-blue-100') as HTMLElement;
        expect(suggestion.textContent).toContain('No description found, add it');
        expect(suggestion.textContent).toContain('Row 2');
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
    });
});
