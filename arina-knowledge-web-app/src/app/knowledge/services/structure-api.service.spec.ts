import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthorizationService } from '@/app/core/services/authorization.service';
import { StructureApiService } from './structure-api.service';

describe('StructureApiService.structureExists', () => {
    let service: StructureApiService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(), provideHttpClientTesting(),
                { provide: AuthorizationService, useValue: { getToken: () => 'test-token' } }
            ]
        });
        service = TestBed.inject(StructureApiService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('encodes path segments and branch names and keeps authentication', () => {
        const next = vi.fn();
        service.isStructureExists('owner', 'repository', 'feature/links', 'models/Customer #1?.md').subscribe(next);
        const request = http.expectOne('https://api.github.com/repos/owner/repository/contents/models/Customer%20%231%3F.md?ref=feature%2Flinks');
        expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
        request.flush({ type: 'file' });
        expect(next).toHaveBeenCalledWith(true);
    });

    it('returns false for a missing path', () => {
        const next = vi.fn();
        service.isStructureExists('owner', 'repository', 'main', 'missing.md').subscribe(next);
        http.expectOne('https://api.github.com/repos/owner/repository/contents/missing.md?ref=main')
            .flush({}, { status: 404, statusText: 'Not Found' });
        expect(next).toHaveBeenCalledWith(false);
    });

    it('propagates access and rate-limit failures', () => {
        const error = vi.fn();
        service.isStructureExists('owner', 'repository', 'main', 'file.md').subscribe({ error });
        http.expectOne('https://api.github.com/repos/owner/repository/contents/file.md?ref=main')
            .flush({}, { status: 403, statusText: 'Forbidden' });
        expect(error).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
    });
});
