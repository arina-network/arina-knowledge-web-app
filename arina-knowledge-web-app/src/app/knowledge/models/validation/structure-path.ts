/** Repository, branch, and document path used to resolve and check relative links. */
export interface StructurePath {
    owner: string;
    repository: string;
    branch: string;
    key: string;
}
