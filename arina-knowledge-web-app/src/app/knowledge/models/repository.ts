export class Repository {
    key: string = crypto.randomUUID();
    name?: string;
    description?: string;

    url?: string;

    ownerName?: string;
    repositoryName?: string;


    isPublic: boolean = true;
}
