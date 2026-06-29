import { RepositoryCategory } from "../constants/repository-category";
import { Repository } from "./repository";

export class RepositoryGroup {
    public category: RepositoryCategory = RepositoryCategory.Public;
    public description?: string;

    public repositories: Repository[] = []; 
}
