import { Injectable, Signal, signal } from '@angular/core';

import { Branch } from '../models/branch';
import { Repository } from '../models/repository';

@Injectable({
    providedIn: 'root'
})
export class RepositoryService {
    // TEST REPOSITORIES for demonstration purposes
    private testRepositories: Repository[] = [
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

    // TEST BRANCHES for demonstration purposes
    private testBranches: Branch[] = [
        { 
            name: 'main', 
            description: 'Main Branch', 
            isMain: true 
        }
    ]


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

    isRepositorySelected(): boolean {
        return this.selectedRepository() !== null;
    }

    getRepositories(): Repository[] {
        return this.testRepositories;
    }

    getSelectedBranch(): Branch | null {
        return this.selectedBranch();
    }

    setSelectedBranch(branch: Branch): void {
        this.selectedBranch.set(branch);
    }

    getBranches(): Branch[] {
        if (!this.selectedRepository()) {
            return [];
        }

        return this.testBranches;      
    }

    clear(): void {
        this.selectedRepository.set(null);
        this.selectedBranch.set(null);
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

        const repository = this.getRepositories().find(r => 
            r.ownerName.toLowerCase() === ownerName?.toLowerCase() 
            && r.repositoryName.toLowerCase() === repositoryName?.toLowerCase()
        );

        if (!repository) {
            const newRepository = {
                url: `https://github.com/${ownerName}/${repositoryName}`,
                name: `${ownerName} -> ${repositoryName}`,
                ownerName: ownerName ?? 'unknown',
                repositoryName: repositoryName ?? 'unknown',
                isPublic: true                
            }

            this.testRepositories.push(newRepository);

            this.setSelectedRepository(newRepository);
        } else {
            this.setSelectedRepository(repository);
        }           

        const branch = this.getBranches().find(b => 
            b.name.toLowerCase() === branchName?.toLowerCase()
        );

        if (!branch) {
            const newBranch = {
                name: branchName ?? 'unknown',
                description: branchName ?? 'unknown',
                isMain: false
            }
            this.testBranches.push(newBranch);

            this.setSelectedBranch(newBranch);
        } else {
            this.setSelectedBranch(branch);
        }

    }    
}
