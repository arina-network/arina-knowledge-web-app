import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StructureApiService {

    getStructureTreeRootNodes(): any {
        // fake data for testing
        return [
            {
                key: 'logic',
                name: 'logic',
                isFolder: true
            },
            {
                key: 'architecture',
                name: 'architecture',
                isFolder: true
            },
            {
                key: 'README.md',
                name: 'README.md'
            }
        ];
    }

    getStructureTreeNodes(containerKey: any): any {
        // fake data for testing
        if (containerKey === 'logic') {
            return [
                {
                    key: 'logic/core',
                    name: 'core',
                    isFolder: true
                },
                {
                    key: 'logic/knowledge',
                    name: 'knowledge',
                    isFolder: true
                },
                {
                    key: 'logic/README.md',
                    name: 'README.md'
                }
            ];
        } else if (containerKey === 'architecture') {
            return [
                {
                    key: 'architecture/api',
                    name: 'api',
                    isFolder: true
                },
                {
                    key: 'architecture/ui',
                    name: 'ui',
                    isFolder: true
                },
                {
                    key: 'architecture/README.md',
                    name: 'README.md'
                }
            ];
        } else {
            return [];
        }
    }

    getRoute(key: any): any {
        return [];
    }

    getStructure(key: any): any {
        return {
            key,
            name: 'TEST NAME for ' + key,
            source: 'TEST SOURCE for ' + key,
            isFolder: false
        }        
    }
}