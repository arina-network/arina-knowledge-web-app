import { Injectable, Signal, signal } from '@angular/core';

import { Branch } from '../models/branch';
import { Repository } from '../models/repository';

@Injectable({
    providedIn: 'root'
})
export class RepositoryService {
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
    }

    getSelectedBranch(): Branch | null {
        return this.selectedBranch();
    }

    setSelectedBranch(branch: Branch): void {
        this.selectedBranch.set(branch);
    }

    // logout(): void {
    //     this.selectedRepository.set(null);
    //     this.selectedBranch.set(null);
    // }

    isRepositorySelected(): boolean {
        return this.selectedRepository() !== null;
    }

    getRepositories(): Repository[] {
        // for demonstration purposes, we return hardcoded repositoris
        return [
            {
                url: 'https://github.com/arina-network/arina-knowledge',
                name: 'Arina Knowledge',
                ownerName: 'arina-network',
                repositoryName: 'arina-knowledge',
                isPublic: true
            },
            {
                url: 'https://github.com/arina-network/arina-knowledge-guide',
                name: 'Arina Knowledge Guide',
                ownerName: 'arina-network',
                repositoryName: 'arina-knowledge-guide',
                isPublic: true
            }
        ];
    }

    getBranches(): Branch[] {
        if (!this.selectedRepository()) {
            return [];
        }
        
        // for demonstration purposes, we return hardcoded branches.
        return [
            { 
                name: 'main', 
                description: 'Main Branch', 
                isMain: true 
            }
        ];
    }
}
