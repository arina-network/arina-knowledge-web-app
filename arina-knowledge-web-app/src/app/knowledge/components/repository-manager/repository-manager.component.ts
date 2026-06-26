import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';


import { Repository } from '../../models/repository';
import { RepositoryGroup } from '../../models/repository-group';
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
export class RepoManagerComponent {
  protected repositoryService = inject(RepositoryService);

//   private readonly STORAGE_KEY = 'github_repositories';

  // 1. Initialize signal with data from LocalStorage or fallback to seed data
//   repositories = signal<Repository[]>(this.loadFromLocalStorage());

    newRepoName = '';
    newRepoOwner = '';
    newRepoRepository = '';

//   constructor() {
//     // 2. Automatically save to localStorage whenever the signal changes
//     effect(() => {
//       localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.repositories()));
//     });
//   }

    get repositories() : Repository[] {
        return this.repositoryService.publicRepositories().repositories; 
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

        // const newRepo: Repository = {
        //   id: Date.now(),
        //   name: this.newRepoName,
        //   description: this.newRepoDesc || 'No description provided',
        //   stars: 0,
        //   language: this.newRepoLang || 'Unknown',
        //   url: `https://github.com{this.newRepoName}`
        // };

        // The effect will automatically trigger and update localStorage
        this.repositoryService.publicRepositories.update(current => ({
            ...current,
            repositories: [...current.repositories, newRepository]
        }));    
        // this.repositoryService.publicRepositories.update(repos => [...repos, newRepo]);
        
        this.newRepoName = '';
        this.newRepoOwner = '';
        this.newRepoRepository = '';
    }

    deleteRepository(key: string) {
    // The effect will automatically trigger and update localStorage
    // this.repositories.update(repos => repos.filter(repo => repo.id !== id));
        this.repositoryService.publicRepositories.update(current => ({
            ...current,
            repositories: current.repositories.filter(item => item.key !== key)
        }));       
    }

//   openRepo(url: string) {
//     window.open(url, '_blank');
//   }
}
