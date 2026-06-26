import { RepositoryGroupCategory } from "../constants/repository-group-category";
import { Repository } from "./repository";

export class RepositoryGroup {
    public category: RepositoryGroupCategory = RepositoryGroupCategory.Public;
    public description?: string;

    public repositories: Repository[] = []; 
}
