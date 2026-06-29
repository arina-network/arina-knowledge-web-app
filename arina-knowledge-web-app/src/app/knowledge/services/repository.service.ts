import { effect, inject, Injectable, Signal, signal } from '@angular/core';

import { AppInfo } from '@/app/core/constants/app-info';

import { AuthorizationService } from '@/app/core/services/authorization.service';
import { NotificationService } from '@/app/core/services/notification.service';

import { RepositoryCategory } from '../constants/repository-category';

import { Branch } from '../models/branch';
import { Repository } from '../models/repository';
import { RepositoryGroup } from '../models/repository-group';

import { StructureApiService } from '../api-services/structure-api.service';

@Injectable({
    providedIn: 'root'
})
export class RepositoryService {
    protected authorizationService = inject(AuthorizationService);
    protected notificationService = inject(NotificationService);        

    protected api = inject(StructureApiService);

    public publicRepositories = signal<RepositoryGroup>(this.loadRepositoriesFromLocalStorage(RepositoryCategory.Public));
    public privateRepositories = signal<RepositoryGroup>(this.loadRepositoriesFromLocalStorage(RepositoryCategory.Private));
    public arinaRepositories = signal<RepositoryGroup>(this.loadArinaRepositories());

    public branches = signal<Branch[] | null>(null);
    constructor() {
        effect(() => {
            this.saveRepositoriesToLocalStorage(RepositoryCategory.Public, this.publicRepositories());
        });
        effect(() => {
            this.saveRepositoriesToLocalStorage(RepositoryCategory.Private, this.privateRepositories());
        });
    }    

    private selectedRepository = signal<Repository | null>(null);
    private selectedBranch = signal<Branch | null>(null);

    getSelectedRepository(): Repository | null {
        return this.selectedRepository();
    }

    getSelectedRepositorySignal() : Signal<Repository | null> {
        return this.selectedRepository.asReadonly();
    } 

    setSelectedRepository(repository: Repository): void {
        this.selectedRepository.set(repository);
        this.selectedBranch.set(null);

        this.api.getBranches(
            repository.ownerName, 
            repository.repositoryName 
        ).subscribe({
            next: (data) => {
                const branches = data.map(item => ({
                        branchName: item.name,
                        isMain: item.protected
                    })
                );                

                this.branches.set(branches)
            },
            error: (err) => {
                this.notificationService.showError('Fetching data from GitHub failed: ' + err.message);
            }
        });        
    }

    isRepositorySelected(): boolean {
        return this.selectedRepository() !== null;
    }

    getRepositories(): RepositoryGroup[] {
        return [
            this.privateRepositories(),
            this.publicRepositories(),
            this.arinaRepositories(),
        ]    
    }

    getSelectedBranch(): Branch | null {
        return this.selectedBranch();
    }

    setSelectedBranch(branch: Branch): void {
        this.selectedBranch.set(branch);
    }

    clear(): void {
        this.branches.set(null);
        this.selectedBranch.set(null);
        this.selectedRepository.set(null);
    }
    
    setOwnerAndRepositoryAndBranch(
        ownerName?: string, 
        repositoryName?: string, 
        branchName: string = 'main'
    ): void {
        if (!ownerName || !repositoryName) {
            this.clear();
            return;
        }

        // console.log('setOwnerAndRepositoryAndBranch: ', {ownerName, repositoryName})

        const arinaRepository = this.arinaRepositories().repositories.find(r => 
            r.ownerName?.toLowerCase() === ownerName?.toLowerCase() 
            && r.repositoryName?.toLowerCase() === repositoryName?.toLowerCase()
        );

        if (arinaRepository) {
            this.setSelectedRepository(arinaRepository);
        } else {
            const publicRepository = this.publicRepositories().repositories.find(r => 
                r.ownerName?.toLowerCase() === ownerName?.toLowerCase() 
                && r.repositoryName?.toLowerCase() === repositoryName?.toLowerCase()
            );

            if (publicRepository) {
                this.setSelectedRepository(publicRepository);
            } else {
                const privateRepository = this.privateRepositories().repositories.find(r => 
                    r.ownerName?.toLowerCase() === ownerName?.toLowerCase() 
                    && r.repositoryName?.toLowerCase() === repositoryName?.toLowerCase()
                );

                if (privateRepository) {
                    this.setSelectedRepository(privateRepository);
                } else {
                    const newRepository = {
                        key: crypto.randomUUID(),
                        url: `https://github.com/${ownerName}/${repositoryName}`,
                        name: `${ownerName} -> ${repositoryName}`,
                        ownerName: ownerName ?? 'unknown',
                        repositoryName: repositoryName ?? 'unknown',
                        isPublic: true                
                    }

                    if (this.authorizationService.isAuthorized())
                    {
                        this.privateRepositories.update(current => ({
                            ...current,
                            repositories: [...current.repositories, newRepository]
                        }));
                    } else {
                        this.publicRepositories.update(current => ({
                            ...current,
                            repositories: [...current.repositories, newRepository]
                        }));
                    }

                    this.setSelectedRepository(newRepository);
                } 
            }
        }

        const branches = this.branches();
        let branch: Branch | undefined = undefined;

        if (branches) {
            branch = branches.find(b => 
            b.branchName.toLowerCase() === branchName?.toLowerCase()
        );
        }

        if (!branch) {
            const newBranch = {
                branchName: branchName ?? 'unknown',
                description: branchName ?? null,
                isMain: false
            }
            this.branches.update(current => (current ? [...current, newBranch] : [newBranch]));

            branch = newBranch;
        }
         
        this.setSelectedBranch(branch);
    }   
    
    private loadArinaRepositories() : RepositoryGroup {
        const result = new RepositoryGroup();
        result.category = RepositoryCategory.ArinaNetwork;

        result.repositories.push({
            key: crypto.randomUUID(),
            name: 'Arina Knowledge',
            ownerName: 'arina-network',
            repositoryName: 'arina-knowledge',
            url: 'https://github.com/arina-network/arina-knowledge',
            isPublic: true
        });
        result.repositories.push({
            key: crypto.randomUUID(),
            name: 'Arina Knowledge Guide',
            ownerName: 'arina-network',
            repositoryName: 'arina-knowledge-guide',
            url: 'https://github.com/arina-network/arina-knowledge-guide',
            isPublic: true
        });

        return result;
    }

    private settingsCode = 'repositories';
    // protected get settingsCode(): string {
    //     return 'repositories';
    // }

    private getRepositoriesStorageCode(category: RepositoryCategory): string {
        if (category === RepositoryCategory.Private && this.authorizationService.isAuthorized())
        {
            return `${AppInfo.companyName}_${AppInfo.applicationName}_${this.settingsCode}_${category}_${this.authorizationService.getUserInfo()?.login}`;
        }

        return `${AppInfo.companyName}_${AppInfo.applicationName}_${this.settingsCode}_${category}`;
    }

    private saveRepositoriesToLocalStorage(category: RepositoryCategory, group: RepositoryGroup) {
        // do not store private repositories without authorization
        if (category === RepositoryCategory.Private && !this.authorizationService.isAuthorized()) {
            return;
        }

        localStorage.setItem(this.getRepositoriesStorageCode(category), JSON.stringify(group));
    }

    private loadRepositoriesFromLocalStorage(category: RepositoryCategory): RepositoryGroup {
        let result = new RepositoryGroup();
        result.category = category;

        // check authorized for private repositories
        if (category === RepositoryCategory.Private &&  !this.authorizationService.isAuthorized())
        {
            return result;
        }

        const data = localStorage.getItem(this.getRepositoriesStorageCode(category));
        if (data) {
            try {
                result = JSON.parse(data);
            } catch (e) {
                console.error('Error parsing localStorage repositories data:', e);
            }
        }

        return result;
    }    
}
