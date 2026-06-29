import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';


import { Repository } from '../../models/repository';
import { RepositoryCategory } from '../../constants/repository-category';
import { RepositoryService } from '../../services/repository.service';


@Component({
  selector: 'app-repository-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './repository-manager.component.html'
})
export class RepositoryManagerComponent {
    protected repositoryService = inject(RepositoryService);

    @Input() repositoryCategory: RepositoryCategory = RepositoryCategory.Public;  

    newRepoName = '';
    newRepoOwner = '';
    newRepoRepository = '';

    get repositories() : Repository[] {
        if (this.repositoryCategory === RepositoryCategory.Private) {
            return this.repositoryService.privateRepositories().repositories; 
        } else if (this.repositoryCategory === RepositoryCategory.Public) {
            return this.repositoryService.publicRepositories().repositories;
        }
        
        return [];
    }

    addRepository() {
        if (!this.newRepoName.trim()) return;

            const newRepository = {
                key: crypto.randomUUID(),
                name: this.newRepoName ??`${this.newRepoOwner} -> ${this.newRepoRepository}`,
                ownerName: this.newRepoOwner ?? 'unknown',
                repositoryName: this.newRepoRepository ?? 'unknown',
                url: `https://github.com/${this.newRepoOwner}/${this.newRepoRepository}`,
                isPublic: true                
            }


        if (this.repositoryCategory === RepositoryCategory.Private) {
            this.repositoryService.privateRepositories.update(current => ({
                ...current,
                repositories: [...current.repositories, newRepository]
            }));    
        } else if (this.repositoryCategory === RepositoryCategory.Public) {
            this.repositoryService.publicRepositories.update(current => ({
                ...current,
                repositories: [...current.repositories, newRepository]
            }));    
        }
        
        this.newRepoName = '';
        this.newRepoOwner = '';
        this.newRepoRepository = '';
    }

    deleteRepository(key: string) {
        if (this.repositoryCategory === RepositoryCategory.Private) {
            this.repositoryService.privateRepositories.update(current => ({
                ...current,
                repositories: current.repositories.filter(item => item.key !== key)
            }));       
        } else if (this.repositoryCategory === RepositoryCategory.Public) {
        this.repositoryService.publicRepositories.update(current => ({
            ...current,
            repositories: current.repositories.filter(item => item.key !== key)
        }));       
        }
    }
}
